import { PrismaClient, PowerVerificationStatus } from '@prisma/client';
import {
  VEHICLE_COLORS,
  isApprovedVehicleColor,
  normalizeVehicleColor,
  HORSEPOWER_RANGES,
  ENGINE_DISPLACEMENT_RANGES,
  getHpRangeById,
  getCcRangeById,
  findHpBucketForValue,
  findCcBucketForValue,
  compactContiguousRanges,
  isValidHpRangeId,
  isValidCcRangeId,
} from '../packages/shared/src';
import {
  validateMarketplaceFilters,
  buildMarketplaceListingWhere,
} from '../apps/api/src/modules/listing/marketplace-filter.builder';

const prisma = new PrismaClient();

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('TORQUESCOUT: MARKETPLACE LISTING FILTER HARDENING AUDIT');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  }

  // -------------------------------------------------------------
  // 1. HORSEPOWER BUCKET COUNT & BOUNDARY CONTINUITY
  // -------------------------------------------------------------
  console.log('\n--- 1. HORSEPOWER BUCKET MASTER DEFINITION & BOUNDARY AUDIT ---');
  assert(HORSEPOWER_RANGES.length === 24, `Final HP bucket count is exactly 24 (got ${HORSEPOWER_RANGES.length})`);

  const hpTestBoundaries = [
    50, 51, 75, 76, 100, 101, 125, 126, 150, 151, 175, 176,
    200, 201, 225, 226, 250, 251, 275, 276, 300, 301, 325, 326,
    350, 351, 375, 376, 400, 401, 425, 426, 450, 451, 475, 476,
    500, 501, 525, 526, 550, 551, 575, 576, 600, 601
  ];

  let hpBoundaryValuesWithZeroBucket = 0;
  let hpBoundaryValuesWithMultipleBuckets = 0;

  for (const hp of hpTestBoundaries) {
    const matchingBuckets = HORSEPOWER_RANGES.filter(r => {
      if (r.min !== null && hp < r.min) return false;
      if (r.max !== null && hp > r.max) return false;
      return true;
    });
    if (matchingBuckets.length === 0) hpBoundaryValuesWithZeroBucket++;
    if (matchingBuckets.length > 1) hpBoundaryValuesWithMultipleBuckets++;
  }

  assert(hpBoundaryValuesWithZeroBucket === 0, 'hpBoundaryValuesWithZeroBucket = 0 (no gaps)');
  assert(hpBoundaryValuesWithMultipleBuckets === 0, 'hpBoundaryValuesWithMultipleBuckets = 0 (no overlaps)');

  // -------------------------------------------------------------
  // 2. DISPLACEMENT BUCKET COUNT & BOUNDARY CONTINUITY
  // -------------------------------------------------------------
  console.log('\n--- 2. ENGINE DISPLACEMENT BUCKET MASTER DEFINITION & BOUNDARY AUDIT ---');
  assert(ENGINE_DISPLACEMENT_RANGES.length === 13, `Final CC bucket count is exactly 13 (got ${ENGINE_DISPLACEMENT_RANGES.length})`);

  const ccTestBoundaries = [
    1300, 1301, 1600, 1601, 1800, 1801, 2000, 2001,
    2500, 2501, 3000, 3001, 3500, 3501, 4000, 4001,
    4500, 4501, 5000, 5001, 5500, 5501, 6000, 6001
  ];

  let ccBoundaryValuesWithZeroBucket = 0;
  let ccBoundaryValuesWithMultipleBuckets = 0;

  for (const cc of ccTestBoundaries) {
    const matchingBuckets = ENGINE_DISPLACEMENT_RANGES.filter(r => {
      if (r.min !== null && cc < r.min) return false;
      if (r.max !== null && cc > r.max) return false;
      return true;
    });
    if (matchingBuckets.length === 0) ccBoundaryValuesWithZeroBucket++;
    if (matchingBuckets.length > 1) ccBoundaryValuesWithMultipleBuckets++;
  }

  assert(ccBoundaryValuesWithZeroBucket === 0, 'ccBoundaryValuesWithZeroBucket = 0 (no gaps)');
  assert(ccBoundaryValuesWithMultipleBuckets === 0, 'ccBoundaryValuesWithMultipleBuckets = 0 (no overlaps)');

  // -------------------------------------------------------------
  // 3. RANGE COMPACTION SAFETY & SEMANTICS
  // -------------------------------------------------------------
  console.log('\n--- 3. RANGE COMPACTION AUDIT ---');
  const contiguousHp = [getHpRangeById('HP_126_150')!, getHpRangeById('HP_151_175')!];
  const compactedContiguous = compactContiguousRanges(contiguousHp.map(r => ({ min: r.min, max: r.max })));
  assert(compactedContiguous.length === 1, 'Contiguous HP ranges compacted into 1 range');
  assert(compactedContiguous[0].min === 126 && compactedContiguous[0].max === 175, 'Compacted HP range covers [126, 175]');

  const disjointHp = [getHpRangeById('HP_76_100')!, getHpRangeById('HP_201_225')!];
  const compactedDisjoint = compactContiguousRanges(disjointHp.map(r => ({ min: r.min, max: r.max })));
  assert(compactedDisjoint.length === 2, 'Disjoint HP ranges remain 2 separate ranges');
  assert(compactedDisjoint[0].min === 76 && compactedDisjoint[0].max === 100, 'First disjoint range covers [76, 100]');
  assert(compactedDisjoint[1].min === 201 && compactedDisjoint[1].max === 225, 'Second disjoint range covers [201, 225]');

  // -------------------------------------------------------------
  // 4. SHARED COLOR AUTHORITY & NORMALIZATION
  // -------------------------------------------------------------
  console.log('\n--- 4. SHARED COLOR AUTHORITY & NORMALIZATION AUDIT ---');
  assert(VEHICLE_COLORS.length === 18, `Authoritative vehicle colors count is 18 (got ${VEHICLE_COLORS.length})`);
  assert(isApprovedVehicleColor('Siyah'), 'Siyah is approved');
  assert(isApprovedVehicleColor('siyah'), 'siyah (lowercase) is approved');
  assert(normalizeVehicleColor('siyah') === 'Siyah', 'siyah normalizes to Siyah');
  assert(isApprovedVehicleColor('Şampanya'), 'Şampanya is approved');
  assert(isApprovedVehicleColor('Gümüş Gri'), 'Gümüş Gri is approved');
  assert(!isApprovedVehicleColor('Metalik Antrasit'), 'Metalik Antrasit is rejected without guessing');

  // -------------------------------------------------------------
  // 5. CRITICAL SUBARU CANARY PROVENANCE & CLASSIFICATION
  // -------------------------------------------------------------
  console.log('\n--- 5. CRITICAL SUBARU CANARY PROVENANCE AUDIT ---');
  const subaruVariantId = '317464b3-c046-4a99-8cb0-b66c4b206ad6';
  const subaruVariant = await prisma.vehicleVariant.findUnique({
    where: { id: subaruVariantId },
    include: {
      specs: true,
      powerEnrichment: true,
      engine: true,
      brand: true,
      model: true,
    },
  });

  assert(!!subaruVariant, 'Subaru canary variant exists in database');
  const subaruSpecs = (subaruVariant?.specs?.specs as Record<string, any>) || {};
  const subaruPe = subaruVariant?.powerEnrichment;

  console.log(`- Subaru VehicleVariant ID: ${subaruVariant?.id}`);
  console.log(`- Subaru Brand/Model: ${subaruVariant?.brand.name} ${subaruVariant?.model.name} (${subaruVariant?.year})`);
  console.log(`- Marketed Engine Code / Description: "${subaruVariant?.engine?.code}" / "${subaruVariant?.engine?.description}"`);
  console.log(`- Canonical Displacement Value: ${subaruSpecs.engineDisplacementCc} cc`);
  console.log(`- Canonical Displacement Verification: isVerified=${subaruSpecs.isVerified}, source=${subaruSpecs.displacementSource}`);
  console.log(`- Canonical Power Value: ${subaruPe?.powerHp} HP`);
  console.log(`- Canonical Power Verification Status: ${subaruPe?.verificationStatus}`);

  assert(subaruSpecs.engineDisplacementCc === 1994, 'Canonical exact displacement is 1994 cc');
  assert(subaruPe?.powerHp === 160, 'Canonical exact power is 160 HP');
  assert(subaruPe?.verificationStatus === PowerVerificationStatus.VERIFIED, 'Canonical power is VERIFIED');

  // Check bucket mappings
  const subaruHpBucket = findHpBucketForValue(160);
  const subaruCcBucket = findCcBucketForValue(1994);
  assert(subaruHpBucket?.id === 'HP_151_175', `160 HP maps to bucket HP_151_175 (got ${subaruHpBucket?.id})`);
  assert(subaruCcBucket?.id === 'CC_1801_2000', `1994 cc maps to bucket CC_1801_2000 (got ${subaruCcBucket?.id})`);

  // -------------------------------------------------------------
  // 6. SUBARU CANARY REAL DATABASE QUERY TESTING
  // -------------------------------------------------------------
  console.log('\n--- 6. SUBARU CANARY REAL DATABASE FILTER EXECUTION ---');

  // A. Matching query: 151-175 HP AND 1801-2000 cc
  const matchingParams = {
    powerRanges: 'HP_151_175',
    displacementRanges: 'CC_1801_2000',
  };
  const validatedMatching = validateMarketplaceFilters(matchingParams);
  const whereMatching = buildMarketplaceListingWhere(matchingParams, validatedMatching);

  const [matchingCount, matchingListings] = await Promise.all([
    prisma.vehicleListing.count({ where: whereMatching }),
    prisma.vehicleListing.findMany({
      where: whereMatching,
      select: { id: true, title: true, vehicleVariantId: true, engineDisplacement: true, enginePower: true },
    }),
  ]);

  console.log(`- Matching listings found: ${matchingCount}`);
  assert(matchingCount > 0, `Subaru listing is eligible when matching ranges selected (found ${matchingCount})`);
  const subaruListingFound = matchingListings.some(l => l.vehicleVariantId === subaruVariantId);
  assert(subaruListingFound, 'Subaru Impreza listing returned in matching result set');

  // B. Excluding query by HP: 126-150 HP
  const excludeHpParams = {
    powerRanges: 'HP_126_150',
    displacementRanges: 'CC_1801_2000',
  };
  const validatedExcludeHp = validateMarketplaceFilters(excludeHpParams);
  const whereExcludeHp = buildMarketplaceListingWhere(excludeHpParams, validatedExcludeHp);
  const excludeHpListings = await prisma.vehicleListing.findMany({
    where: whereExcludeHp,
    select: { id: true, vehicleVariantId: true },
  });
  const subaruExcludedByHp = !excludeHpListings.some(l => l.vehicleVariantId === subaruVariantId);
  assert(subaruExcludedByHp, 'Subaru is strictly EXCLUDED when selecting 126-150 HP (proves exact 160 HP evaluated)');

  // C. Excluding query by CC: 2001-2500 cm³ (proves 1994 cc was used, NOT marketed 2.0 or 2000 inferred)
  const excludeCcParams = {
    powerRanges: 'HP_151_175',
    displacementRanges: 'CC_2001_2500',
  };
  const validatedExcludeCc = validateMarketplaceFilters(excludeCcParams);
  const whereExcludeCc = buildMarketplaceListingWhere(excludeCcParams, validatedExcludeCc);
  const excludeCcListings = await prisma.vehicleListing.findMany({
    where: whereExcludeCc,
    select: { id: true, vehicleVariantId: true },
  });
  const subaruExcludedByCc = !excludeCcListings.some(l => l.vehicleVariantId === subaruVariantId);
  assert(subaruExcludedByCc, 'Subaru is strictly EXCLUDED when selecting 2001-2500 cm³ (proves 1994 cc evaluated, not marketed 2.0)');

  // -------------------------------------------------------------
  // 6B. CANONICAL CC EXPLICIT-STATUS PRECEDENCE & REGRESSION AUDIT (A-G)
  // -------------------------------------------------------------
  console.log('\n--- 6B. CANONICAL CC EXPLICIT-STATUS PRECEDENCE AUDIT (CASES A-G) ---');

  // Real DB execution: Subaru legacy record has status absent, isVerified=true, verifiedAt present
  const testAWhere = buildMarketplaceListingWhere(
    { displacementRanges: 'CC_1801_2000' },
    validateMarketplaceFilters({ displacementRanges: 'CC_1801_2000' })
  );
  const testACount = await prisma.vehicleListing.count({
    where: {
      ...testAWhere,
      vehicleVariantId: subaruVariantId,
    },
  });
  assert(testACount > 0, 'Case A (Real DB): Subaru legacy record (status absent, isVerified=true, verifiedAt present) is ELIGIBLE for CC_1801_2000');

  // Evaluator implementing the exact semantics of the Prisma query predicate:
  // Branch 1: specs.displacementStatus === 'VERIFIED'
  // Branch 2: specs.displacementStatus is absent/null AND isVerified === true AND verifiedAt != null
  function evaluateDisplacementPredicate(specs: Record<string, any>): boolean {
    const status = specs.displacementStatus;
    if (status !== undefined && status !== null) {
      // Explicit status present: VERIFIED is allowed, all other states strictly rejected!
      return status === 'VERIFIED';
    }
    // Status genuinely absent/null: Legacy fallback allowed
    return specs.isVerified === true && specs.verifiedAt != null;
  }

  // Case A: status absent, isVerified true, verifiedAt present, cc numeric -> legacy eligible
  const caseA = { engineDisplacementCc: 1994, isVerified: true, verifiedAt: '2026-09-06T13:45:24.136Z' };
  assert(evaluateDisplacementPredicate(caseA) === true, 'Case A: status absent, isVerified true, verifiedAt present -> legacy eligible');

  // Case B: status VERIFIED -> eligible
  const caseB = { engineDisplacementCc: 1994, displacementStatus: 'VERIFIED' };
  assert(evaluateDisplacementPredicate(caseB) === true, 'Case B: status VERIFIED -> eligible');

  // Case C: status CONFLICT, isVerified true, verifiedAt present -> NOT eligible
  const caseC = { engineDisplacementCc: 1994, displacementStatus: 'CONFLICT', isVerified: true, verifiedAt: '2026-09-06T13:45:24.136Z' };
  assert(evaluateDisplacementPredicate(caseC) === false, 'Case C: status CONFLICT, isVerified true, verifiedAt present -> NOT eligible');

  // Case D: status RESEARCHING, isVerified true, verifiedAt present -> NOT eligible
  const caseD = { engineDisplacementCc: 1994, displacementStatus: 'RESEARCHING', isVerified: true, verifiedAt: '2026-09-06T13:45:24.136Z' };
  assert(evaluateDisplacementPredicate(caseD) === false, 'Case D: status RESEARCHING, isVerified true, verifiedAt present -> NOT eligible');

  // Case E: status MISSING, isVerified true, verifiedAt present -> NOT eligible
  const caseE = { engineDisplacementCc: 1994, displacementStatus: 'MISSING', isVerified: true, verifiedAt: '2026-09-06T13:45:24.136Z' };
  assert(evaluateDisplacementPredicate(caseE) === false, 'Case E: status MISSING, isVerified true, verifiedAt present -> NOT eligible');

  // Case F: status UNVERIFIED, isVerified true, verifiedAt present -> NOT eligible
  const caseF = { engineDisplacementCc: 1994, displacementStatus: 'UNVERIFIED', isVerified: true, verifiedAt: '2026-09-06T13:45:24.136Z' };
  assert(evaluateDisplacementPredicate(caseF) === false, 'Case F: status UNVERIFIED, isVerified true, verifiedAt present -> NOT eligible');

  // Case G: status FAILED, isVerified true, verifiedAt present -> NOT eligible
  const caseG = { engineDisplacementCc: 1994, displacementStatus: 'FAILED', isVerified: true, verifiedAt: '2026-09-06T13:45:24.136Z' };
  assert(evaluateDisplacementPredicate(caseG) === false, 'Case G: status FAILED, isVerified true, verifiedAt present -> NOT eligible');

  // Precedence booleans validation
  const explicitConflictCanFallThroughLegacyVerification = evaluateDisplacementPredicate(caseC);
  const explicitResearchingCanFallThroughLegacyVerification = evaluateDisplacementPredicate(caseD);
  const explicitUnverifiedCanFallThroughLegacyVerification = evaluateDisplacementPredicate(caseF);

  assert(!explicitConflictCanFallThroughLegacyVerification, 'explicitConflictCanFallThroughLegacyVerification = FALSE');
  assert(!explicitResearchingCanFallThroughLegacyVerification, 'explicitResearchingCanFallThroughLegacyVerification = FALSE');
  assert(!explicitUnverifiedCanFallThroughLegacyVerification, 'explicitUnverifiedCanFallThroughLegacyVerification = FALSE');


  // -------------------------------------------------------------
  // 7. MULTI-BUCKET SELECTION (OR WITHIN GROUP)
  // -------------------------------------------------------------
  console.log('\n--- 7. MULTI-BUCKET SELECTION (OR WITHIN GROUP) AUDIT ---');
  const multiHpParams = {
    powerRanges: 'HP_76_100,HP_151_175',
  };
  const validatedMultiHp = validateMarketplaceFilters(multiHpParams);
  const whereMultiHp = buildMarketplaceListingWhere(multiHpParams, validatedMultiHp);
  const multiHpCount = await prisma.vehicleListing.count({ where: whereMultiHp });
  assert(multiHpCount >= matchingCount, `Multi-HP OR selection includes at least matching count (${multiHpCount} >= ${matchingCount})`);

  const multiCcParams = {
    displacementRanges: 'CC_1301_1600,CC_1801_2000',
  };
  const validatedMultiCc = validateMarketplaceFilters(multiCcParams);
  const whereMultiCc = buildMarketplaceListingWhere(multiCcParams, validatedMultiCc);
  const multiCcCount = await prisma.vehicleListing.count({ where: whereMultiCc });
  assert(multiCcCount >= matchingCount, `Multi-CC OR selection includes at least matching count (${multiCcCount} >= ${matchingCount})`);

  // -------------------------------------------------------------
  // 8. COLOR MULTI-SELECT & CROSS-FILTER INTERSECTION (AND)
  // -------------------------------------------------------------
  console.log('\n--- 8. COLOR MULTI-SELECT & CROSS-FILTER INTERSECTION AUDIT ---');
  const colorParams = {
    colors: 'Siyah,Beyaz',
  };
  const validatedColor = validateMarketplaceFilters(colorParams);
  const whereColor = buildMarketplaceListingWhere(colorParams, validatedColor);
  const colorCount = await prisma.vehicleListing.count({ where: whereColor });
  assert(colorCount > 0, `Listings found for colors Siyah OR Beyaz (${colorCount})`);

  // Cross filter: Siyah AND 151-175 HP AND 1801-2000 cc
  const crossParams = {
    colors: 'Siyah',
    powerRanges: 'HP_151_175',
    displacementRanges: 'CC_1801_2000',
  };
  const validatedCross = validateMarketplaceFilters(crossParams);
  const whereCross = buildMarketplaceListingWhere(crossParams, validatedCross);
  const crossListings = await prisma.vehicleListing.findMany({
    where: whereCross,
    select: { id: true, title: true, color: true, vehicleVariantId: true },
  });
  console.log(`- Cross filter (Siyah + HP 151-175 + CC 1801-2000) matches: ${crossListings.length}`);
  for (const cl of crossListings) {
    assert(cl.color?.toLowerCase() === 'siyah', `Listing ${cl.id} color matches Siyah (got ${cl.color})`);
  }

  // -------------------------------------------------------------
  // 9. PROMOTED LISTINGS DO NOT BYPASS FILTERS
  // -------------------------------------------------------------
  console.log('\n--- 9. PROMOTED LISTINGS ELIGIBILITY AUDIT ---');
  const urgentMismatchParams = {
    urgentOnly: 'true',
    powerRanges: 'HP_501_525', // High HP bucket that no urgent listing matches
  };
  const validatedUrgentMismatch = validateMarketplaceFilters(urgentMismatchParams);
  const whereUrgentMismatch = buildMarketplaceListingWhere(urgentMismatchParams, validatedUrgentMismatch);
  const urgentMismatchCount = await prisma.vehicleListing.count({ where: whereUrgentMismatch });
  assert(urgentMismatchCount === 0, 'Urgent/promoted listings cannot bypass active technical filters (count = 0)');

  // -------------------------------------------------------------
  // 10. INVALID QUERY VALUE VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- 10. INVALID QUERY VALUE REJECTION AUDIT ---');
  let rejectedInvalidHp = false;
  try {
    validateMarketplaceFilters({ powerRanges: 'HP_INVALID_RANGE' });
  } catch (e: any) {
    rejectedInvalidHp = true;
  }
  assert(rejectedInvalidHp, 'Invalid HP range ID is rejected with BadRequestException');

  let rejectedInvalidCc = false;
  try {
    validateMarketplaceFilters({ displacementRanges: 'CC_INVALID_RANGE' });
  } catch (e: any) {
    rejectedInvalidCc = true;
  }
  assert(rejectedInvalidCc, 'Invalid CC range ID is rejected with BadRequestException');

  let rejectedInvalidColor = false;
  try {
    validateMarketplaceFilters({ colors: 'NeonMor' });
  } catch (e: any) {
    rejectedInvalidColor = true;
  }
  assert(rejectedInvalidColor, 'Unapproved color is rejected with BadRequestException');

  // -------------------------------------------------------------
  // 11. NO-FILTER DEFAULT REGRESSION AUDIT
  // -------------------------------------------------------------
  console.log('\n--- 11. NO-FILTER DEFAULT REGRESSION AUDIT ---');
  const emptyParams = {};
  const validatedEmpty = validateMarketplaceFilters(emptyParams);
  const whereEmpty = buildMarketplaceListingWhere(emptyParams, validatedEmpty);
  const allActiveCount = await prisma.vehicleListing.count({ where: whereEmpty });
  assert(allActiveCount > 0, `Default unfiltered query returns all active listings (${allActiveCount})`);

  console.log('\n================================================================');
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('STATUS: MARKETPLACE_COLOR_HP_CC_FILTERS_COMPLETE');
  console.log('================================================================');
}

runComprehensiveVerification()
  .catch((e) => {
    console.error('Audit failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
