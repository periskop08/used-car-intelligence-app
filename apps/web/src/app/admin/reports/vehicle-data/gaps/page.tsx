'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';
import { ReportKpiCard } from '../../components/ReportKpiCard';
import { fetchReportApi } from '@/utils/apiConfig';

export default function VehicleDataGapsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportApi('/admin/reports/vehicle-data/gaps')
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
      <ReportHeader title="Araç Veri Açıkları ve Ekip İş Kuyruğu" subtitle="Recall veya teknik verisi eksik modeller ve araştırma ekibinin aksiyon listesi." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {error && <div className="p-6 text-center text-rose-400 bg-rose-950/40 rounded-2xl border border-rose-800/40">{error}</div>}
          {data && (
            <div className="space-y-6">
              {Array.isArray(data.kpis) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.kpis.map((kpi: any) => (
                    <ReportKpiCard key={kpi.key} title={kpi.title} value={kpi.value} alertLevel={kpi.alertLevel} />
                  ))}
                </div>
              )}
              {Array.isArray(data.actionableListings) && (
                <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200">Aksiyon Bekleyen Araç Veri İş Listesi</h3>
                  <div className="space-y-2 font-mono text-xs">
                    {data.actionableListings.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                        <div>
                          <span className="text-slate-200 font-sans font-bold block">{item.brand} {item.model}</span>
                          <span className="text-amber-400">{item.gapType}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">
                          {item.priority} ÖNCELİK
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
