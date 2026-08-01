'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../components/ReportHeader';
import { ReportSidebar } from '../components/ReportSidebar';
import { ReportKpiCard } from '../components/ReportKpiCard';

import { fetchReportApi } from '@/utils/apiConfig';

export default function GeographyDevicePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportApi('/admin/reports/geography-device')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader title="Coğrafya & Cihaz Dağılım Analitiği" subtitle="Kullanıcıların bağlandığı şehirler, işletim sistemleri ve cihaz platformları." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {data && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.kpis.map((kpi: any) => (
                  <ReportKpiCard key={kpi.key} title={kpi.title} value={kpi.value} formattedValue={kpi.formattedValue} trend={kpi.trend} />
                ))}
              </div>
              <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200">En Çok Bağlanılan Şehirler</h3>
                <div className="space-y-2 font-mono text-xs">
                  {data.topCities.map((c: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                      <span className="text-slate-300 font-sans font-bold">{c.city}</span>
                      <strong className="text-orange-400">{c.count} Oturum</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
