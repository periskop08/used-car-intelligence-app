'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportSidebar } from './components/ReportSidebar';
import { ReportKpiCard } from './components/ReportKpiCard';
import { ReportDrilldownDrawer } from './components/ReportDrilldownDrawer';
import { fetchReportApi } from '@/utils/apiConfig';

export default function ReportsOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilldownKey, setDrilldownKey] = useState<string | null>(null);
  const [drilldownParams, setDrilldownParams] = useState<any>({});

  const fetchOverview = (filters: any = {}) => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams(filters).toString();

    fetchReportApi(`/admin/reports/overview?${query}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Yönetici raporları yüklenemedi (HTTP ${res.status})`);
        return res.json();
      })
      .then((d) => {
        if (d?.statusCode >= 400) throw new Error(d.message || 'Yönetici yetkisi gerekiyor.');
        setData(d);
      })
      .catch((e: any) => {
        setError(e.message || 'Bir hata oluştu.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleDrilldown = (key: string, params?: any) => {
    setDrilldownKey(key);
    setDrilldownParams(params || {});
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader
        title="Yönetici Özeti"
        subtitle="Platform büyümesi, kullanıcı aktivitesi, gelir, ürün kullanımı ve sistem sağlığının genel görünümü."
        reportType="EXECUTIVE_OVERVIEW"
        onFilterChange={fetchOverview}
      />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />

        <main className="flex-1 space-y-8 w-full">
          {loading && (
            <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/40 rounded-2xl border border-white/5">
              Rapor metrikleri yükleniyor...
            </div>
          )}

          {error && (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 font-bold text-xs">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Executive KPIs Grid */}
              {Array.isArray(data.kpis) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.kpis.map((kpi: any) => (
                    <ReportKpiCard
                      key={kpi.key}
                      title={kpi.title}
                      value={kpi.value}
                      formattedValue={kpi.formattedValue}
                      changePercentage={kpi.changePercentage}
                      trend={kpi.trend}
                      alertLevel={kpi.alertLevel}
                      drilldownKey={kpi.drilldownKey}
                      drilldownParams={kpi.drilldownParams}
                      onDrilldownClick={handleDrilldown}
                    />
                  ))}
                </div>
              )}

              {/* Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Package Breakdown */}
                {data.packageDistribution && (
                  <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-200">Paket Dağılımı & Abone Yapısı</h3>
                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                        <span className="text-slate-400">Tanışma (Ücretsiz)</span>
                        <strong className="text-slate-200">{data.packageDistribution.tanismaUsers || 0}</strong>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                        <span className="text-orange-400 font-bold">Yetkin (Standard)</span>
                        <strong className="text-orange-400">{data.packageDistribution.yetkinUsers || 0}</strong>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                        <span className="text-purple-400 font-bold">Profesyonel (Pro)</span>
                        <strong className="text-purple-400">{data.packageDistribution.profesyonelUsers || 0}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                {data.financialSummary && (
                  <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-200">Finansal & Marj Özeti</h3>
                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                        <span className="text-slate-400">MRR (Aylık Düzenli)</span>
                        <strong className="text-emerald-400">₺{(data.financialSummary.mrr || 0).toLocaleString('tr-TR')}</strong>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                        <span className="text-slate-400">ARR (Yıllık Düzenli)</span>
                        <strong className="text-emerald-400">₺{(data.financialSummary.arr || 0).toLocaleString('tr-TR')}</strong>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                        <span className="text-slate-400">Tahmini Brüt Marj</span>
                        <strong className="text-amber-400">%{data.financialSummary.grossMarginPct || 0}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <ReportDrilldownDrawer
        drilldownKey={drilldownKey}
        params={drilldownParams}
        onClose={() => setDrilldownKey(null)}
      />
    </div>
  );
}
