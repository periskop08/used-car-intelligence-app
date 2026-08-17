import { Test, TestingModule } from '@nestjs/testing';
import { VehiclePowerEnrichmentService } from '../vehicle-power-enrichment.service';
import { PrismaService } from '../../../prisma.service';
import { WebSearchProvider } from '../../research/providers/web-search.provider';
import {
  PowerVerificationStatus,
  PowerSourceMarket,
  PowerMarketResolution,
  convertPowerUnits,
} from '@used-car-intelligence/shared';

describe('VehiclePowerEnrichmentService (Data Safety & Scoped Side-Car System)', () => {
  let service: VehiclePowerEnrichmentService;
  let prismaService: PrismaService;

  const mockWebSearchProvider = {
    search: jest.fn().mockImplementation(async (query: string, lang: string, country: string) => {
      if (country === 'tr') {
        return [
          {
            url: 'https://www.kia.com.tr/cerato-specs',
            title: 'Kia Cerato 1.6 MPI 128 HP Teknik Özellikleri',
            snippet: '2022 Kia Cerato 1.6 MPI motor gücü 128 HP (94 kW) tork 155 Nm.',
          },
        ];
      }
      return [
        {
          url: 'https://www.auto-data.net/en/kia-cerato-1.6-128hp',
          title: 'Kia Cerato II 1.6 128HP Specs',
          snippet: 'Engine power 128 HP at 6300 rpm.',
        },
      ];
    }),
  };

  const mockPrismaService = {
    vehicleVariant: {
      count: jest.fn().mockResolvedValue(100),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'variant-uuid-1',
          year: 2022,
          bodyType: 'SEDAN',
          fuelType: 'PETROL',
          brand: { name: 'Kia' },
          model: { name: 'Cerato' },
          engine: { code: '1.6 MPI', displacement: 1591 },
          trim: { name: 'Elegance' },
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'variant-uuid-1',
        year: 2022,
        bodyType: 'SEDAN',
        fuelType: 'PETROL',
        brand: { name: 'Kia' },
        model: { name: 'Cerato' },
        engine: { code: '1.6 MPI', displacement: 1591 },
        trim: { name: 'Elegance' },
      }),
      // Explicitly verify update/delete/upsert are NOT called on VehicleVariant!
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    vehiclePowerEnrichment: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({
        id: 'enrichment-uuid-1',
        vehicleVariantId: 'variant-uuid-1',
        verificationStatus: PowerVerificationStatus.RESEARCHING,
      }),
      update: jest.fn().mockResolvedValue({
        id: 'enrichment-uuid-1',
        vehicleVariantId: 'variant-uuid-1',
        verificationStatus: PowerVerificationStatus.VERIFIED,
        powerHp: 128,
        powerKw: 94,
        powerPs: 130,
        sourceReportedValue: 128,
        sourceReportedUnit: 'HP',
        sourceMarket: PowerSourceMarket.TURKEY,
        marketResolution: PowerMarketResolution.TR_PRIMARY,
      }),
    },
    vehiclePowerEvidence: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclePowerEnrichmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WebSearchProvider, useValue: mockWebSearchProvider },
      ],
    }).compile();

    service = module.get<VehiclePowerEnrichmentService>(VehiclePowerEnrichmentService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('1. Absolute Data Safety: VehicleVariant update/delete/upsert must NEVER be invoked', async () => {
    await service.researchVariantPower('variant-uuid-1');

    expect(prismaService.vehicleVariant.update).not.toHaveBeenCalled();
    expect(prismaService.vehicleVariant.delete).not.toHaveBeenCalled();
    expect(prismaService.vehicleVariant.upsert).not.toHaveBeenCalled();
  });

  it('2. Market Policy: Prioritizes Turkey source and sets TR_PRIMARY', async () => {
    const result: any = await service.researchVariantPower('variant-uuid-1');

    expect(mockWebSearchProvider.search).toHaveBeenCalledWith(
      expect.stringContaining('Kia Cerato'),
      'tr',
      'tr',
    );
    expect(prismaService.vehiclePowerEnrichment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceMarket: PowerSourceMarket.TURKEY,
          marketResolution: PowerMarketResolution.TR_PRIMARY,
          verificationStatus: PowerVerificationStatus.VERIFIED,
          powerHp: 128,
        }),
      }),
    );
  });

  it('3. Unit Conversion Utility: Accurately converts kW, PS, and HP', () => {
    const kwResult = convertPowerUnits(94, 'KW');
    expect(kwResult.powerHp).toBe(126); // 94 * 1.34102 = 126.05 -> 126 HP

    const psResult = convertPowerUnits(150, 'PS');
    expect(psResult.powerHp).toBe(148); // 150 * 0.98632 = 147.9 -> 148 HP
    expect(psResult.powerKw).toBe(110.3); // 150 * 0.7355 = 110.325 -> 110.3 kW

    const hpResult = convertPowerUnits(128, 'HP');
    expect(hpResult.powerHp).toBe(128);
    expect(hpResult.powerPs).toBe(130); // 128 * 1.01387 = 129.77 -> 130 PS
  });

  it('4. Data Integrity Assertion: VehicleVariant row count remains unchanged before and after batch', async () => {
    const report = await service.runInitialBatchEnrichment(1);

    expect(report.variantIntegrityPreserved).toBe(true);
    expect(report.sampleVariantRowCounts.before).toBe(report.sampleVariantRowCounts.after);
  });
});
