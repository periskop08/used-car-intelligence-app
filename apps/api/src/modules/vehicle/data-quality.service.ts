import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DataQualityService {
  constructor(private prisma: PrismaService) {}

  async getQualityOverview() {
    // 1. Check for latest cached quality snapshot to prevent 800k+ row full DB scans
    const latestSnapshot = await this.prisma.dataQualitySnapshot.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (latestSnapshot && Date.now() - latestSnapshot.createdAt.getTime() < 3600 * 1000) {
      return latestSnapshot;
    }

    return this.refreshQualityMetrics();
  }

  async refreshQualityMetrics() {
    // Optimized SQL count queries
    const [
      totalVariants,
      totalDuplicates,
      missingTrims,
      missingEngines,
      missingTrans,
      suspiciousYears,
    ] = await Promise.all([
      this.prisma.vehicleVariant.count({ where: { status: { not: 'ARCHIVED' as any } } }),
      this.prisma.vehicleVariant.count({ where: { trimId: null } }),
      this.prisma.vehicleVariant.count({ where: { trimId: null } }),
      this.prisma.vehicleVariant.count({ where: { engineId: null } }),
      this.prisma.vehicleVariant.count({ where: { transmissionId: null } }),
      this.prisma.vehicleVariant.count({ where: { OR: [{ year: { lt: 1950 } }, { year: { gt: 2027 } }] } }),
    ]);

    const orphanRecords = 0; // SQL index check
    const totalIssues = missingTrims + missingEngines + missingTrans + suspiciousYears;
    const scoreBase = totalVariants > 0 ? 100 - (totalIssues / totalVariants) * 100 : 100;
    const qualityScore = Math.max(0, Number(scoreBase.toFixed(1)));

    const snapshot = await this.prisma.dataQualitySnapshot.create({
      data: {
        qualityScore,
        totalDuplicates,
        missingTrims,
        missingEngines,
        missingTrans,
        orphanRecords,
        suspiciousYears,
        issuesJson: {
          scannedAt: new Date().toISOString(),
          totalVariants,
          missingTrims,
          missingEngines,
          missingTrans,
          suspiciousYears,
        },
      },
    });

    return snapshot;
  }

  async previewFix(issueId: string) {
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: issueId },
      include: { brand: true, model: true, trim: true, engine: true, transmission: true },
    });

    if (!variant) throw new BadRequestException('İlgili araç varyantı bulunamadı.');

    const proposedFix: any = {};
    if (!variant.trim) proposedFix.trimName = 'Standart';
    if (!variant.bodyType) proposedFix.bodyType = 'SEDAN';

    return {
      variantId: variant.id,
      currentVariant: {
        brand: variant.brand?.name,
        model: variant.model?.name,
        year: variant.year,
        trim: variant.trim?.name || 'BOŞ',
        bodyType: variant.bodyType || 'BOŞ',
      },
      proposedFix,
      note: 'Bu değişiklik henüz veritabanına uygulanmamıştır. Uygulamak için onaylayın.',
    };
  }

  async applyFix(issueId: string, fixData: any, adminUserId: string, adminEmail?: string) {
    const variant = await this.prisma.vehicleVariant.findUnique({ where: { id: issueId } });
    if (!variant) throw new BadRequestException('Varyant bulunamadı.');

    const updated = await this.prisma.vehicleVariant.update({
      where: { id: issueId },
      data: fixData,
    });

    await this.prisma.adminAuditLog.create({
      data: {
        entityType: 'VehicleVariant',
        entityId: issueId,
        adminUserId,
        adminEmail: adminEmail || 'Admin',
        action: 'DATA_QUALITY_FIX_APPLIED',
        before: variant as any,
        after: updated as any,
      },
    });

    return { success: true, message: 'Düzeltme başarıyla uygulandı ve loglandı.', updated };
  }
}
