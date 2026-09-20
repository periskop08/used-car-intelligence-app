import { resolveAutomotiveEngineTaxonomy } from '../automotiveEngineTaxonomy';

describe('Automotive Engine Taxonomy & Specification Catalog', () => {
  describe('Renault / Dacia / Nissan / Mercedes', () => {
    it('resolves Renault 1.5 dCi to 1461 cc, KAYIS, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Renault',
        model: 'Megane',
        engineCode: '1.5 dCi',
        fuelType: 'Dizel',
      });
      expect(match.catalogDisplacementCc).toBe(1461);
      expect(match.timingSystem).toBe('KAYIS');
      expect(match.canonicalFuelType).toBe('DIESEL');
      expect(match.confidence).toBe('EXACT_CATALOG');
    });

    it('resolves 1.3 TCe to 1332 cc, ZINCIR, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Renault',
        model: 'Clio',
        engineCode: '1.3 TCe',
        fuelType: 'Benzin',
      });
      expect(match.catalogDisplacementCc).toBe(1332);
      expect(match.timingSystem).toBe('ZINCIR');
      expect(match.canonicalFuelType).toBe('PETROL');
    });

    it('resolves 1.0 TCe to 999 cc, ZINCIR, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Dacia',
        model: 'Duster',
        engineCode: '1.0 TCe',
      });
      expect(match.catalogDisplacementCc).toBe(999);
      expect(match.timingSystem).toBe('ZINCIR');
    });

    it('resolves 1.6 dCi to 1598 cc, ZINCIR, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Nissan',
        model: 'Qashqai',
        engineCode: '1.6 dCi',
      });
      expect(match.catalogDisplacementCc).toBe(1598);
      expect(match.timingSystem).toBe('ZINCIR');
      expect(match.canonicalFuelType).toBe('DIESEL');
    });
  });

  describe('VAG (Volkswagen, Audi, Seat, Skoda)', () => {
    it('resolves 1.6 TDI to 1598 cc, KAYIS, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Volkswagen',
        model: 'Passat',
        engineCode: '1.6 TDI',
      });
      expect(match.catalogDisplacementCc).toBe(1598);
      expect(match.timingSystem).toBe('KAYIS');
      expect(match.canonicalFuelType).toBe('DIESEL');
    });

    it('resolves 2.0 TDI to 1968 cc, KAYIS, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Volkswagen',
        model: 'Passat',
        engineCode: '2.0 TDI',
      });
      expect(match.catalogDisplacementCc).toBe(1968);
      expect(match.timingSystem).toBe('KAYIS');
      expect(match.canonicalFuelType).toBe('DIESEL');
    });

    it('resolves 1.5 TSI (35 TFSI) to 1498 cc, KAYIS, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Audi',
        model: 'A3',
        engineCode: '35 TFSI',
      });
      expect(match.catalogDisplacementCc).toBe(1498);
      expect(match.timingSystem).toBe('KAYIS');
      expect(match.canonicalFuelType).toBe('PETROL');
    });

    it('resolves 1.4 TSI EA211 (2015) to 1395 cc, KAYIS, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Volkswagen',
        model: 'Golf',
        engineCode: '1.4 TSI',
        modelYear: 2015,
      });
      expect(match.catalogDisplacementCc).toBe(1395);
      expect(match.timingSystem).toBe('KAYIS');
    });

    it('resolves 1.4 TSI EA111 (2010) to 1390 cc, ZINCIR, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Volkswagen',
        model: 'Golf',
        engineCode: '1.4 TSI',
        modelYear: 2010,
      });
      expect(match.catalogDisplacementCc).toBe(1390);
      expect(match.timingSystem).toBe('ZINCIR');
    });

    it('resolves 1.0 TSI to 999 cc, KAYIS, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Skoda',
        model: 'Octavia',
        engineCode: '1.0 TSI',
      });
      expect(match.catalogDisplacementCc).toBe(999);
      expect(match.timingSystem).toBe('KAYIS');
    });

    it('resolves 2.0 TSI (EA888) to 1984 cc, ZINCIR, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Volkswagen',
        model: 'Golf GTI',
        engineCode: '2.0 TSI',
      });
      expect(match.catalogDisplacementCc).toBe(1984);
      expect(match.timingSystem).toBe('ZINCIR');
    });
  });

  describe('Fiat / Alfa Romeo / Stellantis', () => {
    it('resolves 1.3 MultiJet to 1248 cc, ZINCIR, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Fiat',
        model: 'Egea',
        engineCode: '1.3 Multijet',
        fuelType: 'Dizel',
      });
      expect(match.catalogDisplacementCc).toBe(1248);
      expect(match.timingSystem).toBe('ZINCIR');
      expect(match.canonicalFuelType).toBe('DIESEL');
    });

    it('resolves 1.6 MultiJet to 1598 cc, KAYIS, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Fiat',
        model: 'Egea',
        engineCode: '1.6 Multijet',
      });
      expect(match.catalogDisplacementCc).toBe(1598);
      expect(match.timingSystem).toBe('KAYIS');
      expect(match.canonicalFuelType).toBe('DIESEL');
    });

    it('resolves 1.4 Fire to 1368 cc, KAYIS, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Fiat',
        model: 'Egea',
        engineCode: '1.4 Fire',
      });
      expect(match.catalogDisplacementCc).toBe(1368);
      expect(match.timingSystem).toBe('KAYIS');
      expect(match.canonicalFuelType).toBe('PETROL');
    });
  });

  describe('PSA / Stellantis (Peugeot, Citroen, Opel)', () => {
    it('resolves 1.2 PureTech to 1199 cc, ISLAK_KAYIS, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Peugeot',
        model: '3008',
        engineCode: '1.2 PureTech',
        modelYear: 2021,
      });
      expect(match.catalogDisplacementCc).toBe(1199);
      expect(match.timingSystem).toBe('ISLAK_KAYIS');
      expect(match.canonicalFuelType).toBe('PETROL');
    });

    it('resolves 1.5 BlueHDi to 1499 cc, KAYIS_VE_ZINCIR, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Peugeot',
        model: '3008',
        engineCode: '1.5 BlueHDi',
      });
      expect(match.catalogDisplacementCc).toBe(1499);
      expect(match.timingSystem).toBe('KAYIS_VE_ZINCIR');
      expect(match.canonicalFuelType).toBe('DIESEL');
    });

    it('resolves 1.6 BlueHDi to 1560 cc, KAYIS, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Citroen',
        model: 'C4',
        engineCode: '1.6 BlueHDi',
      });
      expect(match.catalogDisplacementCc).toBe(1560);
      expect(match.timingSystem).toBe('KAYIS');
      expect(match.canonicalFuelType).toBe('DIESEL');
    });
  });

  describe('Ford', () => {
    it('resolves 1.0 EcoBoost to 998 cc, ISLAK_KAYIS, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Ford',
        model: 'Focus',
        engineCode: '1.0 EcoBoost',
      });
      expect(match.catalogDisplacementCc).toBe(998);
      expect(match.timingSystem).toBe('ISLAK_KAYIS');
      expect(match.canonicalFuelType).toBe('PETROL');
    });

    it('resolves 1.5 TDCi / EcoBlue to 1499 cc, KAYIS, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Ford',
        model: 'Focus',
        engineCode: '1.5 EcoBlue',
      });
      expect(match.catalogDisplacementCc).toBe(1499);
      expect(match.timingSystem).toBe('KAYIS');
      expect(match.canonicalFuelType).toBe('DIESEL');
    });
  });

  describe('BMW & Mercedes-Benz', () => {
    it('resolves BMW 320i 1.6 Türkiye to 1598 cc, ZINCIR, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'BMW',
        model: '320i',
        engineCode: '320i 1.6',
      });
      expect(match.catalogDisplacementCc).toBe(1598);
      expect(match.timingSystem).toBe('ZINCIR');
      expect(match.canonicalFuelType).toBe('PETROL');
    });

    it('resolves BMW 320d to 1995 cc, ZINCIR, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'BMW',
        model: '320d',
        engineCode: '320d',
      });
      expect(match.catalogDisplacementCc).toBe(1995);
      expect(match.timingSystem).toBe('ZINCIR');
      expect(match.canonicalFuelType).toBe('DIESEL');
    });

    it('resolves Mercedes C200d OM654 2.0 to 1950 cc, ZINCIR, DIESEL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Mercedes-Benz',
        model: 'C 200 d',
        engineCode: 'OM654',
      });
      expect(match.catalogDisplacementCc).toBe(1950);
      expect(match.timingSystem).toBe('ZINCIR');
      expect(match.canonicalFuelType).toBe('DIESEL');
    });
  });

  describe('Toyota & Honda', () => {
    it('resolves Toyota 1.8 Hybrid to 1798 cc, ZINCIR, HYBRID', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Toyota',
        model: 'Corolla',
        engineCode: '1.8 Hybrid',
        isHybrid: true,
      });
      expect(match.catalogDisplacementCc).toBe(1798);
      expect(match.timingSystem).toBe('ZINCIR');
      expect(match.canonicalFuelType).toBe('HYBRID');
    });

    it('resolves Honda 1.5 VTEC Turbo to 1498 cc, ZINCIR, PETROL', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'Honda',
        model: 'Civic',
        engineCode: '1.5 VTEC',
      });
      expect(match.catalogDisplacementCc).toBe(1498);
      expect(match.timingSystem).toBe('ZINCIR');
      expect(match.canonicalFuelType).toBe('PETROL');
    });
  });

  describe('Electric Vehicles (BEV)', () => {
    it('resolves EV to null cc, NONE, ELECTRIC', () => {
      const match = resolveAutomotiveEngineTaxonomy({
        brand: 'BYD',
        model: 'Han',
        engineCode: 'Elektrik Motoru (517 HP)',
        isElectric: true,
      });
      expect(match.catalogDisplacementCc).toBeNull();
      expect(match.timingSystem).toBe('NONE');
      expect(match.canonicalFuelType).toBe('ELECTRIC');
    });
  });
});
