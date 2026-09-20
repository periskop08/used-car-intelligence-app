"use client";

import {
  ComprehensiveVehicleReport,
  sanitizeTurkishDefectDescription,
  sanitizeTurkishDefectTitle,
  sanitizeTurkishInspectionInstruction,
} from "@used-car-intelligence/shared";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Search 
} from "lucide-react";

interface VehicleReportScoreHeroProps {
  report: ComprehensiveVehicleReport;
}

const getScoreColor = (value: number | null, isRisk: boolean = false) => {
  if (value === null) return "text-slate-400 border-slate-700 bg-slate-800/40";
  if (isRisk) {
    if (value > 60) return "text-rose-400 border-rose-500/40 bg-rose-500/10";
    if (value > 30) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  }
  if (value >= 75) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  if (value >= 50) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
  return "text-rose-400 border-rose-500/40 bg-rose-500/10";
};

export default function VehicleReportScoreHero({ report }: VehicleReportScoreHeroProps) {
  const decisionScore = report.torqueScoutDecisionScoreV1 || report.scoringV6?.decisionScoreV1;

  if (decisionScore) {
    const isInsufficient = decisionScore.confidenceScore < 40 || decisionScore.score === null || decisionScore.state === 'INSUFFICIENT_DATA';
    
    const getStateConfig = (state?: string) => {
      switch (state) {
        case 'EXCELLENT':
          return { label: 'Mükemmel Tercih (Düşük Risk)', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
        case 'GOOD':
          return { label: 'İyi Tercih (Dengeli)', color: 'text-teal-400 border-teal-500/40 bg-teal-500/10', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
        case 'CAUTION':
          return { label: 'Dikkatli Yaklaşım (İnceleme Gerekli)', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
        case 'HIGH_RISK':
          return { label: 'Yüksek Risk Seviyesi', color: 'text-orange-400 border-orange-500/40 bg-orange-500/10', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
        case 'AVOID':
          return { label: 'Uzak Durulmalı (Ağır Risk)', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
        default:
          return { label: 'Puanlama İçin Yeterli Doğrulanmış Veri Bulunamadı', color: 'text-slate-400 border-slate-700 bg-slate-800/40', badge: 'bg-slate-700/50 text-slate-300 border-slate-600' };
      }
    };

    const stateCfg = getStateConfig(decisionScore.state);
    const hasConditionData = decisionScore.scope === 'VEHICLE' && decisionScore.conditionRiskUsed !== null && decisionScore.conditionRiskUsed !== undefined;

    // Extract Primary Verified Risk Details for friendly display
    const primaryRisk = report.expertDecisionSynthesis?.primaryTechnicalRisk;
    const firstProblem = report.commonProblems?.[0];
    const shadowDefects = [
      ...(report.reliabilityResearchShadow?.allVerifiedDefects || []),
      ...(report.reliabilityResearchShadow?.qualitativeDefects || []),
      ...(report.reliabilityResearchShadow?.domainResults
        ? Object.values(report.reliabilityResearchShadow.domainResults).flatMap((d: any) => d.defects || [])
        : []),
    ];
    const firstDefect = shadowDefects.find((df: any) => df.normalizedFailureMode || df.title || df.affectedComponent);

    const DOMAIN_LABELS_TR: Record<string, string> = {
      POWERTRAIN_ENGINE: 'Motor Mekaniği & Zamanlama',
      POWERTRAIN_TRANS: 'Şanzıman & Aktarma Organları',
      EMISSIONS_EXHAUST: 'Emisyon & Egzoz Sistemi',
      HV_BATTERY_SYSTEM: 'Yüksek Voltaj & Batarya Sistemi',
      THERMAL_COOLING: 'Termal Yönetim & Soğutma',
      ELECTRONICS_BODY: 'Gövde Elektroniği & Donanım',
      CHASSIS_BRAKES: 'Yürüyen Aksam, Direksiyon & Fren',
      SAFETY_RECALL: 'Resmi Geri Çağırma & Güvenlik',
    };

    const FAILURE_MODE_LABELS_TR: Record<string, string> = {
      WET_BELT: 'Islak Triger Kayışı Aşınması',
      WET_TIMING_BELT: 'Islak Triger Kayışı Aşınması',
      TIMING_BELT: 'Triger Kayışı Aşınması',
      TIMING_CHAIN: 'Triger Zinciri Uzaması / Aşınması',
      COOLANT_LEAK: 'Soğutma Sıvısı Kaçağı',
      OIL_LEAK: 'Motor Yağı Kaçağı',
      OIL_FILTER_HOUSING: 'Yağ Filtre Gövdesi Kaçağı',
      MECHATRONIC: 'Mekatronik & Çift Kavrama Arızası',
      CLUTCH_WEAR: 'Kavrama Aşınması',
      BATTERY_DRAIN: '12V Akü Boşalması',
      ICCU_FAILURE: 'ICCU Entegre Şarj Kontrol Ünitesi Arızası',
      CONTROL_ARM: 'Salıncak / Süspansiyon Burcu Boşluğu',
    };

    const isRawEnumOrSlug = (val?: string): boolean => {
      if (!val) return false;
      const trimmed = val.trim();
      if (trimmed.toLowerCase() === 'wet-belt' || trimmed.toUpperCase() === 'WET_BELT') return true;
      if (/^[A-Z0-9_]{3,}$/.test(trimmed)) return true;
      if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(trimmed)) return true;
      if (trimmed === 'TECHNICAL BULLETIN' || trimmed.startsWith('RECALL_')) return true;
      return false;
    };

    const resolveFailureModeLabel = (candidate?: any): string | null => {
      if (!candidate) return null;
      const rawKey = (candidate.normalizedFailureMode || candidate.failureMode || candidate.title || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_');

      if (rawKey === 'WET_BELT' || rawKey.includes('WET_BELT') || /wet[\s_-]?belt/i.test(candidate.title || '')) {
        return 'Islak Triger Kayışı Aşınması';
      }
      if (FAILURE_MODE_LABELS_TR[rawKey]) {
        return FAILURE_MODE_LABELS_TR[rawKey];
      }
      return null;
    };

    const failureModeLabel = resolveFailureModeLabel(firstDefect)
      || resolveFailureModeLabel(primaryRisk)
      || resolveFailureModeLabel(firstProblem);

    const defectComp = firstDefect?.affectedComponent || '';
    const cleanComp = DOMAIN_LABELS_TR[defectComp.toUpperCase()] || defectComp;

    // Turkish failure mode user label prioritized above all generic titles / raw slugs / domains
    const defectFallbackTitle = failureModeLabel
      || (firstDefect?.title && !isRawEnumOrSlug(firstDefect.title) ? firstDefect.title : null)
      || (cleanComp ? `${cleanComp} İncelemesi` : null);

    const riskTitle = failureModeLabel
      || (primaryRisk?.title && !isRawEnumOrSlug(primaryRisk.title) ? primaryRisk.title : null)
      || (firstProblem?.title && !isRawEnumOrSlug(firstProblem.title) ? firstProblem.title : null)
      || defectFallbackTitle;

    const genericExplanation = firstDefect?.normalizedFailureMode === 'WET_BELT' || /wet[\s_-]?belt/i.test(firstDefect?.title || '')
      ? 'Motor yağı içinde çalışan triger kayışının zamanla ufalanarak yağ pompasını tıkaması ve motor yağlama basıncını düşürme riski.'
      : firstDefect?.description || null;

    const riskExplanation = primaryRisk?.explanation 
      || firstProblem?.symptoms?.[0] 
      || (firstDefect?.severityBasis && firstDefect.severityBasis !== 'INFERRED_FROM_VERIFIED_FAILURE_MODE' ? firstDefect.severityBasis : null)
      || genericExplanation;

    const riskInspection = primaryRisk?.inspectionInstructions?.[0] 
      || firstProblem?.inspectionStep 
      || (firstDefect?.normalizedFailureMode === 'WET_BELT' || /wet[\s_-]?belt/i.test(firstDefect?.title || '') ? 'Triger kayış genişliği ve karter/yağ pompası süzgecinde kauçuk partikülü kontrolü yapılmalıdır.' : null);

    const deductedRisks = (decisionScore as any)?.deductedRisks || [];
    
    // Calculate synchronized deduction per risk and overall total
    const computedDeductionsSum = deductedRisks.reduce((acc: number, dRisk: any) => {
      const rawCandidateTitle = resolveFailureModeLabel(dRisk) || dRisk.title || '';
      const norm = `${dRisk.domain || ''} ${dRisk.normalizedFailureMode || ''} ${rawCandidateTitle}`.toUpperCase();
      const deduction =
        typeof dRisk.netDeduction === "number" && dRisk.netDeduction > 0
          ? dRisk.netDeduction
          : typeof dRisk.deduction === "number" && dRisk.deduction > 0
          ? dRisk.deduction
          : typeof dRisk.penalty === "number" && dRisk.penalty > 0
          ? dRisk.penalty
          : dRisk.basePenalty && typeof dRisk.evidenceMultiplier === "number"
          ? Math.round(dRisk.basePenalty * dRisk.evidenceMultiplier)
          : norm.includes('CAMSHAFT') || norm.includes('KAM MİLİ')
          ? 10
          : norm.includes('CLUTCH') || norm.includes('KAVRAMA') || norm.includes('MECHATRONIC')
          ? 8
          : norm.includes('COOLANT') || norm.includes('WATER') || norm.includes('TERMOSTAT') || norm.includes('DEVIRDAIM')
          ? 5
          : 0;
      return acc + deduction;
    }, 0);

    const totalRiskPenalty = computedDeductionsSum > 0 
      ? computedDeductionsSum 
      : ((decisionScore as any)?.totalRiskPenalty ?? decisionScore.modelDecisionRisk ?? 0);
    
    const displayedScore = isInsufficient 
      ? "—" 
      : computedDeductionsSum > 0 
      ? Math.max(0, 100 - totalRiskPenalty)
      : decisionScore.score;

    const hasDeductedRisks = Boolean(totalRiskPenalty > 0 && deductedRisks.length > 0);

    const hasUnverifiedComplaints = Boolean(
      (report.commonProblems && report.commonProblems.length > 0) ||
      (report.reliabilityResearchShadow?.qualitativeDefects && report.reliabilityResearchShadow.qualitativeDefects.length > 0) ||
      ((report.scoringV6 as any)?.unverifiedComplaintCount && (report.scoringV6 as any).unverifiedComplaintCount > 0)
    );

    const getHarmonizedVerdict = () => {
      if (isInsufficient) {
        return "Bu araç hakkında çeşitli arıza ve kullanıcı bildirimleri bulunabilir; ancak bunların sıklığını ve bu araç varyantına uygulanabilirliğini güvenilir şekilde doğrulayamadığımız için yanıltıcı bir puan vermiyoruz.";
      }
      const numScore = typeof displayedScore === 'number' ? displayedScore : (decisionScore.score ?? 100);
      const rawVerdict = report.expertDecisionSynthesis?.finalConditionalVerdict?.shortVerdict;

      if (numScore >= 90 || decisionScore.state === 'EXCELLENT') {
        if (!rawVerdict || rawVerdict.includes('Belirli kontrollerin sağlanması şartıyla') || rawVerdict.includes('Belirli kontrollerin')) {
          return "Sınıfında referans kondisyonda, kontrolleri teyit edilerek doğrudan değerlendirilebilir.";
        }
      } else if (numScore >= 75 || decisionScore.state === 'GOOD') {
        if (!rawVerdict || rawVerdict.includes('Belirli kontrollerin sağlanması şartıyla')) {
          return "Dengeli kondisyonda, belirli kontrollerin sağlanması ve ekspertiz teyidi şartıyla değerlendirilebilir.";
        }
      } else if (numScore >= 60 || decisionScore.state === 'CAUTION') {
        if (!rawVerdict) {
          return "Belirli kontrollerin sağlanması ve potansiyel aşınma noktalarının incelenmesi şartıyla değerlendirilebilir.";
        }
      } else if (numScore < 60 || decisionScore.state === 'HIGH_RISK' || decisionScore.state === 'AVOID') {
        if (!rawVerdict || rawVerdict.includes('Belirli kontrollerin sağlanması')) {
          return "Yüksek riskli doğrulanmış kronik kusurlar veya ağır bakım gereksinimleri nedeniyle dikkatle yaklaşılmalıdır.";
        }
      }
      return rawVerdict || report.executiveSummary?.oneSentenceSummary || "Doğrulanmış teknik kronik riskler ve bağımsız servis bültenleri incelenerek hesaplandı.";
    };

    return (
      <div className="bg-[#090d1a] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Header Row: Score + State + Scope */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className={`px-4 py-3 rounded-2xl border flex flex-col items-center justify-center min-w-[120px] ${stateCfg.color}`}>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Alınabilirlik Skoru</span>
              <span className="text-3xl font-black mt-0.5">
                {isInsufficient ? "—" : `${displayedScore} / 100`}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${stateCfg.badge}`}>
                  {stateCfg.label}
                </span>
                <span className="text-xs text-slate-400">
                  {decisionScore.scope === 'VEHICLE' ? '🚗 İlan Özel Değerlendirme' : '📋 Model Varyant Değerlendirmesi'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 max-w-xl leading-relaxed">
                {getHarmonizedVerdict()}
              </p>
              {isInsufficient && hasUnverifiedComplaints && (
                <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Tekrarlayan kullanıcı bildirimleri tespit edildi. Satın alma öncesi bu noktaların özellikle kontrol edilmesini öneriyoruz.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Risk Breakdown Section */}
        <div className={`grid grid-cols-1 ${hasConditionData ? 'lg:grid-cols-3' : ''} gap-4`}>
          <div className={`${hasConditionData ? 'lg:col-span-2' : 'w-full'} bg-slate-950/70 border border-white/10 p-5 rounded-2xl space-y-4`}>
            {/* Deduction Section Summary Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Neden Puan Kırıldı?
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Otomotiv dünyasında geçerli kabul görmüş FMEA ve güvenilirlik mühendisliği ilkelerine dayalı formül hesaplaması yapılmıştır:
                </p>
              </div>

              {hasDeductedRisks && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold shrink-0 self-start sm:self-center shadow-sm">
                  <span className="text-sm font-black">-{totalRiskPenalty} Puan</span>
                  <span className="text-[10px] font-semibold text-rose-300/80 uppercase tracking-wide">(Teknik Kesinti)</span>
                </div>
              )}
            </div>
            
            {hasDeductedRisks ? (
              <div className="space-y-3 pt-1">
                {deductedRisks.map((dRisk: any, idx: number) => {
                  const rawCandidateTitle = resolveFailureModeLabel(dRisk) || dRisk.title || 'Doğrulanmış Teknik Kusur';
                  let dTitle = sanitizeTurkishDefectTitle(rawCandidateTitle, {
                    domain: dRisk.domain,
                    failureMode: dRisk.normalizedFailureMode,
                  });
                  // Remove any existing points badge from title if present
                  dTitle = dTitle.replace(/\s*\(-?\d+\s*Puan\)/gi, '').trim();

                  const dReason = sanitizeTurkishDefectDescription(dRisk.reason || dRisk.description, {
                    domain: dRisk.domain,
                    failureMode: dRisk.normalizedFailureMode,
                    title: dTitle,
                  });

                  const norm = `${dRisk.domain || ''} ${dRisk.normalizedFailureMode || ''} ${dTitle}`.toUpperCase();

                  let deduction =
                    typeof dRisk.netDeduction === "number" && dRisk.netDeduction > 0
                      ? dRisk.netDeduction
                      : typeof dRisk.deduction === "number" && dRisk.deduction > 0
                      ? dRisk.deduction
                      : typeof dRisk.penalty === "number" && dRisk.penalty > 0
                      ? dRisk.penalty
                      : dRisk.basePenalty && typeof dRisk.evidenceMultiplier === "number"
                      ? Math.round(dRisk.basePenalty * dRisk.evidenceMultiplier)
                      : norm.includes('CAMSHAFT') || norm.includes('KAM MİLİ')
                      ? 10
                      : norm.includes('CLUTCH') || norm.includes('KAVRAMA') || norm.includes('MECHATRONIC')
                      ? 8
                      : norm.includes('COOLANT') || norm.includes('WATER') || norm.includes('TERMOSTAT') || norm.includes('DEVIRDAIM')
                      ? 5
                      : null;

                  const cleanInspection = sanitizeTurkishInspectionInstruction(dRisk.inspectionInstruction);

                  const domainKey = (dRisk.domain || '').toUpperCase();
                  const domainLabel = DOMAIN_LABELS_TR[domainKey] || (
                    norm.includes('CAMSHAFT') || norm.includes('KAM MİLİ') ? 'Motor Mekaniği' :
                    norm.includes('CLUTCH') || norm.includes('KAVRAMA') || norm.includes('ŞANZIMAN') ? 'Şanzıman & Aktarma' :
                    norm.includes('COOLANT') || norm.includes('TERMOSTAT') || norm.includes('DEVIRDAIM') ? 'Termal & Soğutma' :
                    'Mekanik Sistem'
                  );

                  const getDomainBadgeColor = (dom: string) => {
                    if (dom.includes('ENGINE') || dom.includes('MOTOR')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                    if (dom.includes('TRANS') || dom.includes('ŞANZIMAN')) return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
                    if (dom.includes('COOLING') || dom.includes('SOĞUTMA') || dom.includes('THERMAL')) return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
                    if (dom.includes('EMISSION') || dom.includes('EGZOZ')) return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
                    if (dom.includes('CHASSIS') || dom.includes('BRAKE') || dom.includes('FREN')) return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                    return 'bg-slate-800 text-slate-300 border-slate-700';
                  };

                  return (
                    <div
                      key={dRisk.id || idx}
                      className="bg-slate-900/60 hover:bg-slate-900/80 border border-white/10 hover:border-white/15 rounded-xl p-4 space-y-2.5 transition-all shadow-sm"
                    >
                      {/* Card Header: Category Badge + Title + Deduction Pill */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border tracking-wide uppercase ${getDomainBadgeColor(domainKey || domainLabel)}`}>
                              {domainLabel}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-100 tracking-tight leading-snug">
                            {dTitle}
                          </h4>
                        </div>

                        {deduction && deduction > 0 ? (
                          <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-black tracking-tight shadow-sm">
                            <span>-{deduction}</span>
                            <span className="text-[10px] font-semibold opacity-90">Puan</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Technical Explanation */}
                      {dReason && (
                        <p className="text-xs text-slate-300 leading-relaxed break-words font-normal">
                          {dReason}
                        </p>
                      )}

                      {/* Pre-purchase Inspection Box */}
                      {cleanInspection && (
                        <div className="bg-amber-950/20 border border-amber-500/25 rounded-lg p-2.5 flex items-start gap-2.5 text-xs text-amber-200/90 shadow-inner mt-1">
                          <Search className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 flex-1">
                            <span className="font-bold text-amber-300 text-[11px] block tracking-wide uppercase">
                              Satın Almadan Önce Ekspertiz Kontrolü:
                            </span>
                            <span className="leading-relaxed text-amber-100/90 font-normal">
                              {cleanInspection}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-sm font-bold text-emerald-400 block">
                    Puan Düşüren Risk Yok
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">
                    Bu araç varyantında puan düşüren doğrulanmış teknik kronik risk tespit edilmedi.
                  </p>
                </div>
              </div>
            )}
          </div>

          {hasConditionData && (
            <div className="bg-slate-950/70 border border-white/10 p-5 rounded-2xl space-y-3 self-start">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Araç Kondisyon Etkisi
              </span>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
                <span className="text-sm font-black">-{decisionScore.conditionRiskUsed} Puan</span>
                <span className="text-[10px] font-semibold text-rose-300/80 uppercase tracking-wide">Kondisyon</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
                {decisionScore.explanation?.condition || 'Kilometre ve hasar kaydı verilerine dayalı kondisyon kesintisi.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // V5 FALLBACK: 2 Score Indicator Grid (Buyability & Technical Risk)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-lg ${getScoreColor(report.scoring?.buyabilityScore?.value ?? null)}`}>
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
          <span>Satın Alınabilirlik Skoru</span>
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-3xl font-black my-2">
          {report.scoring?.buyabilityScore?.value !== null && report.scoring?.buyabilityScore?.value !== undefined 
            ? `${report.scoring.buyabilityScore.value} / 100` 
            : "Veri Yetersiz"}
        </div>
        <span className="text-xs opacity-80 font-medium">Genel Değerlendirme & Satın Alma Uygunluğu</span>
      </div>

      <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-lg ${getScoreColor(report.scoring?.technicalRiskScore?.value ?? null, true)}`}>
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
          <span>Teknik Risk Skoru</span>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="text-3xl font-black my-2">
          {report.scoring?.technicalRiskScore?.value !== null && report.scoring?.technicalRiskScore?.value !== undefined 
            ? `${report.scoring.technicalRiskScore.value} / 100` 
            : "Veri Yetersiz"}
        </div>
        <span className="text-xs font-semibold opacity-90">
          {report.scoring?.technicalRiskScore?.value !== null && (report.scoring?.technicalRiskScore?.value ?? 0) > 60 
            ? "⚠️ Yüksek Risk Seviyesi" 
            : "Dengeli Risk Seviyesi"}
        </span>
      </div>
    </div>
  );
}
