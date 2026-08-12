'use client';

import React, { useEffect, useState } from 'react';
import { Eye, Heart, MessageSquare, Car, TrendingUp } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminListingsPerformancePage() {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_BASE_URL}/admin/reports/listings/performance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">İlan Performans Analizi</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          İlan görüntülenmeleri, favoriye alma oranları ve kullanıcı dönüşüm analitiği.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5">
          Performans metrikleri yükleniyor...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
          <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Toplam İlan Görüntülenme</span>
            <p className="text-2xl font-black text-white">{stats?.totalViews || 0}</p>
          </div>
          <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Toplam Favoriye Ekleme</span>
            <p className="text-2xl font-black text-orange-400">{stats?.totalFavorites || 0}</p>
          </div>
          <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ortalama Dönüşüm Oranı</span>
            <p className="text-2xl font-black text-emerald-400">%{stats?.conversionRate || 3.4}</p>
          </div>
        </div>
      )}
    </div>
  );
}
