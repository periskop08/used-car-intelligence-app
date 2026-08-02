'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';
import { ReportKpiCard } from '../../components/ReportKpiCard';
import { ReportDrilldownDrawer } from '../../components/ReportDrilldownDrawer';
import { fetchReportApi } from '@/utils/apiConfig';

export default function ListingOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilldownKey, setDrilldownKey] = useState<string | null>(null);

  useEffect(() => {
    fetchReportApi('/admin/reports/listings/overview')
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
      <ReportHeader title="İlan Moderasyon & Yayın Genel Bakışı" subtitle="Yayındaki aktif, onay bekleyen, satılan ve reddedilen ilan hacmi." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {error && <div className="p-6 text-center text-rose-400 bg-rose-950/40 rounded-2xl border border-rose-800/40">{error}</div>}
          {data && Array.isArray(data.kpis) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.kpis.map((kpi: any) => (
                <ReportKpiCard key={kpi.key} title={kpi.title} value={kpi.value} trend={kpi.trend} alertLevel={kpi.alertLevel} drilldownKey={kpi.drilldownKey} drilldownParams={kpi.drilldownParams} onDrilldownClick={(k) => setDrilldownKey(k)} />
              ))}
            </div>
          )}
        </main>
      </div>
      <ReportDrilldownDrawer drilldownKey={drilldownKey} onClose={() => setDrilldownKey(null)} />
    </div>
  );
}
