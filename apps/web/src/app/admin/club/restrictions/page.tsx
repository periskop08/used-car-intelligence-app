'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/utils/apiConfig';
import { ClubRestrictionDrawer } from '../components/ClubRestrictionDrawer';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';
import { ShieldAlert, RotateCcw, User } from 'lucide-react';

export default function AdminClubRestrictionsPage() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get('type') || 'ALL';
  const statusFilter = searchParams.get('status') || 'ALL';

  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRestriction, setSelectedRestriction] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchRestrictions = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/club/restrictions?type=${encodeURIComponent(typeFilter)}&status=${encodeURIComponent(statusFilter)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRestrictions(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Fetch restrictions error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestrictions();
  }, [typeFilter, statusFilter]);

  const handleRevoke = async (e: React.MouseEvent, resId: string, isBan: boolean) => {
    e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    const msg = isBan ? 'Bu kullanıcının yasağını kaldırmak istediğinize emin misiniz?' : 'Bu kullanıcının susturmasını kaldırmak istediğinize emin misiniz?';
    if (!confirm(msg)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/restrictions/${resId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchRestrictions();
    } catch (e) {
      alert('İşlem başarısız.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
          Tork Scout Club — Susturma ve Ban Yönetimi
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-1">
          Görgü kuralları veya spam ihlali nedeniyle kısıtlanmış Club hesapları ve aktif kısıtlamalar.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {[
            { key: 'ALL', label: 'Tüm Kısıtlama Türleri' },
            { key: 'MUTE', label: 'Susturma (Mute)' },
            { key: 'BAN', label: 'Yasaklama (Ban)' },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/club/restrictions?type=${tab.key}&status=${statusFilter}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                typeFilter === tab.key
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {[
            { key: 'ALL', label: 'Tüm Kayıtlar' },
            { key: 'ACTIVE', label: 'Sadece Aktifler' },
          ].map((s) => (
            <Link
              key={s.key}
              href={`/admin/club/restrictions?type=${typeFilter}&status=${s.key}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === s.key
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Restrictions Main Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Kısıtlamalar yükleniyor...</div>
        ) : restrictions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">
            Seçili kısıt altında kısıtlama kaydı bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 font-mono">
                <tr>
                  <th className="p-4">Kullanıcı (Müşteri No — İsim)</th>
                  <th className="p-4">Tür</th>
                  <th className="p-4">Neden / Açıklama</th>
                  <th className="p-4">Uygulayan</th>
                  <th className="p-4">Tarih</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {restrictions.map((item) => {
                  const isMute = item.type === 'MUTE';
                  const isActive = !item.revokedAt;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedRestriction(item)}
                      className="hover:bg-white/[0.04] transition cursor-pointer"
                    >
                      <td className="p-4 font-bold text-white font-mono">
                        {item.userFormatted || item.user?.username || 'Kullanıcı'}
                      </td>
                      <td className="p-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isMute
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isMute ? 'SUSTURMA' : 'BAN'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 max-w-xs truncate">{item.reason || '—'}</td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {item.createdByFormatted || item.createdBy?.username || 'Sistem'}
                      </td>
                      <td className="p-4 font-mono text-slate-400 text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="p-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-700/40 text-slate-400 border border-white/10'
                          }`}
                        >
                          {isActive ? 'AKTİF' : 'KALDIRILDI'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono whitespace-nowrap">
                        {isActive && (
                          <button
                            onClick={(e) => handleRevoke(e, item.id, item.type === 'BAN')}
                            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            Kısıtlamayı Kaldır
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawers */}
      <ClubRestrictionDrawer
        restriction={selectedRestriction}
        isOpen={!!selectedRestriction}
        onClose={() => setSelectedRestriction(null)}
        onRefresh={fetchRestrictions}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
      />

      {selectedUserId && (
        <AdminUserDrawer
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={fetchRestrictions}
        />
      )}
    </div>
  );
}
