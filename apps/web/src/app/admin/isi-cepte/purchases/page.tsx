'use client';

import React from 'react';
import { ShoppingBag, ShieldCheck } from 'lucide-react';

export default function IsiCeptePurchasesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Satın Alımlar</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            İşi Cepte sistemi üzerinden gerçekleştirilen Vitrin ve Ülke Geneli hak satın alım günlüğü (Salt Okunur)
          </p>
        </div>
      </div>

      {/* Main Content Area — Truthful Empty State */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden p-12 text-center space-y-3">
        <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
        <h3 className="text-sm font-bold text-white">Henüz satın alma kaydı bulunmuyor.</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          İşi Cepte üzerinden gerçekleştirilen hak satın alma işlemleri otomatik olarak buraya yansıyacaktır. TorqueScout içerisinden ödeme alınmamaktadır.
        </p>
      </div>
    </div>
  );
}
