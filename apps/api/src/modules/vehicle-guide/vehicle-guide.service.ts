import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const sharp = require('sharp');
import { Locale, GuideStatus, GuideFactType, GuideSourceType, GuideEventType, DataConfidence } from '@prisma/client';
import { 
  CreateGuideCardDto, UpdateGuideCardDto,
  CreateGuideFactDto, UpdateGuideFactDto,
  CreateTechnicalInfoDto, UpdateTechnicalInfoDto,
  CardTranslationDto, FactTranslationDto, TechnicalInfoTranslationDto,
  LogGuideEventDto
} from './vehicle-guide.dto';

@Injectable()
export class VehicleGuideService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // PUBLIC USER ACTIONS
  // ==========================================

  async getRandomCard(userId?: string, sessionId?: string, locale: Locale = Locale.tr) {
    // 1. Fetch all candidate cards (APPROVED & isActive)
    const cards = await this.prisma.vehicleGuideCard.findMany({
      where: {
        status: GuideStatus.APPROVED,
        isActive: true,
      },
      include: {
        translations: {
          where: { locale },
        },
        facts: {
          where: {
            status: GuideStatus.APPROVED,
            isActive: true,
            confidenceLevel: {
              in: [DataConfidence.HIGH, DataConfidence.MEDIUM],
            },
          },
          include: {
            translations: {
              where: { locale },
            },
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
        technicalInfos: {
          where: {
            status: GuideStatus.APPROVED,
            isActive: true,
          },
          include: {
            translations: {
              where: { locale },
            },
          },
        },
      },
    });

    if (cards.length === 0) {
      throw new NotFoundException('Yayında aktif araç rehberi kartı bulunamadı.');
    }

    // 2. Filter candidates based on validation rules:
    // - Must have at least 4 approved facts
    // - Must contain at least 1 INTERESTING_FACT, 1 BUYING_TIP, 1 USER_EXPERIENCE
    const validCards = cards.filter((card) => {
      if (card.facts.length < 4) return false;
      const factTypes = card.facts.map((f) => f.factType);
      const hasInteresting = factTypes.includes(GuideFactType.INTERESTING_FACT);
      const hasBuyingTip = factTypes.includes(GuideFactType.BUYING_TIP);
      const hasExperience = factTypes.includes(GuideFactType.USER_EXPERIENCE);
      return hasInteresting && hasBuyingTip && hasExperience;
    });

    if (validCards.length === 0) {
      throw new NotFoundException('Kalite standartlarını karşılayan (min 4 fact, gerekli kategoriler) aktif kart bulunamadı.');
    }

    // 3. Exclude cards viewed in the last 7 days (if possible)
    let historyCardIds: string[] = [];
    if (userId || sessionId) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const history = await this.prisma.userGuideCardViewHistory.findMany({
        where: {
          OR: [
            userId ? { userId } : {},
            sessionId ? { OR: [{ userId: null }, {}] } : {}, // handle session
          ],
          viewedAt: { gte: sevenDaysAgo },
        },
        select: { vehicleGuideCardId: true },
      });
      historyCardIds = history.map((h) => h.vehicleGuideCardId);
    }

    // Filter out recently viewed ones
    let pool = validCards.filter((c) => !historyCardIds.includes(c.id));

    // Fallback: If pool is empty, use all valid cards (reset loop)
    if (pool.length === 0) {
      pool = validCards;
    }

    // Select a random card from pool
    const selectedCard = pool[Math.floor(Math.random() * pool.length)];

    // Format output with proper locale fallback
    return this.formatCard(selectedCard, locale);
  }

  async getCardDetail(id: string, locale: Locale = Locale.tr) {
    const card = await this.prisma.vehicleGuideCard.findFirst({
      where: {
        id,
        status: GuideStatus.APPROVED,
        isActive: true,
      },
      include: {
        translations: {
          where: { locale },
        },
        facts: {
          where: {
            status: GuideStatus.APPROVED,
            isActive: true,
            confidenceLevel: {
              in: [DataConfidence.HIGH, DataConfidence.MEDIUM],
            },
          },
          include: {
            translations: {
              where: { locale },
            },
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
        technicalInfos: {
          where: {
            status: GuideStatus.APPROVED,
            isActive: true,
          },
          include: {
            translations: {
              where: { locale },
            },
          },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Araç rehberi kartı bulunamadı.');
    }

    return this.formatCard(card, locale);
  }

  async getTechnicalInfo(cardId: string, locale: Locale = Locale.tr) {
    const techInfo = await this.prisma.vehicleGuideTechnicalInfo.findFirst({
      where: {
        vehicleGuideCardId: cardId,
        status: GuideStatus.APPROVED,
        isActive: true,
      },
      include: {
        translations: {
          where: { locale },
        },
      },
    });

    if (!techInfo) {
      throw new NotFoundException('Bu araca ait onaylanmış teknik bilgi bulunamadı.');
    }

    // Localized notes fallback
    const translation = techInfo.translations[0];
    return {
      id: techInfo.id,
      engineOptions: techInfo.engineOptions,
      fuelTypes: techInfo.fuelTypes,
      transmissionOptions: techInfo.transmissionOptions,
      bodyTypes: techInfo.bodyTypes,
      productionYears: techInfo.productionYears,
      averageConsumption: techInfo.averageConsumption,
      powerRange: techInfo.powerRange,
      torqueRange: techInfo.torqueRange,
      drivetrain: techInfo.drivetrain,
      segment: techInfo.segment,
      trunkVolume: techInfo.trunkVolume,
      safetyInfo: techInfo.safetyInfo,
      localizedNotes: translation ? translation.localizedNotes : '',
    };
  }

  async logEvent(cardId: string, userId: string | null, dto: LogGuideEventDto) {
    const card = await this.prisma.vehicleGuideCard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException('Kart bulunamadı.');
    }

    // Write to GuideAnalyticsEvent
    await this.prisma.guideAnalyticsEvent.create({
      data: {
        userId,
        sessionId: dto.sessionId,
        vehicleGuideCardId: cardId,
        eventType: dto.eventType,
        brand: card.brand,
        model: card.model,
        generationCode: card.generationCode,
        durationMs: dto.durationMs,
        deviceType: dto.deviceType,
        locale: dto.locale || 'tr',
      },
    });

    // Write/Update View History
    if (dto.eventType === GuideEventType.GUIDE_CARD_VIEW) {
      await this.prisma.userGuideCardViewHistory.create({
        data: {
          userId,
          vehicleGuideCardId: cardId,
          durationMs: dto.durationMs,
          openedTechnicalInfo: false,
          clickedListings: false,
        },
      });
    } else if (dto.eventType === GuideEventType.GUIDE_TECHNICAL_INFO_OPENED) {
      // Find latest view history entry within last 1 hour and flag it
      const latestHistory = await this.prisma.userGuideCardViewHistory.findFirst({
        where: {
          userId,
          vehicleGuideCardId: cardId,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (latestHistory) {
        await this.prisma.userGuideCardViewHistory.update({
          where: { id: latestHistory.id },
          data: { openedTechnicalInfo: true },
        });
      }
    } else if (dto.eventType === GuideEventType.GUIDE_LISTING_CTA_CLICKED) {
      const latestHistory = await this.prisma.userGuideCardViewHistory.findFirst({
        where: {
          userId,
          vehicleGuideCardId: cardId,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (latestHistory) {
        await this.prisma.userGuideCardViewHistory.update({
          where: { id: latestHistory.id },
          data: { clickedListings: true },
        });
      }
    }

    return { success: true };
  }

  async getRelatedListings(cardId: string) {
    const card = await this.prisma.vehicleGuideCard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException('Kart bulunamadı.');
    }

    // 1. Attempt Brand + Model + generation matching
    if (card.generationCode || card.generationName) {
      const listings = await this.prisma.vehicleListing.findMany({
        where: {
          vehicleVariant: {
            brand: { name: { equals: card.brand, mode: 'insensitive' } },
            model: { name: { equals: card.model, mode: 'insensitive' } },
            generation: {
              OR: [
                card.generationName ? { name: { equals: card.generationName, mode: 'insensitive' } } : {},
                card.generationCode ? { name: { equals: card.generationCode, mode: 'insensitive' } } : {},
              ]
            }
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      if (listings.length > 0) return listings;
    }

    // 2. Primary fallback query: brand + model + yearStart-yearEnd (inclusive) + bodyType
    const yearFiltered = await this.prisma.vehicleListing.findMany({
      where: {
        OR: [
          {
            vehicleVariant: {
              brand: { name: { equals: card.brand, mode: 'insensitive' } },
              model: { name: { equals: card.model, mode: 'insensitive' } },
            },
            modelYear: {
              gte: card.yearStart,
              lte: card.yearEnd || new Date().getFullYear(),
            },
          },
          {
            customBrand: { equals: card.brand, mode: 'insensitive' },
            customModel: { equals: card.model, mode: 'insensitive' },
            customYear: {
              gte: card.yearStart,
              lte: card.yearEnd || new Date().getFullYear(),
            },
          }
        ],
        bodyType: card.bodyType ? (card.bodyType as any) : undefined,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    if (yearFiltered.length > 0) return yearFiltered;

    // 3. Fallback: all listings for that brand + model
    const modelFiltered = await this.prisma.vehicleListing.findMany({
      where: {
        OR: [
          {
            vehicleVariant: {
              brand: { name: { equals: card.brand, mode: 'insensitive' } },
              model: { name: { equals: card.model, mode: 'insensitive' } },
            }
          },
          {
            customBrand: { equals: card.brand, mode: 'insensitive' },
            customModel: { equals: card.model, mode: 'insensitive' },
          }
        ]
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    if (modelFiltered.length > 0) return modelFiltered;

    // 4. Fallback: Similar segment vehicles / same bodyType
    const segmentFiltered = await this.prisma.vehicleListing.findMany({
      where: {
        bodyType: card.bodyType ? (card.bodyType as any) : undefined,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return segmentFiltered;
  }

  async uploadGuideCardImage(cardId: string, file: any) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Lütfen yüklenecek geçerli bir görsel seçin.');
    }

    const card = await this.prisma.vehicleGuideCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      throw new NotFoundException('Kart bulunamadı.');
    }

    // 1. Validate image dimensions using sharp
    let metadata;
    try {
      metadata = await sharp(file.buffer).metadata();
    } catch (err: any) {
      throw new BadRequestException(`Görsel dosyası okunamadı veya geçersiz bir formatta: ${err.message}`);
    }

    const minWidth = 900;
    const minHeight = 500;
    if (!metadata.width || !metadata.height || metadata.width < minWidth || metadata.height < minHeight) {
      throw new BadRequestException(
        `Yüklenen görsel boyutu yetersiz (${metadata.width || 0}x${metadata.height || 0}px). En az ${minWidth}x${minHeight}px çözünürlükte olmalıdır.`
      );
    }

    // 2. Setup R2/S3 client
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

    const s3Client = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      region: 'auto',
    });

    try {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // 3. Optimize and resize image for Desktop Hero (1280x720 WebP)
      const desktopBuffer = await sharp(file.buffer)
        .resize(1280, 720, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toBuffer();

      const desktopKey = `guide-cards/desktop/${uniqueId}.webp`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: desktopKey,
          Body: desktopBuffer,
          ContentType: 'image/webp',
        })
      );

      // 4. Optimize and resize image for Mobile Hero (1080x720 WebP)
      const mobileBuffer = await sharp(file.buffer)
        .resize(1080, 720, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toBuffer();

      const mobileKey = `guide-cards/mobile/${uniqueId}.webp`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: mobileKey,
          Body: mobileBuffer,
          ContentType: 'image/webp',
        })
      );

      const desktopUrl = `${publicUrl}/${desktopKey}`;

      await this.prisma.vehicleGuideCard.update({
        where: { id: cardId },
        data: {
          heroImageUrl: desktopUrl,
          placeholderImageUrl: null
        }
      });

      return {
        success: true,
        heroImageUrl: desktopUrl,
        mobileHeroImageUrl: `${publicUrl}/${mobileKey}`
      };
    } catch (err: any) {
      throw new BadRequestException(`Görsel R2'ye yüklenirken hata oluştu: ${err.message}`);
    }
  }

  // ==========================================
  // ADMIN PANEL ACTIONS
  // ==========================================

  async adminCreateCard(dto: CreateGuideCardDto) {
    return this.prisma.vehicleGuideCard.create({
      data: {
        brand: dto.brand,
        model: dto.model,
        generationName: dto.generationName,
        generationCode: dto.generationCode,
        bodyType: dto.bodyType,
        yearStart: dto.yearStart,
        yearEnd: dto.yearEnd,
        heroImageUrl: dto.heroImageUrl,
        imageAltText: dto.imageAltText,
        imageSource: dto.imageSource,
        imageLicense: dto.imageLicense,
        placeholderImageUrl: dto.placeholderImageUrl,
        shortSummary: dto.shortSummary,
        imageObjectPosition: dto.imageObjectPosition,
        imageFitMode: dto.imageFitMode,
        licenseLabelPosition: dto.licenseLabelPosition,
        status: GuideStatus.DRAFT, // Default to DRAFT
        isActive: true,
      },
    });
  }

  async adminUpdateCard(id: string, dto: UpdateGuideCardDto) {
    const card = await this.prisma.vehicleGuideCard.findUnique({
      where: { id },
      include: { facts: true },
    });

    if (!card) {
      throw new NotFoundException('Kart bulunamadı.');
    }

    // Strict validation when transitioning status to APPROVED
    if (dto.status === GuideStatus.APPROVED) {
      // Must have at least 4 facts
      if (card.facts.length < 4) {
        throw new BadRequestException('Bu kart APPROVED yapılamaz: En az 4 adet fact (bilgi) eklenmiş olmalıdır.');
      }

      // Check required fact types
      const approvedFacts = card.facts.filter((f) => f.status === GuideStatus.APPROVED);
      const factTypes = approvedFacts.map((f) => f.factType);
      const hasInteresting = factTypes.includes(GuideFactType.INTERESTING_FACT);
      const hasBuyingTip = factTypes.includes(GuideFactType.BUYING_TIP);
      const hasExperience = factTypes.includes(GuideFactType.USER_EXPERIENCE);

      if (!hasInteresting || !hasBuyingTip || !hasExperience) {
        throw new BadRequestException(
          'Bu kart APPROVED yapılamaz: En az birer adet INTERESTING_FACT, BUYING_TIP ve USER_EXPERIENCE tipinde onaylı fact bulunmalıdır.'
        );
      }

      // Image license compliance check
      if (!card.heroImageUrl && !card.placeholderImageUrl) {
        throw new BadRequestException('Bu kart APPROVED yapılamaz: En az bir görsel url bulunmalıdır.');
      }

      if (card.heroImageUrl && (!card.imageAltText || !card.imageSource || !card.imageLicense)) {
        throw new BadRequestException(
          'Bu kart APPROVED yapılamaz: heroImageUrl var ise imageAltText, imageSource ve imageLicense girilmiş olmalıdır.'
        );
      }
    }

    return this.prisma.vehicleGuideCard.update({
      where: { id },
      data: dto,
    });
  }

  async adminGetCards() {
    return this.prisma.vehicleGuideCard.findMany({
      include: {
        translations: true,
        facts: true,
        technicalInfos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminAddFact(cardId: string, dto: CreateGuideFactDto) {
    return this.prisma.vehicleGuideFact.create({
      data: {
        vehicleGuideCardId: cardId,
        factType: dto.factType,
        title: dto.title,
        description: dto.description,
        iconKey: dto.iconKey,
        displayOrder: dto.displayOrder || 0,
        confidenceLevel: dto.confidenceLevel || DataConfidence.HIGH,
        sourceTitle: dto.sourceTitle,
        sourceUrl: dto.sourceUrl,
        sourceType: dto.sourceType || GuideSourceType.INTERNAL_RESEARCH,
        sourceNote: dto.sourceNote,
        status: GuideStatus.DRAFT,
        isActive: true,
      },
    });
  }

  async adminUpdateFact(id: string, dto: UpdateGuideFactDto) {
    const fact = await this.prisma.vehicleGuideFact.findUnique({
      where: { id },
    });

    if (!fact) {
      throw new NotFoundException('Fact bulunamadı.');
    }

    // Strict validation when transitioning status to APPROVED
    if (dto.status === GuideStatus.APPROVED) {
      // Enforce source rules
      const finalSourceTitle = dto.sourceTitle !== undefined ? dto.sourceTitle : fact.sourceTitle;
      const finalSourceNote = dto.sourceNote !== undefined ? dto.sourceNote : fact.sourceNote;
      const finalSourceUrl = dto.sourceUrl !== undefined ? dto.sourceUrl : fact.sourceUrl;
      const finalConfidence = dto.confidenceLevel !== undefined ? dto.confidenceLevel : fact.confidenceLevel;

      if (!finalSourceTitle && !finalSourceNote) {
        throw new BadRequestException('Bu fact APPROVED yapılamaz: sourceTitle veya sourceNote alanı zorunludur.');
      }

      if (finalConfidence === DataConfidence.HIGH && !finalSourceUrl && !finalSourceNote) {
        throw new BadRequestException(
          'Bu fact APPROVED yapılamaz: HIGH confidence için sourceUrl veya güçlü kaynak notu zorunludur.'
        );
      }

      // Automatically set verifiedAt
      return this.prisma.vehicleGuideFact.update({
        where: { id },
        data: {
          ...dto,
          verifiedAt: new Date(),
        },
      });
    }

    return this.prisma.vehicleGuideFact.update({
      where: { id },
      data: dto,
    });
  }

  async adminSaveCardTranslation(cardId: string, dto: CardTranslationDto) {
    return this.prisma.vehicleGuideCardTranslation.upsert({
      where: {
        vehicleGuideCardId_locale: {
          vehicleGuideCardId: cardId,
          locale: dto.locale,
        },
      },
      update: {
        shortSummary: dto.shortSummary,
      },
      create: {
        vehicleGuideCardId: cardId,
        locale: dto.locale,
        shortSummary: dto.shortSummary,
      },
    });
  }

  async adminSaveFactTranslation(factId: string, dto: FactTranslationDto) {
    return this.prisma.vehicleGuideFactTranslation.upsert({
      where: {
        vehicleGuideFactId_locale: {
          vehicleGuideFactId: factId,
          locale: dto.locale,
        },
      },
      update: {
        title: dto.title,
        description: dto.description,
      },
      create: {
        vehicleGuideFactId: factId,
        locale: dto.locale,
        title: dto.title,
        description: dto.description,
      },
    });
  }

  async adminSaveTechnicalInfo(cardId: string, dto: CreateTechnicalInfoDto) {
    const existing = await this.prisma.vehicleGuideTechnicalInfo.findFirst({
      where: { vehicleGuideCardId: cardId },
    });

    if (existing) {
      return this.prisma.vehicleGuideTechnicalInfo.update({
        where: { id: existing.id },
        data: {
          engineOptions: dto.engineOptions || undefined,
          fuelTypes: dto.fuelTypes || undefined,
          transmissionOptions: dto.transmissionOptions || undefined,
          bodyTypes: dto.bodyTypes || undefined,
          productionYears: dto.productionYears,
          averageConsumption: dto.averageConsumption,
          powerRange: dto.powerRange,
          torqueRange: dto.torqueRange,
          drivetrain: dto.drivetrain,
          segment: dto.segment,
          trunkVolume: dto.trunkVolume,
          safetyInfo: dto.safetyInfo,
          sourceTitle: dto.sourceTitle,
          sourceUrl: dto.sourceUrl,
          sourceType: dto.sourceType,
          status: GuideStatus.APPROVED, // auto approve specs
          isActive: true,
        },
      });
    }

    return this.prisma.vehicleGuideTechnicalInfo.create({
      data: {
        vehicleGuideCardId: cardId,
        engineOptions: dto.engineOptions || [],
        fuelTypes: dto.fuelTypes || [],
        transmissionOptions: dto.transmissionOptions || [],
        bodyTypes: dto.bodyTypes || [],
        productionYears: dto.productionYears,
        averageConsumption: dto.averageConsumption,
        powerRange: dto.powerRange,
        torqueRange: dto.torqueRange,
        drivetrain: dto.drivetrain,
        segment: dto.segment,
        trunkVolume: dto.trunkVolume,
        safetyInfo: dto.safetyInfo,
        sourceTitle: dto.sourceTitle,
        sourceUrl: dto.sourceUrl,
        sourceType: dto.sourceType || GuideSourceType.INTERNAL_RESEARCH,
        status: GuideStatus.APPROVED,
        isActive: true,
      },
    });
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private formatCard(card: any, locale: Locale) {
    const translation = card.translations[0];
    const shortSummary = translation ? translation.shortSummary : card.shortSummary;

    const formattedFacts = card.facts.map((fact: any) => {
      const factTrans = fact.translations[0];
      return {
        id: fact.id,
        factType: fact.factType,
        title: factTrans ? factTrans.title : fact.title,
        description: factTrans ? factTrans.description : fact.description,
        iconKey: fact.iconKey,
        displayOrder: fact.displayOrder,
      };
    });

    return {
      id: card.id,
      brand: card.brand,
      model: card.model,
      generationName: card.generationName,
      generationCode: card.generationCode,
      bodyType: card.bodyType,
      yearStart: card.yearStart,
      yearEnd: card.yearEnd,
      heroImageUrl: card.heroImageUrl,
      imageAltText: card.imageAltText,
      imageSource: card.imageSource,
      imageLicense: card.imageLicense,
      placeholderImageUrl: card.placeholderImageUrl,
      ratingScore: card.ratingScore,
      ratingCount: card.ratingCount,
      shortSummary,
      facts: formattedFacts,
    };
  }
}
