import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ResearchService } from './research.service';
import { AiReportGeneratorService } from './ai-report-generator.service';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from './providers/web-search.provider';
import {
  ResearchScope,
  PriorityLevel,
  ResearchJobStatus,
  ApprovalStatus,
  SourceKind,
  ProblemType,
} from '@prisma/client';

async function runE2ETests() {
  console.log('=== STARTING UÇTAN UCA (E2E) PIPELINE DOĞRULAMA TESTİ ===');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const prisma = app.get(PrismaService);
  const researchService = app.get(ResearchService);
  const reportGenerator = app.get(AiReportGeneratorService);
  const searchProvider = app.get(WebSearchProvider);

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

  // Find a test variant from database to run E2E
  const variant = await prisma.vehicleVariant.findFirst({
    include: { brand: true, model: true, engine: true, transmission: true },
  });

  if (!variant) {
    console.error('Doğrulama testi için veritabanında araç varyantı bulunamadı. E2E testi atlandı.');
    await app.close();
    process.exit(0);
  }

  console.log(`Test Araç Varyantı: ${variant.year} ${variant.brand.name} ${variant.model.name} (${variant.engine.code})`);

  // Clear any existing active jobs for this test variant
  await prisma.vehicleResearchJob.deleteMany({
    where: {
      vehicleVariantId: variant.id,
      status: { in: [ResearchJobStatus.QUEUED, ResearchJobStatus.RUNNING] },
    },
  });

  // Mock search provider return values
  const originalSearch = searchProvider.search;
  searchProvider.search = async () => [
    {
      url: 'https://forum-tr.com/viewtopic?t=123',
      title: 'Test Araç Kronik Krank Mili Sorunu',
      snippet: 'Krank mili 100bin km sonrasında çatlama yapıyor, motor kilitleniyor.',
      reliabilityScore: 0.8,
      sourceKind: SourceKind.FORUM,
    },
    {
      url: 'https://complaints-car.org/brand/complaint-45',
      title: 'Motor Krank Mili Kırılması Şikayeti',
      snippet: 'Krank mili yolda giderken kırıldı, büyük masraf çıkardı.',
      reliabilityScore: 0.9,
      sourceKind: SourceKind.COMPLAINT_PLATFORM,
    },
    {
      url: 'https://official-recalls.gov/tsb-krank',
      title: 'Official Manufacturer Recall Notice',
      snippet: 'Krank mili malzemesindeki hata nedeniyle geri çağırma bülteni.',
      reliabilityScore: 1.0,
      sourceKind: SourceKind.OFFICIAL_RECALL,
    },
  ] as any;

  try {
    // 1. Request job
    console.log('1. Kuyruğa Yeni Araştırma İşi Ekleniyor...');
    // Create a temporary system user if not exists
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'e2e-test-user@torquescout.com',
          passwordHash: 'hashedpassword',
          role: 'ADMIN',
        },
      });
    }

    const jobId = await researchService.requestResearch(
      variant.id,
      user.id,
      'tr',
      'TR',
      ResearchScope.FULL_REPORT,
      PriorityLevel.HIGH
    );
    assert(!!jobId, `Research job enqueued successfully. Job ID: ${jobId}`);

    // 2. Process Job
    console.log('2. Worker İşi Kilitliyor ve Çalıştırıyor...');
    const processed = await researchService.processNextJob();
    assert(processed === true, 'Worker should process and successfully complete the job');

    // 3. Verify evidence rules and DB entries
    console.log('3. Otomatik Kanıt Kuralları Sonuçları Kontrol Ediliyor...');
    const problems = await prisma.commonProblem.findMany({
      where: { variantId: variant.id, title: { contains: 'Sızıntısı' } },
      include: { sources: true },
    });

    assert(problems.length > 0, 'Should have inserted Sızıntısı problems into CommonProblem');
    if (problems.length > 0) {
      const prob = problems[0];
      assert(prob.status === ApprovalStatus.APPROVED, `Problem status should be APPROVED (auto-published), got: ${prob.status}`);
      assert(prob.metadata !== null, 'Decision metadata should be populated');
      const meta = prob.metadata as any;
      assert(meta.publishedBy === 'AUTO_RULES', `publishedBy should be AUTO_RULES, got: ${meta.publishedBy}`);
    }

    // 4. Verify AI Report Generation
    console.log('4. APPROVED Verilerden AI Rapor Cache Derlemesi Yapılıyor...');
    const report = await reportGenerator.generateReportCache(variant.id, 'tr');
    assert(report !== null, 'Should successfully generate AiVehicleReport cache');
    assert(report.status === ApprovalStatus.APPROVED, `AiVehicleReport status should be APPROVED, got: ${report.status}`);
    assert(report.dataCoverage !== 'NONE', `Report coverage should be calculated, got: ${report.dataCoverage}`);

    // Cleanup E2E items
    console.log('5. Test Verileri Temizleniyor...');
    await prisma.commonProblemSource.deleteMany({
      where: { problemId: { in: problems.map((p) => p.id) } },
    });
    await prisma.commonProblem.deleteMany({
      where: { variantId: variant.id },
    });
    await prisma.recall.deleteMany({
      where: { variantId: variant.id },
    });
    await prisma.sellerQuestion.deleteMany({
      where: { variantId: variant.id },
    });
    await prisma.inspectionChecklistItem.deleteMany({
      where: { variantId: variant.id },
    });
    await prisma.aiVehicleReport.deleteMany({
      where: { variantId: variant.id },
    });

  } catch (err) {
    console.error('E2E Test Cycle encountered error:', err.message);
    failed++;
  } finally {
    // Restore original search provider
    searchProvider.search = originalSearch;
    await app.close();
  }

  console.log(`=== E2E DOĞRULAMA TAMAMLANDI: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runE2ETests();
