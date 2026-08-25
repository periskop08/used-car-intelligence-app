import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  AiOperationType,
  AiOperationStatus,
  AiCacheStatus,
} from '@prisma/client';

export interface RecordTraceOptions {
  traceId?: string;
  operationType: AiOperationType;
  status?: AiOperationStatus;
  stage?: string;
  provider?: string;
  primaryProvider?: string;
  fallbackProvider?: string;
  fallbackUsed?: boolean;
  cacheStatus?: AiCacheStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  errorCategory?: string;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  vehicleVariantId?: string;
  comparisonVariantIds?: string[];
  retryOfTraceId?: string;
  metadata?: Record<string, any>;
}

export type TimeRangeKey =
  | 'LAST_1_HOUR'
  | 'LAST_24_HOURS'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH';

@Injectable()
export class AiTelemetryService {
  private readonly logger = new Logger(AiTelemetryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Safe, non-blocking telemetry record writer.
   * Telemetry failure will NEVER break user-facing requests.
   */
  async recordTrace(options: RecordTraceOptions): Promise<string | null> {
    try {
      const startedAt = options.startedAt || new Date();
      const completedAt = options.completedAt || (options.durationMs ? new Date(startedAt.getTime() + options.durationMs) : null);
      const durationMs = options.durationMs || (completedAt ? completedAt.getTime() - startedAt.getTime() : null);

      const record = await this.prisma.aiTelemetryLog.create({
        data: {
          traceId: options.traceId,
          operationType: options.operationType,
          status: options.status || AiOperationStatus.STARTED,
          stage: options.stage,
          provider: options.provider,
          primaryProvider: options.primaryProvider,
          fallbackProvider: options.fallbackProvider,
          fallbackUsed: options.fallbackUsed ?? false,
          cacheStatus: options.cacheStatus || AiCacheStatus.NOT_APPLICABLE,
          startedAt,
          completedAt,
          durationMs,
          errorCategory: options.errorCategory,
          errorCode: options.errorCode,
          errorMessage: options.errorMessage,
          httpStatus: options.httpStatus,
          inputTokens: options.inputTokens,
          outputTokens: options.outputTokens,
          totalTokens: options.totalTokens,
          estimatedCost: options.estimatedCost,
          vehicleVariantId: options.vehicleVariantId,
          comparisonVariantIds: options.comparisonVariantIds || [],
          retryOfTraceId: options.retryOfTraceId,
          metadata: options.metadata || undefined,
        },
      });

      return record.traceId;
    } catch (err: any) {
      this.logger.error(`Failed to record AI telemetry trace: ${err?.message || err}`);
      return null;
    }
  }

  /**
   * Helper to parse time range filter into date boundaries.
   */
  getDateRange(rangeKey: TimeRangeKey = 'LAST_24_HOURS'): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate = new Date();

    switch (rangeKey) {
      case 'LAST_1_HOUR':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'LAST_1_HOUR' as any:
      case 'LAST_24_HOURS':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'LAST_7_DAYS':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'LAST_30_DAYS':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'THIS_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    return { startDate, endDate: now };
  }

  /**
   * Returns recent live traces for the terminal.
   */
  async getLiveStream(params: {
    limit?: number;
    offset?: number;
    operationType?: string;
    status?: string;
    search?: string;
  }) {
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    const where: any = {};

    if (params.operationType && params.operationType !== 'ALL') {
      where.operationType = params.operationType;
    }

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { traceId: { contains: q, mode: 'insensitive' } },
        { provider: { contains: q, mode: 'insensitive' } },
        { stage: { contains: q, mode: 'insensitive' } },
        { errorMessage: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.aiTelemetryLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.aiTelemetryLog.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  /**
   * Single trace details.
   */
  async getTraceDetails(traceId: string) {
    return this.prisma.aiTelemetryLog.findUnique({
      where: { traceId },
    });
  }

  /**
   * Top KPI statistics computed from REAL telemetry records.
   */
  async getMetrics(rangeKey: TimeRangeKey = 'LAST_24_HOURS') {
    const { startDate, endDate } = this.getDateRange(rangeKey);
    const where = { startedAt: { gte: startDate, lte: endDate } };

    const totalOperations = await this.prisma.aiTelemetryLog.count({ where });

    if (totalOperations === 0) {
      return {
        hasData: false,
        totalOperations: 0,
        successRate: null,
        avgDurationMs: null,
        fallbackRate: null,
        errorRate: null,
        cacheHitRate: null,
      };
    }

    const [successCount, fallbackCount, failedCount, cacheHits, cacheTotal, aggregations] = await Promise.all([
      this.prisma.aiTelemetryLog.count({
        where: {
          ...where,
          status: { in: [AiOperationStatus.SUCCESS, AiOperationStatus.SUCCESS_WITH_FALLBACK] },
        },
      }),
      this.prisma.aiTelemetryLog.count({
        where: { ...where, fallbackUsed: true },
      }),
      this.prisma.aiTelemetryLog.count({
        where: { ...where, status: AiOperationStatus.FAILED },
      }),
      this.prisma.aiTelemetryLog.count({
        where: { ...where, cacheStatus: AiCacheStatus.HIT },
      }),
      this.prisma.aiTelemetryLog.count({
        where: { ...where, cacheStatus: { in: [AiCacheStatus.HIT, AiCacheStatus.MISS] } },
      }),
      this.prisma.aiTelemetryLog.aggregate({
        where: { ...where, durationMs: { not: null } },
        _avg: { durationMs: true },
      }),
    ]);

    return {
      hasData: true,
      totalOperations,
      successRate: Number(((successCount / totalOperations) * 100).toFixed(1)),
      avgDurationMs: aggregations._avg.durationMs ? Math.round(aggregations._avg.durationMs) : null,
      fallbackRate: Number(((fallbackCount / totalOperations) * 100).toFixed(1)),
      errorRate: Number(((failedCount / totalOperations) * 100).toFixed(1)),
      cacheHitRate: cacheTotal > 0 ? Number(((cacheHits / cacheTotal) * 100).toFixed(1)) : null,
    };
  }

  /**
   * Retrieves slow requests above thresholdMs.
   */
  async getSlowRequests(rangeKey: TimeRangeKey = 'LAST_24_HOURS', thresholdMs: number = 3000) {
    const { startDate, endDate } = this.getDateRange(rangeKey);
    return this.prisma.aiTelemetryLog.findMany({
      where: {
        startedAt: { gte: startDate, lte: endDate },
        durationMs: { gte: thresholdMs },
      },
      orderBy: { durationMs: 'desc' },
      take: 20,
    });
  }

  /**
   * Aggregates errors by errorCategory for Hatalar tab.
   */
  async getErrorMetrics(rangeKey: TimeRangeKey = 'LAST_24_HOURS') {
    const { startDate, endDate } = this.getDateRange(rangeKey);
    const where = {
      startedAt: { gte: startDate, lte: endDate },
      status: AiOperationStatus.FAILED,
    };

    const totalErrors = await this.prisma.aiTelemetryLog.count({ where });

    if (totalErrors === 0) {
      return { hasData: false, totalErrors: 0, categories: [], recentFailures: [] };
    }

    const recentFailures = await this.prisma.aiTelemetryLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    const categoryMap: Record<string, { category: string; count: number; lastOccurred: Date; sampleTraceId: string }> = {};

    for (const f of recentFailures) {
      const cat = f.errorCategory || 'UNKNOWN';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          count: 0,
          lastOccurred: f.startedAt,
          sampleTraceId: f.traceId,
        };
      }
      categoryMap[cat].count += 1;
    }

    return {
      hasData: true,
      totalErrors,
      categories: Object.values(categoryMap),
      recentFailures,
    };
  }

  /**
   * Aggregates token usage and monetary costs.
   */
  async getCostAndTokenMetrics(rangeKey: TimeRangeKey = 'LAST_24_HOURS') {
    const { startDate, endDate } = this.getDateRange(rangeKey);
    const where = { startedAt: { gte: startDate, lte: endDate } };

    const records = await this.prisma.aiTelemetryLog.findMany({
      where: {
        ...where,
        OR: [{ totalTokens: { not: null } }, { inputTokens: { not: null } }],
      },
      select: {
        provider: true,
        operationType: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        estimatedCost: true,
      },
    });

    if (records.length === 0) {
      return {
        hasData: false,
        totalTokens: null,
        totalCost: null,
        byProvider: [],
        byOperation: [],
        costCalculable: false,
        costUncalculableReason: 'Seçilen dönemde kaydedilmiş token kullanımı bulunmuyor.',
      };
    }

    let totalInput = 0;
    let totalOutput = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let hasExplicitCost = false;

    const providerMap: Record<string, { provider: string; inputTokens: number; outputTokens: number; totalTokens: number; estimatedCost: number | null }> = {};
    const operationMap: Record<string, { operationType: string; inputTokens: number; outputTokens: number; totalTokens: number; estimatedCost: number | null }> = {};

    for (const r of records) {
      const inT = r.inputTokens || 0;
      const outT = r.outputTokens || 0;
      const totT = r.totalTokens || inT + outT;
      const cost = r.estimatedCost ?? null;

      totalInput += inT;
      totalOutput += outT;
      totalTokens += totT;

      if (cost !== null) {
        totalCost += cost;
        hasExplicitCost = true;
      }

      // Group by Provider
      const pKey = r.provider || 'Bilinmeyen Provider';
      if (!providerMap[pKey]) {
        providerMap[pKey] = { provider: pKey, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: null };
      }
      providerMap[pKey].inputTokens += inT;
      providerMap[pKey].outputTokens += outT;
      providerMap[pKey].totalTokens += totT;
      if (cost !== null) {
        providerMap[pKey].estimatedCost = (providerMap[pKey].estimatedCost || 0) + cost;
      }

      // Group by Operation
      const opKey = r.operationType;
      if (!operationMap[opKey]) {
        operationMap[opKey] = { operationType: opKey, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: null };
      }
      operationMap[opKey].inputTokens += inT;
      operationMap[opKey].outputTokens += outT;
      operationMap[opKey].totalTokens += totT;
      if (cost !== null) {
        operationMap[opKey].estimatedCost = (operationMap[opKey].estimatedCost || 0) + cost;
      }
    }

    return {
      hasData: true,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalTokens,
      totalCost: hasExplicitCost ? Number(totalCost.toFixed(4)) : null,
      costCalculable: hasExplicitCost,
      costUncalculableReason: hasExplicitCost ? null : 'Maliyet hesaplanamıyor (Sağlayıcı yanıtında veya konfigürasyonda doğrudan maliyet kalemi belirtilmedi).',
      byProvider: Object.values(providerMap),
      byOperation: Object.values(operationMap),
    };
  }

  /**
   * Health metrics for active project dependencies only (Gemini, OpenAI, PostgreSQL, Cloudflare R2).
   * Strictly NO Tavily or unconfigured services.
   * Strictly separates configuration state from operational health state.
   */
  async getProviderStatusMetrics(rangeKey: TimeRangeKey = 'LAST_24_HOURS') {
    const { startDate, endDate } = this.getDateRange(rangeKey);
    const where = { startedAt: { gte: startDate, lte: endDate } };

    const logs = await this.prisma.aiTelemetryLog.findMany({
      where,
      select: {
        provider: true,
        status: true,
        durationMs: true,
        startedAt: true,
        errorMessage: true,
      },
    });

    // Check DB live state
    let dbStatus = 'HEALTHY';
    let dbHealthText = 'Çalışıyor';
    let dbLatency: number | null = null;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch {
      dbStatus = 'UNHEALTHY';
      dbHealthText = 'Erişilemiyor';
    }

    // Determine configured state from ENV
    const geminiConfigured = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY);
    const openAiConfigured = !!process.env.OPENAI_API_KEY;
    const r2Configured = !!(process.env.R2_ACCOUNT_ID || process.env.R2_BUCKET_NAME || process.env.AWS_S3_ENDPOINT);

    const services = [
      { id: 'gemini', name: 'Google Gemini API', type: 'AI Provider', isConfigured: geminiConfigured },
      { id: 'openai', name: 'OpenAI API', type: 'AI Provider', isConfigured: openAiConfigured },
      { id: 'postgres', name: 'Neon Serverless PostgreSQL DB', type: 'Database', isConfigured: true },
      { id: 'r2', name: 'Cloudflare R2 Storage', type: 'Object Storage', isConfigured: r2Configured },
    ];

    const result = services.map((srv) => {
      if (srv.id === 'postgres') {
        return {
          id: srv.id,
          name: srv.name,
          type: srv.type,
          isConfigured: true,
          configText: 'Bağlı',
          healthStatus: dbStatus,
          healthText: dbHealthText,
          avgLatencyMs: dbLatency,
          lastSuccess: new Date().toISOString(),
          lastError: null,
          totalRequests: null,
          successRate: dbStatus === 'HEALTHY' ? 100 : 0,
        };
      }

      if (srv.id === 'r2') {
        return {
          id: srv.id,
          name: srv.name,
          type: srv.type,
          isConfigured: r2Configured,
          configText: r2Configured ? 'Yapılandırılmış' : 'Yapılandırılmamış',
          healthStatus: r2Configured ? 'INSUFFICIENT_DATA' : 'NOT_CONFIGURED',
          healthText: r2Configured ? 'Veri Yetersiz' : 'Yapılandırılmamış',
          avgLatencyMs: null,
          lastSuccess: null,
          lastError: null,
          totalRequests: 0,
          successRate: null,
        };
      }

      // For Gemini & OpenAI, check telemetry
      const matched = logs.filter((l) => l.provider?.toLowerCase().includes(srv.id));
      const totalReqs = matched.length;

      if (totalReqs === 0) {
        return {
          id: srv.id,
          name: srv.name,
          type: srv.type,
          isConfigured: srv.isConfigured,
          configText: srv.isConfigured ? 'Yapılandırılmış' : 'Yapılandırılmamış',
          healthStatus: srv.isConfigured ? 'INSUFFICIENT_DATA' : 'NOT_CONFIGURED',
          healthText: srv.isConfigured ? 'Veri Yetersiz' : 'Yapılandırılmamış',
          avgLatencyMs: null,
          lastSuccess: null,
          lastError: null,
          totalRequests: 0,
          successRate: null,
        };
      }

      const successLogs = matched.filter((l) => l.status === AiOperationStatus.SUCCESS || l.status === AiOperationStatus.SUCCESS_WITH_FALLBACK);
      const failedLogs = matched.filter((l) => l.status === AiOperationStatus.FAILED);
      const successRate = totalReqs > 0 ? Number(((successLogs.length / totalReqs) * 100).toFixed(1)) : 0;

      const latencies = matched.map((l) => l.durationMs).filter((d): d is number => typeof d === 'number');
      const avgLatencyMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;

      const lastSuccess = successLogs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]?.startedAt || null;
      const lastErrorLog = failedLogs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

      let healthStatus = 'HEALTHY';
      let healthText = 'Çalışıyor';
      if (successRate < 80) {
        healthStatus = 'DEGRADED';
        healthText = 'Performans Düşük';
      }
      if (successRate < 50) {
        healthStatus = 'UNHEALTHY';
        healthText = 'Erişilemiyor';
      }

      return {
        id: srv.id,
        name: srv.name,
        type: srv.type,
        isConfigured: srv.isConfigured,
        configText: srv.isConfigured ? 'Yapılandırılmış' : 'Yapılandırılmamış',
        healthStatus,
        healthText,
        avgLatencyMs,
        lastSuccess: lastSuccess ? lastSuccess.toISOString() : null,
        lastError: lastErrorLog ? { message: lastErrorLog.errorMessage || 'Bilinmeyen hata', time: lastErrorLog.startedAt.toISOString() } : null,
        totalRequests: totalReqs,
        successRate,
      };
    });

    return { services: result };
  }
}
