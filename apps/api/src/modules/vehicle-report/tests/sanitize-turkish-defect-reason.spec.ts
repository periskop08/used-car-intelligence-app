import {
  isEnglishOrForeignText,
  sanitizeTurkishDefectDescription,
  sanitizeTurkishDefectTitle,
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
    it('replaces English recall snippet with authoritative Turkish engineering description', () => {
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
      expect(cleaned).toContain('çift kavramalı otomatik şanzıman');
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
});
