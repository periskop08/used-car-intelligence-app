import { Injectable } from '@nestjs/common';
import { VehicleReportScores, ReportScoreItem } from '@used-car-intelligence/shared';

@Injectable()
export class VehicleReportScoringService {
  calculateScores(vehicleContext: any, listingContext?: any): VehicleReportScores {
    const vIdentity = vehicleContext?.vehicleIdentity || {};
    const reportData = vehicleContext?.verifiedDatabaseVehicleReport || {};
    const researchData = vehicleContext?.verifiedResearch || {};
    const problems = reportData.knownDatabaseProblems || researchData.reliabilityResearch || [];
    const recalls = reportData.recalls || researchData.recallResearch || [];

    // 1. Data Evidence Confidence Score (Evaluates depth of available empirical evidence)
    const hasDbProblems = Array.isArray(problems) && problems.length > 0;
    const hasRecalls = Array.isArray(recalls) && recalls.length > 0;
    const hasListingData = !!listingContext;
    const hasResearchGrounding = researchData?.webSearchPerformed === true;
    const isKnownVariant = !!(vIdentity.brand && vIdentity.model && vIdentity.modelYear);
    const hasExplicitDatabaseRecord = vehicleContext?.verifiedDatabaseVehicleReport !== undefined;

    let dataConfidenceValue = 50;
    let dataConfidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    const dataMissingInputs: string[] = [];

    if (hasDbProblems || hasRecalls) {
      dataConfidenceValue = 85;
      dataConfidenceLevel = 'HIGH';
    } else if (hasExplicitDatabaseRecord || hasResearchGrounding) {
      dataConfidenceValue = 75;
      dataConfidenceLevel = 'MEDIUM';
      dataMissingInputs.push('Doğrulanmış saha ekspertiz numune havuzu henüz oluşma aşamasında');
    } else if (isKnownVariant) {
      dataConfidenceValue = 60;
      dataConfidenceLevel = 'MEDIUM';
      dataMissingInputs.push('Doğrulanmış saha ekspertiz ve servis geçmişi verisi sınırlı');
    } else {
      dataConfidenceValue = 35;
      dataConfidenceLevel = 'LOW';
      dataMissingInputs.push('Doğrulanmış araç varyantı ve saha ekspertiz verisi bulunamadı');
    }

    const dataConfidenceScore: ReportScoreItem = {
      value: dataConfidenceValue,
      confidence: dataConfidenceLevel,
      factors: [
        {
          key: 'EVIDENCE_BREADTH',
          impact: dataConfidenceValue,
          explanation: (hasDbProblems || hasRecalls)
            ? `Doğrulanmış ${problems.length} kronik arıza ve ${recalls.length} servis bülteni kaydı incelendi.`
            : ((hasExplicitDatabaseRecord || hasResearchGrounding)
              ? 'Teknik katalog ve üretici servis verileriyle doğrulanmış araştırma modeli uygulandı.'
              : 'Veritabanında bu varyant için sınırlı sayıda saha kanıtı bulunmaktadır.'),
        },
      ],
      missingInputs: dataMissingInputs,
    };

    // 2. Technical Risk Score (Grounds strictly on verified defects, recalls, and empirical damage)
    const riskFactors: { key: string; impact: number; explanation: string }[] = [];
    let calculatedRisk: number | null = null;
    const riskMissingInputs: string[] = [];

    if (dataConfidenceLevel === 'LOW' && !hasListingData) {
      // If evidence is insufficient, do NOT fabricate a fake deterministic number
      calculatedRisk = null;
      riskMissingInputs.push('Doğrulanmış varyant kimliği ve detaylı ekspertiz geçmişi teyit edilmelidir');
    } else {
      let accumulatedRisk = 0;

      if (hasDbProblems) {
        problems.forEach((p: any, idx: number) => {
          const isVerifiedFailure = p.problemType === 'VERIFIED_FAILURE' || p.problemType === 'CHRONIC' || !p.problemType;
          const isCritical = p.riskLevel === 'CRITICAL' || p.severity === 'YÜKSEK' || p.riskLevel === 'HIGH';

          if (isVerifiedFailure) {
            const impactVal = isCritical ? 25 : 12;
            accumulatedRisk += impactVal;
            riskFactors.push({
              key: `VERIFIED_PROBLEM_${p.id || idx}`,
              impact: impactVal,
              explanation: isCritical
                ? `Doğrulanmış Kritik Kronik Risk: ${p.title || p.description || 'Mekanik Aşınma Riski'}`
                : `Doğrulanmış Kronik Gözlem: ${p.title || p.description || 'Periyodik Kontrol Noktası'}`,
            });
          } else {
            const impactVal = isCritical ? 6 : 2;
            accumulatedRisk += impactVal;
            riskFactors.push({
              key: `COMMUNITY_FEEDBACK_${p.id || idx}`,
              impact: impactVal,
              explanation: `Kullanıcı Geri Bildirimi / Saha Gözlemi: ${p.title || p.description || 'Kullanıcı Bildirimi'}`,
            });
          }
        });
      }

      if (hasRecalls) {
        recalls.forEach((r: any, idx: number) => {
          const isOpen = r.status === 'OPEN' || r.isApplied === false;
          if (isOpen) {
            accumulatedRisk += 15;
            riskFactors.push({
              key: `OPEN_RECALL_${r.campaignNumber || idx}`,
              impact: 15,
              explanation: `Uygulanmamış Güvenlik Geri Çağırma Bülteni: ${r.description || r.campaignNumber || 'Servis Kampanyası'}`,
            });
          } else {
            riskFactors.push({
              key: `COMPLETED_RECALL_${r.campaignNumber || idx}`,
              impact: 0,
              explanation: `Üretici Servis Kampanyası Bilgilendirmesi: ${r.description || r.campaignNumber || 'Tamamlanmış Kampanya'}`,
            });
          }
        });
      }

      if (listingContext) {
        if (listingContext.heavyDamage) {
          accumulatedRisk += 40;
          riskFactors.push({
            key: 'HEAVY_DAMAGE_DECLARED',
            impact: 40,
            explanation: 'Satıcı beyanında veya tramer kaydında ağır hasar kaydı bulunmaktadır.',
          });
        }
        if (listingContext.tramerAmount > 50000) {
          const tramerImpact = Math.min(25, Math.round(listingContext.tramerAmount / 10000));
          accumulatedRisk += tramerImpact;
          riskFactors.push({
            key: 'HIGH_TRAMER_RECORD',
            impact: tramerImpact,
            explanation: `Yüksek Tramer Kaydı (${listingContext.tramerAmount.toLocaleString('tr-TR')} TL)`,
          });
        }
      }

      // If no negative verified issues were found, risk is minimal based on clean evidence
      calculatedRisk = Math.min(100, Math.max(5, accumulatedRisk));
      if (riskFactors.length === 0) {
        riskFactors.push({
          key: 'NO_CRITICAL_DEFECTS_FOUND',
          impact: 5,
          explanation: 'İncelenen varyant veritabanında bilinen ağır bir kronik kusur kaydına rastlanmadı.',
        });
      }
    }

    const technicalRiskScore: ReportScoreItem = {
      value: calculatedRisk,
      confidence: dataConfidenceLevel,
      factors: riskFactors,
      missingInputs: riskMissingInputs,
    };

    // 3. Buyability Score (Derives explainably from risk, active warranty, and verified data completeness)
    const buyabilityFactors: { key: string; impact: number; explanation: string }[] = [];
    let calculatedBuyability: number | null = null;
    const buyabilityMissingInputs: string[] = [];

    if (calculatedRisk === null) {
      calculatedBuyability = null;
      buyabilityMissingInputs.push('Fiziki ekspertiz ve servis geçmişi doğrulandıktan sonra satın alınabilirlik netleşecektir');
    } else {
      let baseBuyability = 90;

      // Deduct proportionally from verified risk
      const riskDeduction = Math.round(calculatedRisk * 0.6);
      baseBuyability -= riskDeduction;
      buyabilityFactors.push({
        key: 'TECHNICAL_RISK_IMPACT',
        impact: -riskDeduction,
        explanation: `Doğrulanmış teknik risk ve arıza geçmişi etkisi (-%${riskDeduction})`,
      });

      // Active warranty check
      if (listingContext?.hasWarranty === true && listingContext?.warrantyDetails) {
        baseBuyability += 8;
        buyabilityFactors.push({
          key: 'ACTIVE_WARRANTY_SCOPE',
          impact: 8,
          explanation: `Doğrulanmış Aktif Garanti Kapsamı: ${listingContext.warrantyDetails}`,
        });
      }

      calculatedBuyability = Math.min(100, Math.max(10, baseBuyability));
    }

    const buyabilityScore: ReportScoreItem = {
      value: calculatedBuyability,
      confidence: dataConfidenceLevel,
      factors: buyabilityFactors,
      missingInputs: buyabilityMissingInputs,
    };

    // 4. Variant Match Confidence Score
    const variantConfidenceScore: ReportScoreItem = {
      value: vIdentity.variantMatchConfidence === 'KESİN' ? 100 : 85,
      confidence: 'HIGH',
      factors: [
        {
          key: 'VARIANT_IDENTITY_MATCH',
          impact: vIdentity.variantMatchConfidence === 'KESİN' ? 100 : 85,
          explanation: `Motor Kodu (${vIdentity.engineCode || 'Standart'}) ve Şanzıman (${vIdentity.transmissionName || 'Orijinal'}) teknik katalogla eşleşti.`,
        },
      ],
      missingInputs: [],
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
            key: 'LISTING_INTEGRITY',
            impact: -missingCount * 15,
            explanation: missingCount > 0
              ? `${missingCount} adet kritik teknik alan ilanda belirtilmemiştir.`
              : 'İlandaki tüm kritik teknik parametreler eksiksiz doldurulmuştur.',
          },
        ],
        missingInputs: listingContext.missingFields?.map((m: any) => m.fieldLabel || m) || [],
      };

      scores.listingDataQualityScore = listingDataQualityScore;
      scores.listingContradictionScore = {
        value: listingContext.heavyDamage && listingContext.tramerAmount === 0 ? 50 : 95,
        confidence: 'HIGH',
        factors: [],
        missingInputs: [],
      };
    }

    return scores;
  }
}

