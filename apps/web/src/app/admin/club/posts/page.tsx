'use client';

import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Search,
  Eye,
  Archive,
  RotateCcw,
  Pin,
  Edit3,
  Plus,
  User,
  CheckCircle2,
  XCircle,
  Car,
  ShieldAlert,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/utils/apiConfig';
import { ClubPostDrawer } from '../components/ClubPostDrawer';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';

type MainTab = 'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'USER_SUBMISSIONS';
type UserSubmissionFilter = 'ALL' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';

export default function AdminClubPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [pendingUserCount, setPendingUserCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<MainTab>('ALL');
  const [userSubFilter, setUserSubFilter] = useState<UserSubmissionFilter>('PENDING_REVIEW');

  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchPendingCount = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/club/posts?source=USER_SUBMISSIONS&status=PENDING_REVIEW`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setPendingUserCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (e) {}
  };

  const fetchPosts = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      let queryUrl = `${API_BASE_URL}/admin/club/posts?status=${statusFilter}&source=ADMIN`;
      if (statusFilter === 'USER_SUBMISSIONS') {
        queryUrl = `${API_BASE_URL}/admin/club/posts?source=USER_SUBMISSIONS&status=${userSubFilter}`;
      }

      const res = await fetch(queryUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Fetch posts error:', e);
    } finally {
      setLoading(false);
    }
    fetchPendingCount();
  };

  useEffect(() => {
    fetchPosts();
  }, [statusFilter, userSubFilter]);

  const handleUnpublish = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    if (!confirm('Bu gönderiyi yayından kaldırmak istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/posts/${postId}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchPosts();
    } catch (e) {
      alert('İşlem başarısız.');
    }
  };

  const handlePublish = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/posts/${postId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchPosts();
    } catch (e) {
      alert('İşlem başarısız.');
    }
  };

  const handleApproveUserPost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/posts/${postId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchPosts();
      } else {
        alert('Gönderi onaylanamadı.');
      }
    } catch (e) {
      alert('İşlem başarısız.');
    }
  };

  const handleRejectUserPost = async (e: React.MouseEvent, post: any) => {
    e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const reason = window.prompt(
      'Reddetme gerekçesini girin (kullanıcı Garajım ekranında görecektir):',
      post.rejectionReason || 'İlan niteliğinde veya satış amaçlı paylaşım tespit edildiği için yayınlanmadı.'
    );
    if (reason === null) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/posts/${post.id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        fetchPosts();
      } else {
        alert('Gönderi reddedilemedi.');
      }
    } catch (e) {
      alert('İşlem başarısız.');
    }
  };

  const isUserTab = statusFilter === 'USER_SUBMISSIONS';

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
            Tork Scout Club — Gönderiler & Moderasyon
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Topluluk ana akış gönderilerinin ve Club kullanıcılarının Garajım paylaşımlarının incelenmesi ve onaylanması.
          </p>
        </div>

        <Link
          href="/admin/club/posts/new"
          className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black px-4 py-2.5 rounded-xl transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Yeni Gönderi Oluştur
        </Link>
      </div>

      {/* Main Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-1">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(
            [
              { key: 'ALL', label: 'Tüm Gönderiler' },
              { key: 'PUBLISHED', label: 'Yayındakiler' },
              { key: 'DRAFT', label: 'Taslaklar' },
              { key: 'ARCHIVED', label: 'Yayından Kaldırılanlar' },
              { key: 'USER_SUBMISSIONS', label: 'Club Kullanıcıları Gönderileri' },
            ] as { key: MainTab; label: string }[]
          ).map((tab) => {
            const isUserSubmissionsTab = tab.key === 'USER_SUBMISSIONS';
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? isUserSubmissionsTab
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'bg-orange-500 text-white shadow-md'
                    : isUserSubmissionsTab
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
                }`}
              >
                {isUserSubmissionsTab && <Car className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
                {isUserSubmissionsTab && pendingUserCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-slate-950 text-cyan-300' : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {pendingUserCount} Bekliyor
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sub-filters when viewing Club Kullanıcıları Gönderileri */}
        {isUserTab && (
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/10">
            {(
              [
                { key: 'PENDING_REVIEW', label: 'Onay Bekleyenler' },
                { key: 'ALL', label: 'Tümü' },
                { key: 'PUBLISHED', label: 'Onaylananlar (Yayında)' },
                { key: 'REJECTED', label: 'Reddedilenler' },
              ] as { key: UserSubmissionFilter; label: string }[]
            ).map((sub) => (
              <button
                key={sub.key}
                onClick={() => setUserSubFilter(sub.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  userSubFilter === sub.key
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isUserTab && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 font-sans">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-amber-300 font-bold block mb-0.5">
              Club Kullanıcıları Gönderi & İlan Denetimi
            </strong>
            Kullanıcıların <strong>Garajım</strong> sekmesinden yükleyip <strong>&quot;Club&apos;da Paylaş&quot;</strong>{' '}
            seçeneğiyle gönderdiği araç fotoğrafları burada listelenir. İlan niteliği taşıyan (fiyat, telefon, satılık
            ibaresi içeren) gönderileri <strong>Reddet</strong> butonuyla geri çevirebilir; kural ihlalini tekrarlayan
            kullanıcıları yazar sütununa tıklayarak <strong>Kulüpten Yasaklayabilirsiniz (Ban)</strong>. Onaylanan
            gönderiler otomatik olarak TorkScout Club <strong>Tümü</strong> akışında yayınlanır.
          </div>
        </div>
      )}

      {/* Posts Main Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Gönderiler yükleniyor...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">
            {isUserTab
              ? 'Bu filtrede bekleyen veya paylaşılmış kullanıcı gönderisi bulunmuyor.'
              : 'Seçili filtre altında gönderi bulunmuyor.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  {isUserTab && <th className="p-4">Araç Görselleri (Max 5)</th>}
                  <th className="p-4">{isUserTab ? 'Araç / Açıklama' : 'Başlık'}</th>
                  <th className="p-4">Yazar (Müşteri No — İsim)</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4">Yorum / Beğeni</th>
                  <th className="p-4">Gönderim Tarihi</th>
                  <th className="p-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {posts.map((p) => {
                  const isPublished = p.status === 'PUBLISHED';
                  const isDraft = p.status === 'DRAFT';
                  const isPendingReview = p.status === 'PENDING_REVIEW';
                  const isRejected = p.status === 'REJECTED';
                  const mediaList = Array.isArray(p.media) ? p.media : [];

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPost(p)}
                      className="hover:bg-white/[0.04] transition cursor-pointer"
                    >
                      {isUserTab && (
                        <td className="p-4">
                          {mediaList.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              {mediaList.slice(0, 5).map((m: any, idx: number) => (
                                <div
                                  key={m.id || idx}
                                  className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-slate-950 flex-shrink-0"
                                >
                                  <img
                                    src={m.mediaUrl}
                                    alt={`Araç ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              <span className="text-[10px] font-mono text-slate-400 ml-1">
                                ({mediaList.length}/5)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px] flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5" /> Görsel yok
                            </span>
                          )}
                        </td>
                      )}
                      <td className="p-4 text-white max-w-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          {p.isPinned && <Pin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                          <span className="truncate">{p.title || (isUserTab ? 'Üye Araç Paylaşımı' : 'Başlıksız Gönderi')}</span>
                        </div>
                        {p.content && (
                          <p className="text-slate-400 text-[11px] line-clamp-2 mt-1 font-normal">
                            {p.content}
                          </p>
                        )}
                        {p.rejectionReason && (
                          <p className="text-rose-400 text-[10px] mt-1 font-medium">
                            Red: {p.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-[11px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.author?.id) setSelectedUserId(p.author.id);
                          }}
                          className="hover:text-orange-400 transition text-left underline decoration-white/20 cursor-pointer"
                        >
                          {p.authorFormatted || p.author?.username || 'Üye'}
                        </button>
                      </td>
                      <td className="p-4 font-mono">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPublished
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isPendingReview
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : isRejected
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isDraft
                              ? 'bg-slate-700/40 text-slate-300 border border-white/10'
                              : 'bg-slate-700/40 text-slate-400 border border-white/10'
                          }`}
                        >
                          {isPublished
                            ? 'YAYINDA'
                            : isPendingReview
                            ? 'ONAY BEKLİYOR'
                            : isRejected
                            ? 'REDDEDİLDİ'
                            : isDraft
                            ? 'SADECE GARAJDA'
                            : 'YAYINDAN KALDIRILDI'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-300 text-[11px]">
                        {p._count?.comments || 0} yorum · {p._count?.likes || 0} beğeni
                      </td>
                      <td className="p-4 font-mono text-slate-400 text-[11px]">
                        {new Date(p.createdAt).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap font-mono">
                        {isUserTab ? (
                          <>
                            {!isPublished && (
                              <button
                                onClick={(e) => handleApproveUserPost(e, p.id)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Onayla & Yayınla
                              </button>
                            )}
                            {!isRejected && (
                              <button
                                onClick={(e) => handleRejectUserPost(e, p)}
                                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reddet
                              </button>
                            )}
                          </>
                        ) : isPublished ? (
                          <button
                            onClick={(e) => handleUnpublish(e, p.id)}
                            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            Yayından Kaldır
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handlePublish(e, p.id)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            Tekrar Yayınla
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawers */}
      <ClubPostDrawer
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onRefresh={fetchPosts}
        onOpenUserDrawer={(userId) => setSelectedUserId(userId)}
      />

      {selectedUserId && (
        <AdminUserDrawer
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onRefresh={fetchPosts}
        />
      )}
    </div>
  );
}
