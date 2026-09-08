import { Injectable, Logger } from '@nestjs/common';
import { SearchProvider, SearchResult, RetrievedSource } from './search-provider.interface';
import { SourceKind } from '@used-car-intelligence/shared';
import * as crypto from 'crypto';

@Injectable()
export class WebSearchProvider implements SearchProvider {
  private readonly logger = new Logger(WebSearchProvider.name);

  // Authenticity contract invariants:
  // An LLM is NEVER a search provider. Synthetic search fallback is permanently disabled.
  public readonly llmCanSimulateWebSearchResults = false;
  public readonly syntheticSearchFallbackExists = false;

  async search(query: string, languageCode: string, countryCode: string): Promise<SearchResult[]> {
    const serperKey = process.env.SERPER_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // 1. Try Serper.dev Google Search API first if key is present
    if (serperKey) {
      this.logger.log(`Using Serper.dev Live Search for query: "${query}"`);
      try {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: query,
            gl: countryCode.toLowerCase() === 'tr' ? 'tr' : countryCode.toLowerCase(),
            hl: languageCode.toLowerCase() === 'tr' ? 'tr' : languageCode.toLowerCase(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Serper API returned status ${response.status}`);
        }

        const data: any = await response.json();
        const organic = Array.isArray(data.organic) ? data.organic : [];

        return organic.slice(0, 5).map((item: any, idx: number) => {
          const itemUrl = item.link || '';
          const sourceKind = this.determineSourceKind(itemUrl);
          let domain = '';
          try { domain = new URL(itemUrl).hostname.toLowerCase(); } catch {}
          const snippetText = item.snippet || '';
          const contentHash = crypto.createHash('sha256').update(snippetText).digest('hex');

          return {
            url: itemUrl,
            resolvedUrl: itemUrl,
            domain,
            title: item.title || '',
            snippet: snippetText,
            providerSnippet: snippetText,
            retrievedPageExcerpt: null,
            retrievedPageText: null,
            provider: 'serper' as const,
            providerResultId: `serper_${idx}`,
            contentHash,
            retrievedAt: new Date().toISOString(),
            sourceKind,
            reliabilityScore: this.getReliabilityScoreForKind(sourceKind),
          };
        });
      } catch (error: any) {
        this.logger.error(`Error performing Serper.dev Live Search: ${error.message}. Falling back to authentic Gemini Search Grounding...`);
      }
    }

    // 2. Real Gemini Google Search Grounding with Direct Destination Page Fetch
    if (geminiApiKey) {
      this.logger.log(`Using Gemini Real Google Search Grounding for query: "${query}"`);
      try {
        const groundingResults = await this.executeGeminiSearchGrounding(query, geminiApiKey);
        if (groundingResults.length > 0) {
          return groundingResults;
        }
      } catch (err: any) {
        this.logger.error(`Gemini Real Search Grounding failed: ${err.message}`);
      }
    }

    // 3. FAIL CLOSED: When all real retrieval providers fail or are missing,
    // NEVER invent, simulate, or fabricate synthetic results.
    this.logger.warn(`No real search provider available or all attempts failed for query: "${query}". Failing closed with empty results.`);
    return [];
  }

  /**
   * Executes genuine Google Search Grounding via Gemini API,
   * resolves redirect URIs to real target URLs, and fetches authentic destination page text.
   */
  private async executeGeminiSearchGrounding(query: string, apiKey: string): Promise<SearchResult[]> {
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    let data: any = null;

    for (const modelName of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: query }] }],
            tools: [{ google_search: {} }],
          }),
        });

        if (res.ok) {
          data = await res.json();
          break;
        }
      } catch (e: any) {
        this.logger.warn(`Gemini grounding attempt with ${modelName} failed: ${e.message}`);
      }
    }

    if (!data) return [];

    const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];

    // Process up to 5 unique authentic grounding references
    for (let i = 0; i < Math.min(chunks.length, 6); i++) {
      const chunk = chunks[i];
      const citationUri = chunk.web?.uri;
      const title = chunk.web?.title || '';
      if (!citationUri) continue;

      try {
        // Resolve Google grounding redirect URI to real target URL
        let resolvedUrl = citationUri;
        try {
          const headRes = await fetch(citationUri, {
            method: 'HEAD',
            redirect: 'manual',
            signal: AbortSignal.timeout(4000),
          });
          const loc = headRes.headers.get('location');
          if (loc && loc.startsWith('http')) {
            resolvedUrl = loc;
          }
        } catch {
          // If HEAD fails, keep citationUri or try a GET with manual redirect
        }

        let domain = title;
        try {
          domain = new URL(resolvedUrl).hostname.toLowerCase();
        } catch {}

        // Fetch destination page directly to extract genuine page text
        let retrievedPageText: string | null = null;
        let retrievedPageExcerpt: string | null = null;
        let contentHash = '';

        try {
          const pageRes = await fetch(resolvedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(5000),
          });

          if (pageRes.url && pageRes.url.startsWith('http')) {
            resolvedUrl = pageRes.url;
            try { domain = new URL(resolvedUrl).hostname.toLowerCase(); } catch {}
          }

          if (pageRes.ok) {
            const rawHtml = await pageRes.text();
            // Clean HTML tags and scripts to extract authentic visible text
            const cleanedText = this.extractVisibleText(rawHtml);
            if (cleanedText.length > 30) {
              retrievedPageText = cleanedText.slice(0, 20000);
              retrievedPageExcerpt = cleanedText.slice(0, 1500);
              contentHash = crypto.createHash('sha256').update(retrievedPageText).digest('hex');
            }
          }
        } catch {
          // Page fetch may fail for 403 / timeouts, still retain resolved URL with title
        }

        if (!contentHash) {
          contentHash = crypto.createHash('sha256').update(resolvedUrl).digest('hex');
        }

        const sourceKind = this.determineSourceKind(resolvedUrl);

        results.push({
          url: resolvedUrl,
          resolvedUrl,
          domain,
          title,
          // Authentic raw text: either page excerpt or title.
          // NEVER use Gemini's generated response prose as retrieved text.
          snippet: retrievedPageExcerpt || title,
          providerSnippet: null, // No raw Serper snippet, discovered via grounding
          retrievedPageExcerpt,
          retrievedPageText,
          provider: 'gemini_grounding' as const,
          providerResultId: `gemini_chunk_${i}`,
          providerCitationUri: citationUri,
          contentHash,
          retrievedAt: new Date().toISOString(),
          sourceKind,
          reliabilityScore: this.getReliabilityScoreForKind(sourceKind),
        });
      } catch (err: any) {
        this.logger.warn(`Error resolving grounding chunk ${i}: ${err.message}`);
      }
    }

    return results;
  }

  private extractVisibleText(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private determineSourceKind(url: string): SourceKind {
    const itemUrl = url.toLowerCase();
    if (itemUrl.includes('forum') || itemUrl.includes('reddit') || itemUrl.includes('club') || itemUrl.includes('donanimhaber')) {
      return SourceKind.FORUM;
    } else if (itemUrl.includes('complaint') || itemUrl.includes('sikayetvar') || itemUrl.includes('pissedconsumer')) {
      return SourceKind.COMPLAINT_PLATFORM;
    } else if (itemUrl.includes('recall') || itemUrl.includes('nhtsa') || itemUrl.includes('gov')) {
      return SourceKind.OFFICIAL_RECALL;
    } else if (itemUrl.includes('manual') || itemUrl.includes('manufacturer') || itemUrl.includes('service') || itemUrl.includes('audi') || itemUrl.includes('subaru') || itemUrl.includes('volkswagen')) {
      return SourceKind.MANUFACTURER;
    } else if (itemUrl.includes('blog') || itemUrl.includes('review')) {
      return SourceKind.BLOG_REVIEW;
    } else if (itemUrl.includes('youtube') || itemUrl.includes('video')) {
      return SourceKind.VIDEO_REVIEW;
    }
    return SourceKind.UNKNOWN;
  }

  private getReliabilityScoreForKind(kind: SourceKind): number {
    switch (kind) {
      case SourceKind.OFFICIAL_RECALL: return 1.0;
      case SourceKind.MANUFACTURER: return 0.9;
      case SourceKind.SERVICE_NOTE: return 0.8;
      case SourceKind.COMPLAINT_PLATFORM: return 0.6;
      case SourceKind.USER_REVIEW: return 0.5;
      case SourceKind.FORUM: return 0.4;
      case SourceKind.BLOG_REVIEW: return 0.4;
      case SourceKind.VIDEO_REVIEW: return 0.3;
      default: return 0.2;
    }
  }
}
