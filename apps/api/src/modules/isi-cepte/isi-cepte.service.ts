import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IsiCepteProvider } from './isi-cepte-domain.contract';

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

  async getProviders(params: {
    page?: number;
    limit?: number;
    search?: string;
    membershipStatus?: string;
    optIn?: string;
    showcaseFilter?: string;
    nationalFilter?: string;
  }) {
    // Currently no real synchronization connected. Returns truthful 0 items dataset.
    return {
      items: [] as IsiCepteProvider[],
      total: 0,
      page: Math.max(1, params.page || 1),
      limit: Math.min(100, Math.max(1, params.limit || 20)),
      totalPages: 1,
      message: 'Henüz TorqueScout\'a aktarılmış İşi Cepte işletmesi bulunmuyor.',
    };
  }

  async getProviderById(id: string): Promise<IsiCepteProvider> {
    // Truthfully throws 404 since no real synced provider exists yet in persistence
    throw new NotFoundException(`Provider '${id}' bulunamadı veya henüz senkronize edilmedi.`);
  }

  async getRegionalVisibility(params: {
    page?: number;
    limit?: number;
    search?: string;
    country?: string;
    region?: string;
    district?: string;
    eligibility?: string;
    brand?: string;
    category?: string;
  }) {
    // Currently no real synchronization connected. Returns truthful 0 items dataset.
    return {
      items: [] as IsiCepteProvider[],
      total: 0,
      page: Math.max(1, params.page || 1),
      limit: Math.min(100, Math.max(1, params.limit || 20)),
      totalPages: 1,
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
