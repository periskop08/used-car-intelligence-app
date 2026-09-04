import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

import { ListingPromotionActivationService } from '../listing-promotion/listing-promotion-activation.service';
import { ListingPromotionRefundService } from '../listing-promotion/listing-promotion-refund.service';
import { ListingPromotionQueryService } from '../listing-promotion/listing-promotion-query.service';
import { Optional } from '@nestjs/common';

const PRESET_REASONS = [
  { code: 'PHOTO_INSUFFICIENT', actionType: 'REVISION_REQUIRED', title: 'Araç fotoğrafları yetersiz', defaultSellerMessage: 'İlanınızdaki fotoğraflar yetersizdir. Lütfen aracın ön, arka, yan ve iç mekan fotoğraflarını net biçimde yükleyin.', requiresSellerNote: true, allowsResubmission: true },
  { code: 'PHOTO_MISMATCH', actionType: 'REVISION_REQUIRED', title: 'Fotoğraflar araçla uyuşmuyor', defaultSellerMessage: 'Yüklenen fotoğraflardan bazıları seçilen marka/model ile eşleşmemektedir.', requiresSellerNote: true, allowsResubmission: true },
  { code: 'PHONE_IN_DESCRIPTION', actionType: 'REVISION_REQUIRED', title: 'Açıklamada iletişim bilgisi mevcut', defaultSellerMessage: 'Güvenlik kuralları gereği ilan açıklamasında telefon numarası veya e-posta adresi paylaşılamaz.', requiresSellerNote: true, allowsResubmission: true },
  { code: 'PRICE_ANOMALY', actionType: 'REVISION_REQUIRED', title: 'Fiyat bilgisi kontrol edilmeli', defaultSellerMessage: 'Girdiğiniz ilan fiyatı piyasa ortalamasının çok dışındadır. Lütfen fiyatınızı kontrol edin.', requiresSellerNote: true, allowsResubmission: true },
  { code: 'MISSING_SPECS', actionType: 'REVISION_REQUIRED', title: 'Hasar/Tramer bilgisi eksik', defaultSellerMessage: 'Lütfen aracın boya, değişen ve Tramer hasar kaydı bilgilerini eksiksiz belirtin.', requiresSellerNote: true, allowsResubmission: true },
  { code: 'FAKED_LISTING', actionType: 'REJECT', title: 'Sahte veya yanıltıcı ilan', defaultSellerMessage: 'İlanınız sahte veya yanıltıcı içerik şüphesiyle reddedilmiştir.', requiresSellerNote: true, allowsResubmission: false },
  { code: 'DUPLICATE_LISTING', actionType: 'REJECT', title: 'Kopya / Tekrarlanan ilan', defaultSellerMessage: 'Aynı araca ait aktif bir ilanınız zaten bulunmaktadır.', requiresSellerNote: true, allowsResubmission: false },
  { code: 'COMMERCIAL_WATERMARK', actionType: 'REVISION_REQUIRED', title: 'Filigranlı / Ticari görsel', defaultSellerMessage: 'İlan fotoğraflarında başka sitelere ait logo veya filigran bulunmamalıdır.', requiresSellerNote: true, allowsResubmission: true },
];

