"use client";

import React from "react";

interface DecisionRow {
  criterion: string;
  winnerVehicleIds?: string[];
  winnerNames?: string[];
  reason: string;
}

interface Props {
  matrix?: DecisionRow[];
}

export default function DecisionMatrix({ matrix }: Props) {
  if (!matrix || matrix.length === 0) return null;

  return (
    <div className="bg-slate-900/80 border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Karar Matrisi Tablosu (Önceliğinize Göre Kazananlar)
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Karar Matrisi</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 font-bold uppercase text-[10px]">
              <th className="p-3">Kullanım Önceliğiniz</th>
              <th className="p-3">Öne Çıkan Araç</th>
              <th className="p-3">Analist Gerekçesi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {matrix.map((row, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition">
                <td className="p-3 font-bold text-orange-400 whitespace-nowrap">{row.criterion}</td>
                <td className="p-3 font-bold text-white whitespace-nowrap">
                  {row.winnerNames?.join(", ") || "Belirtilmedi"}
                </td>
                <td className="p-3 text-slate-300 leading-relaxed">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
