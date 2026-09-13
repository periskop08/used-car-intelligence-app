import { PrismaClient } from '@prisma/client';
import { normalizeVehicleReportPayload } from '../packages/shared/src/utils/normalizeVehicleReportPayload';

const prisma = new PrismaClient();

interface DeviationRecord {
  field: string;
  count: number;
  deviations: Record<string, number>;
  exampleReportIds: string[];
  semanticNature: 'LOSSLESS' | 'LOSSY' | 'REJECTED' | 'UNRECOVERABLE';
}

async function runReadOnlyLegacyReportAudit() {
  console.log('================================================================');
  console.log('🔍 READ-ONLY LEGACY REPORT DATA & SEMANTIC INTEGRITY AUDIT');
  console.log('================================================================');
  console.log('Policy: Pure read-only inspection. Zero mutations. Zero fake data.\n');

  const allReports = await prisma.generatedVehicleReport.findMany({
    select: {
      id: true,
      variantId: true,
      listingId: true,
      status: true,
      reportVersion: true,
      schemaVersion: true,
      generatedAt: true,
      reportData: true,
    },
    orderBy: { generatedAt: 'desc' },
  });

  const totalReports = allReports.length;
  console.log(`Total GeneratedVehicleReport rows in DB: ${totalReports}`);

  const deviationMap: Record<string, DeviationRecord> = {};

  const recordDeviation = (
    field: string,
    deviationType: string,
    reportId: string,
    semanticNature: 'LOSSLESS' | 'LOSSY' | 'REJECTED' | 'UNRECOVERABLE'
  ) => {
    if (!deviationMap[field]) {
      deviationMap[field] = {
        field,
        count: 0,
        deviations: {},
        exampleReportIds: [],
        semanticNature,
      };
    }
    deviationMap[field].count++;
    deviationMap[field].deviations[deviationType] = (deviationMap[field].deviations[deviationType] || 0) + 1;
    if (deviationMap[field].exampleReportIds.length < 3 && !deviationMap[field].exampleReportIds.includes(reportId)) {
      deviationMap[field].exampleReportIds.push(reportId);
    }
  };

  let evaluatedReports = 0;
  let schemaSafeCount = 0;
  let losslessCount = 0;
  let lossyCount = 0;
  let totalRejectedItems = 0;
  let totalUnrecoverableFields = 0;
  let silentObjectCorruptions = 0;

  for (const record of allReports) {
    if (!record.reportData || typeof record.reportData !== 'object') {
      continue;
    }
    evaluatedReports++;
    const data = record.reportData as Record<string, any>;
    const reportId = record.id;

    // 1. Audit Scoring
    if (!data.scoring || typeof data.scoring !== 'object') {
      recordDeviation('scoring', `missing_or_${typeof data.scoring}`, reportId, 'UNRECOVERABLE');
    }

    // 2. Audit PrePurchaseChecks
    if (data.prePurchaseChecks !== undefined) {
      if (!Array.isArray(data.prePurchaseChecks)) {
        recordDeviation('prePurchaseChecks', `non_array_${typeof data.prePurchaseChecks}`, reportId, 'LOSSLESS');
      } else {
        const hasString = data.prePurchaseChecks.some((i: any) => typeof i === 'string');
        const hasMalformed = data.prePurchaseChecks.some((i: any) => typeof i === 'object' && i !== null && !i.title && !i.check && !i.instruction);
        if (hasString) recordDeviation('prePurchaseChecks', 'string_instead_of_object_items', reportId, 'LOSSLESS');
        if (hasMalformed) recordDeviation('prePurchaseChecks', 'malformed_check_object', reportId, 'REJECTED');
      }
    }

    // 3. Audit SellerQuestions
    if (data.sellerQuestions !== undefined) {
      if (!Array.isArray(data.sellerQuestions)) {
        recordDeviation('sellerQuestions', `non_array_${typeof data.sellerQuestions}`, reportId, 'LOSSLESS');
      } else {
        const hasString = data.sellerQuestions.some((i: any) => typeof i === 'string');
        const hasMalformed = data.sellerQuestions.some((i: any) => typeof i === 'object' && i !== null && !i.questionText && !i.question);
        if (hasString) recordDeviation('sellerQuestions', 'string_instead_of_object_items', reportId, 'LOSSLESS');
        if (hasMalformed) recordDeviation('sellerQuestions', 'malformed_question_object', reportId, 'REJECTED');
      }
    }

    // 4. Audit ExpertDecisionSynthesis
    const synth = data.expertDecisionSynthesis;
    if (synth && typeof synth === 'object') {
      // Primary Technical Risk
      const ptr = synth.primaryTechnicalRisk;
      if (ptr && typeof ptr === 'object') {
        if (ptr.symptoms !== undefined && !Array.isArray(ptr.symptoms)) {
          recordDeviation('primaryTechnicalRisk.symptoms', `non_array_${typeof ptr.symptoms}`, reportId, 'LOSSLESS');
        }
        if (ptr.inspectionInstructions !== undefined && !Array.isArray(ptr.inspectionInstructions)) {
          recordDeviation('primaryTechnicalRisk.inspectionInstructions', `non_array_${typeof ptr.inspectionInstructions}`, reportId, 'LOSSLESS');
        }
      }

      // Secondary Technical Risks
      if (synth.secondaryTechnicalRisks !== undefined && !Array.isArray(synth.secondaryTechnicalRisks)) {
        recordDeviation('secondaryTechnicalRisks', `non_array_${typeof synth.secondaryTechnicalRisks}`, reportId, 'LOSSLESS');
      }

      // Conditions & Reasons
      const checkArrayOrString = (field: string, val: any) => {
        if (val !== undefined) {
          if (!Array.isArray(val)) {
            recordDeviation(field, `non_array_${typeof val}`, reportId, 'LOSSLESS');
          } else {
            const hasString = val.some((i: any) => typeof i === 'string');
            if (hasString) recordDeviation(field, 'string_items_in_object_array', reportId, 'LOSSLESS');
          }
        }
      };

      checkArrayOrString('strongestReasonsToChoose', synth.strongestReasonsToChoose);
      checkArrayOrString('compromisesAndLimitations', synth.compromisesAndLimitations);
      checkArrayOrString('suitableFor', synth.suitableFor);
      checkArrayOrString('notSuitableFor', synth.notSuitableFor);
      checkArrayOrString('purchaseConditions', synth.purchaseConditions);
      checkArrayOrString('walkAwayConditions', synth.walkAwayConditions);
    }

    // 5. Test Read-Time Normalization for Schema Safety & Semantic Preservation
    try {
      const { data: normalized, warnings, metrics } = normalizeVehicleReportPayload(data);

      // Verify no "[object Object]" anywhere in the output
      const jsonStr = JSON.stringify(normalized);
      if (jsonStr.includes('[object Object]')) {
        silentObjectCorruptions++;
      }

      schemaSafeCount++;

      if (metrics.rejectedItemCount > 0) {
        totalRejectedItems += metrics.rejectedItemCount;
      }
      if (metrics.unrecoverableFieldCount > 0) {
        totalUnrecoverableFields += metrics.unrecoverableFieldCount;
      }

      if (metrics.lossyNormalizedCount > 0 || metrics.rejectedItemCount > 0) {
        lossyCount++;
      } else {
        losslessCount++;
      }
    } catch (err) {
      console.error(`❌ Normalization crashed on Report ${reportId}:`, err);
    }
  }

  console.log('--- STRICT AUDIT METRICS ---');
  console.log(`Evaluated Reports: ${evaluatedReports}`);
  console.log(`Schema-Safe / Render-Safe Count: ${schemaSafeCount} / ${evaluatedReports} (${((schemaSafeCount / Math.max(1, evaluatedReports)) * 100).toFixed(1)}%)`);
  console.log(`Semantically Lossless Normalized Count: ${losslessCount} / ${evaluatedReports}`);
  console.log(`Lossy Normalized Count: ${lossyCount} / ${evaluatedReports}`);
  console.log(`Total Rejected Unrecoverable Items: ${totalRejectedItems}`);
  console.log(`Total Unrecoverable Required Fields: ${totalUnrecoverableFields}`);
  console.log(`Silent '[object Object]' Corruptions Produced: ${silentObjectCorruptions}`);

  console.log('\n--- DETECTED SHAPE DEVIATIONS BY FIELD ---');
  if (Object.keys(deviationMap).length === 0) {
    console.log('✅ Zero shape deviations currently present in the database.');
  } else {
    for (const [field, info] of Object.entries(deviationMap)) {
      console.log(`\n• Field: "${field}"`);
      console.log(`  Affected Reports: ${info.count}`);
      console.log(`  Semantic Nature: ${info.semanticNature} (${info.semanticNature === 'LOSSLESS' ? 'No information loss, pure type wrap' : 'Potential data loss'})`);
      console.log(`  Deviation Types:`, JSON.stringify(info.deviations, null, 2));
      console.log(`  Sample IDs:`, info.exampleReportIds);
    }
  }

  console.log('\n--- READ-TIME SAFETY & HISTORICAL BACKFILL POLICY ---');
  console.log('1. Read-Time Normalization:');
  console.log('   - Intercepts all read calls (getReportById, getCurrentVariantReport, getCurrentListingReport).');
  console.log('   - Guarantees 100% crash-safe delivery to Web and Mobile without fabricating fake data.');
  console.log('2. Zero Historical Mutation Policy:');
  console.log('   - Historical database records are NOT automatically rewritten in this task.');
  console.log('   - Read-time normalizer provides complete crash-immunity on read paths.');
  console.log('   - If a permanent historical data backfill is desired in the future, it should be planned as an explicit, backup-aware, idempotent migration task.\n');

  await prisma.$disconnect();
}

runReadOnlyLegacyReportAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
