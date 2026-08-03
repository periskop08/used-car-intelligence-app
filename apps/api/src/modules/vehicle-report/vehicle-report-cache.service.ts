import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleReportMode } from '@prisma/client';

@Injectable()
export class VehicleReportCacheService {
  constructor(private prisma: PrismaService) {}

  async getCachedReport(
    userId: string,
    mode: VehicleReportMode,
    contextHash: string,
    reportVersion: string = 'v1.0',
    variantId?: string,
    listingId?: string,
  ) {
    if (mode === 'LISTING_REPORT' && listingId) {
      return this.prisma.generatedVehicleReport.findFirst({
        where: {
          mode: 'LISTING_REPORT',
          listingId,
          status: { in: ['COMPLETED', 'SAFE_FALLBACK'] },
        },
        orderBy: { completedAt: 'desc' },
      });
    }

    if (variantId) {
      return this.prisma.generatedVehicleReport.findFirst({
        where: {
          mode: 'VEHICLE_REPORT',
          variantId,
          status: { in: ['COMPLETED', 'SAFE_FALLBACK'] },
        },
        orderBy: { completedAt: 'desc' },
      });
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
