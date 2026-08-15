"use client";

import React, { useState } from "react";
import {
  CriterionKey,
  CriterionAssessment,
  MarketPriceEvidence,
  VehicleCriterionEvaluation,
  ComparisonCriterionResult,
  CRITERIA_WEIGHTS,
} from "@used-car-intelligence/shared";

interface VehicleItemInfo {
  id: string;
  name?: string;
  reportAvailable?: boolean;
  reportVersion?: string;
  reportIsStale?: boolean;
}

interface CriterionAssessmentMatrixProps {
  criterionResult?: ComparisonCriterionResult;
  generationMode?: string;
  vehicles?: VehicleItemInfo[];
}

const CRITERIA_METADATA: Record<CriterionKey, { title: string; weightStr: string; tooltip: string; icon: string }> = {
  RELIABILITY: {
    title: "Mekanik Güvenilirlik",
    weightStr: "%20 Ağırlık",
    tooltip: "Arıza yaşanma ihtimali ve doğrulanmış kronik sorun yükünü ölçer.",
    icon: "🛡️",
  },
  FAILURE_SEVERITY: {
    title: "Arıza Ciddiyeti ve Dayanıklılık",
    weightStr: "%15 Ağırlık",
    tooltip: "Arıza gerçekleşirse ortaya çıkacak teknik müdahale büyüklüğü (motor/şanzıman sökümü vb.) ve mekanik toleransı ölçer.",
    icon: "⚙️",
  },
  SEVERITY_DURABILITY: {
    title: "Arıza Ciddiyeti ve Dayanıklılık",
    weightStr: "%15 Ağırlık",
    tooltip: "Arıza gerçekleşirse ortaya çıkacak teknik müdahale büyüklüğü (motor/şanzıman sökümü vb.) ve mekanik toleransı ölçer.",
    icon: "⚙️",
  },
  FUEL_EFFICIENCY: {
    title: "Yakıt Tüketimi ve Verimlilik",
    weightStr: "%10 Ağırlık",
    tooltip: "Fabrika ve doğrulanmış gerçek kullanıcı tüketimi (WLTP/NEDC kıyaslaması).",
    icon: "⛽",
  },
  SAFETY: {
    title: "Güvenlik Seviyesi",
    weightStr: "%15 Ağırlık",
    tooltip: "Çarpışma test yılı, protokolü ve aktif sürüş destek donanımları.",
    icon: "🛟",
  },
  PERFORMANCE: {
    title: "Motor / Şanzıman Performansı",
    weightStr: "%10 Ağırlık",
    tooltip: "Motor gücü (HP), tork, şanzıman tepkisi ve ivmelenme dengesi.",
    icon: "⚡",
  },
  COMFORT: {
    title: "Konfor ve Sürüş Kalitesi",
    weightStr: "%10 Ağırlık",
    tooltip: "Süspansiyon, kabin ses yalıtımı, koltuk ergonomisi ve sürüş yumuşaklığı.",
    icon: "🛋️",
  },
  PRACTICALITY: {
    title: "Kullanışlılık ve Yaşam Alanı",
    weightStr: "%10 Ağırlık",
    tooltip: "Bagaj hacmi, kabin genişliği, saklama alanları ve kullanım pratikliği.",
    icon: "🧳",
  },
  EQUIPMENT_TECHNOLOGY: {
    title: "Donanım ve Teknoloji Seviyesi",
    weightStr: "%10 Ağırlık",
    tooltip: "Seçilen donanım paketi; konfor, multimedya, bağlantı ve günlük kullanım teknolojileri zenginliği.",
    icon: "💎",
  },
  VALUE_FOR_MONEY: {
    title: "Donanım ve Teknoloji Seviyesi",
    weightStr: "%10 Ağırlık",
    tooltip: "Seçilen donanım paketi; konfor, multimedya, bağlantı ve günlük kullanım teknolojileri zenginliği.",
    icon: "💎",
  },
};

const CRITERIA_KEYS: CriterionKey[] = [
  "RELIABILITY",
  "FAILURE_SEVERITY",
  "FUEL_EFFICIENCY",
  "SAFETY",
  "PERFORMANCE",
  "COMFORT",
  "PRACTICALITY",
  "EQUIPMENT_TECHNOLOGY",
];

