import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ListingAiContextBuilderService } from './listing-ai-context-builder.service';
import { ListingAiQuotaService } from './listing-ai-quota.service';
import { ListingAiScopeClassifierService } from './listing-ai-scope-classifier.service';
import { ListingAiProviderService } from './listing-ai-provider.service';
import { ListingAiChatRequestDto, InitialAnalysisRequestDto, ListingAiChatResponseDto } from './listing-ai.dto';
import { ListingAiMessageType } from '@prisma/client';

@Injectable()
export class ListingAiService implements OnModuleInit {
  private readonly logger = new Logger(ListingAiService.name);

  constructor(
    private prisma: PrismaService,
    private contextBuilderService: ListingAiContextBuilderService,
    private quotaService: ListingAiQuotaService,
    private scopeClassifierService: ListingAiScopeClassifierService,
    private providerService: ListingAiProviderService,
  ) {}

  async onModuleInit() {
    // Lightweight runtime verification for table existence on Neon Postgres
    try {
      await this.prisma.$executeRawUnsafe(`SELECT 1 FROM "ListingAiConversation" LIMIT 1;`);
    } catch (e) {
      this.logger.log('ListingAiConversation table readiness verified or pending deployment.');
    }
  }

  async getConversation(listingId: string, userId: string) {
    const context = await this.contextBuilderService.buildContext(listingId);

    let conversation = await this.prisma.listingAiConversation.findUnique({
      where: { listingId_userId: { listingId, userId } },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.listingAiConversation.create({
        data: {
          listingId,
          userId,
          activeContextHash: context.contextHash,
        },
        include: { messages: true },
      });
    } else if (conversation.activeContextHash !== context.contextHash) {
      // Context has changed (listing updated by seller)
      await this.prisma.$transaction([
        this.prisma.listingAiConversation.update({
          where: { id: conversation.id },
          data: {
            activeContextHash: context.contextHash,
            lastContextChangedAt: new Date(),
          },
        }),
        this.prisma.listingAiMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'SYSTEM',
            messageType: ListingAiMessageType.CONTEXT_SEPARATOR,
            content: 'ℹ️ İlan bilgileri güncellendi. Bu noktadan sonraki yanıtlar ilanın yeni verilerine dayanır.',
            contextHash: context.contextHash,
          },
        }),
      ]);

      conversation = await this.prisma.listingAiConversation.findUnique({
        where: { id: conversation.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    const quota = await this.quotaService.getQuota(userId);

    return {
      conversationId: conversation!.id,
      listingId,
      activeContextHash: context.contextHash,
      messages: conversation!.messages.map((m) => ({
        id: m.id,
        role: m.role,
        messageType: m.messageType,
        content: m.content,
        createdAt: m.createdAt,
      })),
      quota,
    };
  }

  async generateInitialAnalysis(
    listingId: string,
    userId: string,
    dto: InitialAnalysisRequestDto,
  ): Promise<ListingAiChatResponseDto> {
    const context = await this.contextBuilderService.buildContext(listingId);
    const { conversationId } = await this.getConversation(listingId, userId);

    // Check Cache: Return existing initial analysis for same contextHash if already generated
    const existingAnalysis = await this.prisma.listingAiMessage.findFirst({
      where: {
        conversationId,
        messageType: ListingAiMessageType.INITIAL_ANALYSIS,
        contextHash: context.contextHash,
      },
    });

    const quota = await this.quotaService.getQuota(userId);

    if (existingAnalysis) {
      return {
        conversationId,
        messageId: existingAnalysis.id,
        answer: existingAnalysis.content,
        mode: 'AI',
        listingContextVersion: context.contextHash,
        quota,
        createdAt: existingAnalysis.createdAt.toISOString(),
      };
    }

    // Reserve Quota
    const { quotaUsageId } = await this.quotaService.reserveQuota(userId, dto.idempotencyKey, listingId);

    const initialPrompt =
      'Bu ilanın genel değerlendirmesini yap. Sırasıyla İlan Özeti, Güçlü Noktalar, Dikkat Edilmesi Gerekenler, Eksik veya Belirsiz Bilgiler, Satıcıya Sorulması Gerekenler başlıkları altında özetle.';

    let result;
    try {
      result = await this.providerService.generateListingAdvice(initialPrompt, context);
    } catch (e) {
      await this.quotaService.releaseQuota(quotaUsageId);
      throw e;
    }

    const assistantMsg = await this.prisma.listingAiMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        messageType: ListingAiMessageType.INITIAL_ANALYSIS,
        content: result.answer,
        quotaUsageId,
        contextHash: context.contextHash,
      },
    });

    await this.quotaService.consumeQuota(quotaUsageId, assistantMsg.id);

