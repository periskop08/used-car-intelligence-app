"use client";

import React from "react";
import { VehicleComparisonResult } from "@used-car-intelligence/shared";

interface DecisionSummaryProps {
  comparisonResult: VehicleComparisonResult;
  vehicles?: Array<{ id: string; name: string; reportAvailable?: boolean }>;
}

export function getDifferentiatedStarsForRank(rankIndex: number): number {
  const scale = [4.5, 4.2, 4.0, 3.8, 3.5, 3.2, 3.0, 2.8, 2.5, 2.2];
  if (rankIndex < scale.length) {
    return scale[rankIndex];
  }
  return Math.max(1.0, 2.2 - (rankIndex - 9) * 0.2);
}

export function DecisionSummary({ comparisonResult, vehicles }: DecisionSummaryProps) {
  if (!comparisonResult) return null;

  const evaluations = comparisonResult.criterionResult?.vehicleEvaluations || [];

  // Sort evaluations by overallScore descending to determine true rank
  const eligibleEvaluations = [...evaluations].filter(
    e => e.overallScore !== null && e.overallScore !== undefined && !e.coverageTooLow && (e.coveragePct ?? 0) >= 60
  );
  eligibleEvaluations.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

  const winnerEv = eligibleEvaluations[0] || evaluations[0];
  const winnerName = winnerEv?.vehicleName || comparisonResult.overallRecommendation?.vehicleName || "1. Sıra Araç";

  // Build AI Winner Narrative text
  const getWinnerNarrativeText = () => {
    const rawNarrative = comparisonResult.narrativeRecommendation || comparisonResult.overallRecommendation?.reasoning;
    if (
      rawNarrative &&
      !rawNarrative.includes("yeterli doğrulanmış veri bulunmuyor") &&
      !rawNarrative.includes("AI servisine erişilemediği") &&
      rawNarrative.length >= 50
    ) {
      return rawNarrative;
    }

    const winnerAssessments = winnerEv?.assessments || {};
    const strengths: string[] = [];

    // Extract actual report positive factors for winner
    Object.values(winnerAssessments).forEach(a => {
      if (a && a.positiveFactors && a.positiveFactors.length > 0 && a.score && a.score >= 60) {
        const pf = a.positiveFactors[0];
        if (pf && !strengths.includes(pf)) {
          strengths.push(pf);
        }
      }
    });

    if (winnerAssessments.PRACTICALITY?.score && winnerAssessments.PRACTICALITY.score >= 65) {
      strengths.push("geniş kabin yapısı ve cömert bagaj hacmi");
    }
    if (winnerAssessments.FUEL_EFFICIENCY?.score && winnerAssessments.FUEL_EFFICIENCY.score >= 65) {
      strengths.push("verimli yakıt tüketim oranları");
    }
    if (winnerAssessments.RELIABILITY?.score && winnerAssessments.RELIABILITY.score >= 65) {
      strengths.push("düşük kronik arıza riski ve mekanik dayanıklılığı");
    }

    const strengthText =
      strengths.length > 0
        ? Array.from(new Set(strengths)).slice(0, 4).join(", ")
        : "dengeli genel performans yapısı ve modern donanım nitelikleri";

    // Include ALL competitor vehicle names (do NOT slice to 3!)
    const competitorNames = eligibleEvaluations
      .slice(1)
      .map(e => e.vehicleName)
      .filter(Boolean)
      .join(", ");

    return `${winnerName}, karşılaştırılan diğer ${eligibleEvaluations.length - 1} araç${competitorNames ? ` (${competitorNames})` : ""} arasında ${strengthText} ile öne çıkarak 1. sırayı almıştır. Şehir içi günlük kullanım pratikliği ile uzun yolculuklarda sunduğu konfor dengesi, düşük bakım hassasiyeti ve aile kullanımına uygun ergonomisi sayesinde bu karşılaştırma grubunun en dengeli ve rasyonel satın alma tercihi olarak belirlenmiştir.`;
  };

  const narrativeText = getWinnerNarrativeText();

  // Distinct vehicle role assignment (NO duplicate badges across vehicles!)
  const usedBadges = new Set<string>();
  const getVehicleRoleBadge = (ev: typeof evaluations[0], rankIndex: number) => {
    if (rankIndex === 0) {
      const b = "🏆 En Dengeli Genel Seçim (Kazanan)";
      usedBadges.add(b);
      return b;
    }

    const name = ev.vehicleName?.toLowerCase() || "";
    const assessments = ev.assessments || {};

    const relScore = assessments.RELIABILITY?.score ?? 0;
    const comfortScore = assessments.COMFORT?.score ?? 0;
    const fuelScore = assessments.FUEL_EFFICIENCY?.score ?? 0;
    const perfScore = assessments.PERFORMANCE?.score ?? 0;
    const pracScore = assessments.PRACTICALITY?.score ?? 0;
    const equipScore = assessments.EQUIPMENT_TECHNOLOGY?.score ?? 0;

    const isPremiumBrand =
      name.includes("mercedes") ||
      name.includes("bmw") ||
      name.includes("audi") ||
      name.includes("volvo") ||
      name.includes("porsche");

    const isCompact =
      name.includes("polo") ||
      name.includes("golf") ||
      name.includes("clio") ||
      name.includes("a3") ||
      name.includes("1 series") ||
      name.includes("i20");

    const isSportyAwd =
      name.includes("subaru") ||
      name.includes("impreza") ||
      name.includes("quattro") ||
      name.includes("xdrive");

    const candidates: Array<{ badge: string; priority: number }> = [];

    if (isPremiumBrand && !usedBadges.has("⭐ En Premium & Prestijli")) {
      candidates.push({ badge: "⭐ En Premium & Prestijli", priority: 100 });
    }
    if (isSportyAwd && !usedBadges.has("🛡️ Sürücü Odaklı & Yol Tutuş")) {
      candidates.push({ badge: "🛡️ Sürücü Odaklı & Yol Tutuş", priority: 95 });
    }
    if (!usedBadges.has("🔧 En Sorunsuz & Güvenilir")) {
      candidates.push({ badge: "🔧 En Sorunsuz & Güvenilir", priority: relScore });
    }
    if (!usedBadges.has("⛽ En Ekonomik Yakıt Tüketimi")) {
      candidates.push({ badge: "⛽ En Ekonomik Yakıt Tüketimi", priority: fuelScore });
    }
    if (!usedBadges.has("🚀 En Yüksek Performans")) {
      candidates.push({ badge: "🚀 En Yüksek Performans", priority: perfScore });
    }
    if (!usedBadges.has("🎒 En Kullanışlı / Geniş Bagaj")) {
      candidates.push({ badge: "🎒 En Kullanışlı / Geniş Bagaj", priority: pracScore });
    }
    if (isCompact && !usedBadges.has("🏙️ Şehir İçi Pratik & Çevik")) {
      candidates.push({ badge: "🏙️ Şehir İçi Pratik & Çevik", priority: 90 });
    }
    if (!usedBadges.has("💡 Zengin Donanım & Teknoloji")) {
      candidates.push({ badge: "💡 Zengin Donanım & Teknoloji", priority: equipScore });
    }

    candidates.sort((a, b) => b.priority - a.priority);

    for (const c of candidates) {
      if (!usedBadges.has(c.badge)) {
        usedBadges.add(c.badge);
        return c.badge;
      }
    }

    const fallbackBadge = rankIndex === 1 ? "🥈 2. Tercih Edilebilir Seçenek" : `⚖️ ${rankIndex + 1}. Alternatif Seçenek`;
    usedBadges.add(fallbackBadge);
    return fallbackBadge;
  };

  const winnerStars = getDifferentiatedStarsForRank(0);

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
          <div className="text-xs font-mono font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg">
            ★ {winnerStars.toFixed(1)} / 5 Yıldız
          </div>
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
            const stars = getDifferentiatedStarsForRank(idx);
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
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ★ {stars.toFixed(1)} / 5
                    </span>
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
