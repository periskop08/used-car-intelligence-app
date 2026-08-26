import { EngineIdentityResolverService } from '../engine-identity-resolver.service';
import { resolveEngineCore } from '../engine-identity-core';
import { FuelType } from '@prisma/client';

describe('EngineIdentityResolverService (Phase 3A Ingestion Safety)', () => {
  let resolver: EngineIdentityResolverService;
  let mockPrisma: any;

  const mockEngines = [
    {
      id: 'eng-101',
      code: '2.0 Boxer',
      displacement: 2000,
      horsepower: 150,
      fuelType: FuelType.PETROL,
      hasTurbo: false,
    },
    {
      id: 'eng-102',
      code: '2.0',
      displacement: 2000,
      horsepower: 150,
      fuelType: FuelType.PETROL,
      hasTurbo: false,
    },
    {
      id: 'eng-103',
      code: '2.0 MPI',
      displacement: 2000,
      horsepower: 140,
      fuelType: FuelType.PETROL,
      hasTurbo: false,
    },
    {
      id: 'eng-104',
      code: '1.5 C180',
      displacement: 1500,
      horsepower: 156,
      fuelType: FuelType.PETROL,
      hasTurbo: true,
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      engine: {
        findMany: jest.fn().mockResolvedValue(mockEngines),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'eng-new-created',
            ...data,
          }),
        ),
      },
    };
    resolver = new EngineIdentityResolverService(mockPrisma as any);
  });

  it('TEST 1: Exact normalized match reuses existing Engine ID (Case & Whitespace)', async () => {
    const result = await resolver.resolveEngine({
      rawCode: '  2.0   BOXER ',
      displacement: 2000,
      fuelType: FuelType.PETROL,
    });

    expect(result.status).toBe('ENGINE_EXISTING_EXACT_MATCH');
    expect(result.engineId).toBe('eng-101');
    expect(result.resolvedCode).toBe('2.0 Boxer');
    expect(mockPrisma.engine.create).not.toHaveBeenCalled();
  });

  it('TEST 2: Semantic ambiguity (2.0 vs 2.0 Boxer) triggers REVIEW_REQUIRED without silent creation or auto-merge', async () => {
    // Incoming "2.0 Boxer" against DB that only has "2.0" (without eng-101)
    mockPrisma.engine.findMany.mockResolvedValue([mockEngines[1]]); // only "2.0"

    const result = await resolver.resolveEngine({
      rawCode: '2.0 Boxer',
      displacement: 2000,
      fuelType: FuelType.PETROL,
    });

    expect(result.status).toBe('ENGINE_IDENTITY_REVIEW_REQUIRED');
    expect(result.candidateEngineIds).toContain('eng-102');
    expect(mockPrisma.engine.create).not.toHaveBeenCalled();
  });

  it('TEST 3: Distinct engine technologies (2.0 MPI vs 2.0 Turbo) are NOT auto-merged', async () => {
    mockPrisma.engine.findMany.mockResolvedValue([mockEngines[2]]); // "2.0 MPI"

    const result = await resolver.resolveEngine({
      rawCode: '2.0 Turbo',
      displacement: 2000,
      fuelType: FuelType.PETROL,
    });

    expect(result.status).toBe('ENGINE_CREATED_NEW_DISTINCT');
    expect(result.engineId).toBe('eng-new-created');
    expect(mockPrisma.engine.create).toHaveBeenCalled();
  });

  it('TEST 4: Performance derivatives (1.5 C180 vs 1.5 C200) are NOT auto-merged', async () => {
    mockPrisma.engine.findMany.mockResolvedValue([mockEngines[3]]); // "1.5 C180"

    const result = await resolver.resolveEngine({
      rawCode: '1.5 C200',
      displacement: 1500,
      fuelType: FuelType.PETROL,
    });

    expect(result.status).toBe('ENGINE_CREATED_NEW_DISTINCT');
    expect(result.engineId).toBe('eng-new-created');
    expect(mockPrisma.engine.create).toHaveBeenCalled();
  });

  it('TEST 5: Field contamination ("STANDART" / empty code) is blocked', async () => {
    const resultStandart = await resolver.resolveEngine({
      rawCode: 'STANDART',
      displacement: 1600,
      fuelType: FuelType.PETROL,
    });

    expect(resultStandart.status).toBe('ENGINE_FIELD_CONTAMINATION');
    expect(mockPrisma.engine.create).not.toHaveBeenCalled();

    const resultEmpty = await resolver.resolveEngine({
      rawCode: '   ',
      displacement: 1600,
      fuelType: FuelType.PETROL,
    });

    expect(resultEmpty.status).toBe('ENGINE_FIELD_CONTAMINATION');
    expect(mockPrisma.engine.create).not.toHaveBeenCalled();
  });

  it('TEST 6: Fake HP Fallback (110 / 100 HP) is completely disabled', () => {
    const hpParsed = resolver.parseHorsepowerSafely('1.5 150 HP', null);
    expect(hpParsed).toBe(150);

    const hpUnverified = resolver.parseHorsepowerSafely('1.5 Engine', null);
    expect(hpUnverified).toBeNull(); // NEVER 110 or 100!
  });

  // CLI / Direct resolveEngineCore Tests for Ingestion Scripts
  describe('resolveEngineCore CLI & Ingestion Script Guard', () => {

    it('TEST A (CLI/Import): " 2.0 BOXER " with existing "2.0 Boxer" reuses existing Engine ID', () => {
      const res = resolveEngineCore(
        { rawCode: ' 2.0 BOXER ', displacement: 2000, fuelType: FuelType.PETROL },
        mockEngines,
      );
      expect(res.status).toBe('ENGINE_EXISTING_EXACT_MATCH');
      expect(res.engineId).toBe('eng-101');
    });

    it('TEST B (CLI/Import): Existing "2.0", incoming "2.0 Boxer" returns REVIEW_REQUIRED without creating duplicate', () => {
      const res = resolveEngineCore(
        { rawCode: '2.0 Boxer', displacement: 2000, fuelType: FuelType.PETROL },
        [mockEngines[1]], // only "2.0"
      );
      expect(res.status).toBe('ENGINE_IDENTITY_REVIEW_REQUIRED');
      expect(res.candidateEngineIds).toContain('eng-102');
      expect(res.newEngineData).toBeUndefined();
    });

    it('TEST C (CLI/Import): Missing engine code or trim "STANDART" is blocked as FIELD_CONTAMINATION', () => {
      const res = resolveEngineCore(
        { rawCode: 'STANDART', displacement: 1600, fuelType: FuelType.PETROL },
        mockEngines,
      );
      expect(res.status).toBe('ENGINE_FIELD_CONTAMINATION');
    });

    it('TEST D (CLI/Import): Unknown power in CLI ingestion returns null horsepower, never 110 or 100 fallback', () => {
      const res = resolveEngineCore(
        { rawCode: '2.0 Engine Code', displacement: 2000, fuelType: FuelType.PETROL },
        [],
      );
      expect(res.status).toBe('ENGINE_CREATED_NEW_DISTINCT');
      expect(res.newEngineData?.horsepower).toBeNull();
    });

    it('TEST E (CLI/Import): Legitimate distinct engines (2.0 MPI vs 2.0 Turbo) are NOT marked as duplicates', () => {
      const res = resolveEngineCore(
        { rawCode: '2.0 Turbo', displacement: 2000, fuelType: FuelType.PETROL },
        [mockEngines[2]], // "2.0 MPI"
      );
      expect(res.status).toBe('ENGINE_CREATED_NEW_DISTINCT');
      expect(res.newEngineData?.code).toBe('2.0 Turbo');
    });
  });
});
