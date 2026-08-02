export interface AiProviderResponse {
  answer: string;
  rawResponse?: any;
  providerName: string;
  tokenCount?: number;
}

export interface AiProviderAdapter {
  readonly providerName: string;
  generateAnswer(systemPrompt: string, userMessage: string, contextJson: any): Promise<AiProviderResponse>;
}
