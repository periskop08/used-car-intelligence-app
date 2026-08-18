"use client";

import React from "react";
import { VehicleComparisonResult } from "@used-car-intelligence/shared";

interface DecisionSummaryProps {
  comparisonResult: VehicleComparisonResult;
  vehicles?: Array<{ id: string; name: string; reportAvailable?: boolean }>;
}

export function DecisionSummary({ comparisonResult, vehicles }: DecisionSummaryProps) {
  if (!comparisonResult) return null;

  const evaluations = comparisonResult.criterionResult?.vehicleEvaluations || [];

  // Sort evaluations by overallScore descending
  const eligibleEvaluations = [...evaluations].filter(
    e => e.overallScore !== null && e.overallScore !== undefined && !e.coverageTooLow && (e.coveragePct ?? 0) >= 60
  );
  eligibleEvaluations.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

  const winnerEv = eligibleEvaluations[0] || evaluations[0];
  const winnerName = winnerEv?.vehicleName || comparisonResult.overallRecommendation?.vehicleName || "1. Sıra Araç";

  const narrativeText =
    comparisonResult.narrativeRecommendation ||
    comparisonResult.overallRecommendation?.reasoning ||
    comparisonResult.executiveSummary ||
    "Karşılaştırılan araçlar arasında kullanım amacına, güvenilirlik puanına ve performans değerlerine göre detaylı çapraz değerlendirme yapılmıştır.";

  // Build dynamic role badge per vehicle based on stats & brand
  const getVehicleRoleBadge = (ev: typeof evaluations[0], rankIndex: number) => {
    if (!ev || !ev.assessments) return "🚗 Dengeli Seçenek";

    const name = ev.vehicleName?.toLowerCase() || "";
    const assessments = ev.assessments;

    if (rankIndex === 0) {
      return "🏆 En Dengeli Genel Seçim (Kazanan)";
    }

    const relScore = assessments.RELIABILITY?.score ?? 0;
    const comfortScore = assessments.COMFORT?.score ?? 0;
    const fuelScore = assessments.FUEL_EFFICIENCY?.score ?? 0;
    const perfScore = assessments.PERFORMANCE?.score ?? 0;
    const pracScore = assessments.PRACTICALITY?.score ?? 0;

    const isPremium =
      name.includes("mercedes") ||
      name.includes("bmw") ||
      name.includes("audi") ||
      name.includes("volvo") ||
      name.includes("porsche");

    if (isPremium || comfortScore >= 75) {
      return "⭐ En Premium & Konforlu";
    }
    if (relScore >= 75) {
      return "🔧 En Sorunsuz & Güvenilir";
    }
    if (fuelScore >= 75) {
      return "⛽ En Ekonomik Yakıt Tüketimi";
    }
    if (perfScore >= 75) {
      return "🚀 En Yüksek Performans";
    }
    if (pracScore >= 75) {
      return "🎒 En Kullanışlı / Geniş Yaşam Alanı";
    }

    return rankIndex === 1 ? "🥈 2. Tercih Edilebilir Seçenek" : "🥉 Alternatif Seçenek";
  };

  return (
    <div className="glass p-6 md:p-8 rounded-3xl space-y-6 border border-amber-500/20 bg-slate-900/80 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl shrink-0 text-amber-400">
          🏆
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-100 flex items-center gap-2">
            Karar Özeti & Tercih Sıralaması
          </h2>
          <p className="text-xs text-slate-400">
            TorqueScout AI çapraz analizine göre 1. olan aracın kazanan nedeni ve araç bazlı tercih edilebilirlik sıralaması.
          </p>
        </div>
      </div>

      {/* Section 1: AI Kazanan Değerlendirmesi */}
      <div className="p-5 bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950 rounded-2xl border border-amber-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-slate-950 text-xs font-extrabold px-2.5 py-1 rounded-lg">
              1. Sıra Kazanan
            </span>
            <h3 className="font-extrabold text-base text-amber-300">
              {winnerName}
            </h3>
          </div>
          {winnerEv?.overallStars && (
            <div className="text-xs font-mono font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg">
              ★ {winnerEv.overallStars.toFixed(1)} / 5 Yıldız
            </div>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🤖</span> AI Kazanan Değerlendirmesi & Karşılaştırma Özeti:
          </div>
          <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium">
            {narrativeText}
          </p>
        </div>
      </div>

      {/* Section 2: 1., 2., 3... Tercih Edilebilirlik Sıralaması Cards */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>📊</span> Tercih Edilebilirlik Sıralaması & Araç Rolleri:
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eligibleEvaluations.map((ev, idx) => {
            const rankNum = idx + 1;
            const roleBadge = getVehicleRoleBadge(ev, idx);
            const stars = ev.overallStars ?? (ev.overallScore ? ev.overallScore / 20 : null);
            const verdict = comparisonResult.vehicleVerdicts?.find(v => v.vehicleId === ev.vehicleId);

            return (
              <div
                key={ev.vehicleId}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition ${
                  idx === 0
                    ? "bg-slate-950 border-amber-500/40 shadow-lg shadow-amber-500/5"
                    : "bg-slate-950/70 border-white/10 hover:border-slate-700"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      idx === 0
                        ? "bg-amber-400 text-slate-950"
                        : idx === 1
                        ? "bg-slate-300 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {rankNum}. Sıra
                    </span>
                    {stars !== null && (
                      <span className="text-xs font-mono font-bold text-amber-400">
                        ★ {stars.toFixed(1)} / 5
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-100">{ev.vehicleName}</h4>

                  <div className="inline-block bg-slate-900 border border-white/10 text-amber-300 font-bold text-xs px-2.5 py-1 rounded-lg">
                    {roleBadge}
                  </div>

                  <p className="text-xs text-slate-300 leading-normal pt-1">
                    {verdict?.characterSummary ||
                      (verdict?.gains && verdict.gains.length > 0 ? verdict.gains.join(', ') : `${ev.vehicleName} için genel tercih edilebilirlik değerlendirmesi.`)}
                  </p>
                </div>

                {verdict?.bestFor && verdict.bestFor.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">İdeal Kullanıcı / Amaç:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {verdict.bestFor.slice(0, 3).map((bf, i) => (
                        <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-white/5">
                          {bf}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
