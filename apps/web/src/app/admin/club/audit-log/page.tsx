'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { ClubAuditDetailDrawer } from '../components/ClubAuditDetailDrawer';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';
import { ShieldCheck, User } from 'lucide-react';

export default function AdminClubAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchLogs = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/moderation-log?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Fetch audit log error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
          Tork Scout Club — Yönetim Audit Log Kayıtları
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-1">
          Moderatörler ve yöneticiler tarafından gerçekleştirilen tüm onay, gizleme ve kısıtlama eylemlerinin salt-okunur dökümü.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-xs font-bold font-sans">Audit Log Kayıtları Yükleniyor...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
          <p className="text-xs text-slate-400 font-sans">Henüz kaydedilmiş audit log bulunmuyor.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 font-mono">
                <tr>
                  <th className="p-4">Eylemi Yapan</th>
                  <th className="p-4">Aksiyon Kodu</th>
                  <th className="p-4">Hedef Türü</th>
                  <th className="p-4">Neden / Açıklama</th>
                  <th className="p-4 text-right">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedAuditLog(log)}
                    className="hover:bg-white/[0.04] transition cursor-pointer font-mono"
                  >
                    <td className="p-4 font-bold text-orange-400 font-sans">
                      {log.actor?.username || log.actor?.firstName || 'Yönetici'}
                    </td>
                    <td className="p-4 font-mono font-bold text-white">{log.actionType || log.action}</td>
                    <td className="p-4 text-slate-400">{log.targetType || 'Club Entity'}</td>
                    <td className="p-4 text-slate-300 font-sans max-w-xs truncate">{log.reason || '—'}</td>
                    <td className="p-4 text-right font-mono text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawers */}
      <ClubAuditDetailDrawer
        log={selectedAuditLog}
        isOpen={!!selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
      />

      {selectedUserId && (
        <AdminUserDrawer
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={fetchLogs}
        />
      )}
    </div>
  );
}
