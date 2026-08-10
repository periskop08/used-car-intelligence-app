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
});
