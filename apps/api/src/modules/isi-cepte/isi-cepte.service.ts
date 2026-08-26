import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class IsiCepteService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    return {
      connected: false,
      message: 'İşi Cepte entegrasyonu henüz bağlı değil.',
      totalProviders: 0,
      activeLocalVisibility: 0,
      activeShowcase: 0,
      activeNationalVisibility: 0,
    };
  }

  async getProviders() {
    return {
      items: [],
      total: 0,
      message: 'Henüz TorqueScout\'a aktarılmış İşi Cepte işletmesi bulunmuyor.',
    };
  }

  async getRegionalVisibility() {
    return {
      items: [],
      total: 0,
      message: 'Henüz bölgesel görünürlük kaydı bulunmuyor.',
    };
  }

  async getShowcase() {
    return {
      items: [],
      total: 0,
      message: 'Henüz aktif veya geçmiş Vitrin kaydı bulunmuyor.',
    };
  }

  async getNationalVisibility() {
    return {
      items: [],
      total: 0,
      message: 'Henüz ülke geneli görünürlük kaydı bulunmuyor.',
    };
  }

  async getPurchases() {
    return {
      items: [],
      total: 0,
      message: 'Henüz satın alma kaydı bulunmuyor.',
    };
  }
}
