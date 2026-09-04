'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Send,
  FileText,
  Eye,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Camera,
  RefreshCw,
  MessageSquare,
  History,
  ShieldAlert,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Info,
  Car,
  Tag,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { resolveEffectiveListingStatus, matchesSellerListingFilter } from '@/utils/listingStatusResolver';
import { AdminListingInspectionModal } from './AdminListingInspectionModal';

interface AdminUserDrawerProps {
  userId: string | null;
  customerNo?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function AdminUserDrawer({
  userId,
  customerNo,
  isOpen,
  onClose,
  onRefresh,
}: AdminUserDrawerProps) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LISTINGS' | 'HISTORY' | 'NOTES' | 'MESSAGES'>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Listing filter inside drawer
  const [listingFilter, setListingFilter] = useState<string>('ALL');

  // Selected Listing Inspection Modal State
  const [selectedInspectionListingId, setSelectedInspectionListingId] = useState<string | null>(null);

  // Moderation Action Reason Modal State
  const [moderationActionListing, setModerationActionListing] = useState<any>(null);
  const [moderationActionType, setModerationActionType] = useState<string | null>(null);
  const [modReasonCode, setModReasonCode] = useState<string>('PRICE_ANOMALY');
  const [modSellerMessage, setModSellerMessage] = useState<string>('');
  const [modInternalNote, setModInternalNote] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Listing Moderation History Modal State
  const [historyListing, setHistoryListing] = useState<any>(null);
  const [listingHistoryLogs, setListingHistoryLogs] = useState<any[]>([]);

  // Grant Package Modal State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [packageGroup, setPackageGroup] = useState<'SUBSCRIPTION' | 'BUYER'>('SUBSCRIPTION');
  const [selectedTier, setSelectedTier] = useState<string>('PROFESYONEL');
  const [selectedBuyerCode, setSelectedBuyerCode] = useState<string>('ALICI_PLUS');
  const [reasonCode, setReasonCode] = useState<string>('CUSTOMER_SUPPORT');
  const [reasonDesc, setReasonDesc] = useState<string>('');
  const [granting, setGranting] = useState(false);
  const [grantSuccessMsg, setGrantSuccessMsg] = useState<string | null>(null);

