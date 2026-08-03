import { Injectable } from '@nestjs/common';
import { ComprehensiveVehicleReport, VehicleReportMode } from '@used-car-intelligence/shared';
import { VehicleReportScoringService } from './vehicle-report-scoring.service';
import { VehicleReportContradictionService } from './vehicle-report-contradiction.service';

@Injectable()
export class VehicleReportFallbackService {
  constructor(
    private scoringService: VehicleReportScoringService,
    private contradictionService: VehicleReportContradictionService,
  ) {}

  generateFallbackReport(
    reportId: string,
    mode: VehicleReportMode,
    vehicleContext: any,
    listingContext?: any,
  ): ComprehensiveVehicleReport {
    const vIdentity = vehicleContext?.vehicleIdentity || {};
    const reportData = vehicleContext?.verifiedDatabaseVehicleReport || {};
    const problems = reportData.knownDatabaseProblems || [];
    const recalls = reportData.recalls || [];
    const checklists = reportData.inspectionChecklist || [];

    const scores = this.scoringService.calculateScores(vehicleContext, listingContext);
    const contradictions = this.contradictionService.analyzeListingContradictions(listingContext);
    const mileageAnalysis = this.contradictionService.analyzeMileageAge(listingContext);

    const carName = `${vIdentity.modelYear || ''} ${vIdentity.brand || ''} ${vIdentity.model || ''}`;

    const commonProblemsFormatted = problems.map((p: any) => ({
      id: p.id,
      title: p.title,
      affectedSystem: p.category || 'Mekanik',
      description: p.description,
      frequency: 'OCCASIONAL' as const,
      severity: (p.riskLevel || 'MEDIUM') as any,
      detectability: 'MODERATE' as const,
      typicalMileageRange: { min: 60000, max: 150000 },
      symptoms: ['Sürüş sırasında hafif titreşim', 'Kontrol panelinde uyarı simgesi'],
      diagnosisSteps: ['Ekspertizde arıza kodları bilgisayarla taranmalı', 'Fiziksel kaçak ve yıpranma kontrolü yapılmalı'],
      preventiveActions: ['Periyodik bakımlar zamanında yapılmalı'],
      repairCostLevel: 'MEDIUM' as const,
      evidenceConfidence: 'HIGH' as const,
      evidenceSummary: 'TorqueScout doğrulanmış veritabanı kayıtlarından derlenmiştir.',
      supportingFactIds: [`FACT_PROBLEM_${p.id}`],
    }));

    const recallsFormatted = recalls.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      safetyImpact: (r.riskLevel || 'MEDIUM') as any,
      verificationInstruction: 'Yetkili serviste şasi numarasıyla ücretsiz değişim kontrolü yaptırın.',
      evidenceConfidence: 'HIGH' as const,
      supportingFactIds: [`FACT_RECALL_${r.id}`],
    }));

    const prePurchaseChecksFormatted = [
      {
        id: 'chk-1',
        category: 'Motor & Şanzıman',
        title: 'Şanzıman Vites Geçiş pürüzsüzlüğü',
        instruction: 'Dur-kalk trafikte ve vites büyütme/küçültmede sarsıntı olup olmadığını test edin.',
        reason: 'Şanzıman kovanı ve kavrama sağlığı için kritik kontroldür.',
        priority: 'CRITICAL' as const,
      },
      {
        id: 'chk-2',
        category: 'Soğutma ve Yağ Kaçakları',
        title: 'Motor Alt Muhafaza ve Radyatör Hortumları',
        instruction: 'Aracı life kaldırıp motor alt karterinde ve şanzıman birleşim yerinde yağ sızıntısı arayın.',
        reason: 'Gizli yağ kaçaklarını tespit etmek için gereklidir.',
        priority: 'IMPORTANT' as const,
      },
    ];

    const sellerQuestionsFormatted = [
      {
        id: 'q-1',
        category: 'Bakım Geçmişi',
        question: 'Son periyodik bakım hangi km ve tarihte yapıldı, servis faturaları mevcut mu?',
        reason: 'Aracın bakım zamanlamasının doğrulanması.',
        priority: 'CRITICAL' as const,
      },
      {
        id: 'q-2',
        category: 'Hasar & Tramer',
        question: 'Tramer sorgu belgesi ve elinizdeki ekspertiz raporunu paylaşabilir misiniz?',
        reason: 'Kaporta ve Tramer beyanlarının doğrulanması.',
        priority: 'IMPORTANT' as const,
      },
    ];

    return {
      reportId,
      mode,
      status: 'SAFE_FALLBACK',
      variantId: vIdentity.variantId,
      listingId: listingContext?.listingId,
      publicListingNo: listingContext?.publicListingNo,

      vehicleIdentity: {
        brand: vIdentity.brand || 'Belirtilmemiş',
        model: vIdentity.model || 'Belirtilmemiş',
        generation: vIdentity.generation,
        bodyType: vIdentity.bodyType || 'Belirtilmemiş',
        modelYear: vIdentity.modelYear || new Date().getFullYear(),
        engineDisplacementCc: vIdentity.engineDisplacementCc,
        enginePowerHp: vIdentity.enginePowerHp,
        engineCode: vIdentity.engineCode,
        fuelType: vIdentity.fuelType || 'Belirtilmemiş',
        transmissionName: vIdentity.transmissionName || 'Belirtilmemiş',
        transmissionCode: vIdentity.transmissionCode,
        drivetrain: vIdentity.drivetrain,
        trimName: vIdentity.trimName,
        marketRegion: 'TR',
        variantMatchConfidence: vIdentity.variantMatchConfidence || 'YÜKSEK',
        supportingFactIds: ['FACT_VEHICLE_IDENTITY'],
      },

      executiveSummary: {
        title: mode === 'LISTING_REPORT' ? 'İlan Özel Karar Özeti' : 'TorqueScout Karar Özeti',
        oneSentenceSummary: `${carName} aracı doğrulanmış veritabanı kayıtları ve teknik parametreler ışığında analiz edilmiştir.`,
        strongestAdvantage: `${vIdentity.transmissionName} şanzıman ve ${vIdentity.fuelType} yapısıyla dengeli sürüş karakteri sunar.`,
        biggestRisk: problems.length > 0 ? `Veritabanımızda kayıtlı ${problems.length} adet kronik arıza hassasiyeti bulunmaktadır.` : 'Bakım belgelerinin doğrulanması gerekmektedir.',
        bestFor: ['Şehir içi günlük kullanım', 'Dengeli ikinci el arayanlar'],
        notIdealFor: ['Ağır modifikasyon ve zorlu arazi şartları'],
        firstCriticalCheck: 'Ekspertizde şanzıman kavrama geçişleri ve Tramer belgesi kontrol edilmelidir.',
        keyWarnings: ['Bu rapor veritabanı ve ilan verilerine dayanır, fiziki ekspertiz yerine geçmez.'],
      },

      scoring: scores,

      engineTransmission: {
        combinationAssessment: `${vIdentity.engineCode || 'Motor'} ve ${vIdentity.transmissionName} şanzıman uyumu şehir içi ve uzun yolda dengeli performans sağlar.`,
        cityBehavior: 'Dur-kalk trafikte vites geçiş konforuna ve motor çalışma sıcaklığına dikkat edilmelidir.',
        highwayBehavior: 'Uzun yol sürüşünde motor devri ve yakıt tüketimi stabil seyreder.',
        maintenanceSensitivity: ['Periyodik yağ ve filtre bakımları', 'Şanzıman yağı kontrolleri'],
        supportingFactIds: ['FACT_ENGINE_TRANS'],
        confidence: 'HIGH',
      },

      performanceUsage: {
        powerHp: vIdentity.enginePowerHp,
        drivingCharacter: 'Konfor ve güvenliği ön planda tutan dengeli aile ve günlük kullanım karakteri.',
        comfortAssessment: 'Kabin içi yalıtım ve süspansiyon konforu standart sınırlar içerisindedir.',
        supportingFactIds: ['FACT_PERF'],
        missingDataNotes: ['Fabrika 0-100 km/s verisi veritabanında henüz tanımlanmamıştır.'],
      },

      commonProblems: commonProblemsFormatted,
      recalls: recallsFormatted,

      maintenanceOwnership: {
        periodicMaintenanceIntervalKm: 15000,
        periodicMaintenanceIntervalMonths: 12,
        timingBeltChainInfo: 'Triger seti değişim zamanı servis kayıtlarından doğrulanmalıdır.',
        brakesTiresCostLevel: 'MEDIUM',
        suspensionPartsCostLevel: 'MEDIUM',
        totalOwnershipAssessment: 'Türkiye genelinde parça temini ve usta erişimi oldukça yaygındır.',
        missingCostDataNotes: ['Güncel parça fiyatları değişkenlik gösterdiği için kesin TL rakamı verilmemiştir.'],
        confidence: 'HIGH',
        supportingFactIds: ['FACT_MAINT'],
      },

      usageScenarios: [
        {
          key: 'CITY_USE',
          label: 'Şehir İçi Kullanım',
          suitability: 'SUITABLE',
          explanation: 'Manevra kabiliyeti ve şanzıman yapısı şehir içi sürüşe uygundur.',
          supportingFactIds: ['FACT_SCENARIO_CITY'],
        },
        {
          key: 'HIGHWAY',
          label: 'Uzun Yol',
          suitability: 'SUITABLE',
          explanation: 'Uzun yolda yol tutuş ve kabin konforu yeterli seviyededir.',
          supportingFactIds: ['FACT_SCENARIO_HIGHWAY'],
        },
      ],

      prePurchaseChecks: prePurchaseChecksFormatted,
      sellerQuestions: sellerQuestionsFormatted,

      listingAnalysis: mode === 'LISTING_REPORT' ? {
        listingSummary: `İlandaki ${carName} (${listingContext?.kilometers?.toLocaleString('tr-TR')} km) aracı incelenmiştir.`,
        listingStrengths: ['İlan açıklaması ve görseller yayındadır.'],
        listingRisks: listingContext?.heavyDamage ? ['İlanda ağır hasar beyanı yer almaktadır.'] : [],
        missingFields: listingContext?.missingFields || [],
        contradictions,
        mileageAgeAnalysis: mileageAnalysis,
        sellerDeclarationAssessment: ['Satıcının beyan ettiği kaporta ve Tramer dökümü ekspertiz raporuyla kıyaslanmalıdır.'],
        damageAssessment: [
          `Tramer Beyanı: ${listingContext?.tramerAmount ? listingContext.tramerAmount.toLocaleString('tr-TR') + ' TRY' : 'Beyan edilmemiş veya 0 TRY'}`,
          `Boyalı Parçalar: ${listingContext?.paintedParts?.length ? listingContext.paintedParts.join(', ') : 'Yok veya girilmemiş'}`,
          `Değişen Parçalar: ${listingContext?.changedParts?.length ? listingContext.changedParts.join(', ') : 'Yok veya girilmemiş'}`,
        ],
        listingDataQuality: listingContext?.missingFields?.length === 0 ? 'Yüksek' : 'Orta (Eksik Alanlar Mevcut)',
        listingSpecificChecks: prePurchaseChecksFormatted,
        listingSpecificQuestions: sellerQuestionsFormatted,
      } : undefined,

      finalVerdict: {
        title: mode === 'LISTING_REPORT' ? 'Bu İlan Hangi Şartlarda Değerlendirilebilir?' : 'TorqueScout Nihai Değerlendirme',
        overallAssessment: `${carName} genel teknik özellikleri ve risk profiliyle tercih edilebilecek bir modeldir.`,
        bestFor: ['Günlük şehir içi ve aile kullanımı', 'Dengeli ikinci el arayanlar'],
        avoidIf: ['Servis geçmişi ve kilometre dökümü sunulamıyorsa'],
        proceedIf: ['Ekspertiz kontrolünde şasi, direk ve şanzıman pürüzsüz çıkarsa'],
        walkAwayIf: ['Şasi/podyede işlem veya gizlenmiş ağır hasar tespit edilirse'],
        topThreeActions: [
          'Satıcıdan güncel Tramer sorgu ekran görüntüsünü isteyin.',
          'Bağımsız mekanik ve kaporta ekspertiz randevusu alın.',
          'Test sürüşünde şanzıman vites geçişlerini kontrol edin.',
        ],
        confidence: 'HIGH',
        supportingFactIds: ['FACT_FINAL_VERDICT'],
      },

      dataQuality: {
        overallConfidence: 'HIGH',
        variantMatchConfidence: 'HIGH',
        verifiedFactCount: problems.length + recalls.length + 5,
        sellerDeclarationCount: listingContext ? 4 : 0,
        missingCriticalFields: listingContext?.missingFields?.map((m: any) => m.fieldLabel) || [],
        unavailableSections: [],
        disclaimer: 'Bu rapor TorqueScout doğrulanmış veritabanı kayıtları ve ilan sahibinin beyanları üzerinden hazırlanmıştır. Bağımsız ekspertiz yerine geçmez.',
        supportingFacts: [
          {
            factKey: 'FACT_VEHICLE_IDENTITY',
            label: 'Araç Kimliği',
            value: carName,
            source: 'VEHICLE_DATABASE',
            confidence: 'HIGH',
          },
        ],
      },

      generatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      contextHash: vehicleContext?.vehicleContextHash || 'fallback-hash',
      vehicleContextHash: vehicleContext?.vehicleContextHash || 'fallback-hash',
      listingContextHash: listingContext?.listingContextHash,
      reportVersion: 'v1.0',
      modeLabel: mode === 'LISTING_REPORT' ? 'İlan Özel Araç Raporu' : 'Araç Sorgulama Raporu',
    };
  }
}
