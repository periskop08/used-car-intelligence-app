"use client";

import React from "react";
import { ExpertDecisionSynthesis, ReportSupportingFact } from "@used-car-intelligence/shared";
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  FileCheck, 
  XCircle, 
  HelpCircle, 
  Info, 
  ChevronRight,
  ShieldCheck
} from "lucide-react";

const cleanRangeText = (text?: string): string => {
  if (!text) return "";
  return text
    .replace(/(\d+\s*litrelik\s+yakıt\s+deposu)yla\s+tam\s+depoda\s+yaklaşık\s+\d+\s*km\s*menzil\s+sunar/gi, "$1 kapasitesine sahiptir")
    .replace(/(\d+\s*litrelik\s+yakıt\s+deposu)\s+ve\s+yaklaşık\s+\d+\s*km\s*menzil,\s*sık\s+mola\s+ihtiyacını\s+azaltır/gi, "$1 kapasitesi sunar")
    .replace(/tam\s+depoda\s+yaklaşık\s+\d+\s*km\s*menzil\s+sunar/gi, "")
    .replace(/ve\s+tam\s+depoda\s+yaklaşık\s+\d+\s*km\s*menzil/gi, "")
    .replace(/tam\s+depoda\s+yaklaşık\s+\d+\s*km\s*menzil/gi, "")
    .replace(/ve\s+yaklaşık\s+\d+\s*km\s*menzil/gi, "")
    .replace(/yaklaşık\s+\d+\s*km\s*menzil/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.\./g, ".")
    .trim();
};

interface VehicleReportExpertSynthesisProps {
  synthesis: ExpertDecisionSynthesis;
  supportingFacts?: ReportSupportingFact[];
}

