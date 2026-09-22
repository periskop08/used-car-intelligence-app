import { VehicleReportAuditorService, isUserNeglectOrRoutineMaintenance, isShowroomOrLineupWhining } from '../vehicle-report-auditor.service';

describe('VehicleReportAuditorService (Researcher 2 & 3-Way Tie-Breaker)', () => {
  let auditor: VehicleReportAuditorService;
  let mockOrchestrator: any;

  beforeEach(() => {
    mockOrchestrator = {
      generateListingAdvice: jest.fn().mockResolvedValue({
        answer: 'BALANCED_DAILY_CRUISER',
      }),
    };
    auditor = new VehicleReportAuditorService(mockOrchestrator);
  });

  describe('isUserNeglectOrRoutineMaintenance', () => {
    it('should detect routine transmission fluid change as user maintenance, not vehicle chronic defect', () => {
      expect(isUserNeglectOrRoutineMaintenance('Otomatik Şanzıman Yağ Değişim Zamanlaması', 'Zamanında değiştirilmemesi durumunda')).toBe(true);
      expect(isUserNeglectOrRoutineMaintenance('Periyodik Bakım Aksatılması')).toBe(true);
      expect(isUserNeglectOrRoutineMaintenance('Filtre Değişim Periyodu')).toBe(true);
    });

    it('should not flag genuine manufacturing/mechanical defects', () => {
      expect(isUserNeglectOrRoutineMaintenance('DSG Mekatronik Basınç Tüpü Arızası')).toBe(false);
      expect(isUserNeglectOrRoutineMaintenance('Subap Erimesi ve Kompresyon Kaybı')).toBe(false);
      expect(isUserNeglectOrRoutineMaintenance('Diferansiyel Uğultusu ve Bilya Dağılması')).toBe(false);
    });
  });

  describe('isShowroomOrLineupWhining', () => {
    it('should flag whining about alternative motor choices or lineup limitations', () => {
      expect(isShowroomOrLineupWhining('Sınırlı Motor Seçenekleri', 'Impreza sadece 2.0 motor ile sunulmaktadır')).toBe(true);
      expect(isShowroomOrLineupWhining('Daha Güçlü Motor Seçenekleri Arayanlar', 'Alternatif motor seçeneği kısıtlıdır')).toBe(true);
    });

    it('should not flag genuine vehicle-specific engineering compromises', () => {
      expect(isShowroomOrLineupWhining('4 İleri Şanzıman Otoyol Oranları', '120 km/s üzerinde yüksek devir')).toBe(false);
      expect(isShowroomOrLineupWhining('Sert Süspansiyon Karakteri', 'Kısa stroklu yaylar')).toBe(false);
    });
  });

  describe('auditAndHarmonizeReport', () => {
    it('should strip user neglect primary risk and rewrite lineup whining compromises', async () => {
      const mockReport: any = {
        vehicleIdentity: {
          brand: 'Subaru',
          model: 'Impreza',
          modelYear: 2006,
          enginePowerHp: 160,
          transmissionName: '4 İleri Tork Konvertörlü Otomatik (Subaru 4EAT)',
          averageFuelConsumption: 8.9,
        },
        expertDecisionSynthesis: {
          vehicleCharacter: {
            headline: '2006 Subaru Impreza Active: Güçlü Performans ve Konfor',
            detailedAssessment: 'Güçlü performans ve konforun birleştiği nokta.',
          },
          primaryTechnicalRisk: {
            title: 'Otomatik Şanzıman Yağ Değişim Zamanlaması',
            explanation: 'Zamanında değiştirilmemesi durumunda kayma yapar.',
          },
          compromisesAndLimitations: [
            {
              title: 'Sınırlı Motor Seçenekleri',
              explanation: 'Sadece 2.0 motor ile sunulması performans arayanlar için kısıtlama.',
            },
          ],
          strongestReasonsToChoose: [
            {
              title: 'Doğrulanmış Veritabanı Şeffaflığı',
              explanation: 'Araç teknik verileri ve kronik arıza kayıtları TorqueScout veritabanı ile eşleştirilerek tarafsızca değerlendirilmiştir.',
            },
          ],
          suitableFor: [
            {
              profile: 'Şehir İçi Günlük Kullanıcılar',
              explanation: 'Tork konvertörlü tam otomatik rahatlığı ve Benzin (Ort. 8.9 lt/100km) yapısı yoğun şehir trafiğinde yakıt konforu sağlar.',
            },
            {
              profile: 'Sakin ve Öngörülebilir Sürüş İsteyenler',
              explanation: 'Sarsıntısız hızlanma ve Ort. 8.9 lt/100km arayan sürücüler için uygundur.',
            },
          ],
          notSuitableFor: [
            {
              profile: 'Yüksek Performans Arayanlar',
              explanation: 'Bu araç, performans odaklı sürücüler için yeterli gücü sunmuyor.',
            },
          ],
        },
      };

      const result = await auditor.auditAndHarmonizeReport(mockReport, {});

      // 1. Primary risk should be stripped because it was user maintenance neglect
      expect(result.report.expertDecisionSynthesis.primaryTechnicalRisk).toBeNull();

      // 2. Lineup whining compromise should be rewritten to actual car mechanical compromise
      const compTitle = result.report.expertDecisionSynthesis.compromisesAndLimitations[0].title;
      expect(compTitle).not.toContain('Sınırlı Motor Seçenekleri');
      expect(compTitle).toContain('4 İleri');

      // 3. Unrealistic 8.9L city fuel economy praise should be corrected
      const suitExpl = result.report.expertDecisionSynthesis.suitableFor[0].explanation;
      expect(suitExpl).toContain('yakıt tüketiminin artacağı');

      // 4. Contradiction between headline ("Güçlü Performans") and notSuitableFor ("yeterli gücü sunmuyor") should be resolved
      expect(result.auditResult.hasContradiction).toBe(true);
      expect(result.auditResult.tieBreakerApplied).toBe(true);
      expect(result.report.expertDecisionSynthesis.vehicleCharacter.headline).toContain('Dengeli Sürüş Karakteri ve Güvenilirlik');
      expect(result.report.expertDecisionSynthesis.notSuitableFor[0].explanation).toContain('160 HP atmosferik boxer motor');

      // 5. Platform self-promotion ("Veritabanı Şeffaflığı") should be replaced with real automotive merit
      const reasonTitle = result.report.expertDecisionSynthesis.strongestReasonsToChoose[0].title;
      expect(reasonTitle).not.toContain('Veritabanı');
      expect(reasonTitle).not.toContain('TorqueScout');
      expect(reasonTitle).toContain('Dengeli Şasi');

      // 6. Robotic consumption query ("Ort. 8.9 lt/100km arayan sürücüler") should be cleaned up
      const secondSuitExpl = result.report.expertDecisionSynthesis.suitableFor[1].explanation;
      expect(secondSuitExpl).not.toContain('arayan sürücüler');
      expect(secondSuitExpl).not.toContain('Ort. 8.9');
      expect(secondSuitExpl).toContain('sarsıntısız vites geçişleri');
    });

    it('should detect and harmonize 2006 Subaru Impreza Lineartronic CVT hallucination to 4EAT via Reverse Auditor & Arbiter', async () => {
      const hallucinatedSubaruReport: any = {
        vehicleIdentity: {
          brand: 'Subaru',
          model: 'Impreza',
          modelYear: 2006,
          enginePowerHp: 160,
          engineCode: '2.0',
          transmissionName: 'Kademesiz Zincirli Otomatik (Lineartronic CVT)',
          clutchType: 'CVT',
          averageFuelConsumption: 8.9,
          selected8Filters: {
            transmission: 'Kademesiz Zincirli Otomatik (Lineartronic CVT)',
          },
        },
        technicalSpecifications: {
          transmission: 'Kademesiz Zincirli Otomatik (Lineartronic CVT)',
        },
        expertDecisionSynthesis: {
          vehicleCharacter: {
            headline: 'Subaru Impreza 2006: Güvenilirlik ve Konforun Buluştuğu Nokta',
            detailedAssessment: 'Subaru Impreza 2006 modeli, atmosferik 2.0 litrelik motoru ve Kademesiz Zincirli Otomatik (Lineartronic CVT) şanzımanıyla dikkat çekiyor. CVT şanzımanın sunduğu sarsıntısız geçişler dur-kalk trafikte avantaj sağlıyor. Genel olarak ideal bir sedan olarak öne çıkıyor.Konforlu Sürüş Deneyimi',
          },
          dailyUseAssessment: {
            cityUse: 'Kademesiz Zincirli Otomatik (Lineartronic CVT) şanzıman, sürüş sırasında pürüzsüz geçişler sağlayarak konforu artırıyor.',
            highwayUse: 'CVT şanzıman otoyol sürüşlerinde sessiz bir seyir sağlar.',
          },
          suitableFor: [
            {
              profile: 'Konfor Odaklı Kullanıcılar',
              explanation: 'Lineartronic CVT şanzıman akıcı hızlanma sunar.',
            },
          ],
          notSuitableFor: [],
          purchaseConditions: [
            {
              title: 'CVT Zincir Aşınması',
              explanation: 'Lineartronic çelik zincirin durumu yetkili serviste kontrol edilmelidir.',
            },
          ],
          walkAwayConditions: [],
        },
      };

      const audited = await auditor.auditAndHarmonizeReport(hallucinatedSubaruReport, {});

      // 1. Contradiction must be detected
      expect(audited.auditResult.hasContradiction).toBe(true);
      expect(audited.auditResult.wasHarmonized).toBe(true);
      expect(audited.auditResult.contradictions.some((c) => c.includes('CVT / Lineartronic iddiaları'))).toBe(true);

      // 2. Identity must be updated to Subaru 4EAT
      expect(audited.report.vehicleIdentity.transmissionName).toBe('4 İleri Tork Konvertörlü Otomatik (Subaru 4EAT)');
      expect((audited.report.vehicleIdentity as any).clutchType).toBe('TORK_KONVERTORLU');
      expect((audited.report.vehicleIdentity as any).transmissionFamily).toBe('SUBARU 4EAT');
      expect((audited.report as any).technicalSpecifications.transmission).toBe('4 İleri Tork Konvertörlü Otomatik (Subaru 4EAT)');

      // 3. All CVT / Lineartronic claims must be scrubbed from text
      const assessment = audited.report.expertDecisionSynthesis.vehicleCharacter.detailedAssessment;
      expect(assessment).not.toContain('Lineartronic');
      expect(assessment).not.toContain('CVT');
      expect(assessment).toContain('4 İleri Tork Konvertörlü Otomatik (Subaru 4EAT)');

      // 4. Concatenated sentence typo (.Konforlu -> . Konforlu) must be cleaned
      expect(assessment).not.toContain('öne çıkıyor.Konforlu');
      expect(assessment).toContain('öne çıkıyor. Konforlu');

      // 5. City use must be rewritten for 4EAT torque converter
      const cityText = audited.report.expertDecisionSynthesis.dailyUseAssessment.cityUse;
      expect(cityText).not.toContain('Lineartronic');
      expect(cityText).not.toContain('CVT');
      expect(cityText).toContain('4 İleri Tork Konvertörlü Otomatik');
      expect(cityText).toContain('tork konvertörlü hidrolik aktarma');
    });

    it('should detect and harmonize 2012 Peugeot 308 hallucinating EAT8 to Auto6R/ETG6', async () => {
      const hallucinatedPeugeotReport: any = {
        vehicleIdentity: {
          brand: 'Peugeot',
          model: '308',
          modelYear: 2012,
          enginePowerHp: 112,
          engineCode: '1.6 e-HDi',
          transmissionName: '8 İleri Tork Konvertörlü Tam Otomatik (EAT8 - Aisin)',
          clutchType: 'TORK_KONVERTORLU',
        },
        expertDecisionSynthesis: {
          vehicleCharacter: {
            headline: 'Peugeot 308 2012: EAT8 Konforu',
            detailedAssessment: '1.6 e-HDi motor ve 8 İleri Tork Konvertörlü Tam Otomatik (EAT8) şanzıman mükemmel bir uyum sunar.',
          },
          dailyUseAssessment: {
            cityUse: 'EAT8 tam otomatik şanzıman sarsıntısız geçişler sağlar.',
          },
          suitableFor: [],
          notSuitableFor: [],
          purchaseConditions: [],
          walkAwayConditions: [],
        },
      };

      const audited = await auditor.auditAndHarmonizeReport(hallucinatedPeugeotReport, {});
      expect(audited.report.vehicleIdentity.transmissionName).not.toContain('EAT8');
      expect(audited.report.expertDecisionSynthesis.vehicleCharacter.detailedAssessment).not.toContain('EAT8');
    });

    it('should detect and harmonize BEV (Tesla Model 3) hallucinating dual-clutch / transmission oil', async () => {
      const hallucinatedTeslaReport: any = {
        vehicleIdentity: {
          brand: 'Tesla',
          model: 'Model 3',
          modelYear: 2023,
          enginePowerHp: 325,
          fuelType: 'Elektrik',
          transmissionName: '7 İleri Kuru Çift Kavramalı DSG',
          clutchType: 'KURU_CIFT_KAVRAMA',
        },
        expertDecisionSynthesis: {
          vehicleCharacter: {
            headline: 'Tesla Model 3: Elektrikli Hızlanma',
            detailedAssessment: 'Çift kavramalı şanzıman ve motor yağı düzenli kontrol edilmelidir.',
          },
          dailyUseAssessment: {
            cityUse: 'Vites geçişlerinde kavrama ısınmasına dikkat edilmelidir.',
          },
          suitableFor: [],
          notSuitableFor: [],
          purchaseConditions: [],
          walkAwayConditions: [],
        },
      };

      const audited = await auditor.auditAndHarmonizeReport(hallucinatedTeslaReport, {});
      expect(audited.report.vehicleIdentity.transmissionName).toContain('Redüktör');
      expect((audited.report.vehicleIdentity as any).clutchType).toBe('ELEKTRIKLI_TEK_ORANLI');
    });

    it('should harmonize horsepower when "Bu Araç Nasıl Bir Otomobil?" narrative claims 128 HP but technical card is contradictory or missing', async () => {
      const mockReport: any = {
        vehicleIdentity: {
          brand: 'Kia',
          model: 'Cerato',
          modelYear: 2022,
          enginePowerHp: 90, // Wrong / stale DB card HP
          transmissionName: '6 İleri Tork Konvertörlü Otomatik',
          transmissionCode: 'A6GF1',
          engineCode: 'G4FG',
        },
        performanceUsage: {
          powerHp: 90,
          sourcePowerValue: 90,
        },
        technicalSpecifications: {
          enginePowerHp: null,
        },
        expertDecisionSynthesis: {
          vehicleCharacter: {
            headline: '2022 Kia Cerato: Şehir İçi Konfor ve Ekonomi',
            detailedAssessment: 'Kia Cerato 2022 modeli, atmosferik 1.6 MPI motoru ve 128 HP gücüyle öne çıkıyor. Günlük kullanımda yeterli performans sunar.',
          },
          suitableFor: [],
          notSuitableFor: [],
          purchaseConditions: [],
          walkAwayConditions: [],
        },
      };

      const audited = await auditor.auditAndHarmonizeReport(mockReport, {});

      // 1. Contradiction detected and harmonized
      expect(audited.auditResult.hasContradiction).toBe(true);
      expect(audited.auditResult.wasHarmonized).toBe(true);

      // 2. Technical specification cards harmonized to narrative's 128 HP
      expect(audited.report.vehicleIdentity.enginePowerHp).toBe(128);
      expect(audited.report.vehicleIdentity.canonicalDisplayPowerHp).toBe(128);
      expect(audited.report.performanceUsage.powerHp).toBe(128);
      expect(audited.report.performanceUsage.sourcePowerValue).toBe(128);
      expect((audited.report as any).technicalSpecifications.enginePowerHp).toBe(128);
    });
  });
});
