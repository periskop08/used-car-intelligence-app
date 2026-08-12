'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Bot, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminAiReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/admin/reports/product/ai-reports`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('AI rapor istatistikleri alınamadı.');
        return res.json();
      })
      .then((data) => setReports(Array.isArray(data) ? data : data.reports || []))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">AI İlan & Araç Raporları Operasyonu</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Üretilen canlı AI araç risk analiz raporları,SAFE_FALLBACK durumları ve model yanıt kalitesi.
          </p>
        </div>
        <button
          onClick={fetchReports}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">AI rapor verileri yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-400 font-bold text-xs">{error}</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Henüz kayıtlı AI raporu bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Rapor ID</th>
                  <th className="p-4">Araç / Modul</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4">Versiyon / Cache</th>
                  <th className="p-4">Oluşturulma Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.03] transition">
                    <td className="p-4 font-mono font-bold text-orange-400">{r.id.slice(0, 8)}...</td>
                    <td className="p-4 font-bold text-white">{r.mode || 'FULL_REPORT'}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono text-[10px] font-bold">
                        {r.status || 'COMPLETED'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">{r.reportVersion || 'v1.0'}</td>
                    <td className="p-4 font-mono text-slate-400">{new Date(r.createdAt || r.generatedAt || Date.now()).toLocaleString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
