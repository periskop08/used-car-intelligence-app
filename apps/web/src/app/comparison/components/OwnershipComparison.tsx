"use client";

import React, { useState } from "react";

interface Props {
  ownershipCostComparison?: {
    title?: string;
    narrative?: string;
    lowestEstimatedCostVehicleId?: string;
    highestEstimatedCostVehicleId?: string;
    insufficientDataForTotalRanking?: boolean;
  };
}

export default function OwnershipComparison({ ownershipCostComparison }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  if (!ownershipCostComparison?.narrative) return null;

  const displayTitle = ownershipCostComparison.title || "Sahiplik ve Bakım Maliyeti Karşılaştırması";

  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-850 text-left transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">💰</span>
          <div>
            <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider">
              {displayTitle}
            </h3>
            <span className="text-[10px] text-slate-400">
              Yakıt tüketimi, bakım bütçesi ve sahiplik gideri değerlendirmesi
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
            {ownershipCostComparison.narrative}
          </div>

          {ownershipCostComparison.insufficientDataForTotalRanking && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
              <span>ℹ️</span>
              <span>Bakım ve parça maliyeti verileri yetersiz olduğu için yalnızca doğrulanmış yakıt tüketimleri kıyaslanmış, kesin toplam maliyet sıralaması yapılmamıştır.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