function renderStars(stars: number | null) {
  if (stars === null) return null;
  const fullStars = Math.floor(stars);
  const hasHalf = stars % 1 >= 0.5;
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalf ? 1 : 0));

  return (
    <span className="text-amber-400 font-mono tracking-tight text-xs inline-flex items-center gap-0.5">
      {"★".repeat(fullStars)}
      {hasHalf ? "½" : ""}
      <span className="text-slate-600">{"☆".repeat(emptyStars)}</span>
    </span>
  );
}

function renderConfidenceBadge(confidence?: string, reportAvailable?: boolean) {
  if (reportAvailable === false) {
    return (
      <span className="bg-slate-800/80 text-slate-400 border border-slate-700/50 text-[10px] font-bold px-1.5 py-0.5 rounded">
        RAPOR BULUNAMADI
      </span>
    );
  }
  if (confidence === "HIGH") {
    return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded">YÜKSEK GÜVEN</span>;
  }
  if (confidence === "MEDIUM") {
    return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded">ORTA GÜVEN</span>;
  }
  return <span className="bg-slate-700/50 text-slate-400 border border-slate-600/30 text-[10px] font-bold px-1.5 py-0.5 rounded">DÜŞÜK GÜVEN</span>;
}

export function CriterionAssessmentMatrix({
  criterionResult,
  generationMode,
  vehicles,
}: CriterionAssessmentMatrixProps) {
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  if (!criterionResult || !criterionResult.vehicleEvaluations || criterionResult.vehicleEvaluations.length === 0) {
    return null;
  }

  const evaluations = criterionResult.vehicleEvaluations;

  const vehicleInfoMap = new Map<string, VehicleItemInfo>();
  if (vehicles && Array.isArray(vehicles)) {
    vehicles.forEach(v => {
      if (v && v.id) vehicleInfoMap.set(v.id, v);
    });
  }

  // Calculate ranks across eligible vehicles ONLY (coverageTooLow must be false, overallScore != null, coveragePct >= 60)
  const eligibleEvaluations = evaluations.filter(
    e => e.overallScore !== null && e.overallScore !== undefined && !e.coverageTooLow && (e.coveragePct ?? 0) >= 60
  );
  eligibleEvaluations.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

  const rankMap = new Map<string, number>();
  eligibleEvaluations.forEach((e, idx) => {
    rankMap.set(e.vehicleId, idx + 1);
  });

  // Calculate dynamic header disclaimer based on generationMode AND report availability
  let headerDisclaimer = "Karşılaştırma sonucu mevcut doğrulanmış verilerle gösteriliyor.";
  if (!vehicles || vehicles.length === 0 || generationMode === undefined) {
    headerDisclaimer = "Karşılaştırma sonucu mevcut doğrulanmış verilerle gösteriliyor.";
  } else {
    const hasReportFlags = vehicles.some(v => typeof v.reportAvailable === "boolean");
    if (!hasReportFlags) {
      headerDisclaimer = "Karşılaştırma sonucu mevcut doğrulanmış verilerle gösteriliyor.";
    } else {
      const anyReport = vehicles.some(v => v.reportAvailable === true);
      const allReports = vehicles.every(v => v.reportAvailable === true);

      if (!anyReport) {
        headerDisclaimer = "Seçilen araçlar için kapsamlı rapor bulunmadığından yalnız mevcut doğrulanmış teknik kayıtlar gösteriliyor.";
      } else if (!allReports) {
        headerDisclaimer = "Bazı araçlar için kapsamlı rapor bulunmadığından karşılaştırma yalnız ortak doğrulanmış veri kapsamıyla sınırlandırılmıştır.";
      } else {
        if (generationMode === "AI") {
          headerDisclaimer = "Kapsamlı araç raporlarından üretilen kanıta dayalı 8 kriter analizi.";
        } else if (generationMode === "FALLBACK") {
          headerDisclaimer = "AI çapraz analizi tamamlanamadığından raporlardaki doğrulanmış bilgiler güvenli analiz modunda gösteriliyor.";
        } else {
          headerDisclaimer = "Karşılaştırma sonucu mevcut doğrulanmış verilerle gösteriliyor.";
        }
      }
    }
  }

  const toggleExpand = (vehicleId: string, key: CriterionKey) => {
    const cellId = `${vehicleId}_${key}`;
    setExpandedCell(prev => (prev === cellId ? null : cellId));
  };

  return (
    <div className="glass p-5 md:p-8 rounded-3xl space-y-6 border border-amber-500/20 bg-slate-900/60 shadow-2xl">

      {/* Header & Tooltip Disclaimer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
              Rapor Bazlı Karşılaştırma & 8 Kriter Değerlendirmesi
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {headerDisclaimer}
          </p>
        </div>

        {/* Info Disclaimer Notice for Criteria 1 vs 2 */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 max-w-lg space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-400">
            <span>💡</span> Kriter 1 vs Kriter 2 Farkı
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            <strong>Mekanik Güvenilirlik (Kriter 1):</strong> Kronik sorun yaşanma ihtimali ve sorun yüküdür.<br />
            <strong>Arıza Ciddiyeti (Kriter 2):</strong> Arıza gerçekleşirse ortaya çıkacak teknik müdahale büyüklüğüdür (şanzıman sökümü vs multimedya donması farklı puanlanır).
          </p>
        </div>
      </div>

      {/* Top Summary Cards Grid (For 2, 5, or 10 Vehicles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {evaluations.map(ev => {
          const rank = rankMap.get(ev.vehicleId);
          const rankText = rank !== undefined ? `Seçilenler arasında ${rank}. sırada` : "Genel sıralamaya dahil edilmedi";
          const vInfo = vehicleInfoMap.get(ev.vehicleId);

          // REQUIREMENT 1: Evaluate eligibility PER VEHICLE!
          const isVehicleEligible = ev.overallScore !== null && ev.overallScore !== undefined && !ev.coverageTooLow && (ev.coveragePct ?? 0) >= 60;
          const validAssessments = Object.values(ev.assessments).filter(a => a.score !== null && !a.insufficientData);
          validAssessments.sort((a, b) => (b.score || 0) - (a.score || 0));

          const strongest = isVehicleEligible ? validAssessments[0] : undefined;
          const worst = isVehicleEligible ? validAssessments[validAssessments.length - 1] : undefined;

          return (
            <div
              key={ev.vehicleId}
              className="p-4 bg-slate-900/90 rounded-2xl border border-white/10 flex flex-col justify-between gap-3 shadow-lg hover:border-amber-500/40 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">{ev.vehicleName}</h3>
                  <div className={`text-[11px] font-bold mt-0.5 ${rank !== undefined ? "text-amber-400" : "text-slate-400 italic"}`}>
                    {rankText}
                  </div>
                </div>
                {renderConfidenceBadge(ev.assessments.RELIABILITY?.confidence, vInfo?.reportAvailable)}
              </div>

              {/* Overall Stars or Insufficient Data */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Genel Yıldız Değerlendirmesi
                </div>
                {ev.coverageTooLow || ev.overallStars === null ? (
                  <div className="text-xs font-semibold text-amber-400/90 flex items-center gap-1.5">
                    <span>⚠️</span> Genel değerlendirme için 8 kriterin tamamında doğrulanmış veri gerekiyor — {Object.values(ev.assessments).filter(a => !a.insufficientData && a.score !== null).length}/8 mevcut.
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {renderStars(ev.overallStars)}
                    <span className="text-xs font-mono font-bold text-slate-200">
                      ({ev.overallScore} / 100)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      · %{ev.coveragePct} Kapsama
                    </span>
                  </div>
                )}
              </div>

              {/* Strongest & Major Risk Highlights */}
              <div className="space-y-1.5 text-xs">
                {strongest && strongest.score !== null && (
                  <div className="text-emerald-400 flex items-center gap-1.5 truncate">
                    <span className="shrink-0">💪</span>
                    <span className="truncate">
                      <strong>En Güçlü:</strong> {CRITERIA_METADATA[strongest.criterionKey]?.title} ({strongest.score}/100)
                    </span>
                  </div>
                )}
                {worst && worst.score !== null && worst.negativeFactors && worst.negativeFactors.length > 0 && (
                  <div className="text-rose-400 flex items-center gap-1.5 truncate">
                    <span className="shrink-0">⚠️</span>
                    <span className="truncate">
                      <strong>Kritik Risk:</strong> {worst.negativeFactors[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Horizontal Scroll Matrix (Visible on MD and larger screens) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/90">
              <th className="p-4 sticky left-0 z-20 bg-slate-900 min-w-[220px] font-bold text-slate-300">
                8 Karşılaştırma Kriteri
              </th>
              {evaluations.map(ev => {
                const rank = rankMap.get(ev.vehicleId);
                const rankText = rank !== undefined ? `Seçilenler arasında ${rank}.` : "Genel sıralamaya dahil edilmedi";
                return (
                  <th key={ev.vehicleId} className="p-4 min-w-[240px] font-bold text-slate-200 border-l border-white/5">
                    <div>{ev.vehicleName}</div>
                    <div className={`text-[11px] font-mono font-semibold ${rank !== undefined ? "text-amber-400" : "text-slate-400 font-normal italic"}`}>
                      {rankText}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {CRITERIA_KEYS.map(key => {
              const meta = CRITERIA_METADATA[key];
              return (
                <React.Fragment key={key}>
                  <tr className="hover:bg-white/[0.02] transition">
                    {/* Criterion Title Column (Sticky Left) */}
                    <td className="p-4 sticky left-0 z-10 bg-slate-950 font-semibold text-slate-200 border-r border-white/10">
                      <div className="flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <div>
                          <div className="font-bold text-slate-100">{meta.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{meta.weightStr}</div>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle Score Cells */}
                    {evaluations.map(ev => {
                      const assessment = ev.assessments[key];
                      const cellId = `${ev.vehicleId}_${key}`;
                      const isExpanded = expandedCell === cellId;
                      const isInsufficient = !assessment || assessment.score === null || assessment.insufficientData;
                      const vInfo = vehicleInfoMap.get(ev.vehicleId);
                      const isReportAvail = vInfo?.reportAvailable;
                      const cellInsufficientText = isReportAvail === false
                        ? "Kapsamlı araç raporu bulunamadı"
                        : "Bu kriter için doğrulanmış kanıt bulunamadı";

                      return (
                        <td
                          key={ev.vehicleId}
                          onClick={() => toggleExpand(ev.vehicleId, key)}
                          className={`p-4 border-l border-white/5 cursor-pointer transition ${
                            isExpanded ? "bg-amber-500/10" : "hover:bg-white/5"
                          }`}
                        >
                          {isInsufficient ? (
                            <div className="text-slate-500 font-semibold text-xs italic">
                              — {cellInsufficientText}
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                {renderStars(assessment.stars)}
                                <span className="font-mono font-bold text-slate-100 text-xs">
                                  {assessment.score} / 100
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                {renderConfidenceBadge(assessment.confidence, vInfo?.reportAvailable)}
                                <span className="text-[10px] text-amber-400 underline font-semibold">
                                  {isExpanded ? "Detayı Kapat" : "Detay Gör"}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Expanded Detail Row for clicked cell */}
                  {evaluations.some(ev => expandedCell === `${ev.vehicleId}_${key}`) && (
                    <tr className="bg-slate-900/90 border-b border-amber-500/30">
                      <td colSpan={evaluations.length + 1} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {evaluations.map(ev => {
                            const assessment = ev.assessments[key];
                            if (expandedCell !== `${ev.vehicleId}_${key}`) return null;

                            return (
                              <div key={ev.vehicleId} className="p-4 bg-slate-950 rounded-xl border border-amber-500/20 space-y-3 col-span-full">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                  <h4 className="font-bold text-amber-400 text-sm">
                                    {ev.vehicleName} — {meta.title} Detay Analizi
                                  </h4>
                                  <button
                                    onClick={() => setExpandedCell(null)}
                                    className="text-xs text-slate-400 hover:text-slate-200"
                                  >
                                    ✕ Kapat
                                  </button>
                                </div>

                                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                                  {assessment?.summary || "Bu kriter için detaylı kanıt özeti bulunuyor."}
                                </p>

                                {/* Positive Factors */}
                                {assessment?.positiveFactors && assessment.positiveFactors.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-bold text-emerald-400">✓ Olumlu Faktörler:</div>
                                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                                      {assessment.positiveFactors.map((pf, i) => (
                                        <li key={i}>{pf}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Negative Factors */}
                                {assessment?.negativeFactors && assessment.negativeFactors.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-bold text-rose-400">⚠️ Riskler & Olumsuzlar:</div>
                                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                                      {assessment.negativeFactors.map((nf, i) => (
                                        <li key={i}>{nf}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Missing Inputs */}
                                {assessment?.missingInputs && assessment.missingInputs.length > 0 && (
                                  <div className="text-[11px] text-slate-400 italic">
                                    ℹ️ Eksik Veriler: {assessment.missingInputs.join(", ")}
                                  </div>
                                )}

                                {/* Criterion 8 Price Evidence Band */}
                                {key === "VALUE_FOR_MONEY" && assessment?.marketPriceEvidence && (
                                  <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 space-y-1.5 text-xs text-amber-300">
                                    <div className="font-bold flex items-center gap-1.5 text-amber-400">
                                      <span>🏷️</span> Doğrulanmış Piyasa Fiyat Bandı Verisi
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
                                      <div>
                                        <span className="text-slate-400 block">Fiyat Bandı:</span>
                                        <strong>
                                          {assessment.marketPriceEvidence.minPrice?.toLocaleString("tr-TR")} TL — {assessment.marketPriceEvidence.maxPrice?.toLocaleString("tr-TR")} TL
                                        </strong>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block">Örneklem Sayısı:</span>
                                        <strong>{assessment.marketPriceEvidence.sampleCount || 1} İlan / Snapshot</strong>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block">Veri Tarihi:</span>
                                        <strong>
                                          {assessment.marketPriceEvidence.asOfDate ? new Date(assessment.marketPriceEvidence.asOfDate).toLocaleDateString("tr-TR") : "Güncel"}
                                        </strong>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block">Eşleşme Kalitesi:</span>
                                         <strong>
                                           {assessment.marketPriceEvidence.matchQuality === "EXACT"
                                             ? "Birebir Varyant"
                                             : assessment.marketPriceEvidence.matchQuality === "COMPARABLE"
                                             ? "Karşılaştırılabilir Model"
                                             : "Genel Model Tahmini"}
                                         </strong>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Collapsible View (Visible on screens smaller than MD) */}
      <div className="block md:hidden space-y-4">
        {evaluations.map(ev => {
          const rank = rankMap.get(ev.vehicleId);
          const rankText = rank !== undefined ? `(Sıra: ${rank}.)` : "(Genel sıralamaya dahil edilmedi)";
          const vInfo = vehicleInfoMap.get(ev.vehicleId);
          return (
            <details key={ev.vehicleId} className="group glass p-4 rounded-2xl border border-white/10 space-y-3">
              <summary className="font-bold text-sm text-slate-100 flex items-center justify-between cursor-pointer list-none">
                <div>
                  <span>{ev.vehicleName}</span>
                  <span className={`ml-2 text-xs font-mono font-semibold ${rank !== undefined ? "text-amber-400" : "text-slate-400 font-normal italic"}`}>
                    {rankText}
                  </span>
                </div>
                <span className="text-xs text-amber-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>

              <div className="space-y-3 pt-3 border-t border-white/10">
                {CRITERIA_KEYS.map(key => {
                  const meta = CRITERIA_METADATA[key];
                  const assessment = ev.assessments[key];
                  const isInsufficient = !assessment || assessment.score === null || assessment.insufficientData;
                  const isReportAvail = vInfo?.reportAvailable;
                  const cellInsufficientText = isReportAvail === false
                    ? "Kapsamlı araç raporu bulunamadı"
                    : "Bu kriter için doğrulanmış kanıt bulunamadı";

                  return (
                    <div key={key} className="p-3 bg-slate-950/80 rounded-xl border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{meta.icon}</span> {meta.title}
                        </span>
                        {isInsufficient ? (
                          <span className="text-slate-500 italic text-[11px]">— {cellInsufficientText}</span>
                        ) : (
                          <span className="font-mono font-bold text-slate-100">{assessment.score} / 100</span>
                        )}
                      </div>

                      {!isInsufficient && (
                        <>
                          <div className="flex items-center justify-between">
                            {renderStars(assessment.stars)}
                            {renderConfidenceBadge(assessment.confidence, vInfo?.reportAvailable)}
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {assessment.summary}
                          </p>

                          {/* Price Evidence in Mobile View */}
                          {key === "VALUE_FOR_MONEY" && assessment.marketPriceEvidence && (
                            <div className="p-2 bg-amber-500/10 rounded-lg text-[10px] text-amber-300 font-mono mt-1">
                              <strong>Piyasa Bandı:</strong> {assessment.marketPriceEvidence.minPrice?.toLocaleString("tr-TR")} TL - {assessment.marketPriceEvidence.maxPrice?.toLocaleString("tr-TR")} TL ({assessment.marketPriceEvidence.sampleCount} örnek)
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

    </div>
  );
}
