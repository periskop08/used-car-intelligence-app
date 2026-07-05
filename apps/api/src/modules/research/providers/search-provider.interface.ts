import { SourceKind } from '@used-car-intelligence/shared';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  sourceKind: SourceKind;
  rawText?: string;
  reliabilityScore: number;
}

export interface SearchProvider {
  search(query: string, languageCode: string, countryCode: string): Promise<SearchResult[]>;
}
