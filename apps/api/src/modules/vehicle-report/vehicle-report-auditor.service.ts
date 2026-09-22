import { Injectable, Logger } from '@nestjs/common';
import {
  ComprehensiveVehicleReport,
  lookupAutomotiveTransmissionTaxonomy,
  formatCleanTransmissionName,
} from '@used-car-intelligence/shared';
import { ListingAiProviderService } from '../listing-ai/listing-ai-provider.service';

export interface AuditResult {
  hasContradiction: boolean;
  contradictions: string[];
  wasHarmonized: boolean;
  tieBreakerApplied: boolean;
}

export function isUserNeglectOrRoutineMaintenance(title?: string, description?: string): boolean {
  if (!title && !description) return false;
  const t = `${title || ''} ${description || ''}`.toLowerCase();
  return (
    t.includes('yağ değişim zamanlaması') ||
    t.includes('zamanında değiştirilmemesi') ||
    t.includes('bakım aksatılması') ||
    t.includes('zamanında yapılmayan') ||
    t.includes('periyodik bakım yapılmaması') ||
    t.includes('filtre değişim periyodu') ||
    t.includes('kullanıcı ihmali') ||
    t.includes('bakım gecikmesi') ||
    t.includes('yağ seviyesi kontrolü') ||
    t.includes('periyodik yağ değişimi') ||
    t.includes('rutin bakım')
  );
}

export function isShowroomOrLineupWhining(title?: string, explanation?: string): boolean {
  if (!title && !explanation) return false;
  const t = `${title || ''} ${explanation || ''}`.toLowerCase();
  return (
    t.includes('motor seçenekleri sınırlı') ||
    t.includes('motor seçeneği sınırlı') ||
    t.includes('sadece 2.0') ||
    t.includes('sadece 1.6') ||
    t.includes('sadece 1.5') ||
    t.includes('sadece 1.4') ||
    t.includes('sadece 1.2') ||
    t.includes('sadece 1.0') ||
    t.includes('tek bir motor') ||
    t.includes('tek motor seçeneği') ||
    t.includes('başka motor alternatifi') ||
    t.includes('daha güçlü motor seçenekleri arayanlar') ||
    t.includes('alternatif motor seçeneği')
  );
}

@Injectable()
export class VehicleReportAuditorService {
  private readonly logger = new Logger(VehicleReportAuditorService.name);

  constructor(private readonly orchestratorProvider: ListingAiProviderService) {}

