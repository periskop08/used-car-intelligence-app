import { Injectable, NotFoundException, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleCharacterResearchService } from '../research/vehicle-character-research.service';
import { VehiclePowerEnrichmentService } from '../vehicle/vehicle-power-enrichment.service';
import { VariantTechnicalFactsService } from '../vehicle/variant-technical-facts.service';
import { resolveAutomotiveEngineTaxonomy, lookupAutomotiveTransmissionTaxonomy } from '@used-car-intelligence/shared';
import { isUserNeglectOrRoutineMaintenance } from './vehicle-report-auditor.service';
import * as crypto from 'crypto';
import OpenAI from 'openai';

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
    const researchedAt = (variant as any).characterResearchedAt ? new Date((variant as any).characterResearchedAt).getTime() : 0;
    const isCacheExpired = researchedAt > 0 && Date.now() - researchedAt > 14 * 24 * 60 * 60 * 1000;

    if (isCacheExpired && characterResearchCache) {
      this.logger.log(
        `characterResearchCache expired for variant ${variantId} (>14 days) — invalidating stale cache`,
      );
      characterResearchCache = null;
    }

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

    const brandName = ((variant as any).brand?.name || (variant.model as any)?.brand?.name || '').toLowerCase();
    const modelName = (variant.model?.name || '').toLowerCase();

    // Canonical Engine Taxonomy Resolution (Exact Catalog cc & Timing Architecture)
    const engineTaxonomy = resolveAutomotiveEngineTaxonomy({
      brand: brandName,
      model: modelName,
      engineCode: variant.engine?.code,
      engineDesc: variant.engine?.description,
      modelYear: variant.year,
      fuelType: variant.fuelType || variant.engine?.fuelType,
      isElectric: isElectricVariant,
      isHybrid: isHybridVariant,
    });

    const isDieselVariant =
      variant.fuelType === 'DIESEL' ||
      (variant.engine?.fuelType || '').toUpperCase() === 'DIESEL' ||
      engineTaxonomy.canonicalFuelType === 'DIESEL' ||
      /dizel|diesel|\bdci\b|\btdi\b|\bhdi\b|\bbluehdi\b|\bcrdi\b|\bcdti\b|\bmultijet\b|\bjtd\b|\bcdi\b|\bd4d\b|\btdci\b|\becoblue\b|\bbluetec\b/i.test(
        `${variant.engine?.code || ''} ${variant.engine?.description || ''}`,
      );

    let rawEngineCc = specsJson.engineDisplacementCc || variant.engine?.displacement || null;

    if (engineTaxonomy.catalogDisplacementCc) {
      rawEngineCc = engineTaxonomy.catalogDisplacementCc;
    } else {
      const isRoundedMarketingCc =
        rawEngineCc &&
        rawEngineCc % 100 === 0 &&
        [1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000].includes(rawEngineCc);

      if ((!rawEngineCc || isRoundedMarketingCc) && !isElectricVariant && this.variantTechnicalFactsService) {
        try {
          let facts = await this.variantTechnicalFactsService.getVariantTechnicalFacts(variantId);
          if (
            (!facts?.engineDisplacementCc || facts.engineDisplacementCc % 100 === 0) &&
            facts?.engineDisplacement?.status !== 'VERIFIED'
          ) {
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
    }

    const engineCc = isElectricVariant ? null : rawEngineCc;

    const transName = variant.transmission?.name || null;
    const transSpeeds = specsJson.transmissionSpeeds || null;
    const driveType = specsJson.drivetrain || (variant as any).driveType || null;
    let zeroToHundred = specsJson.acceleration0to100 ?? specsJson.zeroToHundredKmh ?? specsJson.zeroToHundredSec ?? null;
    let topSpeedVal = specsJson.topSpeed ?? specsJson.topSpeedKmh ?? null;
    let weightVal = specsJson.weight ?? specsJson.curbWeightKg ?? specsJson.weightKg ?? null;
    let trunkVal = specsJson.luggageCapacity ?? specsJson.trunkCapacityLiters ?? specsJson.luggageCapacityL ?? null;
    let electricRangeVal = specsJson.electricRangeWltpKm ?? specsJson.electricRangeKm ?? null;
    let batteryCapacityVal = specsJson.batteryCapacityKwh ?? null;
    const fuelTankVal = specsJson.fuelTankCapacityLiters ?? specsJson.fuelTankLiters ?? null;
    const cityFuelVal = specsJson.cityFuelConsumption ?? specsJson.cityFuelL100km ?? null;
    const highwayFuelVal = specsJson.highwayFuelConsumption ?? specsJson.highwayFuelL100km ?? null;
    let combinedFuelVal = specsJson.averageFuelConsumption ?? specsJson.combinedFuelL100km ?? null;

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

    // ─────────────────────────────────────────────────────────────────────────
    // PHYSICAL CATALOG SPECIFICATION RESOLUTION (0-100, Top Speed, Trunk, Weight, EV Range)
    // ─────────────────────────────────────────────────────────────────────────
    const isPhysicalSpecsMissing = (
      zeroToHundred === null ||
      topSpeedVal === null ||
      weightVal === null ||
      trunkVal === null ||
      typeof specsJson?.transmissionSpeeds !== 'number' ||
      !specsJson?.transmissionTypeAndSpeeds ||
      (isElectricVariant && (electricRangeVal === null || batteryCapacityVal === null))
    );

    let researchedData: Record<string, any> | null = null;
    if (isPhysicalSpecsMissing) {
      try {
        const researched = await this.researchPhysicalSpecsViaAi(variant, engineHp);
        if (researched) {
          researchedData = researched;
          if (zeroToHundred === null && typeof researched.acceleration0to100 === 'number') {
            zeroToHundred = researched.acceleration0to100;
          }
          if (topSpeedVal === null && typeof researched.topSpeed === 'number') {
            topSpeedVal = researched.topSpeed;
          }
          if (weightVal === null && typeof researched.weight === 'number') {
            weightVal = researched.weight;
          }
          if (trunkVal === null && typeof researched.luggageCapacity === 'number') {
            trunkVal = researched.luggageCapacity;
          }
          if (isElectricVariant) {
            if (electricRangeVal === null && typeof researched.electricRangeWltpKm === 'number') {
              electricRangeVal = researched.electricRangeWltpKm;
            }
            if (batteryCapacityVal === null && typeof researched.batteryCapacityKwh === 'number') {
              batteryCapacityVal = researched.batteryCapacityKwh;
            }
          }
          if (combinedFuelVal === null && typeof researched.averageFuelConsumption === 'number') {
            combinedFuelVal = researched.averageFuelConsumption;
          }

          // Cache researched specs to TechnicalSpec table in Prisma
          const currentSpecsData = typeof variant.specs?.specs === 'object' && variant.specs?.specs !== null
            ? (variant.specs.specs as Record<string, any>)
            : {};
          
          await this.prisma.technicalSpec.upsert({
            where: { variantId: variant.id },
            create: {
              variantId: variant.id,
              specs: {
                ...currentSpecsData,
                ...researched,
                topSpeedKmh: topSpeedVal,
                zeroToHundredKmh: zeroToHundred,
                zeroToHundredSec: zeroToHundred,
                curbWeightKg: weightVal,
                weightKg: weightVal,
                trunkCapacityLiters: trunkVal,
                luggageCapacityL: trunkVal,
                electricRangeWltpKm: electricRangeVal,
                batteryCapacityKwh: batteryCapacityVal,
                transmissionTypeAndSpeeds: researched.transmissionTypeAndSpeeds || currentSpecsData.transmissionTypeAndSpeeds || null,
                transmissionSpeeds: typeof researched.transmissionSpeeds === 'number' ? researched.transmissionSpeeds : (typeof currentSpecsData.transmissionSpeeds === 'number' ? currentSpecsData.transmissionSpeeds : null),
                transmissionCode: researched.transmissionCode || currentSpecsData.transmissionCode || null,
                clutchType: researched.clutchType || currentSpecsData.clutchType || null,
              },
            },
            update: {
              specs: {
                ...currentSpecsData,
                ...researched,
                topSpeedKmh: topSpeedVal,
                zeroToHundredKmh: zeroToHundred,
                zeroToHundredSec: zeroToHundred,
                curbWeightKg: weightVal,
                weightKg: weightVal,
                trunkCapacityLiters: trunkVal,
                luggageCapacityL: trunkVal,
                electricRangeWltpKm: electricRangeVal,
                batteryCapacityKwh: batteryCapacityVal,
                transmissionTypeAndSpeeds: researched.transmissionTypeAndSpeeds || currentSpecsData.transmissionTypeAndSpeeds || null,
                transmissionSpeeds: typeof researched.transmissionSpeeds === 'number' ? researched.transmissionSpeeds : (typeof currentSpecsData.transmissionSpeeds === 'number' ? currentSpecsData.transmissionSpeeds : null),
                transmissionCode: researched.transmissionCode || currentSpecsData.transmissionCode || null,
                clutchType: researched.clutchType || currentSpecsData.clutchType || null,
              },
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(`[PHYSICAL SPECS RESOLUTION] AI catalog research skipped: ${err?.message}`);
      }
    }

    const researchedTrans = (researchedData && typeof researchedData.transmissionSpeeds === 'number' && researchedData.transmissionTypeAndSpeeds)
      ? researchedData
      : ((typeof specsJson?.transmissionSpeeds === 'number' && specsJson?.transmissionTypeAndSpeeds) ? specsJson : null);

    const fallbackTaxonomy = lookupAutomotiveTransmissionTaxonomy({
      brand: variant.brand?.name,
      model: variant.model?.name,
      engineCode: variant.engine?.code,
      modelYear: variant.year,
      fuelType: variant.fuelType,
      transmissionName: transName,
      transmissionType: variant.transmission?.type,
      speeds: transSpeeds,
      hasTurbo: variant.engine?.hasTurbo,
      isElectric: isElectricVariant,
      isHybrid: isHybridVariant,
    });

    const isAudiBrand = (variant.brand?.name || '').toLowerCase().includes('audi');
    const transTaxonomy = researchedTrans
      ? {
          transmissionFamily: researchedTrans.clutchType === 'TORK_KONVERTORLU' ? (isAudiBrand ? 'TIPTRONIC' : 'TORK KONVERTÖRLÜ') : (researchedTrans.clutchType === 'KURU_CIFT_KAVRAMA' ? (isAudiBrand ? 'S-TRONIC' : 'DSG') : researchedTrans.clutchType),
          clutchType: researchedTrans.clutchType || fallbackTaxonomy.clutchType,
          clutchTypeTr: researchedTrans.clutchTypeTr || fallbackTaxonomy.clutchTypeTr,
          transmissionTypeAndSpeeds: researchedTrans.transmissionTypeAndSpeeds || fallbackTaxonomy.transmissionTypeAndSpeeds,
          transmissionSpeeds: researchedTrans.transmissionSpeeds || fallbackTaxonomy.transmissionSpeeds,
          transmissionCode: researchedTrans.transmissionCode || fallbackTaxonomy.transmissionCode,
          maintenanceDescriptionTr: researchedTrans.maintenanceDescriptionTr || fallbackTaxonomy.maintenanceDescriptionTr,
          confidence: 'AI_CATALOG_RESEARCHED',
        }
      : fallbackTaxonomy;

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
      transmissionName: transTaxonomy.transmissionTypeAndSpeeds || transName || null,
      transmissionSpeeds: transTaxonomy.transmissionSpeeds || null,
      clutchType: transTaxonomy.clutchType,
      clutchTypeTr: transTaxonomy.clutchTypeTr,
      transmissionFamily: transTaxonomy.transmissionFamily,
      drivetrain: driveType,
      zeroToHundredKmh: zeroToHundred,
      zeroToHundredSec: zeroToHundred,
      topSpeedKmh: topSpeedVal,
      curbWeightKg: weightVal,
      weightKg: weightVal,
      trunkCapacityLiters: trunkVal,
      luggageCapacityL: trunkVal,
      fuelTankCapacityLiters: fuelTankVal,
      cityFuelL100km: cityFuelVal,
      highwayFuelL100km: highwayFuelVal,
      combinedFuelL100km: combinedFuelVal,
      electricRangeWltpKm: electricRangeVal,
      batteryCapacityKwh: batteryCapacityVal,
      timingSystem: engineTaxonomy.timingSystem,
    };

    const resolvedFuelType = variant.fuelType === 'PETROL' ? 'Benzin' : variant.fuelType === 'DIESEL' ? 'Dizel' : variant.fuelType === 'HYBRID' ? 'Hibrit' : variant.fuelType === 'ELECTRIC' ? 'Elektrik' : variant.fuelType === 'LPG' ? 'LPG & Benzin' : 'Benzin';

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
        engineFamily: engineTaxonomy.engineFamily,
        engineType: specsJson.engineType || (isElectricVariant ? 'Elektrik Motoru' : isDieselVariant ? 'Turbo Dizel' : (variant.engine?.hasTurbo === false || /mpi|vtec|atmosferik|n\/a|puretech 82|1\.4 fire|1\.0 sce|1\.2 dualjet/i.test(`${variant.engine?.code || ''} ${variant.engine?.description || ''} ${variant.model?.name || ''}`) ? 'Atmosferik Benzinli' : 'Turbo Benzinli')),
        fuelType: resolvedFuelType,
        isElectric: isElectricVariant,
        isHybrid: isHybridVariant,
        powertrainType: isElectricVariant ? 'BEV' : isHybridVariant ? 'HEV' : (isDieselVariant ? 'ICE_DIESEL' : 'ICE_PETROL'),
        timingSystem: engineTaxonomy.timingSystem,
        timingSystemTr: engineTaxonomy.timingSystemTr,
        timingDescriptionTr: engineTaxonomy.timingDescriptionTr,
        electricRangeWltpKm: electricRangeVal,
        batteryCapacityKwh: batteryCapacityVal,
        transmissionName: transTaxonomy.transmissionTypeAndSpeeds || (isElectricVariant ? 'Tek Oranlı Redüktör' : (transName || 'Otomatik')),
        transmissionFamily: transTaxonomy.transmissionFamily,
        clutchType: transTaxonomy.clutchType,
        clutchTypeTr: transTaxonomy.clutchTypeTr,
        transmissionSpeeds: transTaxonomy.transmissionSpeeds,
        transmissionCode: transTaxonomy.transmissionCode || (isElectricVariant ? 'SINGLE_SPEED_DIRECT' : (variant.transmission?.type || 'AUTOMATIC')),
        transmissionMaintenanceTr: transTaxonomy.maintenanceDescriptionTr,
        selected8Filters: {
          brand: variant.brand?.name || 'Belirtilmemiş',
          model: variant.model?.name || 'Belirtilmemiş',
          year: variant.year,
          bodyType: variant.bodyType || 'Sedan',
          engine: variant.engine?.code || variant.engine?.description || 'Orijinal Motor',
          fuelType: resolvedFuelType,
          transmission: transTaxonomy.transmissionTypeAndSpeeds || transName || 'Otomatik',
          clutchType: transTaxonomy.clutchType,
          trim: variant.trim?.name || 'Standart Donanım',
        },
        drivetrain: driveType,
        trimName: variant.trim?.name || 'Standart Donanım',
        marketRegion: variant.marketRegion || 'TR',
        variantMatchConfidence: 'KESİN',
      },
      isElectric: isElectricVariant,
      isHybrid: isHybridVariant,
      powertrainType: isElectricVariant ? 'BEV' : isHybridVariant ? 'HEV' : (isDieselVariant ? 'ICE_DIESEL' : 'ICE_PETROL'),
      performanceSpecs: performanceData,
      verifiedDatabaseVehicleReport: {
        summary: reportCache?.summary || null,
        riskScore: reportCache?.riskScore ?? null,
        buyabilityScore: reportCache?.buyabilityScore ?? null,
        knownDatabaseProblems: variant.problems
          .filter((p) => !isUserNeglectOrRoutineMaintenance(p.title, p.description))
          .map((p) => {
            const rawType = String((p as any).problemType || '').toUpperCase();
            const pStatus = String((p as any).status || '').toUpperCase();
            const pTitleRaw = p.title || 'Mekanik Gözlem';

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

            let pTitle = pTitleRaw;
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

  /**
   * Researches official manufacturer physical catalog specifications (0-100, top speed, luggage, curb weight, EV range)
   * using OpenAI gpt-4o-mini with Gemini fallback, and caches the result directly to TechnicalSpec in DB.
   */
  private async researchPhysicalSpecsViaAi(variant: any, powerHp?: number | null): Promise<Record<string, any> | null> {
    const brandName = variant.brand?.name || '';
    const modelName = variant.model?.name || '';
    const generationName = variant.generation?.name || '';
    const bodyType = variant.generation?.bodyType || variant.bodyType || '';
    const engineCode = variant.engine?.code || '';
    const fuelType = variant.fuelType || variant.engine?.fuelType || '';
    const transmissionName = variant.transmission?.name || '';
    const trimName = variant.trim?.name || '';
    const year = variant.year;
    const isElectric = fuelType === 'ELECTRIC' || variant.engine?.isElectric || (fuelType || '').toUpperCase() === 'ELECTRIC';

    const userPrompt = `Aşağıdaki araç kombinasyonunun üretici resmi katalog teknik verilerini (fiziksel performans, ağırlık ve boyut) JSON formatında döndür.
Araç: ${year} ${brandName} ${modelName} (${generationName} - ${bodyType})
Motor: ${engineCode} (${fuelType})${powerHp ? ` - Güç: ${powerHp} HP` : ''}
Şanzıman: ${transmissionName}
Paket: ${trimName}

İstenen JSON formatı:
{
  "topSpeed": number (Maksimum hız km/s cinsinden tam sayı, örn: 200),
  "acceleration0to100": number (0-100 hızlanma saniye cinsinden, örn: 3.9 veya 8.5),
  "luggageCapacity": number (Bagaj hacmi litre cinsinden tam sayı, örn: 540 veya 480),
  "weight": number (Boş ağırlık kg cinsinden tam sayı, örn: 2200 veya 1450),
  "averageFuelConsumption": number (Ortalama yakıt tüketimi lt/100km, elektrikli ise null),
  "electricRangeWltpKm": number (Elektrikli ise üretici resmi WLTP karma menzili km cinsinden tam sayı örn: 521, içten yanmalı ise null),
  "batteryCapacityKwh": number (Elektrikli ise kullanılabilir batarya kapasitesi kWh cinsinden örn: 82.5, içten yanmalı ise null),
  "transmissionTypeAndSpeeds": string (Üretici resmi şanzıman ticari adı ve vites sayısı, örn: "6 İleri Tiptronic", "7 İleri S-Tronic", "8 İleri Steptronic", "5 İleri Manuel"),
  "transmissionSpeeds": number (İleri vites kademe sayısı tam sayı, örn: 5, 6, 7, 8),
  "transmissionCode": string (Üretici şanzıman kodu, örn: "Aisin 09G / TF-60SN", "DQ200", "ZF 8HP50", "DQ250"),
  "clutchType": string ("TORK_KONVERTORLU" | "KURU_CIFT_KAVRAMA" | "ISLAK_CIFT_KAVRAMA" | "CVT" | "MANUEL" | "ELEKTRIKLI_TEK_ORANLI" | "ROBOTIZE_TEK_KAVRAMA")
}

Önemli:
- Yalnızca bu JSON formatını döndür, markdown veya ek metin ekleme.
- Verilen spesifik model yılı, kasa tipi ve motora ait gerçek üretici fabrika katalog verilerini doldur.
- Şanzıman verilerini belirtilen spesifik model yılı (${year}) ve motor için resmi üretici fabrika verisinden doldur (Örn: 2005 Audi A3 1.6 için 6 ileri Tiptronic tork konvertörlü Aisin 09G; kuru çift kavrama DQ200 2008 öncesinde bulunmaz; Audi modellerinde DSG yerine Tiptronic veya S-Tronic adlandırması kullanılır).`;

    // 1. Try OpenAI gpt-4o-mini
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (openAiApiKey) {
      try {
        const openai = new OpenAI({ apiKey: openAiApiKey });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are an official automotive manufacturer catalog database. Return accurate technical specifications in strict JSON.',
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        });

        const rawContent = completion.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawContent);
        if (
          typeof parsed.topSpeed === 'number' ||
          typeof parsed.acceleration0to100 === 'number' ||
          typeof parsed.luggageCapacity === 'number' ||
          typeof parsed.weight === 'number'
        ) {
          this.logger.log(`[PHYSICAL SPECS AI] Successfully extracted catalog specs via OpenAI for ${brandName} ${modelName} ${year}`);
          return parsed;
        }
      } catch (err: any) {
        this.logger.warn(`[PHYSICAL SPECS AI] OpenAI catalog extraction failed: ${err?.message}`);
      }
    }

    // 2. Fallback to Gemini
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-lite-latest'];
      for (const mName of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${geminiApiKey}`;
          const response = await global.fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userPrompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          });
          if (!response.ok) continue;
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanText);
          if (
            typeof parsed.topSpeed === 'number' ||
            typeof parsed.acceleration0to100 === 'number' ||
            typeof parsed.luggageCapacity === 'number' ||
            typeof parsed.weight === 'number'
          ) {
            this.logger.log(`[PHYSICAL SPECS AI] Successfully extracted catalog specs via Gemini for ${brandName} ${modelName} ${year}`);
            return parsed;
          }
        } catch {
          // continue
        }
      }
    }

    return null;
  }
}

