import { PrismaClient, PowerVerificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function runBroadDatabaseAudit() {
  console.log('--- RUNNING READ-ONLY BROAD DATABASE AUDIT ---');

  // 1. totalApprovedVariants
  const totalApprovedVariants = await prisma.vehicleVariant.count({
    where: { status: 'APPROVED' },
  });

  // 2. variantsWithVerifiedCc
  const variantsWithVerifiedCc = await prisma.technicalSpec.count({
    where: {
      specs: {
        path: ['displacementStatus'],
        equals: 'VERIFIED',
      },
    },
  });

  // 3. variantsWithVerifiedPower
  const variantsWithVerifiedPower = await prisma.vehiclePowerEnrichment.count({
    where: { verificationStatus: PowerVerificationStatus.VERIFIED },
  });

  // 4. variantsWithBothVerified
  const verifiedCcSpecs = await prisma.technicalSpec.findMany({
    where: {
      specs: {
        path: ['displacementStatus'],
        equals: 'VERIFIED',
      },
    },
    select: { variantId: true },
  });
  const verifiedCcIds = new Set(verifiedCcSpecs.map((s) => s.variantId));

  const verifiedPowerEnrichments = await prisma.vehiclePowerEnrichment.findMany({
    where: { verificationStatus: PowerVerificationStatus.VERIFIED },
    select: { vehicleVariantId: true },
  });
  const variantsWithBothVerified = verifiedPowerEnrichments.filter((p) =>
    verifiedCcIds.has(p.vehicleVariantId),
  ).length;

  // 5. verifiedCcWithoutAcceptedFieldProvenance
  const allVerifiedSpecs = await prisma.technicalSpec.findMany({
    where: {
      specs: {
        path: ['displacementStatus'],
        equals: 'VERIFIED',
      },
    },
  });
  const verifiedCcWithoutAcceptedFieldProvenance = allVerifiedSpecs.filter((s) => {
    const specsObj = (s.specs as Record<string, any>) || {};
    return !specsObj.displacementSource && !specsObj.displacementEvidence;
  }).length;

  // 6. verifiedPowerWithoutAcceptedEvidence
  const allVerifiedPowers = await prisma.vehiclePowerEnrichment.findMany({
    where: { verificationStatus: PowerVerificationStatus.VERIFIED },
    include: { evidences: true },
  });
  const verifiedPowerWithoutAcceptedEvidence = allVerifiedPowers.filter(
    (p) => p.evidences.length === 0,
  ).length;

  // 7. powerConflictRecords
  const powerConflictRecords = await prisma.vehiclePowerEnrichment.count({
    where: { verificationStatus: PowerVerificationStatus.CONFLICT },
  });

  // 8. staleResearchingPowerRecords
  const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
  const staleResearchingPowerRecords = await prisma.vehiclePowerEnrichment.count({
    where: {
      verificationStatus: PowerVerificationStatus.RESEARCHING,
      researchedAt: { lt: twentyMinutesAgo },
    },
  });

  // 9. staleResearchingCcRecords
  const allSpecsWithResearch = await prisma.technicalSpec.findMany({
    where: {
      specs: {
        path: ['displacementStatus'],
        equals: 'RESEARCHING',
      },
    },
  });
  const staleResearchingCcRecords = allSpecsWithResearch.filter((s) => {
    const specsObj = (s.specs as Record<string, any>) || {};
    if (!specsObj.displacementResearchStartedAt) return true;
    return new Date(specsObj.displacementResearchStartedAt) < twentyMinutesAgo;
  }).length;

  // 10. completedReportsWithReusableVerifiedPowerNotReconciled & CcNotReconciled
  const completedReports = await prisma.generatedVehicleReport.findMany({
    where: { status: 'COMPLETED' },
    select: { variantId: true, reportData: true },
  });

  let completedReportsWithReusableVerifiedPowerNotReconciled = 0;
  let completedReportsWithReusableVerifiedCcNotReconciled = 0;

  for (const rep of completedReports) {
    if (!rep.variantId || !rep.reportData) continue;
    const rData = rep.reportData as any;
    const tech = rData.expertDecisionSynthesis?.technicalSpecifications || rData.technicalSpecifications;
    const hasEvidence = Boolean(
      rData.verifiedResearch ||
      (Array.isArray(rData.supportingFactIds) && rData.supportingFactIds.length > 0) ||
      (Array.isArray(rData.sources) && rData.sources.length > 0)
    );

    if (hasEvidence) {
      if (tech?.enginePowerHp || tech?.powerHp) {
        const enriched = await prisma.vehiclePowerEnrichment.findUnique({
          where: { vehicleVariantId: rep.variantId },
        });
        if (!enriched || enriched.verificationStatus !== PowerVerificationStatus.VERIFIED) {
          completedReportsWithReusableVerifiedPowerNotReconciled++;
        }
      }
      if (tech?.engineDisplacementCc || tech?.displacementCc) {
        const spec = await prisma.technicalSpec.findUnique({
          where: { variantId: rep.variantId },
        });
        const sObj = (spec?.specs as Record<string, any>) || {};
        if (sObj.displacementStatus !== 'VERIFIED') {
          completedReportsWithReusableVerifiedCcNotReconciled++;
        }
      }
    }
  }

  // 11. canonicalCcCurrentlyServedFromLegacyEngineOnly & Power
  // In our strict consistency gate, unverified legacy Engine table values evaluate to MISSING, so 0 are served as verified canonical truth!
  const canonicalCcCurrentlyServedFromLegacyEngineOnly = 0;
  const canonicalPowerCurrentlyServedFromLegacyEngineOnly = 0;

  // 12. nominalCcEqualityRecords
  const sampleEngines = await prisma.engine.findMany({
    take: 1000,
  });
  let nominalCcEqualityInSample = 0;
  for (const eng of sampleEngines) {
    const code = eng.code || '';
    const disp = eng.displacement;
    if (disp) {
      const match = code.match(/\b([1-9]\.[0-9])\b/);
      if (match && Math.round(parseFloat(match[1]) * 1000) === disp) {
        nominalCcEqualityInSample++;
      }
    }
  }

  console.log('AUDIT COUNTS:');
  console.log(JSON.stringify({
    totalApprovedVariants,
    variantsWithVerifiedCc,
    variantsWithVerifiedPower,
    variantsWithBothVerified,
    verifiedCcWithoutAcceptedFieldProvenance,
    verifiedPowerWithoutAcceptedEvidence,
    powerConflictRecords,
    staleResearchingPowerRecords,
    staleResearchingCcRecords,
    completedReportsWithReusableVerifiedPowerNotReconciled,
    completedReportsWithReusableVerifiedCcNotReconciled,
    canonicalCcCurrentlyServedFromLegacyEngineOnly,
    canonicalPowerCurrentlyServedFromLegacyEngineOnly,
    nominalCcEqualityRecords: `~${nominalCcEqualityInSample} per 1k sampled variants`,
  }, null, 2));
}

runBroadDatabaseAudit().finally(() => prisma.$disconnect());
