"use client";

import React from "react";

interface ScenarioItem {
  scenarioKey: string;
  title: string;
  recommendedVehicleNames?: string[];
  reasoning: string;
  caveat?: string;
}

interface Props {
  scenarios?: ScenarioItem[];
}

const scenarioIcons: Record<string, string> = {
  CITY_USE: "🏙️",
  HIGHWAY_USE: "🛣️",
  FUEL_ECONOMY: "⛽",
  RELIABILITY: "🛡️",
  COMFORT: "🛋️",
  HANDLING: "🏎️",
  FAMILY_USE: "👨‍👩‍👧‍👦",
};

export default function ScenarioCards({ scenarios }: Props) {
  if (!scenarios || scenarios.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <span>🎯</span> Hızlı Senaryo ve Kullanım Amacı Kartları
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">Senaryo Bazlı Kazananlar</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((sc, idx) => {
          const icon = scenarioIcons[sc.scenarioKey] || "🚗";
          const winnerName = sc.recommendedVehicleNames?.join(", ") || "Belirtilmedi";

          return (
            <div
              key={idx}
              className="bg-slate-900/80 border border-white/10 hover:border-orange-500/30 p-4 rounded-2xl flex flex-col justify-between gap-3 transition shadow-lg"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xl">{icon}</span>
                  <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                    {sc.title}
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white">{winnerName}</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{sc.reasoning}</p>
                </div>
              </div>

              {sc.caveat && (
                <span className="text-[10px] text-amber-400/90 font-medium border-t border-white/5 pt-2 flex items-center gap-1">
                  <span>⚠️</span> {sc.caveat}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
