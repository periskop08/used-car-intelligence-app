'use client';

import React, { useEffect, useState } from 'react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchLogs = () => {
    setLoading(true);
    fetch(`${API_URL}/admin-approvals/audit-logs`)
      .then((res) => {
        if (!res.ok) throw new Error('Yükleme hatası.');
        return res.json();
      })
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-200">AUDIT LOGS</h1>
        <p className="text-sm text-slate-400 mt-1">Sistemdeki tüm admin onay, red ve durum geçiş günlüklerini inceleyin.</p>
      </div>

      <div className="border border-slate-800 bg-slate-950/10 p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Denetim Günlük Tablosu</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Yükleniyor...</p>
        ) : error ? (
          <p className="text-sm text-red-500">Hata: {error}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500">Hiç günlük kaydı bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Admin/Kullanıcı</th>
                  <th className="py-3 px-4">Eylem (Action)</th>
                  <th className="py-3 px-4">Ayrıntılar (Details)</th>
                  <th className="py-3 px-4">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800/40 hover:bg-slate-800/10 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{log.user?.email || 'Sistem'}</div>
                      <div className="text-xs text-slate-500 font-mono">{log.userId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-bold font-mono bg-orange-950/40 text-orange-400 px-2.5 py-1 rounded border border-orange-500/10">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs max-w-md break-words">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
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
