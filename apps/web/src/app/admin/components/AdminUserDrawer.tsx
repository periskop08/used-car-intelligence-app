'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  User as UserIcon,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  Send,
  FileText,
  Eye,
  Edit,
  Car,
  Package,
  History,
  MessageSquare,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export interface AdminUserDrawerProps {
  userId?: string | null;
  customerNo?: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  onRefresh?: () => void;
}

export function AdminUserDrawer({
  userId,
  customerNo,
  isOpen,
  onClose,
  initialTab = 'OVERVIEW',
  onRefresh,
}: AdminUserDrawerProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [user, setUser] = useState<any | null>(null);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Package Grant Modal State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('PROFESYONEL');
  const [reasonCode, setReasonCode] = useState('CUSTOMER_SUPPORT');
  const [reasonDesc, setReasonDesc] = useState('');
  const [notifyUser, setNotifyUser] = useState(true);
  const [granting, setGranting] = useState(false);

  // Send Message Dialog State
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Add Note Dialog State
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Notification Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchUserData = async () => {
    if (!userId && !customerNo) return;
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      let targetId = userId;
      if (!targetId && customerNo) {
        // Find user by customerNo
        const listRes = await fetch(`${API_BASE_URL}/users/admin/list?search=${encodeURIComponent(customerNo)}`, { headers });
        const listData = await listRes.json();
        targetId = listData.users?.[0]?.id;
      }

      if (!targetId) throw new Error('Kullanıcı bulunamadı.');

      const [uRes, subRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users/admin/${targetId}`, { headers }),
        fetch(`${API_BASE_URL}/subscriptions/summary?userId=${targetId}`, { headers }),
      ]);

      if (!uRes.ok) throw new Error('Kullanıcı detayları okunamadı.');

      const uData = await uRes.json();
      const subData = subRes.ok ? await subRes.json() : null;

      setUser(uData.user || uData);
      setSubscription(subData);
    } catch (err: any) {
      setError(err.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchUserData();
    }
  }, [isOpen, userId, customerNo]);

  const loadPackageCatalog = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/subscriptions/plans`);
      if (res.ok) {
        const data = await res.json();
        setAvailablePlans(data);
      }
    } catch (e) {}
  };

  const handleOpenGrantModal = () => {
    loadPackageCatalog();
    setShowGrantModal(true);
  };

  const handleGrantPackage = async () => {
    if (!user?.id || granting) return;
    setGranting(true);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}/package-grants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: selectedTier,
          activationMode: 'IMMEDIATE',
          reasonCode,
          reason: reasonDesc,
          notifyUser,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Paket tanımlanamadı.');
      }

      showToast(`"${selectedTier}" paketi kullanıcıya başarıyla tanımlandı.`);
      setShowGrantModal(false);
      setReasonDesc('');
      fetchUserData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Paket tanımlanırken hata oluştu.');
    } finally {
      setGranting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user?.id || !msgSubject || !msgBody || sendingMsg) return;
    setSendingMsg(true);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${API_BASE_URL}/users/admin/${user.id}/message`, {
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

      showToast('Kullanıcıya mesaj başarıyla gönderildi.');
      setShowMessageDialog(false);
      setMsgSubject('');
      setMsgBody('');
      fetchUserData();
    } catch (err: any) {
      showToast(err.message || 'Mesaj gönderilirken hata oluştu.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleAddNote = async () => {
    if (!user?.id || !noteContent.trim() || savingNote) return;
    setSavingNote(true);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${API_BASE_URL}/users/admin/${user.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: noteContent }),
      });

      if (!res.ok) throw new Error('Not kaydedilemedi.');

      showToast('Yönetici notu eklendi.');
      setShowNoteDialog(false);
      setNoteContent('');
      fetchUserData();
    } catch (err: any) {
      showToast(err.message || 'Not eklenirken hata oluştu.');
    } finally {
      setSavingNote(false);
    }
  };

  if (!isOpen) return null;

  const rights = subscription?.rights || {};
  const aiReportsRight = rights.aiReports || { used: 0, totalLimit: 10, remaining: 10 };
  const listingsRight = rights.activeListings || { used: 0, totalLimit: 25, remaining: 25 };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 bg-slate-900 border border-orange-500/50 rounded-2xl text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden">
        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <aside className="pointer-events-auto w-screen max-w-md bg-[#090d16] border-l border-white/10 flex flex-col justify-between text-slate-200 font-sans shadow-2xl">
            {/* DRAWER HEADER */}
            <div className="p-6 border-b border-white/10 bg-slate-950/60">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-500/20">
                    {user?.firstName ? `${user.firstName[0]}${user.lastName?.[0] || ''}` : 'AY'}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">
                      {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'Ahmet Yılmaz'}
                    </h2>
                    <span className="text-xs font-mono font-bold text-orange-400 block mt-0.5">
                      {user?.customerNo || 'TS-2608-000142'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold">
                    Aktif
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
                  { key: 'LISTINGS', label: `İlanlar (${user?.listings?.length || 4})` },
                  { key: 'HISTORY', label: 'Geçmiş' },
                  { key: 'NOTES', label: 'Notlar' },
                  { key: 'MESSAGES', label: 'Mesajlar' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
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
                              {subscription?.tierName || user?.subscriptionTier || 'Profesyonel'}
                            </strong>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 text-xs">
                          <div className="flex justify-between py-1">
                            <span className="text-slate-400">Ad Soyad</span>
                            <span className="font-bold text-white">{user?.firstName ? `${user.firstName} ${user.lastName}` : 'Ahmet Yılmaz'}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-400">Telefon</span>
                            <span className="font-mono text-slate-200">{user?.phone || '+90 531 234 56 78'}</span>
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
                            title="Kullanıcıya İlan/Rapor hakkı için paket tanımla."
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
                          <span className="text-base font-black text-white block">4</span>
                          <span className="text-[10px] text-slate-500">Aktif İlan</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                          <span className="text-base font-black text-white block">11</span>
                          <span className="text-[10px] text-slate-500">Toplam İlan</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                          <span className="text-base font-black text-rose-400 block">0</span>
                          <span className="text-[10px] text-slate-500">Reddedilen</span>
                        </div>
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                          <span className="text-base font-black text-amber-400 block">1</span>
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
                          <h4 className="text-xs font-bold text-slate-300">Son Aktif İlanlar</h4>
                          <button
                            onClick={() => setActiveTab('LISTINGS')}
                            className="text-xs font-bold text-orange-400 hover:underline"
                          >
                            Tümünü Gör →
                          </button>
                        </div>

                        <div className="space-y-2">
                          {[
                            { title: '2020 Volkswagen Passat 1.6 TDI Business DSG', city: 'İstanbul, Kadıköy', price: '₺1.250.000', date: '11.08.2026' },
                            { title: '2019 Honda Civic 1.6 i-VTEC Eco Elegance', city: 'İstanbul, Üsküdar', price: '₺945.000', date: '08.08.2026' },
                          ].map((l, i) => (
                            <div key={i} className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                              <div>
                                <strong className="text-white block font-bold truncate max-w-[200px]">{l.title}</strong>
                                <span className="text-[10px] text-slate-400 block">{l.city}</span>
                              </div>
                              <div className="text-right font-mono">
                                <span className="font-bold text-emerald-400 block">{l.price}</span>
                                <span className="text-[10px] text-slate-500">{l.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: İLANLAR */}
                  {activeTab === 'LISTINGS' && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Kullanıcının Tüm İlanları</h3>
                      <div className="space-y-2 text-xs">
                        {user?.listings?.length ? (
                          user.listings.map((l: any) => (
                            <div key={l.id} className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between items-center font-mono">
                              <div>
                                <span className="text-orange-400 font-bold block">{l.id.slice(0, 10)}</span>
                                <strong className="text-white font-sans block">{l.title || 'İlan'}</strong>
                              </div>
                              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                                {l.status}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-500">Kayıtlı ilan bulunamadı.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: GEÇMİŞ */}
                  {activeTab === 'HISTORY' && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hesap İşlem Geçmişi</h3>
                      <div className="space-y-2 font-mono text-xs">
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
                          <span className="text-orange-400 font-bold block text-[10px]">ADMIN_GRANT</span>
                          <p className="text-slate-300 font-sans">Yönetici tarafından Profesyonel Paket tanımlandı.</p>
                          <span className="text-[10px] text-slate-500 block">{new Date().toLocaleString('tr-TR')}</span>
                        </div>
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
                        {user?.sentAdminMessages?.length ? (
                          user.sentAdminMessages.map((m: any) => (
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
          </aside>
        </div>
      </div>

      {/* NESTED MODAL 1: PAKET TANIMLA MODAL */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
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

            <div className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Seçili Kullanıcı</span>
                <strong className="text-white font-bold">{user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email}</strong>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1.5">Paket Seçin</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-200 outline-none cursor-pointer"
                >
                  <option value="TANISMA">Tanışma / Ücretsiz Paket</option>
                  <option value="YETKIN">Yetkin / Standard Paket (499 TL)</option>
                  <option value="PROFESYONEL">Profesyonel / Pro Paket (1.499 TL)</option>
                </select>
              </div>

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

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="notifyUser"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                  className="rounded border-white/10 text-orange-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="notifyUser" className="text-slate-300 text-xs cursor-pointer">
                  Kullanıcıya uygulama içi bildirim gönder
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowGrantModal(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={handleGrantPackage}
                disabled={granting}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
              >
                {granting ? 'Tanımlanıyor...' : 'Paketi Tanımla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NESTED MODAL 2: MESAJ GÖNDER DIALOG */}
      {showMessageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Kullanıcıya Mesaj Gönder</h3>
                <span className="text-xs text-slate-400 font-mono">{user?.email}</span>
              </div>
              <button onClick={() => setShowMessageDialog(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Mesaj Başlığı</label>
                <input
                  type="text"
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  placeholder="Örn: İlanınız Hakkında Bilgilendirme"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-1">Mesaj İçeriği</label>
                <textarea
                  rows={4}
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder="Kullanıcıya iletilecek metin..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowMessageDialog(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMsg || !msgSubject || !msgBody}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs disabled:opacity-50 cursor-pointer"
              >
                {sendingMsg ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NESTED MODAL 3: ADMIN NOTU EKLENME DIALOG */}
      {showNoteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">İnternal Yönetici Notu Ekle</h3>
              <button onClick={() => setShowNoteDialog(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Not İçeriği (Kullanıcı Göremez)</label>
                <textarea
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Kullanıcı hakkında internal admin notu..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowNoteDialog(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={handleAddNote}
                disabled={savingNote || !noteContent.trim()}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs disabled:opacity-50 cursor-pointer"
              >
                {savingNote ? 'Kaydediliyor...' : 'Notu Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
