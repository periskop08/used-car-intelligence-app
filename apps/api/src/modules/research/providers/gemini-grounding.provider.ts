/**
 * gemini-grounding.provider.ts
 * 
 * Gemini Search Grounding & Content Extraction Fallback Provider.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ISearchProvider, SearchResponse, SearchResultItem } from './search-provider.interface';

@Injectable()
export class GeminiGroundingProvider implements ISearchProvider {
  name = 'gemini';
  private readonly logger = new Logger(GeminiGroundingProvider.name);

  async search(query: string, options?: { searchDepth?: 'basic' | 'advanced'; maxResults?: number }): Promise<SearchResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured. Falling back to empty results.');
      return { provider: 'gemini', query, results: [] };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Aşağıdaki otomotiv konusu için internetteki teknik verileri araştır ve özetle:\n"${query}"` }]
          }],
          tools: [{ google_search_retrieval: {} }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini Grounding HTTP error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      const results: SearchResultItem[] = groundingChunks.map((chunk: any) => {
        const pageUrl = chunk.web?.uri || 'https://google.com';
        let domain = '';
        try {
          domain = new URL(pageUrl).hostname.replace(/^www\./, '');
        } catch {
          domain = pageUrl;
        }

        return {
          title: chunk.web?.title || 'Google Search Grounding Result',
          url: pageUrl,
          domain,
          snippet: text.substring(0, 500),
          contentMarkdown: text
        };
      });

      return {
        provider: 'gemini',
        query,
        results
      };
    } catch (err: any) {
      this.logger.error(`Gemini Grounding search failed for query "${query}": ${err.message}`);
      return { provider: 'gemini', query, results: [] };
    }
  }

  async extractContent(urls: string[]): Promise<Map<string, string>> {
    return new Map<string, string>();
  }
}
