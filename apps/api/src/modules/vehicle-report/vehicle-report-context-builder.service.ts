import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class VehicleReportContextBuilderService {
  constructor(private prisma: PrismaService) {}

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
        inspectionChecklist: variant.checklists.map((c) => ({
          id: c.id,
          category: c.category,
          title: c.title,
          description: c.description,
          priority: c.priority,
        })),
      },
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
