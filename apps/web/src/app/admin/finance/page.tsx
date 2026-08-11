'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, CreditCard, Activity, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminFinancePage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_BASE_URL}/admin/reports/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fin = data?.financialSummary;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Finans Özeti ve Gelir Yönetimi</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            MRR, ARR, paket satışları ve şeffaf AI altyapı maliyet analizi.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5">
          Finansal veriler yükleniyor...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Revenue Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
            <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Aylık Düzenli Gelir (MRR)</span>
              <p className="text-2xl font-black text-emerald-400">₺{(fin?.mrr || 0).toLocaleString('tr-TR')}</p>
            </div>
            <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Yıllık Düzenli Gelir (ARR)</span>
              <p className="text-2xl font-black text-cyan-400">₺{(fin?.arr || 0).toLocaleString('tr-TR')}</p>
            </div>
            <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Tahmini Gross Margin</span>
              <p className="text-2xl font-black text-purple-400">%{fin?.grossMarginPct || 0}</p>
            </div>
          </div>

          {/* AI Infrastructure Cost Card (Rule #6 Alignment) */}
          <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-3 font-sans">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Yapay Zeka (AI) Altyapı Maliyet Analizi</span>
            </h3>

            <div className="p-4 bg-slate-950 rounded-xl border border-white/5 flex items-center gap-3 text-xs text-slate-400">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Maliyetler uydurma rakamlarla gösterilmez. Yalnızca provider logları ve kayıtlı token kullanımı üzerinden hesaplanır. Token log verisi kayıtlı olmadığı durumlarda <strong>N/A (Veri Mevcut Değil)</strong> olarak belirtilir.
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs pt-2">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 block">OpenAI GPT-4o Token</span>
                <strong className="text-slate-300">N/A (Veri Mevcut Değil)</strong>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 block">Google Gemini API</span>
                <strong className="text-slate-300">N/A (Veri Mevcut Değil)</strong>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 block">Cloudflare R2 Egress</span>
                <strong className="text-slate-300">₺0.00 (Ücretsiz Katman)</strong>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 block">Neon DB Compute</span>
                <strong className="text-slate-300">₺0.00 (Standard Tier)</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
