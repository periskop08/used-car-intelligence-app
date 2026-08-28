'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Info,
  Award,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  UserCheck,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { IsiCepteProvider, IsiCeptePurchaseRecord } from '@/types/isiCepteDomain';
import IsiCepteProviderDetailDrawer from '../components/IsiCepteProviderDetailDrawer';

export default function IsiCeptePurchasesPage() {
  const [records, setRecords] = useState<IsiCeptePurchaseRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState('');
  const [entitlementStatusFilter, setEntitlementStatusFilter] = useState('');

  // Drawers / Overlays
  const [selectedPurchase, setSelectedPurchase] = useState<IsiCeptePurchaseRecord | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<IsiCepteProvider | null>(null);

  const fetchPurchasesData = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        product: productFilter,
        purchaseStatus: purchaseStatusFilter,
        entitlementStatus: entitlementStatusFilter,
      });

      const res = await fetch(`${API_BASE_URL}/admin/isi-cepte/purchases?${query.toString()}`, {
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
      console.error('Purchases fetch error:', err);
      setRecords([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, productFilter, purchaseStatusFilter, entitlementStatusFilter]);

  useEffect(() => {
    fetchPurchasesData();
  }, [fetchPurchasesData]);

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'TRY' || currency === 'TL') {
      return `${amount.toLocaleString('tr-TR')} TL`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Satın Alımlar</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            İşi Cepte platformundan TorqueScout görünürlük ürünleri için gerçekleştirilen ticari satın alma kayıtları
            <span className="text-emerald-400 font-bold font-mono ml-2">(Toplam {totalCount} satın alma kaydı)</span>
          </p>
        </div>
        <button
          onClick={fetchPurchasesData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Business Semantic Info Badge */}
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-xs text-emerald-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm">Satın Alma & Hak İzleme İlkesi</h4>
          <p className="text-slate-300 leading-relaxed">
            Satın alma kaydı ticari ödeme işlemini; görünürlük hakkı ise bu işlem sonucu üretilen yetkiyi ifade eder. Bu ekran İşi Cepte kaynaklı senkronize satın alma işlemlerinin dürüst ve salt okunur (read-only) izleme görünümüdür.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-1 min-w-[260px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-emerald-500/50 transition">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="İşletme adı, İşi Cepte Provider ID veya Purchase ID ile ara..."
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
              value={productFilter}
              onChange={(e) => {
                setProductFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer font-sans"
            >
              <option value="">Tüm Ürünler</option>
              <option value="SHOWCASE">Vitrin Görünürlüğü (SHOWCASE)</option>
              <option value="NATIONAL_VISIBILITY">Ülke Geneli (NATIONAL_VISIBILITY)</option>
            </select>

            <select
              value={purchaseStatusFilter}
              onChange={(e) => {
                setPurchaseStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer font-sans"
            >
              <option value="">Tüm Ödeme Durumları</option>
              <option value="SUCCESS">Başarılı (SUCCESS)</option>
              <option value="PENDING">Beklemede (PENDING)</option>
              <option value="FAILED">Başarısız (FAILED)</option>
              <option value="REFUNDED">İade (REFUNDED)</option>
            </select>

            <select
              value={entitlementStatusFilter}
              onChange={(e) => {
                setEntitlementStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer font-sans"
            >
              <option value="">Tüm Hak Durumları</option>
              <option value="ACTIVE">Aktif Hak</option>
              <option value="EXPIRED">Süresi Dolmuş</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Truthful Empty State */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Satın alma kayıtları yükleniyor...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Henüz TorqueScout görünürlük ürünü satın alımı bulunmuyor.</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              İşi Cepte üzerinden yapılan Vitrin ve Ülke Geneli satın alımları sisteme aktarıldığında burada görüntülenecektir.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 font-mono">
                  <tr>
                    <th className="p-4">İşletme</th>
                    <th className="p-4">Ürün</th>
                    <th className="p-4">Tutar</th>
                    <th className="p-4">Satın Alma Durumu</th>
                    <th className="p-4">Satın Alma Tarihi</th>
                    <th className="p-4">Hak Durumu</th>
                    <th className="p-4">Hak Başlangıcı</th>
                    <th className="p-4">Hak Bitişi</th>
                    <th className="p-4">Purchase ID</th>
                    <th className="p-4 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {records.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedPurchase(r)}
                      className={`hover:bg-white/[0.04] transition cursor-pointer ${
                        selectedPurchase?.id === r.id ? 'bg-emerald-500/10 border-l-2 border-l-emerald-400' : ''
                      }`}
                    >
                      <td className="p-4 font-mono">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProvider(r.provider);
                          }}
                          className="font-bold text-white hover:text-cyan-400 text-xs text-left cursor-pointer transition"
                        >
                          {r.provider?.businessName || '—'}
                        </button>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                          {r.isicepteProviderId}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            r.productType === 'SHOWCASE'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {r.productType === 'SHOWCASE' ? (
                            <>
                              <Award className="w-3 h-3 text-amber-400" /> Vitrin
                            </>
                          ) : (
                            <>
                              <Globe className="w-3 h-3 text-purple-400" /> Ülke Geneli
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-emerald-400 font-bold">
                        {formatAmount(r.amount, r.currency)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            r.purchaseStatus === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : r.purchaseStatus === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : r.purchaseStatus === 'REFUNDED'
                              ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {r.purchaseStatus === 'SUCCESS'
                            ? 'BAŞARILI'
                            : r.purchaseStatus === 'PENDING'
                            ? 'BEKLEMEDE'
                            : r.purchaseStatus === 'REFUNDED'
                            ? 'İADE'
                            : 'BAŞARISIZ'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-[11px]">{r.purchasedAt || '—'}</td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            r.entitlementStatus === 'ACTIVE'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {r.entitlementStatus === 'ACTIVE' ? 'AKTİF HAK' : 'SÜRESİ DOLMUŞ'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-[11px]">{r.entitlementStartsAt || '—'}</td>
                      <td className="p-4 text-slate-300 font-mono text-[11px]">{r.entitlementEndsAt || 'Süresiz'}</td>
                      <td className="p-4 font-mono text-cyan-400 text-[11px]">{r.externalPurchaseId || '—'}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPurchase(r);
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
                  Sayfa <strong className="text-white">{page}</strong> / {totalPages} (Toplam {totalCount} satın alma)
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

      {/* READ-ONLY PURCHASE DETAIL OVERLAY */}
      {selectedPurchase && (
        <div
          onClick={() => setSelectedPurchase(null)}
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl h-full bg-[#0b0f19] border-l border-white/10 p-6 space-y-6 overflow-y-auto font-sans shadow-2xl animate-in slide-in-from-right duration-200"
          >
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-white/10">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                  Purchase ID: {selectedPurchase.externalPurchaseId}
                </span>
                <h2 className="text-lg font-black text-white">Satın Alma Detayı</h2>
                <span className="text-[11px] text-slate-400 font-mono block">
                  {selectedPurchase.provider?.businessName} • {formatAmount(selectedPurchase.amount, selectedPurchase.currency)}
                </span>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* A. SATIN ALMA */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 font-mono text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">A • Satın Alma Detayı</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px]">Purchase ID</span>
                  <span className="text-cyan-400 font-bold">{selectedPurchase.externalPurchaseId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Ürün Tipi</span>
                  <span className="text-white font-bold">{selectedPurchase.productType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">İşlem Tutarı</span>
                  <span className="text-emerald-400 font-bold">{formatAmount(selectedPurchase.amount, selectedPurchase.currency)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Ödeme Durumu</span>
                  <span className="text-emerald-400 font-bold">{selectedPurchase.purchaseStatus}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Satın Alma Tarihi</span>
                  <span className="text-slate-300">{selectedPurchase.purchasedAt}</span>
                </div>
              </div>
            </div>

            {/* B. İŞLETME */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">B • İlgili İşletme Varlığı</span>
                <button
                  onClick={() => setSelectedProvider(selectedPurchase.provider)}
                  className="text-[10px] text-cyan-400 hover:underline font-mono cursor-pointer"
                >
                  360° Provider Drawer Aç ➔
                </button>
              </div>
              <div className="font-mono space-y-1">
                <div className="font-bold text-white text-sm">{selectedPurchase.provider?.businessName}</div>
                <div className="text-slate-400 text-[11px]">İşi Cepte Provider ID: {selectedPurchase.isicepteProviderId}</div>
                <div className="text-slate-400 text-[11px]">Bölge: {selectedPurchase.provider?.countryCode} • {selectedPurchase.provider?.regionCode}</div>
              </div>
            </div>

            {/* C. OLUŞTURDUĞU HAK */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 font-mono text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">C • Oluşturduğu Görünürlük Hakkı</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px]">Entitlement ID</span>
                  <span className="text-slate-300">{selectedPurchase.entitlementId || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Entitlement Type</span>
                  <span className="text-purple-400 font-bold">{selectedPurchase.entitlementType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Hak Durumu</span>
                  <span className="text-cyan-400 font-bold">{selectedPurchase.entitlementStatus || 'ACTIVE'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Hak Başlangıç / Bitiş</span>
                  <span className="text-slate-300">{selectedPurchase.entitlementStartsAt || '—'} / {selectedPurchase.entitlementEndsAt || 'Süresiz'}</span>
                </div>
              </div>
            </div>

            {/* D. KAYNAK / SENKRONİZASYON */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-2 text-[11px] font-mono text-slate-400">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">D • Kaynak & Senkronizasyon</span>
              <div className="flex justify-between items-center">
                <span>Kaynak Sistem:</span>
                <span className="text-slate-200">{selectedPurchase.sourceSystem || 'İşi Cepte Sync'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Son Senkronizasyon:</span>
                <span className="text-slate-200">{selectedPurchase.lastSyncedAt || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXACT SAME SHARED PROVIDER DETAIL DRAWER COMPONENT */}
      <IsiCepteProviderDetailDrawer
        provider={selectedProvider}
        onClose={() => setSelectedProvider(null)}
        initialSection="SHOWCASE"
      />
    </div>
  );
}
