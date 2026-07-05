import { Controller, Post, Get, Param, Query, Body, BadRequestException, HttpCode, HttpStatus, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ResearchService } from './research.service';
import { ResearchScope, PriorityLevel } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { JwtService } from '@nestjs/jwt';

@Controller('research')
export class ResearchController {
  constructor(
    private researchService: ResearchService,
    private prisma: PrismaService,
    private jwtService: JwtService,
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
    @Request() req: any,
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
    const isSecretValid = body.adminSecret === systemSecret;

    let isAuthorized = isSecretValid;

    if (!isAuthorized) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const payload = await this.jwtService.verifyAsync(token, {
            secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
          });
          const user = await this.prisma.user.findUnique({
            where: { id: payload.id },
          });
          if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
            isAuthorized = true;
          }
        } catch (e) {
          // Token invalid
        }
      }
    }

    if (!isAuthorized) {
      throw new UnauthorizedException('Access denied. Valid ADMIN role or system secret is required.');
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
