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

    // Check for Gemini Search Grounding credentials
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.logger.log(`Using Gemini Search Grounding for query: "${query}"`);
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: `Perform a Google Search to retrieve actual web search results (such as forum threads, complaint platforms, official recalls, or manufacturer manuals) for: "${query}".
Return a JSON array containing the top search results found. Each item in the array MUST strictly conform to this schema:
{
  "url": "the URL of the page",
  "title": "the title of the page",
  "snippet": "a short text snippet describing the content found"
}
Do not write any other introductory or concluding text. Return only the valid JSON array.`
                }
              ]
            }
          ],
          tools: [
            {
              googleSearch: {}
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini Search Grounding API returned status ${response.status}. Details: ${errText}`);
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
          throw new Error('Gemini API returned an empty response.');
        }

        const parsedItems = JSON.parse(textContent);
        if (!Array.isArray(parsedItems)) {
          throw new Error('Gemini response is not a JSON array.');
        }

        return parsedItems.map((item: any) => {
          const itemUrl = item.url || '';
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
        this.logger.error(`Error performing Gemini Search Grounding: ${error.message}`);
        throw error;
      }
    }

    // Fallback: Google Custom Search API
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
        const errText = await response.text();
        this.logger.error(`Google Search API Error Details: ${errText}`);
        throw new Error(`Google Search API returned status ${response.status}. Details: ${errText}`);
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
