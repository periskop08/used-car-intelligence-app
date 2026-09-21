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
  });
});
