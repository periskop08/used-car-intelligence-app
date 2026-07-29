import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { BuyerPackageCode } from '@prisma/client';

export interface BuyerPackageConfig {
  code: BuyerPackageCode;
  name: string;
  badge: string;
  purchaseType: 'ONE_TIME';
  price: number;
  currency: 'TRY';
  aiReportLimit: number;
  chatbotMessageLimit: number;
  validityDays: number;
  description: string;
  popularTag?: string;
}

export const BUYER_PACKAGES: Record<BuyerPackageCode, BuyerPackageConfig> = {
  ALICI_MINI: {
    code: BuyerPackageCode.ALICI_MINI,
    name: 'Alıcı Mini',
    badge: 'MİNİ',
    purchaseType: 'ONE_TIME',
    price: 149,
    currency: 'TRY',
    aiReportLimit: 5,
    chatbotMessageLimit: 15,
    validityDays: 30,
    description: 'Birkaç aracı detaylı incelemek ve karar sürecine devam etmek isteyenler için.',
  },
  ALICI_PLUS: {
    code: BuyerPackageCode.ALICI_PLUS,
    name: 'Alıcı Plus',
    badge: 'PLUS',
    popularTag: 'EN ÇOK TERCİH EDİLEN',
    purchaseType: 'ONE_TIME',
    price: 249,
    currency: 'TRY',
    aiReportLimit: 10,
    chatbotMessageLimit: 30,
    validityDays: 30,
    description: 'Daha fazla aracı karşılaştırmak ve satın alma kararını netleştirmek isteyenler için.',
  },
  ALICI_MAX: {
    code: BuyerPackageCode.ALICI_MAX,
    name: 'Alıcı Max',
    badge: 'MAX',
    purchaseType: 'ONE_TIME',
    price: 399,
    currency: 'TRY',
    aiReportLimit: 20,
    chatbotMessageLimit: 60,
    validityDays: 60,
    description: 'Yoğun araç araştırması yapan ve daha geniş kullanım hakkına ihtiyaç duyanlar için.',
  },
};

@Injectable()
export class BuyerPackageService {
  constructor(private prisma: PrismaService) {}

  getAvailablePackages() {
    return Object.values(BUYER_PACKAGES);
  }

  async purchasePackage(userId: string, packageCode: BuyerPackageCode) {
    const config = BUYER_PACKAGES[packageCode];
    if (!config) {
      throw new BadRequestException('Geçersiz alıcı paketi kodu.');
    }

    const expiresAt = new Date(Date.now() + config.validityDays * 24 * 60 * 60 * 1000);

    const purchase = await this.prisma.buyerPackagePurchase.create({
      data: {
        userId,
        packageCode,
        price: config.price,
        aiReportLimit: config.aiReportLimit,
        aiReportUsed: 0,
        chatbotMessageLimit: config.chatbotMessageLimit,
        chatbotMessageUsed: 0,
        validityDays: config.validityDays,
        expiresAt,
      },
    });

    return {
      success: true,
      message: `${config.name} paketiniz hesabınıza tanımlandı. ${config.validityDays} gün boyunca geçerlidir.`,
      purchase,
    };
  }

  async getUserBuyerCredits(userId: string) {
    const activePurchases = await this.prisma.buyerPackagePurchase.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    });

    let totalAiReportsRemaining = 0;
    let totalChatbotMessagesRemaining = 0;

    activePurchases.forEach((p) => {
      const remainingAi = Math.max(0, p.aiReportLimit - p.aiReportUsed);
      const remainingChat = Math.max(0, p.chatbotMessageLimit - p.chatbotMessageUsed);
      totalAiReportsRemaining += remainingAi;
      totalChatbotMessagesRemaining += remainingChat;
    });

    return {
      activePurchases,
      totalAiReportsRemaining,
      totalChatbotMessagesRemaining,
    };
  }

  async consumeAiReportCredit(userId: string): Promise<boolean> {
    const activePurchases = await this.prisma.buyerPackagePurchase.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    });

    for (const purchase of activePurchases) {
      if (purchase.aiReportUsed < purchase.aiReportLimit) {
        await this.prisma.buyerPackagePurchase.update({
          where: { id: purchase.id },
          data: { aiReportUsed: purchase.aiReportUsed + 1 },
        });
        return true;
      }
    }
    return false;
  }

  async consumeChatbotCredit(userId: string): Promise<boolean> {
    const activePurchases = await this.prisma.buyerPackagePurchase.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    });

    for (const purchase of activePurchases) {
      if (purchase.chatbotMessageUsed < purchase.chatbotMessageLimit) {
        await this.prisma.buyerPackagePurchase.update({
          where: { id: purchase.id },
          data: { chatbotMessageUsed: purchase.chatbotMessageUsed + 1 },
        });
        return true;
      }
    }
    return false;
  }
}
