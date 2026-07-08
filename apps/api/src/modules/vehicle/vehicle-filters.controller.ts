import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.service';

function getBodyTypeTr(bt: string): string {
  if (!bt) return 'Sedan';
  const upper = bt.toUpperCase();
  if (upper === 'SEDAN') return 'Sedan';
  if (upper === 'HATCHBACK') return 'Hatchback';
  if (upper === 'SUV') return 'SUV';
  if (upper === 'COUPE') return 'Coupe';
  if (upper === 'CONVERTIBLE') return 'Cabrio';
  if (upper === 'WAGON') return 'Wagon';
  if (upper === 'MINIVAN') return 'Minivan';
  if (upper === 'VAN') return 'Van';
  if (upper === 'PICKUP') return 'Pick-up';
  return 'Sedan';
}

function getBodyTypeEnum(tr: string): string {
  const clean = tr.toLowerCase().trim();
  if (clean === 'sedan') return 'SEDAN';
  if (clean === 'hatchback') return 'HATCHBACK';
  if (clean === 'suv') return 'SUV';
  if (clean === 'coupe') return 'COUPE';
  if (clean === 'cabrio' || clean === 'cabriolet') return 'CONVERTIBLE';
  if (clean === 'wagon' || clean === 'station wagon') return 'WAGON';
  if (clean === 'minivan') return 'MINIVAN';
  if (clean === 'van') return 'VAN';
  if (clean === 'pick-up' || clean === 'pickup') return 'PICKUP';
  return 'SEDAN';
}

function getFuelTypeTr(ft: string): string {
  if (!ft) return 'Benzin';
  const upper = ft.toUpperCase();
  if (upper === 'PETROL') return 'Benzin';
  if (upper === 'DIESEL') return 'Dizel';
  if (upper === 'HYBRID' || upper === 'PLUG_IN_HYBRID') return 'Hibrit';
  if (upper === 'ELECTRIC') return 'Elektrik';
  if (upper === 'LPG') return 'LPG & Benzin';
  return 'Benzin';
}

function getFuelTypeEnums(tr: string): string[] {
  const clean = tr.toLowerCase().trim();
  if (clean === 'benzin') return ['PETROL'];
  if (clean === 'dizel') return ['DIESEL'];
  if (clean === 'hibrit') return ['HYBRID', 'PLUG_IN_HYBRID'];
  if (clean === 'elektrik') return ['ELECTRIC'];
  if (clean === 'lpg & benzin' || clean === 'lpg') return ['LPG'];
  return ['PETROL'];
}

function getTransmissionTr(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower.includes('manuel') || lower.includes('düz') || lower.includes('manual')) {
    return 'Manuel';
  }
  if (lower.includes('dsg') || lower.includes('edc') || lower.includes('powershift') || lower.includes('dct') || lower.includes('çift kavrama')) {
    return 'Yarı Otomatik';
  }
  return 'Otomatik';
}

@ApiTags('Vehicle Filters')
@Controller('vehicle-filters')
export class VehicleFiltersController {
  constructor(private prisma: PrismaService) {}

  @Get('brands')
  @ApiOperation({ summary: 'Doğrulanmış Marka Listesi' })
  async getBrands() {
    const variants = await this.prisma.vehicleVariant.findMany({
      where: { status: 'APPROVED' },
      select: { brand: { select: { name: true } } },
      distinct: ['brandId'],
    });
    const brands = variants.map(v => v.brand.name);
    brands.sort();
    return {
      success: true,
      data: brands.map(name => ({ label: name, value: name })),
    };
  }

