import { calculateVehicleMtv, parseDisplacementCc } from '../calculateVehicleMtv';

describe('calculateVehicleMtv', () => {
  it('correctly calculates MTV for 2006 Subaru Impreza 2.0 (1994 cc)', () => {
    const result = calculateVehicleMtv({
      modelYear: 2006,
      engineDisplacement: 1994,
      fuelType: 'Benzin',
      currentYear: 2026,
    });

    expect(result).not.toBeNull();
    expect(result?.age).toBe(21);
    expect(result?.annualTax).toBe(2958);
    expect(result?.installment).toBe(1479);
    expect(result?.displayInstallment).toBe('1.479 ₺ x 2');
    expect(result?.displayAnnual).toBe('2.958 ₺');
  });

  it('correctly calculates MTV for 2015 VW Polo 1.4 TDI (1422 cc)', () => {
    const result = calculateVehicleMtv({
      modelYear: 2015,
      engineDisplacement: '1422 cc',
      fuelType: 'Dizel',
      currentYear: 2026,
    });

    expect(result).not.toBeNull();
    expect(result?.age).toBe(12); // 12-15 age bracket
    expect(result?.annualTax).toBe(3077);
    expect(result?.installment).toBe(1539);
    expect(result?.displayInstallment).toBe('1.539 ₺ x 2');
    expect(result?.displayAnnual).toBe('3.077 ₺');
  });

  it('correctly calculates MTV for 2022 Fiat Egea 1.3 Multijet (1248 cc)', () => {
    const result = calculateVehicleMtv({
      modelYear: 2022,
      engineDisplacement: 1248,
      fuelType: 'Dizel',
      currentYear: 2026,
    });

    expect(result).not.toBeNull();
    expect(result?.age).toBe(5); // 4-6 age bracket in POST_2018 table
    expect(result?.annualTax).toBe(4409);
    expect(result?.installment).toBe(2205);
    expect(result?.displayInstallment).toBe('2.205 ₺ x 2');
  });

  it('correctly calculates MTV for Electric Vehicle with 25% rate', () => {
    const result = calculateVehicleMtv({
      modelYear: 2023,
      fuelType: 'ELEKTRIK',
      horsepower: 218, // 160 kW -> 2501+ cc bracket
      currentYear: 2026,
    });

    expect(result).not.toBeNull();
    expect(result?.isElectric).toBe(true);
    expect(result?.annualTax).toBeGreaterThan(0);
  });

  it('handles badge decimals correctly (1.6 -> 1600)', () => {
    expect(parseDisplacementCc(1.6)).toBe(1600);
    expect(parseDisplacementCc('2.0')).toBe(2000);
    expect(parseDisplacementCc('1598 cc')).toBe(1598);
  });
});
