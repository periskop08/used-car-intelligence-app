/**
 * firecrawl-extract.provider.ts
 * 
 * Firecrawl Content Extraction & Deep Search Provider.
 * Renders JS-heavy automotive forum threads and extracts markdown text.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ISearchProvider, SearchResponse, SearchResultItem } from './search-provider.interface';

@Injectable()
export class FirecrawlExtractProvider implements ISearchProvider {
  name = 'firecrawl';
  private readonly logger = new Logger(FirecrawlExtractProvider.name);

  async search(query: string, options?: { searchDepth?: 'basic' | 'advanced'; maxResults?: number }): Promise<SearchResponse> {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      this.logger.warn('FIRECRAWL_API_KEY not configured. Skipping Firecrawl search.');
      return { provider: 'firecrawl', query, results: [] };
    }

    try {
      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          limit: options?.maxResults || 5,
          scrapeOptions: { formats: ['markdown'] }
        })
      });

      if (!response.ok) {
        throw new Error(`Firecrawl HTTP error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const results: SearchResultItem[] = (data.data || []).map((item: any) => {
        let domain = '';
        try {
          domain = new URL(item.url).hostname.replace(/^www\./, '');
        } catch {
          domain = item.url;
        }

        return {
          title: item.title || 'Automotive Forum Thread',
          url: item.url,
          domain,
          snippet: (item.markdown || item.description || '').substring(0, 500),
          contentMarkdown: item.markdown || ''
        };
      });

      return {
        provider: 'firecrawl',
        query,
        results
      };
    } catch (err: any) {
      this.logger.error(`Firecrawl search failed for query "${query}": ${err.message}`);
      return { provider: 'firecrawl', query, results: [] };
    }
  }

  async extractContent(urls: string[]): Promise<Map<string, string>> {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const extractedMap = new Map<string, string>();
    if (!apiKey || urls.length === 0) return extractedMap;

    for (const url of urls.slice(0, 3)) {
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url,
            formats: ['markdown']
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data?.markdown) {
            extractedMap.set(url, data.data.markdown);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Firecrawl scrape error for ${url}: ${err.message}`);
      }
    }

    return extractedMap;
  }
}
