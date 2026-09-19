import { Injectable, NotFoundException, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleCharacterResearchService } from '../research/vehicle-character-research.service';
import { VehiclePowerEnrichmentService } from '../vehicle/vehicle-power-enrichment.service';
import { VariantTechnicalFactsService } from '../vehicle/variant-technical-facts.service';
import * as crypto from 'crypto';

@Injectable()
export class VehicleReportContextBuilderService {
  private readonly logger = new Logger(VehicleReportContextBuilderService.name);

  constructor(
    private prisma: PrismaService,
    private vehicleCharacterResearch: VehicleCharacterResearchService,
    @Optional() private powerEnrichmentService?: VehiclePowerEnrichmentService,
    @Optional()
    @Inject(forwardRef(() => VariantTechnicalFactsService))
    private variantTechnicalFactsService?: VariantTechnicalFactsService,
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

    // ─── Asynchronous character research ──────────────────────────────────────
    // If characterResearchCache is null, launch research asynchronously in background
    // so the HTTP report request finishes instantly without locking memory or hitting OOM.
    let characterResearchCache = (variant as any).characterResearchCache || null;

    if (!characterResearchCache) {
      this.logger.log(
        `characterResearchCache is null for variant ${variantId} — launching background research`,
      );
      // Non-blocking async execution
      this.runCharacterResearchInBackground(variant).catch((err) =>
        this.logger.error(
          `Background character research failed for variant ${variantId}: ${err.message}`,
        ),
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────────
    const isHybridVariant = variant.fuelType === 'HYBRID' || (variant.engine?.fuelType || '').toUpperCase() === 'HYBRID';
    const isElectricVariant = variant.fuelType === 'ELECTRIC' || variant.engine?.isElectric || (variant.engine?.fuelType || '').toUpperCase() === 'ELECTRIC';
    let rawEngineCc = specsJson.engineDisplacementCc || variant.engine?.displacement || null;

    if (!rawEngineCc && !isElectricVariant && this.variantTechnicalFactsService) {
      try {
        let facts = await this.variantTechnicalFactsService.getVariantTechnicalFacts(variantId);
        if (!facts?.engineDisplacementCc && facts?.engineDisplacement?.status !== 'VERIFIED') {
          facts = await this.variantTechnicalFactsService.enrichVariantTechnicalSpecs(variantId);
        }
        if (facts?.engineDisplacementCc) {
          rawEngineCc = facts.engineDisplacementCc;
        } else if (facts?.engineDisplacement?.valueCc) {
          rawEngineCc = facts.engineDisplacement.valueCc;
        }
      } catch (err: any) {
        this.logger.warn(`[CONTEXT BUILDER] Technical facts displacement resolution skipped: ${err?.message}`);
      }
    }

    const engineCc = isElectricVariant ? null : rawEngineCc;

    const transName = variant.transmission?.name || null;
    const transSpeeds = specsJson.transmissionSpeeds || variant.transmission?.speeds || null;
    const driveType = specsJson.drivetrain || (variant as any).driveType || null;
    const zeroToHundred = specsJson.acceleration0to100 ?? specsJson.zeroToHundredKmh ?? null;
    const topSpeedVal = specsJson.topSpeed ?? specsJson.topSpeedKmh ?? null;
    const weightVal = specsJson.weight ?? specsJson.curbWeightKg ?? null;
    const trunkVal = specsJson.luggageCapacity ?? specsJson.trunkCapacityLiters ?? null;
    const fuelTankVal = specsJson.fuelTankCapacityLiters ?? specsJson.fuelTankLiters ?? null;
    const cityFuelVal = specsJson.cityFuelConsumption ?? specsJson.cityFuelL100km ?? null;
    const highwayFuelVal = specsJson.highwayFuelConsumption ?? specsJson.highwayFuelL100km ?? null;
    const combinedFuelVal = specsJson.averageFuelConsumption ?? specsJson.combinedFuelL100km ?? null;

    // ─────────────────────────────────────────────────────────────────────────
    // CANONICAL EXACT-VARIANT POWER RESOLUTION (NO HEURISTICS, ZERO PLACEHOLDERS)
    // ─────────────────────────────────────────────────────────────────────────
    // Priority 1: Verified side-car VehiclePowerEnrichment (grounded exact variant research)
    let powerEnrichment = await this.prisma.vehiclePowerEnrichment.findUnique({
      where: { vehicleVariantId: variantId },
    });

    if ((!powerEnrichment || powerEnrichment.verificationStatus !== 'VERIFIED') && this.powerEnrichmentService) {
      try {
        const researched = await this.powerEnrichmentService.researchVariantPower(variantId);
        if (researched) {
          powerEnrichment = researched as any;
        }
      } catch (err: any) {
        this.logger.warn(`[POWER ENRICHMENT AUTORUN] Exact-variant power research skipped: ${err?.message}`);
      }
    }

    const isEnrichmentVerified = powerEnrichment?.verificationStatus === 'VERIFIED' && typeof powerEnrichment.powerHp === 'number' && powerEnrichment.powerHp > 0;

    // Priority 2: Verified TechnicalSpec table
    const isSpecVerified = typeof specsJson.enginePowerHp === 'number' && specsJson.enginePowerHp > 0;

    let engineHp: number | null = null;
    let powerUnit: 'HP' | 'PS' | 'kW' | undefined = undefined;
    let powerSource: 'VEHICLE_DATABASE' | undefined = undefined;
    let powerSemantic: 'TOTAL_HYBRID_SYSTEM_POWER' | 'STANDARD_POWER' | undefined = undefined;

    if (isEnrichmentVerified && powerEnrichment) {
      engineHp = powerEnrichment.powerHp;
      powerUnit = (powerEnrichment.sourceReportedUnit as any) || 'HP';
      powerSource = 'VEHICLE_DATABASE';
      powerSemantic = isHybridVariant ? 'TOTAL_HYBRID_SYSTEM_POWER' : 'STANDARD_POWER';
    } else if (isSpecVerified) {
      engineHp = specsJson.enginePowerHp;
      powerUnit = specsJson.powerUnit || 'HP';
      powerSource = 'VEHICLE_DATABASE';
      powerSemantic = isHybridVariant ? 'TOTAL_HYBRID_SYSTEM_POWER' : 'STANDARD_POWER';
    } else if (variant.engine?.horsepower && !isHybridVariant) {
      // Check if DB horsepower is a known dummy placeholder
      const rawDbHp = variant.engine.horsepower;
      const rawDbTorque = variant.engine.torque;
      const isDummyPair = (rawDbHp === 100 && rawDbTorque === 200) || (rawDbHp === 110 && rawDbTorque === 143);
      if (!isDummyPair) {
        engineHp = rawDbHp;
        powerUnit = 'HP';
        powerSource = 'VEHICLE_DATABASE';
        powerSemantic = 'STANDARD_POWER';
      }
    }

    // Engine-Identity Sibling Power Resolution (Canonical Variant Fact Reuse)
    if (!engineHp && variant.engineId && variant.modelId && variant.brandId) {
      const verifiedSibling = await this.prisma.vehicleVariant.findFirst({
        where: {
          brandId: variant.brandId,
          modelId: variant.modelId,
          engineId: variant.engineId,
          id: { not: variant.id },
          powerEnrichment: {
            verificationStatus: 'VERIFIED',
          },
        },
        include: {
          powerEnrichment: true,
        },
      });
      if (verifiedSibling?.powerEnrichment?.powerHp) {
        engineHp = verifiedSibling.powerEnrichment.powerHp;
        powerUnit = (verifiedSibling.powerEnrichment.sourceReportedUnit as any) || 'HP';
        powerSource = 'VEHICLE_DATABASE';
        powerSemantic = isHybridVariant ? 'TOTAL_HYBRID_SYSTEM_POWER' : 'STANDARD_POWER';
      }
    }

    // Torque Resolution
    let engineTorque: number | null = null;
    let torqueUnit: string | undefined = undefined;
    let torqueSource: 'VEHICLE_DATABASE' | undefined = undefined;
    let torqueSemantic: string | undefined = undefined;

    if (typeof specsJson.engineTorqueNm === 'number' && specsJson.engineTorqueNm > 0) {
      engineTorque = specsJson.engineTorqueNm;
      torqueUnit = specsJson.torqueUnit || 'Nm';
      torqueSource = 'VEHICLE_DATABASE';
      torqueSemantic = isHybridVariant ? 'TOTAL_HYBRID_SYSTEM_TORQUE' : 'STANDARD_TORQUE';
    } else if (variant.engine?.torque && !isHybridVariant) {
      const rawDbHp = variant.engine.horsepower;
      const rawDbTorque = variant.engine.torque;
      const isDummyPair = (rawDbHp === 100 && rawDbTorque === 200) || (rawDbHp === 110 && rawDbTorque === 143);
      if (!isDummyPair) {
        engineTorque = rawDbTorque;
        torqueUnit = 'Nm';
        torqueSource = 'VEHICLE_DATABASE';
        torqueSemantic = 'STANDARD_TORQUE';
      }
    }

    const performanceData: Record<string, any> = {
      enginePowerHp: engineHp,
      powerUnit: powerUnit,
      powerSource: powerSource,
      powerSemantic: powerSemantic,
      engineTorqueNm: engineTorque,
      torqueUnit: torqueUnit,
      torqueSource: torqueSource,
      torqueSemantic: torqueSemantic,
      engineDisplacementCc: engineCc,
      transmissionName: transName || null,
      transmissionSpeeds: null, // Let AI derive exact gear count (e.g. 6-speed for Kia Cerato, 5-speed for Civic)
      drivetrain: driveType,
      zeroToHundredKmh: zeroToHundred,
      topSpeedKmh: topSpeedVal,
      curbWeightKg: weightVal,
      trunkCapacityLiters: trunkVal,
      fuelTankCapacityLiters: fuelTankVal,
      cityFuelL100km: cityFuelVal,
      highwayFuelL100km: highwayFuelVal,
      combinedFuelL100km: combinedFuelVal,
    };

    const contextObj = {
      vehicleIdentity: {
        variantId: variant.id,
        brand: variant.brand?.name || 'Belirtilmemiş',
        model: variant.model?.name || 'Belirtilmemiş',
        generation: variant.generation?.name || 'Belirtilmemiş',
        bodyType: variant.bodyType || 'Sedan',
        modelYear: variant.year,
        engineDisplacementCc: engineCc,
        enginePowerHp: engineHp,
        powerUnit: powerUnit,
        powerSource: powerSource,
        powerSemantic: powerSemantic,
        engineTorqueNm: engineTorque,
        torqueUnit: torqueUnit,
        torqueSource: torqueSource,
        torqueSemantic: torqueSemantic,
        engineCode: variant.engine?.code || variant.engine?.description || 'Orijinal Motor',
        engineType: specsJson.engineType || null,
        fuelType: variant.fuelType === 'PETROL' ? 'Benzin' : variant.fuelType === 'DIESEL' ? 'Dizel' : variant.fuelType === 'HYBRID' ? 'Hibrit' : variant.fuelType === 'ELECTRIC' ? 'Elektrik' : variant.fuelType === 'LPG' ? 'LPG & Benzin' : 'Benzin',
        transmissionName: transName || 'Otomatik',
        transmissionCode: variant.transmission?.type || 'AUTOMATIC',
        drivetrain: driveType,
        trimName: variant.trim?.name || 'Standart Donanım',
        marketRegion: variant.marketRegion || 'TR',
        variantMatchConfidence: 'KESİN',
      },
      performanceSpecs: performanceData,
      verifiedDatabaseVehicleReport: {
        summary: reportCache?.summary || null,
        riskScore: reportCache?.riskScore ?? null,
        buyabilityScore: reportCache?.buyabilityScore ?? null,
        knownDatabaseProblems: variant.problems.map((p) => {
          const rawType = String((p as any).problemType || '').toUpperCase();
          const pStatus = String((p as any).status || '').toUpperCase();
          const isVerified =
            rawType === 'VERIFIED_FAILURE' ||
            rawType === 'COMMON_PROBLEM' ||
            rawType === 'CHRONIC' ||
            rawType === 'RECALL' ||
            rawType === 'TSB' ||
            pStatus === 'APPROVED';

          const pType = isVerified
            ? 'VERIFIED_FAILURE'
            : (rawType === 'OBSERVED_BEHAVIOR' ? 'OBSERVED_BEHAVIOR' : 'REPORTED_COMPLAINT');

          let pTitle = p.title || 'Mekanik Gözlem';
          if (pType === 'REPORTED_COMPLAINT') {
            if (pTitle.toLowerCase().includes('silecek motoru arızası') || (pTitle.toLowerCase().includes('silecek') && pTitle.toLowerCase().includes('arızası'))) {
              pTitle = 'Otomatik Silecek Performansı Şikâyetleri';
            } else if (pTitle.endsWith('Arızası')) {
              pTitle = pTitle.replace(/Arızası$/, 'Şikâyetleri');
            }
          }

          return {
            id: p.id,
            title: pTitle,
            description: p.description,
            riskLevel: p.riskLevel,
            symptoms: (p as any).symptoms || null,
            checkRecommendation: (p as any).checkRecommendation || null,
            category: (p as any).affectedEngine || (p as any).affectedTransmission || 'Mekanik',
            problemType: pType,
          };
        }),
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

  private async runCharacterResearchInBackground(variant: any): Promise<void> {
    this.logger.log(`Starting background character research for variant ${variant.id}`);
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

      await this.prisma.vehicleVariant.update({
        where: { id: variant.id },
        data: {
          characterResearchCache: result as any,
          characterResearchedAt: new Date(),
        } as any,
      });

      this.logger.log(
        `Background character research completed & saved for variant ${variant.id}. Total sources: ${result.totalSourcesFound}`,
      );
    } catch (err: any) {
      this.logger.error(`Background character research failed for ${variant.id}: ${err.message}`);
    } finally {
      // Explicitly trigger garbage collection if exposed
      if (typeof global.gc === 'function') {
        global.gc();
      }
    }
  }
}

