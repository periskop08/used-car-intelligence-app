"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/club/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white">Yönetim Audit Log Kayıtları</h2>
        <p className="text-xs text-slate-400">
          Moderatör ve adminler tarafından gerçekleştirilen tüm yönetimsel eylemlerin dökümü.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-xs font-bold">Audit Log Kayıtları Yükleniyor...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
          <p className="text-xs text-slate-400">Henüz kaydedilmiş audit log bulunmuyor.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 text-slate-400 uppercase font-mono text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-3">Eylemi Yapan</th>
                  <th className="p-3">Aksiyon</th>
                  <th className="p-3">Hedef Türü</th>
                  <th className="p-3">Neden / Açıklama</th>
                  <th className="p-3 text-right">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition">
                    <td className="p-3 font-bold text-orange-400">
                      {log.actor?.username || log.actor?.firstName || "Yönetici"}
                    </td>
                    <td className="p-3 font-mono font-bold text-white">{log.action}</td>
                    <td className="p-3 text-slate-400">{log.targetType}</td>
                    <td className="p-3 text-slate-300">{log.reason || "-"}</td>
                    <td className="p-3 text-right font-mono text-slate-500 text-[10px]">
                      {new Date(log.createdAt).toLocaleString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
