import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ListingAiService } from './listing-ai.service';
import { ListingAiQuotaService } from './listing-ai-quota.service';
import { ListingAiChatRequestDto, InitialAnalysisRequestDto } from './listing-ai.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller(['listings/:listingId', 'api/listings/:listingId'])
export class ListingAiController {
  constructor(
    private readonly listingAiService: ListingAiService,
    private readonly quotaService: ListingAiQuotaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('ai-conversation')
  async getConversation(@Param('listingId') listingId: string, @Req() req: any) {
    return this.listingAiService.getConversation(listingId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ai-chat/initial-analysis')
  async generateInitialAnalysis(
    @Param('listingId') listingId: string,
    @Body() dto: InitialAnalysisRequestDto,
    @Req() req: any,
  ) {
    return this.listingAiService.generateInitialAnalysis(listingId, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ai-chat')
  async sendChatMessage(
    @Param('listingId') listingId: string,
    @Body() dto: ListingAiChatRequestDto,
    @Req() req: any,
  ) {
    return this.listingAiService.sendChatMessage(listingId, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('ai-conversation')
  async archiveConversation(@Param('listingId') listingId: string, @Req() req: any) {
    return this.listingAiService.archiveConversation(listingId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ai-chat/quota')
  async getQuota(@Req() req: any) {
    return this.quotaService.getQuota(req.user.id);
  }
}
