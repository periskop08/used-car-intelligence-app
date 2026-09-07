/**
 * Generic 5-Tier Technical Source Hierarchy for TorqueScout Vehicle Technical Facts.
 * 
 * TIER 1: Manufacturer / Official Technical Documentation / OEM Press
 * TIER 2: Official Importer / Homologation / Regulatory / Technical Inspection (ADAC, TÜV, KBA, EPA)
 * TIER 3: High-Quality Technical Catalog Database (Auto-Data, UltimateSpecs, Automobile-Catalog, Carfolio)
 * TIER 4: Secondary Automotive Publication / Media (Motor1, CarsGuide, Autocar, TopGear)
 * TIER 5: Community Forum / User Discussion (Reddit, DonanimHaber, Bimmerpost, VWVortex, Club forums)
 * 
 * Rules:
 * - A secondary source (e.g. CarsGuide, Motor1) can NEVER be classified as Tier 1 Manufacturer.
 * - Forum/community evidence (Tier 5) can NEVER act as the primary authority making a field VERIFIED.
 */

export enum TechnicalSourceTier {
  TIER_1_MANUFACTURER = 1,
  TIER_2_HOMOLOGATION = 2,
  TIER_3_CATALOG = 3,
  TIER_4_SECONDARY_MEDIA = 4,
  TIER_5_COMMUNITY_FORUM = 5,
}

export interface ClassifiedSource {
  tier: TechnicalSourceTier;
  tierLabel: string;
  isAuthoritative: boolean;
  canVerifyAlone: boolean;
  isCommunityForum: boolean;
}

const TIER_2_DOMAINS = [
  'adac.de',
  'tuv.com',
  'tuv-nord.de',
  'tuv-sud.de',
  'dekra.de',
  'dekra.com',
  'kba.de',
  'vca.gov.uk',
  'epa.gov',
  'euroncap.com',
  'recallinfo.com',
  'unece.org',
  'nhtsa.gov',
];

const TIER_3_CATALOG_DOMAINS = [
  'auto-data.net',
  'ultimatespecs.com',
  'carfolio.com',
  'automobile-catalog.com',
  'automaniac.org',
  'cars-data.com',
  'encyclopedia.auto',
  'zeperfs.com',
  'parkers.co.uk',
  'autoweek.nl',
  'arabam.com',
  'sahibinden.com',
  'auto-catalog.com',
  'specs.cars',
];

const TIER_5_FORUM_PATTERNS = [
  'reddit.com',
  'donanimhaber.com',
  'bimmerpost.com',
  'vwvortex.com',
  'subaruxvforum.com',
  'golfmk7.com',
  'subarutr.com',
  'quora.com',
  'eksisozluk.com',
  'bobistheoilguy.com',
  'drive2.ru',
  'drive2.com',
  'sikayetvar.com',
  'sikayetvar',
  'trustpilot.com',
  'forum',
  'forums',
  'community',
  'club',
];

export function classifySourceTier(urlOrDomain: string, brandName?: string): ClassifiedSource {
  const raw = (urlOrDomain || '').toLowerCase().trim();
  let hostname = raw;
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      hostname = new URL(raw).hostname.toLowerCase();
    }
  } catch {
    hostname = raw;
  }

  // 1. TIER 5: Community Forum / Discussion Check
  const isForum = TIER_5_FORUM_PATTERNS.some((pattern) => {
    if (pattern.includes('.')) {
      return hostname === pattern || hostname.endsWith('.' + pattern) || raw.includes(pattern);
    }
    return hostname.includes(pattern) || raw.includes('/' + pattern + '/') || raw.includes('-' + pattern);
  });

  if (isForum) {
    return {
      tier: TechnicalSourceTier.TIER_5_COMMUNITY_FORUM,
      tierLabel: 'TIER 5 (Community / Forum)',
      isAuthoritative: false,
      canVerifyAlone: false,
      isCommunityForum: true,
    };
  }

  // 2. TIER 1: Manufacturer / OEM Official Domain Check
  // A secondary publisher (e.g. CarsGuide, Motor1, UltimateSpecs) is NEVER Tier 1
  const cleanBrand = (brandName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (cleanBrand.length >= 3) {
    const oemDomainRegex = new RegExp(`(^|\\.)(${cleanBrand})(-global)?\\.(com|com\\.[a-z]{2}|org|[a-z]{2,3})$`, 'i');
    const isOemDomain =
      oemDomainRegex.test(hostname) ||
      hostname.includes(`media.${cleanBrand}.`) ||
      hostname.includes(`press.${cleanBrand}.`) ||
      hostname.includes(`newsroom.${cleanBrand}.`);

    if (isOemDomain) {
      return {
        tier: TechnicalSourceTier.TIER_1_MANUFACTURER,
        tierLabel: 'TIER 1 (Manufacturer / OEM Official)',
        isAuthoritative: true,
        canVerifyAlone: true,
        isCommunityForum: false,
      };
    }
  }

  // 3. TIER 2: Regulatory / Homologation / Technical Inspection
  const isTier2 = TIER_2_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
  if (isTier2) {
    return {
      tier: TechnicalSourceTier.TIER_2_HOMOLOGATION,
      tierLabel: 'TIER 2 (Homologation / Regulatory)',
      isAuthoritative: true,
      canVerifyAlone: true,
      isCommunityForum: false,
    };
  }

  // 4. TIER 3: High-Quality Technical Catalog Database
  const isTier3 = TIER_3_CATALOG_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
  if (isTier3) {
    return {
      tier: TechnicalSourceTier.TIER_3_CATALOG,
      tierLabel: 'TIER 3 (Technical Catalog Database)',
      isAuthoritative: true,
      canVerifyAlone: true,
      isCommunityForum: false,
    };
  }

  // 5. TIER 4: Secondary Automotive Publication / Marketplace
  return {
    tier: TechnicalSourceTier.TIER_4_SECONDARY_MEDIA,
    tierLabel: 'TIER 4 (Secondary Automotive Media)',
    isAuthoritative: false,
    canVerifyAlone: false,
    isCommunityForum: false,
  };
}
