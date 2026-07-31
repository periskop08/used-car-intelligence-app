"use client";

import React from "react";

interface Props {
  headline?: string;
  executiveSummary?: string;
  generationMode?: "AI" | "FALLBACK";
  overallRecommendation?: {
    vehicleId?: string;
    vehicleName?: string;
    label?: string;
    reasoning?: string;
    confidence?: "LOW" | "MEDIUM" | "HIGH";
  };
}

const renderMarkdownText = (text: string) => {
  if (!text) return null;
  return text.split('\n\n').map((paragraph, idx) => (
    <p key={idx} className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
      {paragraph}
    </p>
  ));
};

export default function DecisionSummary({ headline, executiveSummary, generationMode, overallRecommendation }: Props) {
  const badgeText = overallRecommendation?.label || "Kullanım Önceliğine Göre Değişiyor";
  const winnerName = overallRecommendation?.vehicleName || "";
  const isFallback = generationMode === "FALLBACK";

  return (
    <div className="bg-gradient-to-r from-orange-950/40 via-slate-900/80 to-slate-900/60 border border-orange-500/30 p-6 md:p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 via-amber-500 to-transparent"></div>

      {/* Header & Dynamic Winner Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
            {isFallback ? "Doğrulanmış Verilere Dayalı Karar Özeti" : "TorqueScout Karar Özeti"}
          </span>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-2">
            {headline || "Detaylı Araç Karşılaştırma Analizi"}
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-4 py-2.5 rounded-2xl shadow-inner">
          <span className="text-lg">🏆</span>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Öne Çıkan Değerlendirme</span>
            <span className="text-xs font-black text-orange-400">
              {winnerName ? `${winnerName} • ${badgeText}` : badgeText}
            </span>
          </div>
        </div>
      </div>

      {/* Executive Summary Paragraphs */}
      <div className="space-y-4">
        {renderMarkdownText(executiveSummary || "")}
      </div>

      {/* Recommendation Reasoning callout */}
      {overallRecommendation?.reasoning && (
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-orange-500/20 text-xs text-orange-300 font-medium leading-relaxed">
          💡 <span className="font-bold">{isFallback ? "Teknik Veri Sonuç Gerekçesi: " : "AI Karar Gerekçesi: "}</span>
          {overallRecommendation.reasoning}
        </div>
      )}
    </div>
  );
}
