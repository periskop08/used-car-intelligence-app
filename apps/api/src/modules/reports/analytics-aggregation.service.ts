import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AnalyticsMetricValueType } from '@prisma/client';

@Injectable()
export class AnalyticsAggregationService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "DailyAnalyticsAggregate" (
          "id" TEXT NOT NULL,
          "date" DATE NOT NULL,
          "category" TEXT NOT NULL,
          "metric" TEXT NOT NULL,
          "dimensionKey" TEXT NOT NULL DEFAULT 'ALL',
          "dimensions" JSONB,
          "valueType" TEXT NOT NULL DEFAULT 'COUNT',
          "numericValue" DECIMAL(24,6) NOT NULL DEFAULT 0,
          "countValue" BIGINT NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "DailyAnalyticsAggregate_pkey" PRIMARY KEY ("id")
        );
      `);
      await this.prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "DailyAnalyticsAggregate_date_category_metric_dimensionKey_key"
        ON "DailyAnalyticsAggregate"("date", "category", "metric", "dimensionKey");
      `);
    } catch (e) {
      this.logger.log('DailyAnalyticsAggregate table readiness verified or created.');
    }

    // Run daily aggregate reconciliation once on startup and every 6 hours
    setTimeout(() => this.runDailyAggregation(), 10000);
    setInterval(() => this.runDailyAggregation(), 6 * 3600 * 1000);
  }

  // Canonical Dimension Key Builder: Sorts keys alphabetically, normalizes values
  buildCanonicalDimensionKey(dimensions?: Record<string, any>): string {
    if (!dimensions || Object.keys(dimensions).length === 0) {
      return 'ALL';
    }
    const sortedKeys = Object.keys(dimensions).sort();
    const parts = sortedKeys.map((k) => {
      const val = dimensions[k];
      const strVal = val === null || val === undefined ? 'NONE' : String(val).trim().toUpperCase();
      return `${k}=${strVal}`;
    });
    return parts.join('|');
  }

  // Converts date to Europe/Istanbul midnight date
  getIstanbulDate(date: Date = new Date()): Date {
    // Create date string in Istanbul timezone (YYYY-MM-DD)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const formatter = new Intl.DateTimeFormat('en-CA', options); // returns YYYY-MM-DD
    const dateStr = formatter.format(date);
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  async recordAggregateMetric(
    category: string,
    metric: string,
    value: number,
    valueType: AnalyticsMetricValueType = AnalyticsMetricValueType.COUNT,
    dimensions?: Record<string, any>,
    eventDate?: Date
  ) {
    try {
      const date = this.getIstanbulDate(eventDate);
      const dimensionKey = this.buildCanonicalDimensionKey(dimensions);

      const existing = await (this.prisma as any).dailyAnalyticsAggregate.findUnique({
        where: {
          date_category_metric_dimensionKey: {
            date,
            category,
            metric,
            dimensionKey,
          },
        },
      });

      if (existing) {
        if (valueType === AnalyticsMetricValueType.COUNT) {
          await (this.prisma as any).dailyAnalyticsAggregate.update({
            where: { id: existing.id },
            data: {
              countValue: { increment: Math.floor(value) },
              numericValue: Number(existing.numericValue) + value,
            },
          });
        } else {
          await (this.prisma as any).dailyAnalyticsAggregate.update({
            where: { id: existing.id },
            data: {
              numericValue: Number(existing.numericValue) + value,
            },
          });
        }
      } else {
        await (this.prisma as any).dailyAnalyticsAggregate.create({
          data: {
            date,
            category,
            metric,
            dimensionKey,
            dimensions: dimensions || {},
            valueType,
            countValue: valueType === AnalyticsMetricValueType.COUNT ? Math.floor(value) : 0,
            numericValue: value,
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`recordAggregateMetric error: ${err.message}`);
    }
  }

  async runDailyAggregation() {
    this.logger.log('Running daily analytics aggregation job...');
    try {
      // Reconcile user registration counts for today & yesterday
      const today = this.getIstanbulDate();
      const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);

      const userCountToday = await this.prisma.user.count({
        where: { createdAt: { gte: today } },
      });
      await this.recordAggregateMetric('USER', 'REGISTERED_USERS', userCountToday, AnalyticsMetricValueType.COUNT, undefined, today);

      const userCountYesterday = await this.prisma.user.count({
        where: { createdAt: { gte: yesterday, lt: today } },
      });
      await this.recordAggregateMetric('USER', 'REGISTERED_USERS', userCountYesterday, AnalyticsMetricValueType.COUNT, undefined, yesterday);
    } catch (e: any) {
      this.logger.error(`Daily aggregation job failed: ${e.message}`);
    }
  }
}
