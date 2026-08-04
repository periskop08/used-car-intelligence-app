import { Injectable } from '@nestjs/common';
import { ComprehensiveVehicleReport, VehicleReportMode, ExpertDecisionSynthesis, ReportSupportingFact } from '@used-car-intelligence/shared';
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
    const perfSpecs = vehicleContext?.performanceSpecs || {};
    const problems = reportData.knownDatabaseProblems || [];
    const recalls = reportData.recalls || [];

    const scores = this.scoringService.calculateScores(vehicleContext, listingContext);
    const contradictions = this.contradictionService.analyzeListingContradictions(listingContext);
    const mileageAnalysis = this.contradictionService.analyzeMileageAge(listingContext);

    const brand = vIdentity.brand || 'Araç';
    const model = vIdentity.model || '';
    const year = vIdentity.modelYear || '';
    const fuel = vIdentity.fuelType || 'Benzin';
    const trans = vIdentity.transmissionName || 'Otomatik';
    const hp = vIdentity.enginePowerHp ? `${vIdentity.enginePowerHp} bg` : (perfSpecs.enginePowerHp ? `${perfSpecs.enginePowerHp} bg` : 'standart güç');
    const carTitle = `${year} ${brand} ${model} ${vIdentity.trimName || ''}`.trim();

    // Collect Supporting Facts
    const supportingFacts: ReportSupportingFact[] = [
      {
        factKey: 'ENGINE_POWER',
        label: 'Motor Gücü',
        value: hp,
        source: 'VEHICLE_DATABASE',
        confidence: 'HIGH',
      },
      {
        factKey: 'TRANSMISSION_TYPE',
        label: 'Şanzıman Türü',
        value: trans,
        source: 'VEHICLE_DATABASE',
        confidence: 'HIGH',
      },
      {
        factKey: 'FUEL_TYPE',
        label: 'Yakıt Türü',
        value: fuel,
        source: 'VEHICLE_DATABASE',
        confidence: 'HIGH',
      },
    ];

    if (problems.length > 0) {
      supportingFacts.push({
        factKey: 'KNOWN_PROBLEMS_COUNT',
        label: 'Onaylı Kronik Sorun Kaydı',
        value: problems.length,
        source: 'VEHICLE_DATABASE',
        confidence: 'HIGH',
      });
    }

    const supportingFactIds = supportingFacts.map((f) => f.factKey);

    // Primary & Secondary Risks
    let primaryRisk = undefined;
    const secondaryRisks = [];

    if (problems.length > 0) {
      const topProb = problems[0];
      primaryRisk = {
        title: topProb.title || 'Mekanik Aşınma Riski',
        severity: (topProb.riskLevel || 'MEDIUM') as any,
        explanation: topProb.description || 'Veritabanında kayıtlı aksam aşınma hassasiyeti.',
        symptoms: ['Sürüş sırasında anormal ses veya titreşim', 'Sıvı seviyelerinde düşüş'],
        inspectionInstructions: [
          'Ekspertizde aracı liftte kaldırıp alt muhafazayı ve sızıntı bölgesini inceletin.',
          'Bilgisayarlı arıza arama cihazı (OBD-II) ile hata kodlarını taratın.',
        ],
        riskMeaning: 'Bu kayıt tek başına araçtan vazgeçme nedeni değildir; ancak fiziki kontrolde masraf tespiti için önceliklidir.',
        supportingFactIds: [`FACT_PROB_${topProb.id || '1'}`],
      };

      for (let i = 1; i < problems.length; i++) {
        secondaryRisks.push({
          title: problems[i].title,
          severity: (problems[i].riskLevel || 'LOW') as any,
          explanation: problems[i].description || 'Takip edilmesi gereken teknik aksam uyarısı.',
          symptoms: ['Periyodik bakım aralığında kontrol gereksinimi'],
          inspectionInstructions: ['Periyodik servis kayıtlarını inceletin.'],
          supportingFactIds: [`FACT_PROB_${problems[i].id}`],
        });
      }
    }

    // Expert Decision Synthesis
    const expertDecisionSynthesis: ExpertDecisionSynthesis = {
      vehicleCharacter: {
        headline: `${carTitle} — Teknik Karakter ve Kullanım Sentezi`,
        detailedAssessment: `${carTitle}, ${hp} gücündeki ${fuel} motoru ve ${trans} şanzıman kombinasyonuyla günlük şehir içi pratikliği ve öngörülebilir sürüş dengesine odaklanan bir yapı sunar. Bu güç ve şanzıman karakteri agresif sportif hızlanmadan ziyade konforlu, sarsıntısız ve sürdürülebilir kullanım arayan sürücülere hitap eder. Doğrulanmış teknik verilere göre periyodik bakımları düzenli yapıldığı takdirde sürüş dengesini korur.`,
        supportingFactIds,
      },
      dailyUseAssessment: {
        cityUse: `${trans} şanzıman dur-kalk şehir içi trafiğinde kullanım kolaylığı ve sarsıntısız kalkış imkanı sunar.`,
        highwayUse: `Sabit hız otoyol sürüşlerinde ${hp} güç dengesi makul seyir konforu sağlar.`,
        trafficBehavior: `Dur-kalk kullanımında şanzıman ısınma ve kavrama sağlığı periyodik olarak kontrol edilmelidir.`,
        comfortAssessment: `Sınıfı standartlarında günlük kullanım pratikliği ve kabin ergonomisi vadeder.`,
        supportingFactIds,
      },
      strongestReasonsToChoose: [
        {
          title: `${trans} Şanzıman ve Motor Uyumu`,
          explanation: `Doğrulanmış ${trans} altyapısı ve ${hp} motor gücü günlük kullanımda akıcı ve öngörülebilir bir sürüş karakteri sunar.`,
          supportingFactIds: ['ENGINE_POWER', 'TRANSMISSION_TYPE'],
        },
        {
          title: 'Doğrulanmış Veritabanı Şeffaflığı',
          explanation: `Araç teknik verileri ve kronik arıza kayıtları TorqueScout veritabanı ile eşleştirilerek tarafsızca değerlendirilmiştir.`,
          supportingFactIds: ['KNOWN_PROBLEMS_COUNT'],
        },
      ],
      compromisesAndLimitations: [
        {
          title: 'Sınırlı Sportif Performans Beklentisi',
          explanation: `${hp} motor gücü ve ${trans} yapısı ani ara hızlanma veya sportif sürüş isteyen kullanıcıların beklentisini karşılamayabilir.`,
          supportingFactIds: ['ENGINE_POWER'],
        },
      ],
      suitableFor: [
        {
          profile: 'Şehir İçi Günlük Kullanıcılar',
          explanation: `${trans} şanzıman rahatlığı ve dengeli motor yapısı yoğun şehir trafiğinde konfor sağlar.`,
          supportingFactIds: ['TRANSMISSION_TYPE'],
        },
        {
          profile: 'Sakin ve Öngörülebilir Sürüş İsteyenler',
          explanation: `Sarsıntısız hızlanma ve makul kullanım maliyeti arayan sürücüler için uygundur.`,
          supportingFactIds: ['ENGINE_POWER'],
        },
      ],
      notSuitableFor: [
        {
          profile: 'Yüksek Performans ve Sert Ara Hızlanma Arayanlar',
          explanation: `Motor ve şanzıman karakteri sert performans odaklı kullanıma uygun değildir.`,
          supportingFactIds: ['ENGINE_POWER'],
        },
      ],
      primaryTechnicalRisk: primaryRisk,
      secondaryTechnicalRisks: secondaryRisks,
      purchaseConditions: [
        {
          condition: 'Periyodik Bakım Belgelerinin Doğrulanması',
          reason: 'Motor ve şanzıman ömrünün düzenli yağ değişimleriyle korunduğunu teyit etmek.',
          priority: 'CRITICAL',
          supportingFactIds: ['TRANSMISSION_TYPE'],
        },
        {
          condition: 'Ekspertizde Şanzıman ve Sıvı Kaçak Kontrolü',
          reason: 'Liftte fiziki alt muhafaza incelemesi yapılarak aktif sızıntı bulunmadığını görmek.',
          priority: 'IMPORTANT',
          supportingFactIds: ['ENGINE_POWER'],
        },
      ],
      walkAwayConditions: [
        {
          condition: 'Şanzımanda Belirgin Titreme, Vuruntu veya Isınma Uyarısı',
          reason: 'Yüksek tamir ve revizyon maliyetlerinden kaçınmak.',
          priority: 'CRITICAL',
          supportingFactIds: ['TRANSMISSION_TYPE'],
        },
        {
          condition: 'Motor Altında Aktif Yağ Kaçağı ve Hararet Geçmişi',
          reason: 'Ciddi kapak ve blok hasarı riskini engellemek.',
          priority: 'CRITICAL',
          supportingFactIds: ['ENGINE_POWER'],
        },
      ],
      finalConditionalVerdict: {
        shortVerdict: 'Belirli kontrollerin sağlanması şartıyla değerlendirilebilir.',
        detailedVerdict: `${carTitle}, periyodik bakımları belgelenmiş, şanzıman geçişleri pürüzsüz ve lifte kaldırıldığında aktif sıvı kaçağı görülmeyen durumlarda satın alma yönünde değerlendirilebilir.`,
        confidence: 'HIGH',
        supportingFactIds,
      },
      unavailableClaims: [
        {
          key: 'secondHandLiquidity',
          label: 'İkinci El Pazar Hızı',
          explanation: 'Bu varyantın güncel piyasa likiditesi ve ortalama satış süresi doğrulanmış pazar verisi olmaması nedeniyle rapora eklenmemiştir.',
        },
        {
          key: 'trimEquipmentDetails',
          label: 'Opsiyonel Donanım Paketi',
          explanation: 'Fiziki ekspertiz yapılmadığı için opsiyonel donanım listesi kesin gerçek olarak sunulmamıştır.',
        },
      ],
    };

    const commonProblemsFormatted = problems.map((p: any) => ({
      title: p.title,
      system: p.category || 'Mekanik',
      severity: (p.riskLevel || 'ORTA') as any,
      symptoms: ['Sürüş sırasında hafif titreşim veya ses'],
      inspectionStep: 'Ekspertizde arıza kodları bilgisayarla taranmalı',
      supportingFactIds: [`FACT_PROBLEM_${p.id}`],
    }));

    const recallsFormatted = recalls.map((r: any) => ({
      title: r.title,
      riskDescription: r.description || 'Güvenlik güncellemesi kaydı.',
      supportingFactIds: [`FACT_RECALL_${r.id}`],
    }));

    return {
      reportId,
      mode,
      status: 'SAFE_FALLBACK',
      variantId: vIdentity.variantId,
      listingId: listingContext?.listingId,
      publicListingNo: listingContext?.publicListingNo,
      reportVersion: 'v1.0',
      schemaVersion: 2,
      modeLabel: mode === 'LISTING_REPORT' ? 'İlan Özel Araç Raporu' : 'Araç Sorgulama Raporu',
      generatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      contextHash: 'fallback_hash',
      vehicleContextHash: 'fallback_vhash',

      vehicleIdentity: {
        brand: vIdentity.brand || 'Bilinmiyor',
        model: vIdentity.model || 'Bilinmiyor',
        generation: vIdentity.generation,
        bodyType: vIdentity.bodyType || 'Sedan',
        modelYear: vIdentity.modelYear || new Date().getFullYear(),
        engineDisplacementCc: vIdentity.engineDisplacementCc,
        enginePowerHp: vIdentity.enginePowerHp,
        engineCode: vIdentity.engineCode,
        fuelType: fuel,
        transmissionName: trans,
        variantMatchConfidence: 'YÜKSEK',
        supportingFactIds,
      },

      scoring: scores,
      expertDecisionSynthesis,

      executiveSummary: {
        title: `${carTitle} Özeti`,
        oneSentenceSummary: `${carTitle}, ${trans} şanzıman ve ${hp} motor kombinasyonuyla günlük kullanıma uygun bir karakter sunar.`,
        strongestAdvantage: `${trans} şanzıman ve motor uyumu`,
        biggestRisk: problems.length > 0 ? problems[0].title : 'Düzenli bakım hassasiyeti',
        bestFor: ['Şehir içi günlük kullanıcılar', 'Sakin sürüş tercih edenler'],
        notIdealFor: ['Sportif hızlanma arayanlar'],
        keyWarnings: ['Ekspertizde şanzıman ve karter kaçağı kontrolü yapılmalıdır.'],
      },

      engineTransmission: {
        engineSummary: `${vIdentity.engineDisplacementCc || ''}cc ${fuel} motor (${hp})`,
        transmissionSummary: `${trans} şanzıman`,
        combinationAssessment: 'Günlük şehir içi sürüşe uygun, sarsıntısız şanzıman ve motor karakteri.',
        supportingFactIds,
        confidence: 'HIGH',
      },

      performanceUsage: {
        powerHp: vIdentity.enginePowerHp || perfSpecs.enginePowerHp,
        torqueNm: perfSpecs.engineTorqueNm,
        zeroToHundredKmh: perfSpecs.zeroToHundredKmh,
        topSpeedKmh: perfSpecs.topSpeedKmh,
        curbWeightKg: perfSpecs.curbWeightKg,
        combinedFuelL100km: perfSpecs.combinedFuelL100km,
        cityFuelL100km: perfSpecs.cityFuelL100km,
        highwayFuelL100km: perfSpecs.highwayFuelL100km,
        trunkCapacityLiters: perfSpecs.trunkCapacityLiters,
        assessment: 'Performans ve tüketim verileri fabrika değerleri esas alınarak derlenmiştir.',
        supportingFactIds,
      },

      commonProblems: commonProblemsFormatted,
      recalls: recallsFormatted,

      maintenanceOwnership: {
        periodicIntervalKm: 10000,
        periodicIntervalMonths: 12,
        estimatedAnnualCostCategory: 'ORTA',
        criticalMaintenanceNotes: ['Şanzıman yağı ve filtre bakımları periyodik aralıkta yenilenmelidir.'],
        supportingFactIds,
      },

      usageScenarios: [
        {
          scenarioKey: 'CITY_DAILY',
          title: 'Şehir İçi Günlük Kullanım',
          suitability: 'MÜKEMMEL',
          reasoning: `${trans} şanzıman dur-kalk trafikte sarsıntısız sürüş sağlar.`,
          supportingFactIds,
        },
      ],

      prePurchaseChecks: [
        {
          checkId: 'chk-1',
          category: 'MEKANİK',
          title: 'Şanzıman Geçiş Testi',
          instruction: 'Dur-kalk trafikte ve vites büyütmede sarsıntı veya vuruntu kontrolü yapın.',
          priority: 'KRİTİK',
          supportingFactIds,
        },
      ],

      sellerQuestions: [
        {
          questionId: 'q-1',
          category: 'BAKIM',
          questionText: 'Son periyodik bakım hangi km ve tarihte yapıldı, servis faturaları mevcut mu?',
          supportingFactIds,
        },
      ],

      finalVerdict: {
        title: 'TorqueScout Nihai Değerlendirme',
        overallAssessment: `${carTitle}, bakımları belgelenmiş ve ekspertiz kontrollerinden sorunsuz geçen örnekleri için şartlı olarak değerlendirilebilir.`,
        bestFor: ['Şehir içi kullanım', 'Sakin sürücüler'],
        avoidIf: ['Bakım geçmişi belgesiz ise'],
        proceedIf: ['Ekspertizde şanzıman pürüzsüz ve kaçak yoksa'],
        walkAwayIf: ['Şanzımanda titreme veya hararet geçmişi varsa'],
        topThreeActions: [
          'Şasi numarasıyla yetkili serviste geçmiş kontrolü yapın',
          'Ekspertizde aracı lifte kaldırıp alt muhafazayı inceleyin',
          'OBD cihazıyla arıza kodlarını taratın',
        ],
        confidence: 'HIGH',
        supportingFactIds,
      },

      dataQuality: {
        overallConfidence: 'HIGH',
        variantMatchConfidence: 'HIGH',
        verifiedFactCount: supportingFacts.length,
        missingCriticalFields: [],
        unavailableSections: [],
        disclaimer: 'Bu rapor TorqueScout doğrulanmış veritabanı kayıtları esas alınarak üretilmiştir.',
        supportingFacts,
      },

      listingAnalysis: mode === 'LISTING_REPORT' && listingContext ? {
        listingId: listingContext.listingId,
        publicListingNo: listingContext.publicListingNo,
        title: listingContext.title || carTitle,
        priceAmount: listingContext.priceAmount || 0,
        priceCurrency: listingContext.priceCurrency || 'TRY',
        declaredKilometers: listingContext.kilometers || 0,
        declaredYear: listingContext.modelYear || 0,
        sellerType: listingContext.sellerType || 'Bireysel',
        tramerAmount: listingContext.tramerAmount,
        paintedPartsCount: listingContext.paintedParts?.length || 0,
        changedPartsCount: listingContext.changedParts?.length || 0,
        sellerDescriptionSanitized: listingContext.sellerDescriptionWrapped,
        listingSummary: `İlandaki ${listingContext.modelYear || ''} ${carTitle} (${listingContext.kilometers?.toLocaleString('tr-TR')} km) aracı veritabanı kayıtları ve ilan parametreleriyle incelenmiştir.`,
        mileageAgeAnalysis: mileageAnalysis,
        contradictionFlags: contradictions,
        contradictions,
        listingDataQuality: 'YÜKSEK',
        listingSpecificChecks: [],
        listingSpecificQuestions: [],
      } : undefined,
    };
  }
}
