'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';
import { ReportKpiCard } from '../../components/ReportKpiCard';
import { fetchReportApi } from '@/utils/apiConfig';

export default function FinanceOneTimePackagesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportApi('/admin/reports/finance/one-time-packages')
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
      <ReportHeader title="Tek Seferlik Paket Satış Geliri" subtitle="Alıcı Mini, Alıcı Plus ve Alıcı Max tekil paket satın alım hacimleri." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {error && <div className="p-6 text-center text-rose-400 bg-rose-950/40 rounded-2xl border border-rose-800/40">{error}</div>}
          {data && (
            <div className="space-y-6">
              {Array.isArray(data.kpis) && (
                <div className="grid grid-cols-1 gap-4">
                  {data.kpis.map((kpi: any) => (
                    <ReportKpiCard key={kpi.key} title={kpi.title} value={kpi.value} formattedValue={kpi.formattedValue} trend={kpi.trend} />
                  ))}
                </div>
              )}
              {Array.isArray(data.packageBreakdown) && (
                <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200">Tek Seferlik Paket Kırılımı</h3>
                  <div className="space-y-2 font-mono text-xs">
                    {data.packageBreakdown.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                        <div>
                          <span className="text-slate-200 font-sans font-bold block">{p.package}</span>
                          <span className="text-slate-500">{p.count || 0} Adet Satış</span>
                        </div>
                        <strong className="text-emerald-400 text-sm">₺{(p.revenue || 0).toLocaleString('tr-TR')}</strong>
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
