import { VehicleReportContextBuilderService } from '../vehicle-report-context-builder.service';

describe('Engine Power & Torque Generic Sanitization Tests', () => {
  let builder: VehicleReportContextBuilderService;

  const mockCharResearchService = {
    getVehicleCharacter: jest.fn().mockResolvedValue(null),
  };

  it('should use verified side-car VehiclePowerEnrichment (150 HP) when present', async () => {
    const mockPrisma = {
      aiVehicleReport: { findUnique: jest.fn().mockResolvedValue(null) },
      vehiclePowerEnrichment: {
        findUnique: jest.fn().mockResolvedValue({
          vehicleVariantId: 'v-astra-14t',
          verificationStatus: 'VERIFIED',
          powerHp: 150,
          sourceReportedUnit: 'HP',
        }),
      },
      vehicleVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'v-astra-14t',
          year: 2017,
          fuelType: 'GASOLINE',
          model: { name: 'Astra', brand: { name: 'Opel' } },
          trim: { name: 'Excellence' },
          engine: {
            id: 'eng-14t',
            code: '1.4 T',
            horsepower: 100, // Legacy dummy placeholder in DB engine
            torque: 200,
            displacement: 1400,
            hasTurbo: true,
            fuelType: 'GASOLINE',
          },
          transmission: { name: 'Otomatik', speeds: 6 },
          problems: [],
          specs: null,
        }),
      },
    };

    builder = new VehicleReportContextBuilderService(mockPrisma as any, mockCharResearchService as any);
    const res = await builder.buildVehicleContext('v-astra-14t');

    // Must be resolved to verified 150 HP from VehiclePowerEnrichment
    expect(res.vehicleContext.vehicleIdentity.enginePowerHp).toBe(150);
    expect(res.vehicleContext.vehicleIdentity.powerUnit).toBe('HP');
    expect((res.vehicleContext.vehicleIdentity as any).powerSource).toBe('VEHICLE_DATABASE');
    expect(res.vehicleContext.performanceSpecs.enginePowerHp).toBe(150);
  });

  it('should sanitize unverified legacy dummy placeholder (100 HP / 200 Nm) to null so AI cannot guess', async () => {
    const mockPrisma = {
      aiVehicleReport: { findUnique: jest.fn().mockResolvedValue(null) },
      vehiclePowerEnrichment: { findUnique: jest.fn().mockResolvedValue(null) },
      vehicleVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'v-unverified-dummy',
          year: 2017,
          fuelType: 'GASOLINE',
          model: { name: 'Sample', brand: { name: 'Brand' } },
          trim: { name: 'Base' },
          engine: {
            id: 'eng-dummy',
            code: '1.4',
            horsepower: 100, // Legacy dummy placeholder
            torque: 200,      // Legacy dummy placeholder
            displacement: 1400,
            hasTurbo: true,
            fuelType: 'GASOLINE',
          },
          transmission: { name: 'Otomatik', speeds: 6 },
          problems: [],
          specs: null,
        }),
      },
    };

    builder = new VehicleReportContextBuilderService(mockPrisma as any, mockCharResearchService as any);
    const res = await builder.buildVehicleContext('v-unverified-dummy');

    // Must be null (not 100)
    expect(res.vehicleContext.vehicleIdentity.enginePowerHp).toBeNull();
    expect(res.vehicleContext.vehicleIdentity.engineTorqueNm).toBeNull();
    expect((res.vehicleContext.vehicleIdentity as any).powerSource).toBeUndefined();
    expect((res.vehicleContext.vehicleIdentity as any).torqueSource).toBeUndefined();
  });

  it('should preserve genuinely verified specs in TechnicalSpec table', async () => {
    const mockPrisma = {
      aiVehicleReport: { findUnique: jest.fn().mockResolvedValue(null) },
      vehiclePowerEnrichment: { findUnique: jest.fn().mockResolvedValue(null) },
      vehicleVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'v-corolla-hybrid',
          year: 2020,
          fuelType: 'HYBRID',
          model: { name: 'Corolla', brand: { name: 'Toyota' } },
          trim: { name: 'Flame' },
          engine: {
            id: 'eng-2zr',
            code: '2ZR-FXE',
            horsepower: 98,
            torque: 142,
            displacement: 1798,
            hasTurbo: false,
            fuelType: 'HYBRID',
          },
          transmission: { name: 'e-CVT', speeds: 1 },
          problems: [],
          specs: {
            specs: {
              enginePowerHp: 122,
              powerUnit: 'HP',
              engineTorqueNm: 142,
              topSpeed: 180,
              acceleration0to100: 11.0,
            },
          },
        }),
      },
    };

    builder = new VehicleReportContextBuilderService(mockPrisma as any, mockCharResearchService as any);
    const res = await builder.buildVehicleContext('v-corolla-hybrid');

    expect(res.vehicleContext.vehicleIdentity.enginePowerHp).toBe(122);
    expect(res.vehicleContext.vehicleIdentity.engineTorqueNm).toBe(142);
    expect((res.vehicleContext.vehicleIdentity as any).powerSource).toBe('VEHICLE_DATABASE');
  });
});
