"use client";

import React from "react";
import { 
  ExpertDecisionSynthesis, 
  ReportSupportingFact, 
  safeString,
  formatVehicleAssessmentParagraphs,
  replacePsWithHp
} from "@used-car-intelligence/shared";
import { 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  FileCheck, 
  XCircle, 
  HelpCircle, 
  ChevronRight,
  ShieldCheck,
  Layers,
  History,
  Truck,
  Wrench,
  GitCompare
} from "lucide-react";

const cleanRangeText = (text?: string): string => {
  if (!text) return "";
  return replacePsWithHp(text)
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
  vehicleType?: string;
}

const toArray = <T,>(val: T[] | T | null | undefined): T[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    const trimmed = (val as string).trim();
    return trimmed ? [trimmed as unknown as T] : [];
  }
  return [val];
};

export default function VehicleReportExpertSynthesis({
  synthesis,
  vehicleType,
}: VehicleReportExpertSynthesisProps) {
  if (!synthesis) return null;

  const normalizedType = (vehicleType || '').toUpperCase();
  const characterHeading = normalizedType === 'MOTORCYCLE'
    ? 'Bu Araç Nasıl Bir Motosiklet?'
    : (normalizedType === 'SUV_PICKUP' || normalizedType === 'SUV'
      ? 'Bu Araç Nasıl Bir Arazi Aracı / SUV?'
      : (normalizedType === 'MINIVAN_PANELVAN' || normalizedType === 'COMMERCIAL'
        ? 'Bu Araç Nasıl Bir Ticari Araç?'
        : 'Bu Araç Nasıl Bir Otomobil?'));

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* 1. BU ARAÇ NASIL BİR OTOMOBİL / MOTOSİKLET / TİCARİ ARAÇ? (Vehicle Character) */}
      {synthesis.vehicleCharacter && (
        <div className="bg-[#090d1a] border border-white/10 p-6 rounded-2xl space-y-3 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 block" />
              <span>{characterHeading}</span>
            </h3>
          </div>

          <h4 className="text-base font-bold text-orange-400">{replacePsWithHp(synthesis.vehicleCharacter.headline)}</h4>
          <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            {formatVehicleAssessmentParagraphs(synthesis.vehicleCharacter.detailedAssessment).map((para, idx) => (
              <p key={idx} className="leading-relaxed">
                {cleanRangeText(para)}
              </p>
            ))}
          </div>

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

      {/* MOTORCYCLE: ÜRETİM DÖNEMLERİ & DÖNEM ANALİZİ */}
      {synthesis.motorcycleEraAnalysis && (
        <div className="bg-[#090d1a] border border-cyan-500/20 p-6 rounded-2xl space-y-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>Model Geçmişi ve Üretim Dönemleri Haritası</span>
            </h3>
          </div>

          {synthesis.motorcycleEraAnalysis.modelHistory && (
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {cleanRangeText(synthesis.motorcycleEraAnalysis.modelHistory)}
            </p>
          )}

          {/* Era Table */}
          {synthesis.motorcycleEraAnalysis.productionEras && synthesis.motorcycleEraAnalysis.productionEras.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/70">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-3">Dönem</th>
                    <th className="py-2.5 px-3">Yıllar</th>
                    <th className="py-2.5 px-3">Yakıt / Besleme</th>
                    <th className="py-2.5 px-3">Hacim / Güç</th>
                    <th className="py-2.5 px-3">Fren / ABS</th>
                    <th className="py-2.5 px-3">Önemli Revizyonlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {synthesis.motorcycleEraAnalysis.productionEras.map((era, idx) => {
                    const eraTitle = era.eraName || `${era.startYear} – ${era.endYear || 'Günümüz'} Dönemi`;
                    const validKeyChanges = Array.isArray(era.keyChanges)
                      ? era.keyChanges.filter((k: any) => typeof k === 'string' && k.trim().length > 0)
                      : [];
                    const keyChangesText = validKeyChanges.length > 0
                      ? validKeyChanges.join(', ')
                      : (typeof (era.keyChanges as any) === 'string' && (era.keyChanges as any).trim()
                        ? String(era.keyChanges)
                        : (era.fuelSystem === 'EFI' ? 'Elektronik yakıt enjeksiyonu ve dönemsel fabrika revizyonları' : 'Karbüratörlü yakıt sistemi ve dönemsel fabrika donanımı'));
                    return (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-cyan-300">{eraTitle}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{era.startYear} – {era.endYear || 'Günümüz'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            era.fuelSystem === 'EFI' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {era.fuelSystem || 'Standart'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-white">
                          {era.displacementCc ? `${era.displacementCc} cc` : '—'} • {era.powerRange || (era.powerHp ? `${era.powerHp} HP` : '—')}
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {era.hasAbs ? <span className="text-emerald-400 font-semibold">ABS Mevcut</span> : <span className="text-slate-400">{era.brakingSystem || 'Standart'}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">
                          {keyChangesText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Hangi Dönem Daha Mantıklı? */}
          {synthesis.motorcycleEraAnalysis.recommendedEraComparison && (
            <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
                Hangi Dönem Daha Mantıklı?
              </span>
              <p className="text-xs text-slate-300 leading-relaxed pl-5">
                {cleanRangeText(synthesis.motorcycleEraAnalysis.recommendedEraComparison)}
              </p>
            </div>
          )}

          {/* Tüm Dönemler İçin Ortak Kronik Sorunlar & Zayıf Noktalar */}
          {Array.isArray(synthesis.motorcycleEraAnalysis.allEraCommonIssues) && synthesis.motorcycleEraAnalysis.allEraCommonIssues.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Motosiklet Geneli Ortak Kronik Noktalar & Fırsat/Riskler
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {synthesis.motorcycleEraAnalysis.allEraCommonIssues.map((issue: any, idx: number) => {
                  const issueDesc = issue.issueDescription || issue.symptoms || issue.risk || '';
                  const checkAdvice = issue.checkAdvice || issue.checkNote || '';
                  const severity = issue.severity || issue.risk;
                  return (
                    <div key={idx} className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-300">{issue.title}</span>
                        {severity && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            severity === 'HIGH' || severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {severity}
                          </span>
                        )}
                      </div>
                      {issueDesc && <p className="text-slate-300 leading-relaxed">{cleanRangeText(issueDesc)}</p>}
                      {checkAdvice && (
                        <p className="text-emerald-400 text-[11px] pt-1 border-t border-amber-500/10">
                          🔍 <strong>Ekspertiz & Kontrol:</strong> {cleanRangeText(checkAdvice)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Döneme Özgü Özel Riskler & Ayrışmalar */}
          {Array.isArray(synthesis.motorcycleEraAnalysis.eraSpecificIssues) && synthesis.motorcycleEraAnalysis.eraSpecificIssues.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                Döneme Özgü Mekanik ve Elektronik Ayrışmalar
              </h4>
              <div className="space-y-3">
                {synthesis.motorcycleEraAnalysis.eraSpecificIssues.map((eraBlock: any, idx: number) => {
                  const subIssues = Array.isArray(eraBlock.issues) && eraBlock.issues.length > 0
                    ? eraBlock.issues
                    : eraBlock.title
                    ? [{ title: eraBlock.title, description: eraBlock.description || eraBlock.symptoms || eraBlock.risk, checkAdvice: eraBlock.checkAdvice || eraBlock.checkNote }]
                    : [];

                  return (
                    <div key={idx} className="p-3.5 bg-slate-950/60 border border-cyan-500/20 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-2">
                        <span className="font-bold text-cyan-300">{eraBlock.eraName}</span>
                        {eraBlock.years && <span className="text-[11px] text-slate-400">({eraBlock.years})</span>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {subIssues.map((iss: any, iIdx: number) => (
                          <div key={iIdx} className="p-2.5 bg-white/[0.02] border border-white/5 rounded-lg space-y-1">
                            <span className="font-semibold text-slate-200 block">{iss.title}</span>
                            {iss.description && (
                              <p className="text-slate-400 text-[11px] leading-relaxed">{cleanRangeText(iss.description)}</p>
                            )}
                            {iss.checkAdvice && (
                              <p className="text-emerald-400 text-[10px]">✔ {cleanRangeText(iss.checkAdvice)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MINIVAN / PANELVAN: TİCARİ UYGULAMA, ŞANZIMAN & YIPRANMA ANALİZİ */}
      {synthesis.commercialApplicationAnalysis && (
        <div className="bg-[#090d1a] border border-blue-500/20 p-6 rounded-2xl space-y-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 shrink-0 text-blue-400" />
              <span>Ticari Uygulama & Konfigürasyon Analizi</span>
            </h3>
            {synthesis.commercialApplicationAnalysis.configurationContext?.commercialMeaning && (
              <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-[11px] font-bold text-blue-300">
                {synthesis.commercialApplicationAnalysis.configurationContext.commercialMeaning}
              </span>
            )}
          </div>

          {synthesis.commercialApplicationAnalysis.applicationSummary && (
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {cleanRangeText(synthesis.commercialApplicationAnalysis.applicationSummary)}
            </p>
          )}

          {/* Şanzıman Karşılaştırması: Manuel vs Otomatik */}
          {(synthesis.commercialApplicationAnalysis.manualTransmissionAnalysis || 
            synthesis.commercialApplicationAnalysis.automaticTransmissionAnalysis ||
            synthesis.commercialApplicationAnalysis.transmissionComparison) && (
            <div className="p-4 bg-slate-950/70 border border-white/10 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-blue-400" />
                Şanzıman Analizi: Manuel mi Otomatik mi?
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {synthesis.commercialApplicationAnalysis.manualTransmissionAnalysis && (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-1">
                    <span className="font-bold text-emerald-400 block">Manuel Şanzıman Uygulaması</span>
                    <p className="text-slate-300">{cleanRangeText(synthesis.commercialApplicationAnalysis.manualTransmissionAnalysis)}</p>
                  </div>
                )}
                {synthesis.commercialApplicationAnalysis.automaticTransmissionAnalysis && (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-1">
                    <span className="font-bold text-amber-400 block">Otomatik Şanzıman Uygulaması</span>
                    <p className="text-slate-300">{cleanRangeText(synthesis.commercialApplicationAnalysis.automaticTransmissionAnalysis)}</p>
                  </div>
                )}
              </div>
              {synthesis.commercialApplicationAnalysis.transmissionComparison && (
                <div className="pt-2 border-t border-white/5 text-xs text-slate-300">
                  <span className="font-semibold text-blue-300">Uzman Değerlendirmesi: </span>
                  {cleanRangeText(synthesis.commercialApplicationAnalysis.transmissionComparison)}
                </div>
              )}
            </div>
          )}

          {/* Ticari Kullanım Kaynaklı Yıpranma Riskleri */}
          {synthesis.commercialApplicationAnalysis.commercialDutyRisks && synthesis.commercialApplicationAnalysis.commercialDutyRisks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Ticari Kullanım Kaynaklı Riskler & Kontrol Noktaları
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {synthesis.commercialApplicationAnalysis.commercialDutyRisks.map((risk, idx) => (
                  <div key={idx} className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-1.5 text-xs">
                    <span className="font-bold text-amber-300 block">{risk.title}</span>
                    <p className="text-slate-300 leading-relaxed">{cleanRangeText(risk.risk)}</p>
                    {risk.checkRecommendation && (
                      <span className="text-[11px] text-amber-200/80 block pt-1 border-t border-amber-500/10">
                        🔍 Kontrol: {cleanRangeText(risk.checkRecommendation)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
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
            {toArray(synthesis.strongestReasonsToChoose).map((item, idx) => (
              <div 
                key={idx} 
                className="p-4 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl space-y-2 transition-all shadow-sm"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0 shadow-sm" />
                  <h4 className="text-sm font-bold text-emerald-300 leading-snug tracking-tight">
                    {replacePsWithHp(item.title)}
                  </h4>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed pl-4">
                  {cleanRangeText(item.explanation)}
                </p>
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
            {toArray(synthesis.compromisesAndLimitations).map((item, idx) => (
              <div 
                key={idx} 
                className="p-4 bg-amber-950/20 hover:bg-amber-950/30 border border-amber-500/20 hover:border-amber-500/40 rounded-xl space-y-2 transition-all shadow-sm"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0 shadow-sm" />
                  <h4 className="text-sm font-bold text-amber-300 leading-snug tracking-tight">
                    {replacePsWithHp(item.title)}
                  </h4>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed pl-4">
                  {cleanRangeText(item.explanation)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. KİMLER İÇİN UYGUN / UYGUN DEĞİL? */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uygun Olduğu Profiller */}
        <div className="bg-[#090d1a] border border-blue-500/20 p-5 sm:p-6 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider flex items-center gap-2 border-b border-blue-500/20 pb-3">
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Kimler İçin Mantıklı?</span>
          </h3>

          <div className="space-y-3">
            {toArray(synthesis.suitableFor).map((prof, idx) => (
              <div 
                key={idx} 
                className="p-4 bg-blue-950/15 hover:bg-blue-950/25 border border-blue-500/20 hover:border-blue-500/40 rounded-xl space-y-1.5 transition-all shadow-sm"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0 shadow-sm" />
                  <span className="text-sm font-bold text-blue-200 leading-snug">
                    {replacePsWithHp(prof.profile)}
                  </span>
                </div>
                {prof.explanation && (
                  <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed pl-4">
                    {cleanRangeText(prof.explanation)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Uygun Olmayabileceği Profiller */}
        <div className="bg-[#090d1a] border border-rose-500/20 p-5 sm:p-6 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center gap-2 border-b border-rose-500/20 pb-3">
            <UserX className="w-4 h-4 shrink-0" />
            <span>Kimler İçin Uygun Olmayabilir?</span>
          </h3>

          <div className="space-y-3">
            {toArray(synthesis.notSuitableFor).map((prof, idx) => (
              <div 
                key={idx} 
                className="p-4 bg-rose-950/15 hover:bg-rose-950/25 border border-rose-500/20 hover:border-rose-500/40 rounded-xl space-y-1.5 transition-all shadow-sm"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0 shadow-sm" />
                  <span className="text-sm font-bold text-rose-200 leading-snug">
                    {replacePsWithHp(prof.profile)}
                  </span>
                </div>
                {prof.explanation && (
                  <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed pl-4">
                    {cleanRangeText(prof.explanation)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. TEKNİK RİSK ANALİZİ (Öncelikli Risk + İkincil Riskler) */}
      {(synthesis.primaryTechnicalRisk || (toArray(synthesis.secondaryTechnicalRisks).length > 0)) && (
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
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{synthesis.primaryTechnicalRisk.explanation}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                {toArray(synthesis.primaryTechnicalRisk.symptoms).length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-rose-300 block">⚠️ Belirtileri ve Semptomları:</span>
                    <ul className="list-disc ml-4 text-slate-300 space-y-0.5">
                      {toArray(synthesis.primaryTechnicalRisk.symptoms).map((s, idx) => (
                        <li key={idx}>{safeString(s)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {toArray(synthesis.primaryTechnicalRisk.inspectionInstructions).length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-300 block">🔍 Ekspertiz Kontrol Adımları:</span>
                    <ul className="list-disc ml-4 text-slate-300 space-y-0.5">
                      {toArray(synthesis.primaryTechnicalRisk.inspectionInstructions).map((inst, idx) => (
                        <li key={idx}>{safeString(inst)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Secondary Risks */}
          {toArray(synthesis.secondaryTechnicalRisks).length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Diğer Dikkat Edilmesi Gereken Riskler</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {toArray(synthesis.secondaryTechnicalRisks).map((sec, idx) => (
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
            {toArray(synthesis.purchaseConditions).map((cond, idx) => (
              <div key={idx} className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                    {replacePsWithHp(cond.condition)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 ml-5">{cleanRangeText(cond.reason)}</p>
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
            {toArray(synthesis.walkAwayConditions).map((cond, idx) => (
              <div key={idx} className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                    {replacePsWithHp(cond.condition)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 ml-5">{cleanRangeText(cond.reason)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