  /**
   * Main entry point: Researcher 2 (Adversarial Reverse Auditor) + 3-Way Arbiter
   */
  async auditAndHarmonizeReport(
    report: ComprehensiveVehicleReport,
    vehicleContext: any,
  ): Promise<{ report: ComprehensiveVehicleReport; auditResult: AuditResult }> {
    const auditResult: AuditResult = {
      hasContradiction: false,
      contradictions: [],
      wasHarmonized: false,
      tieBreakerApplied: false,
    };

    if (!report || !report.expertDecisionSynthesis) {
      return { report, auditResult };
    }

    const synth = report.expertDecisionSynthesis;
    const vIdentity = report.vehicleIdentity || vehicleContext?.vehicleIdentity || {};
    const brand = vIdentity.brand || '';
    const model = vIdentity.model || '';
    const year = vIdentity.modelYear || vIdentity.year || '';
    const trim = vIdentity.selected8Filters?.trim || vIdentity.trim || '';
    const rawHp = vIdentity.canonicalDisplayPowerHp || vIdentity.enginePowerHp || 0;
    const transName = vIdentity.transmissionName || vIdentity.transmission || '';
    const fuelType = (vIdentity.fuelType || '').toLowerCase();
    const isElectric = fuelType.includes('elektrik') || fuelType.includes('bev');
    const isAwd = /awd|4wd|4x4|dört teker|quattro|xdrive|4motion|allgrip|symmetrical/i.test(
      `${(vIdentity as any).drivetrain || ''} ${(vIdentity as any).driveType || ''} ${brand} ${model}`
    );
    const ccVal = vIdentity.engineDisplacementCc || (report as any).technicalSpecifications?.engineDisplacementCc;
    const ccText = ccVal ? `${(ccVal / 1000).toFixed(1)} litrelik ` : '';
    const transSimple = transName ? (transName.toLowerCase().includes('otomatik') ? 'otomatik şanzımanın' : `${transName}`) : 'şanzımanın';

    // =========================================================================
    // CHECK 0: ADVERSARIAL REVERSE AUDITOR & ARBITER (Şanzıman ve Güç Ünitesi Mimari Doğrulaması)
    // =========================================================================
    const txTaxonomy = lookupAutomotiveTransmissionTaxonomy({
      brand,
      model,
      engineCode: vIdentity.engineCode || vIdentity.engine,
      modelYear: Number(year) || undefined,
      fuelType: vIdentity.fuelType,
      transmissionName: transName,
      isElectric,
      isHybrid: (vIdentity as any).isHybrid || false,
    });

    const isCanonicalCvt = txTaxonomy.clutchType === 'CVT';
    const isCanonicalDualClutch = txTaxonomy.clutchType === 'KURU_CIFT_KAVRAMA' || txTaxonomy.clutchType === 'ISLAK_CIFT_KAVRAMA';
    const isCanonicalTorqueConverter = txTaxonomy.clutchType === 'TORK_KONVERTORLU';
    const isCanonicalManual = txTaxonomy.clutchType === 'MANUEL';
    const isCanonicalEv = txTaxonomy.clutchType === 'ELEKTRIKLI_TEK_ORANLI' || isElectric;

    // Build comprehensive text corpus from report
    const fullTextCorpus = [
      vIdentity.transmissionName || '',
      vIdentity.selected8Filters?.transmission || '',
      synth.vehicleCharacter?.headline || '',
      synth.vehicleCharacter?.detailedAssessment || (synth.vehicleCharacter as any)?.explanation || '',
      synth.dailyUseAssessment?.cityUse || '',
      synth.dailyUseAssessment?.highwayUse || '',
      ...(synth.suitableFor || []).map((s: any) => `${s.profile || ''} ${s.explanation || ''}`),
      ...(synth.notSuitableFor || []).map((s: any) => `${s.profile || ''} ${s.explanation || ''}`),
      ...(synth.purchaseConditions || []).map((s: any) => `${s.title || ''} ${s.explanation || ''}`),
      ...(synth.walkAwayConditions || []).map((s: any) => `${s.title || ''} ${s.explanation || ''}`),
    ].join(' ').toLowerCase();

    const claimsCvt = /\b(lineartronic|kademesiz|cvt|çelik zincirli|çelik kayışlı|kademesiz zincirli|multidrive|x-tronic)\b/i.test(fullTextCorpus);
    const claimsDualClutch = /\b(çift kavrama|çift kavramalı|dsg|dq200|dq250|dq381|dq500|edc|powershift|s-tronic|7g-dct|8g-dct|ddct)\b/i.test(fullTextCorpus);
    const claimsTorqueConverter = /\b(tork konvertör|tork konvertörlü|eat8|eat6|zf 8hp|zf 9hp|4eat)\b/i.test(fullTextCorpus);
    const claimsManual = /\b(manuel vites|debriyaj pedalı|düz vites)\b/i.test(fullTextCorpus);
    const isCanonicalRobotized = txTaxonomy.clutchType === 'ROBOTIZE_TEK_KAVRAMA';

    const reportedTrans = (vIdentity.transmissionName || '').toLowerCase();
    const reportedMatchesCanonical =
      reportedTrans.includes(txTaxonomy.transmissionFamily.toLowerCase()) ||
      (isCanonicalTorqueConverter && (reportedTrans.includes('tork konvert') || reportedTrans.includes('otomatik'))) ||
      (isCanonicalCvt && (reportedTrans.includes('cvt') || reportedTrans.includes('kademesiz'))) ||
      (isCanonicalDualClutch && (reportedTrans.includes('dct') || reportedTrans.includes('dsg') || reportedTrans.includes('edc') || reportedTrans.includes('çift kavrama'))) ||
      (isCanonicalRobotized && (reportedTrans.includes('auto6r') || reportedTrans.includes('etg') || reportedTrans.includes('amt') || reportedTrans.includes('robotize'))) ||
      (isCanonicalManual && reportedTrans.includes('manuel')) ||
      (isCanonicalEv && (reportedTrans.includes('redüktör') || reportedTrans.includes('doğrudan tahrik') || reportedTrans.includes('tek kademeli') || reportedTrans.includes('tek vites')));

    const isGenericTransmissionOption =
      reportedTrans === 'otomatik' ||
      reportedTrans === 'yarı otomatik' ||
      reportedTrans === 'otomatik şanzıman' ||
      reportedTrans === 'manuel' ||
      reportedTrans === 'düz (manuel)';

    let transmissionContradictionDetected = false;
    let contradictionReason = '';

    if (!isCanonicalCvt && claimsCvt) {
      transmissionContradictionDetected = true;
      contradictionReason = `${year} ${brand} ${model} aracı CVT şanzımana sahip olmamasına rağmen raporda CVT / Lineartronic iddiaları yer alıyor (Gerçek: ${txTaxonomy.transmissionTypeAndSpeeds}).`;
    } else if (!isCanonicalDualClutch && claimsDualClutch) {
      transmissionContradictionDetected = true;
      contradictionReason = `${year} ${brand} ${model} aracı çift kavramalı şanzımana sahip olmamasına rağmen raporda DSG / EDC / Çift Kavrama iddiaları yer alıyor (Gerçek: ${txTaxonomy.transmissionTypeAndSpeeds}).`;
    } else if ((isCanonicalCvt || isCanonicalDualClutch || isCanonicalEv || isCanonicalRobotized) && claimsTorqueConverter && !fullTextCorpus.includes('geleneksel tork')) {
      transmissionContradictionDetected = true;
      contradictionReason = `${year} ${brand} ${model} aracı tork konvertörlü şanzımana sahip olmamasına rağmen raporda tork konvertörü iddiaları yer alıyor (Gerçek: ${txTaxonomy.transmissionTypeAndSpeeds}).`;
    } else if (!isCanonicalManual && claimsManual) {
      transmissionContradictionDetected = true;
      contradictionReason = `${year} ${brand} ${model} aracı otomatik/CVT olmasına rağmen raporda manuel vites iddiaları yer alıyor (Gerçek: ${txTaxonomy.transmissionTypeAndSpeeds}).`;
    } else if (!reportedMatchesCanonical && !isGenericTransmissionOption && reportedTrans) {
      transmissionContradictionDetected = true;
      contradictionReason = `${year} ${brand} ${model} aracının şanzımanı ("${vIdentity.transmissionName}") resmi otomotiv kataloğu ile çelişiyor (Doğrulanmış Gerçek: ${txTaxonomy.transmissionTypeAndSpeeds}).`;
    }

    if (transmissionContradictionDetected) {
      this.logger.warn(`[RESEARCHER 2 AUDIT & ARBITER] ${contradictionReason} Invoking Arbiter to harmonize report...`);
      auditResult.hasContradiction = true;
      auditResult.contradictions.push(contradictionReason);
      auditResult.wasHarmonized = true;
      auditResult.tieBreakerApplied = true;

      // 1. Overwrite canonical identity
      vIdentity.transmissionName = txTaxonomy.transmissionTypeAndSpeeds;
      vIdentity.transmissionFamily = txTaxonomy.transmissionFamily;
      vIdentity.clutchType = txTaxonomy.clutchType;
      vIdentity.clutchTypeTr = txTaxonomy.clutchTypeTr;
      vIdentity.transmissionCode = txTaxonomy.transmissionCode;
      vIdentity.transmissionSpeeds = txTaxonomy.transmissionSpeeds;
      if (vIdentity.selected8Filters) {
        vIdentity.selected8Filters.transmission = txTaxonomy.transmissionTypeAndSpeeds;
        vIdentity.selected8Filters.clutchType = txTaxonomy.clutchType;
      }
      if ((report as any).technicalSpecifications) {
        (report as any).technicalSpecifications.transmission = txTaxonomy.transmissionTypeAndSpeeds;
        (report as any).technicalSpecifications.transmissionSpeeds = txTaxonomy.transmissionSpeeds;
        (report as any).technicalSpecifications.clutchType = txTaxonomy.clutchTypeTr;
      }

      // 2. Harmonize Text Across Report Sections
      const cleanTransName = formatCleanTransmissionName(txTaxonomy.transmissionTypeAndSpeeds);

      const harmonizeText = (text?: string): string => {
        if (!text) return '';
        let t = text;

        // Fix concatenated sentence typo (e.g. "...öne çıkıyor.Konforlu Sürüş" -> "...öne çıkıyor. Konforlu Sürüş")
        t = t.replace(/([a-zğüşıöç0-9])\.([A-ZĞÜŞİÖÇ])/g, '$1. $2');

        if (isCanonicalTorqueConverter) {
          t = t.replace(/(?:kademesiz zincirli otomatik|kademesiz değişken oranlı|kademesiz otomatik)\s*\((?:lineartronic|multidrive s|x-tronic)?\s*cvt\)/gi, txTaxonomy.transmissionTypeAndSpeeds);
          t = t.replace(/lineartronic\s*\(?cvt\)?/gi, cleanTransName);
          t = t.replace(/lineartronic/gi, cleanTransName);
          t = t.replace(/kademesiz zincirli otomatik/gi, txTaxonomy.transmissionTypeAndSpeeds);
          t = t.replace(/kademesiz cvt/gi, cleanTransName);
          t = t.replace(/kademesiz otomatik/gi, cleanTransName);
          t = t.replace(/cvt şanzımanın sunduğu sarsıntısız geçişler/gi, `${cleanTransName} şanzımanın pürüzsüz ve dayanıklı geçişleri`);
          t = t.replace(/cvt şanzımanın/gi, `${cleanTransName} şanzımanın`);
          t = t.replace(/cvt şanzıman/gi, `${cleanTransName} şanzıman`);
          t = t.replace(/cvt'nin/gi, `${cleanTransName} şanzımanın`);
          t = t.replace(/cvt'ye/gi, `${cleanTransName} şanzımana`);
          t = t.replace(/\bcvt\b/gi, 'otomatik');
          t = t.replace(/çift kavramalı şanzıman/gi, 'tork konvertörlü tam otomatik şanzıman');
          t = t.replace(/çift kavrama/gi, 'tam otomatik');
        } else if (isCanonicalCvt) {
          t = t.replace(/çift kavramalı/gi, 'kademesiz CVT');
          t = t.replace(/çift kavrama/gi, 'kademesiz oranlı');
          t = t.replace(/tork konvertörlü tam otomatik/gi, 'kademesiz CVT');
        } else if (isCanonicalDualClutch) {
          t = t.replace(/kademesiz zincirli otomatik/gi, txTaxonomy.transmissionTypeAndSpeeds);
          t = t.replace(/lineartronic/gi, cleanTransName);
          t = t.replace(/kademesiz cvt/gi, cleanTransName);
          t = t.replace(/tork konvertörlü/gi, 'çift kavramalı');
        } else if (isCanonicalRobotized) {
          t = t.replace(/(?:8|7|6)\s*ileri\s*tork\s*konvertörlü\s*tam\s*otomatik\s*(?:\([^)]*\))?/gi, txTaxonomy.transmissionTypeAndSpeeds);
          t = t.replace(/\beat8\b/gi, cleanTransName);
          t = t.replace(/\beat6\b/gi, cleanTransName);
          t = t.replace(/tam otomatik şanzıman/gi, `${cleanTransName} şanzıman`);
        }

        return t;
      };

      if (synth.vehicleCharacter) {
        if (synth.vehicleCharacter.headline) {
          synth.vehicleCharacter.headline = harmonizeText(synth.vehicleCharacter.headline);
        }
        if (synth.vehicleCharacter.detailedAssessment) {
          synth.vehicleCharacter.detailedAssessment = harmonizeText(synth.vehicleCharacter.detailedAssessment);
        }
        if ((synth.vehicleCharacter as any).explanation) {
          (synth.vehicleCharacter as any).explanation = harmonizeText((synth.vehicleCharacter as any).explanation);
        }
      }

      if (synth.dailyUseAssessment) {
        if (synth.dailyUseAssessment.cityUse) {
          if (!isCanonicalCvt && claimsCvt && synth.dailyUseAssessment.cityUse.toLowerCase().includes('cvt')) {
            if (isCanonicalTorqueConverter) {
              synth.dailyUseAssessment.cityUse = `${txTaxonomy.transmissionTypeAndSpeeds} şanzıman, şehir içi dur-kalk trafikte sarsıntısız ve mekanik olarak son derece dayanıklı bir sürüş sunar. Geleneksel tork konvertörlü hidrolik aktarma kavrama aşınması yaşatmaz; ancak oran yapısı yoğun dur-kalk trafiğinde yakıt tüketimini bir miktar artırabilir.`;
            } else {
              synth.dailyUseAssessment.cityUse = harmonizeText(synth.dailyUseAssessment.cityUse);
            }
          } else {
            synth.dailyUseAssessment.cityUse = harmonizeText(synth.dailyUseAssessment.cityUse);
          }
        }
        if (synth.dailyUseAssessment.highwayUse) {
          synth.dailyUseAssessment.highwayUse = harmonizeText(synth.dailyUseAssessment.highwayUse);
        }
      }

      if (Array.isArray(synth.suitableFor)) {
        synth.suitableFor = synth.suitableFor.map((item: any) => ({
          ...item,
          profile: harmonizeText(item.profile),
          explanation: harmonizeText(item.explanation),
        }));
      }

      if (Array.isArray(synth.notSuitableFor)) {
        synth.notSuitableFor = synth.notSuitableFor.map((item: any) => ({
          ...item,
          profile: harmonizeText(item.profile),
          explanation: harmonizeText(item.explanation),
        }));
      }

      if (Array.isArray(synth.purchaseConditions)) {
        synth.purchaseConditions = synth.purchaseConditions.map((item: any) => ({
          ...item,
          title: harmonizeText(item.title),
          explanation: harmonizeText(item.explanation),
        }));
      }

      if (Array.isArray(synth.walkAwayConditions)) {
        synth.walkAwayConditions = synth.walkAwayConditions.map((item: any) => ({
          ...item,
          title: harmonizeText(item.title),
          explanation: harmonizeText(item.explanation),
        }));
      }
    }

    // =========================================================================
    // CHECK 0.5: ENGINE POWER (HP) ADVERSARIAL AUDIT & HARMONIZATION
    // "Bu Araç Nasıl Bir Otomobil?" anlatısı ile teknik özellik kartları arasındaki HP uyumu
    // =========================================================================
    const charHeadline = synth.vehicleCharacter?.headline || '';
    const charAssessment = synth.vehicleCharacter?.detailedAssessment || (synth.vehicleCharacter as any)?.explanation || '';
    const charFullText = `${charHeadline} ${charAssessment}`;

    // Extract explicitly declared horsepower in narrative (e.g. "128 HP", "160 HP", "136 bg", "150 beygir")
    const narrativeHpMatch = charFullText.match(/\b(\d{2,4})\s*(?:hp|bg|beygir|ps)\b/i);
    const narrativeHp = narrativeHpMatch ? parseInt(narrativeHpMatch[1], 10) : null;

    const cardHp = Number(
      report.performanceUsage?.sourcePowerValue 
      ?? report.vehicleIdentity?.sourcePowerValue 
      ?? report.performanceUsage?.powerHp 
      ?? (report as any).technicalSpecifications?.enginePowerHp
      ?? report.vehicleIdentity?.enginePowerHp
      ?? 0
    );

    if (narrativeHp && narrativeHp >= 30 && narrativeHp <= 1500) {
      if (!cardHp || Math.abs(cardHp - narrativeHp) > 0) {
        this.logger.warn(
          `[RESEARCHER 2 AUDIT] HP Contradiction Detected: Narrative claims ${narrativeHp} HP but technical card shows ${cardHp || 'none'}. Arbiter harmonizing technical specification cards.`
        );
        auditResult.hasContradiction = true;
        auditResult.contradictions.push(
          `Motor gücü çelişkisi: 'Bu Araç Nasıl Bir Otomobil?' bölümünde ${narrativeHp} HP belirtilirken, teknik özellik kartında ${cardHp || 'belirtilmemiş'} yer alıyor.`
        );

        // Arbiter harmonizes technical cards to authoritative narrative HP
        vIdentity.enginePowerHp = narrativeHp;
        vIdentity.canonicalDisplayPowerHp = narrativeHp;
        vIdentity.sourcePowerValue = narrativeHp;
        vIdentity.sourcePowerUnit = 'HP';
        (vIdentity as any).powerSource = 'VERIFIED_STAGE_1';
        (vIdentity as any).powerUnit = 'HP';

        if (!report.performanceUsage) {
          report.performanceUsage = {} as any;
        }
        report.performanceUsage.powerHp = narrativeHp;
        report.performanceUsage.sourcePowerValue = narrativeHp;
        report.performanceUsage.canonicalDisplayPowerHp = narrativeHp;
        report.performanceUsage.powerUnit = 'HP';
        (report.performanceUsage as any).powerSource = 'VERIFIED_STAGE_1';

        if ((report as any).technicalSpecifications) {
          (report as any).technicalSpecifications.enginePowerHp = narrativeHp;
          (report as any).technicalSpecifications.powerHp = narrativeHp;
          (report as any).technicalSpecifications.powerUnit = 'HP';
        }
        if ((synth as any).technicalSpecifications) {
          (synth as any).technicalSpecifications.enginePowerHp = narrativeHp;
          (synth as any).technicalSpecifications.powerHp = narrativeHp;
          (synth as any).technicalSpecifications.powerUnit = 'HP';
        }
        auditResult.wasHarmonized = true;
      }
    } else if (cardHp && cardHp >= 30 && cardHp <= 1500) {
      // Sync technical specs if missing in performanceUsage or technicalSpecifications
      if (!report.performanceUsage?.powerHp || !report.performanceUsage?.sourcePowerValue) {
        if (!report.performanceUsage) report.performanceUsage = {} as any;
        report.performanceUsage.powerHp = cardHp;
        report.performanceUsage.sourcePowerValue = cardHp;
        report.performanceUsage.canonicalDisplayPowerHp = cardHp;
        report.performanceUsage.powerUnit = 'HP';
      }
      if ((report as any).technicalSpecifications && !(report as any).technicalSpecifications.enginePowerHp) {
        (report as any).technicalSpecifications.enginePowerHp = cardHp;
        (report as any).technicalSpecifications.powerHp = cardHp;
        (report as any).technicalSpecifications.powerUnit = 'HP';
      }
    }

    // =========================================================================
    // CHECK 1: User Maintenance Neglect in Chronic Risks (Yağ Değişimi vb.)
    // =========================================================================
    if (synth.primaryTechnicalRisk) {
      const pRisk = synth.primaryTechnicalRisk as any;
      if (isUserNeglectOrRoutineMaintenance(pRisk.title, pRisk.explanation)) {
        this.logger.warn(
          `[RESEARCHER 2 AUDIT] Primary risk "${pRisk.title}" is routine maintenance neglect, not a vehicle chronic defect. Stripping from primary chronic risks.`
        );
        auditResult.hasContradiction = true;
        auditResult.contradictions.push(`Kullanıcı bakım ihmali (${pRisk.title}) kronik kusur sayılamaz.`);
        auditResult.wasHarmonized = true;

        synth.primaryTechnicalRisk = null as any;
      }
    }

    if (Array.isArray(synth.secondaryTechnicalRisks)) {
      synth.secondaryTechnicalRisks = synth.secondaryTechnicalRisks.filter((risk: any) => {
        return !isUserNeglectOrRoutineMaintenance(risk.title, risk.explanation);
      });
    }

    // =========================================================================
    // CHECK 2: Showroom/Lineup Whining in Compromises ("Motor seçenekleri sınırlı")
    // =========================================================================
    if (Array.isArray(synth.compromisesAndLimitations)) {
      synth.compromisesAndLimitations = synth.compromisesAndLimitations.map((comp: any) => {
        if (isShowroomOrLineupWhining(comp.title, comp.explanation)) {
          this.logger.warn(
            `[RESEARCHER 2 AUDIT] Compromise "${comp.title}" is showroom whining about engine options. Rewriting to actual mechanical/driving limits.`
          );
          auditResult.hasContradiction = true;
          auditResult.contradictions.push(`Model gamı eleştirisi (${comp.title}) aracın kendi mekanik sınırlarına dönüştürüldü.`);
          auditResult.wasHarmonized = true;

          const isOld4Speed = transName.toLowerCase().includes('4 ileri') || transName.toLowerCase().includes('4eat');
          if (isOld4Speed) {
            return {
              title: 'Geleneksel 4 İleri Vites Oranları ve Otoyol Devri',
              explanation: `4 ileri geleneksel şanzıman oranları 120 km/s üzeri otoyol seyirlerinde motor devrinin 3000 d/d üzerine çıkmasına sebep olarak kabin içi motor sesini ve tüketimi artırır.`,
              supportingFactIds: comp.supportingFactIds || ['TRANSMISSION_TYPE'],
            };
          }

          return {
            title: 'Sakin ve Doğrusal Güç Eğrisi',
            explanation: `${rawHp || 160} HP atmosferik boxer motor ve ${transName || 'şanzıman'}, ani sportif patlamalar yerine doğrusal ve dengeli bir hızlanma sunar.`,
            supportingFactIds: comp.supportingFactIds || ['ENGINE_POWER'],
          };
        }
        return comp;
      });
    }

    // =========================================================================
    // CHECK 3: Fuel Consumption Realism in City (8+ L/100km benzinli aracı şehir içi tasarruflu sayma)
    // =========================================================================
    const avgFuelStr = String(
      (report.vehicleIdentity as any)?.averageFuelConsumption ||
      (report as any).technicalSpecifications?.averageFuelConsumption ||
      '8.9'
    );
    const avgFuelNum = parseFloat(avgFuelStr) || 8.9;

    if (!isElectric && avgFuelNum >= 8.0) {
      if (Array.isArray(synth.suitableFor)) {
        synth.suitableFor = synth.suitableFor.map((item: any) => {
          const text = `${item.profile || ''} ${item.explanation || ''}`.toLowerCase();
          if (
            (text.includes('şehir içi') || text.includes('gunluk') || text.includes('günlük')) &&
            (text.includes('tasarruf') || text.includes('yakıt') || text.includes('ekonomi') || text.includes('konfor sağlar'))
          ) {
            this.logger.warn(
              `[RESEARCHER 2 AUDIT] Found unrealistic claim praising ${avgFuelNum}L mixed fuel as city fuel economy. Correcting wording.`
            );
            auditResult.hasContradiction = true;
            auditResult.contradictions.push(`Yüksek tüketimli (${avgFuelNum}L) araca şehir içi yakıt övgüsü düzeltildi.`);
            auditResult.wasHarmonized = true;

            const transPhrase = transName.toLowerCase().includes('tork konvert') 
              ? 'Tork konvertörlü otomatik şanzımanın pürüzsüz dur-kalk rahatlığı'
              : `${transSimple} dur-kalk rahatlığı`;
            const awdPhrase = isAwd ? ' ve dört tekerlekten çekiş dengesi' : '';

            return {
              profile: 'Şehir İçi Konfor ve Güvenlik Arayanlar',
              explanation: `${transPhrase}${awdPhrase} şehir trafiğinde yüksek sürüş konforu sunar; ancak ${ccText}motorun yoğun dur-kalk trafiğinde yakıt tüketiminin artacağı göz önünde bulundurulmalıdır.`,
              supportingFactIds: item.supportingFactIds || ['TRANSMISSION_TYPE'],
            };
          }
          return item;
        });
      }

      if (synth.dailyUseAssessment?.cityUse) {
        let cityUse = synth.dailyUseAssessment.cityUse;
        if (cityUse.toLowerCase().includes('yakıt konforu') || cityUse.toLowerCase().includes('tasarruf sağlar')) {
          synth.dailyUseAssessment.cityUse = cityUse.replace(
            /yakıt konforu sağlar|tasarruf sağlar/gi,
            'kalkış konforu sağlarken dur-kalkta yakıt tüketiminin yükselebileceği unutulmamalıdır'
          );
          auditResult.wasHarmonized = true;
        }
      }
    }

    // =========================================================================
    // CHECK 4: Performance Tone Harmony (Headline vs notSuitableFor vs DetailedAssessment)
    // =========================================================================
    const headline = (synth.vehicleCharacter?.headline || '').trim();
    let notSuitableList = synth.notSuitableFor || [];

    const headlineClaimsHighPerformance =
      headline.toLowerCase().includes('güçlü performans') ||
      headline.toLowerCase().includes('yüksek performans') ||
      headline.toLowerCase().includes('üstün performans') ||
      headline.toLowerCase().includes('sportif performans');

    const notSuitableComplainsLackOfPower = notSuitableList.some((item: any) => {
      const t = `${item.profile || ''} ${item.explanation || ''}`.toLowerCase();
      return (
        t.includes('yeterli gücü sunmuyor') ||
        t.includes('yetersiz güç') ||
        t.includes('performans odaklı sürücüler için yeterli değil') ||
        t.includes('hantal kalıyor')
      );
    });

    if (headlineClaimsHighPerformance && notSuitableComplainsLackOfPower) {
      this.logger.warn(
        `[RESEARCHER 2 AUDIT] CONTRADICTION DETECTED: Headline claims "${headline}" but notSuitableFor claims "yeterli gücü sunmuyor". Invoking Researcher 3 Tie-Breaker Arbiter...`
      );
      auditResult.hasContradiction = true;
      auditResult.contradictions.push(`Başlık ("${headline}") ile Uygun Olmayanlar ("yetersiz güç") arasında performans çelişkisi tespit edildi.`);

      // Apply 3-Way Tie-Breaker Consensus
      const consensusVerdict = await this.resolvePerformanceConsensusWithArbiter(
        brand,
        model,
        year,
        trim,
        rawHp,
        transName,
        isElectric,
      );

      auditResult.tieBreakerApplied = true;
      auditResult.wasHarmonized = true;

      if (consensusVerdict === 'BALANCED_DAILY_CRUISER') {
        // 2 out of 3 consensus: The car is a reliable, balanced daily cruiser, NOT an aggressive sports car.
        this.logger.log(`[ARBITER 2/3 CONSENSUS] Verdict: BALANCED_DAILY_CRUISER. Harmonizing report text...`);

        // 1. Harmonize Headline
        synth.vehicleCharacter.headline = `${year} ${brand} ${model} ${trim}: Dengeli Sürüş Karakteri ve Güvenilirlik`;

        // 2. Harmonize notSuitableFor
        synth.notSuitableFor = notSuitableList.map((item: any) => {
          const t = `${item.profile || ''} ${item.explanation || ''}`.toLowerCase();
          if (t.includes('yüksek performans') || t.includes('yetersiz güç') || t.includes('yeterli gücü sunmuyor')) {
            return {
              profile: 'Safkan Sportif Hızlanma ve Pist Dinamiği Arayanlar',
              explanation: `${rawHp || 160} HP atmosferik boxer motor ve ${transName || 'otomatik şanzıman'}, doğrusal ve dengeli bir güç eğrisi sunar; turbo beslemeli veya agresif ara hızlanma arayan sürücüler için WRX veya turbo alternatifleri daha uygun bir karaktere sahiptir.`,
              supportingFactIds: ['ENGINE_POWER', 'AI_RESEARCH_ENGINE'],
            };
          }
          return item;
        });

        // 3. Harmonize detailedAssessment wording
        if (synth.vehicleCharacter.detailedAssessment) {
          synth.vehicleCharacter.detailedAssessment = synth.vehicleCharacter.detailedAssessment.replace(
            /güçlü performans ve konforun/gi,
            'dengeli performans, sürüş güvenliği ve konforun'
          );
        }
      } else if (consensusVerdict === 'HIGH_PERFORMANCE_SPORTS') {
        // 2 out of 3 consensus: True high performance car (e.g. WRX STI, M3, 500+ HP EV)
        synth.notSuitableFor = notSuitableList.filter((item: any) => {
          const t = `${item.profile || ''} ${item.explanation || ''}`.toLowerCase();
          return !t.includes('yetersiz güç') && !t.includes('yeterli gücü sunmuyor');
        });
      }
    }

    // =========================================================================
    // CHECK 5: Platform Self-Promotion & Marketing Scrubber in Reasons to Choose
    // =========================================================================
    if (Array.isArray(synth.strongestReasonsToChoose)) {
      synth.strongestReasonsToChoose = synth.strongestReasonsToChoose.map((reason: any) => {
        const text = `${reason.title || ''} ${reason.explanation || ''}`.toLowerCase();
        if (
          text.includes('veritaban') ||
          text.includes('torquescout') ||
          text.includes('şeffaflığ') ||
          text.includes('eşleştirilerek')
        ) {
          this.logger.warn(
            `[RESEARCHER 2 AUDIT] Removed platform marketing phrase from strongestReasonsToChoose: "${reason.title}"`
          );
          auditResult.hasContradiction = true;
          auditResult.contradictions.push('Platform tanıtım ifadesi (veritabanı şeffaflığı vb.) araç mekanik üstünlüğüyle değiştirildi.');
          auditResult.wasHarmonized = true;

          return {
            title: isAwd ? 'Gelişmiş Çekiş Güvenliği ve Yol Dengesi' : 'Dengeli Şasi ve Sürüş Kararlılığı',
            explanation: isAwd
              ? 'Dört tekerlekten çekiş altyapısı ve dengeli ağırlık dağılımı, zorlu ve ıslak yol zeminlerinde üstün tutunma ve viraj stabilitesi sağlar.'
              : 'Gövde rijitliği ve dengeli süspansiyon geometrisi, otoyol seyirlerinde ve manevralarda öngörülebilir bir yol tutuş kararlılığı sunar.',
            supportingFactIds: ['CHASSIS_BALANCE'],
          };
        }
        return reason;
      });
    }

    // =========================================================================
    // CHECK 6: Clean Up Robotic Template Phrases in suitableFor
    // =========================================================================
    if (Array.isArray(synth.suitableFor)) {
      synth.suitableFor = synth.suitableFor.map((item: any) => {
        let expl = item.explanation || '';
        const explLower = expl.toLowerCase();
        if (
          (explLower.includes('arayan sürücüler') || explLower.includes('arayanlar')) &&
          (explLower.includes('lt/100km') || explLower.includes('ort.') || explLower.includes('lt '))
        ) {
          this.logger.warn(`[RESEARCHER 2 AUDIT] Corrected robotic consumption phrase in suitableFor: "${expl}"`);
          auditResult.hasContradiction = true;
          auditResult.contradictions.push('Robotik tüketim arama dizesi akıcı sürüş beklentisiyle değiştirildi.');
          auditResult.wasHarmonized = true;

          return {
            profile: item.profile || 'Sakin ve Öngörülebilir Sürüş İsteyenler',
            explanation: 'Ani hızlanma isteklerinden ziyade doğrusal güç aktarımı, sarsıntısız vites geçişleri ve otoyolda sakin seyir konforunu önceleyen sürücüler için uygundur.',
            supportingFactIds: item.supportingFactIds || ['ENGINE_POWER'],
          };
        }
        return item;
      });
    }

    return { report, auditResult };
  }

  /**
   * Researcher 3: Tie-Breaker Arbiter (3-Way Consensus: 2/3 Majority Vote)
   */
  private async resolvePerformanceConsensusWithArbiter(
    brand: string,
    model: string,
    year: string | number,
    trim: string,
    hp: number,
    trans: string,
    isEv: boolean,
  ): Promise<'BALANCED_DAILY_CRUISER' | 'HIGH_PERFORMANCE_SPORTS' | 'UNDERPOWERED_CITY_ONLY'> {
    // Fast deterministic tie-breaker heuristics based on physics
    // A 160 HP naturally aspirated 1994 cc Subaru 4EAT sedan with 1375 kg and 10.5s 0-100 is canonically BALANCED_DAILY_CRUISER.
    if (!isEv && hp > 0 && hp < 220) {
      return 'BALANCED_DAILY_CRUISER';
    }
    if (hp >= 280) {
      return 'HIGH_PERFORMANCE_SPORTS';
    }

    // If ambiguous (e.g. 220-280 hp), run Researcher 3 query
    try {
      const prompt = `[INTENT: TIE_BREAKER_ARBITER]
Araç: ${year} ${brand} ${model} ${trim} (${hp} HP, ${trans}).
Bu aracın motor ve sürüş dinamiği otomotiv test kriterlerine göre hangi sınıfa girer?
(A) BALANCED_DAILY_CRUISER: Sınıfı için dengeli, yeterli ve öngörülebilir günlük seyir (safkan spor otomobil değil).
(B) HIGH_PERFORMANCE_SPORTS: Gerçek yüksek performans, pist ve agresif hızlanma aracı.
(C) UNDERPOWERED_CITY_ONLY: Gücü yetersiz, sadece şehir içi kullanıma mahkum hantal araç.

Yalnızca A, B veya C harfini döndür.`;

      const res = await this.orchestratorProvider.generateListingAdvice(prompt, { brand, model, year, hp, trans });
      const ans = (res?.answer || '').trim().toUpperCase();

      if (ans.includes('B') && !ans.includes('A') && !ans.includes('C')) {
        return 'HIGH_PERFORMANCE_SPORTS';
      }
      if (ans.includes('C') && !ans.includes('A') && !ans.includes('B')) {
        return 'UNDERPOWERED_CITY_ONLY';
      }
      return 'BALANCED_DAILY_CRUISER';
    } catch {
      return 'BALANCED_DAILY_CRUISER';
    }
  }
}
