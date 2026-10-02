/// <reference types="jest" />
import { VehicleReportProviderService } from '../vehicle-report-provider.service';
import { VehicleReportAuditorService } from '../vehicle-report-auditor.service';
import { VehicleReportSemanticValidationService } from '../vehicle-report-semantic-validation.service';

describe('Final Gatekeeper Verification & Sanitization Board', () => {
  let providerService: VehicleReportProviderService;
  let auditorService: VehicleReportAuditorService;

  beforeAll(() => {
    const mockAiProvider: any = {
      generateListingAdvice: jest.fn(),
    };
    const mockPromptService: any = {};
    const mockFallbackService: any = {};
    const mockEvidenceValidationService: any = {};
    const semanticValidationService = new VehicleReportSemanticValidationService();
    const mockScoringService: any = {};

    auditorService = new VehicleReportAuditorService(mockAiProvider);
    providerService = new VehicleReportProviderService(
      mockPromptService,
      mockFallbackService,
      mockEvidenceValidationService,
      semanticValidationService,
      mockScoringService,
      mockAiProvider,
      undefined,
      undefined,
      auditorService,
    );
  });

  describe('Layer 3 & 4: Transmission Hallucination Scrubber (Dual-Clutch vs Torque Converter)', () => {
    it('deterministically scrubs "tork konvertörlü" from dual-clutch vehicle reports in both auditor and gatekeeper', async () => {
      const mockFluenceReport: any = {
        vehicleIdentity: {
          brand: 'Renault',
          model: 'Fluence',
          modelYear: 2016,
          bodyType: 'Sedan',
          transmissionName: '6 İleri EDC',
          clutchType: 'KURU_CIFT_KAVRAMA',
          fuelType: 'Dizel',
        },
        expertDecisionSynthesis: {
          vehicleCharacter: {
            headline: 'Renault Fluence 1.5 dCi İncelemesi',
            detailedAssessment: 'Renault Fluence, 1.5 dCi motoru ile 110 HP güç üretiyor.',
          },
          dailyUseAssessment: {
            cityUse: 'Şehir içi manevra kabiliyeti oldukça iyi.',
            highwayUse: 'Otoyol sürüşlerinde stabil.',
          },
          strongestReasonsToChoose: [
            {
              title: 'Konforlu Sürüş Dinamikleri',
              explanation: 'Tork konvertörlü şanzıman, şehir içi ve otoyol sürüşlerinde pürüzsüz geçişler sağlarken sürücülere konforlu bir deneyim sunuyor.',
            },
          ],
          compromisesAndLimitations: [
            {
              title: 'Düşük Hızlarda Vites Geçişi',
              explanation: 'Düşük hızlarda tork konvertörlü vites geçişleri bazen hissedilebilir olabiliyor.',
            },
          ],
          suitableFor: [],
          notSuitableFor: [
            {
              profile: 'Sert Arazi Kullanıcıları',
              explanation: 'Fluence, sedan kasa yapısı nedeniyle sert arazi koşullarında yetersiz kalabilir.',
            },
          ],
          purchaseConditions: [],
          walkAwayConditions: [],
        },
        sellerQuestions: [
          {
            category: 'ŞANZIMAN',
            questionText: 'Bu aracın motor ve şanzımanına (1.5 dCi 6 İleri Yarı Otomatik) özgü kronik zayıflık veya ağır bakım geçmişini hedef alan teknik mülakat sorusu (örn: Triger kayışı/zinciri ve devirdaim pompası en son hangi kilometrede ve yetkili/uzman serviste orijinal parçayla mı değişti?)...',
            expectedAnswerHint: 'Satıcıdan beklenen somut yanıt (örn: 85.000 km\'de yetkili serviste değişti)...',
            redFlagAnswerHint: 'Satıcının kaçamak yanıtı (örn: Usta baktı daha gider dedi)...',
          },
        ],
        commonProblems: [
          {
            title: 'Devirdaim Sızıntısı',
            description: '5568.webp) ![](/uploads/media/b90b411f9cbfdb02.webp) ## 1.5 dCi Motorlarda Hararet Sorunu Nedir? İçten yanmalı motorlar çalışırken yüksek miktarda ısı üretir. ![Aracını Oto Panorama Garajı\'na ekle](/img/banners/arac-ekle.webp) Belirtileri aşağıdaki belirtile.',
          },
        ],
      };

      // Run Auditor pass
      const auditResult = await auditorService.auditAndHarmonizeReport(mockFluenceReport, {});
      expect(auditResult.auditResult.wasHarmonized).toBe(true);

      // Run Final Gatekeeper pass (sanitizeIncompatibleReportFields)
      (providerService as any).sanitizeIncompatibleReportFields(auditResult.report, {
        vehicleIdentity: mockFluenceReport.vehicleIdentity,
      });

      const synth = auditResult.report.expertDecisionSynthesis;

      // 1. Verify "tork konvertörlü" is eradicated from strongestReasonsToChoose
      expect(synth.strongestReasonsToChoose[0].explanation).not.toContain('Tork konvertörlü');
      expect(synth.strongestReasonsToChoose[0].explanation).toContain('şanzıman');

      // 2. Verify "tork konvertörlü" is eradicated from compromisesAndLimitations
      expect(synth.compromisesAndLimitations[0].explanation).not.toContain('tork konvertörlü');

      // 3. Verify "Sert Arazi" persona is harmonized to uneven road conditions for Sedan
      expect(synth.notSuitableFor[0].profile).toBe('Bozuk Zemin ve Engebeli Yol Şartları');

      // 4. Verify seller questions prompt meta-leak is scrubbed
      const q = auditResult.report.sellerQuestions[0];
      expect(q.questionText).not.toContain('mülakat sorusu');
      expect(q.questionText).not.toContain('(örn:');
      expect(q.questionText).toContain('Triger');
      expect(q.expectedAnswerHint).not.toContain('Satıcıdan beklenen');
      expect(q.expectedAnswerHint).toContain('yetkili');
      expect(q.redFlagAnswerHint).not.toContain('Satıcının kaçamak');
      expect(q.redFlagAnswerHint).toContain('Usta baktı');

      // 5. Verify scraping artifacts (![], webp, Panorama Garajı) are scrubbed
      const problem = auditResult.report.commonProblems[0];
      expect(problem.description).not.toContain('webp');
      expect(problem.description).not.toContain('![]');
      expect(problem.description).not.toContain('Panorama Garajı');
    });
  });
});
