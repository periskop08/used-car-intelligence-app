'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  CreditCard,
  Car,
  FileText,
  MessageSquare,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  Shield,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // User Detail Drawer State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Admin Message Modal State
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSendInApp, setMsgSendInApp] = useState(true);
  const [msgSendEmail, setMsgSendEmail] = useState(false);
  const [msgSubmitting, setMsgSubmitting] = useState(false);

  // Admin Note Input State
  const [newNoteContent, setNewNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tierFilter) params.append('subscriptionTier', tierFilter);
    if (statusFilter) params.append('isActive', statusFilter);
    params.append('page', page.toString());
    params.append('limit', '15');

    fetch(`${API_BASE_URL}/users/admin/list?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Kullanıcı listesi alınamadı.');
        return res.json();
      })
      .then((data) => {
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        setTotalUsers(data.total || 0);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [page, tierFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const fetchUserDetail = (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/users/admin/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Kullanıcı detayları yüklenemedi.');
        return res.json();
      })
      .then((data) => setUserDetail(data))
      .catch((err) => alert(err.message))
      .finally(() => setDetailLoading(false));
  };

  const handleSendAdminMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !msgSubject.trim() || !msgBody.trim()) return;

    setMsgSubmitting(true);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/users/admin/${selectedUserId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subject: msgSubject,
        message: msgBody,
        sendInApp: msgSendInApp,
        sendEmail: msgSendEmail,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Mesaj gönderilemedi.');
        return res.json();
      })
      .then(() => {
        alert('Mesaj başarıyla gönderildi.');
        setShowMessageModal(false);
        setMsgSubject('');
        setMsgBody('');
        fetchUserDetail(selectedUserId);
      })
      .catch((err) => alert(err.message))
      .finally(() => setMsgSubmitting(false));
  };

  const handleAddAdminNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newNoteContent.trim()) return;

    setNoteSubmitting(true);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/users/admin/${selectedUserId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: newNoteContent.trim() }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Not kaydedilemedi.');
        return res.json();
      })
      .then(() => {
        setNewNoteContent('');
        fetchUserDetail(selectedUserId);
      })
      .catch((err) => alert(err.message))
      .finally(() => setNoteSubmitting(false));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Kayıtlı Kullanıcı Yönetimi</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Platformdaki toplam {totalUsers} kullanıcının detaylı hesap ve hareket incelemesi.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Ad, soyad, e-posta, telefon veya müşteri no ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="">Tüm Paketler</option>
            <option value="FREE">FREE / Tanışma</option>
            <option value="STANDARD">STANDARD / Yetkin</option>
            <option value="PRO">PRO / Profesyonel</option>
            <option value="PREMIUM">PREMIUM</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="">Tüm Durumlar</option>
            <option value="true">Aktif Hesaplar</option>
            <option value="false">Pasif / İptal Hesaplar</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Filtrele
          </button>
        </div>
      </form>

      {/* Users Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Kullanıcı verileri yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-400 font-bold text-xs">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">Aradığınız kriterlere uygun kullanıcı bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Müşteri / No</th>
                  <th className="p-4">Ad Soyad & İletişim</th>
                  <th className="p-4">Paket</th>
                  <th className="p-4">Kayıt Tarihi</th>
                  <th className="p-4">İlanlar</th>
                  <th className="p-4">AI Kullanımı</th>
                  <th className="p-4">Hesap Durumu</th>
                  <th className="p-4 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => fetchUserDetail(u.id)}
                    className="hover:bg-white/[0.03] transition cursor-pointer group"
                  >
                    <td className="p-4 font-mono font-bold text-orange-400">{u.customerNo}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-200 group-hover:text-white transition">{u.fullName}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{u.phone}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          u.subscriptionTier === 'PRO' || u.subscriptionTier === 'PROFESYONEL' || u.subscriptionTier === 'PREMIUM'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : u.subscriptionTier === 'STANDARD' || u.subscriptionTier === 'YETKIN'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-slate-800 text-slate-400 border border-white/10'
                        }`}
                      >
                        {u.subscriptionTier}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-mono">
                      {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="p-4 font-mono text-slate-300">{u.activeListingCount} ilan</td>
                    <td className="p-4 font-mono text-slate-300">{u.aiReportCount} işlem</td>
                    <td className="p-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">
                          <UserCheck className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-bold">
                          <UserX className="w-3 h-3" /> Pasif
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchUserDetail(u.id);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-orange-500 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        İncele →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>
            Sayfa <strong>{page}</strong> / {totalPages} (Toplam {totalUsers} kullanıcı)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 bg-slate-900 border border-white/10 rounded-lg text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* USER DETAIL DRAWER / MODAL */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0b0f19] border-l border-white/10 h-full overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center p-12 text-slate-400 font-bold text-xs">
                Kullanıcı detayları yükleniyor...
              </div>
            ) : userDetail ? (
              <div className="space-y-6 flex-1">
                {/* Drawer Header */}
                <div className="flex justify-between items-start pb-4 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest">
                      {userDetail.user.customerNo}
                    </span>
                    <h2 className="text-xl font-black text-white mt-1">{userDetail.user.fullName}</h2>
                    <p className="text-xs text-slate-400">{userDetail.user.email} • {userDetail.user.phone || 'Telefon yok'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUserId(null);
                      setUserDetail(null);
                    }}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Mesaj Gönder</span>
                  </button>
                </div>

                {/* TEMEL VE PAKET BİLGİLERİ */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/60 rounded-2xl border border-white/5 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Mevcut Paket</span>
                    <p className="font-mono font-bold text-orange-400 mt-0.5">{userDetail.user.subscriptionTier}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Kayıt Tarihi</span>
                    <p className="font-mono text-slate-300 mt-0.5">
                      {new Date(userDetail.user.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">AI Rapor Hakkı Kullanımı</span>
                    <p className="font-mono text-slate-300 mt-0.5">{userDetail.usageStats.aiReports} adet</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Chatbot İşlem Sayısı</span>
                    <p className="font-mono text-slate-300 mt-0.5">{userDetail.usageStats.chatbotQueries} mesaj</p>
                  </div>
                </div>

                {/* İLAN GEÇMİŞİ */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Car className="w-4 h-4 text-orange-400" />
                    <span>İlan Geçmişi ({userDetail.listings.length})</span>
                  </h3>
                  {userDetail.listings.length === 0 ? (
                    <p className="text-xs text-slate-500">Bu kullanıcının henüz ilanı bulunmuyor.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {userDetail.listings.map((l: any) => (
                        <div key={l.id} className="p-3 bg-slate-950 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-200">
                              {l.vehicleVariant?.brand?.name} {l.vehicleVariant?.model?.name} ({l.year})
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">₺{Number(l.price).toLocaleString('tr-TR')}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-mono rounded font-bold">
                            {l.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* İNTERNAL ADMIN NOTLARI */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-amber-400" />
                    <span>İnternal Admin Notları</span>
                  </h3>

                  <form onSubmit={handleAddAdminNote} className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Bu kullanıcı için yönetici notu ekleyin (Kullanıcı göremez)..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={noteSubmitting || !newNoteContent.trim()}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40"
                    >
                      {noteSubmitting ? 'Kaydediliyor...' : '+ Not Ekle'}
                    </button>
                  </form>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {userDetail.adminNotes.length === 0 ? (
                      <p className="text-xs text-slate-500">Henüz kaydedilmiş bir admin notu yok.</p>
                    ) : (
                      userDetail.adminNotes.map((note: any) => (
                        <div key={note.id} className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1 text-xs">
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>{note.adminEmail}</span>
                            <span>{new Date(note.createdAt).toLocaleString('tr-TR')}</span>
                          </div>
                          <p className="text-slate-200">{note.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* MESAJ GEÇMİŞİ */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span>Gönderilen Yönetici Mesajları</span>
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {userDetail.adminMessages.length === 0 ? (
                      <p className="text-xs text-slate-500">Henüz bu kullanıcıya özel bir mesaj gönderilmemiş.</p>
                    ) : (
                      userDetail.adminMessages.map((msg: any) => (
                        <div key={msg.id} className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1 text-xs">
                          <div className="flex justify-between text-[10px] font-bold text-cyan-400">
                            <span>{msg.subject}</span>
                            <span className="text-slate-500 font-mono font-normal">
                              {new Date(msg.createdAt).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <p className="text-slate-300">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ADMIN MESSAGE MODAL */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Kullanıcıya Mesaj Gönder</h3>
              <button onClick={() => setShowMessageModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendAdminMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Mesaj Konusu / Başlık</label>
                <input
                  type="text"
                  placeholder="Örn: Hesap Doğrulama ve Bilgilendirme"
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Mesaj İçeriği</label>
                <textarea
                  rows={4}
                  placeholder="Kullanıcıya iletilecek mesaj..."
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={msgSendInApp}
                    onChange={(e) => setMsgSendInApp(e.target.checked)}
                    className="accent-orange-500"
                  />
                  <span>Uygulama İçi Bildirim</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={msgSendEmail}
                    onChange={(e) => setMsgSendEmail(e.target.checked)}
                    className="accent-orange-500"
                  />
                  <span>E-posta Gönderimi</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={msgSubmitting}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40"
                >
                  {msgSubmitting ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
