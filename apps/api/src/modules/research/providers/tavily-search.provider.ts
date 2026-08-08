/**
 * tavily-search.provider.ts
 * 
 * Tavily AI Search & Content Extraction Provider.
 * High-speed, ad-free automotive web search and markdown article extraction.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ISearchProvider, SearchResponse, SearchResultItem } from './search-provider.interface';

@Injectable()
export class TavilySearchProvider implements ISearchProvider {
  name = 'tavily';
  private readonly logger = new Logger(TavilySearchProvider.name);

  async search(query: string, options?: { searchDepth?: 'basic' | 'advanced'; maxResults?: number }): Promise<SearchResponse> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      this.logger.warn('TAVILY_API_KEY not configured. Falling back to empty results.');
      return { provider: 'tavily', query, results: [] };
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: options?.searchDepth || 'advanced',
          max_results: options?.maxResults || 5,
          include_answer: false,
          include_raw_content: false
        })
      });

      if (!response.ok) {
        throw new Error(`Tavily HTTP error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const results: SearchResultItem[] = (data.results || []).map((r: any) => {
        let domain = '';
        try {
          domain = new URL(r.url).hostname.replace(/^www\./, '');
        } catch {
          domain = r.url;
        }

        return {
          title: r.title || 'Automotive Resource',
          url: r.url,
          domain,
          snippet: r.content || '',
          contentMarkdown: r.raw_content || r.content || '',
          publishedDate: r.published_date || undefined,
          score: r.score || 0.8
        };
      });

      return {
        provider: 'tavily',
        query,
        results
      };
    } catch (err: any) {
      this.logger.error(`Tavily search failed for query "${query}": ${err.message}`);
      return { provider: 'tavily', query, results: [] };
    }
  }

  async extractContent(urls: string[]): Promise<Map<string, string>> {
    const apiKey = process.env.TAVILY_API_KEY;
    const extractedMap = new Map<string, string>();
    if (!apiKey || urls.length === 0) return extractedMap;

    try {
      const response = await fetch('https://api.tavily.com/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          urls: urls.slice(0, 5)
        })
      });

      if (response.ok) {
        const data = await response.json();
        for (const item of (data.results || [])) {
          if (item.url && item.raw_content) {
            extractedMap.set(item.url, item.raw_content);
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Tavily extract error: ${err.message}`);
    }

    return extractedMap;
  }
}
