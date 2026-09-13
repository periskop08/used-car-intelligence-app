import { VehicleReportContextBuilderService } from '../vehicle-report-context-builder.service';

describe('Engine Power & Torque Generic Sanitization Tests', () => {
  let builder: VehicleReportContextBuilderService;

  const mockCharResearchService = {
    getVehicleCharacter: jest.fn().mockResolvedValue(null),
  };

  it('should sanitize bulk-seeded legacy placeholder (100 HP / 200 Nm) when technicalSpec is unverified', async () => {
    const mockPrisma = {
      aiVehicleReport: { findUnique: jest.fn().mockResolvedValue(null) },
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
            horsepower: 100, // Legacy dummy placeholder
            torque: 200,      // Legacy dummy placeholder
            displacement: 1400,
            hasTurbo: true,
            fuelType: 'GASOLINE',
          },
          transmission: { name: 'Otomatik', speeds: 6 },
          problems: [],
          technicalSpecs: [
            {
              specs: {
                topSpeed: 215,
                acceleration0to100: 8.9,
                weight: 1310,
              },
            },
          ],
        }),
      },
    };

    builder = new VehicleReportContextBuilderService(mockPrisma as any, mockCharResearchService as any);
    const res = await builder.buildVehicleContext('v-astra-14t');

    // Must be sanitized to null so AI can derive real factory 150 HP / 245 Nm
    expect(res.vehicleContext.vehicleIdentity.enginePowerHp).toBeNull();
    expect(res.vehicleContext.vehicleIdentity.engineTorqueNm).toBeNull();
    expect((res.vehicleContext.vehicleIdentity as any).powerSource).toBeUndefined();
    expect((res.vehicleContext.vehicleIdentity as any).torqueSource).toBeUndefined();
  });

  it('should sanitize 1.4L+ turbo engines with power <= 115 HP or torque <= 210 Nm', async () => {
    const mockPrisma = {
      aiVehicleReport: { findUnique: jest.fn().mockResolvedValue(null) },
      vehicleVariant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'v-cruze-14t',
          year: 2016,
          fuelType: 'GASOLINE',
          model: { name: 'Cruze', brand: { name: 'Chevrolet' } },
          trim: { name: 'LT' },
          engine: {
            id: 'eng-14t-cruze',
            code: '1.4 Turbo',
            horsepower: 105,
            torque: 180,
            displacement: 1364,
            hasTurbo: true,
            fuelType: 'GASOLINE',
          },
          transmission: { name: 'Otomatik', speeds: 6 },
          problems: [],
          technicalSpecs: [],
        }),
      },
    };

    builder = new VehicleReportContextBuilderService(mockPrisma as any, mockCharResearchService as any);
    const res = await builder.buildVehicleContext('v-cruze-14t');

    expect(res.vehicleContext.vehicleIdentity.enginePowerHp).toBeNull();
    expect(res.vehicleContext.vehicleIdentity.engineTorqueNm).toBeNull();
  });

  it('should preserve genuinely verified specs in technicalSpec json', async () => {
    const mockPrisma = {
      aiVehicleReport: { findUnique: jest.fn().mockResolvedValue(null) },
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
