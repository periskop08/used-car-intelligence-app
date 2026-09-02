import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReportDrilldownService {
  constructor(private readonly prisma: PrismaService) {}

  async getDrilldown(drilldownKey: string, query: any) {
    const limit = query.limit ? parseInt(query.limit, 10) : 25;

    switch (drilldownKey) {
      case 'USER_LIST': {
        const users = await this.prisma.user.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            customerNo: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            role: true,
            subscriptionTier: true,
            createdAt: true,
            isActive: true,
          },
        });

        const rows = users.map((u) => {
          const yearMonth = u.createdAt ? `${new Date(u.createdAt).getFullYear().toString().slice(-2)}${(new Date(u.createdAt).getMonth() + 1).toString().padStart(2, '0')}` : '2607';
          return {
            customerNo: u.customerNo || `TS-${yearMonth}-000001`,
            displayName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Kullanıcı',
            email: u.email,
            role: u.role,
            subscriptionTier: u.subscriptionTier,
            createdAt: u.createdAt,
            isActive: u.isActive ? 'AKTİF' : 'PASİF',
          };
        });

        return {
          drilldownKey,
          total: rows.length,
          columns: [
            { key: 'customerNo', label: 'Müşteri No', type: 'CUSTOMER_REF' },
            { key: 'displayName', label: 'Ad Soyad', type: 'STRING' },
            { key: 'email', label: 'E-posta', type: 'STRING' },
            { key: 'subscriptionTier', label: 'Paket', type: 'BADGE' },
            { key: 'createdAt', label: 'Kayıt Tarihi', type: 'DATE' },
            { key: 'isActive', label: 'Durum', type: 'BADGE' },
          ],
          rows,
          appliedFilters: query,
        };
      }

      case 'AI_REPORT_LIST': {
        const events = await this.prisma.analyticsEvent.findMany({
          where: {
            eventType: query.status === 'FAILED' ? 'AI_REPORT_FAILED' : 'AI_REPORT_COMPLETED',
          },
          take: limit,
          orderBy: { occurredAt: 'desc' },
        });

        const rows = events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          userId: e.userId || 'Anonim',
          occurredAt: e.occurredAt,
          device: e.device || 'Bilinmiyor',
          status: e.eventType === 'AI_REPORT_COMPLETED' ? 'BAŞARILI' : 'HATALI',
        }));

        return {
          drilldownKey,
          total: rows.length,
          columns: [
            { key: 'id', label: 'Rapor / Event ID', type: 'STRING' },
            { key: 'userId', label: 'Kullanıcı ID', type: 'STRING' },
            { key: 'status', label: 'Durum', type: 'BADGE' },
            { key: 'occurredAt', label: 'Tarih', type: 'DATE' },
          ],
          rows,
          appliedFilters: query,
        };
      }

      case 'LISTING_LIST': {
        const listings = await this.prisma.vehicleListing.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            priceAmount: true,
            city: true,
            status: true,
            createdAt: true,
          },
        });

        const rows = listings.map((l) => ({
          id: l.id,
          title: l.title,
          price: `₺${Number(l.priceAmount).toLocaleString('tr-TR')}`,
          city: l.city || 'Belirtilmedi',
          status: l.status,
          createdAt: l.createdAt,
        }));

        return {
          drilldownKey,
          total: rows.length,
          columns: [
            { key: 'title', label: 'İlan Başlığı', type: 'STRING' },
            { key: 'price', label: 'Fiyat', type: 'MONEY' },
            { key: 'city', label: 'Şehir', type: 'STRING' },
            { key: 'status', label: 'Durum', type: 'BADGE' },
            { key: 'createdAt', label: 'Tarih', type: 'DATE' },
          ],
          rows,
          appliedFilters: query,
        };
      }

      default:
        throw new NotFoundException(`Drilldown key '${drilldownKey}' bulunamadı.`);
    }
  }
}
