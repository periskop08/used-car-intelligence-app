'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CircleDollarSign,
  TrendingUp,
  CreditCard,
  User,
  Calendar,
  ChevronRight,
  X,
  PieChart,
  HelpCircle,
  AlertCircle,
  ExternalLink,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { AdminUserDrawer } from '../components/AdminUserDrawer';

const DATE_RANGES = [
  { key: '7d', label: 'Son 7 Gün' },
  { key: '30d', label: 'Son 30 Gün' },
  { key: 'ytd', label: 'Bu Yıl' },
  { key: 'custom', label: 'Özel Tarih Aralığı' },
];

function FinanceOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const range = searchParams.get('range') || '30d';
  const customFrom = searchParams.get('from') || '';
  const customTo = searchParams.get('to') || '';

  const [fromInput, setFromInput] = useState(customFrom);
  const [toInput, setToInput] = useState(customTo);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drilldown Modal State
  const [activeDrilldown, setActiveDrilldown] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<any | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Reusable AdminUserDrawer State
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [drawerCustomerNo, setDrawerCustomerNo] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Read-Only Transaction Detail Modal State
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchOverviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/admin/reports/finance/overview?range=${range}`;
      if (range === 'custom' && customFrom && customTo) {
        url += `&from=${customFrom}&to=${customTo}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Finansal özet verileri alınamadı.');
      const resData = await res.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, [range, customFrom, customTo]);

  const handleRangeChange = (newRange: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', newRange);
    if (newRange !== 'custom') {
      params.delete('from');
      params.delete('to');
    }
    router.push(`/admin/finance?${params.toString()}`);
  };

  const applyCustomDates = () => {
    if (!fromInput || !toInput) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', 'custom');
    params.set('from', fromInput);
    params.set('to', toInput);
    router.push(`/admin/finance?${params.toString()}`);
  };

  const openDrilldown = async (metric: string) => {
    setActiveDrilldown(metric);
    setDrilldownLoading(true);
    setDrilldownData(null);
    try {
      let url = `${API_BASE_URL}/admin/reports/finance/overview/drilldown?metric=${metric}&range=${range}`;
      if (range === 'custom' && customFrom && customTo) {
        url += `&from=${customFrom}&to=${customTo}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Finansal detay verileri alınamadı.');
      const resData = await res.json();
      setDrilldownData(resData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const openSellerDrawer = (sellerId?: string, customerNo?: string) => {
    if (!sellerId) return;
    setDrawerUserId(sellerId);
    setDrawerCustomerNo(customerNo || null);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* HEADER & GLOBAL DATE RANGE SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-emerald-500" />
            Finans Özeti & MRR
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Şirketin düzenli geliri, tahsilat durumu, paket satışları ve kârlılık rasyoları.
          </p>
        </div>

        {/* GLOBAL DATE RANGE SELECTOR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-white/10 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-1" />
            {DATE_RANGES.map((r) => {
              const isActive = range === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => handleRangeChange(r.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* CUSTOM DATE INPUTS */}
          {range === 'custom' && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-white/10 rounded-xl font-mono text-xs">
              <input
                type="date"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                className="bg-slate-950 border border-white/10 text-white px-2 py-1 rounded focus:outline-none focus:border-emerald-500 text-[11px]"
              />
              <span className="text-slate-500">–</span>
              <input
                type="date"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                className="bg-slate-950 border border-white/10 text-white px-2 py-1 rounded focus:outline-none focus:border-emerald-500 text-[11px]"
              />
              <button
                onClick={applyCustomDates}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded text-[11px] cursor-pointer"
              >
                Uygula
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Finansal analitik hesaplanıyor...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-medium flex items-center justify-between">
          <span>Finansal veriler yüklenemedi: {error}</span>
          <button
            onClick={() => fetchOverviewData()}
            className="px-3 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Tekrar Deneyin
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 6 CLICKABLE KPI CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* KPI 1: MRR */}
            <div
              onClick={() => openDrilldown('mrr')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Aylık Düzenli Gelir (MRR)
                  </span>
                  <div title="Dönem sonu itibarıyla aktif recurring aboneliklerin aylık normalize geliri." className="cursor-help text-slate-500 hover:text-slate-300">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  ₺{(data?.mrr || 0).toLocaleString('tr-TR')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Snapshot: {data?.periodLabel} itibarıyla
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                <span>Detayları Gör</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* KPI 2: ARR */}
            <div
              onClick={() => openDrilldown('arr')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Yıllık Düzenli Gelir (ARR)
                  </span>
                  <div title="MRR × 12 (Yıllıklaştırılmış düzenli gelir snapshot'ı)." className="cursor-help text-slate-500 hover:text-slate-300">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-cyan-400 font-mono">
                  ₺{(data?.arr || 0).toLocaleString('tr-TR')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Yıllıklaştırılmış MRR Snapshot
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                <span>Detayları Gör</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* KPI 3: TEK SEFERLİK PAKET GELİRİ */}
            <div
              onClick={() => openDrilldown('oneTime')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tek Seferlik Paket Geliri
                </span>
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-amber-400 font-mono">
                  ₺{(data?.oneTimeRevenue || 0).toLocaleString('tr-TR')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Dönem Aralığı: {data?.periodLabel}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                <span>Detayları Gör</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* KPI 4: TOPLAM TAHSİLAT */}
            <div
              onClick={() => openDrilldown('collected')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Toplam Tahsilat
                </span>
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-white font-mono">
                  ₺{(data?.totalCollected || 0).toLocaleString('tr-TR')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Dönem İçi Gerçek Tahsil Edilen Toplam
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                <span>Detayları Gör</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* KPI 5: AKTİF ÜCRETLİ ABONELİK */}
            <div
              onClick={() => openDrilldown('activePaid')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Aktif Ücretli Abonelik
                </span>
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-purple-400 font-mono">
                  {data?.activePaidSubscriptionsCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Yetkin & Profesyonel Ücretli Üyeler
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                <span>Detayları Gör</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* KPI 6: TAHMİNİ BRÜT KÂR MARJI (STRICT UNKNOWN ≠ ZERO RULE) */}
            <div
              onClick={() => openDrilldown('margin')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Tahmini Brüt Kâr Marjı
                  </span>
                  <div title="Brüt Kâr / Gelir Oranı. Maliyet verileri eksikse bilinmeyen maliyet 0 kabul edilmez." className="cursor-help text-slate-500 hover:text-slate-300">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div>
                {data?.grossMarginStatus === 'INCOMPLETE_COST_DATA' ? (
                  <>
                    <div className="text-3xl font-black text-amber-400 font-mono">—</div>
                    <div className="text-[11px] text-amber-400/90 mt-1 font-mono font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Hesaplanamıyor (Maliyet verisi eksik)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-black text-emerald-400 font-mono">
                      %{data?.grossMarginPct || 0}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                      Tahmini Brüt Marj Rasyosu
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                <span>Detayları Gör</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* LOWER SECTION 1: GELİR DAĞILIMI */}
          <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 space-y-4 font-mono">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <span>Gelir Dağılımı ({data?.periodLabel})</span>
              </h2>
              <span className="text-xs text-slate-400">
                Toplam: ₺{(data?.revenueDistribution?.totalRevenue || 0).toLocaleString('tr-TR')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-2">
                <span className="text-xs text-slate-400 font-bold block">Abonelik Geliri Katkısı</span>
                <div className="text-xl font-bold text-emerald-400">
                  ₺{(data?.revenueDistribution?.subscriptionRevenue || 0).toLocaleString('tr-TR')}
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{
                      width: `${data?.revenueDistribution?.totalRevenue > 0 ? (data.revenueDistribution.subscriptionRevenue / data.revenueDistribution.totalRevenue) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-2">
                <span className="text-xs text-slate-400 font-bold block">Tek Seferlik Paket Geliri Katkısı</span>
                <div className="text-xl font-bold text-amber-400">
                  ₺{(data?.revenueDistribution?.oneTimeRevenue || 0).toLocaleString('tr-TR')}
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{
                      width: `${data?.revenueDistribution?.totalRevenue > 0 ? (data.revenueDistribution.oneTimeRevenue / data.revenueDistribution.totalRevenue) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* DETAILED BREAKDOWN TABLE */}
            <div className="pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 uppercase text-[10px]">
                    <th className="py-2">Ürün / Paket Kategori</th>
                    <th className="py-2">Tür</th>
                    <th className="py-2 text-right">Tahsil Edilen Gelir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {data?.revenueDistribution?.breakdown?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="py-2.5 font-bold text-white">{item.name}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type === 'SUBSCRIPTION' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {item.type === 'SUBSCRIPTION' ? 'Abonelik' : 'Tek Seferlik'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-white">
                        ₺{item.amount.toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LOWER SECTION 2: MRR GELİŞİMİ */}
          <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 space-y-4 font-mono">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>MRR Gelişim Çizelgesi</span>
            </h2>

            {data?.mrrDevelopment?.insufficientHistoricalData ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-950 rounded-xl border border-white/5">
                Geçmiş MRR hesaplaması için yeterli kayıt bulunmuyor.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data?.mrrDevelopment?.timeline?.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-white/5 text-center space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">{item.label}</span>
                    <span className="text-xl font-bold text-cyan-400">₺{item.mrr.toLocaleString('tr-TR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRILLDOWN DRAWER / MODAL */}
      {activeDrilldown && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end transition-opacity animate-in fade-in">
          <div className="w-full max-w-4xl bg-slate-950 border-l border-white/10 h-full flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <CircleDollarSign className="w-5 h-5 text-emerald-500" />
                  {activeDrilldown === 'mrr' && 'Aylık Düzenli Gelir (MRR) Detayı'}
                  {activeDrilldown === 'arr' && 'Yıllık Düzenli Gelir (ARR) Detayı'}
                  {activeDrilldown === 'oneTime' && 'Tek Seferlik Paket Geliri Detayı'}
                  {activeDrilldown === 'collected' && 'Toplam Tahsilat İşlem Detayı'}
                  {activeDrilldown === 'activePaid' && 'Aktif Ücretli Aboneler Listesi'}
                  {activeDrilldown === 'margin' && 'Tahmini Brüt Kâr Marjı Detayı'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Dönem: {drilldownData?.periodLabel || data?.periodLabel} — Gerçek Finansal Kayıtlar
                </p>
              </div>

              <button
                onClick={() => setActiveDrilldown(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
              {drilldownLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Detaylı finansal veriler yükleniyor...</p>
                </div>
              ) : drilldownData ? (
                <>
                  {/* MARGIN SPECIAL DRILLDOWN */}
                  {activeDrilldown === 'margin' ? (
                    <div className="space-y-6">
                      <div className="p-4 bg-slate-900 border border-white/10 rounded-xl space-y-3">
                        <span className="text-xs font-bold text-white uppercase block">Hesaplama Durumu</span>
                        {drilldownData.summary?.grossMarginStatus === 'INCOMPLETE_COST_DATA' ? (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 space-y-1">
                            <strong className="block font-bold">Hesaplanamıyor (Maliyet Verisi Eksik)</strong>
                            <p className="text-[11px] text-amber-300">
                              Aşağıdaki maliyet verileri sistemde kayıtlı olmadığı için bilinmeyen maliyet 0 kabul edilip sahte %100 marj üretilmemiştir:
                            </p>
                            <ul className="list-disc list-inside text-[11px] pt-1">
                              {drilldownData.summary?.missingCosts?.map((mc: string, i: number) => (
                                <li key={i}>{mc}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-emerald-400">
                            Brüt Kâr Marjı: %{drilldownData.summary?.grossMarginPct}
                          </div>
                        )}
                      </div>

                      {/* REDIRECT TO AI COSTS PAGE */}
                      <div className="p-4 bg-slate-900/60 border border-white/5 rounded-xl flex items-center justify-between">
                        <span className="text-slate-300">AI ve Altyapı maliyet detaylarını detaylı incelemek için:</span>
                        <button
                          onClick={() => {
                            setActiveDrilldown(null);
                            router.push('/admin/finance/ai-costs');
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>AI & Altyapı Maliyetlerini Gör</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : drilldownData.subscribers ? (
                    /* SUBSCRIBERS TABLE FOR MRR / ARR / ACTIVE PAID */
                    <div className="space-y-4">
                      {drilldownData.tierBreakdown && (
                        <div className="grid grid-cols-2 gap-3">
                          {drilldownData.tierBreakdown.map((tb: any, i: number) => (
                            <div key={i} className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                              <span className="text-[10px] text-slate-500 block">{tb.tier}</span>
                              <span className="text-sm font-bold text-white">{tb.count} Abone — ₺{tb.mrrContribution.toLocaleString('tr-TR')}/ay</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Aktif Ücretli Aboneler Tablosu
                        </h3>
                        <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-900/60">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase">
                                <th className="p-3">Kullanıcı & Müşteri No</th>
                                <th className="p-3">Paket Tier</th>
                                <th className="p-3 text-right">Aylık Gelir</th>
                                <th className="p-3 text-right">Yıllıklaştırılmış (ARR)</th>
                                <th className="p-3 text-right">Durum</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                              {drilldownData.subscribers.map((sub: any) => (
                                <tr key={sub.userId} className="hover:bg-white/5">
                                  <td className="p-3">
                                    <button
                                      onClick={() => openSellerDrawer(sub.userId, sub.customerNo)}
                                      className="text-left font-bold text-white hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <User className="w-3 h-3 text-slate-400" />
                                      <span>{sub.name}</span>
                                      <span className="text-[10px] text-slate-500">({sub.customerNo})</span>
                                    </button>
                                  </td>
                                  <td className="p-3 font-bold text-emerald-400">{sub.tier}</td>
                                  <td className="p-3 text-right font-bold text-white">₺{sub.monthlyPrice}</td>
                                  <td className="p-3 text-right font-bold text-cyan-400">₺{sub.annualizedPrice.toLocaleString('tr-TR')}</td>
                                  <td className="p-3 text-right">
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full">
                                      AKTİF
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : drilldownData.transactions ? (
                    /* TRANSACTIONS TABLE FOR ONE-TIME / COLLECTED */
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        İşlem & Tahsilat Kayıtları
                      </h3>
                      <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-900/60">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase">
                              <th className="p-3">İşlem No & Tarih</th>
                              <th className="p-3">Müşteri</th>
                              <th className="p-3">Ürün / Paket</th>
                              <th className="p-3 text-right">Tahsil Edilen</th>
                              <th className="p-3 text-right">Durum</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-300">
                            {drilldownData.transactions.map((tx: any) => (
                              <tr
                                key={tx.id}
                                onClick={() => setSelectedTransaction(tx)}
                                className="hover:bg-white/5 cursor-pointer transition-colors"
                              >
                                <td className="p-3">
                                  <div className="font-bold text-white">{tx.transactionNo}</div>
                                  <div className="text-[10px] text-slate-500">{new Date(tx.date).toLocaleString('tr-TR')}</div>
                                </td>
                                <td className="p-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSellerDrawer(tx.userId, tx.customerNo);
                                    }}
                                    className="text-left text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span>{tx.userName}</span>
                                    <span className="text-[10px] text-slate-500">({tx.customerNo})</span>
                                  </button>
                                </td>
                                <td className="p-3 font-bold text-amber-400">{tx.productName}</td>
                                <td className="p-3 text-right font-bold text-emerald-400">₺{tx.amountPaid}</td>
                                <td className="p-3 text-right">
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full">
                                    BAŞARILI
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Henüz finansal detay kaydı bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY TRANSACTION DETAIL MODAL */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Ödeme İşlem İnceleme (Read-Only)</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">İşlem Numarası</span>
                <span className="text-sm font-bold text-white">{selectedTransaction.transactionNo}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                  <span className="text-slate-500 block text-[10px]">Tutar</span>
                  <span className="font-bold text-emerald-400 text-sm">₺{selectedTransaction.amountPaid}</span>
                </div>
                <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                  <span className="text-slate-500 block text-[10px]">Ödeme Sağlayıcı</span>
                  <span className="font-bold text-slate-300">{selectedTransaction.paymentProvider}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-1 text-[11px]">
                <span className="text-slate-500 block text-[10px]">Müşteri</span>
                <div className="font-bold text-white">{selectedTransaction.userName}</div>
                <div className="text-[10px] text-slate-500">{selectedTransaction.customerNo}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REUSABLE ADMIN USER DRAWER */}
      <AdminUserDrawer
        userId={drawerUserId}
        customerNo={drawerCustomerNo}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={fetchOverviewData}
      />
    </div>
  );
}

export default function AdminFinancePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400 font-mono text-xs">Finans Özeti yükleniyor...</div>}>
      <FinanceOverviewContent />
    </Suspense>
  );
}
