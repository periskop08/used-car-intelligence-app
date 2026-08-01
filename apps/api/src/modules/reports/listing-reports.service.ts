import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ListingReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(filter: any) {
    const totalListings = await this.prisma.vehicleListing.count();
    const activeListings = await this.prisma.vehicleListing.count({ where: { status: 'ACTIVE' } });
    const pendingListings = await this.prisma.vehicleListing.count({ where: { status: 'PENDING_REVIEW' as any } });
    const soldListings = await this.prisma.vehicleListing.count({ where: { status: 'SOLD' } });

    return {
      kpis: [
        { key: 'TOTAL_LISTINGS', title: 'Toplam İlan Sayısı', value: totalListings, trend: 'up', drilldownKey: 'LISTING_LIST', drilldownParams: {} },
        { key: 'ACTIVE_LISTINGS', title: 'Aktif Yayındaki İlanlar', value: activeListings, trend: 'up', drilldownKey: 'LISTING_LIST', drilldownParams: { status: 'ACTIVE' } },
        { key: 'PENDING_LISTINGS', title: 'Onay Bekleyen İlanlar', value: pendingListings, alertLevel: pendingListings > 0 ? 'warning' : 'normal', drilldownKey: 'LISTING_LIST', drilldownParams: { status: 'PENDING' } },
        { key: 'SOLD_LISTINGS', title: 'Satılan İlanlar', value: soldListings, trend: 'up' },
      ],
    };
  }

  async getPerformance(filter: any) {
    const views = await this.prisma.analyticsEvent.count({ where: { eventType: 'LISTING_VIEWED' } });
    const favorites = await this.prisma.analyticsEvent.count({ where: { eventType: 'LISTING_FAVORITED' } });
    const contacts = await this.prisma.analyticsEvent.count({ where: { eventType: 'LISTING_CONTACTED' } });

    return {
      kpis: [
        { key: 'LISTING_VIEWS', title: 'İlan Görüntülenmesi', value: views, trend: 'up' },
        { key: 'LISTING_FAVORITES', title: 'Favoriye Ekleme', value: favorites, trend: 'up' },
        { key: 'LISTING_CONTACTS', title: 'Satıcı İletişim Başlatma', value: contacts, trend: 'up' },
      ],
    };
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
    const showcaseCount = await this.prisma.analyticsEvent.count({ where: { eventType: 'SHOWCASE_ACTIVATED' } });

    return {
      kpis: [
        { key: 'SHOWCASE_ACTIVATIONS', title: 'Vitrin Öne Çıkarma Aktivasyonu', value: showcaseCount, trend: 'up' },
      ],
    };
  }

  async getSupplyDemand(filter: any) {
    return {
      gapCards: [
        { brand: 'Toyota', model: 'Corolla 1.8 Hybrid', demandScore: 92, supplyCount: 14, gapStatus: 'YÜKSEK TALEP / AZ İLAN' },
        { brand: 'Honda', model: 'Civic 1.5 VTEC', demandScore: 88, supplyCount: 18, gapStatus: 'YÜKSEK TALEP / AZ İLAN' },
      ],
    };
  }
}
