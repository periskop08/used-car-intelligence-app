'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/utils/apiConfig';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';
import { ClubAddRestrictionModal } from '../components/ClubAddRestrictionModal';
import { ClubAssignModeratorModal } from '../components/ClubAssignModeratorModal';
import { Search, User, ShieldAlert, ShieldCheck, MessageSquare, Plus } from 'lucide-react';

export default function AdminClubUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [restrictionUserId, setRestrictionUserId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchUsers = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());
      queryParams.set('limit', '50');

      const res = await fetch(`${API_BASE_URL}/admin/club/users?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      }
    } catch (e) {
      console.error('Fetch club users error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
            Tork Scout Club — Kullanıcı Listesi & Yönetimi
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Canonical Club üyelerinin müşteri numaraları, erişim durumları, yorum sayıları ve kısıtlama geçmişi.
          </p>
        </div>

        <button
          onClick={() => setShowAssignModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black px-4 py-2.5 rounded-xl transition flex items-center gap-2 self-start sm:self-auto cursor-pointer font-mono"
        >
          <Plus className="w-4 h-4" /> + Moderatör Ata
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Müşteri No (TS-2608-000123), Ad, Soyad veya E-posta..."
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl transition cursor-pointer disabled:opacity-50 font-mono"
        >
          Filtrele
        </button>
      </form>

      {/* Users Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Club üyeleri yükleniyor...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs font-sans">
            Arama kriterine uygun Club kullanıcısı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 font-mono">
                <tr>
                  <th className="p-4">Müşteri No</th>
                  <th className="p-4">Ad Soyad / Kullanıcı</th>
                  <th className="p-4">Aktif Paket</th>
                  <th className="p-4">Club Durumu</th>
                  <th className="p-4">Toplam Yorum</th>
                  <th className="p-4">Moderatör Durumu</th>
                  <th className="p-4">Kısıtlama Durumu</th>
                  <th className="p-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {users.map((u) => {
                  const isMuted = u.isMuted;
                  const isBanned = u.isBanned;
                  const isMod = u.isModerator;

                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className="hover:bg-white/[0.04] transition cursor-pointer font-mono"
                    >
                      <td className="p-4 font-bold text-orange-400 font-mono text-xs">{u.customerNo}</td>
                      <td className="p-4 text-white font-sans font-bold">
                        <div>{u.displayName}</div>
                        <div className="text-[11px] text-slate-400 font-normal font-mono">{u.email}</div>
                      </td>
                      <td className="p-4">
                        {u.badge && (
                          <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold text-[10px]">
                            {u.badge.label}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-300">
                        {isBanned ? (
                          <span className="text-rose-400 font-bold">Club Engelli</span>
                        ) : isMuted ? (
                          <span className="text-amber-400 font-bold">Susturuldu</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Aktif Üye</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-300">{u.commentCount || 0} Yorum</td>
                      <td className="p-4 font-mono">
                        {isMod ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            MODERATÖR
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Üye</span>
                        )}
                      </td>
                      <td className="p-4 font-mono">
                        {isBanned ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                            YASAKLI (BAN)
                          </span>
                        ) : isMuted ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                            SUSTURULDU (MUTE)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            TEMİZ
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserId(u.id);
                          }}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-orange-400 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          Kullanıcıyı Gör
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRestrictionUserId(u.id);
                          }}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          Kısıtla
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals and Drawers */}
      <ClubAssignModeratorModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onRefresh={fetchUsers}
      />

      {restrictionUserId && (
        <ClubAddRestrictionModal
          isOpen={!!restrictionUserId}
          preselectedUserId={restrictionUserId}
          onClose={() => setRestrictionUserId(null)}
          onRefresh={fetchUsers}
        />
      )}

      {selectedUserId && (
        <AdminUserDrawer
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  );
}
