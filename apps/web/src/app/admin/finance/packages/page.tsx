'use client';

import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  User,
  Calendar,
  Layers,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronRight,
  X,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  ShieldAlert,
  ArrowUpRight,
  CheckSquare,
  Square,
  RotateCcw,
  Zap,
  Star,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';
import { AdminListingInspectionModal } from '../../components/AdminListingInspectionModal';

export default function AdminFinancePackagesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Global Date Filter State
  const [period, setPeriod] = useState<'7d' | '30d' | 'ytd' | 'custom'>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Main Table Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Active Drilldown Drawer State
  const [activeDrilldown, setActiveDrilldown] = useState<string | null>(null);

  // Read-Only Transaction Detail Drawer State
  const [selectedTxDetail, setSelectedTxDetail] = useState<any | null>(null);

  // Reusable AdminUserDrawer State
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [drawerCustomerNo, setDrawerCustomerNo] = useState<string | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);

  // Reusable Admin Listing Inspection Modal State
  const [inspectionListingId, setInspectionListingId] = useState<string | null>(null);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);

  // Admin Grant (+) Modal State
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantStep, setGrantStep] = useState<'SELECT_USERS' | 'CONFIGURE' | 'CONFIRM' | 'RESULT'>('SELECT_USERS');

  // User Selection for Grant
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [grantUsersLoading, setGrantUsersLoading] = useState(false);
  const [grantUsersList, setGrantUsersList] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Grant Form Fields (Defaults to ALICI_PLUS in BUYER mode)
  const [selectedBuyerCode, setSelectedBuyerCode] = useState<'ALICI_MINI' | 'ALICI_PLUS' | 'ALICI_MAX'>('ALICI_PLUS');
  const [reasonCode, setReasonCode] = useState<string>('YONETIM_KARARI');
  const [customReason, setCustomReason] = useState<string>('');
  const [adminNote, setAdminNote] = useState<string>('');
  const [notifyUser, setNotifyUser] = useState<boolean>(true);

  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [grantResult, setGrantResult] = useState<any | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchOneTimePackagesData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/admin/finance/packages?period=${period}`;
      if (period === 'custom' && startDate) {
        url += `&startDate=${startDate}&endDate=${endDate || ''}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Tek seferlik paket verileri alınamadı.');
      const resData = await res.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOneTimePackagesData();
  }, [period, startDate, endDate]);

  // Fetch registered users for Grant Modal Search
  const fetchGrantUsers = async (q: string = '') => {
    setGrantUsersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/search-for-grant?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const resData = await res.json();
        setGrantUsersList(resData.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGrantUsersLoading(false);
    }
  };

  const handleOpenGrantModal = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents card body click from firing
    setIsGrantModalOpen(true);
    setGrantStep('SELECT_USERS');
    setSelectedUserIds([]);
    setGrantResult(null);
    fetchGrantUsers('');
  };

  const toggleUserSelection = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter((uId) => uId !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = grantUsersList.map((u) => u.id);
    const allSelected = visibleIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds(selectedUserIds.filter((id) => !visibleIds.includes(id)));
    } else {
      const newSelected = new Set([...selectedUserIds, ...visibleIds]);
      setSelectedUserIds(Array.from(newSelected));
    }
  };

  const handleExecuteBulkGrant = async () => {
    if (!selectedUserIds.length) return;
    setGrantSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/bulk-package-grants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserIds: selectedUserIds,
          packageGroup: 'BUYER',
          buyerPackageCode: selectedBuyerCode,
          reasonCode,
          reason: customReason || reasonCode,
          adminNote,
          notifyUser,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Paket tanımlanırken hata oluştu.');
      }

      const resData = await res.json();
      setGrantResult(resData);
      setGrantStep('RESULT');
      fetchOneTimePackagesData(); // Refresh dashboard live without F5
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız.');
    } finally {
      setGrantSubmitting(false);
    }
  };

  const openUserDrawer = (sellerId?: string, customerNo?: string) => {
    if (!sellerId) return;
    setDrawerUserId(sellerId);
    setDrawerCustomerNo(customerNo || null);
    setIsUserDrawerOpen(true);
  };

  const openListingModal = (listingId?: string) => {
    if (!listingId) return;
    setInspectionListingId(listingId);
    setIsListingModalOpen(true);
  };

  // Filter & Sort Main Transactions Table
  const filteredTransactions = (data?.transactions || [])
    .filter((t: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.transactionNo.toLowerCase().includes(q) ||
        t.customerNo.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.productName.toLowerCase().includes(q) ||
        (t.listing && t.listing.id.toLowerCase().includes(q)) ||
        (t.listing && t.listing.title.toLowerCase().includes(q))
      );
    })
    .sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* HEADER & GLOBAL DATE SELECTOR */}
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-400" />
            Tek Seferlik Paket Satışları & Operasyon Merkezi
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Tek seferlik Alıcı Paketi ve İlan Promosyon satışlarının gerçek ödeme, tahsilat ve hak teslim operasyon merkezi.
          </p>
        </div>

        {/* GLOBAL DATE RANGE FILTER */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-white/10 shrink-0 font-mono text-xs">
          {(['7d', '30d', 'ytd', 'custom'] as const).map((pKey) => (
            <button
              key={pKey}
              onClick={() => setPeriod(pKey)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                period === pKey
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {pKey === '7d' ? 'Son 7 Gün' : pKey === '30d' ? 'Son 30 Gün' : pKey === 'ytd' ? 'Bu Yıl' : 'Özel Tarih'}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-white/10 text-white text-[11px] px-2 py-1 rounded focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-500">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-white/10 text-white text-[11px] px-2 py-1 rounded focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Tek seferlik satış ve ödeme verileri analiz ediliyor...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchOneTimePackagesData}
            className="px-3 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Tekrar Deneyin
          </button>
        </div>
      ) : (
        <>
          {/* TOP 7 CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1: TOPLAM TEK SEFERLİK SATIŞ */}
            <div
              onClick={() => setActiveDrilldown('totalSales')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-amber-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Toplam Tek Seferlik Satış
                </span>
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-amber-400 font-mono">
                  {data?.kpis?.totalOneTimeSalesCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Gerçek Başarılı Ödeme Sayısı
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-amber-400 font-bold">
                <span>Satışları Gör</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 2: TEK SEFERLİK PAKET GELİRİ */}
            <div
              onClick={() => setActiveDrilldown('revenueBreakdown')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tek Seferlik Paket Geliri
                </span>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  ₺{(data?.kpis?.totalOneTimeRevenue || 0).toLocaleString('tr-TR')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Gerçek Tahsil Edilen Tutar
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                <span>Gelir Dağılımı</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 3: ALICI PAKETİ SATIŞLARI */}
            <div
              onClick={() => setActiveDrilldown('buyerSales')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Alıcı Paketi Satışları
                </span>
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-purple-400 font-mono">
                  {data?.kpis?.buyerPackageSalesCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Ücretli Ek Hak Paketi Satışları
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-purple-400 font-bold">
                <span>Paket Satışlarını Gör</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 4: İLAN PROMOSYON SATIŞLARI (WITH SECONDARY BREAKDOWN PILLS) */}
            <div
              onClick={() => setActiveDrilldown('promoSales')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  İlan Promosyon Satışları
                </span>
                <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-cyan-400 font-mono">
                  {data?.kpis?.promotionSalesCount || 0}
                </div>
                {/* SECONDARY BREAKDOWN PILLS */}
                <div className="flex items-center gap-2 mt-2 font-mono text-[10px]">
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded font-bold">
                    Acil: {data?.kpis?.urgentPromotionsCount || 0}
                  </span>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded font-bold">
                    Vitrin: {data?.kpis?.showcasePromotionsCount || 0}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-cyan-400 font-bold">
                <span>Promosyon Detayları</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 5: İADE / İPTAL EDİLEN İŞLEMLER */}
            <div
              onClick={() => setActiveDrilldown('refunded')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-rose-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  İade / İptal Edilen İşlemler
                </span>
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 group-hover:scale-110 transition-transform">
                  <RotateCcw className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-rose-400 font-mono">
                  {data?.kpis?.refundedTransactionsCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Geri Ödeme / Reversal Kayıtları
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-rose-400 font-bold">
                <span>İadeleri İncele</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 6: HAK / ÜRÜN TESLİM SORUNU OLAN SATIŞLAR */}
            <div
              onClick={() => setActiveDrilldown('deliveryIssues')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-rose-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Hak / Ürün Teslim Sorunlu
                </span>
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-rose-400 font-mono">
                  {data?.kpis?.deliveryIssuesCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Ödendi Ancak Uygulanmadı
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-rose-400 font-bold">
                <span>Sorunları İncele</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 7: YÖNETİCİ TARAFINDAN TANIMLANAN ALICI PAKETLERİ (OPERASYON KARTI WITH '+' BUTTON) */}
            <div
              onClick={() => setActiveDrilldown('adminGrantedBuyer')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer group space-y-2 relative overflow-hidden md:col-span-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Yönetici Tarafından Tanımlanan Alıcı Paketleri
                </span>

                {/* '+' BUTTON (HANDLES EVENT PROPAGATION SEPARATELY) */}
                <button
                  onClick={handleOpenGrantModal}
                  title="Yönetici Tarafından Paket Tanımla (+)"
                  className="p-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-1 text-xs"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Paket Tanımla</span>
                </button>
              </div>

              <div>
                <div className="text-3xl font-black text-white font-mono">
                  {data?.kpis?.adminGrantedBuyerPackagesCount || 0}
                </div>
                <div className="text-[11px] text-amber-300/80 mt-1 font-mono">
                  Manuel Tanımlanan Alıcı Paket Hakları (Finansal Gelir = ₺0)
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-amber-400 font-bold">
                <span>Tanımlamaları İncele</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* MAIN TABLE: TEK SEFERLİK SATIŞLAR */}
          <div className="p-6 bg-slate-900/90 rounded-2xl border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Tek Seferlik Satışlar Tablosu</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Yalnızca ödemesi doğrulanmış gerçek tek seferlik satın alımları gösterir.
                </p>
              </div>

              {/* SEARCH INPUT */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="İşlem no, müşteri, ilan, ürün ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-white text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 w-64"
                />
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs space-y-2 bg-slate-950/60 rounded-xl border border-white/5">
                <p className="text-white font-bold text-sm">Henüz tek seferlik paket satışı bulunmuyor.</p>
                <p className="text-slate-400 text-xs">
                  Bu liste yalnız gerçek başarılı ödeme kaydı bulunan tek seferlik satın alımları gösterir.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase">
                      <th onClick={() => handleSort('transactionNo')} className="p-3 cursor-pointer hover:text-white">
                        İşlem No
                      </th>
                      <th onClick={() => handleSort('customerNo')} className="p-3 cursor-pointer hover:text-white">
                        Müşteri No & Kullanıcı
                      </th>
                      <th onClick={() => handleSort('productName')} className="p-3 cursor-pointer hover:text-white">
                        Ürün / Paket
                      </th>
                      <th className="p-3">Tür</th>
                      <th onClick={() => handleSort('date')} className="p-3 text-right cursor-pointer hover:text-white">
                        Satın Alma Tarihi
                      </th>
                      <th onClick={() => handleSort('amountPaid')} className="p-3 text-right cursor-pointer hover:text-white">
                        Tutar
                      </th>
                      <th className="p-3 text-right">Ödeme Durumu</th>
                      <th className="p-3 text-right">Teslim Durumu</th>
                      <th className="p-3 text-right">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {filteredTransactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-slate-400">{t.transactionNo}</td>
                        <td className="p-3 font-bold text-white">
                          <button
                            onClick={() => openUserDrawer(t.userId, t.customerNo)}
                            className="text-left hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.userName}</span>
                          </button>
                        </td>
                        <td className="p-3 font-bold text-amber-400">
                          {t.productName}
                          {t.listing && (
                            <button
                              onClick={() => openListingModal(t.listing.id)}
                              className="block text-[10px] text-slate-400 font-normal hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer mt-0.5"
                            >
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                              <span>İlan: {t.listing.title}</span>
                            </button>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-white/5 text-slate-300 rounded text-[10px] font-bold">
                            {t.productTypeLabel}
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-400">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">₺{t.amountPaid}</td>
                        <td className="p-3 text-right">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold">
                            {t.paymentStatusLabel}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.deliveryStatus === 'DELIVERY_FAILED'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-cyan-500/10 text-cyan-400'
                            }`}
                          >
                            {t.deliveryStatusLabel}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedTxDetail(t)}
                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-bold cursor-pointer"
                          >
                            Satın Alma Detayı
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* DRILLDOWN DRAWER */}
      {activeDrilldown && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end transition-opacity animate-in fade-in">
          <div className="w-full max-w-4xl bg-slate-950 border-l border-white/10 h-full flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  {activeDrilldown === 'totalSales' && 'Toplam Tek Seferlik Satışlar Drill-down'}
                  {activeDrilldown === 'revenueBreakdown' && 'Tek Seferlik Gelir & Kırılım Detayı'}
                  {activeDrilldown === 'buyerSales' && 'Alıcı Paketi Satışları Listesi'}
                  {activeDrilldown === 'promoSales' && 'İlan Promosyon Satışları Listesi'}
                  {activeDrilldown === 'refunded' && 'İade & İptal Edilen İşlemler Listesi'}
                  {activeDrilldown === 'deliveryIssues' && 'Hak / Ürün Teslim Sorunlu İşlemler'}
                  {activeDrilldown === 'adminGrantedBuyer' && 'Yönetici Tarafından Tanımlanan Alıcı Paketleri'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {activeDrilldown === 'adminGrantedBuyer'
                    ? 'Yalnızca yönetici tarafından manuel tanımlanan Alıcı Paketleri (Finansal Gelir = ₺0)'
                    : 'Seçili tarih aralığı doğrultusunda süzülmüş işlem kayıtları'}
                </p>
              </div>

              <button
                onClick={() => setActiveDrilldown(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
              {activeDrilldown === 'revenueBreakdown' ? (
                /* REVENUE BREAKDOWN DRILLDOWN */
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-slate-900 border border-white/10 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Alıcı Paketleri Geliri</span>
                      <span className="text-xl font-black text-purple-400 mt-1 block">
                        ₺{(data?.kpis?.revenueBreakdown?.buyerPackagesRevenue || 0).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="p-4 bg-slate-900 border border-white/10 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Acil İlan Paketi Geliri</span>
                      <span className="text-xl font-black text-rose-400 mt-1 block">
                        ₺{(data?.kpis?.revenueBreakdown?.urgentPromotionsRevenue || 0).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="p-4 bg-slate-900 border border-white/10 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Vitrin + Keşfet Geliri</span>
                      <span className="text-xl font-black text-cyan-400 mt-1 block">
                        ₺{(data?.kpis?.revenueBreakdown?.showcasePromotionsRevenue || 0).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>
              ) : activeDrilldown === 'adminGrantedBuyer' ? (
                /* ADMIN GRANTED BUYER PACKAGES DRILLDOWN */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400 font-bold">
                      Toplam {data?.adminGrantedBuyerPackages?.length || 0} Aktif Yönetici Tanımlı Alıcı Paketi
                    </span>
                    <button
                      onClick={handleOpenGrantModal}
                      className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Yeni Paket Tanımla</span>
                    </button>
                  </div>

                  {data?.adminGrantedBuyerPackages?.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Henüz yönetici tarafından tanımlanmış Alıcı Paketi bulunmuyor.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-900/60">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase">
                            <th className="p-3">Müşteri No & Kullanıcı</th>
                            <th className="p-3">Tanımlanan Paket</th>
                            <th className="p-3">Verilen Haklar</th>
                            <th className="p-3">Tanımlanma Tarihi</th>
                            <th className="p-3">Tanımlayan Yönetici</th>
                            <th className="p-3 text-right">Finansal Etki</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {data?.adminGrantedBuyerPackages?.map((sub: any) => (
                            <tr key={sub.id} className="hover:bg-white/5">
                              <td className="p-3">
                                <button
                                  onClick={() => openUserDrawer(sub.userId, sub.customerNo)}
                                  className="text-left font-bold text-white hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{sub.userName}</span>
                                  <span className="text-[10px] text-slate-500">({sub.customerNo})</span>
                                </button>
                              </td>
                              <td className="p-3 font-bold text-amber-400">{sub.packageName}</td>
                              <td className="p-3 text-slate-300">
                                +{sub.rightsGranted.aiReportLimit} AI Rapor / +{sub.rightsGranted.chatbotMessageLimit} Chatbot
                              </td>
                              <td className="p-3 text-slate-400">{new Date(sub.grantedAt).toLocaleDateString('tr-TR')}</td>
                              <td className="p-3 text-slate-400">{sub.grantedByAdmin}</td>
                              <td className="p-3 text-right">
                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded">
                                  ADMIN GRANT (₺0)
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* GENERAL TRANSACTION DRILLDOWN LIST */
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-900/60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase">
                          <th className="p-3">İşlem No</th>
                          <th className="p-3">Kullanıcı</th>
                          <th className="p-3">Ürün</th>
                          <th className="p-3 text-right">Tutar</th>
                          <th className="p-3 text-right">Tarih</th>
                          <th className="p-3 text-right">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {data?.transactions
                          ?.filter((t: any) => {
                            if (activeDrilldown === 'buyerSales') return t.productType === 'BUYER_PACKAGE';
                            if (activeDrilldown === 'promoSales') return t.productType.startsWith('PROMOTION');
                            if (activeDrilldown === 'refunded') return t.refund !== null;
                            if (activeDrilldown === 'deliveryIssues') return t.deliveryStatus === 'DELIVERY_FAILED';
                            return true;
                          })
                          .map((t: any) => (
                            <tr key={t.id} className="hover:bg-white/5">
                              <td className="p-3 font-bold text-slate-400">{t.transactionNo}</td>
                              <td className="p-3">
                                <button
                                  onClick={() => openUserDrawer(t.userId, t.customerNo)}
                                  className="text-left font-bold text-white hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{t.userName}</span>
                                </button>
                              </td>
                              <td className="p-3 font-bold text-amber-400">{t.productName}</td>
                              <td className="p-3 text-right font-bold text-emerald-400">₺{t.amountPaid}</td>
                              <td className="p-3 text-right text-slate-400">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                              <td className="p-3 text-right">
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded">
                                  {t.paymentStatusLabel}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY PURCHASE & PAYMENT DETAIL DRAWER */}
      {selectedTxDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Satın Alma & Ödeme Detayı (Read-Only)</h3>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Kullanıcı & Müşteri No</span>
                <div className="font-bold text-white text-sm">{selectedTxDetail.userName}</div>
                <div className="text-[11px] text-slate-400">{selectedTxDetail.customerNo} — {selectedTxDetail.userEmail}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Satın Alınan Ürün</span>
                  <span className="font-bold text-amber-400">{selectedTxDetail.productName}</span>
                </div>
                <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Tahsil Edilen Tutar</span>
                  <span className="font-bold text-emerald-400">₺{selectedTxDetail.amountPaid}</span>
                </div>
              </div>

              {selectedTxDetail.listing && (
                <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase block">İlişkili İlan</span>
                  <button
                    onClick={() => {
                      openListingModal(selectedTxDetail.listing.id);
                    }}
                    className="font-bold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{selectedTxDetail.listing.title}</span>
                  </button>
                </div>
              )}

              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-2">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Ödeme Sağlayıcı & Geçmiş</span>
                <div className="flex items-center justify-between text-slate-300">
                  <span>İşlem No:</span>
                  <span className="font-bold text-white">{selectedTxDetail.transactionNo}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Ödeme Durumu:</span>
                  <span className="font-bold text-emerald-400">{selectedTxDetail.paymentStatusLabel}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Ödeme Sağlayıcı:</span>
                  <span className="font-bold text-slate-300">{selectedTxDetail.paymentProvider}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Hak / Ürün Teslim Durumu</span>
                <span className="font-bold text-cyan-400">{selectedTxDetail.deliveryStatusLabel}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABONELİK & ALICI PAKETİ TANIMLA (+) MODAL (REUSED IN ALICI PAKETİ MODE) */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-6 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Yönetici Tarafından Alıcı Paketi Tanımla (+)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Manuel tanımlanan Alıcı Paketleri kullanıcının haklarını günceller ancak ödeme/gelir oluşturmaz.
                </p>
              </div>

              <button
                onClick={() => setIsGrantModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {grantStep === 'SELECT_USERS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ad, e-posta, telefon veya Müşteri No ara..."
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value);
                        fetchGrantUsers(e.target.value);
                      }}
                      className="bg-slate-900 border border-white/10 text-white text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 w-full"
                    />
                  </div>

                  <button
                    onClick={toggleSelectAllVisible}
                    className="px-3 py-2 bg-slate-900 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tümünü Seç</span>
                  </button>
                </div>

                {selectedUserIds.length > 0 && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 font-bold flex items-center justify-between">
                    <span>{selectedUserIds.length} Kullanıcı Seçildi</span>
                    <button
                      onClick={() => setSelectedUserIds([])}
                      className="text-[10px] underline cursor-pointer"
                    >
                      Seçimi Temizle
                    </button>
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto border border-white/10 rounded-xl bg-slate-900/60 divide-y divide-white/5">
                  {grantUsersLoading ? (
                    <div className="p-8 text-center text-slate-400">Kullanıcılar aranıyor...</div>
                  ) : grantUsersList.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">Kullanıcı bulunamadı.</div>
                  ) : (
                    grantUsersList.map((u) => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleUserSelection(u.id)}
                          className={`p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors ${isSelected ? 'bg-amber-500/5' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{u.name}</span>
                                <span className="text-[10px] text-slate-500">({u.customerNo})</span>
                              </div>
                              <div className="text-[10px] text-slate-400">{u.email}</div>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 bg-white/5 text-slate-300 text-[10px] rounded">
                            {u.packageName}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    disabled={selectedUserIds.length === 0}
                    onClick={() => setGrantStep('CONFIGURE')}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Paket Ayarlarına Geç ({selectedUserIds.length})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {grantStep === 'CONFIGURE' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-slate-400 font-bold block">Tanımlanacak Alıcı Ek Hak Paketi</label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedBuyerCode('ALICI_MINI')}
                      className={`p-4 border rounded-xl text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedBuyerCode === 'ALICI_MINI'
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-white/10 bg-slate-900 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold text-amber-400">Alıcı Mini Ek Hak Paketi</div>
                        <div className="text-[11px] text-slate-300 mt-1 font-mono">
                          +5 AI Araç Riski Raporu • +20 Chatbot Mesajı
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-white/10 rounded text-[10px] font-bold text-slate-300">
                        30 Gün Geçerli
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedBuyerCode('ALICI_PLUS')}
                      className={`p-4 border rounded-xl text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedBuyerCode === 'ALICI_PLUS'
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-white/10 bg-slate-900 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold text-amber-400">Alıcı Plus Ek Hak Paketi</div>
                        <div className="text-[11px] text-slate-300 mt-1 font-mono">
                          +15 AI Araç Riski Raporu • +50 Chatbot Mesajı
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-white/10 rounded text-[10px] font-bold text-slate-300">
                        30 Gün Geçerli
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedBuyerCode('ALICI_MAX')}
                      className={`p-4 border rounded-xl text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedBuyerCode === 'ALICI_MAX'
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-white/10 bg-slate-900 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold text-amber-400">Alıcı Max Ek Hak Paketi</div>
                        <div className="text-[11px] text-slate-300 mt-1 font-mono">
                          +30 AI Araç Riski Raporu • +100 Chatbot Mesajı
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-white/10 rounded text-[10px] font-bold text-slate-300">
                        45 Gün Geçerli
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 font-bold block">Tanımlama Nedeni (Zorunlu)</label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                  >
                    <option value="KAMPANYA">Kampanya Tanımlaması</option>
                    <option value="TEST">Test / Deneme Hesabı</option>
                    <option value="IS_ORTAKLIGI">İş Ortaklığı / Kurumsal</option>
                    <option value="MUSTERI_MEMNUNIYETI">Müşteri Memnuniyeti</option>
                    <option value="YONETIM_KARARI">Yönetim Kararı</option>
                    <option value="DIGER">Diğer</option>
                  </select>
                </div>

                {reasonCode === 'DIGER' && (
                  <input
                    type="text"
                    placeholder="Özel nedeni belirtin..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
                  />
                )}

                <div className="space-y-2">
                  <label className="text-slate-400 font-bold block">Internal Admin Notu (İsteğe Bağlı)</label>
                  <textarea
                    rows={2}
                    placeholder="Kullanıcıya gösterilmez, yalnız admin log kaydında saklanır..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="notifyUserPkg"
                    checked={notifyUser}
                    onChange={(e) => setNotifyUser(e.target.checked)}
                    className="rounded text-amber-500 bg-slate-900 border-white/10 cursor-pointer"
                  />
                  <label htmlFor="notifyUserPkg" className="text-slate-300 text-xs cursor-pointer">
                    Kullanıcıya bildirim mesajı gönder
                  </label>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    onClick={() => setGrantStep('SELECT_USERS')}
                    className="px-4 py-2 bg-slate-900 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Geri
                  </button>
                  <button
                    onClick={() => setGrantStep('CONFIRM')}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Onay Ekranına Geç
                  </button>
                </div>
              </div>
            )}

            {grantStep === 'CONFIRM' && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <h4 className="font-bold text-amber-400 text-sm">İşlem Onayı</h4>
                  <p className="text-slate-300 text-xs">
                    Seçilen <strong className="text-white">{selectedUserIds.length} kullanıcıya</strong>{' '}
                    <strong className="text-amber-400">
                      {selectedBuyerCode === 'ALICI_MINI'
                        ? 'Alıcı Mini Ek Hak Paketi'
                        : selectedBuyerCode === 'ALICI_MAX'
                        ? 'Alıcı Max Ek Hak Paketi'
                        : 'Alıcı Plus Ek Hak Paketi'}
                    </strong>{' '}
                    tanımlanacaktır.
                  </p>

                  <p className="text-slate-400 text-[11px]">
                    Neden: <strong>{reasonCode}</strong> | Finansal Gelir Değişimi:{' '}
                    <strong>₺0 (Yönetici tanımlaması gelir üretmez)</strong>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    disabled={grantSubmitting}
                    onClick={() => setGrantStep('CONFIGURE')}
                    className="px-4 py-2 bg-slate-900 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Geri
                  </button>
                  <button
                    disabled={grantSubmitting}
                    onClick={handleExecuteBulkGrant}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                  >
                    {grantSubmitting && <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />}
                    <span>İşlemi Tamamla ve Tanımla</span>
                  </button>
                </div>
              </div>
            )}

            {grantStep === 'RESULT' && (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Paket Tanımlaması Başarıyla Tamamlandı</h4>
                <p className="text-xs text-slate-400">
                  Toplu İşlem Sonucu: <strong className="text-emerald-400">{grantResult?.successCount || 0} Başarılı</strong>,{' '}
                  <strong className="text-rose-400">{grantResult?.failureCount || 0} Başarısız</strong>.
                </p>

                <div className="pt-4 border-t border-white/10 flex justify-center">
                  <button
                    onClick={() => setIsGrantModalOpen(false)}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REUSABLE ADMIN USER DRAWER */}
      <AdminUserDrawer
        userId={drawerUserId}
        customerNo={drawerCustomerNo}
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
        onRefresh={fetchOneTimePackagesData}
      />

      {/* REUSABLE ADMIN LISTING INSPECTION MODAL */}
      <AdminListingInspectionModal
        listingId={inspectionListingId}
        isOpen={isListingModalOpen}
        onClose={() => setIsListingModalOpen(false)}
        onRefresh={fetchOneTimePackagesData}
      />
    </div>
  );
}
