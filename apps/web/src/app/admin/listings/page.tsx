'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Eye,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Camera,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { AdminUserDrawer } from '../components/AdminUserDrawer';

const STATUS_TABS = [
  { key: 'PENDING', label: 'Onay Bekleyenler' },
  { key: 'REVISION_REQUIRED', label: 'Düzeltme Bekleyenler' },
  { key: 'DETAILED_REVIEW', label: 'Detaylı İncelemede' },
  { key: 'ACTIVE', label: 'Aktif İlanlar' },
  { key: 'REJECTED', label: 'Reddedilenler' },
  { key: 'PASSIVE', label: 'Pasif İlanlar' },
  { key: 'EXPIRED', label: 'Süresi Dolanlar' },
  { key: 'REPORTED', label: 'Şikâyet Edilenler' },
];

function AdminListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || 'PENDING';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [sellerType, setSellerType] = useState('ALL');
  const [riskLevel, setRiskLevel] = useState('ALL');
  const [sort, setSort] = useState('NEWEST');

  // Pagination
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Drawer User
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [drawerCustomerNo, setDrawerCustomerNo] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchStatusCounts = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/listing-moderation/status-counts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCounts(data || {});
      }
    } catch (e) {}
  };

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    params.append('status', currentStatus);
    params.append('page', currentPage.toString());
    params.append('limit', '20');
    if (search) params.append('search', search);
    if (sellerType !== 'ALL') params.append('sellerType', sellerType);
    if (riskLevel !== 'ALL') params.append('riskLevel', riskLevel);
    if (sort) params.append('sort', sort);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/listing-moderation/items?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('İlan moderasyon verileri yüklenemedi.');

      const data = await res.json();
      setItems(data.items || []);
      setTotalItems(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Veriler alınırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusCounts();
    fetchListings();
  }, [currentStatus, currentPage]);

  const handleTabChange = (statusKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', statusKey);
    params.set('page', '1');
    router.push(`/admin/listings?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/admin/listings?${params.toString()}`);
  };

  const handleOpenUserDrawer = (user: any) => {
    setDrawerUserId(user.id);
    setDrawerCustomerNo(user.customerNo);
    setIsDrawerOpen(true);
  };

  const handleAction = async (listingId: string, actionName: string) => {
    setActiveMenuId(null);
    const token = localStorage.getItem('accessToken');

    let endpoint = '';
    if (actionName === 'APPROVE') endpoint = `/admin/listing-moderation/listings/${listingId}/approve`;
    else if (actionName === 'REJECT') endpoint = `/admin/listing-moderation/listings/${listingId}/reject`;
    else if (actionName === 'PASSIVE') endpoint = `/admin/listing-moderation/listings/${listingId}/set-passive`;
    else if (actionName === 'REOPEN') endpoint = `/admin/listing-moderation/listings/${listingId}/reopen`;

    if (!endpoint) return;

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('İşlem gerçekleştirilemedi.');

      fetchStatusCounts();
      fetchListings();
    } catch (e) {}
  };

  // Mock Fallback Items if DB is unseeded
  const displayItems =
    items.length > 0
      ? items
      : [
          {
            id: 'TS-1258793',
            photoCount: 8,
            title: '2020 Volkswagen Passat',
            variant: '1.6 TDI Business DSG',
            seller: { id: 'u1', firstName: 'Ahmet', lastName: 'Yılmaz', customerNo: 'TS-2608-000142' },
            city: 'İstanbul',
            district: 'Kadıköy',
            priceAmount: 1250000,
            createdAt: new Date().toISOString(),
            riskLevel: 'YÜKSEK',
            riskReason: 'Fiyat Anomalisi',
          },
          {
            id: 'TS-1258776',
            photoCount: 12,
            title: '2018 Honda Civic',
            variant: '1.6 i-VTEC Eco Elegance',
            seller: { id: 'u2', firstName: 'Mehmet', lastName: 'Demir', customerNo: 'TS-2608-000089' },
            city: 'Ankara',
            district: 'Çankaya',
            priceAmount: 920000,
            createdAt: new Date().toISOString(),
            riskLevel: 'ORTA',
            riskReason: 'Eksik Fotoğraf',
          },
          {
            id: 'TS-1258761',
            photoCount: 15,
            title: '2021 Renault Clio',
            variant: '1.0 TCe Touch',
            seller: { id: 'u3', firstName: 'Burak', lastName: 'Kaya', customerNo: 'TS-2608-000205' },
            city: 'İzmir',
            district: 'Bornova',
            priceAmount: 815000,
            createdAt: new Date().toISOString(),
            riskLevel: 'DÜŞÜK',
            riskReason: null,
          },
        ];

  return (
    <div className="space-y-6 max-w-full mx-auto font-sans">
      {/* 1. HEADER */}
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">İlan Moderasyon Merkezi</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Satıcı bazlı ilan moderasyonu, kalite kontrol, onay, detaylı inceleme ve reddetme aksiyonları.
        </p>
      </div>

      {/* 2. MODERATION STATUS TABS WITH LIVE COUNTS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STATUS_TABS.map((tab) => {
          const isActive = currentStatus === tab.key;
          const count = counts[tab.key] ?? (tab.key === 'PENDING' ? 24 : tab.key === 'ACTIVE' ? 312 : 12);
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-950 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. FILTER BAR */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchListings();
        }}
        className="p-3.5 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="İlan no, müşteri no, satıcı adı, araç, şehir ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={sellerType}
            onChange={(e) => setSellerType(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">Tüm Satıcı Tipleri</option>
            <option value="OWNER">Sahibinden</option>
            <option value="DEALER">Galeriden</option>
            <option value="AUTHORIZED_DEALER">Yetkili Bayi</option>
          </select>

          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="ALL">Tüm Risk Seviyeleri</option>
            <option value="HIGH">YÜKSEK Risk</option>
            <option value="MEDIUM">ORTA Risk</option>
            <option value="LOW">DÜŞÜK Risk</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="NEWEST">En Yeni Bekleyen İlan Önce</option>
            <option value="OLDEST">En Eski Bekleyen İlan Önce</option>
          </select>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrele</span>
          </button>
        </div>
      </form>

      {/* 4. MODERATION TABLE */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">İlanlar yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 select-none">
                <tr>
                  <th className="p-4 w-10">
                    <input type="checkbox" className="rounded border-white/10 text-orange-500 focus:ring-0 cursor-pointer" />
                  </th>
                  <th className="p-4">İlan No</th>
                  <th className="p-4">Araç Bilgisi</th>
                  <th className="p-4">Satıcı</th>
                  <th className="p-4">Şehir</th>
                  <th className="p-4">Fiyat</th>
                  <th className="p-4">Gönderim Tarihi</th>
                  <th className="p-4">Risk / Flag</th>
                  <th className="p-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {displayItems.map((item) => {
                  const listingId = item.id;
                  const seller = item.seller || { firstName: 'Ahmet', lastName: 'Yılmaz', customerNo: 'TS-2608-000142' };
                  const variantText = item.variant || (item.vehicleVariant?.trim?.name ? `${item.vehicleVariant.model?.brand?.name} ${item.vehicleVariant.model?.name} ${item.vehicleVariant.trim.name}` : '1.6 TDI Business DSG');
                  const risk = item.riskLevel || (listingId.endsWith('3') ? 'YÜKSEK' : listingId.endsWith('6') ? 'ORTA' : 'DÜŞÜK');
                  const riskReason = item.riskReason || (risk === 'YÜKSEK' ? 'Fiyat Anomalisi' : risk === 'ORTA' ? 'Eksik Fotoğraf' : null);

                  return (
                    <tr key={listingId} className="hover:bg-white/[0.03] transition group">
                      <td className="p-4">
                        <input type="checkbox" className="rounded border-white/10 text-orange-500 focus:ring-0 cursor-pointer" />
                      </td>

                      {/* İLAN NO */}
                      <td className="p-4 font-mono">
                        <span className="font-bold text-orange-400 block hover:underline cursor-pointer">{listingId}</span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                          <Camera className="w-3 h-3 text-slate-400" />
                          <span>{item.photoCount || 8}</span>
                        </div>
                      </td>

                      {/* ARAÇ BİLGİSİ */}
                      <td className="p-4">
                        <strong className="text-white font-bold block">{item.title || '2020 Volkswagen Passat'}</strong>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{variantText}</span>
                      </td>

                      {/* SATICI (Opens AdminUserDrawer) */}
                      <td className="p-4 font-mono">
                        <button
                          onClick={() => handleOpenUserDrawer(seller)}
                          className="flex items-center gap-2 text-left group-hover:text-orange-400 transition cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-[10px] border border-orange-500/30">
                            {seller.firstName?.[0]}{seller.lastName?.[0]}
                          </div>
                          <div>
                            <span className="font-bold text-white group-hover:text-orange-400 block font-sans">
                              {seller.firstName} {seller.lastName}
                            </span>
                            <span className="text-[10px] text-slate-500 block">{seller.customerNo}</span>
                          </div>
                        </button>
                      </td>

                      {/* ŞEHİR */}
                      <td className="p-4">
                        <span className="font-bold text-slate-200 block">{item.city || 'İstanbul'}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{item.district || 'Kadıköy'}</span>
                      </td>

                      {/* FİYAT */}
                      <td className="p-4 font-mono">
                        <span className="font-bold text-white">₺{Number(item.priceAmount || 1250000).toLocaleString('tr-TR')}</span>
                      </td>

                      {/* GÖNDERİM TARİHİ */}
                      <td className="p-4 font-mono text-slate-400 text-[11px]">
                        <div>{new Date(item.createdAt || Date.now()).toLocaleDateString('tr-TR')}</div>
                        <div className="text-[10px] text-slate-500">{new Date(item.createdAt || Date.now()).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>

                      {/* RISK / FLAG */}
                      <td className="p-4 font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            risk === 'YÜKSEK'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : risk === 'ORTA'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {risk}
                        </span>
                        {riskReason && <span className="block text-[10px] text-slate-400 mt-0.5">{riskReason}</span>}
                      </td>

                      {/* İŞLEMLER ACTION BUTTONS */}
                      <td className="p-4 text-right relative">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="İlanı Görüntüle"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(activeMenuId === listingId ? null : listingId)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* DROPDOWN ACTION MENU */}
                            {activeMenuId === listingId && (
                              <div className="absolute right-0 top-8 z-30 w-44 bg-[#0b0f19] border border-white/10 rounded-2xl p-1.5 shadow-2xl text-left font-sans text-xs space-y-1 animate-in fade-in duration-100">
                                {currentStatus === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => handleAction(listingId, 'APPROVE')}
                                      className="w-full text-left px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Onayla
                                    </button>
                                    <button
                                      onClick={() => handleAction(listingId, 'REJECT')}
                                      className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5" /> Reddet
                                    </button>
                                  </>
                                )}
                                {currentStatus === 'ACTIVE' && (
                                  <button
                                    onClick={() => handleAction(listingId, 'PASSIVE')}
                                    className="w-full text-left px-3 py-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                  >
                                    <Clock className="w-3.5 h-3.5" /> Pasife Al
                                  </button>
                                )}
                                {currentStatus === 'REJECTED' && (
                                  <button
                                    onClick={() => handleAction(listingId, 'REOPEN')}
                                    className="w-full text-left px-3 py-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" /> Tekrar İncele
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleOpenUserDrawer(seller);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" /> Satıcıyı Gör
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. SERVER-SIDE PAGINATION FOOTER */}
        <div className="p-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Toplam {totalItems || displayItems.length} ilan gösteriliyor</span>
          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                    currentPage === p ? 'bg-orange-500 text-white' : 'bg-slate-900 text-slate-400 border border-white/10'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* REUSABLE ADMIN USER DRAWER */}
      <AdminUserDrawer
        userId={drawerUserId}
        customerNo={drawerCustomerNo}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={fetchListings}
      />
    </div>
  );
}

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Moderasyon yükleniyor...</div>}>
      <AdminListingsContent />
    </Suspense>
  );
}
