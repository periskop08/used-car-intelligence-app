import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUrl(url: string): Promise<{ status: number | null; error?: string; bodySnippet?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);
    const text = await res.text();
    return {
      status: res.status,
      bodySnippet: text.slice(0, 300).replace(/\s+/g, ' '),
    };
  } catch (err: any) {
    return {
      status: null,
      error: err.message,
    };
  }
}

async function run() {
  console.log('================================================================');
  console.log('FINAL SOURCE AUTHENTICITY & APPLICATION-MATCH AUDIT');
  console.log('STRICT READ-ONLY — ZERO DB WRITES');
  console.log('================================================================\n');

  const audiVariantId = 'dde6b4e3-40a0-4652-b038-e10324bd077d';
  const brzVariantId = 'ae5c8d89-21dd-4c32-aad1-6e517510f9fa';

  // 1. AUDI DISPLACEMENT EVIDENCE AUDIT
  console.log('--- 1. AUDI A3 35 TFSI PERSISTED EVIDENCE AUDIT ---');
  const audiSpec = await prisma.technicalSpec.findUnique({ where: { variantId: audiVariantId } });
  const audiVerification = (audiSpec?.specs as any)?.displacementVerification;

  console.log(`totalEvidenceArrayLength: ${audiVerification?.evidence?.length || 0}`);
  console.log(`acceptedEvidenceArrayLength: ${audiVerification?.evidence?.filter((e: any) => e.accepted).length || 0}`);
  const audiUniqueDomains = new Set(audiVerification?.evidence?.filter((e: any) => e.accepted).map((e: any) => e.domain));
  console.log(`uniqueAcceptedDomainCount: ${audiUniqueDomains.size}`);
  console.log(`consensus.acceptedEvidenceCount: ${audiVerification?.consensus?.acceptedEvidenceCount}`);
  console.log(`consensus.independentDomainCount: ${audiVerification?.consensus?.independentDomainCount}`);

  for (const [idx, ev] of (audiVerification?.evidence || []).entries()) {
    console.log(`\n  [Audi Evidence #${idx + 1}]`);
    console.log(`    URL: ${ev.url}`);
    console.log(`    Domain: ${ev.domain} (Tier ${ev.sourceTier})`);
    console.log(`    Extracted Value: ${ev.extractedValue} ${ev.extractedUnit}`);
    console.log(`    identityMatch: ${ev.identityMatch}, applicationMatch: ${ev.applicationMatch}`);
    console.log(`    Persisted Excerpt: "${ev.evidenceExcerpt}"`);

    // Live HTTP check
    const httpRes = await checkUrl(ev.url);
    console.log(`    Live HTTP Status: ${httpRes.status || 'FAILED/TIMEOUT'} ${httpRes.error ? `(${httpRes.error})` : ''}`);
    if (httpRes.bodySnippet) {
      console.log(`    Body Preview: ${httpRes.bodySnippet.slice(0, 150)}...`);
    }
  }

  // 2. BRZ DISPLACEMENT EVIDENCE AUDIT
  console.log('\n--- 2. SUBARU BRZ PERSISTED EVIDENCE AUDIT ---');
  const brzSpec = await prisma.technicalSpec.findUnique({ where: { variantId: brzVariantId } });
  const brzVerification = (brzSpec?.specs as any)?.displacementVerification;

  console.log(`totalEvidenceArrayLength: ${brzVerification?.evidence?.length || 0}`);
  console.log(`acceptedEvidenceArrayLength: ${brzVerification?.evidence?.filter((e: any) => e.accepted).length || 0}`);
  const brzUniqueDomains = new Set(brzVerification?.evidence?.filter((e: any) => e.accepted).map((e: any) => e.domain));
  console.log(`uniqueAcceptedDomainCount: ${brzUniqueDomains.size}`);
  console.log(`consensus.acceptedEvidenceCount: ${brzVerification?.consensus?.acceptedEvidenceCount}`);
  console.log(`consensus.independentDomainCount: ${brzVerification?.consensus?.independentDomainCount}`);

  for (const [idx, ev] of (brzVerification?.evidence || []).entries()) {
    console.log(`\n  [BRZ Evidence #${idx + 1}]`);
    console.log(`    URL: ${ev.url}`);
    console.log(`    Domain: ${ev.domain} (Tier ${ev.sourceTier})`);
    console.log(`    Extracted Value: ${ev.extractedValue} ${ev.extractedUnit}`);
    console.log(`    identityMatch: ${ev.identityMatch}, applicationMatch: ${ev.applicationMatch}`);
    console.log(`    Persisted Excerpt: "${ev.evidenceExcerpt}"`);

    // Live HTTP check
    const httpRes = await checkUrl(ev.url);
    console.log(`    Live HTTP Status: ${httpRes.status || 'FAILED/TIMEOUT'} ${httpRes.error ? `(${httpRes.error})` : ''}`);
    if (httpRes.bodySnippet) {
      console.log(`    Body Preview: ${httpRes.bodySnippet.slice(0, 150)}...`);
    }
  }

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
