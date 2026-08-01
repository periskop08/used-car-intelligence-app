'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';

export default function ListingSupplyDemandPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/reports/listings/supply-demand', {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader title="Arz–Talep Dengesizliği ve İlan Açıkları" subtitle="Kullanıcılar tarafından yoğun aranan ancak az ilanı bulunan marka/model fırsatları." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {data && (
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
                      <span className="text-slate-400 block">Talep Skoru: <strong className="text-emerald-400">{g.demandScore}</strong></span>
                      <span className="text-slate-500">Mevcut İlan: {g.supplyCount} adet</span>
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
