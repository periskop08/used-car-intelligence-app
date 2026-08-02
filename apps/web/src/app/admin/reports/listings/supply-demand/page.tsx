'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';
import { fetchReportApi } from '@/utils/apiConfig';

export default function ListingSupplyDemandPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportApi('/admin/reports/listings/supply-demand')
      .then((res) => {
        if (!res.ok) throw new Error(`Rapor verisi alınamadı (HTTP ${res.status})`);
        return res.json();
      })
      .then((d) => {
        if (d?.statusCode >= 400) throw new Error(d.message || 'Yönetici yetkisi gerekiyor');
        setData(d);
      })
      .catch((e: any) => setError(e.message || 'Bir hata oluştu'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader title="Arz–Talep Dengesizliği ve İlan Açıkları" subtitle="Kullanıcılar tarafından yoğun aranan ancak az ilanı bulunan marka/model fırsatları." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {error && <div className="p-6 text-center text-rose-400 bg-rose-950/40 rounded-2xl border border-rose-800/40">{error}</div>}
          {data && Array.isArray(data.gapCards) && (
            <div className="space-y-4 bg-slate-900/60 p-6 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-slate-200">Arz-Talep Fırsat Kartları</h3>
              <div className="space-y-3 font-mono text-xs">
                {data.gapCards.map((g: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-slate-200 font-sans font-bold text-sm block">{g.brand} {g.model}</span>
                      <span className="text-amber-400 font-bold">{g.gapStatus}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">Talep Skoru: <strong className="text-emerald-400">{g.demandScore || 0}</strong></span>
                      <span className="text-slate-500">Mevcut İlan: {g.supplyCount || 0} adet</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
