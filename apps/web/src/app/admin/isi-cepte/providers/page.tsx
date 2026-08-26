'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Store,
  RefreshCw,
  X,
  MapPin,
  Award,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  Clock,
  Phone,
  Mail,
  Building,
  Tag,
  Car,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { IsiCepteProvider } from '@/types/isiCepteDomain';

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

  // Selected Provider for Right-Side Read-Only Admin Detail Drawer
  const [selectedProvider, setSelectedProvider] = useState<IsiCepteProvider | null>(null);

  // ESC Key Listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProvider(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

      {/* READ-ONLY RIGHT-SIDE ADMIN DETAIL DRAWER */}
      {selectedProvider && (
        <div
          onClick={() => setSelectedProvider(null)}
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl h-full bg-[#0b0f19] border-l border-white/10 p-6 space-y-6 overflow-y-auto font-sans shadow-2xl animate-in slide-in-from-right duration-200"
          >
            {/* Drawer Header */}
            <div className="flex justify-between items-start pb-4 border-b border-white/10">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                  İşi Cepte Provider ID: {selectedProvider.isicepteProviderId}
                </span>
                <h2 className="text-lg font-black text-white">{selectedProvider.businessName}</h2>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>Veri Kaynağı: {selectedProvider.sourceSystem || 'İşi Cepte Sync'}</span>
                  <span>•</span>
                  <span className="text-emerald-400">Üyelik: {selectedProvider.membershipStatus}</span>
                  <span>•</span>
                  <span className="text-cyan-400">Listeleme: {selectedProvider.torqueScoutOptIn ? 'Açık' : 'Kapalı'}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProvider(null)}
                className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="Kapat (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-Only Informational Notice */}
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-300 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>
                İşletme profili ve ana veriler İşi Cepte sistemine aittir. Bu ekran yöneticiler için salt okunur (read-only) kontrol ve denetim görünümüdür.
              </span>
            </div>

            {/* Section 1: Temel Kimlik */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 font-mono text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Section 1 • Temel Kimlik</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px]">İşletme Adı</span>
                  <span className="text-white font-bold">{selectedProvider.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">İşi Cepte Provider ID</span>
                  <span className="text-cyan-400 font-bold">{selectedProvider.isicepteProviderId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TorqueScout Ref ID</span>
                  <span className="text-slate-400">{selectedProvider.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Kaynak Sistem</span>
                  <span className="text-slate-300">{selectedProvider.sourceSystem || 'İşi Cepte'}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Üyelik & TorqueScout Listeleme */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-3 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Section 2 • Üyelik & TorqueScout Listeleme</span>
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">İşi Cepte Üyeliği</span>
                  <span className="text-emerald-400 font-bold">{selectedProvider.membershipStatus || 'Bilinmiyor'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TorqueScout Opt-In</span>
                  <span className="text-cyan-400 font-bold">{selectedProvider.torqueScoutOptIn ? 'Açık (Opt-In)' : 'Kapalı (Opt-Out)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Yerel Görünürlük Durumu</span>
                  <span className="text-slate-300">{selectedProvider.localListingState || 'ELIGIBLE'}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Bölge */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Section 3 • Hizmet Bölgesi (Coğrafya)</span>
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Ülke</span>
                  <span className="text-white font-bold">{selectedProvider.countryCode || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">İl / Bölge</span>
                  <span className="text-white font-bold">{selectedProvider.regionCode || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">İlçe / Lokal Alan</span>
                  <span className="text-white font-bold">{selectedProvider.district || 'Tüm Bölge'}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Oto Hizmetleri */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Section 4 • Oto Hizmet Kategorileri</span>
              {selectedProvider.autoServiceCategories && selectedProvider.autoServiceCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedProvider.autoServiceCategories.map((c) => (
                    <span key={c.id} className="px-2.5 py-1 bg-slate-900 border border-white/10 text-cyan-300 rounded-lg text-xs font-medium flex items-center gap-1">
                      <Tag className="w-3 h-3 text-cyan-400" /> {c.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-xs font-mono">Hizmet bilgisi bulunmuyor.</div>
              )}
            </div>

            {/* Section 5: Hizmet Verilen Markalar */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Section 5 • Hizmet Verilen Markalar</span>
                <span className="text-[9px] text-slate-500 italic font-mono">Markaya hizmet veriyor (yetkili bayi ifadesi taşımaz)</span>
              </div>
              {selectedProvider.supportedVehicleBrands && selectedProvider.supportedVehicleBrands.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedProvider.supportedVehicleBrands.map((b, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-white/10 text-purple-300 rounded-lg text-xs font-medium flex items-center gap-1">
                      <Car className="w-3 h-3 text-purple-400" /> {b.name} markasına hizmet veriyor
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-xs font-mono">Marka bilgisi bulunmuyor.</div>
              )}
            </div>

            {/* Section 6: Bölgesel Görünürlük */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Section 6 • Bölgesel Görünürlük Durumu</span>
              <div className="flex items-center justify-between text-slate-300">
                <span>Yerel Listeleme Uygunluğu:</span>
                <span className="font-bold text-emerald-400">
                  {selectedProvider.membershipStatus === 'ACTIVE' && selectedProvider.torqueScoutOptIn ? 'UYGUN (Eligible)' : 'UYGUN DEĞİL'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Eşleşen Kapsam:</span>
                <span>{selectedProvider.countryCode} / {selectedProvider.regionCode} {selectedProvider.district ? `(${selectedProvider.district})` : ''}</span>
              </div>
            </div>

            {/* Section 7 & 8: Vitrin ve Ülke Geneli */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-3 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Section 7 & 8 • Görünürlük Hakları (Vitrin & Ülke Geneli)</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Showcase / Vitrin */}
                <div className="p-3 bg-slate-900 border border-amber-500/20 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-400 text-xs flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Vitrin Görünürlüğü
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${selectedProvider.showcase?.active ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                      {selectedProvider.showcase?.active ? 'AKTİF' : 'YOK / PASİF'}
                    </span>
                  </div>
                  {selectedProvider.showcase?.active ? (
                    <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-white/5">
                      <div>Kaynak: {selectedProvider.showcase.source === 'ADMIN_GRANTED' ? 'Admin Tarafından Verildi' : 'İşi Cepte Satın Alımı'}</div>
                      <div>Başlangıç: {selectedProvider.showcase.startsAt || '—'}</div>
                      <div>Bitiş: {selectedProvider.showcase.endsAt || 'Süresiz'}</div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 font-mono italic">Aktif Vitrin hakkı bulunmuyor.</div>
                  )}
                </div>

                {/* National Visibility / Ülke Geneli */}
                <div className="p-3 bg-slate-900 border border-purple-500/20 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-purple-400 text-xs flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> Ülke Geneli Görünürlük
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${selectedProvider.nationalVisibility?.active ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-500'}`}>
                      {selectedProvider.nationalVisibility?.active ? 'AKTİF' : 'YOK / PASİF'}
                    </span>
                  </div>
                  {selectedProvider.nationalVisibility?.active ? (
                    <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-white/5">
                      <div>Kaynak: {selectedProvider.nationalVisibility.source === 'ADMIN_GRANTED' ? 'Admin Tarafından Verildi' : 'İşi Cepte Satın Alımı'}</div>
                      <div>Başlangıç: {selectedProvider.nationalVisibility.startsAt || '—'}</div>
                      <div>Bitiş: {selectedProvider.nationalVisibility.endsAt || 'Süresiz'}</div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 font-mono italic">Aktif Ülke Geneli hakkı bulunmuyor.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 9: Senkronizasyon Zaman Çizelgesi */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-[11px] font-mono text-slate-400">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Section 9 • Senkronizasyon Zaman Çizelgesi</span>
              <div className="flex justify-between items-center">
                <span>Son Senkronizasyon (Last Synced):</span>
                <span className="text-slate-200">{selectedProvider.lastSyncedAt || 'Henüz yapılmadı'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Kaynak Güncelleme (Source UpdatedAt):</span>
                <span className="text-slate-200">{selectedProvider.sourceUpdatedAt || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Oluşturulma Tarihi:</span>
                <span className="text-slate-200">{selectedProvider.createdAt || '—'}</span>
              </div>
            </div>

            {/* Section 10: İletişim Bilgileri (Salt Okunur) */}
            {(selectedProvider.phone || selectedProvider.email || selectedProvider.address) && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-xs font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Section 10 • İletişim Bilgileri (İşi Cepte Sync)</span>
                {selectedProvider.phone && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedProvider.phone}</span>
                  </div>
                )}
                {selectedProvider.email && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedProvider.email}</span>
                  </div>
                )}
                {selectedProvider.address && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedProvider.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
