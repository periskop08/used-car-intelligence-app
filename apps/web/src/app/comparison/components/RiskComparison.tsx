"use client";

import React, { useState } from "react";

interface Props {
  riskComparison?: {
    narrative?: string;
    lowestRiskVehicleId?: string;
    highestRiskVehicleId?: string;
  };
}

export default function RiskComparison({ riskComparison }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  if (!riskComparison?.narrative) return null;

  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-850 text-left transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider">
              Kronik Sorunlar ve Masraf Riski Çapraz Analizi
            </h3>
            <span className="text-[10px] text-slate-400">
              Sıklık, şiddet ve tahmini tamir maliyeti değerlendirmesi
            </span>
          </div>
        </div>
        <span className="text-slate-400 font-bold text-sm">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-white/5 space-y-4 animate-fadeIn">
          <div className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-line">
            {riskComparison.narrative}
          </div>
        </div>
      )}
    </div>
  );
}
