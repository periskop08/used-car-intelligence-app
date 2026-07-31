"use client";

import React from "react";

interface Props {
  generationMode?: "AI" | "FALLBACK";
}

export default function FallbackNotice({ generationMode }: Props) {
  if (generationMode !== "FALLBACK") return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3 text-amber-300 text-xs font-semibold shadow-lg shadow-amber-500/5 mb-6">
      <span className="text-xl select-none">⚡</span>
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-amber-200">Teknik Veri Destekli Mod Aktif</span>
        <span className="text-amber-400/90 leading-relaxed">
          Bu karşılaştırma doğrulanmış teknik veriler ve veritabanımızdaki kayıtlı kronik riskler üzerinden hazırlanmıştır. Gelişmiş AI yorumlaması geçici olarak yoğunluk nedeniyle yedek moda geçmiştir.
        </span>
      </div>
    </div>
  );
}