export default function VehicleReportExpertSynthesis({
  synthesis,
  supportingFacts = [],
}: VehicleReportExpertSynthesisProps) {
  if (!synthesis) return null;

  const factMap = new Map<string, ReportSupportingFact>();
  supportingFacts.forEach((f) => factMap.set(f.factKey, f));

  const renderSourceBadge = (factIds?: string[]) => {
    if (!factIds || factIds.length === 0) return null;
    const firstFact = factMap.get(factIds[0]);
    let label = "Kaynak: Doğrulanmış Teknik Veri";
    let colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";

    if (firstFact) {
      if (firstFact.source === "SELLER_DECLARATION") {
        label = "Kaynak: Satıcı Beyanı — Doğrulanmamış";
        colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
      } else if (firstFact.source === "VEHICLE_DATABASE" || firstFact.source === "EVIDENCE_VERIFIED") {
        label = "Kaynak: Onaylı Veritabanı Kaydı";
        colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      }
    }

    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${colorClass} inline-flex items-center gap-1 shrink-0`}>
        <Info className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* SECTION HEADER */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-slate-900 border border-orange-500/30 shadow-xl">
        <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-xl shadow-md">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">TorqueScout Uzman Karar Sentezi</h2>
          <p className="text-xs text-slate-300">
            Doğrulanmış veriler ve araç karakterinin kullanıcı açısından derin otomotiv analizi.
          </p>
        </div>
      </div>

      {/* 1. BU ARAÇ NASIL BİR OTOMOBİL? (Vehicle Character) */}
      {synthesis.vehicleCharacter && (
        <div className="bg-[#090d1a] border border-white/10 p-6 rounded-2xl space-y-3 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 block" />
              <span>Bu Araç Nasıl Bir Otomobil?</span>
            </h3>
            {renderSourceBadge(synthesis.vehicleCharacter.supportingFactIds)}
          </div>

          <h4 className="text-base font-bold text-orange-400">{synthesis.vehicleCharacter.headline}</h4>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {cleanRangeText(synthesis.vehicleCharacter.detailedAssessment)}
          </p>

          {/* Daily Use Assessment Details */}
          {synthesis.dailyUseAssessment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-white/5 text-xs">
              {synthesis.dailyUseAssessment.cityUse && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                  <span className="font-bold text-slate-400 block mb-0.5">Şehir İçi Kullanım</span>
                  <span className="text-slate-300">{cleanRangeText(synthesis.dailyUseAssessment.cityUse)}</span>
                </div>
              )}
              {synthesis.dailyUseAssessment.highwayUse && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                  <span className="font-bold text-slate-400 block mb-0.5">Otoyol ve Seyir</span>
                  <span className="text-slate-300">{cleanRangeText(synthesis.dailyUseAssessment.highwayUse)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. GÜÇLÜ YÖNLER & TAVİZLER (Grid 2 Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Güçlü Yönler */}
        <div className="bg-[#090d1a] border border-emerald-500/20 p-5 sm:p-6 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-500/20 pb-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Tercih Etmek İçin Güçlü Nedenler</span>
          </h3>

          <div className="space-y-3">
            {synthesis.strongestReasonsToChoose?.map((item, idx) => (
              <div key={idx} className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-emerald-300">{item.title}</h4>
                  {renderSourceBadge(item.supportingFactIds)}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tavizler ve Sınırlamalar */}
        <div className="bg-[#090d1a] border border-amber-500/20 p-5 sm:p-6 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-amber-500/20 pb-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Satın Almadan Önce Bilinecek Tavizler</span>
          </h3>

          <div className="space-y-3">
            {synthesis.compromisesAndLimitations?.map((item, idx) => (
              <div key={idx} className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-amber-300">{item.title}</h4>
                  {renderSourceBadge(item.supportingFactIds)}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. KİMLER İÇİN UYGUN / UYGUN DEĞİL? */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uygun Olduğu Profiller */}
        <div className="bg-[#090d1a] border border-blue-500/20 p-5 sm:p-6 rounded-2xl space-y-3 shadow-xl">
          <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center gap-2 border-b border-blue-500/20 pb-3">
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Kimler İçin Mantıklı?</span>
          </h3>

          <div className="space-y-2.5">
            {synthesis.suitableFor?.map((prof, idx) => (
              <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{prof.profile}</span>
                  {renderSourceBadge(prof.supportingFactIds)}
                </div>
                <p className="text-xs text-slate-400">{prof.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Uygun Olmayabileceği Profiller */}
        <div className="bg-[#090d1a] border border-rose-500/20 p-5 sm:p-6 rounded-2xl space-y-3 shadow-xl">
          <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center gap-2 border-b border-rose-500/20 pb-3">
            <UserX className="w-4 h-4 shrink-0" />
            <span>Kimler İçin Uygun Olmayabilir?</span>
          </h3>

          <div className="space-y-2.5">
            {synthesis.notSuitableFor?.map((prof, idx) => (
              <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{prof.profile}</span>
                  {renderSourceBadge(prof.supportingFactIds)}
                </div>
                <p className="text-xs text-slate-400">{prof.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. TEKNİK RİSK ANALİZİ (Öncelikli Risk + İkincil Riskler) */}
      {(synthesis.primaryTechnicalRisk || (synthesis.secondaryTechnicalRisks && synthesis.secondaryTechnicalRisks.length > 0)) && (
        <div className="bg-[#090d1a] border border-rose-500/30 p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Teknik Risk Analizi ve Kontrol Rehberi</span>
            </h3>
          </div>

          {/* Primary Risk */}
          {synthesis.primaryTechnicalRisk && (
            <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/20 pb-2">
                <div>
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block">Öncelikli Teknik Risk</span>
                  <h4 className="text-sm font-extrabold text-white">{synthesis.primaryTechnicalRisk.title}</h4>
                </div>
                {renderSourceBadge(synthesis.primaryTechnicalRisk.supportingFactIds)}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{synthesis.primaryTechnicalRisk.explanation}</p>

              {synthesis.primaryTechnicalRisk.riskMeaning && (
                <div className="p-2.5 bg-slate-950/80 rounded-lg text-xs text-amber-300 font-medium border border-amber-500/20">
                  💡 {synthesis.primaryTechnicalRisk.riskMeaning}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                {synthesis.primaryTechnicalRisk.symptoms?.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-rose-300 block">⚠️ Belirtileri ve Semptomları:</span>
                    <ul className="list-disc ml-4 text-slate-300 space-y-0.5">
                      {synthesis.primaryTechnicalRisk.symptoms.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {synthesis.primaryTechnicalRisk.inspectionInstructions?.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-300 block">🔍 Ekspertiz Kontrol Adımları:</span>
                    <ul className="list-disc ml-4 text-slate-300 space-y-0.5">
                      {synthesis.primaryTechnicalRisk.inspectionInstructions.map((inst, idx) => (
                        <li key={idx}>{inst}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Secondary Risks */}
          {synthesis.secondaryTechnicalRisks && synthesis.secondaryTechnicalRisks.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Diğer Dikkat Edilmesi Gereken Riskler</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {synthesis.secondaryTechnicalRisks.map((sec, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-1">
                    <span className="text-xs font-bold text-slate-200 block">{sec.title}</span>
                    <p className="text-xs text-slate-400">{sec.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. SATIN ALMA VE VAZGEÇME ŞARTLARI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Satın Alma Şartları */}
        <div className="bg-[#090d1a] border border-emerald-500/30 p-5 sm:p-6 rounded-2xl space-y-3 shadow-xl">
          <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-500/20 pb-3">
            <FileCheck className="w-4 h-4 shrink-0" />
            <span>Hangi Şartlarda Değerlendirilebilir?</span>
          </h3>

          <div className="space-y-2.5">
            {synthesis.purchaseConditions?.map((cond, idx) => (
              <div key={idx} className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                    {cond.condition}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    {cond.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-300 ml-5">{cond.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vazgeçme Şartları */}
        <div className="bg-[#090d1a] border border-rose-500/30 p-5 sm:p-6 rounded-2xl space-y-3 shadow-xl">
          <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center gap-2 border-b border-rose-500/20 pb-3">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>Hangi Durumda Satın Almaktan Vazgeçilmeli?</span>
          </h3>

          <div className="space-y-2.5">
            {synthesis.walkAwayConditions?.map((cond, idx) => (
              <div key={idx} className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                    {cond.condition}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                    {cond.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-300 ml-5">{cond.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
