"use client";

import React, { useState } from "react";

interface VehicleVerdictItem {
  vehicleId: string;
  vehicleName: string;
  characterSummary: string;
  bestFor: string[];
  notIdealFor: string[];
  gains: string[];
  compromises: string[];
  criticalRisks: string[];
  prePurchaseChecks: string[];
}

interface Props {
  verdicts?: VehicleVerdictItem[];
}

export default function VehicleVerdictGrid({ verdicts }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!verdicts || verdicts.length === 0) return null;

  const isManyVehicles = verdicts.length > 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚘</span>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Araç Karakter Kartları (Kazanım & Taviz Dengesi)
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {verdicts.length} Araç İncelendi
        </span>
      </div>

      <div className={`grid grid-cols-1 ${
        verdicts.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"
      } gap-5`}>
        {verdicts.map((v, i) => {
          const isExpanded = !isManyVehicles || expandedId === v.vehicleId;

          return (
            <div
              key={v.vehicleId || i}
              className="bg-slate-900/80 border border-white/10 p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-xl relative"
            >
              <div className="space-y-3">
                {/* Vehicle Header & Character */}
                <div className="border-b border-white/10 pb-3">
                  <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded">
                    {v.characterSummary || "Karakter Özeti"}
                  </span>
                  <h4 className="text-xs md:text-sm font-black text-white mt-1.5">{v.vehicleName}</h4>
                </div>

                {/* Gains (Ne Kazanırsın?) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1">
                    <span>✓</span> Bu Aracı Seçersen Ne Kazanırsın?
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {v.gains?.map((g, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-green-400 font-bold">•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Compromises (Neyi Feda Edersin?) */}
                <div className="space-y-1.5 border-t border-white/5 pt-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <span>⚠️</span> Neyi Feda Edersin (Taviz)?
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {v.compromises?.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Progressive Disclosure Section if > 5 vehicles */}
                {isExpanded && (
                  <div className="space-y-3 pt-2 border-t border-white/10 animate-fadeIn">
                    {/* Best For */}
                    {v.bestFor && v.bestFor.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kimler İçin Uygun?</span>
                        <div className="flex flex-wrap gap-1">
                          {v.bestFor.map((b, idx) => (
                            <span key={idx} className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/5">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Critical Risks */}
                    {v.criticalRisks && v.criticalRisks.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Öne Çıkan Riskler</span>
                        <ul className="space-y-0.5 text-[11px] text-slate-300">
                          {v.criticalRisks.map((r, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-red-400 font-bold">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Expander Button if > 5 vehicles */}
              {isManyVehicles && (
                <button
                  onClick={() => setExpandedId(isExpanded ? null : v.vehicleId)}
                  className="w-full text-center text-[10px] font-bold text-orange-400 hover:text-orange-300 py-1 border-t border-white/5 mt-2 transition"
                >
                  {isExpanded ? "Daha Az Göster ▲" : "Tüm Detayları Gör ▼"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
