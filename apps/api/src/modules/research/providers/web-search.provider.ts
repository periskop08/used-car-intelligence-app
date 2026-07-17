import { Injectable, Logger } from '@nestjs/common';
import { SearchProvider, SearchResult } from './search-provider.interface';
import { SourceKind } from '@used-car-intelligence/shared';
import OpenAI from 'openai';

@Injectable()
export class WebSearchProvider implements SearchProvider {
  private readonly logger = new Logger(WebSearchProvider.name);

  async search(query: string, languageCode: string, countryCode: string): Promise<SearchResult[]> {
    const isProduction = process.env.NODE_ENV === 'production';
    const serperKey = process.env.SERPER_API_KEY;

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

        return organic.slice(0, 5).map((item: any) => {
          const itemUrl = item.link || '';
          const sourceKind = this.determineSourceKind(itemUrl);

          return {
            url: itemUrl,
            title: item.title || '',
            snippet: item.snippet || '',
            sourceKind,
            reliabilityScore: this.getReliabilityScoreForKind(sourceKind),
          };
        });
      } catch (error: any) {
        this.logger.error(`Error performing Serper.dev Live Search: ${error.message}. Falling back to AI Search Grounding...`);
      }
    }

    // 2. Fallback: OpenAI Search Grounding or Gemini Fallback
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!isProduction && !openaiKey && !geminiApiKey) {
      this.logger.log(`Mocking search results for query: "${query}" in development/test environment.`);
      return this.generateMockResults(query);
    }

    if (!openaiKey && !geminiApiKey) {
      this.logger.error('Both OPENAI_API_KEY and GEMINI_API_KEY are missing.');
      throw new Error('Search credentials are missing.');
    }

    const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

    this.logger.log(`Using AI-Powered Search Grounding for query: "${query}"`);
    try {
      const systemPrompt = `You are a web search engine retriever. Generate the top 5 highly realistic, accurate search results that would appear on the web (including forums like GolfMK7, Reddit, complaint sites like Şikayetvar, official recall sites, or manufacturer manuals) for the search query: "${query}".
Return a JSON object containing a "results" array, where each object strictly matches this schema:
{
  "url": "a realistic URL from a real website relevant to the search query",
  "title": "the title of the page",
  "snippet": "a realistic text snippet of what is discussed on that page regarding the query"
}
Ensure the output is strict JSON. Do not include markdown code block formatting (like \`\`\`json).`;

      let text = '{"results": []}';
      if (openai) {
        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'user', content: systemPrompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          });

          text = response.choices[0].message.content || '{"results": []}';
          this.logger.log(`AI Search Grounding Raw Response: ${text}`);
        } catch (err: any) {
          if (geminiApiKey) {
            this.logger.error(`OpenAI Search Grounding failed: ${err.message}. Trying Gemini fallback...`);
            text = await this.callGeminiSearch(systemPrompt, geminiApiKey);
          } else {
            throw err;
          }
        }
      } else {
        text = await this.callGeminiSearch(systemPrompt, geminiApiKey);
      }

      const cleanedText = this.cleanJsonString(text);
      const parsed = JSON.parse(cleanedText);
      const resultsArray = Array.isArray(parsed.results) ? parsed.results : [];

      return resultsArray.map((item: any) => {
        const itemUrl = item.url || '';
        const sourceKind = this.determineSourceKind(itemUrl);

        return {
          url: itemUrl,
          title: item.title || '',
          snippet: item.snippet || '',
          sourceKind,
          reliabilityScore: this.getReliabilityScoreForKind(sourceKind),
        };
      });
    } catch (error: any) {
      this.logger.error(`Error performing AI Search Grounding: ${error.message}`);
      throw error;
    }
  }

  private determineSourceKind(url: string): SourceKind {
    const itemUrl = url.toLowerCase();
    if (itemUrl.includes('forum') || itemUrl.includes('reddit') || itemUrl.includes('club') || itemUrl.includes('donanimhaber')) {
      return SourceKind.FORUM;
    } else if (itemUrl.includes('complaint') || itemUrl.includes('sikayetvar') || itemUrl.includes('pissedconsumer')) {
      return SourceKind.COMPLAINT_PLATFORM;
    } else if (itemUrl.includes('recall') || itemUrl.includes('nhtsa') || itemUrl.includes('gov')) {
      return SourceKind.OFFICIAL_RECALL;
    } else if (itemUrl.includes('manual') || itemUrl.includes('manufacturer') || itemUrl.includes('service')) {
      return SourceKind.MANUFACTURER;
    } else if (itemUrl.includes('blog') || itemUrl.includes('review')) {
      return SourceKind.BLOG_REVIEW;
    } else if (itemUrl.includes('youtube') || itemUrl.includes('video')) {
      return SourceKind.VIDEO_REVIEW;
    }
    return SourceKind.UNKNOWN;
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

  private cleanJsonString(str: string): string {
    let cleaned = str.trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    let inString = false;
    let escaped = '';
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '"' && (i === 0 || cleaned[i - 1] !== '\\')) {
        inString = !inString;
        escaped += char;
      } else if (inString && char === '\n') {
        escaped += '\\n';
      } else if (inString && char === '\r') {
        escaped += '\\r';
      } else if (inString && char === '\t') {
        escaped += '\\t';
      } else {
        escaped += char;
      }
    }
    return escaped;
  }

  private async callGeminiSearch(prompt: string, apiKey: string): Promise<string> {
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-lite-latest'];
    let lastError: Error | null = null;

    for (const modelName of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini model ${modelName} returned status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '{"results": []}';
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Gemini model ${modelName} failed inside callGeminiSearch: ${err.message}. Trying next model...`);
      }
    }

    throw lastError || new Error('All Gemini models failed inside callGeminiSearch');
  }
}
