import { Injectable, Logger } from '@nestjs/common';
import { AiProviderAdapter, AiProviderResponse } from './ai-provider.interface';

@Injectable()
export class GeminiAdapter implements AiProviderAdapter {
  readonly providerName = 'GeminiAdapter';
  private readonly logger = new Logger(GeminiAdapter.name);

  async generateAnswer(
    systemPrompt: string,
    userMessage: string,
    contextJson: any,
  ): Promise<AiProviderResponse> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      throw new Error('Gemini API key is unconfigured');
    }

    const fullPrompt = `${systemPrompt}\n\n--- LISTING_CONTEXT (JSON) ---\n${JSON.stringify(
      contextJson,
      null,
      2,
    )}\n\n--- KULLANICI MESAJI ---\n${userMessage}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Gemini API HTTP Error ${response.status}: ${errText}`);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const candidateText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Gemini API returned empty response candidates');
    }

    return {
      answer: candidateText.trim(),
      rawResponse: data,
      providerName: this.providerName,
      tokenCount: data?.usageMetadata?.totalTokenCount || 0,
    };
  }
}
