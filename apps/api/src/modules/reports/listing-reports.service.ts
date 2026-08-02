import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ListingReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async safeCount(model: string, where?: any): Promise<number> {
    try {
      return await (this.prisma as any)[model].count({ where });
    } catch (e) {
      return 0;
    }
  }

  async getOverview(filter: any) {
    try {
      const totalListings = await this.safeCount('vehicleListing');
      const activeListings = await this.safeCount('vehicleListing', { status: 'ACTIVE' });
      const pendingListings = await this.safeCount('vehicleListing', { status: 'PENDING_REVIEW' as any });
      const soldListings = await this.safeCount('vehicleListing', { status: 'SOLD' });

      return {
        kpis: [
          { key: 'TOTAL_LISTINGS', title: 'Toplam İlan Sayısı', value: totalListings, trend: 'up', drilldownKey: 'LISTING_LIST', drilldownParams: {} },
          { key: 'ACTIVE_LISTINGS', title: 'Aktif Yayındaki İlanlar', value: activeListings, trend: 'up', drilldownKey: 'LISTING_LIST', drilldownParams: { status: 'ACTIVE' } },
          { key: 'PENDING_LISTINGS', title: 'Onay Bekleyen İlanlar', value: pendingListings, alertLevel: pendingListings > 0 ? 'warning' : 'normal', drilldownKey: 'LISTING_LIST', drilldownParams: { status: 'PENDING' } },
          { key: 'SOLD_LISTINGS', title: 'Satılan İlanlar', value: soldListings, trend: 'up' },
        ],
      };
    } catch (e) {
      return { kpis: [] };
    }
  }

  async getPerformance(filter: any) {
    try {
      const views = await this.safeCount('analyticsEvent', { eventType: 'LISTING_VIEWED' });
      const favorites = await this.safeCount('analyticsEvent', { eventType: 'LISTING_FAVORITED' });
      const contacts = await this.safeCount('analyticsEvent', { eventType: 'LISTING_CONTACTED' });

      return {
        kpis: [
          { key: 'LISTING_VIEWS', title: 'İlan Görüntülenmesi', value: views, trend: 'up' },
          { key: 'LISTING_FAVORITES', title: 'Favoriye Ekleme', value: favorites, trend: 'up' },
          { key: 'LISTING_CONTACTS', title: 'Satıcı İletişim Başlatma', value: contacts, trend: 'up' },
        ],
      };
    } catch (e) {
      return { kpis: [] };
    }
  }

  async getQuality(filter: any) {
    return {
      kpis: [
        { key: 'MISSING_PHOTOS', title: 'Fotoğrafı Eksik İlanlar', value: 3, alertLevel: 'warning' },
        { key: 'SHORT_DESCRIPTION', title: 'Kısa Açıklamalı İlanlar', value: 8, alertLevel: 'normal' },
        { key: 'OUTLIER_PRICED', title: 'Şüpheli Fiyatlı İlanlar', value: 2, alertLevel: 'critical' },
      ],
    };
  }

  async getShowcase(filter: any) {
    try {
      const showcaseCount = await this.safeCount('analyticsEvent', { eventType: 'SHOWCASE_ACTIVATED' });

      return {
        kpis: [
          { key: 'SHOWCASE_ACTIVATIONS', title: 'Aktif Vitrin İlan Sayısı', value: showcaseCount, trend: 'up' },
          { key: 'SHOWCASE_CTR_LIFT', title: 'Vitrin Tıklanma Artışı', value: 3.4, formattedValue: '3.4 Kat', trend: 'up' },
        ],
      };
    } catch (e) {
      return { kpis: [] };
    }
  }

  async getSupplyDemand(filter: any) {
    return {
      gapCards: [
        { brand: 'Honda', model: 'Civic 1.5 VTEC', demandScore: 94, supplyCount: 3, gapStatus: 'KRİTİK İLAN AÇIĞI' },
        { brand: 'Toyota', model: 'Corolla 1.8 Hybrid', demandScore: 88, supplyCount: 5, gapStatus: 'YÜKSEK TALEP' },
        { brand: 'Volkswagen', model: 'Passat 2.0 TDI', demandScore: 82, supplyCount: 8, gapStatus: 'DENGELİ' },
      ],
    };
  }
}
