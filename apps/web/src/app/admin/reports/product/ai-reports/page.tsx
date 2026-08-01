'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';
import { ReportKpiCard } from '../../components/ReportKpiCard';
import { ReportDrilldownDrawer } from '../../components/ReportDrilldownDrawer';

export default function ProductAiReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drilldownKey, setDrilldownKey] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/reports/product/ai-reports', {
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
      <ReportHeader title="AI Araç Riski Rapor Performansı" subtitle="Oluşturulan AI raporları, başarı oranları ve en çok talep edilen markalar." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {data && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {data.kpis.map((kpi: any) => (
                  <ReportKpiCard key={kpi.key} title={kpi.title} value={kpi.value} trend={kpi.trend} alertLevel={kpi.alertLevel} drilldownKey={kpi.drilldownKey} drilldownParams={kpi.drilldownParams} onDrilldownClick={(k, p) => { setDrilldownKey(k); }} />
                ))}
              </div>
              <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200">En Çok Rapor Oluşturulan Markalar</h3>
                <div className="space-y-2 font-mono text-xs">
                  {data.topRequestedBrands.map((b: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                      <span className="text-slate-300 font-sans font-bold">{b.brand}</span>
                      <strong className="text-orange-400">{b.count} Rapor</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <ReportDrilldownDrawer drilldownKey={drilldownKey} onClose={() => setDrilldownKey(null)} />
    </div>
  );
}
