"use client";

import React, { useState } from "react";

interface Props {
  vehicles: any[];
}

export default function TechnicalComparisonTable({ vehicles }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (!vehicles || vehicles.length === 0) return null;

  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-850 text-left transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📋</span>
          <div>
            <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider">
              Detaylı Teknik Özellik Karşılaştırma Tablosu
            </h3>
            <span className="text-[10px] text-slate-400">
              Destekleyici teknik veriler (Yatay kaydırılabilir)
            </span>
          </div>
        </div>
        <span className="text-slate-400 font-bold text-sm">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-white/5 space-y-3 animate-fadeIn">
          <div className="overflow-x-auto relative rounded-xl border border-white/5">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-300 font-bold border-b border-white/10">
                  <th className="p-3 text-left sticky left-0 bg-slate-950 z-10 w-40">Özellik / Araç</th>
                  {vehicles.map((v) => (
                    <th key={v.id} className="p-3 min-w-[160px] text-orange-400 font-black">{v.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-slate-900">Marka & Model</td>
                  {vehicles.map(v => <td key={v.id} className="p-3 font-bold">{v.brand} {v.model}</td>)}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-slate-900">Model Yılı</td>
                  {vehicles.map(v => <td key={v.id} className="p-3">{v.year}</td>)}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-slate-900">Donanım Paketi</td>
                  {vehicles.map(v => <td key={v.id} className="p-3">{v.trim}</td>)}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-slate-900">Motor Gücü / Kodu</td>
                  {vehicles.map(v => <td key={v.id} className="p-3 font-bold text-white">{v.engine}</td>)}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-slate-900">Şanzıman Tipi</td>
                  {vehicles.map(v => <td key={v.id} className="p-3">{v.transmission}</td>)}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-slate-900">Yakıt Türü</td>
                  {vehicles.map(v => <td key={v.id} className="p-3 font-bold text-orange-400">{v.fuelType}</td>)}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-slate-900">Onaylı Kronik Sorun Kaydı</td>
                  {vehicles.map(v => <td key={v.id} className="p-3 font-bold text-amber-400">{v.problemsCount} Adet Kayıt</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
