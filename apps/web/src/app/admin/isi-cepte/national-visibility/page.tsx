'use client';

import React from 'react';
import { Globe, Info, Compass } from 'lucide-react';

export default function IsiCepteNationalVisibilityPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Ülke Geneli Görünürlük</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Şehir sınırlarını aşarak ulusal çapta aramalarda coğrafi görünürlük hakkı kazanan işletmeler
          </p>
        </div>
      </div>

      {/* Business Semantic Badge */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-start gap-3 text-xs text-purple-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-purple-400" />
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm">Ülke Geneli Kapsam İlkesi</h4>
          <p className="text-slate-300 leading-relaxed">
            Ülke Geneli hakkı coğrafi görünürlük alanını genişletir. Ancak bir işletmenin aranan araç markası ve oto hizmet alt kategorisine uygunluğu yine de şarttır.
          </p>
        </div>
      </div>

      {/* Main Content Area — Truthful Empty State */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden p-12 text-center space-y-3">
        <Compass className="w-10 h-10 text-slate-600 mx-auto" />
        <h3 className="text-sm font-bold text-white">Henüz ülke geneli görünürlük kaydı bulunmuyor.</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Ülke Geneli görünürlük hakkı edinen işletmelerin kayıtları bu alanda yönetilecektir.
        </p>
      </div>
    </div>
  );
}
