/**
 * raw-source-store.service.ts
 * 
 * RawSource Persistence & ContentHash Deduplication Service.
 * Persists raw web search and extraction results into the PostgreSQL RawSource table,
 * preventing syndicated and copycat articles from being counted multiple times.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SourceKind, SourceType, ApprovalStatus } from '@prisma/client';
import * as crypto from 'crypto';

export interface RawSourceInput {
  url: string;
  title: string;
  domain: string;
  snippet: string;
  contentMarkdown?: string;
  sourceKind: SourceKind;
  vehicleVariantId?: string;
  provider?: string;
}

@Injectable()
export class RawSourceStoreService {
  private readonly logger = new Logger(RawSourceStoreService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generates a deterministic SHA-256 contentHash for content deduplication.
   */
  generateContentHash(content: string, url: string): string {
    const normalized = (content || url).toLowerCase().replace(/\s+/g, ' ').trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Saves or fetches a RawSource record with contentHash deduplication.
   */
  async saveRawSource(input: RawSourceInput): Promise<any> {
    const hash = this.generateContentHash(input.contentMarkdown || input.snippet, input.url);

    // 1. Check if hash already exists in DB
    const existing = await this.prisma.rawSource.findUnique({
      where: { contentHash: hash }
    });

    if (existing) {
      this.logger.debug(`RawSource hit cache / deduplicated copycat: ${input.url} (Hash: ${hash.substring(0, 8)})`);
      return existing;
    }

    // 2. Insert new RawSource record
    try {
      const created = await this.prisma.rawSource.create({
        data: {
          url: input.url,
          sourceDomain: input.domain,
          title: input.title,
          contentHash: hash,
          extractedText: input.snippet,
          rawText: input.contentMarkdown || input.snippet,
          sourceType: SourceType.COMMON_PROBLEM,
          sourceKind: input.sourceKind || SourceKind.UNKNOWN,
          vehicleVariantId: input.vehicleVariantId || null,
          status: ApprovalStatus.RAW,
          metadata: {
            provider: input.provider || 'unknown',
            savedAt: new Date().toISOString()
          }
        }
      });
      return created;
    } catch (err: any) {
      this.logger.warn(`RawSource creation skipped (duplicate URL or Hash): ${err.message}`);
      return await this.prisma.rawSource.findFirst({ where: { url: input.url } });
    }
  }
}
