import { Injectable } from '@nestjs/common';
import { VehicleReportScores, ReportScoreItem } from '@used-car-intelligence/shared';

@Injectable()
export class VehicleReportScoringService {
  calculateScores(vehicleContext: any, listingContext?: any): VehicleReportScores {
    const vIdentity = vehicleContext?.vehicleIdentity || {};
    const reportData = vehicleContext?.verifiedDatabaseVehicleReport || {};
    const problems = reportData.knownDatabaseProblems || [];
    const recalls = reportData.recalls || [];

    // 1. Technical Risk Score (0-100: Higher number means HIGHER RISK)
    let riskValue = 20; // Base baseline risk
    const riskFactors: { key: string; impact: number; explanation: string }[] = [];

    problems.forEach((p: any) => {
      if (p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL') {
        riskValue += 20;
        riskFactors.push({ key: `PROBLEM_${p.id}`, impact: 20, explanation: `Kritik/Yüksek Riskli Kronik Arıza: ${p.title}` });
      } else {
        riskValue += 10;
        riskFactors.push({ key: `PROBLEM_${p.id}`, impact: 10, explanation: `Kronik Arıza Kaydı: ${p.title}` });
      }
    });

    if (recalls.length > 0) {
      riskValue += 15;
      riskFactors.push({ key: 'RECALL_PRESENT', impact: 15, explanation: `${recalls.length} Adet Resmi Geri Çağırma Kaydı Bulunuyor` });
    }

    // Heavy damage deduction logic:
    // Verified heavy damage record (DB/Tramer) vs Seller heavy damage declaration
    if (listingContext) {
      if (listingContext.heavyDamage) {
        riskValue += 35;
        riskFactors.push({ key: 'HEAVY_DAMAGE_SELLER_DECLARATION', impact: 35, explanation: 'Satıcı İlanda Ağır Hasar Olduğunu Beyan Etmiştir' });
      }
      if (listingContext.tramerAmount > 50000) {
        riskValue += 15;
        riskFactors.push({ key: 'HIGH_TRAMER', impact: 15, explanation: `Yüksek Tramer Kaydı: ${listingContext.tramerAmount.toLocaleString('tr-TR')} TRY` });
      }
    }

    const clampedRisk = Math.min(100, Math.max(0, riskValue));
    const technicalRiskScore: ReportScoreItem = {
      value: clampedRisk,
      confidence: problems.length > 0 ? 'HIGH' : 'MEDIUM',
      factors: riskFactors,
      missingInputs: problems.length === 0 ? ['Detaylı ekspertiz saha kanıtları bekleniyor'] : [],
    };

    // 2. Buyability Score (0-100: Higher number means MORE BUYABLE)
    let buyabilityValue = 85;
    const buyabilityFactors: { key: string; impact: number; explanation: string }[] = [];

    buyabilityValue -= clampedRisk * 0.4;
    buyabilityFactors.push({ key: 'RISK_DEDUCTION', impact: -Math.round(clampedRisk * 0.4), explanation: `Teknik risk oranı etkisi (-%${Math.round(clampedRisk * 0.4)})` });

    if (listingContext?.hasWarranty) {
      buyabilityValue += 10;
      buyabilityFactors.push({ key: 'WARRANTY_BONUS', impact: 10, explanation: 'Garantisi Devam Ediyor (+10 Puan)' });
    }

    const clampedBuyability = Math.min(100, Math.max(0, Math.round(buyabilityValue)));
    const buyabilityScore: ReportScoreItem = {
      value: clampedBuyability,
      confidence: 'HIGH',
      factors: buyabilityFactors,
      missingInputs: [],
    };

    // 3. Variant Match Confidence Score
    const variantConfidenceScore: ReportScoreItem = {
      value: vIdentity.variantMatchConfidence === 'KESİN' ? 100 : 85,
      confidence: 'HIGH',
      factors: [
        {
          key: 'VARIANT_MATCH',
          impact: vIdentity.variantMatchConfidence === 'KESİN' ? 100 : 85,
          explanation: `Motor Kodu (${vIdentity.engineCode || 'Varsayılan'}) ve Şanzıman (${vIdentity.transmissionName}) veritabanımızla eşleşti.`,
        },
      ],
      missingInputs: [],
    };

    // 4. Data Evidence Confidence Score
    const dataConfidenceScore: ReportScoreItem = {
      value: problems.length > 0 || recalls.length > 0 ? 90 : 65,
      confidence: problems.length > 0 ? 'HIGH' : 'MEDIUM',
      factors: [
        {
          key: 'EVIDENCE_COUNT',
          impact: problems.length > 0 ? 90 : 65,
          explanation: `Veritabanında bu varyant için ${problems.length} onaylı kronik sorun ve ${recalls.length} recall kaydı yer alıyor.`,
        },
      ],
      missingInputs: problems.length === 0 ? ['Varyant ekspertiz numune sayısı sınırlı'] : [],
    };

    const scores: VehicleReportScores = {
      buyabilityScore,
      technicalRiskScore,
      variantConfidenceScore,
      dataConfidenceScore,
    };

    // Listing-specific score indicators
    if (listingContext) {
      const missingCount = listingContext.missingFields?.length || 0;
      const listingDataQualityScore: ReportScoreItem = {
        value: Math.max(20, 100 - missingCount * 15),
        confidence: 'HIGH',
        factors: [
          {
            key: 'MISSING_FIELDS_PENALTY',
            impact: -missingCount * 15,
            explanation: `${missingCount} adet kritik teknik alan boş bırakılmıştır.`,
          },
        ],
        missingInputs: listingContext.missingFields?.map((m: any) => m.fieldLabel) || [],
      };

      scores.listingDataQualityScore = listingDataQualityScore;
      scores.listingContradictionScore = {
        value: listingContext.heavyDamage && listingContext.tramerAmount === 0 ? 60 : 95,
        confidence: 'HIGH',
        factors: [],
        missingInputs: [],
      };
    }

    return scores;
  }
}
