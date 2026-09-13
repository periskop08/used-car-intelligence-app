import { ResearchEvidenceValidationService } from '../research-evidence-validation.service';

describe('ResearchEvidenceValidationService', () => {
  let service: ResearchEvidenceValidationService;

  beforeEach(() => {
    service = new ResearchEvidenceValidationService();
  });

  it('should calculate backend reliability scores correctly based on SourceKind', () => {
    const rawResearch = {
      groundingSources: [
        { sourceId: 'S1', url: 'https://www.kia.com/tr/brochure.pdf', domain: 'kia.com', sourceKind: 'OFFICIAL_MANUFACTURER' },
        { sourceId: 'S2', url: 'https://forum.golfmk7.com/topic/1', domain: 'golfmk7.com', sourceKind: 'SPECIALIST_FORUM' },
        { sourceId: 'S3', url: 'https://randomblog.com/post', domain: 'randomblog.com', sourceKind: 'OTHER' },
      ],
      claims: [],
    };

    const validated = service.validateResearchData(rawResearch, {});
    expect(validated.groundingSources).toHaveLength(3);
    
    const s1 = validated.groundingSources.find((s) => s.sourceId === 'S1');
    const s2 = validated.groundingSources.find((s) => s.sourceId === 'S2');
    const s3 = validated.groundingSources.find((s) => s.sourceId === 'S3');

    expect(s1?.reliabilityScore).toBe(100);
    expect(s2?.reliabilityScore).toBe(55);
    expect(s3?.reliabilityScore).toBe(20);
  });

  it('should mark claims as REJECTED when relevance checks fail', () => {
    const rawResearch = {
      groundingSources: [
        { sourceId: 'S1', url: 'https://kia.com', domain: 'kia.com', sourceKind: 'OFFICIAL_MANUFACTURER' },
      ],
      claims: [
        {
          claimId: 'CLM-1',
          claimText: 'Farklı şanzıman verisi',
          category: 'EQUIPMENT',
          claimType: 'FACT',
          sources: [{ sourceId: 'S1', stance: 'SUPPORTS' }],
          relevance: {
            transmission: { required: true, match: false },
          },
        },
      ],
    };

    const validated = service.validateResearchData(rawResearch, {});
    const clm1 = validated.claims.find((c) => c.claimId === 'CLM-1');
    expect(clm1?.verificationStatus).toBe('REJECTED');
  });

  it('should verify DERIVED_CONCLUSION claims only if parent claims are verified', () => {
    const rawResearch = {
      groundingSources: [
        { sourceId: 'S1', url: 'https://kia.com', domain: 'kia.com', sourceKind: 'OFFICIAL_MANUFACTURER' },
      ],
      claims: [
        {
          claimId: 'CLM-PARENT',
          claimText: 'Motor torku düşük devirde yüksek değildir.',
          category: 'CHARACTER',
          claimType: 'FACT',
          sources: [{ sourceId: 'S1', stance: 'SUPPORTS' }],
          relevance: {},
        },
        {
          claimId: 'CLM-DERIVED',
          claimText: 'Sportif ara hızlanma arayan kullanıcıya uygun değildir.',
          category: 'CHARACTER',
          claimType: 'DERIVED_CONCLUSION',
          derivedFromClaimIds: ['CLM-PARENT'],
          sources: [],
          relevance: {},
        },
      ],
    };

    const validated = service.validateResearchData(rawResearch, {});
    const derived = validated.claims.find((c) => c.claimId === 'CLM-DERIVED');
    expect(derived?.verificationStatus).toBe('VERIFIED');
  });

  describe('Production-Parity Schema Compatibility & Power Extraction', () => {
    it('Scenario A: Real production questions schema produces verifiedTechnicalSpecs (e.g., 122 PS Hybrid)', () => {
      const productionCache = {
        questions: {
          engineTransmissionFit: {
            synthesisedAnswer: '2020 Toyota Corolla 1.8 Hybrid e-CVT toplam 122 PS sistem gücü üretir.',
            sources: [
              {
                title: 'Toyota Corolla 1.8 Hybrid Test Review',
                url: 'https://otomobil.com/toyota-corolla-1-8-hybrid-test',
                domain: 'otomobil.com',
                relevantSnippet: 'Corolla 1.8 Hybrid 122 PS güç ve e-CVT şanzıman ile düşük tüketim sunar.',
              },
            ],
          },
        },
      };

      const validated = service.validateResearchData(productionCache, {
        vehicleIdentity: { brand: 'Toyota', model: 'Corolla', fuelType: 'Hibrit' },
      });

      expect(validated.verifiedTechnicalSpecs).toBeDefined();
      expect(validated.verifiedTechnicalSpecs?.powerHp).toBe(122);
      expect(validated.verifiedTechnicalSpecs?.powerUnit).toBe('PS');
      expect(validated.verifiedTechnicalSpecs?.powerSource).toBe('VERIFIED_STAGE_1');
      expect(validated.verifiedTechnicalSpecs?.powerSemantic).toBe('TOTAL_HYBRID_SYSTEM_POWER');
      expect(validated.groundingSources).toHaveLength(1);
      expect(validated.groundingSources[0].url).toBe('https://otomobil.com/toyota-corolla-1-8-hybrid-test');
    });

    it('Scenario B: Legacy top-level groundingSources and answers schema still works', () => {
      const legacyResearch = {
        groundingSources: [
          {
            url: 'https://autocar.co.uk/review',
            domain: 'autocar.co.uk',
            evidenceExcerpt: 'The 1.5 dCi engine develops 110 HP and 260 Nm of torque.',
          },
        ],
        answers: {
          Q2: { answerText: 'Motor 110 HP güç üretmektedir.' },
        },
      };

      const validated = service.validateResearchData(legacyResearch, {
        vehicleIdentity: { brand: 'Renault', model: 'Megane', fuelType: 'Dizel' },
      });

      expect(validated.verifiedTechnicalSpecs).toBeDefined();
      expect(validated.verifiedTechnicalSpecs?.powerHp).toBe(110);
      expect(validated.verifiedTechnicalSpecs?.powerUnit).toBe('HP');
      expect(validated.verifiedTechnicalSpecs?.powerSource).toBe('VERIFIED_STAGE_1');
      expect(validated.verifiedTechnicalSpecs?.powerSemantic).toBe('STANDARD_POWER');
    });

    it('Scenario C: Duplicate sources across questions or groundingSources are deduplicated', () => {
      const duplicateSourcesResearch = {
        groundingSources: [
          { url: 'https://toyota.com.tr/corolla', domain: 'toyota.com.tr', evidenceExcerpt: '122 PS hibrit' },
        ],
        questions: {
          q1: {
            sources: [
              { url: 'https://toyota.com.tr/corolla', domain: 'toyota.com.tr', relevantSnippet: '122 PS hibrit' },
              { url: 'https://motor1.com/review', domain: 'motor1.com', relevantSnippet: '122 PS hibrit sistem' },
            ],
          },
          q2: {
            sources: [
              { url: 'https://motor1.com/review', domain: 'motor1.com', relevantSnippet: '122 PS' },
            ],
          },
        },
      };

      const validated = service.validateResearchData(duplicateSourcesResearch, {
        vehicleIdentity: { brand: 'Toyota', model: 'Corolla', fuelType: 'Hibrit' },
      });

      expect(validated.groundingSources).toHaveLength(2);
      const urls = validated.groundingSources.map((s) => s.url);
      expect(urls).toContain('https://toyota.com.tr/corolla');
      expect(urls).toContain('https://motor1.com/review');
    });

    it('Scenario D: No valid source or power evidence => verifiedTechnicalSpecs remains undefined', () => {
      const emptyResearch = {
        questions: {
          q1: {
            synthesisedAnswer: 'Bu araç C segmenti bir aile sedanıdır.',
            sources: [
              { url: 'https://general-car.com', domain: 'general-car.com', relevantSnippet: 'Kabin genişliği ferah.' },
            ],
          },
        },
      };

      const validated = service.validateResearchData(emptyResearch, {
        vehicleIdentity: { brand: 'Toyota', model: 'Corolla', fuelType: 'Hibrit' },
      });

      expect(validated.verifiedTechnicalSpecs).toBeUndefined();
    });
  });
});
