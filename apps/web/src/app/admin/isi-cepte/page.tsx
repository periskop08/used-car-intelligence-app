'use client';

import React from 'react';
import { Store, Users, MapPin, Award, Globe, ShoppingBag, Info, RefreshCw } from 'lucide-react';

export default function IsiCepteOverviewPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-400" />
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">İşi Cepte — Genel Bakış</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            TorqueScout ile entegre İşi Cepte oto servis, usta ve ekspertiz görünürlük operasyon merkezi
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-3 text-xs text-orange-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-orange-400" />
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm">Entegrasyon Durumu Bilgilendirmesi</h4>
          <p className="text-slate-300 leading-relaxed">
            İşi Cepte veri entegrasyonu henüz bağlı değildir. Gerçek işletme, Vitrin ve Ülke Geneli görünürlük verileri entegrasyon aktifleştiğinde otomatik olarak buraya yansıyacaktır.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>TorqueScout İşletmeleri</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">—</div>
          <span className="text-[10px] text-slate-500 block font-mono">Entegrasyon bekleniyor</span>
        </div>

        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Aktif Yerel Görünürlük</span>
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">—</div>
          <span className="text-[10px] text-slate-500 block font-mono">İl / İlçe eşleşmeleri</span>
        </div>

        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Aktif Vitrin Hakları</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">—</div>
          <span className="text-[10px] text-slate-500 block font-mono">Sıralama önceliği</span>
        </div>

        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Aktif Ülke Geneli</span>
            <Globe className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">—</div>
          <span className="text-[10px] text-slate-500 block font-mono">Genişletilmiş erişim</span>
        </div>
      </div>

      {/* Empty State Body */}
      <div className="p-12 bg-slate-900/40 rounded-2xl border border-white/5 text-center space-y-3">
        <Store className="w-10 h-10 text-slate-600 mx-auto" />
        <h3 className="text-sm font-bold text-white">İşi Cepte Veri Bağlantısı Bekleniyor</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          İşi Cepte entegrasyonu aktif olduğunda işletme ve görünürlük verileri burada görüntülenecektir.
        </p>
      </div>
    </div>
  );
}
