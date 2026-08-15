'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Pin,
  MessageSquare,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Archive,
  RotateCcw,
  Edit3,
  User,
  Clock,
  Calendar,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface ClubPostDrawerProps {
  post: any | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenUserDrawer?: (userId: string) => void;
  onOpenCommentDrawer?: (comment: any) => void;
  onOpenEditModal?: (post: any) => void;
}

export function ClubPostDrawer({
  post,
  isOpen,
  onClose,
  onRefresh,
  onOpenUserDrawer,
  onOpenCommentDrawer,
  onOpenEditModal,
}: ClubPostDrawerProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comments List State inside Post Drawer
  const [showComments, setShowComments] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentActingId, setCommentActingId] = useState<string | null>(null);

  const fetchPostComments = async (postId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoadingComments(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/posts/${postId}/comments?status=ALL`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : data.comments || []);
      }
    } catch (e) {
      console.error('Fetch post comments error:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (isOpen && post?.id) {
      setShowComments(true);
      fetchPostComments(post.id);
    }
  }, [isOpen, post?.id]);

  if (!isOpen || !post) return null;

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const handlePublish = async () => {
    if (!token) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/posts/${post.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gönderi yayınlanamadı.');
      onRefresh?.();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!token) return;
    if (!confirm('Bu gönderiyi yayından kaldırmak istediğinize emin misiniz?')) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/posts/${post.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gönderi yayından kaldırılamadı.');
      onRefresh?.();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleComments = async () => {
    if (!token) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/posts/${post.id}/comments-toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Yorum izinleri değiştirilemedi.');
      onRefresh?.();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommentStatusUpdate = async (
    e: React.MouseEvent,
    commentId: string,
    targetStatus: 'VISIBLE' | 'PENDING_REVIEW' | 'HIDDEN'
  ) => {
    e.stopPropagation();
    if (!token) return;

    setCommentActingId(commentId);
    try {
      let endpoint = 'publish';
      let body: any = undefined;
      if (targetStatus === 'PENDING_REVIEW') endpoint = 'review';
      else if (targetStatus === 'HIDDEN') {
        endpoint = 'hide';
        body = JSON.stringify({ reason: 'Moderatör tarafından gizlendi' });
      }

      const res = await fetch(`${API_BASE_URL}/admin/club/comments/${commentId}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      if (res.ok) {
        fetchPostComments(post.id);
        onRefresh?.();
      } else {
        alert('Yorum durumu güncellenemedi.');
      }
    } catch (err) {
      alert('Hata oluştu.');
    } finally {
      setCommentActingId(null);
    }
  };

  const isPublished = post.status === 'PUBLISHED';
  const isDraft = post.status === 'DRAFT';
  const isArchived = post.status === 'ARCHIVED';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-slate-950 border-l border-white/10 w-full max-w-2xl h-full flex flex-col shadow-2xl font-mono text-xs">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold">
              📝
            </span>
            <div>
              <h3 className="font-bold text-white text-sm font-sans">Club Gönderi Detayı</h3>
              <p className="text-[11px] text-slate-400">ID: {post.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-sans">
              {error}
            </div>
          )}

          {/* Status & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 border border-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Durum:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                  isPublished
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isDraft
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                }`}
              >
                {isPublished ? 'YAYINDA' : isDraft ? 'TASLAK' : 'YAYINDAN KALDIRILDI'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-400">
              {post.isPinned && (
                <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                  <Pin className="w-3 h-3" /> Sabitlenmiş
                </span>
              )}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1 text-orange-400 font-bold bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg hover:bg-orange-500/20 transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{comments.length || post._count?.comments || post.commentsCount || 0} Yorum</span>
                {showComments ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Post Title & Content */}
          <div className="space-y-3 p-4 bg-slate-900/40 border border-white/5 rounded-xl">
            <h2 className="text-base font-bold text-white font-sans">{post.title || 'Başlıksız Gönderi'}</h2>
            <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
              {post.content}
            </div>
          </div>

          {/* Photos / Media Gallery */}
          {post.media && post.media.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-slate-400 font-bold text-[11px] uppercase font-mono">Görseller ({post.media.length})</h4>
              <div className="grid grid-cols-3 gap-2">
                {post.media.map((m: any, idx: number) => (
                  <a
                    key={m.id || idx}
                    href={m.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-video bg-slate-900 rounded-lg overflow-hidden border border-white/10 hover:border-orange-500 transition"
                  >
                    <img src={m.mediaUrl} alt="Club Post Media" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Author Details */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Yazar Bilgisi</span>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white font-sans text-sm block">
                  {post.authorFormatted || post.author?.name || post.author?.username || 'Yönetici'}
                </span>
                <span className="text-slate-400 text-[11px] font-mono">
                  Müşteri No: {post.author?.customerNo || 'TS-ADMIN'}
                </span>
              </div>
              {onOpenUserDrawer && post.author?.id && (
                <button
                  onClick={() => onOpenUserDrawer(post.author.id)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 rounded-lg transition font-bold flex items-center gap-1 cursor-pointer font-sans"
                >
                  <User className="w-3 h-3" /> Kullanıcıyı Gör
                </button>
              )}
            </div>
          </div>

          {/* COMMENTS LIST SECTION INSIDE POST DRAWER */}
          {showComments && (
            <div className="space-y-3 p-4 bg-slate-900/60 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h4 className="font-bold text-white text-xs font-sans flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-400" />
                  <span>Gönderi Yorumları Listesi ({comments.length})</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Canlı Veri</span>
              </div>

              {loadingComments ? (
                <div className="p-6 text-center text-slate-400">Yorumlar yükleniyor...</div>
              ) : comments.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-sans text-xs">
                  Bu gönderiye henüz yorum yapılmamış.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {comments.map((comment: any) => {
                    const isVisible = comment.status === 'VISIBLE';
                    const isPending = comment.status === 'PENDING_REVIEW';
                    const isHidden = comment.status === 'HIDDEN';

                    return (
                      <div
                        key={comment.id}
                        onClick={() => onOpenCommentDrawer && onOpenCommentDrawer(comment)}
                        className="p-3 bg-slate-950 rounded-xl border border-white/5 hover:border-orange-500/40 transition cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-sans text-xs">
                              {comment.authorFormatted || comment.author?.username || 'Kullanıcı'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({comment.author?.customerNo || 'TS-MEMBER'})
                            </span>
                            {comment.badge && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                {comment.badge.label}
                              </span>
                            )}
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isVisible
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isPending
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isVisible ? 'YAYINDA' : isPending ? 'İNCELEMEDE' : 'GİZLİ'}
                          </span>
                        </div>

                        <p className="text-slate-300 font-sans text-xs whitespace-pre-wrap leading-relaxed">
                          {comment.content}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(comment.createdAt).toLocaleString('tr-TR')}
                            {comment.reportCount ? ` · ⚠️ ${comment.reportCount} Şikayet` : ''}
                          </span>

                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            {isVisible && (
                              <>
                                <button
                                  onClick={(e) => handleCommentStatusUpdate(e, comment.id, 'PENDING_REVIEW')}
                                  disabled={commentActingId === comment.id}
                                  className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-[10px] hover:bg-amber-500/30 cursor-pointer"
                                >
                                  İncelemeye Al
                                </button>
                                <button
                                  onClick={(e) => handleCommentStatusUpdate(e, comment.id, 'HIDDEN')}
                                  disabled={commentActingId === comment.id}
                                  className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[10px] hover:bg-rose-500/30 cursor-pointer"
                                >
                                  Gizle
                                </button>
                              </>
                            )}

                            {isPending && (
                              <>
                                <button
                                  onClick={(e) => handleCommentStatusUpdate(e, comment.id, 'VISIBLE')}
                                  disabled={commentActingId === comment.id}
                                  className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] hover:bg-emerald-500/30 cursor-pointer"
                                >
                                  Yayında Tut
                                </button>
                                <button
                                  onClick={(e) => handleCommentStatusUpdate(e, comment.id, 'HIDDEN')}
                                  disabled={commentActingId === comment.id}
                                  className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[10px] hover:bg-rose-500/30 cursor-pointer"
                                >
                                  Gizle
                                </button>
                              </>
                            )}

                            {isHidden && (
                              <>
                                <button
                                  onClick={(e) => handleCommentStatusUpdate(e, comment.id, 'VISIBLE')}
                                  disabled={commentActingId === comment.id}
                                  className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] hover:bg-emerald-500/30 cursor-pointer"
                                >
                                  Tekrar Yayınla
                                </button>
                                <button
                                  onClick={(e) => handleCommentStatusUpdate(e, comment.id, 'PENDING_REVIEW')}
                                  disabled={commentActingId === comment.id}
                                  className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-[10px] hover:bg-amber-500/30 cursor-pointer"
                                >
                                  İncelemeye Al
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Dates & Timeline */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl space-y-1">
              <span className="text-slate-500 block">Oluşturulma Tarihi</span>
              <span className="text-slate-300 font-bold">
                {new Date(post.createdAt).toLocaleString('tr-TR')}
              </span>
            </div>
            <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl space-y-1">
              <span className="text-slate-500 block">Yayın Tarihi</span>
              <span className="text-slate-300 font-bold">
                {post.publishedAt ? new Date(post.publishedAt).toLocaleString('tr-TR') : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2">
            {onOpenEditModal && (
              <button
                onClick={() => onOpenEditModal(post)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer font-sans"
              >
                <Edit3 className="w-3.5 h-3.5" /> Düzenle
              </button>
            )}
            <button
              onClick={handleToggleComments}
              disabled={actionLoading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-sans"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {post.commentsEnabled === false ? 'Yorumları Aç' : 'Yorumları Kapat'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isPublished ? (
              <button
                onClick={handleUnpublish}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-sans"
              >
                <Archive className="w-3.5 h-3.5" /> Yayından Kaldır
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-sans"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Tekrar Yayınla
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
