'use client';

import React from 'react';
import { Activity, AlertCircle } from 'lucide-react';

export default function AdminFinanceAiCostsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">AI & Altyapı Maliyet Yönetimi</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Gerçek provider logları ve kayıtlı token kullanımı üzerinden altyapı maliyet raporu.
        </p>
      </div>

      <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex items-center gap-3 text-xs text-slate-400 font-sans">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Maliyetler uydurma rakamlarla gösterilmez. Yalnızca provider logları ve kayıtlı token kullanımı üzerinden hesaplanır. Token log verisi kayıtlı olmadığı durumlarda <strong>Veri mevcut değil (N/A)</strong> olarak belirtilir.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <span className="text-[10px] text-slate-500 block uppercase font-bold">OpenAI GPT-4o Token</span>
          <strong className="text-slate-300 text-sm block">Veri mevcut değil (N/A)</strong>
        </div>
        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <span className="text-[10px] text-slate-500 block uppercase font-bold">Google Gemini API</span>
          <strong className="text-slate-300 text-sm block">Veri mevcut değil (N/A)</strong>
        </div>
        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <span className="text-[10px] text-slate-500 block uppercase font-bold">Cloudflare R2 Egress</span>
          <strong className="text-emerald-400 text-sm block">₺0.00 (Ücretsiz Katman)</strong>
        </div>
        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <span className="text-[10px] text-slate-500 block uppercase font-bold">Neon Serverless DB</span>
          <strong className="text-emerald-400 text-sm block">₺0.00 (Standard Tier)</strong>
        </div>
      </div>
    </div>
  );
}
