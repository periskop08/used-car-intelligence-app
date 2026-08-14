'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { AdminUserDrawer } from '../components/AdminUserDrawer';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Pagination State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Single-Column Sorting State
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Reusable Canonical AdminUserDrawer State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortDirection) params.append('sortDirection', sortDirection);
    params.append('page', page.toString());
    params.append('limit', '15');

    fetch(`${API_BASE_URL}/users/admin/list?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Kullanıcı listesi alınamadı.');
        return res.json();
      })
      .then((data) => {
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        setTotalUsers(data.total || 0);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [page, sortBy, sortDirection]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleSortHeader = (key: string) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const renderSortIndicator = (key: string) => {
    if (sortBy !== key) {
      return <span className="text-slate-600 font-normal ml-1">↕</span>;
    }
    return sortDirection === 'asc' ? (
      <span className="text-orange-400 font-bold ml-1">↑</span>
    ) : (
      <span className="text-orange-400 font-bold ml-1">↓</span>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-orange-500" />
            <span>Kayıtlı Kullanıcı Yönetimi</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sisteme kayıtlı tüm alıcı, satıcı ve kurumsal kullanıcıların hesap durumları ve hak yönetimi.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 bg-slate-900 rounded-xl border border-white/10 text-slate-300">
            Toplam: <strong className="text-white">{totalUsers}</strong> Kullanıcı
          </div>
        </div>
      </div>

      {/* Clean Filter Bar (Search Only) */}
      <form onSubmit={handleSearchSubmit} className="p-4 bg-slate-900/80 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-3 justify-between items-center text-xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Ad, soyad, e-posta, tel veya müşteri no ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500 transition"
          />
        </div>

        <button
          type="submit"
          className="w-full md:w-auto px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Ara
        </button>
      </form>

      {/* Users Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Kullanıcı verileri yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-400 font-bold text-xs">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Aradığınız kriterlere uygun kullanıcı bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 select-none">
                <tr>
                  <th
                    onClick={() => handleSortHeader('customer')}
                    className="p-4 cursor-pointer hover:text-white transition"
                  >
                    Müşteri / No {renderSortIndicator('customer')}
                  </th>
                  <th
                    onClick={() => handleSortHeader('name')}
                    className="p-4 cursor-pointer hover:text-white transition"
                  >
                    Ad Soyad & İletişim {renderSortIndicator('name')}
                  </th>
                  <th
                    onClick={() => handleSortHeader('package')}
                    className="p-4 cursor-pointer hover:text-white transition"
                  >
                    Paket {renderSortIndicator('package')}
                  </th>
                  <th
                    onClick={() => handleSortHeader('createdAt')}
                    className="p-4 cursor-pointer hover:text-white transition"
                  >
                    Kayıt Tarihi {renderSortIndicator('createdAt')}
                  </th>
                  <th
                    onClick={() => handleSortHeader('listingCount')}
                    className="p-4 cursor-pointer hover:text-white transition"
                  >
                    İlanlar {renderSortIndicator('listingCount')}
                  </th>
                  <th
                    onClick={() => handleSortHeader('aiUsage')}
                    className="p-4 cursor-pointer hover:text-white transition"
                  >
                    AI Kullanımı {renderSortIndicator('aiUsage')}
                  </th>
                  <th
                    onClick={() => handleSortHeader('accountStatus')}
                    className="p-4 cursor-pointer hover:text-white transition"
                  >
                    Hesap Durumu {renderSortIndicator('accountStatus')}
                  </th>
                  <th className="p-4 text-right">
                    Aksiyon
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className="hover:bg-white/[0.03] transition cursor-pointer group"
                  >
                    <td className="p-4 font-mono font-bold text-orange-400">{u.customerNo}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-200 group-hover:text-white transition">{u.fullName}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{u.phone}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          u.subscriptionTier === 'Profesyonel Paket'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : u.subscriptionTier === 'Yetkin Paket'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-slate-800 text-slate-400 border border-white/10'
                        }`}
                      >
                        {u.subscriptionTier}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-mono">
                      {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="p-4 font-mono text-slate-300">{u.activeListingCount} ilan</td>
                    <td className="p-4 font-mono text-slate-300">{u.aiReportCount} işlem</td>
                    <td className="p-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">
                          <UserCheck className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-bold">
                          <UserX className="w-3 h-3" /> Pasif
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserId(u.id);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-orange-500 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
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
            Sayfa <strong>{page}</strong> / {totalPages} (Toplam {totalUsers} kullanıcı)
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

      {/* CANONICAL REUSABLE ADMIN USER DRAWER */}
      <AdminUserDrawer
        userId={selectedUserId}
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onRefresh={fetchUsers}
      />
    </div>
  );
}
