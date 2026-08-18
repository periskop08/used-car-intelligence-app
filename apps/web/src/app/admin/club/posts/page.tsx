'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Search, Eye, Archive, RotateCcw, Pin, Edit3, Plus, User } from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/utils/apiConfig';
import { ClubPostDrawer } from '../components/ClubPostDrawer';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';

export default function AdminClubPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchPosts = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/posts?status=${statusFilter}`, {
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
  };

  useEffect(() => {
    fetchPosts();
  }, [statusFilter]);

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
            Tork Scout Club — Gönderiler & Moderasyon
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Topluluk ana akış gönderilerinin detaylı incelenmesi, yayın durumları ve içerik moderasyonu.
          </p>
        </div>

        <Link
          href="/admin/club/posts/new"
          className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black px-4 py-2.5 rounded-xl transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Yeni Gönderi Oluştur
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { key: 'ALL', label: 'Tüm Gönderiler' },
          { key: 'PUBLISHED', label: 'Yayındakiler' },
          { key: 'DRAFT', label: 'Taslaklar' },
          { key: 'ARCHIVED', label: 'Yayından Kaldırılanlar' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === tab.key
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts Main Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Gönderiler yükleniyor...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-xs">
            Seçili filtre altında gönderi bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Başlık</th>
                  <th className="p-4">Yazar (Müşteri No — İsim)</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4">Yorum</th>
                  <th className="p-4">Yayın Tarihi</th>
                  <th className="p-4">Son Güncelleme</th>
                  <th className="p-4 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {posts.map((p) => {
                  const isPublished = p.status === 'PUBLISHED';
                  const isDraft = p.status === 'DRAFT';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPost(p)}
                      className="hover:bg-white/[0.04] transition cursor-pointer"
                    >
                      <td className="p-4 font-bold text-white max-w-xs">
                        <div className="flex items-center gap-1.5">
                          {p.isPinned && <Pin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                          <span className="truncate">{p.title || 'Başlıksız Gönderi'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-[11px]">
                        {p.authorFormatted || p.author?.username || 'Yönetici'}
                      </td>
                      <td className="p-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPublished
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isDraft
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-700/40 text-slate-400 border border-white/10'
                          }`}
                        >
                          {isPublished ? 'YAYINDA' : isDraft ? 'TASLAK' : 'YAYINDAN KALDIRILDI'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-300">
                        {p._count?.comments || p.commentsCount || 0}
                      </td>
                      <td className="p-4 font-mono text-slate-400 text-[11px]">
                        {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('tr-TR') : '—'}
                      </td>
                      <td className="p-4 font-mono text-slate-400 text-[11px]">
                        {new Date(p.updatedAt || p.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap font-mono">
                        {isPublished ? (
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
