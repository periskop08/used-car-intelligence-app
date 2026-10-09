import { Test, TestingModule } from '@nestjs/testing';
import { CatalogWatchdogService } from '../catalog-watchdog.service';
import { PrismaService } from '../../../prisma.service';

describe('CatalogWatchdogService', () => {
  let service: CatalogWatchdogService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      catalogAnomaly: {
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'anomaly-1', ...args.data })),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({ id: 'anomaly-1', status: 'OPEN' }),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      vehicleVariant: {
        count: jest.fn().mockResolvedValue(588099),
        findFirst: jest.fn().mockResolvedValue({ year: 2026 }),
      },
      model: {
        findFirst: jest.fn().mockResolvedValue({ id: 'model-1', name: 'Fiorino Combi' }),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogWatchdogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CatalogWatchdogService>(CatalogWatchdogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log parser drop anomaly correctly with metadata', async () => {
    const res = await service.logAnomaly({
      category: 'PARSER_DROP',
      severity: 'CRITICAL',
      vehicleType: 'MINIVAN_PANELVAN',
      brandName: 'Fiat',
      modelName: 'Fiorino Combi',
      source: 'Arabam Scraper Part 2 Parser',
      title: 'Tire eksikliği nedeniyle 2024 yılı varyantı düştü',
      description: 'Test description',
      rawPayload: { rawText: '1.3 Multijet Premio' },
    });

    expect(mockPrisma.catalogAnomaly.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: 'PARSER_DROP',
        severity: 'CRITICAL',
        source: 'Arabam Scraper Part 2 Parser',
        brandName: 'Fiat',
        modelName: 'Fiorino Combi',
      }),
    });
    expect(res.id).toBe('anomaly-1');
  });

  it('should return metrics and anomalies list in getAnomalies', async () => {
    mockPrisma.catalogAnomaly.findMany.mockResolvedValue([
      {
        id: 'anomaly-1',
        title: 'Test Anomaly',
        status: 'OPEN',
        severity: 'WARNING',
        detectedAt: new Date(),
      },
    ]);
    mockPrisma.catalogAnomaly.count.mockResolvedValueOnce(1); // total
    mockPrisma.catalogAnomaly.count.mockResolvedValueOnce(1); // open
    mockPrisma.catalogAnomaly.count.mockResolvedValueOnce(0); // critical
    mockPrisma.catalogAnomaly.count.mockResolvedValueOnce(0); // resolved

    const result = await service.getAnomalies({ page: 1, limit: 10 });
    expect(result.items.length).toBe(1);
    expect(result.metrics.openCount).toBe(1);
    expect(result.metrics.totalVariants).toBe(588099);
  });

  it('should resolve an open anomaly', async () => {
    const res = await service.resolveAnomaly('anomaly-1', 'admin@torquescout.com', 'Fix verified');
    expect(mockPrisma.catalogAnomaly.update).toHaveBeenCalledWith({
      where: { id: 'anomaly-1' },
      data: expect.objectContaining({
        status: 'RESOLVED',
        resolvedBy: 'admin@torquescout.com: Fix verified',
      }),
    });
  });

  it('should ignore an anomaly with reason', async () => {
    await service.ignoreAnomaly('anomaly-1', 'admin@torquescout.com', 'Discontinued vehicle');
    expect(mockPrisma.catalogAnomaly.update).toHaveBeenCalledWith({
      where: { id: 'anomaly-1' },
      data: expect.objectContaining({
        status: 'IGNORED',
        resolvedBy: 'admin@torquescout.com (Gözardı Edildi: Discontinued vehicle)',
      }),
    });
  });
});
