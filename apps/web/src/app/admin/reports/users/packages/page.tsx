'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';

import { fetchReportApi } from '@/utils/apiConfig';

export default function UserPackagesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportApi('/admin/reports/users/packages')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader title="Paket Dağılımı ve Üyelik Tipleri" subtitle="Tanışma (Ücretsiz), Yetkin ve Profesyonel paket kullanıcı dağılımları." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data.breakdown.map((b: any, idx: number) => (
                <div key={idx} className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-xs font-bold text-slate-400 block">{b.name}</span>
                  <span className="text-3xl font-black font-mono text-slate-100 block">{b.count.toLocaleString('tr-TR')}</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
