import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CURRENT_REPORT_VERSION } from '../vehicle-report/vehicle-report-cache.service';
import { ApprovalStatus } from '@prisma/client';
import { ExpertDecisionSynthesis, ReportSupportingFact } from '@used-car-intelligence/shared';
import * as crypto from 'crypto';

function generateDerivedFactId(reportId: string, criterion: string, sourcePath: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${reportId}_${criterion}_${sourcePath}`)
    .digest('hex')
    .slice(0, 12);
  return `CMP_${criterion}_${hash}`;
}

export function formatProfileSuitabilityItem(item: any): string | null {
  if (!item) return null;

  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (
      !trimmed ||
      trimmed === '[object Object]' ||
      trimmed.toLowerCase() === 'undefined' ||
      trimmed.toLowerCase() === 'null'
    ) {
      return null;
    }
    return trimmed;
  }

  if (typeof item === 'object' && item !== null) {
    const profile = typeof item.profile === 'string'
      ? item.profile.trim()
      : (typeof item.targetUser === 'string' ? item.targetUser.trim() : (typeof item.title === 'string' ? item.title.trim() : ''));

    const explanation = typeof item.explanation === 'string'
      ? item.explanation.trim()
      : (typeof item.reason === 'string' ? item.reason.trim() : (typeof item.description === 'string' ? item.description.trim() : ''));

    if (profile === '[object Object]' || explanation === '[object Object]') return null;

    if (profile && explanation) {
      return `${profile}: ${explanation}`;
    } else if (profile) {
      return profile;
    } else if (explanation) {
      return explanation;
    }
  }

  return null;
}

export function formatProfileSuitabilityList(val: any): string | null {
  if (!val) return null;

  if (Array.isArray(val)) {
    const formattedList = val
      .map(formatProfileSuitabilityItem)
      .filter((s): s is string => typeof s === 'string' && s.length > 0 && !s.includes('[object Object]'));

    if (formattedList.length === 0) return null;
    return formattedList.join(', ');
  }

  return formatProfileSuitabilityItem(val);
}

export function deriveComparisonFactsFromStoredReport(
  reportId: string,
  reportData: Record<string, any>,
): ReportSupportingFact[] {
  if (!reportId || !reportData || typeof reportData !== 'object') {
    return [];
  }

  const derivedFacts: ReportSupportingFact[] = [];
  const dataQuality = reportData.dataQuality || {};
  const overallConfidence = (dataQuality.overallConfidence as 'LOW' | 'MEDIUM' | 'HIGH') || 'HIGH';

  const addFact = (
    criterion: string,
    label: string,
    val: string | number | boolean | null | undefined,
    sourcePath: string,
  ) => {
    if (val === null || val === undefined) return;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (
        !trimmed ||
        trimmed === '0' ||
        trimmed.toLowerCase() === 'yok' ||
        trimmed.toLowerCase() === 'bilinmiyor' ||
        trimmed.includes('[object Object]') ||
        trimmed.toLowerCase() === 'undefined' ||
        trimmed.toLowerCase() === 'null'
      ) {
        return;
      }
    }
    if (typeof val === 'number' && isNaN(val)) return;

    const factId = generateDerivedFactId(reportId, criterion, sourcePath);
    derivedFacts.push({
      factKey: factId,
      id: factId,
      criterion,
      category: criterion,
      label,
      value: val,
      sourcePath,
      source: 'SYSTEM_DERIVED',
      confidence: overallConfidence,
      reportId,
    } as any);
  };

  // 1. RELIABILITY
  const problems = Array.isArray(reportData.commonProblems) ? reportData.commonProblems : [];
  problems.forEach((prob: any, idx: number) => {
    if (prob && typeof prob === 'object') {
      if (prob.title && typeof prob.title === 'string' && prob.title.trim()) {
        const titleStr = prob.title.trim();
        const sysStr = prob.system && typeof prob.system === 'string' ? prob.system.trim() : '';
        addFact(
          'RELIABILITY',
          `Kronik Sorun: ${titleStr}`,
          `${titleStr}${sysStr ? ' (' + sysStr + ')' : ''}`,
          `commonProblems[${idx}].title`,
        );
      }
    }
  });

  const engineTrans = reportData.engineTransmission || {};
  if (Array.isArray(engineTrans.knownLimitations)) {
    engineTrans.knownLimitations.forEach((lim: any, idx: number) => {
      if (typeof lim === 'string' && lim.trim()) {
        addFact('RELIABILITY', `Motor/Şanzıman Sınırlaması: ${lim.trim()}`, lim.trim(), `engineTransmission.knownLimitations[${idx}]`);
      }
    });
  }

  if (Array.isArray(engineTrans.maintenanceSensitivity)) {
    engineTrans.maintenanceSensitivity.forEach((sens: any, idx: number) => {
      if (typeof sens === 'string' && sens.trim()) {
        addFact('RELIABILITY', `Bakım Hassasiyeti: ${sens.trim()}`, sens.trim(), `engineTransmission.maintenanceSensitivity[${idx}]`);
      }
    });
  }

  const synthesis = reportData.expertDecisionSynthesis || {};
  if (synthesis.primaryTechnicalRisk && typeof synthesis.primaryTechnicalRisk === 'object') {
    const ptr = synthesis.primaryTechnicalRisk;
    if (ptr.riskTitle || ptr.severity || ptr.riskMeaning) {
      const riskVal = `${ptr.riskTitle || 'Teknik Risk'}${ptr.severity ? ' (' + ptr.severity + ')' : ''}${ptr.riskMeaning ? ' - ' + ptr.riskMeaning : ''}`.trim();
      if (riskVal) {
        addFact('RELIABILITY', 'Birincil Teknik Risk', riskVal, 'expertDecisionSynthesis.primaryTechnicalRisk');
      }
    }
  }

  if (Array.isArray(synthesis.secondaryTechnicalRisks)) {
    synthesis.secondaryTechnicalRisks.forEach((sec: any, idx: number) => {
      if (sec && typeof sec === 'object') {
        if (sec.riskTitle || sec.severity || sec.riskMeaning) {
          const riskVal = `${sec.riskTitle || 'İkincil Risk'}${sec.severity ? ' (' + sec.severity + ')' : ''}${sec.riskMeaning ? ' - ' + sec.riskMeaning : ''}`.trim();
          if (riskVal) {
            addFact('RELIABILITY', `İkincil Teknik Risk ${idx + 1}`, riskVal, `expertDecisionSynthesis.secondaryTechnicalRisks[${idx}]`);
          }
        }
      }
    });
  }

  // 2. FAILURE_SEVERITY
  problems.forEach((prob: any, idx: number) => {
    if (prob && typeof prob === 'object') {
      const hasSev = prob.severity && typeof prob.severity === 'string';
      const hasCause = prob.causeExplanation && typeof prob.causeExplanation === 'string';
      const hasInsp = prob.inspectionStep && typeof prob.inspectionStep === 'string';
      if (hasSev || hasCause || hasInsp) {
        const parts: string[] = [];
        if (hasSev) parts.push(`Şiddet: ${prob.severity.trim()}`);
        if (hasCause) parts.push(`Neden: ${prob.causeExplanation.trim()}`);
        if (hasInsp) parts.push(`Kontrol: ${prob.inspectionStep.trim()}`);
        addFact(
          'FAILURE_SEVERITY',
          `Arıza Şiddeti ve Analizi: ${prob.title || 'Sorun ' + (idx + 1)}`,
          parts.join('. '),
          `commonProblems[${idx}].severity`,
        );
      }
    }
  });

  if (synthesis.primaryTechnicalRisk && typeof synthesis.primaryTechnicalRisk === 'object') {
    const ptr = synthesis.primaryTechnicalRisk;
    if (ptr.severity || ptr.riskMeaning) {
      addFact(
        'FAILURE_SEVERITY',
        `Birincil Risk Şiddeti: ${ptr.riskTitle || 'Teknik Risk'}`,
        `Şiddet: ${ptr.severity || 'ORTA'}${ptr.riskMeaning ? '. Açıklama: ' + ptr.riskMeaning : ''}`,
        'expertDecisionSynthesis.primaryTechnicalRisk.severity',
      );
    }
  }

  if (Array.isArray(synthesis.secondaryTechnicalRisks)) {
    synthesis.secondaryTechnicalRisks.forEach((sec: any, idx: number) => {
      if (sec && typeof sec === 'object' && (sec.severity || sec.riskMeaning)) {
        addFact(
          'FAILURE_SEVERITY',
          `İkincil Risk Şiddeti: ${sec.riskTitle || idx + 1}`,
          `Şiddet: ${sec.severity || 'ORTA'}${sec.riskMeaning ? '. Açıklama: ' + sec.riskMeaning : ''}`,
          `expertDecisionSynthesis.secondaryTechnicalRisks[${idx}].severity`,
        );
      }
    });
  }

  // 3. FUEL_EFFICIENCY
  const perf = reportData.performanceUsage || {};
  if (typeof perf.combinedFuelL100km === 'number' && perf.combinedFuelL100km > 0) {
    addFact('FUEL_EFFICIENCY', 'Ortalama Yakıt Tüketimi', `${perf.combinedFuelL100km} L/100km`, 'performanceUsage.combinedFuelL100km');
  }
  if (typeof perf.cityFuelL100km === 'number' && perf.cityFuelL100km > 0) {
    addFact('FUEL_EFFICIENCY', 'Şehir İçi Yakıt Tüketimi', `${perf.cityFuelL100km} L/100km`, 'performanceUsage.cityFuelL100km');
  }
  if (typeof perf.highwayFuelL100km === 'number' && perf.highwayFuelL100km > 0) {
    addFact('FUEL_EFFICIENCY', 'Şehir Dışı Yakıt Tüketimi', `${perf.highwayFuelL100km} L/100km`, 'performanceUsage.highwayFuelL100km');
  }

  // 4. SAFETY
  const recalls = Array.isArray(reportData.recalls) ? reportData.recalls : [];
  recalls.forEach((rec: any, idx: number) => {
    if (rec && typeof rec === 'object' && rec.title && typeof rec.title === 'string' && rec.title.trim()) {
      const recTitle = rec.title.trim();
      const recDesc = rec.riskDescription && typeof rec.riskDescription === 'string' ? rec.riskDescription.trim() : '';
      addFact('SAFETY', `Geri Çağırma (Recall): ${recTitle}`, `${recTitle}${recDesc ? ': ' + recDesc : ''}`, `recalls[${idx}].title`);
    }
  });

  // 4. USAGE_SUITABILITY (v8)
  const dailyUse = synthesis.dailyUseAssessment || reportData.dailyUseAssessment;
  if (dailyUse && typeof dailyUse === 'object') {
    if (dailyUse.cityUse && typeof dailyUse.cityUse === 'string' && dailyUse.cityUse.trim()) {
      addFact('USAGE_SUITABILITY', 'Şehir İçi Kullanım Uyumu', dailyUse.cityUse.trim(), 'expertDecisionSynthesis.dailyUseAssessment.cityUse');
    }
    if (dailyUse.highwayUse && typeof dailyUse.highwayUse === 'string' && dailyUse.highwayUse.trim()) {
      addFact('USAGE_SUITABILITY', 'Otoyol Kullanım Uyumu', dailyUse.highwayUse.trim(), 'expertDecisionSynthesis.dailyUseAssessment.highwayUse');
    }
    if (dailyUse.trafficBehavior && typeof dailyUse.trafficBehavior === 'string' && dailyUse.trafficBehavior.trim()) {
      addFact('USAGE_SUITABILITY', 'Yoğun Trafik Kullanım Uyum Değerlendirmesi', dailyUse.trafficBehavior.trim(), 'expertDecisionSynthesis.dailyUseAssessment.trafficBehavior');
    }
  }

  const scenarios = Array.isArray(reportData.usageScenarios) ? reportData.usageScenarios : [];
  scenarios.forEach((scen: any, idx: number) => {
    if (scen && typeof scen === 'object' && scen.reasoning && typeof scen.reasoning === 'string' && scen.reasoning.trim()) {
      addFact(
        'USAGE_SUITABILITY',
        `Kullanım Senaryosu Uyumu: ${scen.title || scen.scenarioKey || idx + 1}`,
        `${scen.suitability ? scen.suitability + ': ' : ''}${scen.reasoning.trim()}`,
        `usageScenarios[${idx}].reasoning`,
      );
    }
  });

  const bestFor = synthesis.suitableFor || reportData.executiveSummary?.bestFor || reportData.suitableFor;
  if (bestFor) {
    const bestVal = formatProfileSuitabilityList(bestFor);
    if (bestVal) {
      addFact('USAGE_SUITABILITY', 'En Uygun Kullanıcı Profili', bestVal, 'expertDecisionSynthesis.suitableFor');
    }
  }

  const notIdealFor = synthesis.notSuitableFor || reportData.executiveSummary?.notIdealFor || reportData.notSuitableFor;
  if (notIdealFor) {
    const notVal = formatProfileSuitabilityList(notIdealFor);
    if (notVal) {
      addFact('USAGE_SUITABILITY', 'Uygun Olmayan Kullanıcı Profili', notVal, 'expertDecisionSynthesis.notSuitableFor');
    }
  }

  // 5. PERFORMANCE
  if (typeof perf.powerHp === 'number' && perf.powerHp > 0) {
    addFact('PERFORMANCE', 'Motor Gücü', `${perf.powerHp} HP`, 'performanceUsage.powerHp');
  }
  if (typeof perf.torqueNm === 'number' && perf.torqueNm > 0) {
    addFact('PERFORMANCE', 'Motor Torku', `${perf.torqueNm} Nm`, 'performanceUsage.torqueNm');
  }
  if (typeof perf.zeroToHundredKmh === 'number' && perf.zeroToHundredKmh > 0) {
    addFact('PERFORMANCE', '0-100 km/s Hızlanma', `${perf.zeroToHundredKmh} saniye`, 'performanceUsage.zeroToHundredKmh');
  }
  if (typeof perf.topSpeedKmh === 'number' && perf.topSpeedKmh > 0) {
    addFact('PERFORMANCE', 'Maksimum Hız', `${perf.topSpeedKmh} km/s`, 'performanceUsage.topSpeedKmh');
  }
  if (engineTrans.engineSummary && typeof engineTrans.engineSummary === 'string' && engineTrans.engineSummary.trim()) {
    addFact('PERFORMANCE', 'Motor Özeti', engineTrans.engineSummary.trim(), 'engineTransmission.engineSummary');
  }
  if (engineTrans.transmissionSummary && typeof engineTrans.transmissionSummary === 'string' && engineTrans.transmissionSummary.trim()) {
    addFact('PERFORMANCE', 'Şanzıman Özeti', engineTrans.transmissionSummary.trim(), 'engineTransmission.transmissionSummary');
  }
  if (engineTrans.combinationAssessment && typeof engineTrans.combinationAssessment === 'string' && engineTrans.combinationAssessment.trim()) {
    addFact('PERFORMANCE', 'Motor-Şanzıman Uyum Değerlendirmesi', engineTrans.combinationAssessment.trim(), 'engineTransmission.combinationAssessment');
  }

  // 6. COMFORT
  if (dailyUse) {
    if (typeof dailyUse === 'string' && dailyUse.trim()) {
      addFact('COMFORT', 'Günlük Kullanım ve Konfor Değerlendirmesi', dailyUse.trim(), 'expertDecisionSynthesis.dailyUseAssessment');
    } else if (typeof dailyUse === 'object') {
      if (dailyUse.comfortAssessment && typeof dailyUse.comfortAssessment === 'string' && dailyUse.comfortAssessment.trim()) {
        addFact('COMFORT', 'Konfor ve Sürüş Kalitesi Değerlendirmesi', dailyUse.comfortAssessment.trim(), 'expertDecisionSynthesis.dailyUseAssessment.comfortAssessment');
      }
      if (dailyUse.overallComfortAssessment && typeof dailyUse.overallComfortAssessment === 'string' && dailyUse.overallComfortAssessment.trim()) {
        addFact('COMFORT', 'Genel Konfor Analizi', dailyUse.overallComfortAssessment.trim(), 'expertDecisionSynthesis.dailyUseAssessment.overallComfortAssessment');
      }
      if (dailyUse.cityComfort && typeof dailyUse.cityComfort === 'string' && dailyUse.cityComfort.trim()) {
        addFact('COMFORT', 'Şehir İçi Sürüş Konforu', dailyUse.cityComfort.trim(), 'expertDecisionSynthesis.dailyUseAssessment.cityComfort');
      }
      if (dailyUse.highwayComfort && typeof dailyUse.highwayComfort === 'string' && dailyUse.highwayComfort.trim()) {
        addFact('COMFORT', 'Otoyol Konforu ve Yalıtım', dailyUse.highwayComfort.trim(), 'expertDecisionSynthesis.dailyUseAssessment.highwayComfort');
      }
      if (dailyUse.suspensionComfort && typeof dailyUse.suspensionComfort === 'string' && dailyUse.suspensionComfort.trim()) {
        addFact('COMFORT', 'Süspansiyon Konforu', dailyUse.suspensionComfort.trim(), 'expertDecisionSynthesis.dailyUseAssessment.suspensionComfort');
      }
      if (dailyUse.nvhAssessment && typeof dailyUse.nvhAssessment === 'string' && dailyUse.nvhAssessment.trim()) {
        addFact('COMFORT', 'Kabin Ses Yalıtımı (NVH)', dailyUse.nvhAssessment.trim(), 'expertDecisionSynthesis.dailyUseAssessment.nvhAssessment');
      }

      // Check cityUse / highwayUse ONLY if explicit comfort terms exist
      const comfortKeywords = ['koltuk', 'süspansiyon', 'kabin', 'yol sesi', 'rüzgâr', 'yalıtım', 'nvh', 'sürüş kalitesi', 'sürüş rahatlığı', 'konfor', 'sessiz', 'rahat'];
      if (dailyUse.cityUse && typeof dailyUse.cityUse === 'string') {
        const lower = dailyUse.cityUse.toLowerCase();
        if (comfortKeywords.some(kw => lower.includes(kw))) {
          addFact('COMFORT', 'Şehir İçi Konfor Analizi', dailyUse.cityUse.trim(), 'expertDecisionSynthesis.dailyUseAssessment.cityUse#comfort');
        }
      }
      if (dailyUse.highwayUse && typeof dailyUse.highwayUse === 'string') {
        const lower = dailyUse.highwayUse.toLowerCase();
        if (comfortKeywords.some(kw => lower.includes(kw))) {
          addFact('COMFORT', 'Otoyol Konfor Analizi', dailyUse.highwayUse.trim(), 'expertDecisionSynthesis.dailyUseAssessment.highwayUse#comfort');
        }
      }
    }
  }

  scenarios.forEach((scen: any, idx: number) => {
    if (scen && typeof scen === 'object' && scen.reasoning && typeof scen.reasoning === 'string') {
      const lower = (scen.scenarioKey || scen.title || scen.reasoning).toLowerCase();
      if (
        lower.includes('konfor') ||
        lower.includes('süspansiyon') ||
        lower.includes('sessiz') ||
        lower.includes('nvh') ||
        lower.includes('sürüş kalitesi') ||
        lower.includes('sürüş rahatlığı')
      ) {
        addFact(
          'COMFORT',
          `Kullanım Senaryosu Konforu: ${scen.title || scen.scenarioKey || idx + 1}`,
          `${scen.suitability ? scen.suitability + ': ' : ''}${scen.reasoning.trim()}`,
          `usageScenarios[${idx}].reasoning#comfort`,
        );
      }
    }
  });

  // 7. PRACTICALITY
  if (typeof perf.trunkCapacityLiters === 'number' && perf.trunkCapacityLiters > 0) {
    addFact('PRACTICALITY', 'Bagaj Hacmi', `${perf.trunkCapacityLiters} Litre`, 'performanceUsage.trunkCapacityLiters');
  }
  const identity = reportData.vehicleIdentity || {};
  if (identity.bodyType && typeof identity.bodyType === 'string' && identity.bodyType.trim()) {
    addFact('PRACTICALITY', 'Kasa Tipi Yapısı', identity.bodyType.trim(), 'vehicleIdentity.bodyType');
  }
  scenarios.forEach((scen: any, idx: number) => {
    if (scen && typeof scen === 'object' && scen.reasoning && typeof scen.reasoning === 'string') {
      const lower = (scen.scenarioKey || scen.title || scen.reasoning).toLowerCase();
      if (
        lower.includes('aile') ||
        lower.includes('bagaj') ||
        lower.includes('kabin') ||
        lower.includes('yaşam alanı') ||
        lower.includes('genişlik') ||
        lower.includes('pratik') ||
        scen.scenarioKey === 'familyUse' ||
        scen.scenarioKey === 'luggage'
      ) {
        addFact(
          'PRACTICALITY',
          `Kullanım Senaryosu Pratikliği: ${scen.title || scen.scenarioKey || idx + 1}`,
          `${scen.suitability ? scen.suitability + ': ' : ''}${scen.reasoning.trim()}`,
          `usageScenarios[${idx}].reasoning`,
        );
      }
    }
  });

  // 8. EQUIPMENT_TECHNOLOGY
  const trimComp = synthesis.trimPackageComparison || reportData.trimPackageComparison;
  if (trimComp && typeof trimComp === 'object') {
    const hasAdded = Array.isArray(trimComp.keyAddedFeatures) && trimComp.keyAddedFeatures.length > 0;
    const hasMissing = Array.isArray(trimComp.missingFeaturesInLowerTrim) && trimComp.missingFeaturesInLowerTrim.length > 0;
    const hasNarrative = trimComp.comparisonNarrative && typeof trimComp.comparisonNarrative === 'string' && trimComp.comparisonNarrative.trim();

    if (hasAdded) {
      addFact(
        'EQUIPMENT_TECHNOLOGY',
        'Öne Çıkan Paket Donanımları',
        trimComp.keyAddedFeatures.join(', '),
        'expertDecisionSynthesis.trimPackageComparison.keyAddedFeatures',
      );
    }
    if (hasMissing) {
      addFact(
        'EQUIPMENT_TECHNOLOGY',
        'Alt Pakette Olmayan Donanımlar',
        trimComp.missingFeaturesInLowerTrim.join(', '),
        'expertDecisionSynthesis.trimPackageComparison.missingFeaturesInLowerTrim',
      );
    }
    if (hasNarrative) {
      addFact(
        'EQUIPMENT_TECHNOLOGY',
        'Donanım Karşılaştırma Analizi',
        trimComp.comparisonNarrative.trim(),
        'expertDecisionSynthesis.trimPackageComparison.comparisonNarrative',
      );
    }
  }

  return derivedFacts;
}

