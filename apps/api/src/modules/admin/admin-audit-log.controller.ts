import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuditLogService } from './admin-audit-log.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AdminPermission } from '../../common/enums/admin-permission.enum';

@ApiTags('Admin Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/audit-logs')
export class AdminAuditLogController {
  constructor(private auditLogService: AdminAuditLogService) {}

  @Get()
  @RequirePermissions(AdminPermission.AUDIT_VIEW)
  @ApiOperation({ summary: 'Get system-wide admin audit logs' })
  async getGlobalAuditLogs(
    @Query('search') search?: string,
    @Query('entityType') entityType?: string,
    @Query('adminUserId') adminUserId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.getGlobalAuditLogs({
      search,
      entityType,
      adminUserId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
