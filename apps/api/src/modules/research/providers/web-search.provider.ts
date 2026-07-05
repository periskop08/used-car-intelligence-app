import { Injectable, Logger } from '@nestjs/common';
import { SearchProvider, SearchResult } from './search-provider.interface';
import { SourceKind } from '@used-car-intelligence/shared';

@Injectable()
export class WebSearchProvider implements SearchProvider {
  private readonly logger = new Logger(WebSearchProvider.name);

  async search(query: string, languageCode: string, countryCode: string): Promise<SearchResult[]> {
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      this.logger.log(`Mocking search results for query: "${query}" in development/test environment.`);
      return this.generateMockResults(query);
    }

    // Production search using licensed / official APIs (e.g. Google Custom Search)
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !cx) {
      this.logger.error('Google Search API credentials are missing in production.');
      throw new Error('Search provider is not configured in production.');
    }

    try {
      // In production, fetch via official API
      const url = `https://customsearch.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&gl=${countryCode}&hl=${languageCode}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Search API returned status ${response.status}`);
      }
      const data = await response.json();
      const items = data.items || [];

      return items.map((item: any) => {
        const itemUrl = item.link || '';
        let sourceKind = SourceKind.UNKNOWN;

        if (itemUrl.includes('forum') || itemUrl.includes('reddit') || itemUrl.includes('club')) {
          sourceKind = SourceKind.FORUM;
        } else if (itemUrl.includes('complaint') || itemUrl.includes('sikayetvar') || itemUrl.includes('pissedconsumer')) {
          sourceKind = SourceKind.COMPLAINT_PLATFORM;
        } else if (itemUrl.includes('recall') || itemUrl.includes('nhtsa') || itemUrl.includes('gov')) {
          sourceKind = SourceKind.OFFICIAL_RECALL;
        } else if (itemUrl.includes('manual') || itemUrl.includes('manufacturer') || itemUrl.includes('service')) {
          sourceKind = SourceKind.MANUFACTURER;
        } else if (itemUrl.includes('blog') || itemUrl.includes('review')) {
          sourceKind = SourceKind.BLOG_REVIEW;
        } else if (itemUrl.includes('youtube') || itemUrl.includes('video')) {
          sourceKind = SourceKind.VIDEO_REVIEW;
        }

        return {
          url: itemUrl,
          title: item.title || '',
          snippet: item.snippet || '',
          sourceKind,
          reliabilityScore: this.getReliabilityScoreForKind(sourceKind),
        };
      });
    } catch (error) {
      this.logger.error(`Error performing Google Custom Search: ${error.message}`);
      throw error;
    }
  }

  private generateMockResults(query: string): SearchResult[] {
    return [
      {
        url: 'https://official-recalls.gov/campaign/123',
        title: 'Official Recall Campaign for variant',
        snippet: 'Safety recall regarding fuel leak issue in engine compartment.',
        sourceKind: SourceKind.MOCK,
        reliabilityScore: 0,
      },
      {
        url: 'https://carforum.com/threads/engine-stalling-issue',
        title: 'Engine stalling and electrical issues',
        snippet: 'Many users reporting sudden engine stalling at traffic lights.',
        sourceKind: SourceKind.MOCK,
        reliabilityScore: 0,
      },
      {
        url: 'https://manufacturer-service.com/manuals',
        title: 'Manufacturer Service Bulletin',
        snippet: 'Recommended check on transmission valve body during 60k service.',
        sourceKind: SourceKind.MOCK,
        reliabilityScore: 0,
      }
    ];
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
