import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AdminPermission } from '../../common/enums/admin-permission.enum';
import { AdminVehicleReportsService } from './admin-vehicle-reports.service';
import {
  ListAdminVehicleReportsDto,
  SaveDraftVehicleReportDto,
  PublishVehicleReportDto,
  ResolveReportFeedbackDto,
} from './admin-vehicle-reports.dto';

@ApiTags('Admin Vehicle Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/vehicle-reports')
export class AdminVehicleReportsController {
  constructor(private readonly service: AdminVehicleReportsService) {}

  private getAdminUser(req: any): { id: string; email: string } {
    return {
      id: req.user?.id || 'admin_user',
      email: req.user?.email || 'admin@torquescout.com',
    };
  }

  @Get()
  @RequirePermissions(AdminPermission.VEHICLE_DATA_READ)
  @ApiOperation({ summary: 'List saved and generated vehicle reports' })
  async listReports(@Query() query: ListAdminVehicleReportsDto) {
    return this.service.listReports(query);
  }

  @Get(':id')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_READ)
  @ApiOperation({ summary: 'Get full vehicle report detail with canonical specs and revisions' })
  async getReportDetail(@Param('id') id: string) {
    return this.service.getReportDetail(id);
  }

  @Get(':id/revisions')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_READ)
  @ApiOperation({ summary: 'Get all revisions of a vehicle report' })
  async getReportRevisions(@Param('id') id: string) {
    return this.service.getReportRevisions(id);
  }

  @Post(':id/draft')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_WRITE)
  @ApiOperation({ summary: 'Save section edits as a new draft revision' })
  async saveDraft(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SaveDraftVehicleReportDto,
  ) {
    const admin = this.getAdminUser(req);
    return this.service.saveDraftRevision(id, admin.id, admin.email, dto);
  }

  @Post(':id/revisions/:revisionId/publish')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_WRITE)
  @ApiOperation({ summary: 'Atomically publish a revision as the current report' })
  async publishRevision(
    @Request() req: any,
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Body() dto: PublishVehicleReportDto,
  ) {
    const admin = this.getAdminUser(req);
    return this.service.publishRevision(id, revisionId, admin.id, admin.email, dto);
  }

  @Post(':id/revisions/:revisionId/restore')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_WRITE)
  @ApiOperation({ summary: 'Restore a past revision as a new draft' })
  async restoreRevision(
    @Request() req: any,
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
  ) {
    const admin = this.getAdminUser(req);
    return this.service.restoreRevision(id, revisionId, admin.id, admin.email);
  }

  @Post(':id/research-refresh')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_WRITE)
  @ApiOperation({ summary: 'Trigger research refresh pipeline and save as new draft' })
  async triggerResearchRefresh(@Request() req: any, @Param('id') id: string) {
    const admin = this.getAdminUser(req);
    return this.service.triggerResearchRefresh(id, admin.id, admin.email);
  }

  @Patch('feedback/:feedbackId/resolve')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_WRITE)
  @ApiOperation({ summary: 'Mark user report feedback as resolved' })
  async resolveFeedback(
    @Request() req: any,
    @Param('feedbackId') feedbackId: string,
    @Body() dto: ResolveReportFeedbackDto,
  ) {
    const admin = this.getAdminUser(req);
    return this.service.resolveFeedback(feedbackId, admin.id, admin.email, dto);
  }
}
