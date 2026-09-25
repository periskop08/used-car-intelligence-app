import { Controller, Get, Query, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.service';
import { CanonicalDisplayService } from './canonical-display.service';

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
  if (clean === 'benzin') return ['PETROL', 'OTHER'];
  if (clean === 'dizel') return ['DIESEL', 'OTHER'];
  if (clean === 'hibrit') return ['HYBRID', 'PLUG_IN_HYBRID', 'OTHER'];
  if (clean === 'elektrik') return ['ELECTRIC', 'OTHER'];
  if (clean === 'lpg' || clean.includes('lpg')) return ['LPG', 'PETROL', 'OTHER'];
  return ['PETROL', 'OTHER'];
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

export function getTransmissionWhereClause(targetTrans?: string): any {
  if (!targetTrans) return {};
  const lower = targetTrans.toLowerCase().trim();
  if (lower.includes('manuel') || lower.includes('düz') || lower.includes('manual')) {
    return {
      transmission: {
        OR: [
          { name: { contains: 'manuel', mode: 'insensitive' } },
          { name: { contains: 'düz', mode: 'insensitive' } },
          { name: { contains: 'manual', mode: 'insensitive' } },
        ],
      },
    };
  }
  if (lower.includes('yarı') || lower.includes('semi')) {
    return {
      transmission: {
        OR: [
          { name: { contains: 'dsg', mode: 'insensitive' } },
          { name: { contains: 'edc', mode: 'insensitive' } },
          { name: { contains: 'powershift', mode: 'insensitive' } },
          { name: { contains: 'dct', mode: 'insensitive' } },
          { name: { contains: 'çift kavrama', mode: 'insensitive' } },
          { name: { contains: 'yarı otomatik', mode: 'insensitive' } },
        ],
      },
    };
  }
  // Otomatik / Automatic
  return {
    transmission: {
      NOT: [
        { name: { contains: 'manuel', mode: 'insensitive' } },
        { name: { contains: 'düz', mode: 'insensitive' } },
        { name: { contains: 'manual', mode: 'insensitive' } },
      ],
    },
  };
}

export function getCategoryVariantWhere(category?: string): any {
  if (!category) return {};
  const cat = category.toUpperCase().trim();
  if (cat === 'CAR' || cat === 'AUTOMOBILE') {
    return {
      bodyType: { in: ['SEDAN', 'HATCHBACK', 'COUPE', 'CONVERTIBLE', 'WAGON'] },
    };
  }
  if (cat === 'SUV_PICKUP' || cat === 'SUV' || cat === 'PICKUP') {
    return {
      bodyType: { in: ['SUV', 'PICKUP'] },
    };
  }
  if (cat === 'ELECTRIC' || cat === 'EV') {
    return {
      fuelType: 'ELECTRIC',
    };
  }
  if (cat === 'COMMERCIAL' || cat === 'MINIVAN' || cat === 'VAN') {
    return {
      bodyType: { in: ['MINIVAN', 'VAN'] },
    };
  }
  return {};
}

import { VariantTechnicalFactsService } from './variant-technical-facts.service';

@ApiTags('Vehicle Filters')
@Controller('vehicle-filters')
export class VehicleFiltersController {
  constructor(
    private prisma: PrismaService,
    private canonicalDisplayService: CanonicalDisplayService,
    private variantTechnicalFactsService: VariantTechnicalFactsService,
  ) {}

  @Get('variants/:id/technical-specs')
  @ApiOperation({ summary: 'Varyanta Ait Doğrulanmış Motor Hacmi ve Gücü Verisini Al (Read-Only)' })
  async getVariantTechnicalSpecs(@Param('id') id: string) {
    const facts = await this.variantTechnicalFactsService.getVariantTechnicalFacts(id);
    return {
      success: true,
      data: facts,
    };
  }

  @Get('brands')
  @ApiOperation({ summary: 'Doğrulanmış Marka Listesi' })
  @ApiQuery({ name: 'category', required: false, description: 'Taşıt kategorisi (AUTOMOBILE, SUV_PICKUP, ELECTRIC, COMMERCIAL)' })
  async getBrands(@Query('category') category?: string) {
    const categoryWhere = getCategoryVariantWhere(category);
    const brands = await this.prisma.brand.findMany({
      where: {
        variants: { some: { status: 'APPROVED', ...categoryWhere } },
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
  @ApiQuery({ name: 'category', required: false, description: 'Taşıt kategorisi (AUTOMOBILE, SUV_PICKUP, ELECTRIC, COMMERCIAL)' })
  async getModels(
    @Query('brand') brand: string,
    @Query('category') category?: string,
  ) {
    if (!brand) {
      throw new BadRequestException('brand query parametresi gereklidir.');
    }
    const categoryWhere = getCategoryVariantWhere(category);
    const models = await this.prisma.model.findMany({
      where: {
        brand: { name: { equals: brand, mode: 'insensitive' } },
        variants: { some: { status: 'APPROVED', ...categoryWhere } },
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
  @ApiQuery({ name: 'category', required: false })
  async getYears(
    @Query('brand') brand: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
    @Query('category') category?: string,
  ) {
    const targetModel = model || modelFamily;
    if (!brand || !targetModel) {
      throw new BadRequestException('brand ve modelFamily query parametreleri gereklidir.');
    }

    const categoryWhere = getCategoryVariantWhere(category);

    const modelRecord = await this.prisma.model.findFirst({
      where: {
        name: { equals: targetModel, mode: 'insensitive' },
        brand: { name: { equals: brand, mode: 'insensitive' } },
      },
      select: { id: true, startYear: true, endYear: true },
    });

    const yearWhere: any = {};
    if (modelRecord?.startYear) {
      yearWhere.gte = Math.max(2000, modelRecord.startYear);
    } else {
      yearWhere.gte = 2000;
    }
    if (modelRecord?.endYear) {
      yearWhere.lte = modelRecord.endYear;
    }

    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        year: yearWhere,
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...categoryWhere,
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
  @ApiQuery({ name: 'category', required: false })
  async getBodyTypes(
    @Query('brand') brand?: string,
    @Query('year') year?: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
    @Query('category') category?: string,
  ) {
    try {
      const targetModel = model || modelFamily;
      const parsedYear = parseInt(String(year), 10);
      if (!brand || !targetModel || isNaN(parsedYear)) {
        return { success: true, data: [] };
      }
      const categoryWhere = getCategoryVariantWhere(category);
      const variants = await this.prisma.vehicleVariant.findMany({
        where: {
          status: 'APPROVED',
          brand: { name: { equals: brand, mode: 'insensitive' } },
          model: { name: { equals: targetModel, mode: 'insensitive' } },
          year: parsedYear,
          ...categoryWhere,
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
  @ApiQuery({ name: 'fuelType', required: false })
  @ApiQuery({ name: 'fuel_type', required: false })
  async getEngines(
    @Query('brand') brand?: string,
    @Query('year') year?: string,
    @Query('modelFamily') modelFamily?: string,
    @Query('model') model?: string,
    @Query('bodyType') bodyType?: string,
    @Query('body_type') bodyTypeLegacy?: string,
    @Query('fuelType') fuelType?: string,
    @Query('fuel_type') fuelTypeLegacy?: string,
  ) {
    const targetModel = model || modelFamily;
    const targetBodyType = bodyType || bodyTypeLegacy;
    const targetFuel = fuelType || fuelTypeLegacy;
    const fuelEnums = targetFuel ? getFuelTypeEnums(targetFuel) : undefined;
    if (!brand || !targetModel || !year) {
      return { success: true, data: [] };
    }
    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
        ...(fuelEnums && fuelEnums.length > 0 ? { fuelType: { in: fuelEnums as any } } : {}),
        year: Number(year),
      },
      select: { id: true, engine: { select: { code: true } } },
    });

    const NON_ENGINE_TOKENS = new Set([
      'TOURING', 'GRAN TURISMO', 'COMPACT', 'GRAN COUPE', '5.0 JAHRE EDITION',
      'COUPE', 'CABRIO', 'ROADSTER', 'AVANT', 'SPORTBACK', 'ESTATE',
      'STANDART', 'EXECUTIVE', 'LOFT', 'SUITE', 'SIGNATURE', 'TECHNO',
      'XCLUSIVE', 'E XTRA', 'E XTREME', 'LS', 'LT', 'LA PRIMA', 'MY FIESTA',
      'ES', 'ECO', 'SS', 'HALO', 'LODGE', 'POLARSTAR', 'VISION', 'BOYUT',
      'EMOTION', 'GRAND PRIX', 'TERRA', 'SOL', 'LINEAR', 'VECTOR', 'PORTFOLIO',
      'M EXCELLENCE', 'REFLEX', 'SPIRIT', 'SPORT PLUS', 'TERRA SPORTY',
      'TORNADO', 'TORNADO CRAWLER', 'MACAN', 'MACAN TURBO', 'MAGNUM',
      'OBSIDIYEN', 'POWER SENSE PLUS', 'R SPORT PLUS', 'SINGLE ULTIMATE',
      'TWIN ULTIMATE', 'RECHARGE PRO', 'RECHARGE ULTIMATE', 'STORM'
    ]);

    const enginesSet = new Set(
      variants
        .map(v => {
          const rawCode = v.engine?.code;
          if (!rawCode || NON_ENGINE_TOKENS.has(rawCode.trim().toUpperCase())) return null;
          return this.canonicalDisplayService.getProjectedEngineCode(v.id, rawCode);
        })
        .filter(Boolean) as string[],
    );

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

    let engineFilterClause: any = {};
    if (targetEngine) {
      const candidates = await this.prisma.vehicleVariant.findMany({
        where: {
          status: 'APPROVED',
          brand: { name: { equals: brand, mode: 'insensitive' } },
          model: { name: { equals: targetModel, mode: 'insensitive' } },
          ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
          year: Number(year),
        },
        select: { id: true, engine: { select: { code: true } } },
      });
      const rawCodes = this.canonicalDisplayService.getRawEngineCodesForTarget(targetEngine, candidates);
      engineFilterClause = { engine: { code: { in: rawCodes } } };
    }

    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
        year: Number(year),
        ...engineFilterClause,
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

    let engineFilterClause: any = {};
    if (targetEngine) {
      const candidates = await this.prisma.vehicleVariant.findMany({
        where: {
          status: 'APPROVED',
          brand: { name: { equals: brand, mode: 'insensitive' } },
          model: { name: { equals: targetModel, mode: 'insensitive' } },
          ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
          year: Number(year),
        },
        select: { id: true, engine: { select: { code: true } } },
      });
      const rawCodes = this.canonicalDisplayService.getRawEngineCodesForTarget(targetEngine, candidates);
      engineFilterClause = { engine: { code: { in: rawCodes } } };
    }

    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
        year: Number(year),
        ...engineFilterClause,
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

    let engineFilterClause: any = {};
    if (targetEngine) {
      const candidates = await this.prisma.vehicleVariant.findMany({
        where: {
          status: 'APPROVED',
          brand: { name: { equals: brand, mode: 'insensitive' } },
          model: { name: { equals: targetModel, mode: 'insensitive' } },
          ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
          year: Number(year),
        },
        select: { id: true, engine: { select: { code: true } } },
      });
      const rawCodes = this.canonicalDisplayService.getRawEngineCodesForTarget(targetEngine, candidates);
      engineFilterClause = { engine: { code: { in: rawCodes } } };
    }

    const transFilterClause = getTransmissionWhereClause(targetTrans);

    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
        year: Number(year),
        ...engineFilterClause,
        ...(fuelEnums ? { fuelType: { in: fuelEnums as any } } : {}),
        ...transFilterClause,
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

    // 1. Try strict matching first
    let engineFilterClause: any = {};
    if (targetEngine) {
      const candidates = await this.prisma.vehicleVariant.findMany({
        where: {
          status: 'APPROVED',
          brand: { name: { equals: brand, mode: 'insensitive' } },
          model: { name: { equals: targetModel, mode: 'insensitive' } },
          ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
          year: Number(year),
        },
        select: { id: true, engine: { select: { code: true } } },
      });
      const rawCodes = this.canonicalDisplayService.getRawEngineCodesForTarget(targetEngine, candidates);
      if (rawCodes.length > 0) {
        engineFilterClause = { engine: { code: { in: rawCodes } } };
      }
    }

    const transFilterClause = targetTrans ? getTransmissionWhereClause(targetTrans) : {};

    const variants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        ...(targetBodyType ? { bodyType: getBodyTypeEnum(targetBodyType) as any } : {}),
        year: Number(year),
        ...engineFilterClause,
        ...(fuelEnums ? { fuelType: { in: fuelEnums as any } } : {}),
        ...(targetTrim && targetTrim !== 'Standart / Baz' ? { trim: { name: { equals: targetTrim, mode: 'insensitive' } } } : {}),
        ...transFilterClause,
      },
      include: { transmission: true, trim: true, engine: true },
      take: 50,
    });

    if (variants.length > 0) {
      let matched = targetTrans
        ? variants.find(v => {
            const vTrans = getTransmissionTr(v.transmission?.name || '').toLowerCase();
            const target = targetTrans.toLowerCase();
            if (target.includes('manuel') || target.includes('düz')) {
              return vTrans.includes('manuel') || vTrans.includes('düz') || v.transmission?.type === 'MANUAL';
            }
            if (target.includes('yarı')) {
              return vTrans.includes('yarı') || v.transmission?.type === 'DCT';
            }
            return !vTrans.includes('manuel') && !vTrans.includes('düz') && v.transmission?.type !== 'MANUAL';
          })
        : variants[0];

      if (targetTrim && targetTrim !== 'Standart / Baz') {
        const trimMatches = variants.filter(v => (v.trim?.name || '').toLowerCase() === targetTrim.toLowerCase());
        if (trimMatches.length > 0) {
          const transAndTrim = targetTrans
            ? trimMatches.find(v => {
                const vTrans = getTransmissionTr(v.transmission?.name || '').toLowerCase();
                const target = targetTrans.toLowerCase();
                if (target.includes('manuel') || target.includes('düz')) {
                  return vTrans.includes('manuel') || vTrans.includes('düz') || v.transmission?.type === 'MANUAL';
                }
                return !vTrans.includes('manuel') && !vTrans.includes('düz') && v.transmission?.type !== 'MANUAL';
              })
            : trimMatches[0];
          if (transAndTrim) matched = transAndTrim;
        }
      }

      return {
        success: true,
        variantId: matched ? matched.id : variants[0].id,
      };
    }

    // 2. Intelligent Ranked Fallback: Score all candidates for this brand + model + year
    const allYearVariants = await this.prisma.vehicleVariant.findMany({
      where: {
        status: 'APPROVED',
        brand: { name: { equals: brand, mode: 'insensitive' } },
        model: { name: { equals: targetModel, mode: 'insensitive' } },
        year: Number(year),
        ...transFilterClause, // Never cross-contaminate transmission even in fallback!
      },
      include: { transmission: true, trim: true, engine: true },
      take: 50,
    });

    if (allYearVariants.length === 0) {
      return { success: true, variantId: null };
    }

    // Rank candidates by matching attributes
    const scoredCandidates = allYearVariants.map(v => {
      let score = 0;
      const vFuelTr = getFuelTypeTr(v.fuelType).toLowerCase();
      const vTransTr = getTransmissionTr(v.transmission?.name || '').toLowerCase();
      const vEngineCode = (v.engine?.code || '').toLowerCase();
      const vTrimName = (v.trim?.name || '').toLowerCase();

      // Fuel match (highest priority: NEVER swap Diesel for Hybrid/Petrol)
      if (targetFuel) {
        if (vFuelTr === targetFuel.toLowerCase()) {
          score += 100;
        } else {
          score -= 500;
        }
      }

      // Transmission match (NEVER swap Manuel for Automatic)
      if (targetTrans) {
        const transTarget = targetTrans.toLowerCase();
        const isTargetManual = transTarget.includes('manuel') || transTarget.includes('düz');
        const isVManual = vTransTr.includes('manuel') || vTransTr.includes('düz') || v.transmission?.type === 'MANUAL';

        if (isTargetManual === isVManual) {
          score += 80;
          if (vTransTr === transTarget || (v.transmission?.name || '').toLowerCase().includes(transTarget)) {
            score += 20;
          }
        } else {
          score -= 500;
        }
      }

      // Engine match
      if (targetEngine) {
        const engTarget = targetEngine.toLowerCase();
        const dispMatch = engTarget.match(/(\d+\.\d+)/);
        if (dispMatch && vEngineCode.includes(dispMatch[1])) {
          score += 40;
        }
        if (vEngineCode.includes(engTarget) || engTarget.includes(vEngineCode)) {
          score += 20;
        }
      }

      // Trim match
      if (targetTrim && (vTrimName.includes(targetTrim.toLowerCase()) || targetTrim.toLowerCase().includes(vTrimName))) {
        score += 30;
      }

      // BodyType match
      if (targetBodyType && v.bodyType === getBodyTypeEnum(targetBodyType)) {
        score += 20;
      }

      return { variant: v, score };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);

    return {
      success: true,
      variantId: scoredCandidates[0].variant.id,
    };
  }
}
