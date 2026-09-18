import {
  isEnglishOrForeignText,
  sanitizeTurkishDefectDescription,
  sanitizeTurkishDefectTitle,
  sanitizeTurkishInspectionInstruction,
  formatVehicleAssessmentParagraphs,
  formatVehicleAssessmentText,
  replacePsWithHp,
} from '@used-car-intelligence/shared';

describe('sanitizeTurkishDefectReason', () => {
  describe('isEnglishOrForeignText', () => {
    it('detects English recall snippets with multiple keywords', () => {
      const text =
        'RECALL: More than 16,000 VW Polo, Golf, Jetta and Passat cars have dual-clutch transmission issue ... The Golf has been caught up in a new recall.';
      expect(isEnglishOrForeignText(text)).toBe(true);
    });

    it('detects English consequence and safety warnings', () => {
      expect(isEnglishOrForeignText('A fuel leak in the presence of an ignition source increases the risk of a fire.')).toBe(true);
      expect(isEnglishOrForeignText('Improper bolt torque during assembly at Puebla assembly plant')).toBe(true);
      expect(isEnglishOrForeignText('Rubber belt degradation in engine oil leads to oil starvation and vacuum pump braking assist failure')).toBe(true);
    });

    it('does not flag clean Turkish sentences as English', () => {
      const trText =
        'Bazı kullanıcılar, 2014-2015 yılları arasında üretilen Polo 1.2 TSI modellerinde kam mili ayarlayıcı cıvatasının gevşeyebileceğini bildirmiştir. Bu durum motor performansını etkileyebilir.';
      expect(isEnglishOrForeignText(trText)).toBe(false);
    });
  });

  describe('sanitizeTurkishDefectDescription', () => {
    it('replaces English recall snippet with authoritative Turkish engineering description without (DSG / EDC)', () => {
      const raw =
        'RECALL: More than 16,000 VW Polo, Golf, Jetta and Passat cars have dual-clutch transmission issue ... The Golf has been caught up in a new recall.';
      const cleaned = sanitizeTurkishDefectDescription(raw, {
        domain: 'POWERTRAIN_TRANS',
        failureMode: 'DUAL_CLUTCH_WEAR',
        title: 'Kuru Çift Kavrama Aşınması',
      });

      expect(cleaned).not.toContain('RECALL');
      expect(cleaned).not.toContain('Golf');
      expect(cleaned).not.toContain('...');
      expect(cleaned).not.toContain('(DSG / EDC)');
      expect(cleaned).toContain('çift kavramalı otomatik şanzıman');
    });

    it('removes (DSG / EDC) from existing Turkish descriptions', () => {
      const raw =
        'Kuru tip çift kavramalı otomatik şanzımanlarda (DSG / EDC) yoğun dur-kalk trafikte kavrama balatasında aşınma görülebilmektedir.';
      const cleaned = sanitizeTurkishDefectDescription(raw, {
        domain: 'POWERTRAIN_TRANS',
        failureMode: 'DUAL_CLUTCH',
      });
      expect(cleaned).not.toContain('(DSG / EDC)');
      expect(cleaned).toBe(
        'Kuru tip çift kavramalı otomatik şanzımanlarda yoğun dur-kalk trafikte kavrama balatasında aşınma görülebilmektedir.',
      );
    });

    it('cleans and completes Turkish sentences truncated with ellipsis (...)', () => {
      const raw =
        'Hararetle birlikte soğutma suyu eksiliyorsa öncelikle kaçak araştırılmalıdır. Kaçak noktaları arasında: Radyatör; Su hortumları; Termostat ...';
      const cleaned = sanitizeTurkishDefectDescription(raw, {
        domain: 'THERMAL_COOLING',
        failureMode: 'COOLANT_LEAK',
        title: 'Devirdaim & Termostat Soğutma Sıvısı Sızıntısı',
      });

      expect(cleaned).not.toContain('...');
      expect(cleaned).not.toContain('…');
      expect(cleaned).toContain('Hararetle birlikte soğutma suyu eksiliyorsa öncelikle kaçak araştırılmalıdır.');
      expect(cleaned).toContain('Radyatör');
    });

    it('preserves clean Turkish explanations without ellipsis', () => {
      const raw =
        'Bazı kullanıcılar, 2014-2015 yılları arasında üretilen Polo 1.2 TSI modellerinde kam mili ayarlayıcı cıvatasının gevşeyebileceğini bildirmiştir. Bu durum motor performansını etkileyebilir.';
      const cleaned = sanitizeTurkishDefectDescription(raw, {
        domain: 'POWERTRAIN_ENGINE',
        failureMode: 'CAMSHAFT_ADJUSTER',
      });

      expect(cleaned).toBe(raw);
    });

    it('replaces UNRESOLVED or social media captions with authoritative descriptions', () => {
      const unresolved = sanitizeTurkishDefectDescription('UNRESOLVED', {
        domain: 'POWERTRAIN_TRANS',
        failureMode: 'MECHATRONIC',
      });
      expect(unresolved).toContain('mekatronik');

      const ustaNotu = sanitizeTurkishDefectDescription(
        'Trafikte hararet yükselmesi ⚠️ Usta notu: Hararet bir kere yükseldiyse “idare eder” deme. DM\'den yaz ...',
        { domain: 'THERMAL_COOLING', failureMode: 'COOLANT_LEAK' },
      );
      expect(ustaNotu).not.toContain('Usta notu');
      expect(ustaNotu).not.toContain("DM'den");
      expect(ustaNotu).toContain('devirdaim su pompası ve termostat gövdesinde sızdırmazlık');
    });

    it('strictly strips volatile pricing and repair cost data (TL, EUR, USD, etc.)', () => {
      const withPrice =
        'Kavrama balatasında aşınma görülebilmektedir. Yetkili serviste onarım maliyeti 45.000 TL civarındadır.';
      const cleaned = sanitizeTurkishDefectDescription(withPrice, {
        domain: 'POWERTRAIN_TRANS',
        failureMode: 'DUAL_CLUTCH',
      });
      expect(cleaned).not.toContain('45.000 TL');
      expect(cleaned).not.toContain('maliyet');
      expect(cleaned).toBe('Kavrama balatasında aşınma görülebilmektedir.');

      const onlyPrice = 'Parça değişimi ve işçilik bedeli 25 bin TL tutmaktadır.';
      const fallbackCleaned = sanitizeTurkishDefectDescription(onlyPrice, {
        domain: 'POWERTRAIN_TRANS',
        failureMode: 'DUAL_CLUTCH',
      });
      expect(fallbackCleaned).not.toContain('25 bin TL');
      expect(fallbackCleaned).toContain('çift kavramalı otomatik şanzıman');
    });
  });

  describe('sanitizeTurkishDefectTitle', () => {
    it('standardizes English or slug titles into Turkish', () => {
      expect(sanitizeTurkishDefectTitle('DUAL_CLUTCH_WEAR', { failureMode: 'DUAL_CLUTCH' })).toBe(
        'Kuru Çift Kavrama Aşınması',
      );
      expect(sanitizeTurkishDefectTitle('COOLANT_LEAK', { failureMode: 'COOLANT_LEAK' })).toBe(
        'Devirdaim & Termostat Soğutma Sıvısı Sızıntısı',
      );
      expect(
        sanitizeTurkishDefectTitle('Hararetin Gizli Sebebi: Devirdaim (Su Pompası)! Aracın su ...', {
          domain: 'THERMAL_COOLING',
        }),
      ).toBe('Devirdaim & Termostat Soğutma Sıvısı Sızıntısı');
    });
  });

  describe('sanitizeTurkishInspectionInstruction', () => {
    it('cleans loanword "diagnostik" and duplicate typo "kavrama kavrama noktası"', () => {
      const raw =
        'Ekspertizde diagnostik cihaz ile kavrama kavrama noktası ve mekatronik hidrolik basınç değerleri okunmalıdır.';
      const cleaned = sanitizeTurkishInspectionInstruction(raw);
      expect(cleaned).toBe(
        'Ekspertizde bilgisayarlı arıza tespit cihazı ile kavrama temas noktası ve mekatronik hidrolik basınç değerleri okunmalıdır.',
      );
    });

    it('replaces diagnostik cihazda with bilgisayarlı arıza tespit cihazında', () => {
      const raw =
        'Diagnostik cihazda enjektör püskürtme ve yakıt ray basınç değerleri test edilmelidir.';
      const cleaned = sanitizeTurkishInspectionInstruction(raw);
      expect(cleaned).toBe(
        'Bilgisayarlı arıza tespit cihazında enjektör püskürtme ve yakıt ray basınç değerleri test edilmelidir.',
      );
    });
  });

  describe('formatVehicleAssessmentParagraphs', () => {
    it('strips numbered section titles and returns clean paragraphs', () => {
      const raw =
        "* **1. Motor ve Şanzıman Uyumu:** Ford'un 1.6 Ti-VCT motoru, 125 PS gücüyle şehir içi ve otoyol kullanımı için yeterli bir performans sunuyor. Yarı otomatik DCT şanzıman, vites geçişlerinde akıcı bir deneyim sağlarken, dur-kalk trafikte de rahat bir kullanım sunuyor. * **2. Donanım Seviyesi (Titanium):** Titanium donanım paketi, araca birçok konfor ve teknoloji unsuru ekliyor. Yüksek kaliteli iç mekan malzemeleri ve konforlu koltuklar uzun yolculuklarda keyifli bir deneyim sağlıyor. * **3. Sürüş Dinamikleri & Mekanik Karakter:** Ford Focus, süspansiyon sistemi sayesinde yol tutuşu ve sürüş dinamikleri açısından oldukça başarılı. * **4. Tüketim & Kullanım Maliyeti:** Katalog verilerine göre 6.1 L/100km yakıt tüketimi sunan Focus, gerçek dünyada ekonomiktir.";

      const paragraphs = formatVehicleAssessmentParagraphs(raw);
      expect(paragraphs.length).toBe(4);
      expect(paragraphs[0]).not.toContain('**1.');
      expect(paragraphs[0]).not.toContain('Motor ve Şanzıman Uyumu:');
      expect(paragraphs[0]).toContain("Ford'un 1.6 Ti-VCT motoru, 125 HP");
      expect(paragraphs[0]).not.toContain('125 PS');

      expect(paragraphs[1]).not.toContain('**2.');
      expect(paragraphs[1]).not.toContain('Donanım Seviyesi');
      expect(paragraphs[1]).toContain('Titanium donanım paketi, araca birçok konfor');

      expect(paragraphs[2]).not.toContain('**3.');
      expect(paragraphs[2]).toContain('Ford Focus, süspansiyon sistemi');

      expect(paragraphs[3]).not.toContain('**4.');
      expect(paragraphs[3]).toContain('Katalog verilerine göre');

      const text = formatVehicleAssessmentText(raw);
      expect(text).not.toContain('* **1.');
      expect(text).not.toContain('* **2.');
      expect(text).not.toContain('* **3.');
      expect(text).not.toContain('* **4.');
      expect(text).toContain('125 HP');
      expect(text).not.toContain('125 PS');
    });

    it('preserves already clean paragraph text while converting any lingering PS to HP', () => {
      const cleanText =
        '2016 model Fiat Egea 1.3 Multijet Easy Sedan, bütçe dostu bir aile otomobilidir. 95 PS gücündedir.';
      const paragraphs = formatVehicleAssessmentParagraphs(cleanText);
      expect(paragraphs.length).toBe(1);
      expect(paragraphs[0]).toBe(
        '2016 model Fiat Egea 1.3 Multijet Easy Sedan, bütçe dostu bir aile otomobilidir. 95 HP gücündedir.',
      );
    });
  });

  describe('replacePsWithHp', () => {
    it('converts diverse PS formats to HP strictly', () => {
      expect(replacePsWithHp('125 PS gücündeki motoru')).toBe('125 HP gücündeki motoru');
      expect(replacePsWithHp('125 ps gücüyle')).toBe('125 HP gücüyle');
      expect(replacePsWithHp('125PS motor')).toBe('125 HP motor');
      expect(replacePsWithHp("125 PS'lik ünite")).toBe("125 HP'lik ünite");
      expect(replacePsWithHp('Motor gücü (122 PS)')).toBe('Motor gücü (122 HP)');
      expect(replacePsWithHp('90 kW (122 PS)')).toBe('90 kW (122 HP)');
      expect(replacePsWithHp('HP/PS')).toBe('HP');
      expect(replacePsWithHp('PS gücünde')).toBe('HP gücünde');
      expect(replacePsWithHp('150 PS')).toBe('150 HP');
    });

    it('does not corrupt non-PS terms like EPS, GPS, PS5', () => {
      expect(replacePsWithHp('Elektrik destekli direksiyon sistemi (EPS) sorunsuz çalışır.')).toBe(
        'Elektrik destekli direksiyon sistemi (EPS) sorunsuz çalışır.',
      );
      expect(replacePsWithHp('GPS navigasyon sistemi mevcuttur.')).toBe('GPS navigasyon sistemi mevcuttur.');
      expect(replacePsWithHp('PS5 konsolu ile alakası yoktur.')).toBe('PS5 konsolu ile alakası yoktur.');
    });
  });
});