  // Send Message Dialog State
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Add Note Dialog State
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Dropdown action menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchUserData = async () => {
    if (!userId && !customerNo) return;
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      let targetId = userId;
      if (!targetId && customerNo) {
        const listRes = await fetch(`${API_BASE_URL}/users/admin/list?search=${encodeURIComponent(customerNo)}`, { headers });
        if (listRes.ok) {
          const listData = await listRes.json();
          targetId = listData.users?.[0]?.id;
        }
      }

      if (!targetId) throw new Error('Kullanıcı verisi bulunamadı.');

      const [uRes, subRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users/admin/${targetId}`, { headers }),
        fetch(`${API_BASE_URL}/subscriptions/summary?userId=${targetId}`, { headers }),
      ]);

      if (!uRes.ok) throw new Error('Kullanıcı detayları okunamadı.');

      const uData = await uRes.json();
      const subData = subRes.ok ? await subRes.json() : null;

      // Merging canonical API response properties (ROOT CAUSE FIX)
      const fullUser = {
        ...(uData.user || uData),
        listings: uData.listings || uData.user?.listings || [],
        subscriptions: uData.subscriptions || uData.user?.subscriptions || [],
        packagePurchases: uData.packagePurchases || uData.user?.packagePurchases || [],
        adminNotes: uData.adminNotes || uData.user?.adminNotes || [],
        adminMessages: uData.adminMessages || uData.user?.adminMessages || [],
        history: uData.history || uData.user?.history || [],
        usageStats: uData.usageStats || uData.user?.usageStats || {},
      };

      setUser(fullUser);
      setSubscription(subData);
      setHistoryItems(fullUser.history);
    } catch (err: any) {
      setError(err.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen, userId, customerNo]);

  if (!isOpen) return null;

  // Open Full Listing Inspection Screen via canonical modal
  const handleOpenFullInspection = (listing: any) => {
    setActiveMenuId(null);
    setSelectedInspectionListingId(listing.id);
  };

  // Moderation Action Handler
  const handleTriggerModerationAction = (listing: any, actionType: string) => {
    setActiveMenuId(null);
    if (actionType === 'APPROVE' || actionType === 'REOPEN') {
      executeModerationAction(listing.id, actionType, {});
    } else {
      setModerationActionListing(listing);
      setModerationActionType(actionType);
      setModReasonCode(
        actionType === 'ACTIVATE'
          ? 'ADMIN_REACTIVATION'
          : actionType === 'REQUEST_REVISION'
          ? 'INCORRECT_SPECS'
          : 'PRICE_ANOMALY'
      );
      setModSellerMessage(
        actionType === 'REQUEST_REVISION'
          ? 'Lütfen ilan detaylarınızdaki eksik/hatalı bilgileri güncelleyiniz.'
          : actionType === 'REJECT'
          ? 'İlanınız TorqueScout yayın ilkelerine uymadığı için reddedilmiştir.'
          : actionType === 'ACTIVATE'
          ? 'İlanınız yönetici tarafından yeniden aktifleştirilmiştir.'
          : 'İlanınız yönetici tarafından pasife alınmıştır.'
      );
      setModInternalNote('');
    }
  };

  const executeModerationAction = async (listingId: string, actionType: string, payload: any) => {
    setSubmittingAction(true);
    const token = localStorage.getItem('accessToken');

    let endpoint = '';
    if (actionType === 'APPROVE') endpoint = `/admin/listing-moderation/listings/${listingId}/approve`;
    else if (actionType === 'REQUEST_REVISION') endpoint = `/admin/listing-moderation/listings/${listingId}/request-revision`;
    else if (actionType === 'DETAILED_REVIEW') endpoint = `/admin/listing-moderation/listings/${listingId}/send-to-detailed-review`;
    else if (actionType === 'REJECT') endpoint = `/admin/listing-moderation/listings/${listingId}/reject`;
    else if (actionType === 'PASSIVE') endpoint = `/admin/listing-moderation/listings/${listingId}/set-passive`;
    else if (actionType === 'ACTIVATE') endpoint = `/admin/listing-moderation/listings/${listingId}/activate`;
    else if (actionType === 'REOPEN') endpoint = `/admin/listing-moderation/listings/${listingId}/reopen`;

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'İşlem gerçekleştirilemedi.');
      }

      setModerationActionListing(null);
      setModerationActionType(null);
      setSelectedInspectionListingId(null);

      // Instant refetch without full page reload
      await fetchUserData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenListingHistory = async (listing: any) => {
    setActiveMenuId(null);
    setHistoryListing(listing);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/listing-moderation/listings/${listing.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setListingHistoryLogs(data.pastActions || []);
      }
    } catch (e) {}
  };

  const handleOpenGrantModal = () => {
    setGrantSuccessMsg(null);
    setShowGrantModal(true);
  };

  const handleGrantPackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId && !user?.id) return;
    setGranting(true);
    setGrantSuccessMsg(null);

    const token = localStorage.getItem('accessToken');
    const targetUserId = userId || user?.id;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}/package-grants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          packageGroup,
          tier: packageGroup === 'SUBSCRIPTION' ? selectedTier : undefined,
          buyerPackageCode: packageGroup === 'BUYER' ? selectedBuyerCode : undefined,
          reasonCode,
          reason: reasonDesc,
          notifyUser: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Paket tanımlama hatası (USER_PACKAGE_MANAGE yetkisi gerekli).');
      }

      setGrantSuccessMsg(
        packageGroup === 'SUBSCRIPTION'
          ? `Abonelik Paketi (${selectedTier}) başarıyla tanımlandı!`
          : `Alıcı Ek Hak Paketi (${selectedBuyerCode}) başarıyla tanımlandı!`
      );

      setTimeout(() => {
        setShowGrantModal(false);
        setGrantSuccessMsg(null);
        fetchUserData();
        if (onRefresh) onRefresh();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Paket tanımlanırken sorun oluştu.');
    } finally {
      setGranting(false);
    }
  };

  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject || !msgBody) return;
    setSendingMsg(true);
    const token = localStorage.getItem('accessToken');
    const targetUserId = userId || user?.id;

    try {
      const res = await fetch(`${API_BASE_URL}/users/admin/${targetUserId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: msgSubject,
          message: msgBody,
          sendInApp: true,
          sendEmail: false,
        }),
      });

      if (!res.ok) throw new Error('Mesaj gönderilemedi.');

      setShowMessageDialog(false);
      setMsgSubject('');
      setMsgBody('');
      fetchUserData();
    } catch (err: any) {
      alert(err.message || 'Mesaj gönderilirken bir hata oluştu.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText) return;
    setAddingNote(true);
    const token = localStorage.getItem('accessToken');
    const targetUserId = userId || user?.id;

    try {
      const res = await fetch(`${API_BASE_URL}/users/admin/${targetUserId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: noteText }),
      });

      if (!res.ok) throw new Error('Not eklenemedi.');

      setShowNoteDialog(false);
      setNoteText('');
      fetchUserData();
    } catch (err: any) {
      alert(err.message || 'Not eklenirken bir hata oluştu.');
    } finally {
      setAddingNote(false);
    }
  };

  // Remaining Entitlements Calculation
  const userListings = user?.listings || [];
  const listingsRight = {
    used: userListings.filter((l: any) => resolveEffectiveListingStatus(l).effectiveStatus === 'ACTIVE').length,
    totalLimit: subscription?.limits?.activeListings || (user?.subscriptionTier === 'PROFESYONEL' ? 50 : user?.subscriptionTier === 'YETKIN' ? 10 : 1),
  };

  const aiReportsRight = {
    used: subscription?.usage?.aiReports || user?.usageStats?.aiReports || 0,
    totalLimit: subscription?.limits?.aiReports || (user?.subscriptionTier === 'PROFESYONEL' ? 50 : user?.subscriptionTier === 'YETKIN' ? 10 : 3),
  };

  // Filtered Listings for İlanlar Tab using canonical filter predicate
  const filteredListings = userListings.filter((l: any) => matchesSellerListingFilter(l, listingFilter));

  return (
    <div className="relative z-50 font-sans">
      {/* DRAWER BACKDROP */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* DRAWER CONTAINER */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-md bg-[#090d16] border-l border-white/10 text-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
          
          {/* DRAWER HEADER */}
          <div className="p-6 border-b border-white/10 bg-slate-950/40">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-500/20">
                  {user?.firstName ? `${user.firstName[0]}${user.lastName?.[0] || ''}` : user?.email ? user.email[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'Kullanıcı'}
                  </h2>
                  <span className="text-xs font-mono font-bold text-orange-400 block mt-0.5">
                    {user?.customerNo || 'TS-Müşteri'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold">
                  {user?.isActive === false ? 'Pasif' : 'Aktif'}
                </span>
                <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* DRAWER TABS NAVIGATION */}
            <div className="flex items-center gap-2 mt-6 border-b border-white/10 font-sans text-xs">
              {[
                { key: 'OVERVIEW', label: 'Genel Bakış' },
                { key: 'LISTINGS', label: `İlanlar (${userListings.length})` },
                { key: 'HISTORY', label: `Geçmiş (${historyItems.length})` },
                { key: 'NOTES', label: 'Notlar' },
                { key: 'MESSAGES', label: 'Mesajlar' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`pb-2 px-1 font-bold transition border-b-2 cursor-pointer ${
                    activeTab === tab.key
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* DRAWER BODY CONTENT */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-medium">Kullanıcı bilgileri yükleniyor...</div>
            ) : error ? (
              <div className="p-6 text-center text-rose-400 font-bold text-xs">{error}</div>
            ) : (
              <>
                {/* TAB 1: GENEL BAKIŞ */}
                {activeTab === 'OVERVIEW' && (
                  <div className="space-y-6">
                    {/* Kullanıcı Bilgileri & Mevcut Paket */}
                    <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-white/5">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kullanıcı Bilgileri</h3>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Mevcut Paket</span>
                          <strong className="text-xs font-bold text-orange-400">
                            {subscription?.tierName || user?.subscriptionTier || 'Tanışma Paketi'}
                          </strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 text-xs">
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Ad Soyad</span>
                          <span className="font-bold text-white">{user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Telefon</span>
                          <span className="font-mono text-slate-200">{user?.phone || 'Belirtilmedi'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">E-posta</span>
                          <span className="font-mono text-slate-200 truncate max-w-[200px]">{user?.email}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Kayıt Tarihi</span>
                          <span className="font-mono text-slate-400">{new Date(user?.createdAt || Date.now()).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* KALAN HAKLAR KARTI + (PAKET TANIMLA) */}
                    <div className="p-5 bg-slate-900/80 rounded-2xl border border-white/10 space-y-4 relative">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-200">Kalan Haklar</h3>
                        <button
                          onClick={handleOpenGrantModal}
                          title="Kullanıcıya Abonelik / Ek Hak paketi tanımla."
                          className="p-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition shadow-md shadow-orange-500/30 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Progress Bars */}
                      <div className="space-y-3 font-mono text-xs">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">İlan Hakkı</span>
                            <strong className="text-slate-200">
                              {listingsRight.used} / {listingsRight.totalLimit}
                            </strong>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{
                                width: `${Math.min(100, (listingsRight.used / (listingsRight.totalLimit || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">AI Rapor Hakkı</span>
                            <strong className="text-slate-200">
                              {aiReportsRight.used} / {aiReportsRight.totalLimit}
                            </strong>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full"
                              style={{
                                width: `${Math.min(100, (aiReportsRight.used / (aiReportsRight.totalLimit || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* USER LISTING STATS COUNTERS */}
                    <div className="grid grid-cols-4 gap-2 text-center font-mono">
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <span className="text-base font-black text-white block">
                          {userListings.filter((l: any) => l.status === 'ACTIVE').length}
                        </span>
                        <span className="text-[10px] text-slate-500">Aktif İlan</span>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <span className="text-base font-black text-white block">
                          {userListings.length}
                        </span>
                        <span className="text-[10px] text-slate-500">Toplam İlan</span>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <span className="text-base font-black text-rose-400 block">
                          {userListings.filter((l: any) => l.status === 'REJECTED').length}
                        </span>
                        <span className="text-[10px] text-slate-500">Reddedilen</span>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <span className="text-base font-black text-amber-400 block">
                          {userListings.filter((l: any) => l.status === 'PASSIVE').length}
                        </span>
                        <span className="text-[10px] text-slate-500">Pasif</span>
                      </div>
                    </div>

                    {/* HIZLI İŞLEMLER */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hızlı İşlemler</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          onClick={() => setShowMessageDialog(true)}
                          className="flex items-center justify-center gap-2 p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition shadow-lg shadow-orange-500/20 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Mesaj Gönder</span>
                        </button>
                        <button
                          onClick={() => setShowNoteDialog(true)}
                          className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold border border-white/10 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Admin Notu Ekle</span>
                        </button>
                      </div>
                    </div>

                    {/* SON AKTİF İLANLAR */}
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-300">Son İlanları</h4>
                        <button
                          onClick={() => setActiveTab('LISTINGS')}
                          className="text-xs font-bold text-orange-400 hover:underline"
                        >
                          Tümünü Gör →
                        </button>
                      </div>

                      <div className="space-y-2">
                        {userListings.length > 0 ? (
                          userListings.slice(0, 3).map((l: any) => (
                            <div key={l.id} className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                              <div>
                                <strong className="text-white block font-bold truncate max-w-[200px]">{l.title || 'İlan'}</strong>
                                <span className="text-[10px] text-slate-400 block">{l.city ? `${l.city}, ${l.district || ''}` : 'Belirtilmedi'}</span>
                              </div>
                              <div className="text-right font-mono">
                                <span className="font-bold text-emerald-400 block">₺{Number(l.priceAmount || 0).toLocaleString('tr-TR')}</span>
                                <span className="text-[10px] text-slate-500">{new Date(l.createdAt).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-500 text-xs">Kullanıcıya ait kayıtlı ilan bulunmuyor.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: İLANLAR (GERÇEK KULLANICI İLANLARI + CANONICAL MODERATION ACTIONS) */}
                {activeTab === 'LISTINGS' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kullanıcının İlanları</h3>
                      <span className="text-xs font-mono font-bold text-orange-400">Toplam: {filteredListings.length}</span>
                    </div>

                    {/* STATUS FILTER BUTTONS WITH CANONICAL COUNTS */}
                    {(() => {
                      const filterCounts: Record<string, number> = {
                        ALL: userListings.length,
                        ACTIVE: userListings.filter((l: any) => matchesSellerListingFilter(l, 'ACTIVE')).length,
                        PENDING: userListings.filter((l: any) => matchesSellerListingFilter(l, 'PENDING')).length,
                        PASSIVE: userListings.filter((l: any) => matchesSellerListingFilter(l, 'PASSIVE')).length,
                        REJECTED: userListings.filter((l: any) => matchesSellerListingFilter(l, 'REJECTED')).length,
                      };

                      return (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
                          {[
                            { key: 'ALL', label: 'Tümü' },
                            { key: 'ACTIVE', label: 'Aktif' },
                            { key: 'PENDING', label: 'Bekleyen' },
                            { key: 'PASSIVE', label: 'Pasif' },
                            { key: 'REJECTED', label: 'Reddedilen' },
                          ].map((st) => (
                            <button
                              key={st.key}
                              onClick={() => setListingFilter(st.key)}
                              className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                                listingFilter === st.key
                                  ? 'bg-orange-500 text-white font-bold'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                              }`}
                            >
                              <span>{st.label}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                                  listingFilter === st.key ? 'bg-white/25 text-white font-bold' : 'bg-slate-950 text-slate-400'
                                }`}
                              >
                                {filterCounts[st.key] ?? 0}
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    {/* LISTINGS CARDS */}
                    <div className="space-y-2.5 text-xs">
                      {filteredListings.length > 0 ? (
                        filteredListings.map((l: any) => {
                          const brandName = l.vehicleVariant?.model?.brand?.name || l.customBrand || '';
                          const modelName = l.vehicleVariant?.model?.name || l.customModel || '';
                          const trimName = l.vehicleVariant?.trim?.name || l.customEngine || '';
                          const vehicleTitle = l.title || `${l.modelYear || ''} ${brandName} ${modelName}`.trim() || 'Araç İlanı';
                          const statusInfo = resolveEffectiveListingStatus(l);

                          return (
                            <div
                              key={l.id}
                              onClick={() => handleOpenFullInspection(l)}
                              className="p-3.5 bg-slate-900/70 rounded-2xl border border-white/5 space-y-2.5 hover:border-orange-500/30 transition relative group cursor-pointer"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] font-mono text-orange-400 font-bold block">{l.id.slice(0, 12)}</span>
                                  <strong className="text-white font-bold text-sm block mt-0.5 group-hover:text-orange-300 transition">
                                    {vehicleTitle}
                                  </strong>
                                  <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{trimName}</span>
                                </div>

                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${statusInfo.badgeClass}`}
                                  >
                                    {statusInfo.label}
                                  </span>

                                  {/* DROPDOWN ACTION MENU */}
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(activeMenuId === l.id ? null : l.id);
                                      }}
                                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {activeMenuId === l.id && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 top-7 z-40 w-52 bg-[#0b0f19] border border-white/10 rounded-2xl p-1.5 shadow-2xl text-left font-sans text-xs space-y-1"
                                      >
                                        <button
                                          onClick={() => handleOpenFullInspection(l)}
                                          className="w-full text-left px-3 py-1.5 text-orange-400 hover:bg-orange-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5" /> İlanı İncele
                                        </button>

                                        {statusInfo.isPending && (
                                          <>
                                            <button
                                              onClick={() => handleTriggerModerationAction(l, 'APPROVE')}
                                              className="w-full text-left px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                            >
                                              <CheckCircle2 className="w-3.5 h-3.5" /> Onayla
                                            </button>
                                            <button
                                              onClick={() => handleTriggerModerationAction(l, 'REQUEST_REVISION')}
                                              className="w-full text-left px-3 py-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                            >
                                              <AlertTriangle className="w-3.5 h-3.5" /> Düzeltme İste
                                            </button>
                                            <button
                                              onClick={() => handleTriggerModerationAction(l, 'DETAILED_REVIEW')}
                                              className="w-full text-left px-3 py-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                            >
                                              <ShieldAlert className="w-3.5 h-3.5" /> Detaylı İncelemede
                                            </button>
                                            <button
                                              onClick={() => handleTriggerModerationAction(l, 'REJECT')}
                                              className="w-full text-left px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                            >
                                              <XCircle className="w-3.5 h-3.5" /> Reddet
                                            </button>
                                          </>
                                        )}

                                        {statusInfo.isActive && (
                                          <button
                                            onClick={() => handleTriggerModerationAction(l, 'PASSIVE')}
                                            className="w-full text-left px-3 py-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                          >
                                            <Clock className="w-3.5 h-3.5" /> Pasife Al
                                          </button>
                                        )}

                                        {statusInfo.effectiveStatus === 'PASSIVE' && (
                                          <button
                                            onClick={() => handleTriggerModerationAction(l, 'ACTIVATE')}
                                            className="w-full text-left px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Aktifleştir
                                          </button>
                                        )}

                                        {statusInfo.effectiveStatus === 'REJECTED' && (
                                          <button
                                            onClick={() => handleTriggerModerationAction(l, 'REOPEN')}
                                            className="w-full text-left px-3 py-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" /> Tekrar İncele
                                          </button>
                                        )}

                                        <button
                                          onClick={() => handleOpenListingHistory(l)}
                                          className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer"
                                        >
                                          <History className="w-3.5 h-3.5 text-slate-400" /> Moderasyon Geçmişi
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-white/5 font-mono text-[11px]">
                                <span className="font-bold text-white">
                                  ₺{Number(l.priceAmount || 0).toLocaleString('tr-TR')}
                                </span>
                                <span className="text-slate-400">
                                  {l.city ? `${l.city}, ${l.district || ''}` : 'Şehir Belirtilmedi'}
                                  {' • '}
                                  {new Date(l.createdAt).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-white/5 text-slate-500">
                          Bu sekmede gösterilecek ilan kaydı bulunmuyor.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: GEÇMİŞ (GERÇEK EVENT TIMELINE) */}
                {activeTab === 'HISTORY' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kullanıcı Olay Geçmişi</h3>
                      <span className="text-xs font-mono font-bold text-slate-400">{historyItems.length} Olay</span>
                    </div>

                    <div className="space-y-3 font-sans text-xs">
                      {historyItems.length > 0 ? (
                        historyItems.map((h: any, i: number) => (
                          <div
                            key={h.id || i}
                            className="p-3.5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1 relative"
                          >
                            <div className="flex justify-between items-center">
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                                  h.badgeColor === 'emerald'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : h.badgeColor === 'orange'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : h.badgeColor === 'cyan'
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : h.badgeColor === 'rose'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {h.type}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {new Date(h.date).toLocaleString('tr-TR')}
                              </span>
                            </div>

                            <strong className="text-white font-bold block pt-1">{h.title}</strong>
                            {h.description && <p className="text-slate-400 text-[11px] leading-relaxed">{h.description}</p>}
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center text-slate-500 text-xs font-medium">
                          Bu kullanıcı için görüntülenecek geçmiş kaydı bulunmuyor.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: NOTLAR */}
                {activeTab === 'NOTES' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Yönetici Notları</h3>
                      <button
                        onClick={() => setShowNoteDialog(true)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        + Not Ekle
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      {user?.adminNotes?.length ? (
                        user.adminNotes.map((n: any) => (
                          <div key={n.id} className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
                            <p className="text-slate-200 leading-relaxed">{n.content}</p>
                            <span className="text-[10px] text-slate-500 font-mono block">{new Date(n.createdAt).toLocaleString('tr-TR')}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500">Henüz yazılmış bir yönetici notu yok.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: MESAJLAR */}
                {activeTab === 'MESSAGES' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mesaj Geçmişi</h3>
                      <button
                        onClick={() => setShowMessageDialog(true)}
                        className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        + Mesaj Gönder
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      {user?.adminMessages?.length ? (
                        user.adminMessages.map((m: any) => (
                          <div key={m.id} className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
                            <strong className="text-white font-bold block">{m.subject}</strong>
                            <p className="text-slate-300">{m.message}</p>
                            <span className="text-[10px] text-slate-500 font-mono block">{new Date(m.createdAt).toLocaleString('tr-TR')}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500">Gönderilmiş mesaj bulunmuyor.</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* DRAWER FOOTER */}
          <div className="p-4 border-t border-white/10 bg-slate-950/80">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Kapat
            </button>
          </div>
          {/* CANONICAL ADMIN LISTING INSPECTION MODAL */}
          <AdminListingInspectionModal
            listingId={selectedInspectionListingId}
            isOpen={!!selectedInspectionListingId}
            onClose={() => setSelectedInspectionListingId(null)}
            onRefresh={async () => {
              await fetchUserData();
              if (onRefresh) onRefresh();
            }}
          />
        </aside>
      </div>



      {/* NESTED MODAL 2: MODERATION ACTION REASON MODAL (ZORUNLU NEDEN MODALI) */}
      {moderationActionListing && moderationActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl font-sans text-xs">
            <div className="flex justify-between items-start pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono text-orange-400 font-bold uppercase block">
                  İLAN NO: {moderationActionListing.id.slice(0, 12)}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {moderationActionType === 'REQUEST_REVISION'
                    ? 'Düzeltme İste (Zorunlu Neden)'
                    : moderationActionType === 'REJECT'
                    ? 'İlanı Reddet (Zorunlu Neden)'
                    : moderationActionType === 'ACTIVATE'
                    ? 'İlanı Aktifleştir (Zorunlu Neden)'
                    : 'İlanı Pasife Al'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setModerationActionListing(null);
                  setModerationActionType(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeModerationAction(moderationActionListing.id, moderationActionType, {
                  reasonCode: modReasonCode,
                  sellerMessage: modSellerMessage,
                  internalNote: modInternalNote,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-slate-300 font-bold block mb-1">Neden Kodu (Zorunlu)</label>
                <select
                  value={modReasonCode}
                  onChange={(e) => setModReasonCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-200 outline-none cursor-pointer"
                >
                  {moderationActionType === 'ACTIVATE' ? (
                    <>
                      <option value="ADMIN_REACTIVATION">Yönetici Tarafından İnceleme Tamamlandı</option>
                      <option value="MODERATION_RESOLVED">Moderasyon Sorunu Giderildi</option>
                      <option value="MANAGEMENT_DECISION">Yönetim Kararı</option>
                      <option value="OTHER">Diğer Açıklama</option>
                    </>
                  ) : (
                    <>
                      <option value="PRICE_ANOMALY">Fiyat Anomalisi / Gerçek Dışı Fiyat</option>
                      <option value="MISSING_PHOTOS">Eksik / Kalitesiz Fotoğraf</option>
                      <option value="INCORRECT_SPECS">Araç Bilgisi Uyuşmazlığı</option>
                      <option value="SUSPICIOUS_CONTENT">Şüpheli / İhlal Edici Açıklama</option>
                      <option value="OTHER">Diğer Açıklama</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Satıcıya Gönderilecek Açıklama (Zorunlu Bildirim)</label>
                <textarea
                  rows={3}
                  required
                  value={modSellerMessage}
                  onChange={(e) => setModSellerMessage(e.target.value)}
                  placeholder="Satıcının bildiriminde yer alacak açıklayıcı not..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">İç Not (Audit / Dahili)</label>
                <textarea
                  rows={2}
                  value={modInternalNote}
                  onChange={(e) => setModInternalNote(e.target.value)}
                  placeholder="Yalnızca admin kayıtlarında kalacak not..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModerationActionListing(null);
                    setModerationActionType(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition cursor-pointer"
                >
                  {submittingAction ? 'İşleniyor...' : 'Aksiyonu Onayla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NESTED MODAL 3: İLAN MODERASYON GEÇMİŞİ MODAL */}
      {historyListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl font-sans text-xs">
            <div className="flex justify-between items-start pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono text-orange-400 font-bold uppercase block">
                  İLAN NO: {historyListing.id.slice(0, 12)}
                </span>
                <h3 className="text-base font-bold text-white mt-1">İlan Moderasyon Geçmişi</h3>
              </div>
              <button onClick={() => setHistoryListing(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 font-mono">
              {listingHistoryLogs.length > 0 ? (
                listingHistoryLogs.map((log: any, idx: number) => (
                  <div key={log.id || idx} className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <strong className="text-orange-400">{log.actionType}</strong>
                      <span className="text-slate-500 text-[10px]">{new Date(log.createdAt).toLocaleString('tr-TR')}</span>
                    </div>
                    {log.sellerMessage && <p className="text-slate-300 font-sans">{log.sellerMessage}</p>}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500">Bu ilana ait geçmiş bulunamadı.</div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setHistoryListing(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NESTED MODAL 4: DUAL PACKAGE ASSIGNMENT MODAL */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl font-sans">
            <div className="flex justify-between items-start pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest block">
                  {user?.customerNo} • {user?.email}
                </span>
                <h3 className="text-base font-bold text-white mt-1">Kullanıcıya Paket Tanımla</h3>
              </div>
              <button onClick={() => setShowGrantModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {grantSuccessMsg ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-emerald-400">{grantSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleGrantPackageSubmit} className="space-y-4 text-xs font-sans">
                <div className="p-1 bg-slate-950 rounded-xl border border-white/10 flex items-center gap-1 font-bold">
                  <button
                    type="button"
                    onClick={() => setPackageGroup('SUBSCRIPTION')}
                    className={`flex-1 py-2 rounded-lg text-xs transition cursor-pointer ${
                      packageGroup === 'SUBSCRIPTION' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Abonelik Paketleri
                  </button>
                  <button
                    type="button"
                    onClick={() => setPackageGroup('BUYER')}
                    className={`flex-1 py-2 rounded-lg text-xs transition cursor-pointer ${
                      packageGroup === 'BUYER' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Alıcı Paketleri
                  </button>
                </div>

                {packageGroup === 'SUBSCRIPTION' && (
                  <div>
                    <label className="text-slate-300 font-bold block mb-1.5">Abonelik Paketi Seçin</label>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-200 outline-none cursor-pointer"
                    >
                      <option value="TANISMA">Tanışma / Ücretsiz Paket (1 İlan / 3 AI Rapor)</option>
                      <option value="YETKIN">Yetkin / Standard Paket (10 İlan / 10 AI Rapor - 499 TL)</option>
                      <option value="PROFESYONEL">Profesyonel / Pro Paket (50 İlan / 50 AI Rapor - 1.499 TL)</option>
                    </select>
                  </div>
                )}

                {packageGroup === 'BUYER' && (
                  <div>
                    <label className="text-slate-300 font-bold block mb-1.5">Alıcı Ek Hak Paketi Seçin</label>
                    <select
                      value={selectedBuyerCode}
                      onChange={(e) => setSelectedBuyerCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-200 outline-none cursor-pointer"
                    >
                      <option value="ALICI_MINI">Alıcı Mini (+5 AI Rapor / +20 Chatbot - 199 TL)</option>
                      <option value="ALICI_PLUS">Alıcı Plus (+15 AI Rapor / +50 Chatbot - 499 TL)</option>
                      <option value="ALICI_MAX">Alıcı Max (+30 AI Rapor / +100 Chatbot - 899 TL)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-slate-300 font-bold block mb-1.5">Tanımlama Nedeni (Zorunlu)</label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="CUSTOMER_SUPPORT">Müşteri Memnuniyeti / Destek Telafisi</option>
                    <option value="CAMPAIGN">Özel Kampanya / Promosyon</option>
                    <option value="TEST_ACCOUNT">Test Hesabı Yetkilendirmesi</option>
                    <option value="MANAGEMENT_DECISION">Yönetim Kararı</option>
                    <option value="OTHER">Diğer Açıklama</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1.5">Açıklama / Not</label>
                  <textarea
                    rows={2}
                    value={reasonDesc}
                    onChange={(e) => setReasonDesc(e.target.value)}
                    placeholder="Audit log kaydı için açıklama yazın..."
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
                  />
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5 text-[10px] text-slate-400 space-y-1">
                  <span className="text-amber-400 font-bold block">🔒 Finans Güvenliği Notu:</span>
                  <p>
                    Yönetici tanımlaması <code className="text-white font-mono">source = ADMIN_GRANT</code> etiketiyle kaydedilir. Finansal gelir, MRR veya sahte ödeme kaydı üretilmez.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGrantModal(false)}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={granting}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition cursor-pointer"
                  >
                    {granting ? 'Tanımlanıyor...' : 'Paketi Tanımla'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* NESTED MODAL 5: MESAJ GÖNDER */}
      {showMessageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Kullanıcıya Mesaj Gönder</h3>
              <button onClick={() => setShowMessageDialog(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessageSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Konu</label>
                <input
                  type="text"
                  required
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  placeholder="Mesaj konusu..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Mesaj</label>
                <textarea
                  rows={4}
                  required
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder="Kullanıcıya iletilecek mesaj metnini yazın..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMessageDialog(false)}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition cursor-pointer"
                >
                  {sendingMsg ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NESTED MODAL 6: NOT EKLE */}
      {showNoteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Yönetici Notu Ekle</h3>
              <button onClick={() => setShowNoteDialog(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNoteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Not İçeriği</label>
                <textarea
                  rows={4}
                  required
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Yalnızca admin kullanıcılar tarafından görülecek iç not yazın..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteDialog(false)}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addingNote}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  {addingNote ? 'Ekleniyor...' : 'Notu Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
