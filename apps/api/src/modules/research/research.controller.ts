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

  @Post('batch-populate')
  async batchPopulate(
    @Body()
    body: {
      countryCode: string;
      languageCode: string;
      marketRegion?: string;
      researchScope?: ResearchScope;
      limit?: number;
      onlyCoverage?: string[];
      dryRun: boolean;
      adminSecret?: string;
    },
  ) {
    const systemSecret = process.env.ADMIN_SECRET || 'torque-scout-super-secret-admin-key';
    if (body.adminSecret !== systemSecret) {
      throw new BadRequestException('Unauthorized batch request.');
    }

    if (!body.countryCode || !body.languageCode) {
      throw new BadRequestException('countryCode and languageCode are required.');
    }

    return this.researchService.batchPopulate({
      countryCode: body.countryCode,
      languageCode: body.languageCode,
      marketRegion: body.marketRegion,
      researchScope: body.researchScope || ResearchScope.FULL_REPORT,
      limit: body.limit || 100,
      onlyCoverage: body.onlyCoverage,
      dryRun: body.dryRun,
    });
  }

  @Post('process-next')
  @HttpCode(HttpStatus.OK)
  async processNext() {
    const processed = await this.researchService.processNextJob();
    return { success: true, processed };
  }
}
