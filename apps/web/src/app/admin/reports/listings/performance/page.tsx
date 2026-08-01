'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';
import { ReportKpiCard } from '../../components/ReportKpiCard';

export default function ListingPerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/reports/listings/performance', {
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
      <ReportHeader title="İlan Etkileşim & İletişim Performansı" subtitle="İlan görüntüleme, favoriye alma ve satıcı iletişim başlatma dönüşümleri." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data.kpis.map((kpi: any) => (
                <ReportKpiCard key={kpi.key} title={kpi.title} value={kpi.value} trend={kpi.trend} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