@Injectable()
export class ListingModerationService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly activationService?: ListingPromotionActivationService,
    @Optional() private readonly refundService?: ListingPromotionRefundService,
    @Optional() private readonly queryService?: ListingPromotionQueryService,
  ) {}

  async onModuleInit() {
    const valuesToAdd = ['DETAILED_REVIEW', 'REVISION_REQUIRED', 'REPORTED', 'DELETED'];
    for (const val of valuesToAdd) {
      try {
        await this.prisma.$executeRawUnsafe(`ALTER TYPE "ListingStatus" ADD VALUE '${val}'`);
      } catch (e) {
        // enum value already exists or harmless
      }
    }

    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ListingModerationAction" (
          "id" TEXT NOT NULL,
          "listingId" TEXT NOT NULL,
          "sellerId" TEXT NOT NULL,
          "actorAdminId" TEXT NOT NULL,
          "actionType" TEXT NOT NULL,
          "previousStatus" TEXT NOT NULL,
          "newStatus" TEXT NOT NULL,
          "reasonCode" TEXT,
          "sellerMessage" TEXT,
          "internalNote" TEXT,
          "affectedFields" JSONB,
          "affectedMediaIds" JSONB,
          "allowResubmission" BOOLEAN NOT NULL DEFAULT true,
          "emailStatus" TEXT,
          "notificationStatus" TEXT,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ListingModerationAction_pkey" PRIMARY KEY ("id")
        );
      `);
    } catch (e) {}

    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ListingModerationReason" (
          "id" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "actionType" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "defaultSellerMessage" TEXT,
          "requiresSellerNote" BOOLEAN NOT NULL DEFAULT true,
          "allowsResubmission" BOOLEAN NOT NULL DEFAULT true,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ListingModerationReason_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ListingModerationReason_code_key" UNIQUE ("code")
        );
      `);
    } catch (e) {}

    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ListingModerationLock" (
          "id" TEXT NOT NULL,
          "listingId" TEXT NOT NULL,
          "adminId" TEXT NOT NULL,
          "adminName" TEXT NOT NULL,
          "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ListingModerationLock_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ListingModerationLock_listingId_key" UNIQUE ("listingId")
        );
      `);
    } catch (e) {}
  }

  private formatCustomerNo(user: any): string {
    if (user?.customerNo) return user.customerNo;
    const year = user?.createdAt ? new Date(user.createdAt).getFullYear().toString().slice(-2) : '26';
    const month = user?.createdAt ? (new Date(user.createdAt).getMonth() + 1).toString().padStart(2, '0') : '07';
    return `TS-${year}${month}-000001`;
  }

  private formatPublicListingNo(listing: any): string {
    const year = listing.createdAt ? new Date(listing.createdAt).getFullYear().toString().slice(-2) : '26';
    const month = listing.createdAt ? (new Date(listing.createdAt).getMonth() + 1).toString().padStart(2, '0') : '08';
    const num = listing.id ? listing.id.replace(/-/g, '').substring(0, 6).toUpperCase() : '000000';
    return `TS-ILAN-${year}${month}-${num}`;
  }

  async getModerationReasons(actionType?: string) {
    let DBReasons: any[] = [];
    try {
      DBReasons = await (this.prisma as any).listingModerationReason.findMany({
        where: actionType ? { actionType, isActive: true } : { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    } catch (e) {
      // fallback
    }

    if (DBReasons.length > 0) return DBReasons;
    return actionType ? PRESET_REASONS.filter((r) => r.actionType === actionType) : PRESET_REASONS;
  }

  async getSellers(query: any) {
    const { status, search, sellerType, package: pkg, riskLevel, sort = 'PENDING_FIRST', page = 1, limit = 25 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const sellersWithListings = await this.prisma.user.findMany({
      where: {
        listings: { some: {} },
        ...(pkg ? { subscriptionTier: pkg } : {}),
        ...(search ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        listings: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            expiresAt: true,
            publishedAt: true,
            priceAmount: true,
            kilometers: true,
            modelYear: true,
            city: true,
            sellerType: true,
            tramerAmount: true,
          },
        },
      },
      take: 100,
    });

    const now = new Date();
    const results = sellersWithListings.map((seller) => {
      const listings = seller.listings || [];
      const customerNo = this.formatCustomerNo(seller);

      const isCorp = sellerType === 'CORPORATE' || listings.some((l) => l.sellerType === 'DEALER' || l.sellerType === 'AUTHORIZED_DEALER');

      const counts = {
        total: listings.length,
        pending: listings.filter((l) => l.status === 'PENDING_REVIEW').length,
        revisionRequired: listings.filter((l) => (l.status as any) === 'REVISION_REQUIRED').length,
        detailedReview: listings.filter((l) => (l.status as any) === 'DETAILED_REVIEW').length,
        active: listings.filter((l) => l.status === 'ACTIVE' && (!l.expiresAt || new Date(l.expiresAt) > now)).length,
        rejected: listings.filter((l) => l.status === 'REJECTED').length,
        passive: listings.filter((l) => l.status === 'PASSIVE').length,
        expired: listings.filter((l) => l.status === 'EXPIRED' || (l.status === 'ACTIVE' && l.expiresAt && new Date(l.expiresAt) <= now)).length,
        reported: listings.filter((l) => (l.status as any) === 'REPORTED').length,
      };

      const flags: string[] = [];
      if (counts.rejected > 0) flags.push('Daha önce ret alan ilan mevcut');
      if (counts.revisionRequired > 0) flags.push('Düzeltme bekleyen ilan mevcut');
      if (counts.reported > 0) flags.push('Şikayetli ilan kaydı var');
      if (listings.some((l) => Number(l.priceAmount) < 100000 || Number(l.priceAmount) > 10000000)) flags.push('Şüpheli fiyat aralığı');
      if (listings.some((l) => l.kilometers > 500000)) flags.push('Yüksek kilometre uyarısı');

      let riskLevelComputed: 'NORMAL' | 'ATTENTION' | 'HIGH_REVIEW_PRIORITY' = 'NORMAL';
      if (flags.length >= 2 || counts.reported > 0) riskLevelComputed = 'HIGH_REVIEW_PRIORITY';
      else if (flags.length === 1 || counts.pending > 2) riskLevelComputed = 'ATTENTION';

      const lastListing = listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        seller: {
          userId: seller.id,
          customerNo,
          fullName: `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || seller.username || 'Satıcı',
          username: seller.username || seller.email.split('@')[0],
          email: seller.email,
          packageName: seller.subscriptionTier || 'FREE',
          sellerType: isCorp ? 'CORPORATE' : 'INDIVIDUAL',
          city: lastListing?.city || 'İstanbul',
          registeredAt: seller.createdAt,
        },
        counts,
        risk: {
          level: riskLevelComputed,
          flags,
        },
        lastListingCreatedAt: lastListing?.createdAt || seller.createdAt,
        lastModerationAt: lastListing?.updatedAt || seller.createdAt,
      };
    });

    let filtered = results;
    if (status) {
      filtered = results.filter((r) => {
        switch (status) {
          case 'PENDING_REVIEW': return r.counts.pending > 0;
          case 'REVISION_REQUIRED': return r.counts.revisionRequired > 0;
          case 'DETAILED_REVIEW': return r.counts.detailedReview > 0;
          case 'ACTIVE': return r.counts.active > 0;
          case 'REJECTED': return r.counts.rejected > 0;
          case 'PASSIVE': return r.counts.passive > 0;
          case 'EXPIRED': return r.counts.expired > 0;
          case 'REPORTED': return r.counts.reported > 0;
          default: return true;
        }
      });
    }

    if (riskLevel) {
      filtered = filtered.filter((r) => r.risk.level === riskLevel);
    }

    filtered.sort((a, b) => {
      if (sort === 'PENDING_FIRST') return b.counts.pending - a.counts.pending;
      if (sort === 'NEWEST') return new Date(b.lastListingCreatedAt).getTime() - new Date(a.lastListingCreatedAt).getTime();
      if (sort === 'HIGHEST_RISK') return b.risk.flags.length - a.risk.flags.length;
      if (sort === 'MOST_LISTINGS') return b.counts.total - a.counts.total;
      return 0;
    });

    const paginated = filtered.slice(skip, skip + Number(limit));

    const tabCounts = {
      PENDING_REVIEW: results.reduce((acc, curr) => acc + curr.counts.pending, 0),
      REVISION_REQUIRED: results.reduce((acc, curr) => acc + curr.counts.revisionRequired, 0),
      DETAILED_REVIEW: results.reduce((acc, curr) => acc + curr.counts.detailedReview, 0),
      ACTIVE: results.reduce((acc, curr) => acc + curr.counts.active, 0),
      REJECTED: results.reduce((acc, curr) => acc + curr.counts.rejected, 0),
      PASSIVE: results.reduce((acc, curr) => acc + curr.counts.passive, 0),
      EXPIRED: results.reduce((acc, curr) => acc + curr.counts.expired, 0),
      REPORTED: results.reduce((acc, curr) => acc + curr.counts.reported, 0),
    };

    return {
      sellers: paginated,
      totalSellers: filtered.length,
      tabCounts,
      page: Number(page),
      limit: Number(limit),
    };
  }

  async getSellerListings(customerNo: string, status?: string) {
    const users = await this.prisma.user.findMany({
      select: { id: true, createdAt: true, username: true, email: true },
    });

    const seller = users.find(
      (u) =>
        this.formatCustomerNo(u).toUpperCase() === customerNo.toUpperCase() ||
        u.id === customerNo ||
        u.username === customerNo ||
        u.email === customerNo
    );

    if (!seller) throw new NotFoundException('Satıcı bulunamadı.');

    let statusFilter: any = undefined;
    if (status) {
      if (status === 'PENDING') {
        statusFilter = { in: ['PENDING_REVIEW', 'REVISION_REQUIRED', 'DETAILED_REVIEW'] };
      } else if (status === 'PASSIVE') {
        statusFilter = { in: ['PASSIVE', 'EXPIRED'] };
      } else {
        statusFilter = status;
      }
    }

    const listings = await this.prisma.vehicleListing.findMany({
      where: {
        sellerId: seller.id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        media: true,
        vehicleVariant: {
          include: {
            model: {
              include: { brand: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map((l) => {
      const publicListingNo = this.formatPublicListingNo(l);
      const brand = l.vehicleVariant?.model?.brand?.name || l.customBrand || 'Marka';
      const model = l.vehicleVariant?.model?.name || l.customModel || 'Model';
      const waitingHours = Math.max(0, Math.floor((Date.now() - new Date(l.createdAt).getTime()) / (1000 * 3600)));

      return {
        listingId: l.id,
        publicListingNo,
        title: l.title || `${brand} ${model} ${l.modelYear}`,
        brand,
        model,
        year: l.modelYear,
        price: l.priceAmount.toString(),
        currency: l.currency || 'TRY',
        mileage: l.kilometers,
        fuelType: l.fuelType || 'BENZIN',
        transmission: l.transmission || 'MANUEL',
        city: l.city || 'İstanbul',
        imageCount: l.media?.length || 0,
        status: l.status,
        waitingSince: `${waitingHours} saat`,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        riskFlags: Number(l.priceAmount) < 100000 ? ['Düşük Fiyat Uyarısı'] : [],
        version: 1,
      };
    });
  }

  async getListingDetails(listingId: string) {
    const l = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: {
        seller: true,
        media: true,
        promotions: true,
        promotionEntitlements: {
          include: { purchase: true },
        },
        vehicleVariant: {
          include: {
            model: {
              include: { brand: true },
            },
          },
        },
      },
    });

    if (!l) throw new NotFoundException('İlan bulunamadı.');

    const brand = l.vehicleVariant?.model?.brand?.name || l.customBrand || 'Marka';
    const model = l.vehicleVariant?.model?.name || l.customModel || 'Model';

    const autoChecks = [
      {
        check: 'Fotoğraf Uyum Kontrolü',
        level: l.media.length >= 3 ? 'INFO' : 'WARNING',
        message: l.media.length >= 3 ? 'Görsel sayısı yeterli (3+ fotoğraf).' : 'İlanda 3 adetten az fotoğraf var.',
      },
      {
        check: 'Fiyat Analizi',
        level: Number(l.priceAmount) > 50000 ? 'INFO' : 'HIGH_RISK',
        message: Number(l.priceAmount) > 50000 ? 'Fiyat piyasa standartlarıyla uyumlu.' : 'Fiyat şüpheli seviyede düşük.',
      },
      {
        check: 'Açıklama İletişim Filtresi',
        level: l.description?.match(/05\d{9}/) ? 'HIGH_RISK' : 'INFO',
        message: l.description?.match(/05\d{9}/) ? 'Açıklamada doğrudan telefon numarası tespit edildi!' : 'Açıklamada iletişim bilgisi ihlali yok.',
      },
    ];

    let pastActions: any[] = [];
    try {
      pastActions = await (this.prisma as any).listingModerationAction.findMany({
        where: { listingId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      // fallback
    }

    const promotionSummary = this.queryService
      ? this.queryService.resolveEffectivePromotions(l)
      : {
          publicationType: 'STANDARD' as const,
          urgent: { requested: !!l.isUrgent, status: 'NONE' as const, entitlementVerified: false, active: false, startsAt: null, expiresAt: null },
          showcase: { requested: !!l.isShowcaseFeedActive, status: 'NONE' as const, entitlementVerified: false, active: false, startsAt: null, expiresAt: null },
          paymentStatus: 'NONE' as const,
          startsAt: null,
          endsAt: null,
        };

    return {
      listing: {
        id: l.id,
        publicListingNo: this.formatPublicListingNo(l),
        title: l.title,
        brand,
        model,
        year: l.modelYear,
        price: l.priceAmount.toString(),
        currency: l.currency || 'TRY',
        mileage: l.kilometers,
        fuelType: l.fuelType || 'BENZIN',
        transmission: l.transmission || 'MANUEL',
        bodyType: l.bodyType || 'SEDAN',
        color: l.color || 'BEYAZ',
        enginePower: l.enginePower || 110,
        engineDisplacement: l.engineDisplacement || 1598,
        city: l.city,
        district: l.district || '',
        description: l.description,
        status: l.status,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      },
      promotionSummary,
      damageDeclaration: {
        hasDamageRecord: !!l.damageRecord,
        tramerFee: (l.tramerAmount || 0).toString(),
        isHeavyDamaged: l.heavyDamage,
        paintedParts: (l.paintedParts as any) || [],
        localPaintedParts: (l.localPaintedParts as any) || [],
        changedParts: (l.changedParts as any) || [],
        mechanicalDefectNotes: l.maintenanceHistory || 'Yok',
      },
      seller: {
        userId: l.seller.id,
        customerNo: this.formatCustomerNo(l.seller),
        fullName: `${l.seller.firstName || ''} ${l.seller.lastName || ''}`.trim() || l.seller.username || 'Satıcı',
        email: l.seller.email,
        phone: l.seller.phone,
        sellerType: l.sellerType === 'DEALER' || l.sellerType === 'AUTHORIZED_DEALER' ? 'CORPORATE' : 'INDIVIDUAL',
        packageName: l.seller.subscriptionTier,
      },
      media: l.media.map((m, idx) => ({
        id: m.id,
        url: m.url,
        order: m.sortOrder || idx + 1,
        moderationStatus: m.moderationStatus || 'APPROVED',
      })),
      canReactivate: l.status === 'PASSIVE' && (!l.expiresAt || new Date(l.expiresAt) >= new Date()) && l.seller?.isActive !== false,
      reactivationBlockedReason:
        l.status !== 'PASSIVE'
          ? 'İlan pasif durumda olmadığı için aktifleştirilemez.'
          : l.expiresAt && new Date(l.expiresAt) < new Date()
          ? 'İlan süresi dolduğu için (EXPIRED) doğrudan aktifleştirilemez. Kullanıcının ilan süresini uzatması gereklidir.'
          : l.seller?.isActive === false
          ? 'Kullanıcı hesabı pasif durumdadır.'
          : null,
      autoChecks,
      pastActions,
    };
  }

  async approveListing(listingId: string, adminUser: any) {
    const l = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: { seller: true },
    });
    if (!l) throw new NotFoundException('İlan bulunamadı.');

    const now = new Date();
    const tier = l.seller?.subscriptionTier;
    const isProTier = tier === ('PROFESYONEL' as any) || tier === ('PREMIUM' as any) || tier === ('PRO' as any);
    const durationDays = isProTier ? 45 : 30;

    // The publication period strictly starts from approval time (now),
    // ensuring moderation review time does not shorten the seller's active publication period
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.vehicleListing.update({
      where: { id: listingId },
      data: {
        status: 'ACTIVE',
        publishedAt: now,
        expiresAt,
        listingDurationDays: durationDays,
      },
    });

    try {
      await (this.prisma as any).listingModerationAction.create({
        data: {
          listingId,
          sellerId: l.sellerId,
          actorAdminId: adminUser?.id || 'admin',
          actionType: 'APPROVE',
          previousStatus: l.status,
          newStatus: 'ACTIVE',
          sellerMessage: 'İlanınız başarıyla onaylandı ve yayına alındı.',
          emailStatus: 'SENT',
          notificationStatus: 'SENT',
        },
      });
    } catch (e) {
      // fallback
    }

    if (this.activationService) {
      await this.activationService.tryActivatePromotions(listingId).catch(() => null);
    }

    // Verify whether any entitlement was actually activated, guaranteeing raw flags never grant free promotions
    const hasActiveUrgentEntitlement = await this.prisma.listingPromotionEntitlement.findFirst({
      where: {
        listingId,
        promotionType: 'URGENT_LISTING',
        lifecycleStatus: 'ACTIVE',
        expiresAt: { gt: now },
      },
    });
    const hasActiveShowcaseEntitlement = await this.prisma.listingPromotionEntitlement.findFirst({
      where: {
        listingId,
        promotionType: 'SHOWCASE_FEED',
        lifecycleStatus: 'ACTIVE',
        expiresAt: { gt: now },
      },
    });

    await this.prisma.vehicleListing.update({
      where: { id: listingId },
      data: {
        isUrgent: !!hasActiveUrgentEntitlement,
        urgentSince: hasActiveUrgentEntitlement ? hasActiveUrgentEntitlement.activatedAt : null,
        urgentExpiresAt: hasActiveUrgentEntitlement ? hasActiveUrgentEntitlement.expiresAt : null,
        isShowcaseFeedActive: !!hasActiveShowcaseEntitlement,
        showcaseFeedSince: hasActiveShowcaseEntitlement ? hasActiveShowcaseEntitlement.activatedAt : null,
        showcaseFeedExpiresAt: hasActiveShowcaseEntitlement ? hasActiveShowcaseEntitlement.expiresAt : null,
      },
    });

    return updated;
  }

  async requestRevision(listingId: string, body: any, adminUser: any) {
    const { reasonCode, sellerMessage, internalNote } = body;
    if (!sellerMessage) throw new BadRequestException('Satıcıya gönderilecek açıklama zorunludur.');

    const l = await this.prisma.vehicleListing.findUnique({ where: { id: listingId } });
    if (!l) throw new NotFoundException('İlan bulunamadı.');

    const updated = await this.prisma.vehicleListing.update({
      where: { id: listingId },
      data: {
        status: 'REVISION_REQUIRED' as any,
        rejectionReason: sellerMessage,
      },
    });

    try {
      await (this.prisma as any).listingModerationAction.create({
        data: {
          listingId,
          sellerId: l.sellerId,
          actorAdminId: adminUser?.id || 'admin',
          actionType: 'REQUEST_REVISION',
          previousStatus: l.status,
          newStatus: 'REVISION_REQUIRED',
          reasonCode: reasonCode || null,
          sellerMessage: sellerMessage || null,
          internalNote: internalNote || null,
          emailStatus: 'SENT',
          notificationStatus: 'UNREAD',
        },
      });
    } catch (e) {
      // fallback
    }

    try {
      await this.prisma.adminUserMessage.create({
        data: {
          userId: l.sellerId,
          createdByAdminId: adminUser?.id || 'system-moderator',
          adminEmail: adminUser?.email || 'moderation@torquescout.com',
          subject: 'İlanınız için düzeltme gerekiyor',
          message: `"${l.title}" ilanınız moderasyon ekibi tarafından düzeltme için geçici olarak yayından kaldırıldı.\n\nDüzeltme Nedeni: ${sellerMessage}`,
          sendInApp: true,
          sendEmail: true,
        },
      });
    } catch (e) {
      // fallback
    }

    return updated;
  }

  async sendToDetailedReview(listingId: string, body: any, adminUser: any) {
    const { internalNote } = body || {};
    const l = await this.prisma.vehicleListing.findUnique({ where: { id: listingId } });
    if (!l) throw new NotFoundException('İlan bulunamadı.');

    const updated = await this.prisma.vehicleListing.update({
      where: { id: listingId },
      data: { status: 'DETAILED_REVIEW' as any },
    });

    try {
      await (this.prisma as any).listingModerationAction.create({
        data: {
          listingId,
          sellerId: l.sellerId,
          actorAdminId: adminUser?.id || 'admin',
          actionType: 'DETAILED_REVIEW',
          previousStatus: l.status,
          newStatus: 'DETAILED_REVIEW',
          internalNote: internalNote || 'Admin tarafından detaylı incelemeye sevk edildi.',
        },
      });
    } catch (e) {
      // fallback
    }

    return updated;
  }

  async rejectListing(listingId: string, body: any, adminUser: any) {
    const { reasonCode, sellerMessage, internalNote, allowResubmission = false } = body;
    if (!sellerMessage) throw new BadRequestException('Satıcıya gönderilecek ret açıklaması zorunludur.');

    const l = await this.prisma.vehicleListing.findUnique({ where: { id: listingId } });
    if (!l) throw new NotFoundException('İlan bulunamadı.');

    const updated = await this.prisma.vehicleListing.update({
      where: { id: listingId },
      data: { status: 'REJECTED' },
    });

    try {
      await (this.prisma as any).listingModerationAction.create({
        data: {
          listingId,
          sellerId: l.sellerId,
          actorAdminId: adminUser?.id || 'admin',
          actionType: 'REJECT',
          previousStatus: l.status,
          newStatus: 'REJECTED',
          reasonCode: reasonCode || null,
          sellerMessage: sellerMessage || null,
          internalNote: internalNote || null,
          allowResubmission,
          emailStatus: 'SENT',
          notificationStatus: 'SENT',
        },
      });
    } catch (e) {
      // fallback
    }

    if (this.refundService) {
      await this.refundService.refundNeverActivatedPromotion(listingId, sellerMessage || 'İlan reddedildi').catch(() => null);
    }

    return updated;
  }

  async setPassive(listingId: string, adminUser: any) {
    const l = await this.prisma.vehicleListing.findUnique({ where: { id: listingId } });
    if (!l) throw new NotFoundException('İlan bulunamadı.');

    return this.prisma.vehicleListing.update({
      where: { id: listingId },
      data: { status: 'PASSIVE' },
    });
  }

  async activateListing(listingId: string, body: any, adminUser: any) {
    const { reasonCode, internalNote, sellerMessage } = body || {};
    if (!reasonCode && !internalNote && !sellerMessage) {
      throw new BadRequestException('Aktifleştirme nedeni veya açıklaması zorunludur.');
    }

    const l = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: { seller: true },
    });
    if (!l) throw new NotFoundException('İlan bulunamadı.');

    if (l.status !== 'PASSIVE') {
      throw new BadRequestException('Yalnızca pasif durumdaki ilanlar aktifleştirilebilir.');
    }

    if (l.expiresAt && new Date(l.expiresAt) < new Date()) {
      throw new BadRequestException('İlan süresi dolduğu için (EXPIRED) doğrudan aktifleştirilemez.');
    }

    if (l.seller?.isActive === false) {
      throw new BadRequestException('Kullanıcı hesabı pasif durumdadır.');
    }

    const updated = await this.prisma.vehicleListing.update({
      where: { id: listingId },
      data: {
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
    });

    try {
      await (this.prisma as any).listingModerationAction.create({
        data: {
          listingId,
          sellerId: l.sellerId,
          actorAdminId: adminUser?.id || 'admin',
          actionType: 'REACTIVATE_BY_ADMIN',
          previousStatus: 'PASSIVE',
          newStatus: 'ACTIVE',
          reasonCode: reasonCode || 'ADMIN_REACTIVATION',
          sellerMessage: sellerMessage || 'İlanınız yönetici tarafından yeniden aktifleştirilmiştir.',
          internalNote: internalNote || 'Admin manuel aktifleştirme.',
          emailStatus: 'SENT',
          notificationStatus: 'SENT',
        },
      });
    } catch (e) {
      // fallback
    }

    return updated;
  }

  async reopenListing(listingId: string, adminUser: any) {
    const l = await this.prisma.vehicleListing.findUnique({ where: { id: listingId } });
    if (!l) throw new NotFoundException('İlan bulunamadı.');

    return this.prisma.vehicleListing.update({
      where: { id: listingId },
      data: { status: 'PENDING_REVIEW' },
    });
  }

  async moderateMedia(mediaId: string, status: 'APPROVED' | 'REJECTED') {
    return this.prisma.listingMedia.update({
      where: { id: mediaId },
      data: { moderationStatus: status },
    });
  }

  async bulkAction(customerNo: string, body: any, adminUser: any) {
    const { listingIds, action, reasonCode, sellerMessage, internalNote } = body;
    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      throw new BadRequestException('En az bir ilan seçilmelidir.');
    }

    let succeeded = 0;
    let failed = 0;
    const failures: any[] = [];

    for (const listingId of listingIds) {
      try {
        if (action === 'APPROVE') await this.approveListing(listingId, adminUser);
        else if (action === 'REVISION_REQUIRED') await this.requestRevision(listingId, { reasonCode, sellerMessage, internalNote }, adminUser);
        else if (action === 'DETAILED_REVIEW') await this.sendToDetailedReview(listingId, { internalNote }, adminUser);
        else if (action === 'REJECT') await this.rejectListing(listingId, { reasonCode, sellerMessage, internalNote }, adminUser);
        succeeded++;
      } catch (err: any) {
        failed++;
        failures.push({ listingId, reason: err.message });
      }
    }

    return {
      requested: listingIds.length,
      succeeded,
      failed,
      failures,
    };
  }

  async acquireLock(listingId: string, adminUser: any) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    try {
      return await (this.prisma as any).listingModerationLock.upsert({
        where: { listingId },
        update: { adminId: adminUser?.id || 'admin', adminName: adminUser?.email || 'Admin', expiresAt, lockedAt: new Date() },
        create: { listingId, adminId: adminUser?.id || 'admin', adminName: adminUser?.email || 'Admin', expiresAt },
      });
    } catch (e) {
      return { listingId, adminId: adminUser?.id || 'admin', adminName: 'Admin', expiresAt };
    }
  }

  async releaseLock(listingId: string) {
    try {
      await (this.prisma as any).listingModerationLock.delete({ where: { listingId } });
    } catch (e) {
      // ignore
    }
    return { success: true };
  }

  async getStatusCounts() {
    const now = new Date();
    const countByStatus = async (st: string) => {
      try {
        if (st === 'ACTIVE') {
          return await this.prisma.vehicleListing.count({
            where: {
              status: 'ACTIVE',
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          });
        }
        if (st === 'EXPIRED') {
          return await this.prisma.vehicleListing.count({
            where: {
              OR: [
                { status: 'EXPIRED' },
                { status: 'ACTIVE', expiresAt: { lte: now } },
              ],
            },
          });
        }
        return await this.prisma.vehicleListing.count({ where: { status: st as any } });
      } catch (e) {
        return 0;
      }
    };

    const counts = await Promise.all([
      countByStatus('PENDING_REVIEW'),
      countByStatus('REVISION_REQUIRED'),
      countByStatus('DETAILED_REVIEW'),
      countByStatus('ACTIVE'),
      countByStatus('REJECTED'),
      countByStatus('PASSIVE'),
      countByStatus('EXPIRED'),
      countByStatus('REPORTED'),
    ]);

    return {
      PENDING: counts[0],
      PENDING_REVIEW: counts[0],
      REVISION_REQUIRED: counts[1],
      DETAILED_REVIEW: counts[2],
      ACTIVE: counts[3],
      REJECTED: counts[4],
      PASSIVE: counts[5],
      EXPIRED: counts[6],
      REPORTED: counts[7],
    };
  }

  async getModerationItems(query: {
    status?: string;
    search?: string;
    sellerType?: string;
    riskLevel?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const rawStatus = query.status || 'PENDING_REVIEW';
    const status = rawStatus === 'PENDING' ? 'PENDING_REVIEW' : rawStatus;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const now = new Date();

    let where: any = {};
    if (status === 'ACTIVE') {
      where = {
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      };
    } else if (status === 'EXPIRED') {
      where = {
        OR: [
          { status: 'EXPIRED' },
          { status: 'ACTIVE', expiresAt: { lte: now } },
        ],
      };
    } else {
      where = { status: status as any };
    }

    if (query.sellerType && query.sellerType !== 'ALL') {
      where.sellerType = query.sellerType;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { id: { contains: s, mode: 'insensitive' } },
        { title: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { district: { contains: s, mode: 'insensitive' } },
        { seller: { email: { contains: s, mode: 'insensitive' } } },
        { seller: { firstName: { contains: s, mode: 'insensitive' } } },
        { seller: { lastName: { contains: s, mode: 'insensitive' } } },
        { seller: { customerNo: { contains: s, mode: 'insensitive' } } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sort === 'OLDEST') {
      orderBy = { createdAt: 'asc' };
    }

    const [total, items] = await Promise.all([
      this.prisma.vehicleListing.count({ where }),
      this.prisma.vehicleListing.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              customerNo: true,
            },
          },
          vehicleVariant: {
            select: {
              id: true,
              trim: { select: { name: true } },
              model: { select: { name: true, brand: { select: { name: true } } } },
            },
          },
          media: {
            select: { id: true, url: true, sortOrder: true },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