  @Get('models')
  @ApiOperation({ summary: 'Seçilen Markaya Ait Modeller' })
  @ApiQuery({ name: 'brand', required: true })
  async getModels(@Query('brand') brand: string) {
    if (!brand) {
      throw new BadRequestException('brand query parametresi gereklidir.');
    }
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
      },
      select: { model: { select: { name: true } } },
      distinct: ['modelId'],
    });
    const models = variants.map(v => v.model.name);
    models.sort();
    return {
      success: true,
      data: models.map(name => ({ label: name, value: name })),
    };
  }

  @Get('body-types')
  @ApiOperation({ summary: 'Seçilen Marka ve Modele Ait Kasa Tipleri' })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'model', required: false })
  async getBodyTypes(@Query('brand') brand?: string, @Query('model') model?: string) {
    const bodyTypes = [
      'Sedan',
      'Hatchback',
      'SUV',
      'Coupe',
      'Cabrio',
      'Station Wagon',
      'Minivan',
      'Van',
      'Pick-up'
    ];
    return {
      success: true,
      data: bodyTypes.map(name => ({ label: name, value: name })),
    };
  }

  @Get('years')
  @ApiOperation({ summary: 'Seçilen Marka, Model ve Kasa Tipine Ait Yıllar' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'body_type', required: true })
  async getYears(
    @Query('brand') brand: string,
    @Query('model') model: string,
    @Query('body_type') bodyType: string,
  ) {
    if (!brand || !model || !bodyType) {
      throw new BadRequestException('brand, model ve body_type query parametreleri gereklidir.');
    }
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: model, mode: 'insensitive' } },
        bodyType: getBodyTypeEnum(bodyType) as any,
      },
      select: { year: true },
      distinct: ['year'],
    });
    const years = variants.map(v => v.year);
    years.sort((a, b) => b - a); // En yeni yıl ilk sırada
    return {
      success: true,
      data: years.map(yr => ({ label: yr.toString(), value: yr.toString() })),
    };
  }

  @Get('engines')
  @ApiOperation({ summary: 'Seçilen Marka, Model, Kasa Tipi ve Yıla Ait Motor Seçenekleri' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'body_type', required: true })
  @ApiQuery({ name: 'year', required: true })
  async getEngines(
    @Query('brand') brand: string,
    @Query('model') model: string,
    @Query('body_type') bodyType: string,
    @Query('year') year: string,
  ) {
    if (!brand || !model || !bodyType || !year) {
      throw new BadRequestException('brand, model, body_type ve year query parametreleri gereklidir.');
    }
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: model, mode: 'insensitive' } },
        bodyType: getBodyTypeEnum(bodyType) as any,
        year: Number(year),
      },
      select: { engine: { select: { code: true } } },
      distinct: ['engineId'],
    });
    const engines = variants.map(v => v.engine.code);
    engines.sort();
    return {
      success: true,
      data: engines.map(code => ({ label: code, value: code })),
    };
  }

  @Get('fuel-types')
  @ApiOperation({ summary: 'Seçilen Kombinasyona Ait Yakıt Tipleri' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'body_type', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'engine', required: true })
  async getFuelTypes(
    @Query('brand') brand: string,
    @Query('model') model: string,
    @Query('body_type') bodyType: string,
    @Query('year') year: string,
    @Query('engine') engine: string,
  ) {
    if (!brand || !model || !bodyType || !year || !engine) {
      throw new BadRequestException('Gerekli query parametreleri eksik.');
    }
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: model, mode: 'insensitive' } },
        bodyType: getBodyTypeEnum(bodyType) as any,
        year: Number(year),
        engine: { code: engine },
      },
      select: { fuelType: true },
      distinct: ['fuelType'],
    });
    const order = ['Benzin', 'Dizel', 'Hibrit', 'Elektrik', 'LPG & Benzin'];
    const fuelTypes = Array.from(new Set(variants.map(v => getFuelTypeTr(v.fuelType?.toString() || '')))).filter(Boolean);
    fuelTypes.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return {
      success: true,
      data: fuelTypes.map(name => ({ label: name, value: name })),
    };
  }

  @Get('transmissions')
  @ApiOperation({ summary: 'Seçilen Kombinasyona Ait Şanzıman Tipleri' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'body_type', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'engine', required: true })
  @ApiQuery({ name: 'fuel_type', required: true })
  async getTransmissions(
    @Query('brand') brand: string,
    @Query('model') model: string,
    @Query('body_type') bodyType: string,
    @Query('year') year: string,
    @Query('engine') engine: string,
    @Query('fuel_type') fuelType: string,
  ) {
    if (!brand || !model || !bodyType || !year || !engine || !fuelType) {
      throw new BadRequestException('Gerekli query parametreleri eksik.');
    }
    const fuelEnums = getFuelTypeEnums(fuelType);
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: model, mode: 'insensitive' } },
        bodyType: getBodyTypeEnum(bodyType) as any,
        year: Number(year),
        engine: { code: engine },
        fuelType: { in: fuelEnums as any },
      },
      select: { transmission: { select: { name: true } } },
      distinct: ['transmissionId'],
    });
    const order = ['Manuel', 'Otomatik', 'Yarı Otomatik'];
    const transmissions = Array.from(new Set(variants.map(v => getTransmissionTr(v.transmission.name)))).filter(Boolean);
    transmissions.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return {
      success: true,
      data: transmissions.map(name => ({ label: name, value: name })),
    };
  }

  @Get('trims')
  @ApiOperation({ summary: 'Seçilen Kombinasyona Ait Donanım Paketleri' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'body_type', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'engine', required: true })
  @ApiQuery({ name: 'fuel_type', required: true })
  @ApiQuery({ name: 'transmission_type', required: true })
  async getTrims(
    @Query('brand') brand: string,
    @Query('model') model: string,
    @Query('body_type') bodyType: string,
    @Query('year') year: string,
    @Query('engine') engine: string,
    @Query('fuel_type') fuelType: string,
    @Query('transmission_type') transmissionType: string,
  ) {
    if (!brand || !model || !bodyType || !year || !engine || !fuelType || !transmissionType) {
      throw new BadRequestException('Gerekli query parametreleri eksik.');
    }
    const fuelEnums = getFuelTypeEnums(fuelType);
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: model, mode: 'insensitive' } },
        bodyType: getBodyTypeEnum(bodyType) as any,
        year: Number(year),
        engine: { code: engine },
        fuelType: { in: fuelEnums as any },
      },
      select: {
        trim: { select: { name: true } },
        transmission: { select: { name: true } },
      },
    });
    const filtered = variants.filter(v => getTransmissionTr(v.transmission.name) === transmissionType);
    const trims = Array.from(new Set(filtered.map(v => v.trim.name))).filter(Boolean);
    trims.sort();
    if (trims.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Bu kombinasyon için doğrulanmış varyant bulunamadı.',
      };
    }
    return {
      success: true,
      data: trims.map(name => ({ label: name, value: name })),
    };
  }
}
