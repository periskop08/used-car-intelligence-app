'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Store,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { IsiCepteProvider } from '@/types/isiCepteDomain';
import IsiCepteProviderDetailDrawer from '../components/IsiCepteProviderDetailDrawer';

export default function IsiCepteProvidersPage() {
  const [providers, setProviders] = useState<IsiCepteProvider[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [membershipStatus, setMembershipStatus] = useState('');
  const [optInFilter, setOptInFilter] = useState('');
  const [showcaseFilter, setShowcaseFilter] = useState('');
  const [nationalFilter, setNationalFilter] = useState('');

  // Selected Provider for Shared Right-Side Read-Only Admin Detail Drawer
  const [selectedProvider, setSelectedProvider] = useState<IsiCepteProvider | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        membershipStatus,
        optIn: optInFilter,
        showcaseFilter,
        nationalFilter,
      });

      const res = await fetch(`${API_BASE_URL}/admin/isi-cepte/providers?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProviders(Array.isArray(data.items) ? data.items : []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setProviders([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('İşi Cepte providers fetch error:', err);
      setProviders([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, membershipStatus, optInFilter, showcaseFilter, nationalFilter]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">İşletmeler ve Ustalar</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            İşi Cepte sisteminden senkronize edilen yetkili servis, usta ve ekspertiz işletmelerinin görünürlük ve hak yönetimi
            <span className="text-cyan-400 font-bold font-mono ml-2">(Toplam {totalCount} işletme)</span>
          </p>
        </div>
        <button
          onClick={fetchProviders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-cyan-500/50 transition">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="İşletme adı veya İşi Cepte Provider ID ile ara..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={membershipStatus}
              onChange={(e) => {
                setMembershipStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer"
            >
              <option value="">Tüm Üyelik Durumları</option>
              <option value="ACTIVE">Aktif Üye</option>
              <option value="INACTIVE">Pasif</option>
              <option value="SUSPENDED">Askıda</option>
            </select>

            <select
              value={optInFilter}
              onChange={(e) => {
                setOptInFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer"
            >
              <option value="">Tüm TS Tercihleri</option>
              <option value="true">Listelenmek İstiyor (Opt-In)</option>
              <option value="false">Opt-Out</option>
            </select>

            <select
              value={showcaseFilter}
              onChange={(e) => {
                setShowcaseFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer"
            >
              <option value="">Vitrin Filtresi</option>
              <option value="true">Vitrin Aktif</option>
              <option value="false">Vitrin Yok</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Truthful Empty State */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>İşi Cepte senkronize işletme verileri yükleniyor...</span>
          </div>
        ) : providers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Store className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Henüz TorqueScout'a aktarılmış İşi Cepte işletmesi bulunmuyor.</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              İşi Cepte senkronizasyon servisi bağlandığında listelenmek isteyen üye işletmeler otomatik olarak burada görüntülenecektir.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 font-mono">
                  <tr>
                    <th className="p-4">İşletme / Provider ID</th>
                    <th className="p-4">Üyelik</th>
                    <th className="p-4">TS Listeleme</th>
                    <th className="p-4">Bölge</th>
                    <th className="p-4">Hizmetler</th>
                    <th className="p-4">Markalar</th>
                    <th className="p-4">Vitrin</th>
                    <th className="p-4">Ülke Geneli</th>
                    <th className="p-4 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {providers.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProvider(p)}
                      className={`hover:bg-white/[0.04] transition cursor-pointer ${
                        selectedProvider?.id === p.id ? 'bg-cyan-500/10 border-l-2 border-l-cyan-400' : ''
                      }`}
                    >
                      <td className="p-4 font-mono">
                        <div className="font-bold text-white text-xs">{p.businessName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                          {p.isicepteProviderId}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            p.membershipStatus === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : p.membershipStatus === 'SUSPENDED'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {p.membershipStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            p.torqueScoutOptIn
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {p.torqueScoutOptIn ? 'EVET (Opt-In)' : 'HAYIR'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-[11px]">
                        {p.countryCode} • {p.regionCode} {p.district ? `/ ${p.district}` : ''}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {p.autoServiceCategories && p.autoServiceCategories.length > 0 ? (
                            p.autoServiceCategories.slice(0, 2).map((c) => (
                              <span key={c.id} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 font-mono text-[10px]">—</span>
                          )}
                          {p.autoServiceCategories && p.autoServiceCategories.length > 2 && (
                            <span className="text-[10px] text-slate-500 font-mono">+{p.autoServiceCategories.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {p.supportedVehicleBrands && p.supportedVehicleBrands.length > 0 ? (
                            p.supportedVehicleBrands.slice(0, 2).map((b, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                                {b.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 font-mono text-[10px]">—</span>
                          )}
                          {p.supportedVehicleBrands && p.supportedVehicleBrands.length > 2 && (
                            <span className="text-[10px] text-slate-500 font-mono">+{p.supportedVehicleBrands.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {p.showcase?.active ? (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-mono font-bold">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {p.nationalVisibility?.active ? (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-[10px] font-mono font-bold">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProvider(p);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          İncele →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Sayfa <strong className="text-white">{page}</strong> / {totalPages} (Toplam {totalCount} işletme)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-300 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-300 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REUSABLE SHARED PROVIDER DETAIL DRAWER */}
      <IsiCepteProviderDetailDrawer
        provider={selectedProvider}
        onClose={() => setSelectedProvider(null)}
        initialSection="GENERAL"
      />
    </div>
  );
}
