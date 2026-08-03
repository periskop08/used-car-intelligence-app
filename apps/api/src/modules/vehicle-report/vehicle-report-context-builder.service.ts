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
        },
        recalls: {
          where: { status: 'APPROVED' },
        },
        checklists: {
          where: { status: 'APPROVED' },
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
        engineCode: variant.engine?.code || undefined,
        fuelType: variant.fuelType || 'Belirtilmemiş',
        transmissionName: variant.transmission?.name || 'Belirtilmemiş',
        transmissionCode: variant.transmission?.type || undefined,
        drivetrain: specsJson.drivetrain || 'Belirtilmemiş',
        trimName: variant.trim?.name || undefined,
        marketRegion: variant.marketRegion || 'TR',
        variantMatchConfidence: variant.engine?.code && variant.transmission?.name ? 'KESİN' : 'YÜKSEK',
      },
      verifiedDatabaseVehicleReport: {
        summary: reportCache?.summary || null,
        riskScore: reportCache?.riskScore ?? null,
        buyabilityScore: reportCache?.buyabilityScore ?? null,
        knownDatabaseProblems: variant.problems.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          riskLevel: p.riskLevel,
          category: p.affectedEngine || p.affectedTransmission || 'Mekanik',
        })),
        recalls: variant.recalls.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          riskLevel: r.riskLevel,
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
