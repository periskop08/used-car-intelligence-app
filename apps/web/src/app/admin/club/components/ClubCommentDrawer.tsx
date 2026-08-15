'use client';

import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  User,
  Clock,
  ShieldAlert,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface ClubCommentDrawerProps {
  comment: any | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenUserDrawer?: (userId: string) => void;
  onOpenPostDrawer?: (post: any) => void;
}

export function ClubCommentDrawer({
  comment,
  isOpen,
  onClose,
  onRefresh,
  onOpenUserDrawer,
  onOpenPostDrawer,
}: ClubCommentDrawerProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [showHideModal, setShowHideModal] = useState(false);

  if (!isOpen || !comment) return null;

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const handleHideComment = async () => {
    if (!token) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/comments/${comment.id}/hide`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reasonInput || 'Topluluk Kuralları İhlali' }),
      });
      if (!res.ok) throw new Error('Yorum gizlenemedi.');
      setShowHideModal(false);
      onRefresh?.();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreComment = async () => {
    if (!token) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/comments/${comment.id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Yorum tekrar gösterilemedi.');
      onRefresh?.();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isHidden = comment.status === 'HIDDEN';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-slate-950 border-l border-white/10 w-full max-w-xl h-full flex flex-col shadow-2xl font-mono text-xs">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold">
              💬
            </span>
            <div>
              <h3 className="font-bold text-white text-sm">Yorum Detayı & Moderasyon</h3>
              <p className="text-[11px] text-slate-400">ID: {comment.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              {error}
            </div>
          )}

          {/* Comment Status & Package Badge */}
          <div className="flex items-center justify-between p-4 bg-slate-900/80 border border-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Durum:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                  isHidden
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isHidden ? 'GİZLENDİ' : 'YAYINDA'}
              </span>
            </div>

            {comment.badge && (
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                Paket: {comment.badge.label}
              </span>
            )}
          </div>

          {/* Comment Content */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Yorum İçeriği</span>
            <p className="text-slate-200 text-xs font-sans whitespace-pre-wrap leading-relaxed">
              {comment.content}
            </p>
            <div className="pt-2 text-[10px] text-slate-500 font-mono">
              Yayınlanma: {new Date(comment.createdAt).toLocaleString('tr-TR')}
            </div>
          </div>

          {/* Target Post Reference */}
          {comment.post && (
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-2">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Ait Olduğu Gönderi</span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-xs truncate max-w-[280px]">
                  {comment.post.title || 'İlgili Gönderi'}
                </span>
                {onOpenPostDrawer && (
                  <button
                    onClick={() => onOpenPostDrawer(comment.post)}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-orange-400 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    Gönderiyi Gör <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Author Card */}
          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl space-y-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Yorum Yapan Üye</span>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white font-sans text-sm block">
                  {comment.authorFormatted || comment.author?.name || 'Kullanıcı'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {comment.author?.email || comment.author?.username || '—'}
                </span>
              </div>
              {onOpenUserDrawer && comment.author?.id && (
                <button
                  onClick={() => onOpenUserDrawer(comment.author.id)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 rounded-lg transition font-bold flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3 h-3" /> Kullanıcıyı Gör
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-end gap-2">
          {isHidden ? (
            <button
              onClick={handleRestoreComment}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5" /> Tekrar Göster
            </button>
          ) : (
            <button
              onClick={() => setShowHideModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <EyeOff className="w-3.5 h-3.5" /> Yorumu Gizle
            </button>
          )}
        </div>

        {/* Hide Reason Modal Overlay */}
        {showHideModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h4 className="font-bold text-white text-sm">Yorumu Gizleme Nedeni</h4>
              <textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Örn: Hakaret, reklam veya topluluk kuralı ihlali..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 h-24"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowHideModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
                >
                  İptal
                </button>
                <button
                  onClick={handleHideComment}
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold"
                >
                  Gizle & Audit Log Yaz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
