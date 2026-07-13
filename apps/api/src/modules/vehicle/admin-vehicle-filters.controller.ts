import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.service';
import {
  getBodyTypeTr,
  getBodyTypeEnum,
  getFuelTypeTr,
  getFuelTypeEnums,
  getTransmissionTr,
} from './vehicle-filters.controller';

@ApiTags('Admin Vehicle Filters')
@Controller('admin/vehicle-variants')
export class AdminVehicleFiltersController {
  constructor(private prisma: PrismaService) {}

  @Get('debug/options')
  @ApiOperation({ summary: 'Admin/Debug: Option distribution count list' })
  async getDebugOptions(
    @Query('field') field: string,
    @Query('brand') brand: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
    @Query('year') year?: string,
    @Query('bodyType') bodyType?: string,
    @Query('body_type') bodyTypeLegacy?: string,
    @Query('engineVersion') engineVersion?: string,
    @Query('engine') engineLegacy?: string,
    @Query('fuelType') fuelType?: string,
    @Query('fuel_type') fuelTypeLegacy?: string,
    @Query('transmissionType') transmissionType?: string,
    @Query('transmission') transmissionLegacy?: string,
  ) {
    if (!field || !brand) {
      throw new BadRequestException('field ve brand query parametreleri gereklidir.');
    }
    const targetModel = model || modelFamily;
    const targetBodyType = bodyType || bodyTypeLegacy;
    const targetEngine = engineVersion || engineLegacy;
    const targetFuel = fuelType || fuelTypeLegacy;
    const targetTrans = transmissionType || transmissionLegacy;

    // Base filters
    const where: any = {
      brand: { name: { equals: brand, mode: 'insensitive' } },
    };
    if (targetModel) {
      where.model = { name: { equals: targetModel, mode: 'insensitive' } };
    }
    if (year) {
      where.year = Number(year);
    }
    if (targetBodyType) {
      where.bodyType = getBodyTypeEnum(targetBodyType) as any;
    }
    if (targetEngine) {
      where.engine = { code: targetEngine };
    }
    if (targetFuel) {
      const fuelEnums = getFuelTypeEnums(targetFuel);
      where.fuelType = { in: fuelEnums as any };
    }

    const variants = await this.prisma.vehicleVariant.findMany({
      where,
      include: {
        brand: true,
        model: true,
        engine: true,
        transmission: true,
        trim: true,
      },
    });

    const counts: Record<string, number> = {};

    variants.forEach((v) => {
      let value = '';
      if (field === 'bodyType') {
        value = getBodyTypeTr(v.bodyType?.toString() || '');
      } else if (field === 'engineVersion') {
        value = v.engine?.code || '';
      } else if (field === 'fuelType') {
        value = getFuelTypeTr(v.fuelType?.toString() || '');
      } else if (field === 'transmissionType') {
        value = getTransmissionTr(v.transmission?.name || '');
      } else if (field === 'trimPackage') {
        value = v.trim?.name || '';
      } else if (field === 'year') {
        value = v.year.toString();
      } else if (field === 'modelFamily') {
        value = v.model?.name || '';
      } else {
        value = v[field as keyof typeof v]?.toString() || '';
      }

      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });

    // If targetTrans is specified, filter by transmission Type in memory if field was trimPackage
    let options = Object.entries(counts).map(([val, count]) => ({
      value: val,
      count,
    }));

    if (field === 'trimPackage' && targetTrans) {
      // Recalculate options based on in-memory filtered variants
      const filteredCounts: Record<string, number> = {};
      variants
        .filter((v) => getTransmissionTr(v.transmission.name) === targetTrans)
        .forEach((v) => {
          const trimName = v.trim?.name || '';
          if (trimName) {
            filteredCounts[trimName] = (filteredCounts[trimName] || 0) + 1;
          }
        });
      options = Object.entries(filteredCounts).map(([val, count]) => ({
        value: val,
        count,
      }));
    }

    options.sort((a, b) => b.count - a.count);

    return {
      field,
      filters: {
        brand,
        modelFamily: targetModel,
        year: year ? Number(year) : undefined,
        bodyType: targetBodyType,
        engineVersion: targetEngine,
        fuelType: targetFuel,
        transmissionType: targetTrans,
      },
      options,
    };
  }
}
