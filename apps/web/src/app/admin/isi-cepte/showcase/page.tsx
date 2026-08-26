'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Award,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Info,
  Zap,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { IsiCepteProvider, IsiCepteShowcaseRecord } from '@/types/isiCepteDomain';
import IsiCepteProviderDetailDrawer from '../components/IsiCepteProviderDetailDrawer';

export default function IsiCepteShowcasePage() {
  const [records, setRecords] = useState<IsiCepteShowcaseRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('TR');

  // Selected Provider for SHARED 360° Provider Detail Drawer
  const [selectedProvider, setSelectedProvider] = useState<IsiCepteProvider | null>(null);

  const fetchShowcaseData = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        status: statusFilter,
        source: sourceFilter,
        country: countryFilter,
      });

      const res = await fetch(`${API_BASE_URL}/admin/isi-cepte/showcase?${query.toString()}`, {
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
      console.error('Vitrin showcase fetch error:', err);
      setRecords([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sourceFilter, countryFilter]);

  useEffect(() => {
    fetchShowcaseData();
  }, [fetchShowcaseData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Vitrin Görünürlüğü</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            TorqueScout öneri listelerinde sıralama önceliği ve öne çıkma hakkı edinen Vitrin üyeleri
            <span className="text-amber-400 font-bold font-mono ml-2">(Toplam {totalCount} Vitrin kaydı)</span>
          </p>
        </div>
        <button
          onClick={fetchShowcaseData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Business Semantic Info Badge */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs text-amber-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm">Vitrin Kapsam İlkesi</h4>
          <p className="text-slate-300 leading-relaxed">
            Vitrin hakkı, yalnızca zaten uygun ve ilgili olan işletmeler için sıralama önceliği avantajı sağlar. İlgisiz bir işletmeyi alakasız aramada öne çıkarmaz veya coğrafi kapsama alanını kendiliğinden genişletmez.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-1 min-w-[260px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-amber-500/50 transition">
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

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer font-sans"
            >
              <option value="">Tüm Vitrin Durumları</option>
              <option value="ACTIVE">Aktif Vitrin</option>
              <option value="SCHEDULED">Planlandı</option>
              <option value="EXPIRED">Süresi Doldu</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer font-sans"
            >
              <option value="">Tüm Kaynaklar</option>
              <option value="ISICEPTE_PURCHASE">İşi Cepte Satın Alımı</option>
              <option value="ADMIN_GRANTED">Admin Tarafından Verildi</option>
            </select>

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
          </div>
        </div>
      </div>

      {/* Main Table / Truthful Empty State */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Vitrin görünürlük kayıtları yükleniyor...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Zap className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Henüz Vitrin kaydı bulunmuyor.</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              İşi Cepte üzerinden oluşturulan Vitrin hakları sisteme aktarıldığında burada görüntülenecektir.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 font-mono">
                  <tr>
                    <th className="p-4">İşletme</th>
                    <th className="p-4">Bölge</th>
                    <th className="p-4">Vitrin Durumu</th>
                    <th className="p-4">Başlangıç</th>
                    <th className="p-4">Bitiş</th>
                    <th className="p-4">Kaynak</th>
                    <th className="p-4">Purchase ID</th>
                    <th className="p-4">İşi Cepte Üyeliği</th>
                    <th className="p-4">TS Listeleme</th>
                    <th className="p-4">Son Senkronizasyon</th>
                    <th className="p-4 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {records.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedProvider(r.provider)}
                      className={`hover:bg-white/[0.04] transition cursor-pointer ${
                        selectedProvider?.id === r.provider?.id ? 'bg-amber-500/10 border-l-2 border-l-amber-400' : ''
                      }`}
                    >
                      <td className="p-4 font-mono">
                        <div className="font-bold text-white text-xs">{r.provider?.businessName || '—'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                          {r.isicepteProviderId}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-300">
                        {r.provider?.countryCode || 'TR'} • {r.provider?.regionCode || '—'} {r.provider?.district ? `/ ${r.provider.district}` : ''}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            r.status === 'ACTIVE'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : r.status === 'SCHEDULED'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {r.status === 'ACTIVE' ? 'AKTİF' : r.status === 'SCHEDULED' ? 'PLANLANDI' : 'SÜRESİ DOLDU'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-[11px]">{r.startsAt || '—'}</td>
                      <td className="p-4 text-slate-300 font-mono text-[11px]">{r.endsAt || 'Süresiz'}</td>
                      <td className="p-4 font-mono text-slate-400 text-[11px]">
                        {r.source === 'ADMIN_GRANTED' ? 'Admin Tarafından Verildi' : 'İşi Cepte Satın Alımı'}
                      </td>
                      <td className="p-4 font-mono text-cyan-400 text-[11px]">{r.purchaseId || '—'}</td>
                      <td className="p-4 font-mono text-emerald-400 text-[11px]">
                        {r.provider?.membershipStatus || 'ACTIVE'}
                      </td>
                      <td className="p-4 font-mono text-cyan-400 text-[11px]">
                        {r.provider?.torqueScoutOptIn ? 'EVET' : 'HAYIR'}
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('tr-TR') : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProvider(r.provider);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
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
                  Sayfa <strong className="text-white">{page}</strong> / {totalPages} (Toplam {totalCount} Vitrin kaydı)
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
        initialSection="SHOWCASE"
      />
    </div>
  );
}
