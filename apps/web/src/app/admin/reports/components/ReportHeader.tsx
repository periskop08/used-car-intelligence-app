'use client';
import React, { useState } from 'react';
import { fetchReportApi } from '@/utils/apiConfig';

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  reportType?: string;
  onFilterChange?: (filters: any) => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subtitle,
  reportType = 'OVERVIEW',
  onFilterChange,
}) => {
  const [period, setPeriod] = useState('LAST_30_DAYS');
  const [compare, setCompare] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'CSV' | 'XLSX'>('CSV');
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setPeriod(val);
    if (onFilterChange) onFilterChange({ period: val, compare });
  };

  const handleCompareToggle = () => {
    const next = !compare;
    setCompare(next);
    if (onFilterChange) onFilterChange({ period, compare: next });
  };

  const triggerExport = async () => {
    setIsExporting(true);
    setExportStatus('Dışa aktarma başlatılıyor...');
    try {
      const res = await fetchReportApi('/admin/reports/exports', {
        method: 'POST',
        body: JSON.stringify({
          reportType,
          format: exportFormat,
          filters: { period },
        }),
      });

      if (!res.ok) throw new Error('Export başlatılamadı');
      const data = await res.json();
      setExportStatus(`İşlem oluşturuldu. İş ID: ${data.id}. Hazırlanıyor...`);

      // Poll status
      setTimeout(async () => {
        const downloadRes = await fetchReportApi(`/admin/reports/exports/${data.id}/download`);
        if (downloadRes.ok) {
          const blob = await downloadRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report_${reportType}_${Date.now()}.${exportFormat.toLowerCase()}`;
          a.click();
          setExportStatus('İndirme tamamlandı!');
        } else {
          setExportStatus('Dosya hazırlandı, indirme başlatılamadı.');
        }
        setIsExporting(false);
      }, 2000);
    } catch (e: any) {
      setExportStatus(`Hata: ${e.message}`);
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <span>📊</span>
          <span>{title}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Date Selector */}
        <select
          value={period}
          onChange={handlePeriodChange}
          className="bg-slate-950 border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-orange-500/50"
        >
          <option value="TODAY">Bugün (Istanbul UTC+3)</option>
          <option value="YESTERDAY">Dün</option>
          <option value="LAST_7_DAYS">Son 7 Gün</option>
          <option value="LAST_30_DAYS">Son 30 Gün</option>
          <option value="THIS_MONTH">Bu Ay</option>
          <option value="LAST_MONTH">Geçen Ay</option>
          <option value="THIS_YEAR">Bu Yıl</option>
        </select>

        {/* Compare Period Toggle */}
        <button
          onClick={handleCompareToggle}
          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
            compare
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              : 'bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200'
          }`}
        >
          Önceki Dönem Kıyaslama: {compare ? 'AÇIK' : 'KAPALI'}
        </button>

        {/* Export Button & Modal */}
        <div className="relative">
          <button
            onClick={triggerExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
          >
            <span>📥</span>
            <span>{isExporting ? 'Hazırlanıyor...' : 'Dışa Aktar (CSV/XLSX)'}</span>
          </button>
          {exportStatus && (
            <div className="absolute right-0 top-12 z-50 bg-slate-950 border border-white/10 p-3 rounded-xl shadow-2xl text-xs text-slate-300 w-64">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-orange-400">Export Durumu</span>
                <button onClick={() => setExportStatus(null)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              <p>{exportStatus}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
