import { VehicleFiltersController, getTransmissionTr, getTransmissionWhereClause, getCategoryVariantWhere } from '../vehicle-filters.controller';
import { CanonicalDisplayService } from '../canonical-display.service';

describe('Vehicle Filters Relational Filtering & Transmission SQL Level Guard', () => {
  let controller: VehicleFiltersController;
  let mockPrisma: any;
  let canonicalDisplayService: CanonicalDisplayService;

  beforeEach(() => {
    mockPrisma = {
      vehicleVariant: {
        findMany: jest.fn(),
      },
    };
    canonicalDisplayService = new CanonicalDisplayService();
    controller = new VehicleFiltersController(mockPrisma as any, canonicalDisplayService, {} as any);
  });

  describe('getTransmissionWhereClause', () => {
    it('should return empty object when no targetTrans is provided', () => {
      expect(getTransmissionWhereClause(undefined)).toEqual({});
      expect(getTransmissionWhereClause('')).toEqual({});
    });

    it('should build case-insensitive OR clause for Manuel', () => {
      const clause = getTransmissionWhereClause('Manuel');
      expect(clause.transmission.OR).toBeDefined();
      expect(clause.transmission.OR).toEqual([
        { name: { contains: 'manuel', mode: 'insensitive' } },
        { name: { contains: 'düz', mode: 'insensitive' } },
        { name: { contains: 'manual', mode: 'insensitive' } },
      ]);
    });

    it('should build case-insensitive NOT clause for Otomatik', () => {
      const clause = getTransmissionWhereClause('Otomatik');
      expect(clause.transmission.NOT).toBeDefined();
      expect(clause.transmission.NOT).toEqual([
        { name: { contains: 'manuel', mode: 'insensitive' } },
        { name: { contains: 'düz', mode: 'insensitive' } },
        { name: { contains: 'manual', mode: 'insensitive' } },
      ]);
    });

    it('should build case-insensitive OR clause for Yarı Otomatik', () => {
      const clause = getTransmissionWhereClause('Yarı Otomatik');
      expect(clause.transmission.OR).toBeDefined();
      expect(clause.transmission.OR.some((c: any) => c.name.contains === 'dsg')).toBe(true);
      expect(clause.transmission.OR.some((c: any) => c.name.contains === 'edc')).toBe(true);
      expect(clause.transmission.OR.some((c: any) => c.name.contains === 'powershift')).toBe(true);
    });
  });

  describe('getTrims Prisma SQL-Level Transmission Filtering', () => {
    it('should pass transmission where clause directly into Prisma findMany', async () => {
      mockPrisma.vehicleVariant.findMany.mockResolvedValue([
        { id: '1', trim: { name: 'Flame' }, transmission: { name: 'Otomatik' }, engine: { code: '1.8 Hybrid' } },
        { id: '2', trim: { name: 'Passion' }, transmission: { name: 'Otomatik' }, engine: { code: '1.8 Hybrid' } },
      ]);

      const result = await controller.getTrims(
        'Toyota',
        '2020',
        undefined,
        'Corolla',
        'Sedan',
        undefined,
        '1.8 Hybrid',
        undefined,
        'Hibrit',
        undefined,
        'Otomatik',
      );

      expect(mockPrisma.vehicleVariant.findMany).toHaveBeenCalledTimes(2);
      const calledWhere = mockPrisma.vehicleVariant.findMany.mock.calls[1][0].where;
      expect(calledWhere.status).toBe('APPROVED');
      expect(calledWhere.transmission).toBeDefined();
      expect(calledWhere.transmission.NOT).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        { label: 'Flame', value: 'Flame' },
        { label: 'Passion', value: 'Passion' },
      ]);
    });
  });

  describe('getTransmissionTr Helper', () => {
    it('should correctly classify transmission names', () => {
      expect(getTransmissionTr('6 İleri Manuel')).toBe('Manuel');
      expect(getTransmissionTr('5 Vites Düz')).toBe('Manuel');
      expect(getTransmissionTr('7 İleri DSG')).toBe('Yarı Otomatik');
      expect(getTransmissionTr('EDC 6 İleri')).toBe('Yarı Otomatik');
      expect(getTransmissionTr('Powershift')).toBe('Yarı Otomatik');
      expect(getTransmissionTr('e-CVT')).toBe('Otomatik');
      expect(getTransmissionTr('CVT')).toBe('Otomatik');
      expect(getTransmissionTr('Otomatik')).toBe('Otomatik');
      expect(getTransmissionTr('8 İleri Tiptronik')).toBe('Otomatik');
    });
  });

  describe('getYears Model Production Boundaries Guard', () => {
    it('should enforce startYear and endYear bounds from Model on VehicleVariant query', async () => {
      mockPrisma.model = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'model-cerato',
          startYear: 2004,
          endYear: 2024,
        }),
      };

      mockPrisma.vehicleVariant.findMany.mockResolvedValue([
        { year: 2024 },
        { year: 2023 },
        { year: 2020 },
      ]);

      const res = await controller.getYears('Kia', 'Cerato');

      expect(mockPrisma.model.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'Cerato', mode: 'insensitive' },
          brand: { name: { equals: 'Kia', mode: 'insensitive' } },
        },
        select: { id: true, startYear: true, endYear: true },
      });

      expect(mockPrisma.vehicleVariant.findMany).toHaveBeenCalledWith({
        where: {
          status: 'APPROVED',
          year: { gte: 2004, lte: 2024 },
          brand: { name: { equals: 'Kia', mode: 'insensitive' } },
          model: { name: { equals: 'Cerato', mode: 'insensitive' } },
        },
        select: { year: true },
      });

      expect(res.success).toBe(true);
      expect(res.data).toEqual([
        { label: '2024', value: '2024' },
        { label: '2023', value: '2023' },
        { label: '2020', value: '2020' },
      ]);
    });
  });

  describe('getCategoryVariantWhere helper & category filter guards', () => {
    it('should build correct where clauses for all vehicle categories', () => {
      expect(getCategoryVariantWhere('AUTOMOBILE')).toEqual({
        bodyType: { in: ['SEDAN', 'HATCHBACK', 'COUPE', 'CONVERTIBLE', 'WAGON'] },
      });
      expect(getCategoryVariantWhere('CAR')).toEqual({
        bodyType: { in: ['SEDAN', 'HATCHBACK', 'COUPE', 'CONVERTIBLE', 'WAGON'] },
      });
      expect(getCategoryVariantWhere('SUV_PICKUP')).toEqual({
        bodyType: { in: ['SUV', 'PICKUP'] },
      });
      expect(getCategoryVariantWhere('ELECTRIC')).toEqual({
        fuelType: 'ELECTRIC',
      });
      expect(getCategoryVariantWhere('COMMERCIAL')).toEqual({
        bodyType: { in: ['MINIVAN', 'VAN'] },
      });
      expect(getCategoryVariantWhere(undefined)).toEqual({});
    });

    it('should pass category where clause into getBrands Prisma findMany', async () => {
      mockPrisma.brand = {
        findMany: jest.fn().mockResolvedValue([{ name: 'Dacia' }, { name: 'Jeep' }]),
      };

      const res = await controller.getBrands('SUV_PICKUP');

      expect(mockPrisma.brand.findMany).toHaveBeenCalledWith({
        where: {
          variants: {
            some: {
              status: 'APPROVED',
              bodyType: { in: ['SUV', 'PICKUP'] },
            },
          },
        },
        orderBy: { name: 'asc' },
        select: { name: true },
      });

      expect(res.success).toBe(true);
      expect(res.data).toEqual([
        { label: 'Dacia', value: 'Dacia' },
        { label: 'Jeep', value: 'Jeep' },
      ]);
    });

    it('should pass category where clause into getModels Prisma findMany', async () => {
      mockPrisma.model = {
        findMany: jest.fn().mockResolvedValue([{ name: 'Duster' }, { name: 'Jogger' }]),
      };

      const res = await controller.getModels('Dacia', 'SUV_PICKUP');

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: {
          brand: { name: { equals: 'Dacia', mode: 'insensitive' } },
          variants: {
            some: {
              status: 'APPROVED',
              bodyType: { in: ['SUV', 'PICKUP'] },
            },
          },
        },
        select: { name: true },
        orderBy: { name: 'asc' },
      });

      expect(res.success).toBe(true);
      expect(res.data).toEqual([
        { label: 'Duster', value: 'Duster' },
        { label: 'Jogger', value: 'Jogger' },
      ]);
    });
  });
});


