import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AnalyticsEventType, AnalyticsOutboxStatus } from '@prisma/client';

@Injectable()
export class AnalyticsEventService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Start background outbox polling loop
    setInterval(() => this.processOutboxQueue(), 5000);
  }

  // Non-blocking trackEvent: writes to AnalyticsOutbox in transaction or async
  async trackEvent(data: {
    eventType: AnalyticsEventType;
    userId?: string;
    anonymousId?: string;
    sessionId?: string;
    requestId?: string;
    correlationId?: string;
    entityId?: string;
    metadata?: Record<string, any>;
    device?: string;
    platform?: string;
    appVersion?: string;
    source?: string;
    country?: string;
    city?: string;
    language?: string;
    utmSource?: string;
    utmCampaign?: string;
    utmMedium?: string;
    occurredAt?: Date;
    idempotencyKey?: string;
  }) {
    try {
      const sanitizedMeta = this.sanitizeMetadata(data.metadata);
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const payload = {
        ...data,
        metadata: sanitizedMeta,
        occurredAt: (data.occurredAt || new Date()).toISOString(),
      };

      await (this.prisma as any).analyticsOutbox.create({
        data: {
          eventId,
          eventType: data.eventType,
          payload: payload as any,
          status: AnalyticsOutboxStatus.PENDING,
        },
      });
    } catch (err: any) {
      this.logger.error(`Analytics trackEvent error: ${err.message}`);
    }
  }

  // Outbox Processor Worker
  private async processOutboxQueue() {
    try {
      const pendingRecords = await (this.prisma as any).analyticsOutbox.findMany({
        where: {
          status: AnalyticsOutboxStatus.PENDING,
          OR: [
            { nextAttemptAt: null },
            { nextAttemptAt: { lte: new Date() } },
          ],
        },
        take: 50,
      });

      for (const record of pendingRecords) {
        try {
          await (this.prisma as any).analyticsOutbox.update({
            where: { id: record.id },
            data: { status: AnalyticsOutboxStatus.PROCESSING, lockedAt: new Date() },
          });

          const p = record.payload;
          const idempotencyKey = p.idempotencyKey || record.eventId;

          // Check if event already exists idempotently
          const existing = await this.prisma.analyticsEvent.findUnique({
            where: { idempotencyKey },
          });

          if (!existing) {
            await this.prisma.analyticsEvent.create({
              data: {
                eventId: record.eventId,
                idempotencyKey,
                eventType: record.eventType,
                userId: p.userId,
                anonymousId: p.anonymousId,
                sessionId: p.sessionId,
                requestId: p.requestId,
                correlationId: p.correlationId,
                entityId: p.entityId,
                metadata: p.metadata,
                device: p.device,
                platform: p.platform,
                appVersion: p.appVersion,
                source: p.source,
                country: p.country,
                city: p.city,
                language: p.language,
                utmSource: p.utmSource,
                utmCampaign: p.utmCampaign,
                utmMedium: p.utmMedium,
                occurredAt: p.occurredAt ? new Date(p.occurredAt) : new Date(),
              },
            });
          }

          await (this.prisma as any).analyticsOutbox.update({
            where: { id: record.id },
            data: { status: AnalyticsOutboxStatus.COMPLETED, processedAt: new Date() },
          });
        } catch (err: any) {
          const attempt = record.attemptCount + 1;
          const status = attempt >= 5 ? AnalyticsOutboxStatus.DEAD_LETTER : AnalyticsOutboxStatus.FAILED;
          await (this.prisma as any).analyticsOutbox.update({
            where: { id: record.id },
            data: {
              status,
              attemptCount: attempt,
              errorCode: err.message,
              nextAttemptAt: new Date(Date.now() + attempt * 10000),
            },
          });
        }
      }
    } catch (err: any) {
      // Ignore background loop error
    }
  }

  // PII Sanitizer: Strips sensitive fields (passwords, emails, payment card data, full message texts)
  private sanitizeMetadata(meta?: Record<string, any>): Record<string, any> | undefined {
    if (!meta) return undefined;
    const clean: Record<string, any> = {};
    const forbiddenKeys = ['password', 'token', 'secret', 'creditcard', 'cardnumber', 'cvv', 'email', 'phone', 'messagebody', 'rawtext'];

    for (const [key, val] of Object.entries(meta)) {
      const lower = key.toLowerCase();
      if (forbiddenKeys.some(fk => lower.includes(fk))) continue;
      if (typeof val === 'string' && val.length > 500) {
        clean[key] = val.substring(0, 500) + '... [truncated]';
      } else {
        clean[key] = val;
      }
    }
    return clean;
  }
}
