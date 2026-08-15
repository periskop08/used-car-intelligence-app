"use client";

import React, { useState } from "react";
import { RiskComparisonItem } from "@used-car-intelligence/shared";

interface Props {
  riskComparison?: {
    narrative?: string;
    items?: RiskComparisonItem[];
    lowestRiskVehicleId?: string;
    highestRiskVehicleId?: string;
  };
}

export default function RiskComparison({ riskComparison }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  if (!riskComparison?.narrative) return null;

  const hasItems = riskComparison.items && riskComparison.items.length > 0;

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
              Kronik Sorunlar ve Teknik Risk
            </h3>
            <span className="text-[10px] text-slate-400">
              Onaylı arıza kayıtları, şiddet seviyeleri ve tespit edilebilirlik analizi
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

          {hasItems && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {riskComparison.items!.map((item, idx) => (
                <div key={idx} className="bg-slate-950/70 border border-white/10 p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-orange-400">{item.vehicleName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      item.severity === "CRITICAL" || item.severity === "HIGH"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      {item.severity} Risk
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-200">{item.problemTitle}</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">{item.narrative}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
