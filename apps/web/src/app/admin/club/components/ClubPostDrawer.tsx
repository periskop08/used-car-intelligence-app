'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface ClubPostDrawerProps {
  post: any | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenUserDrawer?: (userId: string) => void;
  onOpenEditModal?: (post: any) => void;
}

export function ClubPostDrawer({
  post,
  isOpen,
  onClose,
  onRefresh,
  onOpenUserDrawer,
  onOpenEditModal,
}: ClubPostDrawerProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              <h3 className="font-bold text-white text-sm">Club Gönderi Detayı</h3>
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
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
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
              <span className="flex items-center gap-1 text-slate-300">
                <MessageSquare className="w-3 h-3 text-orange-400" />
                {post._count?.comments || post.commentsCount || 0} Yorum
              </span>
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
              <h4 className="text-slate-400 font-bold text-[11px] uppercase">Görseller ({post.media.length})</h4>
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
                <span className="text-slate-400 text-[11px]">
                  Müşteri No: {post.author?.customerNo || 'TS-ADMIN'}
                </span>
              </div>
              {onOpenUserDrawer && post.author?.id && (
                <button
                  onClick={() => onOpenUserDrawer(post.author.id)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 rounded-lg transition font-bold flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3 h-3" /> Kullanıcıyı Gör
                </button>
              )}
            </div>
          </div>

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
        <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onOpenEditModal && (
              <button
                onClick={() => onOpenEditModal(post)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Düzenle
              </button>
            )}
            <button
              onClick={handleToggleComments}
              disabled={actionLoading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" /> Yayından Kaldır
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
