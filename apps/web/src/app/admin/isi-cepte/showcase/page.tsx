'use client';

import React from 'react';
import { Award, Info, Zap } from 'lucide-react';

export default function IsiCepteShowcasePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Vitrin Görünürlüğü</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            TorqueScout öneri listelerinde üst sıralama ve öne çıkma hakkı satın alan Vitrin üyeleri
          </p>
        </div>
      </div>

      {/* Business Semantic Badge */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs text-amber-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm">Vitrin Kapsam İlkesi</h4>
          <p className="text-slate-300 leading-relaxed">
            Vitrin hakkı, yalnızca zaten uygun ve ilgili olan işletmeler için sıralama önceliği avantajı sağlar. İlgisiz bir işletmeyi alakasız aramada öne çıkarmaz veya coğrafi kapsama alanını kendiliğinden genişletmez.
          </p>
        </div>
      </div>

      {/* Main Content Area — Truthful Empty State */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden p-12 text-center space-y-3">
        <Zap className="w-10 h-10 text-slate-600 mx-auto" />
        <h3 className="text-sm font-bold text-white">Henüz aktif veya geçmiş Vitrin kaydı bulunmuyor.</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          İşi Cepte üzerinden Vitrin hakkı edinen işletmelerin kayıtları bu alanda görüntülenecektir.
        </p>
      </div>
    </div>
  );
}
