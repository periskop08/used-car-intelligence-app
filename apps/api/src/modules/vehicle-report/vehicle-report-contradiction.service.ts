import { Injectable } from '@nestjs/common';
import { ListingContradiction, MileageAgeAnalysis } from '@used-car-intelligence/shared';

@Injectable()
export class VehicleReportContradictionService {
  analyzeListingContradictions(listingContext: any): ListingContradiction[] {
    const contradictions: ListingContradiction[] = [];
    if (!listingContext) return contradictions;

    // Check Heavy Damage vs Damage Record
    if (listingContext.heavyDamage && listingContext.tramerAmount === 0) {
      contradictions.push({
        code: 'HEAVY_DAMAGE_ZERO_TRAMER',
        severity: 'WARNING',
        title: 'Ağır Hasar Beyanı & Tramer Çelişkisi',
        explanation: 'İlanda ağır hasar kaydı beyan edilmiştir ancak girilen Tramer tutarı 0 TRY görünmektedir. Tramer sorgusunun belgesi istenmelidir.',
        affectedFields: ['heavyDamage', 'tramerAmount'],
      });
    }

    // Check Description vs Painted/Changed parts
    const desc = (listingContext.sellerDescriptionWrapped || '').toLowerCase();
    const hasPaintedParts = (listingContext.paintedParts?.length || 0) > 0;
    const hasChangedParts = (listingContext.changedParts?.length || 0) > 0;

    if ((desc.includes('hatasız') || desc.includes('boyasız') || desc.includes('değişensiz')) && (hasPaintedParts || hasChangedParts)) {
      contradictions.push({
        code: 'DESCRIPTION_VS_DECLARED_PARTS',
        severity: 'CRITICAL',
        title: 'Açıklama Metni & Kaporta Beyan Çelişkisi',
        explanation: `Açıklama metninde "hatasız/boyasız" beyan edilmesine rağmen kaporta formunda ${listingContext.paintedParts?.length || 0} boyalı, ${listingContext.changedParts?.length || 0} değişen parça işaretlenmiştir.`,
        affectedFields: ['description', 'paintedParts', 'changedParts'],
      });
    }

    return contradictions;
  }

  analyzeMileageAge(listingContext: any): MileageAgeAnalysis | undefined {
    if (!listingContext || !listingContext.modelYear || !listingContext.kilometers) {
      return undefined;
    }

    const currentYear = new Date().getFullYear();
    const age = Math.max(1, currentYear - listingContext.modelYear);
    const km = listingContext.kilometers;
    const avgKmPerYear = Math.round(km / age);

    let intensityCategory: 'LOW' | 'BALANCED' | 'HIGH' | 'VERY_HIGH' = 'BALANCED';
    let assessment = 'Yıllık kilometre kullanımı Türkiye standartları dahilindedir.';

    if (avgKmPerYear > 35000) {
      intensityCategory = 'VERY_HIGH';
      assessment = `Araç yılda ortalama ~${avgKmPerYear.toLocaleString('tr-TR')} km yol yapmıştır. Yüksek kullanım seviyesi nedeniyle motor, şanzıman ve yürüyen aksam aşınması titizlikle incelenmelidir.`;
    } else if (avgKmPerYear > 22000) {
      intensityCategory = 'HIGH';
      assessment = `Araç yılda ortalama ~${avgKmPerYear.toLocaleString('tr-TR')} km sürülmüştür. Ağır bakım geçmişi kontrol ettirilmelidir.`;
    } else if (avgKmPerYear < 8000) {
      intensityCategory = 'LOW';
      assessment = `Yıllık kullanım mesafesi oldukça düşüktür (~${avgKmPerYear.toLocaleString('tr-TR')} km/yıl). Kilometre orijinalliği için servis ve muayene dökümleri istenmelidir.`;
    }

    return {
      listingYear: listingContext.modelYear,
      listingMileageKm: km,
      calculatedAgeYears: age,
      estimatedAnnualKmRange: `~${avgKmPerYear.toLocaleString('tr-TR')} km/yıl`,
      intensityCategory,
      assessment,
      isApproximateNotice: 'Model yılı bazında yaklaşık yıllık ortalama hesaptır. İlk tescil ayı bilinmediği için kesin sürüş süresini yansıtmayabilir.',
      supportingFactIds: ['FACT_LISTING_MILEAGE_AGE'],
    };
  }
}
