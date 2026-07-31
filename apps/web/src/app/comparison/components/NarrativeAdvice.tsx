"use client";

import React from "react";

interface Props {
  narrativeRecommendation?: string;
}

export default function NarrativeAdvice({ narrativeRecommendation }: Props) {
  if (!narrativeRecommendation) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-slate-900/80 border border-white/10 p-6 md:p-8 rounded-3xl space-y-4 shadow-xl relative">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <span className="text-2xl">💬</span>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Açık Konuşalım: Hangisi Size Daha Uygun?
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">
            Uzman Otomotiv Danışmanı Değerlendirmesi
          </span>
        </div>
      </div>

      <div className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-line space-y-3">
        {narrativeRecommendation}
      </div>
    </div>
  );
}
