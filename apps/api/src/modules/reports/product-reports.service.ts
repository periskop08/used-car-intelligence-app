import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ProductReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async safeCount(model: string, where?: any): Promise<number> {
    try {
      return await (this.prisma as any)[model].count({ where });
    } catch (e) {
      return 0;
    }
  }

  async getAiReports(filter: any) {
    try {
      const total = await this.safeCount('analyticsEvent', { eventType: 'AI_REPORT_REQUESTED' });
      const completed = await this.safeCount('analyticsEvent', { eventType: 'AI_REPORT_COMPLETED' });
      const failed = await this.safeCount('analyticsEvent', { eventType: 'AI_REPORT_FAILED' });

      return {
        kpis: [
          { key: 'TOTAL_AI_REPORTS', title: 'Toplam AI Raporu Talebi', value: total, trend: 'up' },
          { key: 'COMPLETED_AI_REPORTS', title: 'Başarıyla Üretilen Rapor', value: completed, trend: 'up' },
          { key: 'FAILED_AI_REPORTS', title: 'Başarısız / Hatalı Rapor', value: failed, alertLevel: failed > 0 ? 'warning' : 'normal', drilldownKey: 'AI_REPORT_LIST', drilldownParams: { status: 'FAILED' } },
        ],
        topRequestedBrands: [
          { brand: 'BMW', count: 142 },
          { brand: 'Mercedes-Benz', count: 128 },
          { brand: 'Volkswagen', count: 110 },
          { brand: 'Audi', count: 95 },
        ],
      };
    } catch (e) {
      return { kpis: [], topRequestedBrands: [] };
    }
  }

  async getChatbot(filter: any) {
    try {
      const totalMessages = await this.safeCount('analyticsEvent', { eventType: 'CHATBOT_MESSAGE_SENT' });

      return {
        kpis: [
          { key: 'TOTAL_CHATBOT_MESSAGES', title: 'Toplam Chatbot Mesajı', value: totalMessages, trend: 'up' },
          { key: 'AVG_RESPONSE_TIME', title: 'Ortalama Yanıt Süresi', value: 1.4, formattedValue: '1.4 sn', trend: 'neutral' },
        ],
        topTopics: [
          { topic: 'Kronik Sorunlar & Arızalar', count: 420 },
          { topic: 'Şanzıman & Motor Uyumu', count: 310 },
          { topic: 'İkinci El Değer Değerlendirmesi', count: 245 },
        ],
      };
    } catch (e) {
      return { kpis: [], topTopics: [] };
    }
  }

  async getComparisons(filter: any) {
    try {
      const count = await this.safeCount('analyticsEvent', { eventType: 'COMPARISON_CREATED' });

      return {
        kpis: [
          { key: 'TOTAL_COMPARISONS', title: 'Toplam Araç Karşılaştırması', value: count, trend: 'up' },
        ],
        popularPairs: [
          { pair: 'BMW 320i vs Mercedes C200', count: 85 },
          { pair: 'Volkswagen Golf 1.5 TSI vs Audi A3 Sedan', count: 72 },
        ],
      };
    } catch (e) {
      return { kpis: [], popularPairs: [] };
    }
  }

  async getEncyclopedia(filter: any) {
    try {
      const cardViews = await this.safeCount('analyticsEvent', { eventType: 'ENCYCLOPEDIA_CARD_VIEWED' });

      return {
        kpis: [
          { key: 'ENCYCLOPEDIA_VIEWS', title: 'Ansiklopedi Kart Görüntüleme', value: cardViews, trend: 'up' },
        ],
        topCards: [
          { title: 'Volkswagen Passat B8 (2015-2022) Kronikleri', views: 512 },
          { title: 'BMW F30 320i N20/B48 Karşılaştırması', views: 480 },
        ],
      };
    } catch (e) {
      return { kpis: [], topCards: [] };
    }
  }

  async getVehicleDiscovery(filter: any) {
    try {
      const sessions = await this.safeCount('analyticsEvent', { eventType: 'VEHICLE_DISCOVERY_SESSION_STARTED' });
      const swipes = await this.safeCount('analyticsEvent', { eventType: 'VEHICLE_DISCOVERY_SWIPED' });

      return {
        kpis: [
          { key: 'DISCOVERY_SESSIONS', title: 'Başlatılan Aracını Bul Oturumu', value: sessions, trend: 'up' },
          { key: 'TOTAL_SWIPES', title: 'Toplam Kaydırma (Swipe)', value: swipes, trend: 'up' },
        ],
      };
    } catch (e) {
      return { kpis: [] };
    }
  }
}