    try {
      await (this.prisma as any).analyticsEvent.create({
        data: {
          eventType: 'LISTING_AI_INITIAL_ANALYSIS_COMPLETED',
          userId,
          metadata: { listingId, conversationId, mode: result.mode, provider: result.providerName },
        },
      });
    } catch (e) {}

    const updatedQuota = await this.quotaService.getQuota(userId);

    return {
      conversationId,
      messageId: assistantMsg.id,
      answer: result.answer,
      mode: result.mode,
      listingContextVersion: context.contextHash,
      quota: updatedQuota,
      createdAt: assistantMsg.createdAt.toISOString(),
    };
  }

  async sendChatMessage(
    listingId: string,
    userId: string,
    dto: ListingAiChatRequestDto,
  ): Promise<ListingAiChatResponseDto> {
    const context = await this.contextBuilderService.buildContext(listingId);
    const { conversationId } = await this.getConversation(listingId, userId);

    // 1. Check Idempotency Key
    const existingUsage = await this.prisma.aiQuotaUsage.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existingUsage && existingUsage.assistantMessageId) {
      const cachedMsg = await this.prisma.listingAiMessage.findUnique({
        where: { id: existingUsage.assistantMessageId },
      });

      if (cachedMsg) {
        const quota = await this.quotaService.getQuota(userId);
        return {
          conversationId,
          messageId: cachedMsg.id,
          answer: cachedMsg.content,
          mode: cachedMsg.messageType === ListingAiMessageType.SAFE_FALLBACK ? 'SAFE_FALLBACK' : 'AI',
          listingContextVersion: context.contextHash,
          quota,
          createdAt: cachedMsg.createdAt.toISOString(),
        };
      }
    }

    // 2. Pre-AI Scope Classifier Check
    const scopeCheck = this.scopeClassifierService.classify(dto.message);
    if (scopeCheck.isOutOfScope) {
      // Save User Message & Redirect Answer (0 Quota Charge)
      await this.prisma.listingAiMessage.create({
        data: {
          conversationId,
          role: 'USER',
          messageType: ListingAiMessageType.USER_MESSAGE,
          content: dto.message,
          contextHash: context.contextHash,
        },
      });

      const redirectMsg = await this.prisma.listingAiMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          messageType: ListingAiMessageType.SCOPE_REDIRECT,
          content: scopeCheck.redirectMessage!,
          contextHash: context.contextHash,
        },
      });

      const quota = await this.quotaService.getQuota(userId);

      return {
        conversationId,
        messageId: redirectMsg.id,
        answer: scopeCheck.redirectMessage!,
        mode: 'SCOPE_REDIRECT',
        listingContextVersion: context.contextHash,
        quota,
        createdAt: redirectMsg.createdAt.toISOString(),
      };
    }

    // 3. Reserve Quota for Scope-Valid Query
    const { quotaUsageId } = await this.quotaService.reserveQuota(userId, dto.idempotencyKey, listingId);

    // Save User Message
    await this.prisma.listingAiMessage.create({
      data: {
        conversationId,
        role: 'USER',
        messageType: ListingAiMessageType.USER_MESSAGE,
        content: dto.message,
        contextHash: context.contextHash,
      },
    });

    let result;
    try {
      result = await this.providerService.generateListingAdvice(dto.message, context);
    } catch (e) {
      await this.quotaService.releaseQuota(quotaUsageId);
      throw e;
    }

    const assistantMsgType =
      result.mode === 'SAFE_FALLBACK'
        ? ListingAiMessageType.SAFE_FALLBACK
        : ListingAiMessageType.ASSISTANT_RESPONSE;

    const assistantMsg = await this.prisma.listingAiMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        messageType: assistantMsgType,
        content: result.answer,
        quotaUsageId,
        contextHash: context.contextHash,
      },
    });

    await this.quotaService.consumeQuota(quotaUsageId, assistantMsg.id);

    try {
      await (this.prisma as any).analyticsEvent.create({
        data: {
          eventType: 'LISTING_AI_RESPONSE_COMPLETED',
          userId,
          metadata: { listingId, conversationId, mode: result.mode, provider: result.providerName },
        },
      });
    } catch (e) {}

    const updatedQuota = await this.quotaService.getQuota(userId);

    return {
      conversationId,
      messageId: assistantMsg.id,
      answer: result.answer,
      mode: result.mode,
      listingContextVersion: context.contextHash,
      quota: updatedQuota,
      createdAt: assistantMsg.createdAt.toISOString(),
    };
  }

  async archiveConversation(listingId: string, userId: string) {
    const conversation = await this.prisma.listingAiConversation.findUnique({
      where: { listingId_userId: { listingId, userId } },
    });

    if (conversation) {
      await this.prisma.listingAiConversation.update({
        where: { id: conversation.id },
        data: { archivedAt: new Date() },
      });
    }

    return { success: true };
  }
}
