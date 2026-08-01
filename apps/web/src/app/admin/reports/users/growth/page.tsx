'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';
import { ReportKpiCard } from '../../components/ReportKpiCard';
import { ReportDrilldownDrawer } from '../../components/ReportDrilldownDrawer';

import { fetchReportApi } from '@/utils/apiConfig';

export default function UserGrowthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drilldownKey, setDrilldownKey] = useState<string | null>(null);

  useEffect(() => {
    fetchReportApi('/admin/reports/users/growth')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader title="Kullanıcı Büyümesi & Kayıt Metrikleri" subtitle="Zaman içinde yeni kayıt olan, aktif ve pasif kullanıcı eğilimleri." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data.kpis.map((kpi: any) => (
                <ReportKpiCard key={kpi.key} title={kpi.title} value={kpi.value} trend={kpi.trend} alertLevel={kpi.alertLevel} onDrilldownClick={() => setDrilldownKey('USER_LIST')} drilldownKey="USER_LIST" />
              ))}
            </div>
          )}
        </main>
      </div>
      <ReportDrilldownDrawer drilldownKey={drilldownKey} onClose={() => setDrilldownKey(null)} />
    </div>
  );
}
