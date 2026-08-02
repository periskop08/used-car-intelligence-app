'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../components/ReportHeader';
import { ReportSidebar } from '../components/ReportSidebar';
import { ReportKpiCard } from '../components/ReportKpiCard';
import { fetchReportApi } from '@/utils/apiConfig';

export default function SystemAiPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportApi('/admin/reports/system-ai')
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
      <ReportHeader title="Sistem & AI Performansı / Latency" subtitle="Google Gemini P50/P95/P99 yanıt süreleri, JSON repair başarı oranı ve altyapı yükü." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {error && <div className="p-6 text-center text-rose-400 bg-rose-950/40 rounded-2xl border border-rose-800/40">{error}</div>}
          {data && (
            <div className="space-y-6">
              {Array.isArray(data.kpis) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {data.kpis.map((kpi: any) => (
                    <ReportKpiCard key={kpi.key} title={kpi.title} value={kpi.value} formattedValue={kpi.formattedValue} trend={kpi.trend} />
                  ))}
                </div>
              )}
              {Array.isArray(data.providerLatencies) && (
                <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200">AI Provider Yanıt Gecikmeleri (Latency)</h3>
                  <div className="space-y-2 font-mono text-xs">
                    {data.providerLatencies.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-white/5">
                        <div>
                          <span className="text-slate-200 font-sans font-bold text-sm block">{p.provider}</span>
                          <span className="text-emerald-400 font-bold">{p.status}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block">P50: {p.p50 || 0}s | P95: {p.p95 || 0}s | P99: {p.p99 || 0}s</span>
                        </div>
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
