'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  MapPin,
  Globe,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { IsiCepteProvider } from '@/types/isiCepteDomain';
import IsiCepteProviderDetailDrawer from '../components/IsiCepteProviderDetailDrawer';

export default function IsiCepteRegionalVisibilityPage() {
  const [records, setRecords] = useState<IsiCepteProvider[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('TR');
  const [regionFilter, setRegionFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Selected Provider for SHARED 360° Provider Detail Drawer
  const [selectedProvider, setSelectedProvider] = useState<IsiCepteProvider | null>(null);

  const fetchRegionalData = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        country: countryFilter,
        region: regionFilter,
        district: districtFilter,
        eligibility: eligibilityFilter,
        brand: brandFilter,
        category: categoryFilter,
      });

      const res = await fetch(`${API_BASE_URL}/admin/isi-cepte/regional-visibility?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data.items) ? data.items : []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setRecords([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Regional visibility fetch error:', err);
      setRecords([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, countryFilter, regionFilter, districtFilter, eligibilityFilter, brandFilter, categoryFilter]);

  useEffect(() => {
    fetchRegionalData();
  }, [fetchRegionalData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Bölgesel Görünürlük</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            İşi Cepte işletmelerinin TorqueScout yerel listeleme uygunluğunu ve coğrafi hizmet bölgelerini görüntüleyin
            <span className="text-emerald-400 font-bold font-mono ml-2">(Toplam {totalCount} bölgesel kaydı)</span>
          </p>
        </div>
        <button
          onClick={fetchRegionalData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Structured Filter Bar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-1 min-w-[260px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-emerald-500/50 transition">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="İşletme adı, il veya ilçe ile ara..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer"
            >
              <option value="TR">Ülke: Türkiye (TR)</option>
              <option value="">Tüm Ülkeler</option>
            </select>

            <select
              value={eligibilityFilter}
              onChange={(e) => {
                setEligibilityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer font-sans"
            >
              <option value="">Tüm Görünürlük Durumları</option>
              <option value="ELIGIBLE">Lokal Uygun (Eligible)</option>
              <option value="INELIGIBLE">Uygun Değil (Ineligible)</option>
              <option value="OPTED_OUT">Opt-Out (Kapalı)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Truthful Empty State */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Bölgesel görünürlük verileri yükleniyor...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Globe className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Henüz bölgesel görünürlük verisi bulunmuyor.</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              İşi Cepte işletme ve bölge verileri senkronize edildiğinde yerel listeleme uygunlukları burada görüntülenecektir.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 font-mono">
                  <tr>
                    <th className="p-4">İşletme</th>
                    <th className="p-4">Ülke</th>
                    <th className="p-4">İl / Bölge</th>
                    <th className="p-4">İlçe / Hizmet Alanı</th>
                    <th className="p-4">Hizmet Verilen Markalar</th>
                    <th className="p-4">Oto Hizmetleri</th>
                    <th className="p-4">Yerel Görünürlük</th>
                    <th className="p-4">Uygunluk Nedeni</th>
                    <th className="p-4">Son Senkronizasyon</th>
                    <th className="p-4 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {records.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedProvider(r)}
                      className={`hover:bg-white/[0.04] transition cursor-pointer ${
                        selectedProvider?.id === r.id ? 'bg-emerald-500/10 border-l-2 border-l-emerald-400' : ''
                      }`}
                    >
                      <td className="p-4 font-mono">
                        <div className="font-bold text-white text-xs">{r.businessName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                          {r.isicepteProviderId}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-300">{r.countryCode || 'TR'}</td>
                      <td className="p-4 font-mono text-white font-bold">{r.regionCode || '—'}</td>
                      <td className="p-4 font-mono text-slate-300">{r.district || 'Tüm Bölge'}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {r.supportedVehicleBrands && r.supportedVehicleBrands.length > 0 ? (
                            r.supportedVehicleBrands.slice(0, 2).map((b, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                                {b.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 font-mono text-[10px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {r.autoServiceCategories && r.autoServiceCategories.length > 0 ? (
                            r.autoServiceCategories.slice(0, 2).map((c) => (
                              <span key={c.id} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 font-mono text-[10px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            r.membershipStatus === 'ACTIVE' && r.torqueScoutOptIn
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {r.membershipStatus === 'ACTIVE' && r.torqueScoutOptIn ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> UYGUN
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" /> UYGUN DEĞİL
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-[11px] max-w-[180px] truncate">
                        {r.eligibilityReasonText ||
                          (r.membershipStatus !== 'ACTIVE'
                            ? 'İşi Cepte üyeliği aktif değil'
                            : !r.torqueScoutOptIn
                            ? 'TorqueScout listeleme izni kapalı'
                            : 'Tüm şartlar uygun')}
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {r.lastSyncedAt ? new Date(r.lastSyncedAt).toLocaleDateString('tr-TR') : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProvider(r);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
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
                  Sayfa <strong className="text-white">{page}</strong> / {totalPages} (Toplam {totalCount} bölgesel kayıt)
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

      {/* EXACT SAME SHARED PROVIDER DETAIL DRAWER COMPONENT */}
      <IsiCepteProviderDetailDrawer
        provider={selectedProvider}
        onClose={() => setSelectedProvider(null)}
        initialSection="REGIONAL_VISIBILITY"
      />
    </div>
  );
}
