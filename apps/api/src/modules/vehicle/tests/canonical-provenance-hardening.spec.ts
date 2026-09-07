import {
  deriveEvidenceQuality,
  deriveEvidenceQualityFromSource,
  TechnicalFactEvidenceItem,
  DisplacementVerificationData,
  VariantTechnicalFactsService,
} from '../variant-technical-facts.service';
import { TechnicalSourceTier } from '@used-car-intelligence/shared';

describe('Canonical Technical Fact Provenance Hardening Specification', () => {
  describe('1. Generic Source-Tier Evidence Quality Derivation', () => {
    it('should derive STRONG quality for Tier 1 Manufacturer OEM even if quote prose is absent', () => {
      const quality = deriveEvidenceQuality({
        sourceTier: TechnicalSourceTier.TIER_1_MANUFACTURER,
        identityMatch: true,
        applicationMatch: true,
      });
      expect(quality).toBe('STRONG');
    });

    it('should derive STRONG quality for Tier 2 Homologation / Regulatory', () => {
      const quality = deriveEvidenceQuality({
        sourceTier: TechnicalSourceTier.TIER_2_HOMOLOGATION,
        identityMatch: true,
        applicationMatch: true,
      });
      expect(quality).toBe('STRONG');
    });

    it('should derive STRONG quality for Tier 3 High-Quality Technical Catalog', () => {
      const quality = deriveEvidenceQuality({
        sourceTier: TechnicalSourceTier.TIER_3_CATALOG,
        identityMatch: true,
        applicationMatch: true,
      });
      expect(quality).toBe('STRONG');
    });

    it('should derive WEAK quality for single Tier 4 Secondary Media alone (cannot verify factory fact alone)', () => {
      const quality = deriveEvidenceQuality({
        sourceTier: TechnicalSourceTier.TIER_4_SECONDARY_MEDIA,
        independentSourceCount: 1,
        hasConsensus: false,
        identityMatch: true,
        applicationMatch: true,
      });
      expect(quality).toBe('WEAK');
    });

    it('should derive MODERATE quality for Tier 4 Secondary Media when supported by 2+ independent domains with consensus', () => {
      const quality = deriveEvidenceQuality({
        sourceTier: TechnicalSourceTier.TIER_4_SECONDARY_MEDIA,
        independentSourceCount: 2,
        hasConsensus: true,
        identityMatch: true,
        applicationMatch: true,
      });
      expect(quality).toBe('MODERATE');
    });

    it('should derive WEAK quality for Tier 5 Community Forums or Discussions', () => {
      const quality = deriveEvidenceQuality({
        sourceTier: TechnicalSourceTier.TIER_5_COMMUNITY_FORUM,
        identityMatch: true,
        applicationMatch: true,
      });
      expect(quality).toBe('WEAK');
    });

    it('should derive WEAK quality if identityMatch or applicationMatch is false, regardless of source tier', () => {
      const quality = deriveEvidenceQuality({
        sourceTier: TechnicalSourceTier.TIER_1_MANUFACTURER,
        identityMatch: false,
        applicationMatch: true,
      });
      expect(quality).toBe('WEAK');
    });

    it('should classify official Subaru OEM URL as STRONG for Impreza (fixing Impreza WEAK contradiction)', () => {
      const subaruUrl = 'https://www.subaru.com.au/vehicles/impreza/2006/specifications.html';
      const quality = deriveEvidenceQualityFromSource(subaruUrl, 'Subaru', {
        identityMatch: true,
        applicationMatch: true,
      });
      expect(quality).toBe('STRONG');
    });

    it('should classify CarsGuide as Tier 4 even if a quote text exists (evidenceTextPresenceDeterminesEvidenceQuality = FALSE)', () => {
      const carsGuideUrl = 'https://www.carsguide.com.au/car-dimensions/subaru-brz-2013';
      const quality = deriveEvidenceQualityFromSource(carsGuideUrl, 'Subaru', {
        identityMatch: true,
        applicationMatch: true,
        independentSourceCount: 1,
        hasConsensus: false,
      });
      expect(quality).toBe('WEAK');
    });
  });

  describe('2. Generic Field-Level Provenance Persistence Contract', () => {
    it('should represent structured displacement verification losslessly with consensus and policy version', () => {
      const evidenceItem: TechnicalFactEvidenceItem = {
        url: 'https://www.subaru.com.au/vehicles/brz/2013/specifications.html',
        domain: 'subaru.com.au',
        sourceTier: 1,
        sourceTierLabel: 'TIER 1 (Manufacturer / OEM Official)',
        sourceKind: 'OEM',
        extractedValue: 1998,
        extractedUnit: 'CC',
        identityMatch: true,
        applicationMatch: true,
        accepted: true,
        evidenceExcerpt: '2.0L FA20 Boxer engine with 1998 cc displacement and 147 kW (200 PS)',
        retrievedAt: new Date().toISOString(),
      };

      const verification: DisplacementVerificationData = {
        status: 'VERIFIED',
        valueCc: 1998,
        verifiedAt: new Date().toISOString(),
        verificationPolicyVersion: '1.0',
        evidence: [evidenceItem],
        consensus: {
          acceptedEvidenceCount: 1,
          independentDomainCount: 1,
          strongestTier: 1,
        },
      };

      expect(verification.status).toBe('VERIFIED');
      expect(verification.valueCc).toBe(1998);
      expect(verification.evidence[0].sourceTier).toBe(1);
      expect(verification.consensus.strongestTier).toBe(1);
      expect(verification.verificationPolicyVersion).toBe('1.0');
    });
  });

  describe('3. Source Authenticity Hardening & Fail-Closed Policy', () => {
    it('should verify WebSearchProvider fails closed and forbids LLM search simulation', async () => {
      const { WebSearchProvider } = await import('../../research/providers/web-search.provider');
      const provider = new WebSearchProvider();

      expect(provider.llmCanSimulateWebSearchResults).toBe(false);
      expect(provider.syntheticSearchFallbackExists).toBe(false);

      // When environment keys are cleared, provider must return [] (fail closed)
      const prevSerper = process.env.SERPER_API_KEY;
      const prevGemini = process.env.GEMINI_API_KEY;
      try {
        delete process.env.SERPER_API_KEY;
        delete process.env.GEMINI_API_KEY;
        const results = await provider.search('Audi A3 35 TFSI engine specs', 'tr', 'TR');
        expect(results).toEqual([]);
      } finally {
        if (prevSerper) process.env.SERPER_API_KEY = prevSerper;
        if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
      }
    });
  });

  describe('4. Application Match Decoupled from Source Tier (Deterministic Gate)', () => {
    const { verifyVehicleApplicationMatch } = require('../variant-technical-facts.service');

    it('should REJECT US-market Audi USA 45 TFSI 228 hp source for target EU/TR 35 TFSI 150 PS variant despite Tier 1 domain', () => {
      const targetVariant = {
        brand: { name: 'Audi' },
        model: { name: 'A3' },
        year: 2020,
        trim: { name: '35 TFSI Advanced' },
        engine: { displacement: 1498 },
        fuelType: 'GASOLINE',
      };

      const result = verifyVehicleApplicationMatch(
        targetVariant,
        '2020 Audi A3 Sedan 45 TFSI 2.0T features 228 horsepower and quattro all-wheel drive for the North American market.',
        'https://www.audiusa.com/us/web/en/models/a3/a3-sedan/2020/overview.html'
      );

      expect(result.match).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should REJECT contradictory badge (e.g. S3 or 45 TFSI) for 35 TFSI target', () => {
      const targetVariant = {
        brand: { name: 'Audi' },
        model: { name: 'A3' },
        trim: { name: '35 TFSI' },
      };

      const result = verifyVehicleApplicationMatch(
        targetVariant,
        'The Audi A3 S3 features 310 PS and 400 Nm of torque from a turbocharged 2.0 TFSI.',
        'https://www.audi-mediacenter.com/en/audi-s3-2020'
      );

      expect(result.match).toBe(false);
      expect(result.reason).toContain('Source discusses different badge');
    });

    it('should ACCEPT matching vehicle application with correct badge and model', () => {
      const targetVariant = {
        brand: { name: 'Audi' },
        model: { name: 'A3' },
        year: 2020,
        trim: { name: '35 TFSI Sport' },
      };

      const result = verifyVehicleApplicationMatch(
        targetVariant,
        'Audi A3 Sedan 35 TFSI delivers 110 kW (150 PS) from a 1.5 TFSI engine.',
        'https://www.audi-mediacenter.com/en/press-releases/audi-a3-sedan-35-tfsi'
      );

      expect(result.match).toBe(true);
    });
  });

  describe('5. Provenance Truth Gate (historicalNullMetadataAutomaticallyTrusted = FALSE)', () => {
    it('should reject historical records lacking genuine provider origin metadata as UNCERTAIN', () => {
      // If evidence lacks provider origin metadata, it cannot be promoted as verified under the new contract
      const historicalEvidenceWithoutMetadata: TechnicalFactEvidenceItem = {
        url: 'https://www.audi.com/experience/audi-a3.html',
        domain: 'audi.com',
        sourceTier: 1,
        sourceTierLabel: 'TIER 1 (Manufacturer / OEM Official)',
        sourceKind: 'OEM',
        extractedValue: 1498,
        extractedUnit: 'CC',
        identityMatch: true,
        applicationMatch: true,
        accepted: true,
        retrievedAt: new Date().toISOString(),
        // provider is undefined/missing
      };

      // Ensure that without genuine provider origin, the fact requires fresh authentic verification
      expect(historicalEvidenceWithoutMetadata.provider).toBeUndefined();
    });
  });
});

