'use client';

import React, { useEffect, useState } from 'react';
import { History, Search, Filter, Shield, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminGlobalAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Selected Log Diff Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (entityTypeFilter) params.append('entityType', entityTypeFilter);
    params.append('page', page.toString());
    params.append('limit', '20');

    fetch(`${API_BASE_URL}/admin/audit-logs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Audit log kayıtları alınamadı.');
        return res.json();
      })
      .then((data) => {
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotalLogs(data.total || 0);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityTypeFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Sistem Audit Log Kayıtları</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Yöneticiler ve sistem tarafından gerçekleştirilen tüm aksiyonlar ve veri değişiklik geçmişi ({totalLogs} kayıt).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          fetchLogs();
        }}
        className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap gap-4 items-center justify-between"
      >
        <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Aksiyon, e-posta veya varlık ID ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="">Tüm Varlık Türleri</option>
            <option value="VehicleVariant">VehicleVariant</option>
            <option value="User">User</option>
            <option value="VehicleListing">VehicleListing</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Filtrele
          </button>
        </div>
      </form>

      {/* Audit Logs Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Audit log kayıtları yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-400 font-bold text-xs">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Aradığınız kriterlerde audit log kaydı bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Aksiyon</th>
                  <th className="p-4">Varlık (Entity)</th>
                  <th className="p-4">Yönetici</th>
                  <th className="p-4">Tarih</th>
                  <th className="p-4 text-right">Detay Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.03] transition">
                    <td className="p-4 font-mono font-bold text-orange-400">{log.action}</td>
                    <td className="p-4 font-mono text-slate-300">
                      <div>{log.entityType}</div>
                      <div className="text-[10px] text-slate-500">{log.entityId.slice(0, 10)}...</div>
                    </td>
                    <td className="p-4 font-sans text-slate-300 font-bold">{log.adminEmail || log.adminUserId}</td>
                    <td className="p-4 font-mono text-slate-400">{new Date(log.createdAt).toLocaleString('tr-TR')}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-500 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        İncele →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>
            Sayfa <strong>{page}</strong> / {totalPages} (Toplam {totalLogs} log)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* DIFF MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-2xl w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest">
                  {selectedLog.action}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">Audit Log Değişiklik Detayı</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Önceki Durum (Before)</span>
                <pre className="text-rose-300 text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.beforeState || selectedLog.before || {}, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Sonraki Durum (After)</span>
                <pre className="text-emerald-300 text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.afterState || selectedLog.after || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
