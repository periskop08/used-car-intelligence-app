import {
  normalizeVehicleReportPayload,
  normalizeStringArray,
  extractFieldString,
  WHITELISTS,
} from '../packages/shared/src/utils/normalizeVehicleReportPayload';

function runSemanticsTest() {
  console.log('--- RUNNING NORMALIZER DATA-INTEGRITY & SEMANTICS TEST ---');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: symptoms = "Soğuk çalıştırmada ses" -> ["Soğuk çalıştırmada ses"] (Lossless)
  const warnings1: any[] = [];
  const res1 = normalizeStringArray('Soğuk çalıştırmada ses', 'primaryTechnicalRisk.symptoms', WHITELISTS.symptoms, warnings1);
  assert(
    Array.isArray(res1) && res1.length === 1 && res1[0] === 'Soğuk çalıştırmada ses',
    'Single string wrapped in string[] losslessly'
  );
  assert(warnings1[0]?.classification === 'LOSSLESS', 'Warning classified as LOSSLESS');

  // TEST 2: symptoms = { symptom: "Zincir sesi" } -> ["Zincir sesi"] (Field-specific extraction)
  const warnings2: any[] = [];
  const res2 = normalizeStringArray({ symptom: 'Zincir sesi' }, 'primaryTechnicalRisk.symptoms', WHITELISTS.symptoms, warnings2);
  assert(
    Array.isArray(res2) && res2.length === 1 && res2[0] === 'Zincir sesi',
    'Object with matching whitelist key extracted to string[]'
  );
  assert(warnings2[0]?.classification === 'LOSSY', 'Warning classified as LOSSY');

  // TEST 3: symptoms = { foo: { bar: 1 } } -> [] + telemetry (Rejected unextractable object)
  const warnings3: any[] = [];
  const res3 = normalizeStringArray({ foo: { bar: 1 } }, 'primaryTechnicalRisk.symptoms', WHITELISTS.symptoms, warnings3);
  assert(
    Array.isArray(res3) && res3.length === 0,
    'Unextractable object converted safely to empty array []'
  );
  assert(warnings3[0]?.classification === 'REJECTED', 'Warning classified as REJECTED');

  // TEST 4: Zero "[object Object]" guarantee
  const testPayload = {
    expertDecisionSynthesis: {
      primaryTechnicalRisk: {
        title: 'Triger Kayışı',
        symptoms: [{ arbitraryNested: { deep: true } }, 'Doğru belirti'],
        inspectionInstructions: 'Tekil talimat',
      },
      purchaseConditions: 'Motor soğukken kontrol edilmeli',
      walkAwayConditions: [{ condition: 'Şasede işlem tespit edilirse' }],
    },
    prePurchaseChecks: ['Alt takım kontrolü'],
    sellerQuestions: [{ questionText: 'Bakımları yetkili serviste mi yapıldı?' }],
  };

  const { data: normalized, warnings, metrics } = normalizeVehicleReportPayload(testPayload);
  const jsonOutput = JSON.stringify(normalized);

  assert(!jsonOutput.includes('[object Object]'), 'Zero instance of [object Object] produced');
  assert(
    normalized.expertDecisionSynthesis.primaryTechnicalRisk.symptoms.length === 1 &&
    normalized.expertDecisionSynthesis.primaryTechnicalRisk.symptoms[0] === 'Doğru belirti',
    'Unextractable item dropped and valid item preserved'
  );

  // TEST 5: NO FAKE PRIORITY (Fail-safe != Fake Data)
  const cond = normalized.expertDecisionSynthesis.purchaseConditions[0];
  assert(cond.condition === 'Motor soğukken kontrol edilmeli', 'Purchase condition string preserved as condition');
  assert(cond.priority === undefined, 'No fake priority ("ÖNEMLİ") invented for condition without priority');
  assert(cond.supportingFactIds === undefined, 'No fake supportingFactIds invented');

  // TEST 6: PrePurchaseChecks without fake priority
  const check = normalized.prePurchaseChecks[0];
  assert(check.title === 'Alt takım kontrolü', 'Check string preserved as title');
  assert(check.priority === undefined, 'No fake priority invented for check');

  console.log(`\nTests Completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSemanticsTest();
