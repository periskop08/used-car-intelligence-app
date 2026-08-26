'use client';

import React, { useState } from 'react';
import { Users, Search, Filter, Store, Info } from 'lucide-react';

export default function IsiCepteProvidersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">İşletmeler ve Ustalar</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            İşi Cepte sisteminden senkronize edilecek yetkili servis, usta ve ekspertiz işletmeleri
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-cyan-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="İşletme adı, usta, bölge veya hizmet kategorisi ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="">Tüm Üyelik Durumları</option>
            <option value="ACTIVE">Aktif Üye</option>
            <option value="INACTIVE">Pasif</option>
            <option value="SUSPENDED">Askıda</option>
          </select>
        </div>
      </div>

      {/* Main Content Area — Truthful Empty State */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-12 text-center space-y-3">
          <Store className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Henüz TorqueScout'a aktarılmış İşi Cepte işletmesi bulunmuyor.</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            İşi Cepte senkronizasyon servisi bağlandığında listelenmek isteyen üye işletmeler burada görüntülenecektir.
          </p>
        </div>
      </div>
    </div>
  );
}
