'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { ClubModeratorDrawer } from '../components/ClubModeratorDrawer';
import { ClubAssignModeratorModal } from '../components/ClubAssignModeratorModal';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';
import { ShieldCheck, Plus, User, Trash2 } from 'lucide-react';

export default function AdminClubModeratorsPage() {
  const [activeModerators, setActiveModerators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedModerator, setSelectedModerator] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchModerators = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/moderators`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveModerators(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Fetch moderators error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerators();
  }, []);

  const handleRevoke = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    if (!confirm('Bu kullanıcının moderatör yetkisini kaldırmak istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/moderators/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchModerators();
    } catch (e) {
      alert('Hata oluştu.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
            Tork Scout Club — Moderatör Yönetimi
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Topluluk içeriklerini incelemek ve kısıtlama yönetmek üzere yetkilendirilmiş Club moderatörleri.
          </p>
        </div>

        <button
          onClick={() => setShowAssignModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black px-4 py-2.5 rounded-xl transition flex items-center gap-2 self-start sm:self-auto cursor-pointer font-mono"
        >
          <Plus className="w-4 h-4" /> + Moderatör Ata
        </button>
      </div>

      {/* Active Moderators Main Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <h2 className="font-bold text-white text-sm font-sans">Aktif Club Moderatörleri</h2>
          </div>
          <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full font-mono">
            {activeModerators.length} Moderatör Yetkili
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Moderatörler yükleniyor...</div>
        ) : activeModerators.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">
            Henüz atanmış yetkili moderatör bulunmuyor. Gösterilen "+ Moderatör Ata" butonu ile yetkilendirme yapabilirsiniz.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 font-mono">
                <tr>
                  <th className="p-4">Moderatör (Ad Soyad — E-posta)</th>
                  <th className="p-4">Atayan Yönetici</th>
                  <th className="p-4">Atanma Tarihi</th>
                  <th className="p-4">Yetki Durumu</th>
                  <th className="p-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {activeModerators.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedModerator(m)}
                    className="hover:bg-white/[0.04] transition cursor-pointer"
                  >
                    <td className="p-4 font-bold text-white">
                      <div>{m.userFormatted || m.user?.username || 'Moderatör'}</div>
                      <div className="text-[11px] text-slate-400 font-normal font-mono">{m.user?.email}</div>
                    </td>
                    <td className="p-4 text-slate-300 font-mono text-[11px]">
                      {m.assignedByFormatted || m.assignedByAdmin?.username || 'Sistem'}
                    </td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">
                      {new Date(m.assignedAt || m.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="p-4 font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        YETKİLİ MODERATÖR
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono space-x-2 whitespace-nowrap">
                      <button
                        onClick={(e) => handleRevoke(e, m.userId || m.user?.id)}
                        className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        Moderatörlüğü Kaldır
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reusable Components */}
      <ClubAssignModeratorModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onRefresh={fetchModerators}
      />

      <ClubModeratorDrawer
        moderator={selectedModerator}
        isOpen={!!selectedModerator}
        onClose={() => setSelectedModerator(null)}
        onRefresh={fetchModerators}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
      />

      {selectedUserId && (
        <AdminUserDrawer
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={fetchModerators}
        />
      )}
    </div>
  );
}
