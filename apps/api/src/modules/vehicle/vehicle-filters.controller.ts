import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.service';

export function getBodyTypeTr(bt: string): string {
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

export function getBodyTypeEnum(tr: string): string {
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

export function getFuelTypeTr(ft: string): string {
  if (!ft) return 'Benzin';
  const upper = ft.toUpperCase();
  if (upper === 'PETROL') return 'Benzin';
  if (upper === 'DIESEL') return 'Dizel';
  if (upper === 'HYBRID' || upper === 'PLUG_IN_HYBRID') return 'Hibrit';
  if (upper === 'ELECTRIC') return 'Elektrik';
  if (upper === 'LPG') return 'LPG & Benzin';
  return 'Benzin';
}

export function getFuelTypeEnums(tr: string): string[] {
  const clean = tr.toLowerCase().trim();
  if (clean === 'benzin') return ['PETROL'];
  if (clean === 'dizel') return ['DIESEL'];
  if (clean === 'hibrit') return ['HYBRID', 'PLUG_IN_HYBRID'];
  if (clean === 'elektrik') return ['ELECTRIC'];
  if (clean === 'lpg & benzin' || clean === 'lpg') return ['LPG'];
  return ['PETROL'];
}

export function getTransmissionTr(name: string): string {
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
    const brands = await this.prisma.brand.findMany({
      where: {
        variants: { some: { status: 'APPROVED' } },
      },
      orderBy: { name: 'asc' },
      select: { name: true },
    });
    return {
      success: true,
      data: brands.map(b => ({ label: b.name, value: b.name })),
    };
  }

  @Get('models')
  @ApiOperation({ summary: 'Seçilen Markaya Ait Modeller' })
  @ApiQuery({ name: 'brand', required: true })
  async getModels(@Query('brand') brand: string) {
    if (!brand) {
      throw new BadRequestException('brand query parametresi gereklidir.');
    }
    const models = await this.prisma.model.findMany({
      where: {
        brand: { name: { equals: brand, mode: 'insensitive' } },
        variants: { some: { status: 'APPROVED' } },
      },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const modelsSet = new Set(models.map(m => m.name));
    const sortedModels = Array.from(modelsSet).sort();
    return {
      success: true,
      data: sortedModels.map(name => ({ label: name, value: name })),
    };
  }

  @Get('years')
  @ApiOperation({ summary: 'Seçilen Marka ve Modele Ait Yıllar' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'modelFamily', required: false })
  @ApiQuery({ name: 'model', required: false })
  async getYears(
    @Query('brand') brand: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
  ) {
    const targetModel = model || modelFamily;
    if (!brand || !targetModel) {
      throw new BadRequestException('brand ve modelFamily query parametreleri gereklidir.');
    }
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        year: { gte: 2000 },
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
      },
      select: { year: true },
    });
    const yearsSet = new Set(variants.map(v => v.year));
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    return {
      success: true,
      data: sortedYears.map(yr => ({ label: yr.toString(), value: yr.toString() })),
    };
  }

  @Get('body-types')
  @ApiOperation({ summary: 'Seçilen Marka, Model ve Yıla Ait Kasa Tipleri' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'modelFamily', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'year', required: true })
  async getBodyTypes(
    @Query('brand') brand?: string,
    @Query('year') year?: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
  ) {
    try {
      const targetModel = model || modelFamily;
      const parsedYear = parseInt(String(year), 10);
      if (!brand || !targetModel || isNaN(parsedYear)) {
        return { success: true, data: [] };
      }
      const variants = await this.prisma.vehicleVariant.findMany({
        where: {
          status: 'APPROVED',
          brand: { name: { equals: brand, mode: 'insensitive' } },
          model: { name: { equals: targetModel, mode: 'insensitive' } },
          year: parsedYear,
        },
        select: { bodyType: true },
      });
      const typesSet = new Set(variants.map(v => getBodyTypeTr(v.bodyType?.toString() || '')));
      const sortedTypes = Array.from(typesSet).filter(Boolean).sort();
      return {
        success: true,
        data: sortedTypes.map(name => ({ label: name, value: name })),
      };
    } catch (err: any) {
      return { success: true, data: [] };
    }
  }

  @Get('engines')
  @ApiOperation({ summary: 'Seçilen Kombinasyona Ait Motor Seçenekleri' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'modelFamily', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'bodyType', required: false })
  @ApiQuery({ name: 'body_type', required: false })
  async getEngines(
    @Query('brand') brand?: string,
    @Query('year') year?: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
    @Query('bodyType') bodyType?: string,
    @Query('body_type') bodyTypeLegacy?: string,
  ) {
    const targetModel = model || modelFamily;
    const targetBodyType = bodyType || bodyTypeLegacy;
    if (!brand || !targetModel || !year) {
      return { success: true, data: [] };
    }
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
        year: Number(year),
      },
      select: { engine: { select: { code: true } } },
    });
    const enginesSet = new Set(variants.map(v => v.engine?.code).filter(Boolean));
    const sortedEngines = Array.from(enginesSet).sort();
    return {
      success: true,
      data: sortedEngines.map(code => ({ label: code, value: code })),
    };
  }

  @Get('fuel-types')
  @ApiOperation({ summary: 'Seçilen Kombinasyona Ait Yakıt Tipleri' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'modelFamily', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'bodyType', required: false })
  @ApiQuery({ name: 'body_type', required: false })
  @ApiQuery({ name: 'engineVersion', required: false })
  @ApiQuery({ name: 'engine', required: false })
  async getFuelTypes(
    @Query('brand') brand?: string,
    @Query('year') year?: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
    @Query('bodyType') bodyType?: string,
    @Query('body_type') bodyTypeLegacy?: string,
    @Query('engineVersion') engineVersion?: string,
    @Query('engine') engineLegacy?: string,
  ) {
    const targetModel = model || modelFamily;
    const targetBodyType = bodyType || bodyTypeLegacy;
    const targetEngine = engineVersion || engineLegacy;
    if (!brand || !targetModel || !year) {
      return { success: true, data: [] };
    }
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
        year: Number(year),
        ...(targetEngine ? { engine: { code: targetEngine } } : {}),
      },
      select: { fuelType: true },
    });
    const order = ['Benzin', 'Dizel', 'Hibrit', 'Elektrik', 'LPG & Benzin'];
    const fuelsSet = new Set(variants.map(v => getFuelTypeTr(v.fuelType?.toString() || '')));
    const sortedFuels = Array.from(fuelsSet).filter(Boolean).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return {
      success: true,
      data: sortedFuels.map(name => ({ label: name, value: name })),
    };
  }

  @Get('transmissions')
  @ApiOperation({ summary: 'Seçilen Kombinasyona Ait Şanzıman Tipleri' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'modelFamily', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'bodyType', required: false })
  @ApiQuery({ name: 'body_type', required: false })
  @ApiQuery({ name: 'engineVersion', required: false })
  @ApiQuery({ name: 'engine', required: false })
  @ApiQuery({ name: 'fuelType', required: false })
  @ApiQuery({ name: 'fuel_type', required: false })
  async getTransmissions(
    @Query('brand') brand?: string,
    @Query('year') year?: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
    @Query('bodyType') bodyType?: string,
    @Query('body_type') bodyTypeLegacy?: string,
    @Query('engineVersion') engineVersion?: string,
    @Query('engine') engineLegacy?: string,
    @Query('fuelType') fuelType?: string,
    @Query('fuel_type') fuelTypeLegacy?: string,
  ) {
    const targetModel = model || modelFamily;
    const targetBodyType = bodyType || bodyTypeLegacy;
    const targetEngine = engineVersion || engineLegacy;
    const targetFuel = fuelType || fuelTypeLegacy;
    if (!brand || !targetModel || !year) {
      return { success: true, data: [] };
    }
    const fuelEnums = targetFuel ? getFuelTypeEnums(targetFuel) : undefined;
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
        year: Number(year),
        ...(targetEngine ? { engine: { code: targetEngine } } : {}),
        ...(fuelEnums ? { fuelType: { in: fuelEnums as any } } : {}),
      },
      select: { transmission: { select: { name: true } } },
    });
    const order = ['Manuel', 'Otomatik', 'Yarı Otomatik'];
    const transSet = new Set(variants.map(v => getTransmissionTr(v.transmission?.name || '')));
    const sortedTrans = Array.from(transSet).filter(Boolean).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return {
      success: true,
      data: sortedTrans.map(name => ({ label: name, value: name })),
    };
  }

  @Get('trims')
  @ApiOperation({ summary: 'Seçilen Kombinasyona Ait Donanım Paketleri' })
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'modelFamily', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'bodyType', required: false })
  @ApiQuery({ name: 'body_type', required: false })
  @ApiQuery({ name: 'engineVersion', required: false })
  @ApiQuery({ name: 'engine', required: false })
  @ApiQuery({ name: 'fuelType', required: false })
  @ApiQuery({ name: 'fuel_type', required: false })
  @ApiQuery({ name: 'transmissionType', required: false })
  @ApiQuery({ name: 'transmission_type', required: false })
  @ApiQuery({ name: 'transmission', required: false })
  async getTrims(
    @Query('brand') brand?: string,
    @Query('year') year?: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
    @Query('bodyType') bodyType?: string,
    @Query('body_type') bodyTypeLegacy?: string,
    @Query('engineVersion') engineVersion?: string,
    @Query('engine') engineLegacy?: string,
    @Query('fuelType') fuelType?: string,
    @Query('fuel_type') fuelTypeLegacy?: string,
    @Query('transmissionType') transmissionType?: string,
    @Query('transmission_type') transmissionTypeLegacy?: string,
    @Query('transmission') transmissionDirect?: string,
  ) {
    const targetModel = model || modelFamily;
    const targetBodyType = bodyType || bodyTypeLegacy;
    const targetEngine = engineVersion || engineLegacy;
    const targetFuel = fuelType || fuelTypeLegacy;
    const targetTrans = transmissionType || transmissionTypeLegacy || transmissionDirect;
    if (!brand || !targetModel || !year) {
      return { success: true, data: [] };
    }
    const fuelEnums = targetFuel ? getFuelTypeEnums(targetFuel) : undefined;
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
        year: Number(year),
        ...(targetEngine ? { engine: { code: targetEngine } } : {}),
        ...(fuelEnums ? { fuelType: { in: fuelEnums as any } } : {}),
      },
      select: {
        id: true,
        trim: { select: { name: true } },
        transmission: { select: { name: true } },
      },
      take: 50,
    });

    const filtered = targetTrans
      ? variants.filter(v => getTransmissionTr(v.transmission?.name || '').toLowerCase() === targetTrans.toLowerCase() || (v.transmission?.name || '').toLowerCase().includes(targetTrans.toLowerCase()))
      : variants;

    const trimsSet = new Set(filtered.map(v => v.trim?.name).filter(Boolean));
    const sortedTrims = Array.from(trimsSet).sort();

    if (sortedTrims.length === 0) {
      const allTrims = Array.from(new Set(variants.map(v => v.trim?.name).filter(Boolean))).sort();
      if (allTrims.length > 0) {
        return {
          success: true,
          data: allTrims.map(name => ({ label: name, value: name })),
          autoVariantId: variants[0]?.id || null,
        };
      }
      return {
        success: true,
        data: [{ label: 'Standart / Baz', value: 'Standart / Baz' }],
        autoVariantId: variants[0]?.id || null,
      };
    }

    return {
      success: true,
      data: sortedTrims.map(name => ({ label: name, value: name })),
      autoVariantId: filtered[0]?.id || variants[0]?.id || null,
    };
  }

  @Get('match-variant')
  @ApiOperation({ summary: 'Seçilen Tüm Kriterlere Uygun Araç Varyantı Kimliğini Al' })
  async matchVariant(
    @Query('brand') brand?: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
    @Query('year') year?: string,
    @Query('bodyType') bodyType?: string,
    @Query('body_type') bodyTypeLegacy?: string,
    @Query('engineVersion') engineVersion?: string,
    @Query('engine') engineLegacy?: string,
    @Query('fuelType') fuelType?: string,
    @Query('fuel_type') fuelTypeLegacy?: string,
    @Query('trimPackage') trimPackage?: string,
    @Query('trim') trimLegacy?: string,
    @Query('transmissionType') transmissionType?: string,
    @Query('transmission') transmissionLegacy?: string,
    @Query('transmission_type') transmissionTypeLegacy?: string,
  ) {
    const targetModel = model || modelFamily;
    const targetBodyType = bodyType || bodyTypeLegacy;
    const targetEngine = engineVersion || engineLegacy;
    const targetFuel = fuelType || fuelTypeLegacy;
    const targetTrim = trimPackage || trimLegacy;
    const targetTrans = transmissionType || transmissionLegacy || transmissionTypeLegacy;

    if (!brand || !targetModel || !year) {
      throw new BadRequestException('Gerekli query parametreleri eksik.');
    }

    const fuelEnums = targetFuel ? getFuelTypeEnums(targetFuel) : undefined;
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
        year: Number(year),
        ...(targetEngine ? { engine: { code: targetEngine } } : {}),
        ...(fuelEnums ? { fuelType: { in: fuelEnums as any } } : {}),
        ...(targetTrim && targetTrim !== 'Standart / Baz' ? { trim: { name: { equals: targetTrim, mode: 'insensitive' } } } : {}),
      },
      include: { transmission: true, trim: true },
      take: 20,
    });

    if (variants.length === 0) {
      const fallbackVariants = await this.prisma.vehicleVariant.findMany({
        where: {
          status: 'APPROVED',
          brand: { name: { equals: brand, mode: 'insensitive' } },
          model: { name: { equals: targetModel, mode: 'insensitive' } },
          year: Number(year),
        },
        take: 5,
      });
      return {
        success: true,
        variantId: fallbackVariants[0]?.id || null,
      };
    }

    const matched = targetTrans
      ? variants.find(v => getTransmissionTr(v.transmission.name).toLowerCase() === targetTrans.toLowerCase() || v.transmission.name.toLowerCase().includes(targetTrans.toLowerCase()))
      : variants[0];

    return {
      success: true,
      variantId: matched ? matched.id : variants[0].id,
    };
  }
}
