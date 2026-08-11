import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AdminAuditLogService {
  constructor(private prisma: PrismaService) {}

  async logAction(data: {
    adminUserId: string;
    adminEmail?: string;
    action: string;
    entityType: string;
    entityId: string;
    changedFields?: string[];
    beforeState?: any;
    afterState?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.adminAuditLog.create({
      data: {
        adminUserId: data.adminUserId,
        adminEmail: data.adminEmail || 'Admin',
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        changedFields: data.changedFields || [],
        before: data.beforeState ? (data.beforeState as any) : undefined,
        after: data.afterState ? (data.afterState as any) : undefined,
        metadata: data.ipAddress || data.userAgent ? ({ ipAddress: data.ipAddress, userAgent: data.userAgent } as any) : undefined,
      },
    });
  }

  async getGlobalAuditLogs(params: {
    search?: string;
    entityType?: string;
    adminUserId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.entityType) where.entityType = params.entityType;
    if (params.adminUserId) where.adminUserId = params.adminUserId;

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { action: { contains: s, mode: 'insensitive' } },
        { entityType: { contains: s, mode: 'insensitive' } },
        { entityId: { contains: s, mode: 'insensitive' } },
        { adminEmail: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
