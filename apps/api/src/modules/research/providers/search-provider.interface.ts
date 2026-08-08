/**
 * search-provider.interface.ts
 * 
 * Abstract interface for Automotive Web Search and Content Extraction Providers.
 */

export interface SearchResultItem {
  title: string;
  url: string;
  domain?: string;
  snippet: string;
  contentMarkdown?: string;
  publishedDate?: string;
  score?: number;
  sourceKind?: any;
  reliabilityScore?: number;
}

export interface SearchResponse {
  provider: 'tavily' | 'gemini' | 'firecrawl' | 'serper' | 'mock';
  query: string;
  results: SearchResultItem[];
}

export interface ISearchProvider {
  name?: string;
  search(query: string, languageCode?: any, countryCode?: any): Promise<any>;
  extractContent?(urls: string[]): Promise<Map<string, string>>;
}

// Backward compatibility type aliases
export type SearchProvider = ISearchProvider;
export type SearchResult = SearchResultItem;
