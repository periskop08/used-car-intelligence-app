/**
 * kia-cerato-2022-full.spec.ts
 * 
 * Official Ground-Truth Regression Test Suite for 2022 Kia Cerato TR Prestige (Eylül 2022+ Revision).
 * Evaluates full 8-field user selector context against official Kia Türkiye September 2022+ equipment sheet.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentResearchService } from './equipment-research.service';
import { PdfTableExtractorService } from './pdf-table-extractor.service';
import { TrimEquipmentResolverService } from './trim-equipment-resolver.service';
import { EquipmentValidatorService } from './equipment-validator.service';
import { EquipmentConfidenceService } from './equipment-confidence.service';
import { EquipmentNormalizerService } from './equipment-normalizer.service';
import { TrimComparisonService } from './trim-comparison.service';
import { TavilySearchProvider } from '../providers/tavily-search.provider';
import { GeminiGroundingProvider } from '../providers/gemini-grounding.provider';
import { FirecrawlExtractProvider } from '../providers/firecrawl-extract.provider';
import { RawSourceStoreService } from '../raw-source-store.service';
import { PrismaService } from '../../../prisma.service';

describe('Kia Cerato 2022 TR 8-Field Ground-Truth Test', () => {
  let service: EquipmentResearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentResearchService,
        PdfTableExtractorService,
        TrimEquipmentResolverService,
        EquipmentValidatorService,
        EquipmentConfidenceService,
        EquipmentNormalizerService,
        TrimComparisonService,
        {
          provide: TavilySearchProvider,
          useValue: {
            search: jest.fn().mockResolvedValue({
              provider: 'tavily',
              query: 'Kia Cerato 2022',
              results: []
            })
          }
        },
        { provide: GeminiGroundingProvider, useValue: { search: jest.fn() } },
        { provide: FirecrawlExtractProvider, useValue: { search: jest.fn() } },
        { provide: RawSourceStoreService, useValue: { saveRawSource: jest.fn() } },
        { provide: PrismaService, useValue: {} }
      ]
    }).compile();

    service = module.get<EquipmentResearchService>(EquipmentResearchService);
  });

  it('should accurately resolve 2022 Kia Cerato TR Prestige equipment against official Eylül 2022+ ground-truth fixture', async () => {
    const result = await service.resolveEquipment({
      brand: 'Kia',
      model: 'Cerato',
      year: 2022,
      bodyType: 'Sedan',
      engineVersion: '1.6 MPI',
      fuelType: 'PETROL',
      transmissionType: 'AUTOMATIC',
      trim: 'Prestige',
      market: 'TR'
    });

    expect(result).toBeDefined();
    expect(result.features).toBeDefined();

    // 1. Verify Sunroof is STANDARD
    const sunroof = result.features.find((f: any) => f.featureCode === 'SUNROOF');
    expect(sunroof).toBeDefined();
    expect(sunroof.status).toBe('STANDARD');

    // 2. Verify Front Heated Seats are STANDARD
    const frontHeated = result.features.find((f: any) => f.featureCode === 'FRONT_HEATED_SEATS');
    expect(frontHeated).toBeDefined();
    expect(frontHeated.status).toBe('STANDARD');

    // 3. Verify Rear Heated Seats are STANDARD
    const rearHeated = result.features.find((f: any) => f.featureCode === 'REAR_HEATED_SEATS');
    expect(rearHeated).toBeDefined();
    expect(rearHeated.status).toBe('STANDARD');

    // 4. Verify Infotainment Screen value (10.25 inch)
    const screen = result.features.find((f: any) => f.featureCode === 'INFOTAINMENT_SCREEN');
    expect(screen).toBeDefined();
    expect(screen.status).toBe('STANDARD');
    expect(screen.valueNumber).toBe(10.25);
    expect(screen.unit).toBe('inch');

    // 5. Verify Heated Steering Wheel is UNKNOWN (not false negative NOT_AVAILABLE)
    const steering = result.features.find((f: any) => f.featureCode === 'HEATED_STEERING_WHEEL');
    expect(steering).toBeDefined();
    expect(steering.status).toBe('UNKNOWN');
  });
});
