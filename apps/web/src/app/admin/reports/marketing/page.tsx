'use client';
import React, { useEffect, useState } from 'react';
import { ReportHeader } from '../components/ReportHeader';
import { ReportSidebar } from '../components/ReportSidebar';
import { ReportKpiCard } from '../components/ReportKpiCard';
import { fetchReportApi } from '@/utils/apiConfig';

export default function MarketingReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fetchMarketing = () => {
    fetchReportApi('/admin/reports/marketing')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMarketing();
  }, []);

  const handleImportAdSpend = async () => {
    try {
      const parsed = JSON.parse(importJson);
      const res = await fetchReportApi('/admin/reports/marketing/ad-spend/import', {
        method: 'POST',
        body: JSON.stringify({ records: Array.isArray(parsed) ? parsed : [parsed] }),
      });
      if (!res.ok) throw new Error('Aktarım başarısız');
      const d = await res.json();
      setImportStatus(`Başarıyla ${d.importedCount} harcama kaydı aktarıldı!`);
      setImportJson('');
      fetchMarketing();
    } catch (e: any) {
      setImportStatus(`Hata: ${e.message}`);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader title="Pazarlama Metrikleri, ROAS & CAC Analitiği" subtitle="Google, Meta ve TikTok reklam harcamaları ile gerçek müşteri edinme maliyeti." />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />
        <main className="flex-1 space-y-8 w-full">
          {loading && <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5">Yükleniyor...</div>}
          {data && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {data.kpis.map((kpi: any) => (
                  <ReportKpiCard key={kpi.key} title={kpi.title} value={kpi.value} formattedValue={kpi.formattedValue} trend={kpi.trend} />
                ))}
              </div>

              {/* Channel Breakdown */}
              <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200">Kanal Bazlı Reklam Harcaması</h3>
                <div className="space-y-2 font-mono text-xs">
                  {data.channelBreakdown.map((ch: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-white/5">
                      <div>
                        <span className="text-slate-200 font-sans font-bold block">{ch.channel}</span>
                        <span className="text-slate-500">{ch.registrations} Kayıt</span>
                      </div>
                      <strong className="text-emerald-400">₺{ch.spend.toLocaleString('tr-TR')}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ad Spend Batch Import Interface */}
              <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200">Reklam Harcaması İçe Aktar (AdSpend Import)</h3>
                <p className="text-xs text-slate-400">Google Ads veya Meta harcamalarınızı JSON formatında yapıştırarak ekleyebilirsiniz.</p>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder={`[\n  { "date": "2026-08-01", "channel": "GOOGLE_ADS", "campaignName": "Arama Kampanyası", "spendAmount": 1500.0 }\n]`}
                  className="w-full h-28 bg-slate-950 border border-white/10 p-3 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-orange-500/50"
                />
                <div className="flex justify-between items-center">
                  <button
                    onClick={handleImportAdSpend}
                    disabled={!importJson.trim()}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-bold text-xs text-white rounded-xl transition-all disabled:opacity-50"
                  >
                    Harcamayı Kaydet
                  </button>
                  {importStatus && <span className="text-xs text-emerald-400 font-bold">{importStatus}</span>}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
