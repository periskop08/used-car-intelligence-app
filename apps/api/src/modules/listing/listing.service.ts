import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateListingDto, UpdateListingDto, CreateLeadDto } from './listing.dto';
import { ListingStatus, MediaModerationStatus, ListingPackageType, SubscriptionTier } from '@prisma/client';
import OpenAI from 'openai';

@Injectable()
export class ListingService {
  constructor(private prisma: PrismaService) {}

  getQuotaForTier(tier: SubscriptionTier): number {
    switch (tier) {
      case SubscriptionTier.FREE:
        const rawQuota = process.env.FREE_LISTING_QUOTA;
        return rawQuota ? parseInt(rawQuota, 10) : 1;
      case SubscriptionTier.STANDARD:
        return 10;
      case SubscriptionTier.PRO:
      case SubscriptionTier.PREMIUM:
        return 50;
      default:
        return 1;
    }
  }

  getDurationDaysForPackage(pkg: ListingPackageType): number {
    switch (pkg) {
      case ListingPackageType.FREE:
      case ListingPackageType.STANDARD:
        return 30;
      case ListingPackageType.PREMIUM:
        return 45;
      default:
        return 30;
    }
  }

  // Quota validation checker
  async checkQuota(sellerId: string, additionCount = 1) {
    const seller = await this.prisma.user.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found.');

    const limit = this.getQuotaForTier(seller.subscriptionTier);
    const activeCount = await this.prisma.vehicleListing.count({
      where: {
        sellerId,
        status: { in: [ListingStatus.ACTIVE, ListingStatus.PENDING_REVIEW] },
      },
    });

    if (activeCount + additionCount > limit) {
      throw new BadRequestException(
        'İlan yayınlama kotanızı doldurdunuz. Daha fazla ilan yayınlamak için paketinizi yükseltebilirsiniz.',
      );
    }
  }

