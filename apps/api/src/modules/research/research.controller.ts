import { Controller, Post, Get, Param, Query, Body, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { ResearchService } from './research.service';
import { ResearchScope, PriorityLevel } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

@Controller('research')
export class ResearchController {
  constructor(
    private researchService: ResearchService,
    private prisma: PrismaService,
  ) {}

  @Post('request')
  async requestResearch(
    @Body()
    body: {
      variantId: string;
      userId: string;
      languageCode?: string;
      countryCode?: string;
      researchScope?: ResearchScope;
      priority?: PriorityLevel;
    },
  ) {
    const { variantId, userId, languageCode, countryCode, researchScope, priority } = body;
    if (!variantId || !userId) {
      throw new BadRequestException('variantId and userId are required.');
    }

    const jobId = await this.researchService.requestResearch(
      variantId,
      userId,
      languageCode || 'tr',
      countryCode || 'TR',
      researchScope || ResearchScope.FULL_REPORT,
      priority || PriorityLevel.MEDIUM
    );

    return { success: true, jobId };
  }

  @Get('jobs')
  async listJobs() {
    return this.prisma.vehicleResearchJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        variant: {
          include: {
            brand: true,
            model: true,
          },
        },
      },
    });
  }

  @Get('jobs/:id')
  async getJobStatus(@Param('id') id: string) {
    const job = await this.prisma.vehicleResearchJob.findUnique({
      where: { id },
      include: {
        variant: {
          include: {
            brand: true,
            model: true,
          },
        },
      },
    });
    if (!job) {
      throw new BadRequestException('Job not found.');
    }
    return job;
  }

  @Post('process-next')
  @HttpCode(HttpStatus.OK)
  async processNext() {
    const processed = await this.researchService.processNextJob();
    return { success: true, processed };
  }
}
