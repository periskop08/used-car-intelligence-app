import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { CompareVehiclesDto } from './comparison.dto';
import { FeatureKey, ApprovalStatus } from '@prisma/client';

@Injectable()
export class ComparisonService {
  constructor(
    private prisma: PrismaService,
    private featureLimitService: FeatureLimitService,
  ) {}

  async getComparisonHistory(userId: string) {
    return this.prisma.vehicleComparison.findMany({
      where: { userId },
      include: {
        variant1: { include: { brand: true, model: true } },
        variant2: { include: { brand: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async compare(userId: string, dto: CompareVehiclesDto) {
    if (dto.variant1Id === dto.variant2Id) {
      throw new BadRequestException('Aynı araç varyantını kendisiyle karşılaştıramazsınız.');
    }

    // 1. Transaction-safe limit check
    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.VEHICLE_COMPARISON);

    // 2. Fetch both approved variants
    const variant1 = await this.prisma.vehicleVariant.findFirst({
      where: { id: dto.variant1Id, status: ApprovalStatus.APPROVED },
      include: { brand: true, model: true, generation: true, engine: true, transmission: true, trim: true, specs: true, problems: { where: { status: ApprovalStatus.APPROVED } } },
    });

    const variant2 = await this.prisma.vehicleVariant.findFirst({
      where: { id: dto.variant2Id, status: ApprovalStatus.APPROVED },
      include: { brand: true, model: true, generation: true, engine: true, transmission: true, trim: true, specs: true, problems: { where: { status: ApprovalStatus.APPROVED } } },
    });

    if (!variant1 || !variant2) {
      throw new NotFoundException('Karşılaştırılacak araç varyantlarından biri veya ikisi bulunamadı veya onaylanmamış.');
    }

    // 3. Save comparison log in DB
    await this.prisma.vehicleComparison.create({
      data: {
        userId,
        variant1Id: dto.variant1Id,
        variant2Id: dto.variant2Id,
      },
    });

    // 4. Return side-by-side comparison payload
    return {
      vehicle1: {
        id: variant1.id,
        name: `${variant1.brand.name} ${variant1.model.name} (${variant1.year})`,
        trim: variant1.trim.name,
        engine: variant1.engine.code,
        transmission: variant1.transmission.name,
        specs: variant1.specs?.specs || {},
        problemsCount: variant1.problems.length,
      },
      vehicle2: {
        id: variant2.id,
        name: `${variant2.brand.name} ${variant2.model.name} (${variant2.year})`,
        trim: variant2.trim.name,
        engine: variant2.engine.code,
        transmission: variant2.transmission.name,
        specs: variant2.specs?.specs || {},
        problemsCount: variant2.problems.length,
      },
      specComparison: {
        topSpeed: { label: 'Maks Hız (km/h)', v1: variant1.specs?.specs?.['topSpeed'] || '-', v2: variant2.specs?.specs?.['topSpeed'] || '-' },
        acceleration: { label: '0-100 Hızlanma (sn)', v1: variant1.specs?.specs?.['acceleration0to100'] || '-', v2: variant2.specs?.specs?.['acceleration0to100'] || '-' },
        fuel: { label: 'Ort. Yakıt Tüketimi (lt)', v1: variant1.specs?.specs?.['averageFuelConsumption'] || '-', v2: variant2.specs?.specs?.['averageFuelConsumption'] || '-' },
        luggage: { label: 'Bagaj Hacmi (lt)', v1: variant1.specs?.specs?.['luggageCapacity'] || '-', v2: variant2.specs?.specs?.['luggageCapacity'] || '-' },
        weight: { label: 'Ağırlık (kg)', v1: variant1.specs?.specs?.['weight'] || '-', v2: variant2.specs?.specs?.['weight'] || '-' },
      },
    };
  }
}
