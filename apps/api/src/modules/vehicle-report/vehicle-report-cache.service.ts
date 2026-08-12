import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleReportMode } from '@prisma/client';

export const CURRENT_REPORT_VERSION = 'v4.4_KM_BREAKDOWN_TIMELINE';

@Injectable()
export class VehicleReportCacheService {
  constructor(private prisma: PrismaService) {}

  async getCachedReport(
    userId: string,
    mode: VehicleReportMode,
    contextHash: string,
    reportVersion: string = CURRENT_REPORT_VERSION,
    variantId?: string,
    listingId?: string,
  ) {
    if (!variantId) return null;

    // 1. Direct variantId lookup
    let cached = await this.prisma.generatedVehicleReport.findFirst({
      where: {
        variantId,
        reportVersion,
        mode: { in: ['TORQUE_SCOUT_VEHICLE_REPORT', 'VEHICLE_REPORT', 'LISTING_REPORT'] },
        status: 'COMPLETED',
        provider: { not: 'DETERMINISTIC_FALLBACK' },
      },
      orderBy: { completedAt: 'desc' },
    });

    if (cached) return cached;

    // 2. Fallback: Normalized Vehicle Identity match (handles duplicate variant records with whitespace differences in DB)
    try {
      const currentVariant = await this.prisma.vehicleVariant.findUnique({
        where: { id: variantId },
        include: { brand: true, model: true, trim: true, engine: true, transmission: true },
      });

      if (currentVariant) {
        const normBrand = (currentVariant.brand?.name || '').trim().toLowerCase();
        const normModel = (currentVariant.model?.name || '').trim().toLowerCase();
        const normYear = currentVariant.year;
        const normTrim = (currentVariant.trim?.name || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const normEngine = (currentVariant.engine?.code || '').replace(/\s+/g, ' ').trim().toLowerCase();

        const siblingVariants = await this.prisma.vehicleVariant.findMany({
          where: {
            year: normYear,
            brand: { name: { equals: currentVariant.brand?.name, mode: 'insensitive' } },
            model: { name: { equals: currentVariant.model?.name, mode: 'insensitive' } },
          },
          include: { trim: true, engine: true },
        });

        const matchingVariantIds = siblingVariants
          .filter((v) => {
            const vTrim = (v.trim?.name || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const vEng = (v.engine?.code || '').replace(/\s+/g, ' ').trim().toLowerCase();
            return vTrim === normTrim && vEng === normEngine;
          })
          .map((v) => v.id);

        if (matchingVariantIds.length > 0) {
          cached = await this.prisma.generatedVehicleReport.findFirst({
            where: {
              variantId: { in: matchingVariantIds },
              reportVersion,
              mode: { in: ['TORQUE_SCOUT_VEHICLE_REPORT', 'VEHICLE_REPORT', 'LISTING_REPORT'] },
              status: 'COMPLETED',
              provider: { not: 'DETERMINISTIC_FALLBACK' },
            },
            orderBy: { completedAt: 'desc' },
          });

          if (cached) return cached;
        }
      }
    } catch (err) {
      // Ignore fallback lookup error
    }

    return null;
  }

  async checkStaleStatus(
    existingReport: any,
    currentContextHash: string,
    currentListingContextHash?: string,
  ) {
    if (!existingReport) return { isStale: false, staleReasons: [] };

    const staleReasons: string[] = [];

    if (existingReport.contextHash !== currentContextHash) {
      staleReasons.push('VEHICLE_DATA_UPDATED');
    }
    if (currentListingContextHash && existingReport.listingContextHash !== currentListingContextHash) {
      staleReasons.push('LISTING_UPDATED');
    }

    return {
      isStale: staleReasons.length > 0,
      staleReasons,
    };
  }
}
