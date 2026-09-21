import { lookupAutomotiveTransmissionTaxonomy } from '../automotiveTransmissionTaxonomy';

describe('Automotive Transmission Taxonomy & Catalog', () => {
  describe('Electric Vehicles (BEV)', () => {
    it('resolves BEV to Single Speed Reduction gear', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Tesla',
        model: 'Model 3',
        fuelType: 'Elektrik',
        isElectric: true,
      });
      expect(match.clutchType).toBe('ELEKTRIKLI_TEK_ORANLI');
      expect(match.transmissionSpeeds).toBe(1);
      expect(match.transmissionFamily).toBe('REDÜKTÖR');
      expect(match.transmissionTypeAndSpeeds).toBe('Tek Kademeli Redüktör Şanzıman');
    });
  });

  describe('Manual Transmissions', () => {
    it('resolves Fiat Egea 1.3 MultiJet Manuel to 5-Speed Manual', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Fiat',
        model: 'Egea',
        engineCode: '1.3 MultiJet',
        transmissionName: 'Manuel',
      });
      expect(match.clutchType).toBe('MANUEL');
      expect(match.transmissionSpeeds).toBe(5);
      expect(match.transmissionTypeAndSpeeds).toBe('5 İleri Manuel');
    });

    it('resolves VW Golf 1.6 TDI Manuel to 5-Speed Manual', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Volkswagen',
        model: 'Golf',
        engineCode: '1.6 TDI',
        transmissionName: 'Düz (Manuel)',
      });
      expect(match.clutchType).toBe('MANUEL');
      expect(match.transmissionSpeeds).toBe(5);
      expect(match.transmissionTypeAndSpeeds).toBe('5 İleri Manuel');
    });

    it('resolves Fiat Egea 1.4 Fire Manuel to 6-Speed Manual', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Fiat',
        model: 'Egea',
        engineCode: '1.4 Fire',
        transmissionName: 'Manuel',
      });
      expect(match.clutchType).toBe('MANUEL');
      expect(match.transmissionSpeeds).toBe(6);
      expect(match.transmissionTypeAndSpeeds).toBe('6 İleri Manuel');
    });
  });

  describe('VAG DSG / S-Tronic', () => {
    it('resolves VW Golf 1.0 TSI Otomatik to 7-Speed Dry DSG (DQ200)', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Volkswagen',
        model: 'Golf',
        engineCode: '1.0 TSI',
        transmissionName: 'Otomatik',
      });
      expect(match.clutchType).toBe('KURU_CIFT_KAVRAMA');
      expect(match.transmissionSpeeds).toBe(7);
      expect(match.transmissionFamily).toBe('DSG');
      expect(match.transmissionCode).toBe('DQ200 / 0CW');
    });

    it('resolves VW Passat 2.0 TDI Otomatik to 7-Speed Wet DSG (DQ381)', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Volkswagen',
        model: 'Passat',
        engineCode: '2.0 TDI',
        transmissionName: 'Yarı Otomatik',
      });
      expect(match.clutchType).toBe('ISLAK_CIFT_KAVRAMA');
      expect(match.transmissionSpeeds).toBe(7);
      expect(match.transmissionFamily).toBe('DSG');
      expect(match.transmissionCode).toBe('DQ381');
    });

    it('resolves VW Touareg Otomatik to 8-Speed Torque Converter (ZF 8HP)', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Volkswagen',
        model: 'Touareg',
        engineCode: '3.0 TDI',
        transmissionName: 'Otomatik',
      });
      expect(match.clutchType).toBe('TORK_KONVERTORLU');
      expect(match.transmissionSpeeds).toBe(8);
      expect(match.transmissionTypeAndSpeeds).toContain('8 İleri Tork Konvertörlü');
    });
  });

  describe('Renault EDC & X-Tronic', () => {
    it('resolves Renault Megane 1.5 Blue dCi (2020) to 7-Speed Wet EDC (7DCT300)', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Renault',
        model: 'Megane',
        engineCode: '1.5 Blue dCi',
        modelYear: 2020,
        transmissionName: 'Yarı Otomatik',
      });
      expect(match.clutchType).toBe('ISLAK_CIFT_KAVRAMA');
      expect(match.transmissionSpeeds).toBe(7);
      expect(match.transmissionFamily).toBe('EDC');
      expect(match.transmissionCode).toBe('7DCT300');
    });

    it('resolves Renault Clio 1.5 dCi (2016) to 6-Speed Dry EDC (DC4)', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Renault',
        model: 'Clio',
        engineCode: '1.5 dCi',
        modelYear: 2016,
        transmissionName: 'Yarı Otomatik',
      });
      expect(match.clutchType).toBe('KURU_CIFT_KAVRAMA');
      expect(match.transmissionSpeeds).toBe(6);
      expect(match.transmissionFamily).toBe('EDC');
      expect(match.transmissionCode).toBe('DC4');
    });
  });

  describe('PSA / Stellantis (Peugeot, Citroen, Opel)', () => {
    it('resolves Peugeot 3008 1.5 BlueHDi (2020) to 8-Speed Aisin EAT8', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Peugeot',
        model: '3008',
        engineCode: '1.5 BlueHDi',
        modelYear: 2020,
        transmissionName: 'Otomatik',
      });
      expect(match.clutchType).toBe('TORK_KONVERTORLU');
      expect(match.transmissionSpeeds).toBe(8);
      expect(match.transmissionFamily).toBe('EAT8');
      expect(match.transmissionTypeAndSpeeds).toContain('EAT8');
    });

    it('resolves Peugeot 308 1.6 e-HDi (2013) to 6-Speed Robotized Auto6R', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Peugeot',
        model: '308',
        engineCode: '1.6 e-HDi',
        modelYear: 2013,
        transmissionName: 'Yarı Otomatik',
      });
      expect(match.clutchType).toBe('ROBOTIZE_TEK_KAVRAMA');
      expect(match.transmissionSpeeds).toBe(6);
      expect(match.transmissionFamily).toBe('ETG6 / AUTO6R');
    });
  });

  describe('BMW & Mercedes-Benz', () => {
    it('resolves BMW 320i (2018) to 8-Speed Torque Converter ZF 8HP', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'BMW',
        model: '320i',
        engineCode: '1.6 B48',
        modelYear: 2018,
        transmissionName: 'Otomatik',
      });
      expect(match.clutchType).toBe('TORK_KONVERTORLU');
      expect(match.transmissionSpeeds).toBe(8);
      expect(match.transmissionFamily).toBe('ZF 8HP');
      expect(match.transmissionCode).toContain('ZF 8HP');
    });

    it('resolves Mercedes C200d (2019) to 9-Speed 9G-Tronic', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Mercedes-Benz',
        model: 'C 200 d',
        engineCode: '1.6 OM654',
        modelYear: 2019,
        transmissionName: 'Otomatik',
      });
      expect(match.clutchType).toBe('TORK_KONVERTORLU');
      expect(match.transmissionSpeeds).toBe(9);
      expect(match.transmissionFamily).toBe('9G-TRONIC');
    });

    it('resolves Mercedes CLA 180 (2016) to 7-Speed 7G-DCT', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Mercedes-Benz',
        model: 'CLA 180',
        engineCode: '1.6 M270',
        modelYear: 2016,
        transmissionName: 'Yarı Otomatik',
      });
      expect(match.clutchType).toBe('ISLAK_CIFT_KAVRAMA');
      expect(match.transmissionSpeeds).toBe(7);
      expect(match.transmissionFamily).toBe('7G-DCT');
    });
  });

  describe('Toyota & Honda', () => {
    it('resolves Toyota Corolla Hybrid to Electronic e-CVT', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Toyota',
        model: 'Corolla',
        engineCode: '1.8 Hybrid',
        fuelType: 'Hibrit',
        isHybrid: true,
        transmissionName: 'Otomatik',
      });
      expect(match.clutchType).toBe('ELEKTRONIK_PLANET_HIBRIT');
      expect(match.transmissionFamily).toBe('e-CVT');
      expect(match.transmissionTypeAndSpeeds).toContain('e-CVT');
    });

    it('resolves Toyota Corolla 1.6 Benzinli to Multidrive S CVT', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Toyota',
        model: 'Corolla',
        engineCode: '1.6 Valvematic',
        fuelType: 'Benzin',
        transmissionName: 'Otomatik',
      });
      expect(match.clutchType).toBe('CVT');
      expect(match.transmissionFamily).toBe('MULTIDRIVE S');
      expect(match.transmissionTypeAndSpeeds).toContain('Multidrive S');
    });

    it('resolves Honda Civic 1.6 i-DTEC Dizel Otomatik to 9-Speed ZF 9HP', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Honda',
        model: 'Civic',
        engineCode: '1.6 i-DTEC',
        fuelType: 'Dizel',
        transmissionName: 'Otomatik',
      });
      expect(match.clutchType).toBe('TORK_KONVERTORLU');
      expect(match.transmissionSpeeds).toBe(9);
      expect(match.transmissionFamily).toBe('ZF 9HP');
    });
  });

  describe('Fiat & Ford', () => {
    it('resolves Fiat Egea 1.6 MultiJet Otomatik to 6-Speed DDCT C635', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Fiat',
        model: 'Egea',
        engineCode: '1.6 MultiJet',
        transmissionName: 'Yarı Otomatik',
      });
      expect(match.clutchType).toBe('KURU_CIFT_KAVRAMA');
      expect(match.transmissionSpeeds).toBe(6);
      expect(match.transmissionFamily).toBe('DDCT');
    });

    it('resolves Fiat Egea 1.6 E-Torq Otomatik to 6-Speed Aisin Torque Converter', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Fiat',
        model: 'Egea',
        engineCode: '1.6 E-Torq',
        transmissionName: 'Otomatik',
      });
      expect(match.clutchType).toBe('TORK_KONVERTORLU');
      expect(match.transmissionSpeeds).toBe(6);
      expect(match.transmissionFamily).toBe('AISIN 6-AT');
    });

    it('resolves Ford Focus 2013 1.6 Ti-VCT to Powershift Dry DCT', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Ford',
        model: 'Focus',
        engineCode: '1.6 Ti-VCT',
        modelYear: 2013,
        transmissionName: 'Yarı Otomatik',
      });
      expect(match.clutchType).toBe('KURU_CIFT_KAVRAMA');
      expect(match.transmissionFamily).toBe('POWERSHIFT');
    });

    it('resolves Ford Focus 2020 1.5 EcoBlue to 8-Speed 8F35', () => {
      const match = lookupAutomotiveTransmissionTaxonomy({
        brand: 'Ford',
        model: 'Focus',
        engineCode: '1.5 EcoBlue',
        modelYear: 2020,
        transmissionName: 'Otomatik',
      });
      expect(match.clutchType).toBe('TORK_KONVERTORLU');
      expect(match.transmissionSpeeds).toBe(8);
      expect(match.transmissionFamily).toBe('8F35');
    });
  });
});
