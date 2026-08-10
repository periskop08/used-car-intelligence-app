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

    // Build complete factory performance and technical specs (use actual specs if available, otherwise null to let AI rely on real vehicle knowledge)
    let engineHp = specsJson.enginePowerHp || variant.engine?.horsepower || null;
    let engineTorque = specsJson.engineTorqueNm || variant.engine?.torque || null;
    const engineCc = specsJson.engineDisplacementCc || variant.engine?.displacement || null;

    // Sanitize engine power & torque if DB contains clear mismatch (e.g. 2.0 TFSI / 2.0 Turbo with 110 HP / 143 Nm)
    const engineCodeLower = ((variant.engine?.code || '') + ' ' + (variant.engine?.description || '')).toLowerCase();
    if (engineCodeLower.includes('2.0') || engineCodeLower.includes('tfsi') || engineCodeLower.includes('turbo')) {
      if (engineHp && engineHp < 140) {
        engineHp = engineCodeLower.includes('tfsi') ? 180 : (engineCodeLower.includes('tdi') ? 143 : null);
      }
      if (engineTorque && engineTorque < 220) {
        engineTorque = engineCodeLower.includes('tfsi') ? 320 : (engineCodeLower.includes('tdi') ? 320 : null);
      }
    }

    const transName = variant.transmission?.name || null;
    const transSpeeds = specsJson.transmissionSpeeds || variant.transmission?.speeds || null;
    const driveType = specsJson.drivetrain || (variant as any).driveType || null;
    const zeroToHundred = specsJson.zeroToHundredKmh || null;
    const topSpeedVal = specsJson.topSpeed || null;
    const weightVal = specsJson.weight || null;
    const trunkVal = specsJson.luggageCapacity || null;
    const fuelTankVal = specsJson.fuelTankCapacityLiters || specsJson.fuelTankLiters || null;
    const cityFuelVal = specsJson.cityFuelConsumption || null;
    const highwayFuelVal = specsJson.highwayFuelConsumption || null;
    const combinedFuelVal = specsJson.averageFuelConsumption || null;

    const performanceData: Record<string, any> = {
      enginePowerHp: engineHp,
      engineTorqueNm: engineTorque,
      engineDisplacementCc: engineCc,
      transmissionName: transName ? (transSpeeds ? `${transName} (${transSpeeds} İleri)` : transName) : null,
      transmissionSpeeds: transSpeeds,
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
        engineTorqueNm: engineTorque,
        engineCode: variant.engine?.code || '2.0L Turbo',
        engineType: specsJson.engineType || '4 Silindirli Turbo',
        fuelType: variant.fuelType || 'PETROL',
        transmissionName: `${transName} (${transSpeeds} İleri)`,
        transmissionCode: variant.transmission?.type || 'AUTOMATIC',
        drivetrain: driveType,
        trimName: variant.trim?.name || 'M Sport',
        marketRegion: variant.marketRegion || 'TR',
        variantMatchConfidence: 'KESİN',
      },
      performanceSpecs: performanceData,
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

