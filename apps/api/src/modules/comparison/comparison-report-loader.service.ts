import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CURRENT_REPORT_VERSION } from '../vehicle-report/vehicle-report-cache.service';
import { ApprovalStatus } from '@prisma/client';
import { ExpertDecisionSynthesis, ReportSupportingFact } from '@used-car-intelligence/shared';

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

@Injectable()
export class ComparisonReportLoaderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Fetches the latest valid GeneratedVehicleReport for a variantId
   * according to TorqueScout report selection rules.
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

    return fallbackVersionReport;
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
    const supportingFacts = Array.isArray(dataQuality.supportingFacts) ? dataQuality.supportingFacts : [];

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

      supportingFactIds: uniqueFactIds,
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
