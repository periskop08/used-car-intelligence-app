import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataQualityService } from './data-quality.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AdminPermission } from '../../common/enums/admin-permission.enum';
import { GetUser, UserPayload } from '../auth/get-user.decorator';

@ApiTags('Admin Data Quality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vehicles/admin/quality-check')
export class DataQualityController {
  constructor(private qualityService: DataQualityService) {}

  @Get()
  @RequirePermissions(AdminPermission.VEHICLE_DATA_READ)
  @ApiOperation({ summary: 'Get vehicle data quality overview & metrics' })
  async getOverview() {
    return this.qualityService.getQualityOverview();
  }

  @Post('preview')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_READ)
  @ApiOperation({ summary: 'Preview proposed data quality normalization fix' })
  async previewFix(@Body() dto: { issueId: string }) {
    return this.qualityService.previewFix(dto.issueId);
  }

  @Post('apply')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_WRITE)
  @ApiOperation({ summary: 'Apply explicit admin-approved data quality fix' })
  async applyFix(
    @GetUser() user: UserPayload,
    @Body() dto: { issueId: string; fixData: any },
  ) {
    return this.qualityService.applyFix(dto.issueId, dto.fixData, user.id, user.email);
  }
}
