'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ReportHeader } from '../components/ReportHeader';
import { ReportSidebar } from '../components/ReportSidebar';
import { ReportKpiCard } from '../components/ReportKpiCard';
import { fetchReportApi } from '@/utils/apiConfig';

function ClubReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentView = searchParams.get('view') || 'engagement';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchReportApi(`/admin/reports/club?view=${currentView}`)
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
  }, [currentView]);

  const handleTabChange = (view: string) => {
    router.push(`/admin/reports/club?view=${view}`);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'content':
        return 'Club İçerik Performansı';
      case 'moderation':
        return 'Club Moderasyon Analitiği';
      case 'polls':
        return 'Club Anket ve Oylama Analitiği';
      case 'engagement':
      default:
        return 'Club Kullanım ve Etkileşim';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader
        title={getViewTitle()}
        subtitle="Club topluluk etkileşimleri, anket performansları, aktif mute/ban ve moderasyon kayıtları."
      />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {/* Sub-View Tabs */}
          <div className="flex border-b border-white/10 gap-2 pb-2 text-xs font-bold font-mono overflow-x-auto">
            <button
              onClick={() => handleTabChange('engagement')}
              className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                currentView === 'engagement'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Kullanım ve Etkileşim
            </button>
            <button
              onClick={() => handleTabChange('content')}
              className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                currentView === 'content'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              İçerik Performansı
            </button>
            <button
              onClick={() => handleTabChange('polls')}
              className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                currentView === 'polls'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📊 Anket Analitiği
            </button>
            <button
              onClick={() => handleTabChange('moderation')}
              className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                currentView === 'moderation'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Moderasyon
            </button>
          </div>

          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {error && <div className="p-6 text-center text-rose-400 bg-rose-950/40 rounded-2xl border border-rose-800/40">{error}</div>}
          {data && Array.isArray(data.kpis) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.kpis.map((kpi: any) => (
                <ReportKpiCard key={kpi.key} title={kpi.title} value={kpi.value} trend={kpi.trend} alertLevel={kpi.alertLevel} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ClubReportsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Yükleniyor...</div>}>
      <ClubReportsContent />
    </Suspense>
  );
}
