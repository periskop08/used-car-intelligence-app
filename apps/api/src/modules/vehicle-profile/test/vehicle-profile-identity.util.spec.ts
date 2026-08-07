import {
  buildVehicleProfileIdentityKey,
  buildVehicleProfileSlug,
  normalizeIdentitySlug,
} from '../vehicle-profile-identity.util';

describe('VehicleProfile Identity Utility', () => {
  it('should normalize Turkish characters, uppercase, and punctuation correctly', () => {
    expect(normalizeIdentitySlug('ŞENOL & ÇAĞATAY ÖZEL')).toBe('senol-cagatay-ozel');
    expect(normalizeIdentitySlug('5-Serisi / G30')).toBe('5-serisi-g30');
  });

  it('should build canonical identity key regardless of case or Turkish chars', () => {
    const key1 = buildVehicleProfileIdentityKey({
      brand: 'BMW',
      model: '5 Serisi',
      generationCode: 'G30',
      yearStart: 2017,
      yearEnd: 2023,
      bodyType: 'Sedan',
    });

    const key2 = buildVehicleProfileIdentityKey({
      brand: 'bmw',
      model: '5-serisi',
      generationCode: 'g30',
      yearStart: 2017,
      yearEnd: 2023,
      bodyType: 'SEDAN',
    });

    expect(key1).toBe('bmw|5-serisi|g30|2017|2023|sedan');
    expect(key1).toBe(key2);
  });

  it('should handle null generation and null yearEnd cleanly', () => {
    const key = buildVehicleProfileIdentityKey({
      brand: 'Audi',
      model: 'A6',
      generationCode: null,
      yearStart: 2018,
      yearEnd: null,
      bodyType: 'Sedan',
    });

    expect(key).toBe('audi|a6|nogen|2018|present|sedan');
  });

  it('should generate URL friendly slugs', () => {
    const slug = buildVehicleProfileSlug({
      brand: 'BMW',
      model: '5 Serisi',
      generationCode: 'G30',
      yearStart: 2017,
      yearEnd: 2023,
      bodyType: 'Sedan',
    });

    expect(slug).toBe('bmw-5-serisi-g30-sedan-2017-2023');
  });
});
