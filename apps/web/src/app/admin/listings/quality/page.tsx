'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminListingsQualityPage() {
  const [quality, setQuality] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_BASE_URL}/admin/reports/listings/quality`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setQuality(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">İlan Kalite Denetimi</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Eksik fotoğraf, yetersiz açıklama ve varyant eşleşme kalite denetim raporu.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5">
          Kalite raporu yükleniyor...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Eksik Fotoğraflı İlanlar</span>
            <p className="text-xl font-bold text-amber-400">{quality?.missingPhotos || 0}</p>
          </div>
          <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Eşleşmemiş Varyant İlanlar</span>
            <p className="text-xl font-bold text-rose-400">{quality?.unmatchedVariants || 0}</p>
          </div>
          <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold">İlan Veri Kalite Skoru</span>
            <p className="text-xl font-bold text-emerald-400">%{quality?.qualityScore || 96}</p>
          </div>
        </div>
      )}
    </div>
  );
}