  // Common ACTIVE status validation
  async validateListingCanBecomeActive(listingId: string): Promise<boolean> {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: {
        seller: true,
        media: true,
      },
    });

    if (!listing) throw new NotFoundException('Listing not found.');

    // 1. Owner Check
    if (!listing.seller) {
      throw new BadRequestException('İlan sahibi aktif ve geçerli bir kullanıcı olmalı.');
    }

    // 2. Quota check
    const limit = this.getQuotaForTier(listing.seller.subscriptionTier);
    const activeCount = await this.prisma.vehicleListing.count({
      where: {
        sellerId: listing.sellerId,
        id: { not: listingId },
        status: { in: [ListingStatus.ACTIVE, ListingStatus.PENDING_REVIEW] },
      },
    });
    if (activeCount >= limit) {
      throw new BadRequestException(
        'İlan yayınlama kotanızı doldurdunuz. Daha fazla ilan yayınlamak için paketinizi yükseltebilirsiniz.',
      );
    }

    // 3. Variant Check
    if (!listing.vehicleVariantId) {
      throw new BadRequestException('İlanda geçerli vehicleVariantId olmalı.');
    }
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: listing.vehicleVariantId },
    });
    if (!variant || variant.status !== 'APPROVED') {
      throw new BadRequestException('Bağlı vehicleVariant status değeri APPROVED olmalı.');
    }

    // 4. Approved Media Check
    const approvedMedia = listing.media.filter(
      (m) => m.moderationStatus === MediaModerationStatus.APPROVED,
    );
    if (approvedMedia.length === 0) {
      throw new BadRequestException('İlanda minimum 1 adet APPROVED media kaydı bulunmalı.');
    }

    // 5. Required fields
    if (!listing.modelYear || !listing.kilometers) {
      throw new BadRequestException('modelYear ve kilometers alanları dolu olmalı.');
    }
    if (!listing.priceAmount || !listing.city || !listing.countryCode) {
      throw new BadRequestException('priceAmount, city, countryCode gibi zorunlu ilan alanları dolu olmalı.');
    }

    // Stamp duration fields
    const pkgType =
      listing.seller.subscriptionTier === SubscriptionTier.PREMIUM
        ? ListingPackageType.PREMIUM
        : listing.seller.subscriptionTier === SubscriptionTier.STANDARD
        ? ListingPackageType.STANDARD
        : ListingPackageType.FREE;

    const durationDays = this.getDurationDaysForPackage(pkgType);
    const now = new Date();
    const publishedAt = listing.publishedAt || now;
    const expiresAt = listing.expiresAt || new Date(publishedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await this.prisma.vehicleListing.update({
      where: { id: listingId },
      data: {
        publishedAt,
        expiresAt,
        packageAtPublish: pkgType,
        listingDurationDays: durationDays,
        passiveUntil: null,
      },
    });

    return true;
  }

  // Re-order media sequentially
  async reorderMedia(listingId: string) {
    const mediaList = await this.prisma.listingMedia.findMany({
      where: { listingId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    for (let i = 0; i < mediaList.length; i++) {
      await this.prisma.listingMedia.update({
        where: { id: mediaList[i].id },
        data: { sortOrder: i },
      });
    }

    // Gating check: if listing is ACTIVE but approved image count is now 0, automatically downgrade to PENDING_REVIEW
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: { media: true },
    });

    if (listing && listing.status === ListingStatus.ACTIVE) {
      const approvedCount = listing.media.filter(
        (m) => m.moderationStatus === MediaModerationStatus.APPROVED,
      ).length;

      if (approvedCount === 0) {
        await this.prisma.vehicleListing.update({
          where: { id: listingId },
          data: { status: ListingStatus.PENDING_REVIEW },
        });
      }
    }
  }

  // Create Listing DRAFT
  async createListing(userId: string, dto: CreateListingDto) {
    // If creating directly with ACTIVE/PENDING_REVIEW status, check quota first
    await this.checkQuota(userId);

    const isAiReady = false; // Will set to true if connected to approved variant

    return this.prisma.vehicleListing.create({
      data: {
        sellerId: userId,
        vehicleVariantId: dto.vehicleVariantId || null,
        title: dto.title,
        description: dto.description,
        priceAmount: dto.priceAmount,
        currency: dto.currency || 'TRY',
        countryCode: dto.countryCode || 'TR',
        region: dto.region,
        city: dto.city,
        district: dto.district,
        modelYear: dto.modelYear,
        kilometers: dto.kilometers,
        fuelType: dto.fuelType,
        transmission: dto.transmission,
        bodyType: dto.bodyType,
        color: dto.color,
        damageRecord: dto.damageRecord,
        tramerAmount: dto.tramerAmount || 0,
        paintedParts: dto.paintedParts || [],
        changedParts: dto.changedParts || [],
        maintenanceHistory: dto.maintenanceHistory,
        expertiseReportUrl: dto.expertiseReportUrl,
        plateHidden: dto.plateHidden ?? true,
        vinHidden: dto.vinHidden ?? true,
        status: ListingStatus.DRAFT,
        isAiReady,
      },
    });
  }

  async updateListing(id: string, userId: string, dto: UpdateListingDto) {
    const listing = await this.prisma.vehicleListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (listing.sellerId !== userId) throw new ForbiddenException('Not authorized.');

    return this.prisma.vehicleListing.update({
      where: { id },
      data: {
        ...dto,
      } as any,
    });
  }

  // Seller status change endpoint handler
  async updateListingStatus(id: string, userId: string, status: ListingStatus) {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (listing.sellerId !== userId) throw new ForbiddenException('Not authorized.');

    if (status === ListingStatus.PENDING_REVIEW) {
      if (listing.media.length === 0) {
        throw new BadRequestException('PENDING_REVIEW durumuna geçmek için en az 1 görsel eklemelisiniz.');
      }
      if (!listing.vehicleVariantId) {
        throw new BadRequestException('İlanı incelemeye göndermek için araç varyantı seçimi zorunludur.');
      }
    }

    if (status === ListingStatus.ACTIVE) {
      // Validate everything using shared logic
      await this.validateListingCanBecomeActive(id);
    }

    return this.prisma.vehicleListing.update({
      where: { id },
      data: { status },
    });
  }

  // Add media and enforce rules
  async addMedia(id: string, userId: string, fileData: { url: string; size: number; mime: string }) {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (listing.sellerId !== userId) throw new ForbiddenException('Not authorized.');

    if (listing.media.length >= 10) {
      throw new BadRequestException('Bu ilan için en fazla 10 fotoğraf yükleyebilirsiniz.');
    }

    if (fileData.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Her fotoğraf maksimum 5MB olmalı.');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(fileData.mime)) {
      throw new BadRequestException('Desteklenen formatlar JPEG, PNG ve WebP olsun.');
    }

    // sortOrder logic
    const sortOrder = listing.media.length; // sequential 0-indexed

    const media = await this.prisma.listingMedia.create({
      data: {
        listingId: id,
        url: fileData.url,
        thumbnailUrl: fileData.url, // thumbnail version
        mediumUrl: fileData.url, // medium version
        storageKey: `listings/${id}/${Date.now()}-${Math.random().toString(36).substring(7)}`,
        fileSize: fileData.size,
        mimeType: fileData.mime,
        sortOrder,
        moderationStatus: MediaModerationStatus.PENDING,
      },
    });

    return media;
  }

  // Delete media
  async deleteMedia(id: string, mediaId: string, userId: string) {
    const listing = await this.prisma.vehicleListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (listing.sellerId !== userId) throw new ForbiddenException('Not authorized.');

    const media = await this.prisma.listingMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.listingId !== id) throw new NotFoundException('Media not found.');

    await this.prisma.listingMedia.delete({ where: { id: mediaId } });

    // Trigger reorder
    await this.reorderMedia(id);
    return { success: true };
  }

  // Lead submissions
  async createLead(id: string, dto: CreateLeadDto, ipAddress: string) {
    const listing = await this.prisma.vehicleListing.findUnique({ where: { id } });
    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      throw new NotFoundException('Active listing not found.');
    }

    if (!dto.communicationGranted) {
      throw new BadRequestException('KVKK/GDPR iletişim izni checkbox onayı zorunludur.');
    }

    // Rate-limiting check
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentLeadsCount = await this.prisma.listingLead.count({
      where: {
        listingId: id,
        ipAddress,
        createdAt: { gte: tenMinsAgo },
      },
    });

    if (recentLeadsCount >= 3) {
      throw new BadRequestException('Çok fazla talep gönderdiniz. Lütfen birkaç dakika sonra tekrar deneyin.');
    }

    return this.prisma.listingLead.create({
      data: {
        listingId: id,
        buyerName: dto.buyerName,
        buyerPhone: dto.buyerPhone,
        buyerEmail: dto.buyerEmail,
        message: dto.message,
        ipAddress,
        communicationGranted: dto.communicationGranted,
      },
    });
  }

  // Renew passive listing
  async renewListing(id: string, userId: string) {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id },
      include: { seller: true, media: true },
    });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (listing.sellerId !== userId) throw new ForbiddenException('Not authorized.');

    if (listing.status !== ListingStatus.PASSIVE) {
      throw new BadRequestException('Yalnızca pasif durumdaki ilanlar yenilenebilir.');
    }

    const now = new Date();
    if (listing.passiveUntil && now > listing.passiveUntil) {
      // Transition to EXPIRED
      await this.prisma.vehicleListing.update({
        where: { id },
        data: { status: ListingStatus.EXPIRED },
      });
      throw new BadRequestException('Pasif süresi (15 gün) dolmuş. Lütfen ilanı yeniden yayınlayın.');
    }

    // Validate active quota andAPPROVED media using shared checks
    await this.validateListingCanBecomeActive(id);

    return this.prisma.vehicleListing.update({
      where: { id },
      data: {
        status: ListingStatus.ACTIVE,
        lastRenewedAt: now,
      },
    });
  }

  // AI Description Generator Helper
  async generateAiDescription(userId: string, listingId: string): Promise<{ description: string }> {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: { vehicleVariant: { include: { brand: true, model: true } } },
    });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (listing.sellerId !== userId) throw new ForbiddenException('Not authorized.');

    const isProduction = process.env.NODE_ENV === 'production';
    const apiKey = process.env.OPENAI_API_KEY;

    if (!isProduction && !apiKey) {
      // Mock AI description helper
      return {
        description: `Satılık ${listing.modelYear} ${listing.vehicleVariant?.brand.name || ''} ${listing.vehicleVariant?.model.name || ''}. Araç ${listing.kilometers} km'dedir. ${listing.city} şehrinde görüntülenebilir. Alıcıların test sürüşü yapması tavsiye edilir.`,
      };
    }

    if (!apiKey) {
      throw new Error('OpenAI key missing.');
    }

    const openai = new OpenAI({ apiKey });

    // Gather checked status metadata
    const changedList = Array.isArray(listing.changedParts) ? (listing.changedParts as string[]).join(', ') : '';
    const paintedList = Array.isArray(listing.paintedParts) ? (listing.paintedParts as string[]).join(', ') : '';

    const systemPrompt = `You are a helpful automotive sales copywriter. Your task is to compile a clean, detailed, and marketing-friendly vehicle sales description in Turkish based ONLY on verified parameters provided by the seller.
CRITICAL SAFETY RULES:
- Never hallucinate features, condition statements or claims not explicitly provided.
- Do NOT write "hasarsız" or "kazasız" unless tramerAmount is 0 and there are no changed/painted parts.
- Do NOT write "bakımlı" or "servis bakımlı" unless maintenanceHistory is provided and explicitly details service records.
- Be honest, realistic, and clear.`;

    const userPrompt = `Araç Parametreleri:
- Marka/Model/Yıl: ${listing.vehicleVariant?.brand.name || ''} ${listing.vehicleVariant?.model.name || ''} ${listing.modelYear}
- Kilometre: ${listing.kilometers} km
- Konum: ${listing.city} ${listing.district || ''}
- Tramer Hasar Kaydı: ${listing.tramerAmount || 0} TL
- Değişen Parçalar: ${changedList || 'Belirtilmedi'}
- Boyalı Parçalar: ${paintedList || 'Belirtilmedi'}
- Bakım Bilgileri: ${listing.maintenanceHistory || 'Belirtilmedi'}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
      });

      return {
        description: completion.choices[0].message.content || '',
      };
    } catch (err: any) {
      throw new BadRequestException(`AI description generator failed: ${err.message}`);
    }
  }

  // Automatic Background Cron checks (Active -> Passive -> Expired status checks)
  async cronCheckListingExpirations(): Promise<{ deactivatedCount: number; expiredCount: number }> {
    const now = new Date();

    // 1. ACTIVE -> PASSIVE
    const expiredActiveListings = await this.prisma.vehicleListing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        expiresAt: { lt: now },
      },
    });

    for (const listing of expiredActiveListings) {
      await this.prisma.vehicleListing.update({
        where: { id: listing.id },
        data: {
          status: ListingStatus.PASSIVE,
          passiveUntil: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days passive window
        },
      });
    }

    // 2. PASSIVE -> EXPIRED
    const expiredPassiveListings = await this.prisma.vehicleListing.findMany({
      where: {
        status: ListingStatus.PASSIVE,
        passiveUntil: { lt: now },
      },
    });

    for (const listing of expiredPassiveListings) {
      await this.prisma.vehicleListing.update({
        where: { id: listing.id },
        data: {
          status: ListingStatus.EXPIRED,
        },
      });
    }

    return {
      deactivatedCount: expiredActiveListings.length,
      expiredCount: expiredPassiveListings.length,
    };
  }

  async replyToLead(id: string, leadId: string, userId: string, replyMessage: string) {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id },
    });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (listing.sellerId !== userId) throw new ForbiddenException('Not authorized.');

    const lead = await this.prisma.listingLead.findUnique({
      where: { id: leadId },
    });
    if (!lead || lead.listingId !== id) {
      throw new NotFoundException('Lead not found for this listing.');
    }

    return this.prisma.listingLead.update({
      where: { id: leadId },
      data: {
        replyMessage,
        repliedAt: new Date(),
      },
    });
  }
}
