'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Search } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminFinancePackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_BASE_URL}/admin/reports/finance/one-time-packages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPackages(Array.isArray(data) ? data : data.purchases || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Tek Seferlik Paket Satışları</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Kullanıcılar tarafından satın alınan tekil AI rapor hakları ve ek özellik paketleri.
        </p>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Paket satışları yükleniyor...</div>
        ) : packages.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Henüz tek seferlik paket satışı bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Satın Alan Kullanıcı</th>
                  <th className="p-4">Paket Adı</th>
                  <th className="p-4">Tutar</th>
                  <th className="p-4">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans font-mono">
                {packages.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition">
                    <td className="p-4 font-bold text-white">{p.user?.email || p.userId}</td>
                    <td className="p-4 text-orange-400 font-bold">{p.packageName || 'Ek AI Rapor Paketi'}</td>
                    <td className="p-4 text-emerald-400 font-bold">₺{Number(p.amount || 0).toLocaleString('tr-TR')}</td>
                    <td className="p-4 text-slate-400">{new Date(p.createdAt).toLocaleDateString('tr-TR')}</td>
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
