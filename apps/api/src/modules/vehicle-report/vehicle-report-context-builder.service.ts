import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleCharacterResearchService } from '../research/vehicle-character-research.service';
import * as crypto from 'crypto';

@Injectable()
export class VehicleReportContextBuilderService {
  private readonly logger = new Logger(VehicleReportContextBuilderService.name);

  constructor(
    private prisma: PrismaService,
    private vehicleCharacterResearch: VehicleCharacterResearchService,
  ) {}

  async buildVehicleContext(variantId: string) {
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
        problems: {
          where: { status: 'APPROVED' },
          orderBy: { riskLevel: 'desc' },
        },
        checklists: {
          where: { status: 'APPROVED' },
          orderBy: { priority: 'asc' },
        },
        trimEquipments: {
          include: {
            features: true,
            comparisons: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Varyant bulunamadı: ${variantId}`);
    }

    const reportCache = await this.prisma.aiVehicleReport.findUnique({
      where: {
        variantId_languageCode: {
          variantId,
          languageCode: 'tr',
        },
      },
    });

    const specsJson = (variant.specs?.specs as any) || {};

    // ─── On-demand character research ────────────────────────────────────────
    // If characterResearchCache is null (first time or stale), run the 7-question
    // web research now so the LLM gets real web evidence for the vehicleCharacter section.
    let characterResearchCache = (variant as any).characterResearchCache || null;

    if (!characterResearchCache) {
      this.logger.log(
        `characterResearchCache is null for variant ${variantId} — running on-demand research`,
      );
      try {
        const result = await this.vehicleCharacterResearch.runCharacterResearch({
          year: variant.year,
          brand: variant.brand?.name,
          model: variant.model?.name,
          generation: variant.generation?.name,
          bodyType: (variant.bodyType as string) || undefined,
          engineCode: variant.engine?.code,
          enginePowerHp: (variant.engine as any)?.powerHp,
          transmissionName: variant.transmission?.name,
          transmissionType: (variant.transmission as any)?.type,
          driveType: (variant as any).driveType,
          trimName: variant.trim?.name,
          market: variant.marketRegion || 'TR',
          languageCode: 'tr',
        });

        characterResearchCache = result;

        // Persist to DB so subsequent reports use the cached result
        await this.prisma.vehicleVariant.update({
          where: { id: variantId },
          data: {
            characterResearchCache: result as any,
            characterResearchedAt: new Date(),
          } as any,
        });

        this.logger.log(
          `On-demand character research completed for variant ${variantId}. Sources: ${result.totalSourcesFound}`,
        );
      } catch (err: any) {
        this.logger.error(
          `On-demand character research failed for variant ${variantId}: ${err.message}`,
        );
        // Non-fatal: continue report generation without character research data
        characterResearchCache = null;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Build complete factory performance and technical specs
    const performanceData: Record<string, any> = {};
    if (specsJson.enginePowerHp) performanceData.enginePowerHp = specsJson.enginePowerHp;
    if (specsJson.enginePowerKw) performanceData.enginePowerKw = specsJson.enginePowerKw;
    if (specsJson.enginePowerRpm) performanceData.powerRpm = specsJson.enginePowerRpm;
    if (specsJson.engineTorqueNm) performanceData.engineTorqueNm = specsJson.engineTorqueNm;
    if (specsJson.engineTorqueRpm) performanceData.torqueRpm = specsJson.engineTorqueRpm;
    if (specsJson.engineDisplacementCc) performanceData.engineDisplacementCc = specsJson.engineDisplacementCc;
    if (specsJson.engineType) performanceData.engineType = specsJson.engineType;
    if (specsJson.zeroToHundredKmh) performanceData.zeroToHundredKmh = specsJson.zeroToHundredKmh;
    if (specsJson.topSpeed) performanceData.topSpeedKmh = specsJson.topSpeed;
    if (specsJson.averageFuelConsumption) performanceData.combinedFuelL100km = specsJson.averageFuelConsumption;
    if (specsJson.cityFuelConsumption) performanceData.cityFuelL100km = specsJson.cityFuelConsumption;
    if (specsJson.highwayFuelConsumption) performanceData.highwayFuelL100km = specsJson.highwayFuelConsumption;
    if (specsJson.fuelTankCapacityLiters || specsJson.fuelTankLiters) performanceData.fuelTankCapacityLiters = specsJson.fuelTankCapacityLiters || specsJson.fuelTankLiters;
    if (specsJson.estimatedRangeKm) performanceData.estimatedRangeKm = specsJson.estimatedRangeKm;
    if (specsJson.weight) performanceData.curbWeightKg = specsJson.weight;
    if (specsJson.luggageCapacity) performanceData.trunkCapacityLiters = specsJson.luggageCapacity;
    if (specsJson.drivetrain) performanceData.drivetrain = specsJson.drivetrain;
    if (specsJson.dimensionsMm) performanceData.dimensionsMm = specsJson.dimensionsMm;

    const contextObj = {
      vehicleIdentity: {
        variantId: variant.id,
        brand: variant.brand?.name || 'Belirtilmemiş',
        model: variant.model?.name || 'Belirtilmemiş',
        generation: variant.generation?.name || 'Belirtilmemiş',
        bodyType: variant.bodyType || 'Belirtilmemiş',
        modelYear: variant.year,
        engineDisplacementCc: specsJson.engineDisplacementCc || undefined,
        enginePowerHp: specsJson.enginePowerHp || undefined,
        engineTorqueNm: specsJson.engineTorqueNm || undefined,
        engineCode: variant.engine?.code || undefined,
        engineType: specsJson.engineType || undefined,
        enginePowerRpm: specsJson.enginePowerRpm || undefined,
        engineTorqueRpm: specsJson.engineTorqueRpm || undefined,
        fuelType: variant.fuelType || 'Belirtilmemiş',
        transmissionName: variant.transmission?.name || 'Belirtilmemiş',
        transmissionCode: variant.transmission?.type || undefined,
        drivetrain: specsJson.drivetrain || 'Belirtilmemiş',
        trimName: variant.trim?.name || undefined,
        dimensionsMm: specsJson.dimensionsMm || undefined,
        marketRegion: variant.marketRegion || 'TR',
        variantMatchConfidence: variant.engine?.code && variant.transmission?.name ? 'KESİN' : 'YÜKSEK',
      },
      performanceSpecs: Object.keys(performanceData).length > 0 ? performanceData : null,
      verifiedDatabaseVehicleReport: {
        summary: reportCache?.summary || null,
        riskScore: reportCache?.riskScore ?? null,
        buyabilityScore: reportCache?.buyabilityScore ?? null,
        knownDatabaseProblems: variant.problems.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          riskLevel: p.riskLevel,
          symptoms: (p as any).symptoms || null,
          checkRecommendation: (p as any).checkRecommendation || null,
          category: (p as any).affectedEngine || (p as any).affectedTransmission || 'Mekanik',
          problemType: (p as any).problemType || 'CHRONIC',
        })),
        inspectionChecklist: (variant.checklists || []).map((c) => ({
          id: c.id,
          category: c.category,
          title: c.title,
          description: c.description,
          priority: c.priority,
        })),
      },
      equipmentIntelligence: (variant.trimEquipments && variant.trimEquipments.length > 0) ? {
        periodStatus: variant.trimEquipments[0].periodStatus,
        equipmentRevision: variant.trimEquipments[0].equipmentRevision,
        highlights: variant.trimEquipments[0].highlights,
        signatures: variant.trimEquipments[0].signatures,
        features: variant.trimEquipments[0].features.map(f => ({
          featureCode: f.featureCode,
          featureName: f.featureName,
          category: f.category,
          status: f.status,
          valueText: f.valueText,
          valueNumber: f.valueNumber,
          unit: f.unit,
          availabilityConditions: f.availabilityConditions,
          confidenceScore: f.confidenceScore,
        }))
      } : null,
      // Vehicle character research: 7-question web research results
      // null = research failed or Tavily returned no results
      vehicleCharacterResearch: characterResearchCache,
    };

    const contextHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(contextObj))
      .digest('hex');

    return {
      vehicleContext: contextObj,
      vehicleContextHash: contextHash,
    };
  }
}
