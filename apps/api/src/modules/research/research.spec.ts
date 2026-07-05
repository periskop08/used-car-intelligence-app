import { Test, TestingModule } from '@nestjs/testing';
import { ResearchService } from './research.service';
import { CoverageService } from './coverage.service';
import { AiAnalysisService } from './ai-analysis.service';
import { WebSearchProvider } from './providers/web-search.provider';
import { PrismaService } from '../../prisma.service';
import { SourceKind, ApprovalStatus, DataCoverage } from '@used-car-intelligence/shared';

describe('Research Module Tests', () => {
  let researchService: ResearchService;
  let coverageService: CoverageService;

  const mockPrisma = {
    vehicleVariant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    vehicleResearchJob: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResearchService,
        CoverageService,
        AiAnalysisService,
        WebSearchProvider,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    researchService = module.get<ResearchService>(ResearchService);
    coverageService = module.get<CoverageService>(CoverageService);
  });

  describe('Data Coverage Calculation', () => {
    it('should return NONE when count is 0', () => {
      expect(coverageService.calculateDataCoverage(0)).toBe(DataCoverage.NONE);
    });

    it('should return LIMITED when count is 1 or 2', () => {
      expect(coverageService.calculateDataCoverage(1)).toBe(DataCoverage.LIMITED);
      expect(coverageService.calculateDataCoverage(2)).toBe(DataCoverage.LIMITED);
    });

    it('should return MODERATE when count is 3, 4, or 5', () => {
      expect(coverageService.calculateDataCoverage(3)).toBe(DataCoverage.MODERATE);
      expect(coverageService.calculateDataCoverage(5)).toBe(DataCoverage.MODERATE);
    });

    it('should return GOOD when count is 6 or more', () => {
      expect(coverageService.calculateDataCoverage(6)).toBe(DataCoverage.GOOD);
      expect(coverageService.calculateDataCoverage(10)).toBe(DataCoverage.GOOD);
    });
  });

  describe('Coverage Score Domain Cap and Normalization', () => {
    it('should calculate correct score and cap contributions from same domain', () => {
      const sources = [
        { url: 'https://forum.com/thread1', sourceKind: SourceKind.FORUM }, // weight 5
        { url: 'https://forum.com/thread2', sourceKind: SourceKind.FORUM }, // weight 5
        { url: 'https://forum.com/thread3', sourceKind: SourceKind.FORUM }, // capped, ignored
        { url: 'https://official-recalls.gov/1', sourceKind: SourceKind.OFFICIAL_RECALL }, // weight 30
      ];

      const score = coverageService.calculateCoverageScore(sources);
      // Expected total: 5 (forum) + 5 (forum) + 30 (recall) = 40.
      expect(score).toBe(40);
    });

    it('should return 0 contribution for MOCK sources', () => {
      const sources = [
        { url: 'https://mock.com/1', sourceKind: SourceKind.MOCK },
      ];
      const score = coverageService.calculateCoverageScore(sources);
      expect(score).toBe(0);
    });
  });
});
