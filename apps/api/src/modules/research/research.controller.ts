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
    @Request() req: any,
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

    // Authenticate: x-admin-secret OR valid Bearer Token
    const systemSecret = process.env.ADMIN_SECRET || 'torque-scout-super-secret-admin-key';
    const headerSecret = req.headers['x-admin-secret'];
    let isAuthorized = headerSecret === systemSecret;

    if (!isAuthorized) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          await this.jwtService.verifyAsync(token, {
            secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
          });
          isAuthorized = true;
        } catch (e) {
          throw new UnauthorizedException('Invalid or expired authentication token');
        }
      }
    }

    if (!isAuthorized) {
      throw new UnauthorizedException('Authentication required to request research.');
    }

    const existingReport = await this.prisma.aiVehicleReport.findUnique({
      where: {
        variantId_languageCode: {
          variantId,
          languageCode: languageCode || 'tr',
        },
      },
    });
    if (existingReport && (existingReport.summary as any)?.trimWarning) {
      throw new BadRequestException('Böyle bir araç kombinasyonu gerçekte üretilmediği için araştırma yapılamaz.');
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
      variantIds?: string[];
    },
  ) {
    const systemSecret = process.env.ADMIN_SECRET || 'torque-scout-super-secret-admin-key';
    const headerSecret = req.headers['x-admin-secret'];
    const isSecretValid = headerSecret === systemSecret;

    let isAuthorized = isSecretValid;
    let actingUserId: string | null = null;

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
          actingUserId = user.id;
        }
      } catch (e) {
        // Token invalid
      }
    }

    if (!isAuthorized) {
      throw new UnauthorizedException('Access denied. Valid ADMIN role or system secret is required.');
    }

    if (!body.countryCode || !body.languageCode) {
      throw new BadRequestException('countryCode and languageCode are required.');
    }

    // Resolve an acting user ID for audit log if header-auth was used
    if (!actingUserId) {
      const systemUser = await this.prisma.user.findFirst();
      actingUserId = systemUser?.id || null;
    }

    // Trigger batch populate service
    const result = await this.researchService.batchPopulate({
      countryCode: body.countryCode,
      languageCode: body.languageCode,
      marketRegion: body.marketRegion,
      researchScope: body.researchScope || ResearchScope.FULL_REPORT,
      limit: body.limit || 100,
      onlyCoverage: body.onlyCoverage,
      dryRun: body.dryRun,
      variantIds: body.variantIds,
    });

    // Write audit log
    if (actingUserId) {
      await this.prisma.auditLog.create({
        data: {
          userId: actingUserId,
          action: 'BATCH_POPULATE_TRIGGER',
          details: {
            dryRun: body.dryRun,
            limit: body.limit || 100,
            countryCode: body.countryCode,
            languageCode: body.languageCode,
            matchedVariants: result.matchedVariants,
            wouldCreateJobs: result.wouldCreateJobs,
            variantIds: body.variantIds,
          },
        },
      });
    }

    return result;
  }

  @Post('process-next')
  @HttpCode(HttpStatus.OK)
  async processNext(@Request() req: any) {
    const systemSecret = process.env.ADMIN_SECRET || 'torque-scout-super-secret-admin-key';
    const headerSecret = req.headers['x-admin-secret'];
    let isAuthorized = headerSecret === systemSecret;

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
        } catch (e) {}
      }
    }

    if (!isAuthorized) {
      throw new UnauthorizedException('Access denied. Valid ADMIN role or system secret is required.');
    }

    const processed = await this.researchService.processNextJob();
    return { success: true, processed };
  }
}