export interface VehicleComparisonDossierScoring {
  buyabilityScore: number | null;
  technicalRiskScore: number | null;
  variantConfidenceScore: number | null;
  dataConfidenceScore: number | null;
  overallConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface VehicleComparisonDossierProblem {
  title: string;
  system?: string;
  severity: string;
  symptoms: string[];
  causeExplanation?: string;
  preventionAdvice?: string;
  inspectionStep?: string;
  supportingFactIds: string[];
}

export interface VehicleComparisonDossierRecall {
  title: string;
  riskDescription: string;
  remedyDescription?: string;
  supportingFactIds: string[];
}

export interface VehicleComparisonDossierScenario {
  scenarioKey: string;
  title: string;
  suitability: string;
  reasoning: string;
  supportingFactIds: string[];
}

export interface VehicleComparisonDossier {
  variantId: string;
  reportAvailable: boolean;
  reportId?: string;
  reportVersion?: string;
  isStaleReport?: boolean;
  generatedAt?: Date;

  vehicleIdentity: {
    brand: string;
    model: string;
    generation?: string;
    bodyType?: string;
    modelYear: number;
    engineCode?: string;
    enginePowerHp?: number;
    engineDisplacementCc?: number;
    fuelType?: string;
    transmissionName?: string;
    trimName?: string;
    supportingFactIds?: string[];
  };

