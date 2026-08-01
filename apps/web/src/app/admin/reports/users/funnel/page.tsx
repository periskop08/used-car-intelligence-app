'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';

import { fetchReportApi } from '@/utils/apiConfig';

export default function UserFunnelPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportApi('/admin/reports/users/funnel')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader title="Kullanıcı Dönüşüm Hunisi (Funnel)" subtitle="Kayıttan paket satın alımına kadar aşama aşama dönüşüm ve terk (drop-off) oranları." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {data && (
            <div className="space-y-4 bg-slate-900/60 p-6 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-slate-200">Aşama Dönüşüm Adımları</h3>
              <div className="space-y-3">
                {data.stages.map((st: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between font-mono text-xs">
                    <div>
                      <span className="text-slate-400 font-sans font-bold text-sm block">{st.name}</span>
                      <span className="text-slate-500">Adım {idx + 1}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-orange-400 block">{st.count.toLocaleString('tr-TR')} kullanıcı</span>
                      <span className="text-emerald-400 font-bold">%{st.conversionPct} Dönüşüm</span>
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
