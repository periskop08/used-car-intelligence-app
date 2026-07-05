import { CoverageService } from './coverage.service';
import { SourceKind, DataCoverage } from '@used-car-intelligence/shared';

async function runTests() {
  console.log('=== RUNNING LOGIC VERIFICATION ===');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  };

  const coverageService = new CoverageService();

  // Test 1: Data Coverage Boundaries
  assert(
    coverageService.calculateDataCoverage(0) === DataCoverage.NONE,
    '0 approved items should result in NONE coverage'
  );
  assert(
    coverageService.calculateDataCoverage(1) === DataCoverage.LIMITED,
    '1 approved item should result in LIMITED coverage'
  );
  assert(
    coverageService.calculateDataCoverage(3) === DataCoverage.MODERATE,
    '3 approved items should result in MODERATE coverage'
  );
  assert(
    coverageService.calculateDataCoverage(6) === DataCoverage.GOOD,
    '6 approved items should result in GOOD coverage'
  );

  // Test 2: Weightings & Domain Cap on Coverage Score
  const sources: { url: string; sourceKind: SourceKind }[] = [
    { url: 'https://forum.com/thread1', sourceKind: SourceKind.FORUM }, // weight 5
    { url: 'https://forum.com/thread2', sourceKind: SourceKind.FORUM }, // weight 5
    { url: 'https://forum.com/thread3', sourceKind: SourceKind.FORUM }, // capped, should be ignored
    { url: 'https://official.gov/recall', sourceKind: SourceKind.OFFICIAL_RECALL }, // weight 30
    { url: 'https://mock.com/1', sourceKind: SourceKind.MOCK }, // mock, weight 0
  ];

  const score = coverageService.calculateCoverageScore(sources);
  // Expected total: 5 + 5 + 30 = 40. The third forum thread and mock source contribute 0.
  assert(score === 40, `Coverage score should be 40, got ${score}`);

  console.log(`=== VERIFICATION COMPLETE: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
