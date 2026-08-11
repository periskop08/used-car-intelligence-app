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
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    const fullPrompt = `${systemPrompt}\n\n--- LISTING_CONTEXT (JSON) ---\n${JSON.stringify(
      contextJson,
      null,
      2,
    )}\n\n--- KULLANICI MESAJI ---\n${userMessage}`;

    if (apiKey) {
      // Models to try in sequence (Updated to active 2.5 series models)
      const models = [
        process.env.GEMINI_REPORT_MODEL || 'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash',
      ];

      const isReportIntent = userMessage.includes('[INTENT: VEHICLE_FULL_REPORT]');

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
                temperature: 0.3,
                maxOutputTokens: isReportIntent ? 16384 : 4000,
                ...(isReportIntent ? { responseMimeType: 'application/json' } : {}),
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidateText && candidateText.trim().length > 10) {
              return {
                answer: candidateText.trim(),
                rawResponse: data,
                providerName: `${this.providerName} (${model})`,
                tokenCount: data?.usageMetadata?.totalTokenCount || 0,
              };
            }
          } else {
            const errText = await response.text();
            this.logger.warn(`Gemini model ${model} HTTP Error ${response.status}: ${errText}`);
          }
        } catch (err: any) {
          this.logger.warn(`Gemini model ${model} call failed: ${err?.message || err}`);
        }
      }
    }

    // Try OpenAI fallback if OPENAI_API_KEY is available
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (openAiApiKey) {
      try {
        const url = 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: fullPrompt },
            ],
            temperature: 0.3,
            max_tokens: 3500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content && content.trim().length > 10) {
            return {
              answer: content.trim(),
              rawResponse: data,
              providerName: 'OpenAI (gpt-4o-mini)',
              tokenCount: data?.usage?.total_tokens || 0,
            };
          }
        }
      } catch (e: any) {
        this.logger.warn(`OpenAI fallback in GeminiAdapter failed: ${e?.message || e}`);
      }
    }

    throw new Error('All Gemini & OpenAI API endpoints failed or keys unconfigured.');
  }
}
