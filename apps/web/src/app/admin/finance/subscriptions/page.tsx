'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminFinanceSubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_BASE_URL}/admin/reports/finance/subscriptions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setSubs(Array.isArray(data) ? data : data.subscriptions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Aktif Abonelikler Listesi</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Platformdaki aktif Standard, Pro ve Profesyonel aboneliklerinin detaylı yönetimi.
        </p>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Abonelikler yükleniyor...</div>
        ) : subs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Henüz aktif abonelik kaydı bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Kullanıcı</th>
                  <th className="p-4">Plan / Paket</th>
                  <th className="p-4">Başlangıç</th>
                  <th className="p-4">Yenileme Tarihi</th>
                  <th className="p-4">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.03] transition font-mono">
                    <td className="p-4 font-bold text-white">{s.user?.email || s.userId}</td>
                    <td className="p-4 text-orange-400 font-bold">{s.plan?.name || s.tier}</td>
                    <td className="p-4 text-slate-400">{new Date(s.createdAt).toLocaleDateString('tr-TR')}</td>
                    <td className="p-4 text-slate-400">{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('tr-TR') : 'Süresiz'}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                        {s.status}
                      </span>
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
