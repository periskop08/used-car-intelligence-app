import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class VehicleService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async getBrands() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getModels(brandId: string) {
    return this.prisma.model.findMany({
      where: { brandId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getVariants(modelId: string) {
    return this.prisma.vehicleVariant.findMany({
      where: { modelId, status: ApprovalStatus.APPROVED },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        country: true,
      },
      orderBy: { year: 'desc' },
    });
  }

  async getVariantDetail(variantId: string, userId?: string) {
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: { id: variantId, status: ApprovalStatus.APPROVED },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        country: true,
        specs: true,
        problems: {
          where: { status: ApprovalStatus.APPROVED },
          include: { translations: true },
        },
        recalls: {
          where: { status: ApprovalStatus.APPROVED },
        },
        questions: {
          where: { status: ApprovalStatus.APPROVED },
          include: { translations: true },
        },
        checklists: {
          where: { status: ApprovalStatus.APPROVED },
          include: { translations: true },
        },
        reviews: {
          where: { status: ApprovalStatus.APPROVED },
          include: { rating: true, user: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Araç varyantı bulunamadı.');
    }

    // Default: Locked state if user is Free or Anonymous
    let isPremiumUnlocked = false;

    if (userId) {
      const tier = await this.subscriptionService.getEffectiveTier(userId);
      isPremiumUnlocked = (tier === 'STANDARD' || tier === 'PRO');
    }

    // Return specs, problems and recalls to everyone
    // Mask seller questions and checklists if NOT unlocked (Free users get locked representations)
    return {
      id: variant.id,
      brand: variant.brand.name,
      model: variant.model.name,
      generation: variant.generation.name,
      year: variant.year,
      bodyType: variant.generation.bodyType,
      engine: variant.engine.code,
      fuelType: variant.engine.fuelType,
      transmission: variant.transmission.name,
      trim: variant.trim.name,
      country: variant.country.name,
      specs: variant.specs?.specs || null,
      problems: variant.problems.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        riskLevel: p.riskLevel,
        symptoms: p.symptoms,
        checkRecommendation: p.checkRecommendation,
      })),
      recalls: variant.recalls.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        riskLevel: r.riskLevel,
        date: r.date,
      })),
      premiumFeatures: {
        isUnlocked: isPremiumUnlocked,
        sellerQuestions: isPremiumUnlocked
          ? variant.questions.map(q => ({
              id: q.id,
              question: q.question,
              reason: q.reason,
              category: q.category,
              riskLevel: q.riskLevel,
            }))
          : { locked: true, message: 'Bu alan Standart veya Pro üyelere özeldir.' },
        inspectionChecklist: isPremiumUnlocked
          ? variant.checklists.map(c => ({
              id: c.id,
              title: c.title,
              description: c.description,
              category: c.category,
              riskLevel: c.riskLevel,
              sortOrder: c.sortOrder,
            }))
          : { locked: true, message: 'Bu alan Standart veya Pro üyelere özeldir.' },
      },
      reviews: variant.reviews.map(rev => ({
        id: rev.id,
        email: rev.user.email,
        comment: rev.comment,
        usageDuration: rev.usageDuration,
        recommend: rev.recommend,
        createdAt: rev.createdAt,
        rating: rev.rating,
      })),
    };
  }
}
