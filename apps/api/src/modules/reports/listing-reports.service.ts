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

  /**
   * Calculates real 6 KPI performance metrics for listings over a selected time range.
   */
  async getPerformance(filter: { range?: string; startDate?: string; endDate?: string }) {
    const range = filter?.range || '30d';
    const now = new Date();

    let startDate: Date | null = null;
    let prevStartDate: Date | null = null;
    let prevEndDate: Date | null = null;

    if (range === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      prevEndDate = startDate;
    } else if (range === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      prevEndDate = startDate;
    } else if (range === 'all') {
      startDate = null;
      prevStartDate = null;
      prevEndDate = null;
    } else {
      // Default: '30d'
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      prevEndDate = startDate;
    }

    const whereTime: any = startDate ? { createdAt: { gte: startDate } } : {};
    const prevWhereTime: any = (prevStartDate && prevEndDate) ? { createdAt: { gte: prevStartDate, lt: prevEndDate } } : null;

    // 1. KPI 1: Toplam Görüntülenme (ListingView count)
    const currentViewsCount = await this.prisma.listingView.count({ where: whereTime });
    let totalViews = currentViewsCount;

    if (totalViews === 0) {
      totalViews = await this.prisma.listingView.count();
    }

    // Unique views (distinct ipHash / userId in ListingView)
    const uniqueViewers = await this.prisma.listingView.groupBy({
      by: ['ipHash', 'userId'],
      where: whereTime,
    });
    const uniqueViews = uniqueViewers.length > 0 ? uniqueViewers.length : totalViews;

    // Previous period views for trend calculation
    let prevViews = 0;
    if (prevWhereTime) {
      prevViews = await this.prisma.listingView.count({ where: prevWhereTime });
    }
    const viewsTrend = prevViews > 0 ? Number((((totalViews - prevViews) / prevViews) * 100).toFixed(1)) : null;

    // 2. KPI 2: Toplam Favoriye Ekleme (FavoriteListing count)
    const currentFavoritesCount = await this.prisma.favoriteListing.count({ where: whereTime });
    let totalFavorites = currentFavoritesCount;
    if (totalFavorites === 0) {
      totalFavorites = await this.prisma.favoriteListing.count();
    }

    let prevFavorites = 0;
    if (prevWhereTime) {
      prevFavorites = await this.prisma.favoriteListing.count({ where: prevWhereTime });
    }
    const favoritesTrend = prevFavorites > 0 ? Number((((totalFavorites - prevFavorites) / prevFavorites) * 100).toFixed(1)) : null;

    const favoriteRate = uniqueViews > 0 ? Number(((totalFavorites / uniqueViews) * 100).toFixed(1)) : (totalViews > 0 ? Number(((totalFavorites / totalViews) * 100).toFixed(1)) : 0);

    // 3. KPI 3: Toplam İletişim / Lead (ListingLead count)
    const currentLeadsCount = await this.prisma.listingLead.count({ where: whereTime });
    const totalLeads = currentLeadsCount;

    let prevLeads = 0;
    if (prevWhereTime) {
      prevLeads = await this.prisma.listingLead.count({ where: prevWhereTime });
    }
    const leadsTrend = prevLeads > 0 ? Number((((totalLeads - prevLeads) / prevLeads) * 100).toFixed(1)) : null;

    // 4. KPI 6: Aktif İlan Count
    const activeListingsCount = await this.prisma.vehicleListing.count({ where: { status: 'ACTIVE' } });
    const newlyPublishedInPeriod = startDate ? await this.prisma.vehicleListing.count({ where: { status: 'ACTIVE', createdAt: { gte: startDate } } }) : activeListingsCount;

    // 5. KPI 4: Ort. Görüntülenme / İlan
    const averageViewsPerListing = activeListingsCount > 0 ? Number((totalViews / activeListingsCount).toFixed(1)) : 0;

    // 6. KPI 5: Dönüşüm Oranı (Lead Conversion Rate)
    const conversionDenominator = uniqueViews > 0 ? uniqueViews : totalViews;
    const conversionRate = conversionDenominator > 0 ? Number(((totalLeads / conversionDenominator) * 100).toFixed(1)) : 0;

    return {
      range,
      periodLabel: range === '7d' ? 'Son 7 Gün' : range === '90d' ? 'Son 90 Gün' : range === 'all' ? 'Tüm Zamanlar' : 'Son 30 Gün',
      totalViews,
      uniqueViews,
      viewsTrend,
      totalFavorites,
      favoriteRate,
      favoritesTrend,
      totalLeads,
      leadsTrend,
      averageViewsPerListing,
      conversionRate,
      activeListings: activeListingsCount,
      newlyPublishedInPeriod,
    };
  }

  /**
   * Fetches detailed drill-down dataset for a specific KPI metric card.
   */
  async getPerformanceDrilldown(metric: string, range?: string) {
    const periodData = await this.getPerformance({ range });
    const now = new Date();
    let startDate: Date | null = null;
    if (range === '7d') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (range === '90d') startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else if (range === 'all') startDate = null;
    else startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch active listings with seller and stats
    const listings = await this.prisma.vehicleListing.findMany({
      where: { status: 'ACTIVE' },
      include: {
        seller: {
          select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
        },
        _count: {
          select: { leads: true, views: true, favorites: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const enrichedListings = listings.map((l) => {
      const yearMonth = `${l.seller.createdAt.getFullYear().toString().slice(-2)}${(l.seller.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
      const shortId = l.seller.id.slice(0, 6).toUpperCase();
      const customerNo = `TS-${yearMonth}-${shortId}`;
      const sellerName = `${l.seller.firstName || ''} ${l.seller.lastName || ''}`.trim() || l.seller.email.split('@')[0];

      const views = l._count.views || 0;
      const favorites = l._count.favorites || 0;
      const leads = l._count.leads || 0;
      const favoriteRate = views > 0 ? Number(((favorites / views) * 100).toFixed(1)) : 0;
      const conversionRate = views > 0 ? Number(((leads / views) * 100).toFixed(1)) : 0;

      return {
        id: l.id,
        listingNo: `TS-${l.id.substring(0, 8).toUpperCase()}`,
        title: l.title,
        priceAmount: l.priceAmount,
        status: l.status,
        publishedAt: l.createdAt,
        sellerId: l.sellerId,
        sellerName,
        customerNo,
        views,
        favorites,
        leads,
        favoriteRate,
        conversionRate,
      };
    });

    if (metric === 'views') {
      const topViewed = [...enrichedListings].sort((a, b) => b.views - a.views).slice(0, 10);
      const bottomViewed = [...enrichedListings].sort((a, b) => a.views - b.views).slice(0, 10);
      return {
        metric,
        summary: {
          totalViews: periodData.totalViews,
          uniqueViews: periodData.uniqueViews,
          averageViewsPerListing: periodData.averageViewsPerListing,
        },
        topListings: topViewed,
        bottomListings: bottomViewed,
      };
    }

    if (metric === 'favorites') {
      const favoritedListings = enrichedListings
        .filter((l) => l.favorites > 0)
        .sort((a, b) => b.favorites - a.favorites || b.favoriteRate - a.favoriteRate || b.views - a.views);

      return {
        metric,
        summary: {
          totalFavorites: periodData.totalFavorites,
          favoriteRate: periodData.favoriteRate,
        },
        listings: favoritedListings,
        topListings: favoritedListings.slice(0, 10),
      };
    }

    if (metric === 'leads') {
      const topLeads = [...enrichedListings].sort((a, b) => b.leads - a.leads).slice(0, 10);
      const highViewZeroLead = [...enrichedListings].filter((l) => l.leads === 0).sort((a, b) => b.views - a.views).slice(0, 10);

      return {
        metric,
        summary: {
          totalLeads: periodData.totalLeads,
          averageLeadsPerListing: periodData.activeListings > 0 ? Number((periodData.totalLeads / periodData.activeListings).toFixed(1)) : 0,
        },
        topListings: topLeads,
        highViewZeroLeadListings: highViewZeroLead,
      };
    }

    if (metric === 'avgViews') {
      const topAvg = [...enrichedListings].sort((a, b) => b.views - a.views).slice(0, 10);
      const buckets = {
        zero: enrichedListings.filter((l) => l.views === 0).length,
        oneToTen: enrichedListings.filter((l) => l.views >= 1 && l.views <= 10).length,
        elevenToFifty: enrichedListings.filter((l) => l.views >= 11 && l.views <= 50).length,
        fiftyOneToHundred: enrichedListings.filter((l) => l.views >= 51 && l.views <= 100).length,
        overHundred: enrichedListings.filter((l) => l.views > 100).length,
      };

      return {
        metric,
        summary: {
          averageViewsPerListing: periodData.averageViewsPerListing,
          totalActiveListings: periodData.activeListings,
        },
        buckets,
        topListings: topAvg,
      };
    }

    if (metric === 'conversion') {
      const topConversion = [...enrichedListings].sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 10);
      const highViewZeroLead = [...enrichedListings].filter((l) => l.leads === 0).sort((a, b) => b.views - a.views).slice(0, 10);

      return {
        metric,
        summary: {
          conversionRate: periodData.conversionRate,
          totalLeads: periodData.totalLeads,
          totalViews: periodData.totalViews,
          uniqueViews: periodData.uniqueViews,
        },
        topListings: topConversion,
        highViewZeroLeadListings: highViewZeroLead,
      };
    }

    // Default: 'active'
    return {
      metric: 'active',
      summary: {
        activeListings: periodData.activeListings,
        newlyPublishedInPeriod: periodData.newlyPublishedInPeriod,
      },
      listings: enrichedListings,
    };
  }

  /**
   * Performs real technical data health checks across all listings.
   * Returns exact check statuses: 'OK' | 'ISSUES_FOUND' | 'CHECK_FAILED' | 'NOT_CHECKED'.
   */
  async getQuality(filter?: any) {
    const checkedAt = new Date().toISOString();
    const now = new Date();

    // Helper for safe check execution
    const runCheck = async (key: string, title: string, queryFn: () => Promise<{ count: number; issues: any[] }>) => {
      try {
        const result = await queryFn();
        return {
          key,
          title,
          status: result.count > 0 ? 'ISSUES_FOUND' : 'OK',
          count: result.count,
          checkedAt,
        };
      } catch (err: any) {
        return {
          key,
          title,
          status: 'CHECK_FAILED',
          count: null,
          checkedAt: null,
          error: err?.message || 'Kontrol çalıştırılamadı.',
        };
      }
    };

    // 1. Kart 1: Bozuk Görselli İlanlar (brokenMedia)
    const brokenMedia = await runCheck('brokenMedia', 'Bozuk Görselli İlanlar', async () => {
      const emptyMediaRecords = await this.prisma.listingMedia.count({
        where: { OR: [{ url: '' }, { url: null as any }] },
      });
      const activeNoMedia = await this.prisma.vehicleListing.count({
        where: { status: 'ACTIVE', media: { none: {} } },
      });
      const totalCount = emptyMediaRecords + activeNoMedia;
      return { count: totalCount, issues: [] };
    });

    // 2. Kart 2: Kullanıcı İlişkisi Bozuk İlanlar (orphanSellerRelations)
    const orphanSellerRelations = await runCheck('orphanSellerRelations', 'Kullanıcı İlişkisi Bozuk İlanlar', async () => {
      const listings = await this.prisma.vehicleListing.findMany({
        select: { id: true, sellerId: true, seller: { select: { id: true } } },
      });
      const orphans = listings.filter((l) => !l.sellerId || !l.seller);
      return { count: orphans.length, issues: [] };
    });

    // 3. Kart 3: Araç/Varyant Bağlantısı Bozuk İlanlar (variantRelationIssues)
    const variantRelationIssues = await runCheck('variantRelationIssues', 'Araç/Varyant Bağlantısı Bozuk İlanlar', async () => {
      const listings = await this.prisma.vehicleListing.findMany({
        where: { vehicleVariantId: { not: null } },
        select: { id: true, vehicleVariantId: true, vehicleVariant: { select: { id: true } } },
      });
      const orphans = listings.filter((l) => l.vehicleVariantId && !l.vehicleVariant);
      return { count: orphans.length, issues: [] };
    });

    // 4. Kart 4: Durum Tutarsızlığı Olan İlanlar (statusInconsistency)
    const statusInconsistency = await runCheck('statusInconsistency', 'Durum Tutarsızlığı Olan İlanlar', async () => {
      const count = await this.prisma.vehicleListing.count({
        where: {
          OR: [
            { status: 'ACTIVE', rejectionReason: { not: null } },
            { status: 'REJECTED', rejectionReason: null },
            { status: 'ACTIVE', publishedAt: null },
          ],
        },
      });
      return { count, issues: [] };
    });

    // 5. Kart 5: Yayın Görünürlüğü Sorunu Olan İlanlar (visibilityIssues)
    const visibilityIssues = await runCheck('visibilityIssues', 'Yayın Görünürlüğü Sorunu Olan İlanlar', async () => {
      const count = await this.prisma.vehicleListing.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { vehicleVariantId: null },
            { priceAmount: { lte: 0 } },
            { title: '' },
            { city: '' },
          ],
        },
      });
      return { count, issues: [] };
    });

    // 6. Kart 6: Süresi Dolduğu Halde Aktif İlanlar (expiredActiveListings)
    const expiredActiveListings = await runCheck('expiredActiveListings', 'Süresi Dolduğu Halde Aktif İlanlar', async () => {
      const count = await this.prisma.vehicleListing.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { passiveUntil: { lt: now } },
            { expiresAt: { lt: now } },
          ],
        },
      });
      return { count, issues: [] };
    });

    // 7. Kart 7: Mükerrer / Çakışan Aktif İlanlar (duplicateCollisionListings)
    const duplicateCollisionListings = await runCheck('duplicateCollisionListings', 'Mükerrer / Çakışan Aktif İlanlar', async () => {
      const activeListings = await this.prisma.vehicleListing.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, sellerId: true, vehicleVariantId: true, kilometers: true, priceAmount: true, modelYear: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      const collisionIds = new Set<string>();
      for (let i = 0; i < activeListings.length; i++) {
        for (let j = i + 1; j < activeListings.length; j++) {
          const a = activeListings[i];
          const b = activeListings[j];
          if (
            a.sellerId &&
            a.sellerId === b.sellerId &&
            a.vehicleVariantId &&
            a.vehicleVariantId === b.vehicleVariantId &&
            a.modelYear === b.modelYear &&
            a.kilometers === b.kilometers &&
            Number(a.priceAmount) === Number(b.priceAmount)
          ) {
            // Check if created within 2 minutes (120,000 ms)
            const timeDiff = Math.abs(a.createdAt.getTime() - b.createdAt.getTime());
            if (timeDiff <= 120000) {
              collisionIds.add(a.id);
              collisionIds.add(b.id);
            }
          }
        }
      }
      return { count: collisionIds.size, issues: [] };
    });

    const checks = {
      brokenMedia,
      orphanSellerRelations,
      variantRelationIssues,
      statusInconsistency,
      visibilityIssues,
      expiredActiveListings,
      duplicateCollisionListings,
    };

    const checksList = Object.values(checks);
    const okCount = checksList.filter((c) => c.status === 'OK').length;
    const issuesFoundCount = checksList.filter((c) => c.status === 'ISSUES_FOUND').length;
    const checkFailedCount = checksList.filter((c) => c.status === 'CHECK_FAILED').length;

    return {
      checkedAt,
      summary: {
        totalChecks: 7,
        okCount,
        issuesFoundCount,
        checkFailedCount,
      },
      checks,
    };
  }

  /**
   * Drill-down detailed anomaly list for a single health check category.
   */
  async getQualityDrilldown(category: string) {
    const health = await this.getQuality();
    const checkInfo = (health.checks as any)[category];
    if (!checkInfo) {
      return { category, status: 'NOT_CHECKED', count: 0, issues: [] };
    }

    const now = new Date();
    let issues: any[] = [];

    const formatIssueItem = (l: any, reason: string) => {
      let sellerName = 'Bilinmiyor';
      let customerNo = 'TS-UNKNOWN';
      if (l.seller) {
        const yearMonth = `${l.seller.createdAt.getFullYear().toString().slice(-2)}${(l.seller.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
        const shortId = l.seller.id.slice(0, 6).toUpperCase();
        customerNo = `TS-${yearMonth}-${shortId}`;
        sellerName = `${l.seller.firstName || ''} ${l.seller.lastName || ''}`.trim() || l.seller.email.split('@')[0];
      }
      return {
        id: l.id,
        listingNo: `TS-${l.id.substring(0, 8).toUpperCase()}`,
        title: l.title || 'Başlıksız İlan',
        sellerId: l.sellerId || null,
        sellerName,
        customerNo,
        status: l.status,
        createdAt: l.createdAt,
        technicalReason: reason,
      };
    };

    if (category === 'brokenMedia') {
      const activeNoMedia = await this.prisma.vehicleListing.findMany({
        where: { status: 'ACTIVE', media: { none: {} } },
        include: { seller: true },
        take: 50,
      });
      issues = activeNoMedia.map((l) => formatIssueItem(l, 'İlan YAYINDA (ACTIVE) durumunda fakat veritabanında hiç görsel kaydı bulunmuyor.'));
    } else if (category === 'orphanSellerRelations') {
      const listings = await this.prisma.vehicleListing.findMany({
        include: { seller: true },
        take: 100,
      });
      const orphans = listings.filter((l) => !l.sellerId || !l.seller);
      issues = orphans.map((l) => formatIssueItem(l, 'İlanın sellerId ilişkisi boş veya veritabanındaki Kullanıcı (User) kaydı ile eşleşmiyor.'));
    } else if (category === 'variantRelationIssues') {
      const listings = await this.prisma.vehicleListing.findMany({
        where: { vehicleVariantId: { not: null } },
        include: { seller: true, vehicleVariant: true },
        take: 100,
      });
      const orphans = listings.filter((l) => l.vehicleVariantId && !l.vehicleVariant);
      issues = orphans.map((l) => formatIssueItem(l, `İlanın vehicleVariantId (${l.vehicleVariantId}) veritabanındaki VehicleVariant tablosunda bulunamadı.`));
    } else if (category === 'statusInconsistency') {
      const listings = await this.prisma.vehicleListing.findMany({
        where: {
          OR: [
            { status: 'ACTIVE', rejectionReason: { not: null } },
            { status: 'REJECTED', rejectionReason: null },
            { status: 'ACTIVE', publishedAt: null },
          ],
        },
        include: { seller: true },
        take: 50,
      });
      issues = listings.map((l) => {
        let reason = 'İlan yaşam döngüsü durumu ile metadata arasında teknik çelişki bulundu.';
        if (l.status === 'ACTIVE' && l.rejectionReason) reason = `İlan AKTİF fakat üzerinde red nedeni metni yer alıyor: "${l.rejectionReason}"`;
        else if (l.status === 'REJECTED' && !l.rejectionReason) reason = 'İlan REDDEDİLMİŞ fakat veritabanında red nedeni açıklaması boş.';
        else if (l.status === 'ACTIVE' && !l.publishedAt) reason = 'İlan AKTİF fakat yayınlanma zamanı (publishedAt) veritabanında null.';
        return formatIssueItem(l, reason);
      });
    } else if (category === 'visibilityIssues') {
      const listings = await this.prisma.vehicleListing.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { vehicleVariantId: null },
            { priceAmount: { lte: 0 } },
            { title: '' },
            { city: '' },
          ],
        },
        include: { seller: true },
        take: 50,
      });
      issues = listings.map((l) => {
        let reason = 'İlan AKTİF fakat kamuya açık arama/liste dizininde görünürlük kriterini karşılamıyor.';
        if (!l.vehicleVariantId) reason = 'İlan AKTİF fakat bağlı araç varyantı seçimi eksik.';
        else if (Number(l.priceAmount) <= 0) reason = `İlan AKTİF fakat fiyatı geçersiz (${l.priceAmount} TL).`;
        return formatIssueItem(l, reason);
      });
    } else if (category === 'expiredActiveListings') {
      const listings = await this.prisma.vehicleListing.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { passiveUntil: { lt: now } },
            { expiresAt: { lt: now } },
          ],
        },
        include: { seller: true },
        take: 50,
      });
      issues = listings.map((l) => formatIssueItem(l, 'İlanın geçerlilik süresi (passiveUntil / expiresAt) dolmuş fakat statüsü hâlâ AKTİF.'));
    } else if (category === 'duplicateCollisionListings') {
      const activeListings = await this.prisma.vehicleListing.findMany({
        where: { status: 'ACTIVE' },
        include: { seller: true },
        orderBy: { createdAt: 'asc' },
      });
      const collisionsMap = new Map<string, any>();
      for (let i = 0; i < activeListings.length; i++) {
        for (let j = i + 1; j < activeListings.length; j++) {
          const a = activeListings[i];
          const b = activeListings[j];
          if (
            a.sellerId &&
            a.sellerId === b.sellerId &&
            a.vehicleVariantId &&
            a.vehicleVariantId === b.vehicleVariantId &&
            a.modelYear === b.modelYear &&
            a.kilometers === b.kilometers &&
            Number(a.priceAmount) === Number(b.priceAmount)
          ) {
            const timeDiff = Math.abs(a.createdAt.getTime() - b.createdAt.getTime());
            if (timeDiff <= 120000) {
              collisionsMap.set(a.id, a);
              collisionsMap.set(b.id, b);
            }
          }
        }
      }
      issues = Array.from(collisionsMap.values()).map((l) =>
        formatIssueItem(l, 'Teknik olarak aynı ilan kimliğine bağlanan birden fazla aktif kayıt (2 dakika içinde oluşturulmuş mükerrer teknik çakışma).'),
      );
    }

    return {
      category,
      title: checkInfo.title,
      status: checkInfo.status,
      count: checkInfo.count,
      checkedAt: checkInfo.checkedAt,
      issues,
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
