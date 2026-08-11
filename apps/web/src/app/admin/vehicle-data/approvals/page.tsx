'use client';

import React, { useEffect, useState } from 'react';
import { Check, X, CheckCircle, Clock } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminVehicleApprovalsPage() {
  const [pendingVariants, setPendingVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/vehicles/admin/pending`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Onay bekleyen araçlar yüklenemedi.');
        return res.json();
      })
      .then((data) => setPendingVariants(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/admin/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Onaylama işlemi başarısız.');
      fetchPending();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Lütfen reddetme gerekçesini girin:');
    if (!reason) return;

    setActionLoading(id);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/admin/${id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Reddetme işlemi başarısız.');
      fetchPending();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-6 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Kullanıcı Araç Önerileri ve Onayları</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Kullanıcılar tarafından sistemde eksik bulunup önerilen {pendingVariants.length} araç varyantının onay ve red yönetimi.
        </p>
      </div>

      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Onay bekleyen araçlar yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-400 font-bold text-xs">{error}</div>
        ) : pendingVariants.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Şu an onay bekleyen araç önerisi bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Marka / Model</th>
                  <th className="p-4">Yıl / Kasa</th>
                  <th className="p-4">Motor / Versiyon</th>
                  <th className="p-4">Donanım</th>
                  <th className="p-4">Öneren Kullanıcı</th>
                  <th className="p-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {pendingVariants.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.03] transition">
                    <td className="p-4 font-bold text-white">
                      {v.brand?.name} {v.model?.name}
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      {v.year} • {v.bodyType || '-'}
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      {v.engine?.code} ({v.engine?.horsepower}hp)
                    </td>
                    <td className="p-4 font-mono text-orange-400 font-bold">{v.trim?.name}</td>
                    <td className="p-4 font-mono text-slate-400">
                      {v.createdBy ? `${v.createdBy.email}` : 'Anonim'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(v.id)}
                          disabled={actionLoading === v.id}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold text-[11px] transition cursor-pointer"
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => handleReject(v.id)}
                          disabled={actionLoading === v.id}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl font-bold text-[11px] transition cursor-pointer"
                        >
                          Reddet
                        </button>
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
