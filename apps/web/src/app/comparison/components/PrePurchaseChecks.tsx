"use client";

import React, { useState } from "react";

interface VehicleVerdictItem {
  vehicleId: string;
  vehicleName: string;
  criticalRisks: string[];
  prePurchaseChecks: string[];
}

interface Props {
  verdicts?: VehicleVerdictItem[];
}

export default function PrePurchaseChecks({ verdicts }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (!verdicts || verdicts.length === 0) return null;

  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-850 text-left transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🔍</span>
          <div>
            <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider">
              Satın Alma Öncesi Kritik Kontroller & Ekspertiz Maddeleri
            </h3>
            <span className="text-[10px] text-slate-400">
              Araç başına özellikle kontrol ettirmeniz gereken kritik noktalar
            </span>
          </div>
        </div>
        <span className="text-slate-400 font-bold text-sm">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-white/5 space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verdicts.map((v, i) => (
              <div key={v.vehicleId || i} className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider">{v.vehicleName}</h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {v.prePurchaseChecks?.map((check, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>{check}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
