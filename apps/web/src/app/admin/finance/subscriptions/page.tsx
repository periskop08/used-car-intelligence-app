'use client';

import React, { useEffect, useState, Suspense } from 'react';
import {
  CreditCard,
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
  ShoppingBag,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';

export default function AdminFinanceSubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter for Main Paid Table
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Drilldown Drawer State
  const [activeDrilldown, setActiveDrilldown] = useState<string | null>(null);

  // Reusable AdminUserDrawer State
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [drawerCustomerNo, setDrawerCustomerNo] = useState<string | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);

  // Read-Only Paid Subscription Detail Modal State
  const [selectedSubDetail, setSelectedSubDetail] = useState<any | null>(null);

  // Admin Grant (+) Modal State
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantStep, setGrantStep] = useState<'SELECT_USERS' | 'CONFIGURE' | 'CONFIRM' | 'RESULT'>('SELECT_USERS');

  // User Selection for Grant
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [grantUsersLoading, setGrantUsersLoading] = useState(false);
  const [grantUsersList, setGrantUsersList] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Package Mode State (ABONELİK PAKETİ vs ALICI PAKETİ)
  const [packageGroup, setPackageGroup] = useState<'SUBSCRIPTION' | 'BUYER'>('SUBSCRIPTION');

  // Subscription Tier State
  const [selectedTier, setSelectedTier] = useState<'STANDARD' | 'PRO'>('PRO');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [isUnlimitedDuration, setIsUnlimitedDuration] = useState<boolean>(false);

  // Buyer Package State
  const [selectedBuyerCode, setSelectedBuyerCode] = useState<'ALICI_MINI' | 'ALICI_PLUS' | 'ALICI_MAX'>('ALICI_PLUS');

  // Shared Grant Form Fields
  const [reasonCode, setReasonCode] = useState<string>('YONETIM_KARARI');
  const [customReason, setCustomReason] = useState<string>('');
  const [adminNote, setAdminNote] = useState<string>('');
  const [notifyUser, setNotifyUser] = useState<boolean>(true);

  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [grantResult, setGrantResult] = useState<any | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchSubscriptionsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/finance/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Abonelik verileri alınamadı.');
      const resData = await res.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionsData();
  }, []);

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
    setPackageGroup('SUBSCRIPTION');
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
          packageGroup,
          tier: packageGroup === 'SUBSCRIPTION' ? selectedTier : undefined,
          buyerPackageCode: packageGroup === 'BUYER' ? selectedBuyerCode : undefined,
          durationDays: packageGroup === 'SUBSCRIPTION' ? (isUnlimitedDuration ? 36500 : durationDays) : undefined,
          isUnlimited: packageGroup === 'SUBSCRIPTION' ? isUnlimitedDuration : undefined,
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
      fetchSubscriptionsData(); // Refresh dashboard live without F5
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız.');
    } finally {
      setGrantSubmitting(false);
    }
  };

  const openSellerDrawer = (sellerId?: string, customerNo?: string) => {
    if (!sellerId) return;
    setDrawerUserId(sellerId);
    setDrawerCustomerNo(customerNo || null);
    setIsUserDrawerOpen(true);
  };

  // Filter & Sort Paid Subscribers for Main Table
  const filteredPaidSubscribers = (data?.paidSubscribers || [])
    .filter((s: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.customerNo.toLowerCase().includes(q) ||
        s.userName.toLowerCase().includes(q) ||
        s.userEmail.toLowerCase().includes(q) ||
        s.packageName.toLowerCase().includes(q)
      );
    })
    .sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'startDate' || sortField === 'nextRenewalDate') {
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
      {/* HEADER */}
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-400" />
            Aktif Abonelikler & Yönetici Tanımları
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Gerçek recurring abonelikler ile yönetici tarafından tanımlanan paket haklarının ayrı yönetimi.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Abonelik verileri analiz ediliyor...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchSubscriptionsData}
            className="px-3 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Tekrar Deneyin
          </button>
        </div>
      ) : (
        <>
          {/* TOP 7 CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1: AKTİF ÜCRETLİ ABONELİKLER */}
            <div
              onClick={() => setActiveDrilldown('activePaid')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Aktif Ücretli Abonelikler
                </span>
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-purple-400 font-mono">
                  {data?.kpis?.activePaidSubscriptionsCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Gerçek Recurring Ödeyen Üyeler
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-purple-400 font-bold">
                <span>Aboneleri Gör</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 2: YETKİN PAKET ABONELERİ */}
            <div
              onClick={() => setActiveDrilldown('yetkinPaid')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Yetkin Paket Aboneleri
                </span>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {data?.kpis?.yetkinPaidCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Ücretli Yetkin Üye (₺249/ay)
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                <span>Listele</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 3: PROFESYONEL PAKET ABONELERİ */}
            <div
              onClick={() => setActiveDrilldown('profesyonelPaid')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Profesyonel Paket Aboneleri
                </span>
                <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-cyan-400 font-mono">
                  {data?.kpis?.profesyonelPaidCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Ücretli Profesyonel Üye (₺499/ay)
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-cyan-400 font-bold">
                <span>Listele</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 4: ABONELİK MRR KATKISI */}
            <div
              onClick={() => setActiveDrilldown('mrrContrib')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Abonelik MRR Katkısı
                </span>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  ₺{(data?.kpis?.subscriptionMrrContribution || 0).toLocaleString('tr-TR')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Aylık Normalize Recurring Gelir
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                <span>Katkı Detayı</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 5: YAKLAŞAN YENİLEMELER */}
            <div
              onClick={() => setActiveDrilldown('upcomingRenewals')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-amber-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Yaklaşan Yenilemeler
                </span>
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-amber-400 font-mono">
                  {data?.kpis?.upcomingRenewalsCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Önümüzdeki 7 Gün İçi Yenilemeler
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-amber-400 font-bold">
                <span>Yenilemeleri Gör</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 6: ÖDEME SORUNU OLAN ABONELİKLER */}
            <div
              onClick={() => setActiveDrilldown('paymentIssues')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-white/10 hover:border-rose-500/50 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Ödeme Sorunu Olan Abonelikler
                </span>
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-rose-400 font-mono">
                  {data?.kpis?.paymentIssuesCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  Past-due / Başarısız Ödemeler
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-rose-400 font-bold">
                <span>Sorunları İncele</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* CARD 7: YÖNETİCİ TARAFINDAN TANIMLANAN ABONELİKLER (OPERASYON KARTI WITH '+' BUTTON) */}
            <div
              onClick={() => setActiveDrilldown('adminGranted')}
              className="p-5 bg-slate-900/90 rounded-2xl border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer group space-y-2 relative overflow-hidden md:col-span-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Yönetici Tarafından Tanımlanan Abonelikler
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
                  {data?.kpis?.adminGrantedSubscriptionsCount || 0}
                </div>
                <div className="text-[11px] text-amber-300/80 mt-1 font-mono">
                  Manuel Tanımlanan Abonelik Hakları (Finansal MRR = ₺0)
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-amber-400 font-bold">
                <span>Tanımlamaları Yönet / İncele</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* MAIN TABLE: AKTİF ÜCRETLİ ABONELİKLER */}
          <div className="p-6 bg-slate-900/90 rounded-2xl border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span>Aktif Ücretli Abonelikler Tablosu</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Yalnızca recurring ödemesi doğrulanmış aboneleri listeler.
                </p>
              </div>

              {/* SEARCH INPUT */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Müşteri No, ad, e-posta ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-white text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-purple-500 w-64"
                />
              </div>
            </div>

            {filteredPaidSubscribers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs space-y-2 bg-slate-950/60 rounded-xl border border-white/5">
                <p className="text-white font-bold text-sm">Henüz aktif ücretli abonelik bulunmuyor.</p>
                <p className="text-slate-400 text-xs">
                  Bu liste yalnız gerçek recurring ödeme/abonelik kaydı bulunan ücretli üyeleri gösterir.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase">
                      <th onClick={() => handleSort('customerNo')} className="p-3 cursor-pointer hover:text-white">
                        Müşteri No
                      </th>
                      <th onClick={() => handleSort('userName')} className="p-3 cursor-pointer hover:text-white">
                        Ad Soyad & Kullanıcı
                      </th>
                      <th onClick={() => handleSort('packageName')} className="p-3 cursor-pointer hover:text-white">
                        Paket
                      </th>
                      <th onClick={() => handleSort('monthlyPrice')} className="p-3 text-right cursor-pointer hover:text-white">
                        Aylık Tutar
                      </th>
                      <th onClick={() => handleSort('startDate')} className="p-3 text-right cursor-pointer hover:text-white">
                        Başlangıç
                      </th>
                      <th onClick={() => handleSort('nextRenewalDate')} className="p-3 text-right cursor-pointer hover:text-white">
                        Sonraki Yenileme
                      </th>
                      <th className="p-3 text-right">Durum</th>
                      <th className="p-3 text-right">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {filteredPaidSubscribers.map((s: any) => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-slate-400">{s.customerNo}</td>
                        <td className="p-3 font-bold text-white">
                          <button
                            onClick={() => openSellerDrawer(s.userId, s.customerNo)}
                            className="text-left hover:text-purple-400 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{s.userName}</span>
                          </button>
                        </td>
                        <td className="p-3 font-bold text-purple-400">{s.packageName}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">₺{s.monthlyPrice}</td>
                        <td className="p-3 text-right text-slate-400">{new Date(s.startDate).toLocaleDateString('tr-TR')}</td>
                        <td className="p-3 text-right text-slate-400">{new Date(s.nextRenewalDate).toLocaleDateString('tr-TR')}</td>
                        <td className="p-3 text-right">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold">
                            AKTİF (PAID)
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedSubDetail(s)}
                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-bold cursor-pointer"
                          >
                            Abonelik Detayı
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
                  <Layers className="w-5 h-5 text-purple-400" />
                  {activeDrilldown === 'adminGranted' && 'Yönetici Tarafından Tanımlanan Abonelikler'}
                  {activeDrilldown === 'activePaid' && 'Aktif Ücretli Aboneler Listesi'}
                  {activeDrilldown === 'yetkinPaid' && 'Yetkin Paket Ücretli Aboneler Listesi'}
                  {activeDrilldown === 'profesyonelPaid' && 'Profesyonel Paket Ücretli Aboneler Listesi'}
                  {activeDrilldown === 'mrrContrib' && 'Abonelik MRR Katkısı Detayı'}
                  {activeDrilldown === 'upcomingRenewals' && 'Yaklaşan Yenilemeler Listesi'}
                  {activeDrilldown === 'paymentIssues' && 'Ödeme Sorunu Olan Abonelikler Listesi'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {activeDrilldown === 'adminGranted'
                    ? 'Yalnızca yönetici tarafından manuel tanımlanan abonelik paket hakları (Finansal Gelir = ₺0)'
                    : 'Gerçek recurring ödemesi doğrulanmış abonelik kayıtları'}
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
              {activeDrilldown === 'adminGranted' ? (
                /* ADMIN GRANTED SUBSCRIPTIONS LIST */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400 font-bold">
                      Toplam {data?.adminGrantedSubscribers?.length || 0} Aktif Yönetici Tanımlı Abonelik
                    </span>
                    <button
                      onClick={handleOpenGrantModal}
                      className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Yeni Paket Tanımla</span>
                    </button>
                  </div>

                  {data?.adminGrantedSubscribers?.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Henüz yönetici tarafından tanımlanmış aktif abonelik hakkı bulunmuyor.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-900/60">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase">
                            <th className="p-3">Müşteri No & Kullanıcı</th>
                            <th className="p-3">Tanımlanan Paket</th>
                            <th className="p-3">Tanımlanma Tarihi</th>
                            <th className="p-3">Tanımlayan Yönetici</th>
                            <th className="p-3">Tanımlama Nedeni</th>
                            <th className="p-3 text-right">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {data?.adminGrantedSubscribers?.map((sub: any) => (
                            <tr key={sub.id} className="hover:bg-white/5">
                              <td className="p-3">
                                <button
                                  onClick={() => openSellerDrawer(sub.userId, sub.customerNo)}
                                  className="text-left font-bold text-white hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{sub.userName}</span>
                                  <span className="text-[10px] text-slate-500">({sub.customerNo})</span>
                                </button>
                              </td>
                              <td className="p-3 font-bold text-amber-400">{sub.packageName}</td>
                              <td className="p-3 text-slate-400">{new Date(sub.grantedAt).toLocaleDateString('tr-TR')}</td>
                              <td className="p-3 text-slate-400">{sub.grantedByAdmin}</td>
                              <td className="p-3 text-slate-300">{sub.reason}</td>
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
                /* PAID DRILLDOWN LIST */
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-white/10 rounded-xl bg-slate-900/60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase">
                          <th className="p-3">Müşteri No & Kullanıcı</th>
                          <th className="p-3">Paket</th>
                          <th className="p-3 text-right">Aylık Tutar</th>
                          <th className="p-3 text-right">Sonraki Yenileme</th>
                          <th className="p-3 text-right">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {data?.paidSubscribers
                          ?.filter((s: any) => {
                            if (activeDrilldown === 'yetkinPaid') return s.packageTier === 'STANDARD';
                            if (activeDrilldown === 'profesyonelPaid') return s.packageTier === 'PRO';
                            return true;
                          })
                          .map((sub: any) => (
                            <tr key={sub.id} className="hover:bg-white/5">
                              <td className="p-3">
                                <button
                                  onClick={() => openSellerDrawer(sub.userId, sub.customerNo)}
                                  className="text-left font-bold text-white hover:text-purple-400 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{sub.userName}</span>
                                  <span className="text-[10px] text-slate-500">({sub.customerNo})</span>
                                </button>
                              </td>
                              <td className="p-3 font-bold text-purple-400">{sub.packageName}</td>
                              <td className="p-3 text-right font-bold text-emerald-400">₺{sub.monthlyPrice}</td>
                              <td className="p-3 text-right text-slate-400">{new Date(sub.nextRenewalDate).toLocaleDateString('tr-TR')}</td>
                              <td className="p-3 text-right">
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded">
                                  AKTİF (PAID)
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

      {/* PAKET TANIMLA (+) MULTI-USER GRANT MODAL (SUPPORTING ABONELİK PAKETİ & ALICI PAKETİ MODES) */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-6 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Yönetici Tarafından Paket Tanımla (+)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Abonelik veya Alıcı Paketi manuel olarak tanımlanabilir. Manuel tanımlamalar kullanıcı haklarını günceller ancak ödeme/gelir oluşturmaz.
                </p>
              </div>

              <button
                onClick={() => setIsGrantModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: SELECT USERS */}
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

            {/* STEP 2: CONFIGURE PACKAGE & DURATION */}
            {grantStep === 'CONFIGURE' && (
              <div className="space-y-5">
                {/* PACKAGE GROUP MODE SELECTOR (ABONELİK PAKETİ vs ALICI PAKETİ) */}
                <div className="space-y-2">
                  <label className="text-slate-400 font-bold block">Tanımlanacak Paket Türü</label>
                  <div className="flex items-center gap-2 p-1 bg-slate-900 border border-white/10 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPackageGroup('SUBSCRIPTION')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        packageGroup === 'SUBSCRIPTION'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Abonelik Paketi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPackageGroup('BUYER')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        packageGroup === 'BUYER'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Alıcı Paketi (Ek Hak)</span>
                    </button>
                  </div>
                </div>

                {/* MODE 1: ABONELİK PAKETİ CHOICES */}
                {packageGroup === 'SUBSCRIPTION' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-slate-400 font-bold block">Abonelik Paketi Seçimi</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedTier('STANDARD')}
                          className={`p-4 border rounded-xl font-bold text-left transition-all cursor-pointer ${
                            selectedTier === 'STANDARD'
                              ? 'border-emerald-500 bg-emerald-500/10 text-white'
                              : 'border-white/10 bg-slate-900 text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          <div className="text-sm font-bold text-emerald-400">Yetkin Paket</div>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">Standart İlan Özellikleri</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTier('PRO')}
                          className={`p-4 border rounded-xl font-bold text-left transition-all cursor-pointer ${
                            selectedTier === 'PRO'
                              ? 'border-cyan-500 bg-cyan-500/10 text-white'
                              : 'border-white/10 bg-slate-900 text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          <div className="text-sm font-bold text-cyan-400">Profesyonel Paket</div>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">Gelişmiş Analiz & Ön Plana Çıkarma</div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-slate-400 font-bold block">Geçerlilik Süresi</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[7, 30, 90, 180, 365].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setDurationDays(d);
                              setIsUnlimitedDuration(false);
                            }}
                            className={`p-2.5 border rounded-xl font-bold text-xs cursor-pointer ${
                              durationDays === d && !isUnlimitedDuration
                                ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                                : 'border-white/10 bg-slate-900 text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            {d === 7 ? '7 Gün' : d === 30 ? '30 Gün (1 Ay)' : d === 90 ? '3 Ay' : d === 180 ? '6 Ay' : '1 Yıl'}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setIsUnlimitedDuration(true)}
                          className={`p-2.5 border rounded-xl font-bold text-xs cursor-pointer ${
                            isUnlimitedDuration
                              ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                              : 'border-white/10 bg-slate-900 text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          Süresiz
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* MODE 2: ALICI PAKETİ CHOICES (REAL CATALOG) */
                  <div className="space-y-2">
                    <label className="text-slate-400 font-bold block">Alıcı Ek Hak Paketi Seçimi</label>
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
                )}

                {/* REASON SELECTION */}
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

                {/* INTERNAL ADMIN NOTE */}
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
                    id="notifyUser"
                    checked={notifyUser}
                    onChange={(e) => setNotifyUser(e.target.checked)}
                    className="rounded text-amber-500 bg-slate-900 border-white/10 cursor-pointer"
                  />
                  <label htmlFor="notifyUser" className="text-slate-300 text-xs cursor-pointer">
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

            {/* STEP 3: CONFIRMATION */}
            {grantStep === 'CONFIRM' && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <h4 className="font-bold text-amber-400 text-sm">İşlem Onayı</h4>
                  <p className="text-slate-300 text-xs">
                    Seçilen <strong className="text-white">{selectedUserIds.length} kullanıcıya</strong>{' '}
                    <strong className="text-amber-400">
                      {packageGroup === 'BUYER'
                        ? selectedBuyerCode === 'ALICI_MINI'
                          ? 'Alıcı Mini Ek Hak Paketi'
                          : selectedBuyerCode === 'ALICI_MAX'
                          ? 'Alıcı Max Ek Hak Paketi'
                          : 'Alıcı Plus Ek Hak Paketi'
                        : selectedTier === 'PRO'
                        ? 'Profesyonel Abonelik Paketi'
                        : 'Yetkin Abonelik Paketi'}
                    </strong>{' '}
                    tanımlanacaktır.
                  </p>

                  {packageGroup === 'BUYER' && (
                    <div className="text-slate-300 text-[11px] space-y-0.5 pt-1 border-t border-amber-500/20">
                      <div>
                        Tanımlanacak Haklar:{' '}
                        <strong>
                          {selectedBuyerCode === 'ALICI_MINI'
                            ? '+5 AI Rapor / +20 Chatbot (30 Gün)'
                            : selectedBuyerCode === 'ALICI_MAX'
                            ? '+30 AI Rapor / +100 Chatbot (45 Gün)'
                            : '+15 AI Rapor / +50 Chatbot (30 Gün)'}
                        </strong>
                      </div>
                    </div>
                  )}

                  <p className="text-slate-400 text-[11px]">
                    Neden: <strong>{reasonCode}</strong> | Finansal Gelir Değişimi:{' '}
                    <strong>₺0 (Yönetici tanımlaması gelir/MRR üretmez)</strong>
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

            {/* STEP 4: RESULT */}
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

      {/* READ-ONLY SUBSCRIPTION & PAYMENT HISTORY DETAIL MODAL */}
      {selectedSubDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Abonelik Detayı & Ödeme Geçmişi (Read-Only)</h3>
              <button
                onClick={() => setSelectedSubDetail(null)}
                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Kullanıcı & Müşteri No</span>
                <div className="font-bold text-white text-sm">{selectedSubDetail.userName}</div>
                <div className="text-[11px] text-slate-400">{selectedSubDetail.customerNo} — {selectedSubDetail.userEmail}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Paket</span>
                  <span className="font-bold text-purple-400">{selectedSubDetail.packageName}</span>
                </div>
                <div className="p-3 bg-slate-900 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Aylık Tutar</span>
                  <span className="font-bold text-emerald-400">₺{selectedSubDetail.monthlyPrice}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Dönem & Yenileme</span>
                <div className="text-slate-300">
                  Başlangıç: <strong>{new Date(selectedSubDetail.startDate).toLocaleDateString('tr-TR')}</strong>
                </div>
                <div className="text-slate-300">
                  Sonraki Yenileme: <strong>{new Date(selectedSubDetail.nextRenewalDate).toLocaleDateString('tr-TR')}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-white/5 rounded-xl space-y-2">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Ödeme Sağlayıcı & Geçmiş</span>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Ödeme Durumu:</span>
                  <span className="font-bold text-emerald-400">PAID (SUCCESSFUL)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Ödeme Sağlayıcı:</span>
                  <span className="font-bold text-slate-300">IYZICO / BANK RECURRING</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REUSABLE ADMIN USER DRAWER */}
      <AdminUserDrawer
        userId={drawerUserId}
        customerNo={drawerCustomerNo}
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
        onRefresh={fetchSubscriptionsData}
      />
    </div>
  );
}
