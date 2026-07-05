import { CoverageService } from './coverage.service';
import { EvidenceRulesService } from './evidence-rules.service';
import { SourceKind, DataCoverage, ApprovalStatus, DataConfidence, ProblemType } from '@used-car-intelligence/shared';

async function runTests() {
  console.log('=== RUNNING AUTOMATED EVIDENCE RULES TESTS ===');
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
  const evidenceRules = new EvidenceRulesService();

  // Test 1: Data Coverage boundaries
  assert(
    coverageService.calculateDataCoverage(0) === DataCoverage.NONE,
    '0 approved items should result in NONE coverage'
  );
  assert(
    coverageService.calculateDataCoverage(1) === DataCoverage.LIMITED,
    '1 approved item should result in LIMITED coverage'
  );

  // Test 2: Coverage Score Domain Cap
  const sources: { url: string; sourceKind: SourceKind }[] = [
    { url: 'https://forum.com/thread1', sourceKind: SourceKind.FORUM }, // weight 5
    { url: 'https://forum.com/thread2', sourceKind: SourceKind.FORUM }, // weight 5
    { url: 'https://forum.com/thread3', sourceKind: SourceKind.FORUM }, // capped, should be ignored
    { url: 'https://official.gov/recall', sourceKind: SourceKind.OFFICIAL_RECALL }, // weight 30
  ];
  const score = coverageService.calculateCoverageScore(sources);
  assert(score === 40, `Coverage score should be 40 (capped), got ${score}`);

  // Test 3: CommonProblem - 2 kinds but single domain -> NOT published as COMMON_PROBLEM
  const singleDomainSources = [
    { url: 'https://forum.com/thread1', sourceKind: SourceKind.FORUM, isOfficial: false, isVerified: false },
    { url: 'https://forum.com/review1', sourceKind: SourceKind.USER_REVIEW, isOfficial: false, isVerified: false },
  ];
  const res1 = evidenceRules.evaluateCommonProblem({ title: 'Test' }, singleDomainSources);
  assert(
    res1.problemType === ProblemType.USER_COMPLAINT && res1.status === ApprovalStatus.APPROVED,
    '2 different sourceKind but single domain should publish as USER_COMPLAINT'
  );

  // Test 4: CommonProblem - 2 kinds + 2 unique domains -> published as APPROVED/COMMON_PROBLEM
  const multiDomainKindsSources = [
    { url: 'https://forum.com/thread1', sourceKind: SourceKind.FORUM, isOfficial: false, isVerified: false },
    { url: 'https://complaints.org/1', sourceKind: SourceKind.COMPLAINT_PLATFORM, isOfficial: false, isVerified: false },
  ];
  const res2 = evidenceRules.evaluateCommonProblem({ title: 'Test' }, multiDomainKindsSources);
  assert(
    res2.problemType === ProblemType.COMMON_PROBLEM && res2.status === ApprovalStatus.APPROVED && res2.dataConfidence === DataConfidence.MEDIUM,
    '2 different sourceKind + 2 unique domains should publish as APPROVED COMMON_PROBLEM'
  );

  // Test 5: CommonProblem - 3 unique domains -> published as APPROVED
  const threeDomainSources = [
    { url: 'https://domain1.com/a', sourceKind: SourceKind.FORUM, isOfficial: false, isVerified: false },
    { url: 'https://domain2.com/b', sourceKind: SourceKind.FORUM, isOfficial: false, isVerified: false },
    { url: 'https://domain3.com/c', sourceKind: SourceKind.FORUM, isOfficial: false, isVerified: false },
  ];
  const res3 = evidenceRules.evaluateCommonProblem({ title: 'Test' }, threeDomainSources);
  assert(
    res3.status === ApprovalStatus.APPROVED && res3.dataConfidence === DataConfidence.MEDIUM,
    '3 unique domains should publish as APPROVED CommonProblem'
  );

  // Test 6: Recall backed by official source -> APPROVED
  const officialRecallSources = [
    { url: 'https://nhtsa.gov/1', sourceKind: SourceKind.OFFICIAL_RECALL, isOfficial: true, isVerified: true },
  ];
  const recRes1 = evidenceRules.evaluateRecall({ title: 'Test Recall' }, officialRecallSources);
  assert(
    recRes1.status === ApprovalStatus.APPROVED && recRes1.dataConfidence === DataConfidence.HIGH,
    'Recall backed by official source should be APPROVED'
  );

  // Test 7: Recall backed only by forum -> REJECTED
  const forumRecallSources = [
    { url: 'https://forum.com/thread1', sourceKind: SourceKind.FORUM, isOfficial: false, isVerified: false },
  ];
  const recRes2 = evidenceRules.evaluateRecall({ title: 'Test Recall' }, forumRecallSources);
  assert(
    recRes2.status === ApprovalStatus.REJECTED,
    'Recall backed only by forum should be REJECTED'
  );

  // Test 8: Unverified SERVICE_NOTE alone -> USER_COMPLAINT with LOW confidence
  const unverifiedServiceSources = [
    { url: 'https://blog.com/tips', sourceKind: SourceKind.SERVICE_NOTE, isVerified: false, isOfficial: false },
  ];
  const res4 = evidenceRules.evaluateCommonProblem({ title: 'Test' }, unverifiedServiceSources);
  assert(
    res4.problemType === ProblemType.USER_COMPLAINT && res4.dataConfidence === DataConfidence.LOW,
    'Unverified SERVICE_NOTE alone should result in USER_COMPLAINT with LOW confidence'
  );

  // Test 9: Verified SERVICE_NOTE -> APPROVED CommonProblem with HIGH confidence
  const verifiedServiceSources = [
    { url: 'https://official-bulletin.com/tsb', sourceKind: SourceKind.SERVICE_NOTE, isVerified: true, isOfficial: false },
  ];
  const res5 = evidenceRules.evaluateCommonProblem({ title: 'Test' }, verifiedServiceSources);
  assert(
    res5.problemType === ProblemType.COMMON_PROBLEM && res5.dataConfidence === DataConfidence.HIGH && res5.status === ApprovalStatus.APPROVED,
    'Verified SERVICE_NOTE should result in APPROVED CommonProblem with HIGH confidence'
  );

  console.log(`=== TEST COMPLETE: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
