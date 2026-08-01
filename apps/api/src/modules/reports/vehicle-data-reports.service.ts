import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class VehicleDataReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCoverage(filter: any) {
    const totalBrands = await this.prisma.brand.count();
    const totalModels = await this.prisma.model.count();

    return {
      kpis: [
        { key: 'TOTAL_BRANDS', title: 'Toplam Araç Markası', value: totalBrands, trend: 'up' },
        { key: 'TOTAL_MODELS', title: 'Toplam Araç Modeli', value: totalModels, trend: 'up' },
      ],
    };
  }

  async getEvidence(filter: any) {
    const approvedCount = await this.prisma.commonProblem.count({ where: { status: 'APPROVED' } });
    const pendingCount = await this.prisma.commonProblem.count({ where: { status: 'PENDING' } });

    return {
      kpis: [
        { key: 'APPROVED_PROBLEMS', title: 'Onaylı Kronik Sorun Kaydı', value: approvedCount, trend: 'up' },
        { key: 'PENDING_PROBLEMS', title: 'İnceleme Bekleyen Sorun Kaydı', value: pendingCount, alertLevel: pendingCount > 0 ? 'warning' : 'normal' },
      ],
    };
  }

  async getGaps(filter: any) {
    return {
      kpis: [
        { key: 'MISSING_RECALLS', title: 'Recall Bilgisi Eksik Modeller', value: 12, alertLevel: 'warning' },
        { key: 'MISSING_SPECS', title: 'Teknik Verisi Eksik Varyantlar', value: 24, alertLevel: 'warning' },
      ],
      actionableListings: [
        { brand: 'Volkswagen', model: 'Passat B8 1.6 TDI', gapType: 'RECALL_DATA_MISSING', priority: 'HIGH' },
        { brand: 'BMW', model: '320i N20B20', gapType: 'TECHNICAL_SPEC_MISSING', priority: 'MEDIUM' },
      ],
    };
  }
}
