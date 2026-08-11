import { Injectable, Logger } from '@nestjs/common';
import { AiProviderAdapter, AiProviderResponse } from './ai-provider.interface';

@Injectable()
export class OpenAiAdapter implements AiProviderAdapter {
  readonly providerName = 'OpenAiAdapter';
  private readonly logger = new Logger(OpenAiAdapter.name);

  async generateAnswer(
    systemPrompt: string,
    userMessage: string,
    contextJson: any,
  ): Promise<AiProviderResponse> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key is unconfigured');
    }

    const fullPrompt = `${systemPrompt}\n\n--- LISTING_CONTEXT (JSON) ---\n${JSON.stringify(
      contextJson,
      null,
      2,
    )}\n\n--- KULLANICI MESAJI ---\n${userMessage}`;

    const url = 'https://api.openai.com/v1/chat/completions';

    const isReportIntent = userMessage.includes('[INTENT: VEHICLE_FULL_REPORT]');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.LISTING_AI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.3,
        max_tokens: isReportIntent ? 8192 : 4000,
        ...(isReportIntent ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`OpenAI API HTTP Error ${response.status}: ${errText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data?.choices?.[0]?.message?.content;

    if (!candidateText) {
      throw new Error('OpenAI API returned empty choices');
    }

    return {
      answer: candidateText.trim(),
      rawResponse: data,
      providerName: this.providerName,
      tokenCount: data?.usage?.total_tokens || 0,
    };
  }
}