  scoring: VehicleComparisonDossierScoring;

  expertDecisionSynthesis?: ExpertDecisionSynthesis;
  dailyUseAssessment?: any;
  trimPackageComparison?: any;

  engineTransmission: {
    combinationAssessment?: string;
    cityBehavior?: string;
    highwayBehavior?: string;
    maintenanceSensitivity: string[];
    knownLimitations: string[];
    supportingFactIds: string[];
  };

  performanceUsage: {
    powerHp?: number;
    torqueNm?: number;
    zeroToHundredKmh?: number;
    topSpeedKmh?: number;
    combinedFuelL100km?: number;
    cityFuelL100km?: number;
    highwayFuelL100km?: number;
    trunkCapacityLiters?: number;
    assessment?: string;
    supportingFactIds: string[];
  };

  commonProblems: VehicleComparisonDossierProblem[];
  recalls: VehicleComparisonDossierRecall[];
  maintenanceOwnership: {
    estimatedAnnualCostCategory?: string;
    criticalMaintenanceNotes: string[];
    supportingFactIds: string[];
  };
  usageScenarios: VehicleComparisonDossierScenario[];
  executiveSummary?: {
    oneSentenceSummary?: string;
    strongestAdvantage?: string;
    biggestRisk?: string;
    bestFor: string[];
    notIdealFor: string[];
    keyWarnings: string[];
  };
  finalVerdict?: {
    overallAssessment?: string;
    bestFor: string[];
    avoidIf: string[];
    topThreeActions: string[];
    supportingFactIds: string[];
  };
  dataQuality?: {
    overallConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
    verifiedFactCount?: number;
    supportingFacts: ReportSupportingFact[];
  };
  supportingFactIds: string[];
}

export function normalizeIdentityString(val: string | null | undefined): string {
  if (!val) return '';
  let s = val.toString().toLowerCase();
  s = s
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i');
  s = s.replace(/[^a-z0-9.]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

@Injectable()
export class ComparisonReportLoaderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Fetches the latest valid GeneratedVehicleReport for a variantId
   * according to TorqueScout report selection rules.
   * If no exact report exists for variantId, performs a strict equivalent-variant lookup.
   */
  async findLatestGeneratedReport(variantId: string) {
    if (!variantId) return null;

    const exactVersionReport = await this.prisma.generatedVehicleReport.findFirst({
      where: {
        variantId,
        status: 'COMPLETED',
        archivedAt: null,
        provider: { not: 'DETERMINISTIC_FALLBACK' },
        mode: { in: ['TORQUE_SCOUT_VEHICLE_REPORT', 'VEHICLE_REPORT'] },
        reportVersion: CURRENT_REPORT_VERSION,
      },
      orderBy: { completedAt: 'desc' },
    }).catch(() => null);

    if (exactVersionReport) {
      return exactVersionReport;
    }

    const fallbackVersionReport = await this.prisma.generatedVehicleReport.findFirst({
      where: {
        variantId,
        status: 'COMPLETED',
        archivedAt: null,
        provider: { not: 'DETERMINISTIC_FALLBACK' },
        mode: { in: ['TORQUE_SCOUT_VEHICLE_REPORT', 'VEHICLE_REPORT'] },
      },
      orderBy: { completedAt: 'desc' },
    }).catch(() => null);

    if (fallbackVersionReport) {
      return fallbackVersionReport;
    }

    return this.findEquivalentVariantReport(variantId);
  }

  /**
   * Finds a GeneratedVehicleReport from a strict equivalent variant if exact variant lacks a report.
   * Equivalence requires matching normalized brand, model, year, trim, engine, transmission, fuelType.
   */
  async findEquivalentVariantReport(variantId: string) {
    if (!variantId) return null;

    const target = await this.prisma.vehicleVariant.findUnique({
      where: { id: variantId },
      include: {
        brand: true,
        model: true,
        trim: true,
        engine: true,
        transmission: true,
      },
    }).catch(() => null);

    if (!target) return null;

    const targetBrand = normalizeIdentityString(target.brand?.name);
    const targetModel = normalizeIdentityString(target.model?.name);
    const targetYear = target.year;
    const targetTrim = normalizeIdentityString(target.trim?.name);
    const targetEngine = normalizeIdentityString(target.engine?.code || (target as any).engineCode);
    const targetTrans = normalizeIdentityString(target.transmission?.name || target.transmission?.code || (target as any).transmission);
    const targetFuel = normalizeIdentityString(target.fuelType);

    if (!targetYear || !targetFuel) return null;
    if (typeof this.prisma.vehicleVariant?.findMany !== 'function') return null;

    const candidates = await this.prisma.vehicleVariant.findMany({
      where: {
        brandId: target.brandId,
        modelId: target.modelId,
        year: target.year,
        fuelType: target.fuelType,
        id: { not: variantId },
      },
      include: {
        brand: true,
        model: true,
        trim: true,
        engine: true,
        transmission: true,
      },
    }).catch(() => []);

    for (const cand of candidates) {
      const cBrand = normalizeIdentityString(cand.brand?.name);
      const cModel = normalizeIdentityString(cand.model?.name);
      const cYear = cand.year;
      const cTrim = normalizeIdentityString(cand.trim?.name);
      const cEngine = normalizeIdentityString(cand.engine?.code || (cand as any).engineCode);
      const cTrans = normalizeIdentityString(cand.transmission?.name || cand.transmission?.code || (cand as any).transmission);
      const cFuel = normalizeIdentityString(cand.fuelType);

      const isMatch = (
        cBrand === targetBrand &&
        cModel === targetModel &&
        cYear === targetYear &&
        cTrim === targetTrim &&
        cEngine === targetEngine &&
        cTrans === targetTrans &&
        cFuel === targetFuel
      );

      if (isMatch) {
        const candidateReport = await this.prisma.generatedVehicleReport.findFirst({
          where: {
            variantId: cand.id,
            status: 'COMPLETED',
            archivedAt: null,
            provider: { not: 'DETERMINISTIC_FALLBACK' },
            mode: { in: ['TORQUE_SCOUT_VEHICLE_REPORT', 'VEHICLE_REPORT'] },
          },
          orderBy: { completedAt: 'desc' },
        }).catch(() => null);

        if (candidateReport) {
          return candidateReport;
        }
      }
    }

    return null;
  }

  /**
   * Loads a compact VehicleComparisonDossier for a given variantId.
   */
  async loadDossierForVariant(variantId: string): Promise<VehicleComparisonDossier> {
    const report = await this.findLatestGeneratedReport(variantId);

    if (report && report.reportData && typeof report.reportData === 'object') {
      const data = report.reportData as Record<string, any>;
      return this.mapReportDataToDossier(variantId, report, data);
    }

    return this.buildFallbackDossierFromDb(variantId);
  }

  /**
   * Maps full GeneratedVehicleReport.reportData into a compact, typed VehicleComparisonDossier.
   */
  private mapReportDataToDossier(
    variantId: string,
    report: any,
    data: Record<string, any>,
  ): VehicleComparisonDossier {
    const identity = data.vehicleIdentity || {};
    // REQUIREMENT 1: Use data.scoring as primary, fallback to data.scores
    const scores = data.scoring ?? data.scores ?? {};
    const engineTrans = data.engineTransmission || {};
    const perfUsage = data.performanceUsage || {};
    const problems = data.commonProblems || [];
    const recalls = data.recalls || [];
    const maint = data.maintenanceOwnership || {};
    const scenarios = data.usageScenarios || [];
    const execSummary = data.executiveSummary || {};
    const finalVerdict = data.finalVerdict || {};
    const dataQuality = data.dataQuality || {};
    const expertSynthesis = data.expertDecisionSynthesis;

    const getScoreVal = (raw: any): number | null => {
      if (raw === null || raw === undefined) return null;
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'object' && typeof raw.value === 'number') return raw.value;
      return null;
    };

    const buyabilityVal = getScoreVal(scores.buyabilityScore);
    const techRiskVal = getScoreVal(scores.technicalRiskScore);
    const varConfVal = getScoreVal(scores.variantConfidenceScore);
    const dataConfVal = getScoreVal(scores.dataConfidenceScore);
    const isStaleReport = report.reportVersion !== CURRENT_REPORT_VERSION;

    const overallConf = (dataQuality.overallConfidence as 'LOW' | 'MEDIUM' | 'HIGH')
      || (scores.overallConfidence as 'LOW' | 'MEDIUM' | 'HIGH')
      || (isStaleReport ? 'MEDIUM' : 'HIGH');

    // Aggregate supportingFactIds across all sections
    const sectionFactIds: string[] = [
      ...(Array.isArray(identity.supportingFactIds) ? identity.supportingFactIds : []),
      ...(Array.isArray(engineTrans.supportingFactIds) ? engineTrans.supportingFactIds : []),
      ...(Array.isArray(perfUsage.supportingFactIds) ? perfUsage.supportingFactIds : []),
      ...(Array.isArray(problems) ? problems.flatMap((p: any) => p.supportingFactIds || []) : []),
      ...(Array.isArray(recalls) ? recalls.flatMap((r: any) => r.supportingFactIds || []) : []),
      ...(Array.isArray(maint.supportingFactIds) ? maint.supportingFactIds : []),
      ...(Array.isArray(scenarios) ? scenarios.flatMap((s: any) => s.supportingFactIds || []) : []),
      ...(Array.isArray(finalVerdict.supportingFactIds) ? finalVerdict.supportingFactIds : []),
      ...(Array.isArray(data.supportingFactIds) ? data.supportingFactIds : []),
    ];

    const uniqueFactIds = Array.from(new Set(sectionFactIds));
    const originalSupportingFacts = Array.isArray(dataQuality.supportingFacts) ? dataQuality.supportingFacts : [];
    const derivedSupportingFacts = deriveComparisonFactsFromStoredReport(report.id, data);

    const factMap = new Map<string, ReportSupportingFact>();
    for (const f of originalSupportingFacts) {
      const key = f.factKey || (f as any).id;
      if (key) factMap.set(key, f);
    }
    for (const f of derivedSupportingFacts) {
      const key = f.factKey || (f as any).id;
      if (key && !factMap.has(key)) {
        factMap.set(key, f);
      }
    }
    const supportingFacts = Array.from(factMap.values());
    const combinedFactIds = Array.from(
      new Set([...uniqueFactIds, ...supportingFacts.map(f => f.factKey || (f as any).id).filter(Boolean)])
    );

    return {
      variantId,
      reportAvailable: true,
      reportId: report.id,
      reportVersion: report.reportVersion,
      isStaleReport,
      generatedAt: report.completedAt || report.createdAt,

      vehicleIdentity: {
        brand: identity.brand || '',
        model: identity.model || '',
        generation: identity.generation,
        bodyType: identity.bodyType,
        modelYear: identity.modelYear || 0,
        engineCode: identity.engineCode,
        enginePowerHp: identity.enginePowerHp,
        engineDisplacementCc: identity.engineDisplacementCc,
        fuelType: identity.fuelType,
        transmissionName: identity.transmissionName,
        trimName: identity.trimName,
        supportingFactIds: Array.isArray(identity.supportingFactIds) ? identity.supportingFactIds : [],
      },

      scoring: {
        buyabilityScore: buyabilityVal,
        technicalRiskScore: techRiskVal,
        variantConfidenceScore: varConfVal,
        dataConfidenceScore: dataConfVal,
        overallConfidence: overallConf,
      },

      expertDecisionSynthesis: expertSynthesis,
      dailyUseAssessment: expertSynthesis?.dailyUseAssessment || data.dailyUseAssessment,
      trimPackageComparison: expertSynthesis?.trimPackageComparison || data.trimPackageComparison,

      engineTransmission: {
        combinationAssessment: engineTrans.combinationAssessment,
        cityBehavior: engineTrans.cityBehavior,
        highwayBehavior: engineTrans.highwayBehavior,
        maintenanceSensitivity: Array.isArray(engineTrans.maintenanceSensitivity) ? engineTrans.maintenanceSensitivity : [],
        knownLimitations: Array.isArray(engineTrans.knownLimitations) ? engineTrans.knownLimitations : [],
        supportingFactIds: Array.isArray(engineTrans.supportingFactIds) ? engineTrans.supportingFactIds : [],
      },

      performanceUsage: {
        powerHp: perfUsage.powerHp,
        torqueNm: perfUsage.torqueNm,
        zeroToHundredKmh: perfUsage.zeroToHundredKmh,
        topSpeedKmh: perfUsage.topSpeedKmh,
        combinedFuelL100km: perfUsage.combinedFuelL100km,
        cityFuelL100km: perfUsage.cityFuelL100km,
        highwayFuelL100km: perfUsage.highwayFuelL100km,
        trunkCapacityLiters: perfUsage.trunkCapacityLiters,
        assessment: perfUsage.assessment,
        supportingFactIds: Array.isArray(perfUsage.supportingFactIds) ? perfUsage.supportingFactIds : [],
      },

      commonProblems: (Array.isArray(problems) ? problems : []).slice(0, 6).map((p: any) => ({
        title: p.title || '',
        system: p.system,
        severity: p.severity || 'ORTA',
        symptoms: Array.isArray(p.symptoms) ? p.symptoms : [],
        causeExplanation: p.causeExplanation,
        preventionAdvice: p.preventionAdvice,
        inspectionStep: p.inspectionStep,
        supportingFactIds: Array.isArray(p.supportingFactIds) ? p.supportingFactIds : [],
      })),

      recalls: (Array.isArray(recalls) ? recalls : []).slice(0, 4).map((r: any) => ({
        title: r.title || '',
        riskDescription: r.riskDescription || '',
        remedyDescription: r.remedyDescription,
        supportingFactIds: Array.isArray(r.supportingFactIds) ? r.supportingFactIds : [],
      })),

      maintenanceOwnership: {
        estimatedAnnualCostCategory: maint.estimatedAnnualCostCategory,
        criticalMaintenanceNotes: Array.isArray(maint.criticalMaintenanceNotes) ? maint.criticalMaintenanceNotes : [],
        supportingFactIds: Array.isArray(maint.supportingFactIds) ? maint.supportingFactIds : [],
      },

      usageScenarios: (Array.isArray(scenarios) ? scenarios : []).map((s: any) => ({
        scenarioKey: s.scenarioKey || '',
        title: s.title || '',
        suitability: s.suitability || 'UYGUN',
        reasoning: s.reasoning || '',
        supportingFactIds: Array.isArray(s.supportingFactIds) ? s.supportingFactIds : [],
      })),

      executiveSummary: {
        oneSentenceSummary: execSummary.oneSentenceSummary,
        strongestAdvantage: execSummary.strongestAdvantage,
        biggestRisk: execSummary.biggestRisk,
        bestFor: Array.isArray(execSummary.bestFor) ? execSummary.bestFor : [],
        notIdealFor: Array.isArray(execSummary.notIdealFor) ? execSummary.notIdealFor : [],
        keyWarnings: Array.isArray(execSummary.keyWarnings) ? execSummary.keyWarnings : [],
      },

      finalVerdict: {
        overallAssessment: finalVerdict.overallAssessment,
        bestFor: Array.isArray(finalVerdict.bestFor) ? finalVerdict.bestFor : [],
        avoidIf: Array.isArray(finalVerdict.avoidIf) ? finalVerdict.avoidIf : [],
        topThreeActions: Array.isArray(finalVerdict.topThreeActions) ? finalVerdict.topThreeActions : [],
        supportingFactIds: Array.isArray(finalVerdict.supportingFactIds) ? finalVerdict.supportingFactIds : [],
      },

      dataQuality: {
        overallConfidence: overallConf,
        verifiedFactCount: dataQuality.verifiedFactCount,
        supportingFacts,
      },

      supportingFactIds: combinedFactIds,
    };
  }

  /**
   * Builds a dossier from database tables (VehicleVariant + Problem + Recall)
   * and legacy AiVehicleReport (for scores) when no GeneratedVehicleReport is present.
   */
  private async buildFallbackDossierFromDb(variantId: string): Promise<VehicleComparisonDossier> {
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: variantId },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        specs: true,
        problems: { where: { status: ApprovalStatus.APPROVED } },
        recalls: { where: { status: ApprovalStatus.APPROVED } },
      },
    }).catch(() => null);

    const legacyReport = await this.prisma.aiVehicleReport.findUnique({
      where: { variantId_languageCode: { variantId, languageCode: 'tr' } },
    }).catch(() => null);

    if (!variant) {
      return {
        variantId,
        reportAvailable: false,
        vehicleIdentity: {
          brand: 'Bilinmeyen',
          model: 'Araç',
          modelYear: new Date().getFullYear(),
        },
        scoring: {
          buyabilityScore: null,
          technicalRiskScore: null,
          variantConfidenceScore: null,
          dataConfidenceScore: null,
          overallConfidence: 'LOW',
        },
        engineTransmission: { maintenanceSensitivity: [], knownLimitations: [], supportingFactIds: [] },
        performanceUsage: { supportingFactIds: [] },
        commonProblems: [],
        recalls: [],
        maintenanceOwnership: { criticalMaintenanceNotes: [], supportingFactIds: [] },
        usageScenarios: [],
        dataQuality: { overallConfidence: 'LOW', supportingFacts: [] },
        supportingFactIds: [],
      };
    }

    const specData: Record<string, any> = (variant.specs?.specs as Record<string, any>) || {};

    const problems: VehicleComparisonDossierProblem[] = (variant.problems || []).slice(0, 6).map(p => ({
      title: p.title,
      system: (p as any).affectedComponent || (p as any).category || undefined,
      severity: (p.riskLevel || 'ORTA') as string,
      symptoms: p.checkRecommendation ? [p.checkRecommendation] : [],
      causeExplanation: p.description || undefined,
      preventionAdvice: p.description || undefined,
      inspectionStep: p.checkRecommendation || undefined,
      supportingFactIds: [],
    }));

    const recalls: VehicleComparisonDossierRecall[] = (variant.recalls || []).slice(0, 4).map(r => ({
      title: r.title,
      riskDescription: r.riskLevel ? `${r.riskLevel} Risk Seviyesi: ${r.description}` : r.description,
      remedyDescription: undefined,
      supportingFactIds: [],
    }));

    const hp = specData.horsepower ? Number(specData.horsepower) : undefined;
    const torque = specData.torqueNm ? Number(specData.torqueNm) : undefined;
    const zeroToHundred = specData.acceleration0to100 ? Number(specData.acceleration0to100) : undefined;
    const topSpeed = specData.topSpeed ? Number(specData.topSpeed) : undefined;
    const combinedFuel = specData.averageFuelConsumption ? Number(specData.averageFuelConsumption) : undefined;
    const bootLitres = specData.luggageCapacity ? Number(specData.luggageCapacity) : undefined;

    const maintenanceNotes: string[] = [];
    if (problems.length > 0) {
      maintenanceNotes.push(`${variant.brand?.name} ${variant.model?.name} periyodik motor yağı ve arıza kontrolü`);
    }

    return {
      variantId,
      reportAvailable: false,
      vehicleIdentity: {
        brand: variant.brand?.name || '',
        model: variant.model?.name || '',
        generation: variant.generation?.name,
        bodyType: variant.generation?.bodyType,
        modelYear: variant.year,
        engineCode: variant.engine?.code,
        enginePowerHp: hp,
        fuelType: variant.fuelType,
        transmissionName: variant.transmission?.name,
        trimName: variant.trim?.name,
        supportingFactIds: [],
      },
      scoring: {
        buyabilityScore: legacyReport?.buyabilityScore ?? null,
        technicalRiskScore: legacyReport?.riskScore ?? null,
        variantConfidenceScore: null,
        dataConfidenceScore: null,
        overallConfidence: 'LOW',
      },
      engineTransmission: {
        combinationAssessment: `${variant.brand?.name} ${variant.engine?.code || ''} motor ve ${variant.transmission?.name || ''} şanzıman veritabanı verisi.`,
        maintenanceSensitivity: [],
        knownLimitations: [],
        supportingFactIds: [],
      },
      performanceUsage: {
        powerHp: hp,
        torqueNm: torque,
        zeroToHundredKmh: zeroToHundred,
        topSpeedKmh: topSpeed,
        combinedFuelL100km: combinedFuel,
        trunkCapacityLiters: bootLitres,
        supportingFactIds: [],
      },
      commonProblems: problems,
      recalls: recalls,
      maintenanceOwnership: {
        criticalMaintenanceNotes: maintenanceNotes,
        supportingFactIds: [],
      },
      usageScenarios: [],
      executiveSummary: {
        oneSentenceSummary: problems.length > 0
          ? `${variant.brand?.name} ${variant.model?.name} (${variant.year}) veritabanımızdaki ${problems.length} adet arıza kaydıyla listelenmektedir.`
          : 'Veritabanında kayıtlı kronik sorun bulunamadı; bu durum aracın risksiz olduğu anlamına gelmez.',
        bestFor: [],
        notIdealFor: [],
        keyWarnings: [],
      },
      finalVerdict: {
        overallAssessment: 'Doğrulanmış veritabanı verileriyle değerlendirilmiştir.',
        bestFor: [],
        avoidIf: [],
        topThreeActions: [],
        supportingFactIds: [],
      },
      dataQuality: {
        overallConfidence: 'LOW',
        supportingFacts: [],
      },
      supportingFactIds: [],
    };
  }
}
