'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Eye,
  Heart,
  MessageSquare,
  Car,
  TrendingUp,
  Tag,
  HelpCircle,
  X,
  User,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';

const TIME_RANGES = [
  { key: '7d', label: 'Son 7 Gün' },
  { key: '30d', label: 'Son 30 Gün' },
  { key: '90d', label: 'Son 90 Gün' },
  { key: 'all', label: 'Tüm Zamanlar' },
];

function PerformanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const range = searchParams.get('range') || '30d';

  const [stats, setStats] = useState<any | null>(null);
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

  // Read-Only Listing Inspection Modal State
  const [inspectionListingId, setInspectionListingId] = useState<string | null>(null);
  const [inspectionData, setInspectionData] = useState<any | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchPerformanceStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/listings/performance?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Performans verileri alınamadı.');
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceStats();
  }, [range]);

  const handleRangeChange = (newRange: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', newRange);
    router.push(`/admin/listings/performance?${params.toString()}`);
  };

  const openDrilldown = async (metric: string) => {
    setActiveDrilldown(metric);
    setDrilldownLoading(true);
    setDrilldownData(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/reports/listings/performance/drilldown?metric=${metric}&range=${range}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error('Detay verileri alınamadı.');
      const data = await res.json();
      setDrilldownData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const openSellerDrawer = (sellerId: string, customerNo?: string) => {
    setDrawerUserId(sellerId);
    setDrawerCustomerNo(customerNo || null);
    setIsDrawerOpen(true);
  };

  const openListingInspection = async (listingId: string) => {
    setInspectionListingId(listingId);
    setInspectionLoading(true);
    setInspectionData(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/listing-moderation/listings/${listingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-admin-inspection': 'true',
        },
      });
      if (!res.ok) throw new Error('İlan detayları okunamadı.');
      const data = await res.json();
      setInspectionData(data);
    } catch (err: any) {
      alert(err.message || 'İlan bilgisi çekilemedi.');
    } finally {
      setInspectionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* HEADER & TIME RANGE CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-500" />
            İlan Performans Analizi
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Gerçek veritabanı analitiği, kullanıcı etkileşim dönüşümleri ve detaylı performans kartları.
          </p>
        </div>

        {/* TIME RANGE SELECTOR */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-white/10 rounded-xl">
          <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-1" />
          {TIME_RANGES.map((r) => {
            const isActive = range === r.key;
            return (
              <button
                key={r.key}
                onClick={() => handleRangeChange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Performans analitiği hesaplanıyor...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-medium">
          {error}
        </div>
      ) : (
        /* 6 KPI CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* KPI 1: TOPLAM GÖRÜNTÜLENME */}
          <div
            onClick={() => openDrilldown('views')}
            className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-orange-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Toplam Görüntülenme
              </span>
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                <Eye className="w-5 h-5" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-white font-mono">{stats?.totalViews || 0}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>Tekil Ziyaretçi: {stats?.uniqueViews || 0}</span>
                {stats?.viewsTrend !== null && stats?.viewsTrend !== undefined && (
                  <span className={stats.viewsTrend >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {stats.viewsTrend >= 0 ? `+%${stats.viewsTrend}` : `%${stats.viewsTrend}`}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-orange-400 font-bold">
              <span>Detayları Gör</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* KPI 2: TOPLAM FAVORİYE EKLEME */}
          <div
            onClick={() => openDrilldown('favorites')}
            className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-orange-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Toplam Favoriye Ekleme
              </span>
              <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 group-hover:scale-110 transition-transform">
                <Heart className="w-5 h-5" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-rose-400 font-mono">{stats?.totalFavorites || 0}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>Favoriye Alma Oranı: %{stats?.favoriteRate || 0}</span>
                {stats?.favoritesTrend !== null && stats?.favoritesTrend !== undefined && (
                  <span className={stats.favoritesTrend >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {stats.favoritesTrend >= 0 ? `+%${stats.favoritesTrend}` : `%${stats.favoritesTrend}`}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-orange-400 font-bold">
              <span>Detayları Gör</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* KPI 3: TOPLAM İLETİŞİM / LEAD */}
          <div
            onClick={() => openDrilldown('leads')}
            className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-orange-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Toplam İletişim / Lead
              </span>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-emerald-400 font-mono">{stats?.totalLeads || 0}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>Satıcı İletişim Aksiyonları</span>
                {stats?.leadsTrend !== null && stats?.leadsTrend !== undefined && (
                  <span className={stats.leadsTrend >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {stats.leadsTrend >= 0 ? `+%${stats.leadsTrend}` : `%${stats.leadsTrend}`}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-orange-400 font-bold">
              <span>Detayları Gör</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* KPI 4: ORT. GÖRÜNTÜLENME / İLAN */}
          <div
            onClick={() => openDrilldown('avgViews')}
            className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-orange-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ort. Görüntülenme / İlan
              </span>
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-amber-400 font-mono">{stats?.averageViewsPerListing || 0}</div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                İlan Başına Düşen Ortalama Görüntülenme
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-orange-400 font-bold">
              <span>Detayları Gör</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* KPI 5: DÖNÜŞÜM ORANI */}
          <div
            onClick={() => openDrilldown('conversion')}
            className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-orange-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Dönüşüm Oranı
                </span>
                <div title="İlan görüntülemelerinin satıcı iletişim aksiyonuna dönüşme oranı." className="cursor-help text-slate-500 hover:text-slate-300">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                <Car className="w-5 h-5" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-purple-400 font-mono">
                {stats?.totalViews > 0 || stats?.uniqueViews > 0 ? `%${stats?.conversionRate || 0}` : '—'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                İletişim / Ziyaretçi Oranı
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-orange-400 font-bold">
              <span>Detayları Gör</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* KPI 6: AKTİF İLAN */}
          <div
            onClick={() => openDrilldown('active')}
            className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-orange-500/50 transition-all cursor-pointer group space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Aktif İlan
              </span>
              <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400 group-hover:scale-110 transition-transform">
                <Tag className="w-5 h-5" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-orange-400 font-mono">{stats?.activeListings || 0}</div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Dönemde Yeni Yayınlanan: {stats?.newlyPublishedInPeriod || 0}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-orange-400 font-bold">
              <span>Detayları Gör</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
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
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  {activeDrilldown === 'views' && 'İlan Görüntülenme Analizi (Drill-Down)'}
                  {activeDrilldown === 'favorites' && 'Favori Analizi & İlan Sıralaması (Drill-Down)'}
                  {activeDrilldown === 'leads' && 'Satıcı İletişim / Lead Analizi (Drill-Down)'}
                  {activeDrilldown === 'avgViews' && 'Ortalama Görüntülenme & Dağılım Kovaları'}
                  {activeDrilldown === 'conversion' && 'Dönüşüm Oranı & Lead Performans Listesi'}
                  {activeDrilldown === 'active' && 'Aktif İlanlar Performans Listesi (Drill-Down)'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Dönem: {stats?.periodLabel || 'Son 30 Gün'} — Gerçek DB Kayıtları
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
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {drilldownLoading ? (
                <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Detaylı veriler yükleniyor...</p>
                </div>
              ) : drilldownData ? (
                <>
                  {/* Summary Bar */}
                  {drilldownData.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                      {Object.entries(drilldownData.summary).map(([k, v]: [string, any]) => (
                        <div key={k} className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                            {k}
                          </span>
                          <span className="text-lg font-black text-white">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Distribution Buckets for AvgViews */}
                  {drilldownData.buckets && (
                    <div className="p-4 bg-slate-900/90 border border-white/10 rounded-xl space-y-2 font-mono">
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                        İlan Görüntülenme Dağılım Kovaları (Distribution Buckets)
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-950 rounded-lg text-center">
                          <span className="block text-slate-500 text-[10px]">0 Görüntülenme</span>
                          <span className="font-bold text-rose-400 text-sm">{drilldownData.buckets.zero} İlan</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 rounded-lg text-center">
                          <span className="block text-slate-500 text-[10px]">1 - 10 Görüntülenme</span>
                          <span className="font-bold text-amber-400 text-sm">{drilldownData.buckets.oneToTen} İlan</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 rounded-lg text-center">
                          <span className="block text-slate-500 text-[10px]">11 - 50 Görüntülenme</span>
                          <span className="font-bold text-blue-400 text-sm">{drilldownData.buckets.elevenToFifty} İlan</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 rounded-lg text-center">
                          <span className="block text-slate-500 text-[10px]">51 - 100 Görüntülenme</span>
                          <span className="font-bold text-purple-400 text-sm">{drilldownData.buckets.fiftyOneToHundred} İlan</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 rounded-lg text-center">
                          <span className="block text-slate-500 text-[10px]">100+ Görüntülenme</span>
                          <span className="font-bold text-emerald-400 text-sm">{drilldownData.buckets.overHundred} İlan</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Listings Table */}
                  <div className="space-y-3 font-mono">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        İlan Performans Tablosu
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        İlana tıkla ➔ Read-Only İncele | Satıcıya tıkla ➔ AdminUserDrawer
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-900/60">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                            <th className="p-3">İlan No & Başlık</th>
                            <th className="p-3">Satıcı</th>
                            <th className="p-3 text-right">Görüntülenme</th>
                            <th className="p-3 text-right">Favori</th>
                            <th className="p-3 text-right">Lead</th>
                            <th className="p-3 text-right">Dönüşüm</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {(
                            drilldownData.listings ||
                            drilldownData.topListings ||
                            drilldownData.highViewZeroLeadListings ||
                            []
                          ).map((item: any) => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                              {/* Listing Title & No */}
                              <td className="p-3">
                                <button
                                  onClick={() => openListingInspection(item.id)}
                                  className="text-left font-bold text-white hover:text-orange-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded border border-white/10 text-orange-400 font-mono">
                                    {item.listingNo}
                                  </span>
                                  <span className="truncate max-w-xs">{item.title}</span>
                                </button>
                              </td>

                              {/* Seller */}
                              <td className="p-3">
                                <button
                                  onClick={() => openSellerDrawer(item.sellerId, item.customerNo)}
                                  className="text-slate-400 hover:text-orange-400 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                                >
                                  <User className="w-3 h-3" />
                                  <span>{item.sellerName}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">({item.customerNo})</span>
                                </button>
                              </td>

                              {/* Views */}
                              <td className="p-3 text-right font-bold text-white">
                                {item.views}
                              </td>

                              {/* Favorites */}
                              <td className="p-3 text-right font-bold text-rose-400">
                                {item.favorites}
                              </td>

                              {/* Leads */}
                              <td className="p-3 text-right font-bold text-emerald-400">
                                {item.leads}
                              </td>

                              {/* Conversion Rate */}
                              <td className="p-3 text-right font-bold text-purple-400">
                                %{item.conversionRate}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-slate-500 font-mono text-xs">
                  Henüz veri bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY LISTING INSPECTION MODAL */}
      {inspectionListingId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black text-white">İlan İnceleme (Read-Only)</h3>
              <button
                onClick={() => setInspectionListingId(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectionLoading ? (
              <div className="p-8 text-center text-slate-400 font-mono text-xs">İlan yükleniyor...</div>
            ) : inspectionData ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-4 bg-slate-900 border border-white/5 rounded-xl space-y-2">
                  <div className="text-sm font-bold text-white">{inspectionData.listing?.title}</div>
                  <div className="text-orange-400 font-bold">{inspectionData.listing?.priceAmount} TL</div>
                  <div className="text-slate-400">Durum: {inspectionData.listing?.status}</div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Görüntülenme</span>
                    <span className="font-bold text-white text-sm">{inspectionData.listing?.viewCount || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Favori</span>
                    <span className="font-bold text-rose-400 text-sm">{inspectionData.listing?.favoriteCount || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">Yayın Tarihi</span>
                    <span className="font-bold text-slate-300 text-[11px]">
                      {new Date(inspectionData.listing?.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-slate-400">İlan bulunamadı.</div>
            )}
          </div>
        </div>
      )}

      {/* REUSABLE ADMIN USER DRAWER */}
      <AdminUserDrawer
        userId={drawerUserId}
        customerNo={drawerCustomerNo}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={fetchPerformanceStats}
      />
    </div>
  );
}

export default function AdminListingsPerformancePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Performans yükleniyor...</div>}>
      <PerformanceContent />
    </Suspense>
  );
}
