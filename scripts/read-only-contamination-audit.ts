import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const prisma = new PrismaClient();

async function runReadOnlyAudit() {
  console.log('=== PURE READ-ONLY CONTAMINATION AUDIT (SECTION 12) ===');

  // 1. Total Displacement Verified Facts
  const specs = await prisma.technicalSpec.findMany({
    select: {
      id: true,
      variantId: true,
      specs: true,
    },
  });

  let totalDisplacementVerifiedFacts = 0;
  let displacementEvidenceWithTrustedProviderOrigin = 0;
  let displacementEvidenceWithoutTrustedProviderOrigin = 0;
  let syntheticDisplacementEvidenceRecords = 0;
  let verifiedDisplacementDependingOnlyOnUntrusted = 0;

  for (const s of specs) {
    const sp = s.specs as any;
    if (!sp) continue;

    const isVerified = sp.displacementStatus === 'VERIFIED';
    if (isVerified) {
      totalDisplacementVerifiedFacts++;
      const dv = sp.displacementVerification;
      const evidences = dv?.evidences || [];
      const hasTrusted = evidences.some((e: any) => e.provider === 'serper' || e.provider === 'gemini_grounding');
      
      if (hasTrusted) {
        displacementEvidenceWithTrustedProviderOrigin += evidences.filter((e: any) => e.provider === 'serper' || e.provider === 'gemini_grounding').length;
      } else {
        displacementEvidenceWithoutTrustedProviderOrigin += evidences.length > 0 ? evidences.length : 1;
        verifiedDisplacementDependingOnlyOnUntrusted++;
      }
    }
  }

  // 2. Power Verified Facts
  const powerEnrichments = await prisma.vehiclePowerEnrichment.findMany({
    include: {
      evidences: true,
    },
  });

  let totalPowerVerifiedFacts = 0;
  let powerEvidenceWithTrustedProviderOrigin = 0;
  let powerEvidenceWithoutTrustedProviderOrigin = 0;
  let syntheticPowerEvidenceRecords = 0;
  let verifiedPowerDependingOnlyOnUntrusted = 0;

  for (const pe of powerEnrichments) {
    const isVerified = pe.verificationStatus === 'VERIFIED';
    if (isVerified) {
      totalPowerVerifiedFacts++;
      const hasTrusted = pe.evidences.some((e) => e.sourceKind?.startsWith('PROVIDER:'));
      if (hasTrusted) {
        powerEvidenceWithTrustedProviderOrigin += pe.evidences.filter((e) => e.sourceKind?.startsWith('PROVIDER:')).length;
      } else {
        powerEvidenceWithoutTrustedProviderOrigin += pe.evidences.length;
        verifiedPowerDependingOnlyOnUntrusted++;
      }
    } else {
      powerEvidenceWithoutTrustedProviderOrigin += pe.evidences.length;
    }
  }

  const syntheticSearchEvidenceRecordsDetected = displacementEvidenceWithoutTrustedProviderOrigin + powerEvidenceWithoutTrustedProviderOrigin;
  const verifiedFactsDependingOnlyOnUntrustedEvidence = verifiedDisplacementDependingOnlyOnUntrusted + verifiedPowerDependingOnlyOnUntrusted;

  console.log(`totalDisplacementVerifiedFacts: ${totalDisplacementVerifiedFacts}`);
  console.log(`totalPowerVerifiedFacts: ${totalPowerVerifiedFacts}`);
  console.log(`displacementEvidenceWithTrustedProviderOrigin: ${displacementEvidenceWithTrustedProviderOrigin}`);
  console.log(`displacementEvidenceWithoutTrustedProviderOrigin: ${displacementEvidenceWithoutTrustedProviderOrigin}`);
  console.log(`powerEvidenceWithTrustedProviderOrigin: ${powerEvidenceWithTrustedProviderOrigin}`);
  console.log(`powerEvidenceWithoutTrustedProviderOrigin: ${powerEvidenceWithoutTrustedProviderOrigin}`);
  console.log(`syntheticSearchEvidenceRecordsDetected: ${syntheticSearchEvidenceRecordsDetected}`);
  console.log(`verifiedFactsDependingOnlyOnUntrustedEvidence: ${verifiedFactsDependingOnlyOnUntrustedEvidence}`);
  console.log('=== END OF READ-ONLY AUDIT ===');

  await prisma.$disconnect();
}

runReadOnlyAudit().catch(console.error);
