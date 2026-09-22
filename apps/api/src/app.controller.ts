import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'API Health Check' })
  @ApiResponse({ status: 200, description: 'API is healthy and online.' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      providers: {
        hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
        hasGeminiKey: Boolean(
          process.env.GEMINI_API_KEY ||
          process.env.GOOGLE_AI_KEY ||
          process.env.GOOGLE_AI_API_KEY
        ),
        primaryProvider: (
          process.env.LISTING_AI_PRIMARY_PROVIDER ||
          (process.env.OPENAI_API_KEY ? 'openai' : 'gemini')
        ).toLowerCase(),
      },
    };
  }
}
