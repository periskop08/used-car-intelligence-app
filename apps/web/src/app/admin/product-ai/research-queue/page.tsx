'use client';

import React, { useEffect, useState } from 'react';
import { Bot, RefreshCw, Play, XCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminResearchQueuePage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchJobs = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/research/jobs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Araştırma kuyruğu işleri yüklenemedi.');
        return res.json();
      })
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRetryJob = async (jobId: string) => {
    setActionLoading(jobId);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${API_BASE_URL}/research/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('İş yeniden başlatılamadı.');
      fetchJobs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('Bu araştırma işini iptal etmek istediğinize emin misiniz?')) return;
    setActionLoading(jobId);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${API_BASE_URL}/research/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('İş iptal edilemedi.');
      fetchJobs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">AI Araştırma Kuyruğu</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Araç kronik sorunları ve web araştırma işlerinin canlı kuyruk durumu ({jobs.length} iş).
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Jobs Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Kuyruktaki işler yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-400 font-bold text-xs">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Kuyrukta aktif araştırma işi bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">İş ID / Kapsam</th>
                  <th className="p-4">Araç / Varyant</th>
                  <th className="p-4">Kullanıcı / Talep Eden</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4">Oluşturulma Tarihi</th>
                  <th className="p-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-white/[0.03] transition">
                    <td className="p-4 font-mono">
                      <div className="font-bold text-orange-400">{j.id.slice(0, 8)}...</div>
                      <div className="text-[10px] text-slate-500">{j.scope || 'FULL_REPORT'}</div>
                    </td>
                    <td className="p-4 font-bold text-white">
                      {j.vehicleVariant?.brand?.name} {j.vehicleVariant?.model?.name} ({j.vehicleVariant?.year || '-'})
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {j.userId ? `User-${j.userId.slice(0, 6)}` : 'Sistem / Anonim'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold ${
                          j.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : j.status === 'FAILED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : j.status === 'RUNNING'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {new Date(j.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(j.status === 'FAILED' || j.status === 'CANCELLED') && (
                          <button
                            onClick={() => handleRetryJob(j.id)}
                            disabled={actionLoading === j.id}
                            className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg font-bold text-[11px] transition cursor-pointer"
                          >
                            Tekrar Dene
                          </button>
                        )}
                        {(j.status === 'QUEUED' || j.status === 'RUNNING') && (
                          <button
                            onClick={() => handleCancelJob(j.id)}
                            disabled={actionLoading === j.id}
                            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg font-bold text-[11px] transition cursor-pointer"
                          >
                            İptal Et
                          </button>
                        )}
                      </div>
                    </td>
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
