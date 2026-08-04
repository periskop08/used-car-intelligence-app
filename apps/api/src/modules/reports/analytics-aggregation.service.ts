import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AnalyticsMetricValueType } from '@prisma/client';

@Injectable()
export class AnalyticsAggregationService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // 1. Create enum type if not exists
      await this.prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "AnalyticsMetricValueType" AS ENUM ('COUNT', 'MONEY', 'DECIMAL', 'PERCENTAGE', 'DURATION_MS');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
      `);
    } catch (e: any) {
      this.logger.log(`AnalyticsMetricValueType enum check: ${e.message}`);
    }

    try {
      // 2. Create table with TEXT valueType (safe for all DB states)
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
      this.logger.log('DailyAnalyticsAggregate table readiness verified.');
    } catch (e: any) {
      this.logger.log(`DailyAnalyticsAggregate table check: ${e.message}`);
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
      const valueTypeStr = String(valueType);
      const isCount = valueType === AnalyticsMetricValueType.COUNT;
      const countValue = isCount ? Math.floor(value) : 0;

      // Use raw SQL to avoid Prisma enum type casting issues with TEXT column
      const existing = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id, "numericValue" FROM "DailyAnalyticsAggregate"
         WHERE date = $1 AND category = $2 AND metric = $3 AND "dimensionKey" = $4
         LIMIT 1`,
        date, category, metric, dimensionKey,
      );

      if (existing && existing.length > 0) {
        const rec = existing[0];
        await this.prisma.$executeRawUnsafe(
          `UPDATE "DailyAnalyticsAggregate"
           SET "countValue" = "countValue" + $1,
               "numericValue" = "numericValue" + $2,
               "updatedAt" = NOW()
           WHERE id = $3`,
          BigInt(isCount ? Math.floor(value) : 0),
          value,
          rec.id,
        );
      } else {
        const newId = `dag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "DailyAnalyticsAggregate"
           (id, date, category, metric, "dimensionKey", dimensions, "valueType", "numericValue", "countValue", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, NOW(), NOW())
           ON CONFLICT (date, category, metric, "dimensionKey") DO UPDATE
           SET "countValue" = "DailyAnalyticsAggregate"."countValue" + $9,
               "numericValue" = "DailyAnalyticsAggregate"."numericValue" + $8,
               "updatedAt" = NOW()`,
          newId, date, category, metric, dimensionKey,
          JSON.stringify(dimensions || {}),
          valueTypeStr,
          value,
          BigInt(countValue),
        );
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
