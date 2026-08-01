'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';

import { fetchReportApi } from '@/utils/apiConfig';

export default function UserRetentionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportApi('/admin/reports/users/retention')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader title="Kullanıcı Retention & Cohort Isı Haritası" subtitle="Haftalık cohort bazında 1. gün, 7. gün ve 30. gün kullanıcı tutundurma oranları." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {data && (
            <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Cohort Tutundurma Matrisi</h3>
              <div className="overflow-x-auto border border-white/10 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-white/10">
                    <tr>
                      <th className="p-3">Cohort Grubu</th>
                      <th className="p-3">Gün 1</th>
                      <th className="p-3">Gün 7</th>
                      <th className="p-3">Gün 30</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.retentionHeatmap.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="p-3 font-sans font-bold text-slate-200">{row.cohort}</td>
                        <td className="p-3 bg-emerald-500/20 text-emerald-400 font-bold">%{row.day1}</td>
                        <td className="p-3 bg-emerald-500/10 text-emerald-300">%{row.day7}</td>
                        <td className="p-3 bg-amber-500/10 text-amber-300">%{row.day30}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
