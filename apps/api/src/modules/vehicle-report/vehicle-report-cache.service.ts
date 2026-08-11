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
    if (!userId || !variantId) return null;

    return this.prisma.generatedVehicleReport.findFirst({
      where: {
        userId,
        variantId,
        vehicleContextHash: contextHash,
        reportVersion,
        mode: { in: ['TORQUE_SCOUT_VEHICLE_REPORT', 'VEHICLE_REPORT'] },
        status: 'COMPLETED',
        provider: { not: 'DETERMINISTIC_FALLBACK' },
      },
      orderBy: { completedAt: 'desc' },
    });
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
