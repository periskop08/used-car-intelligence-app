'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/utils/apiConfig';

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  authorFormatted: string;
  badge?: { label: string; code: string };
  post?: { id: string; title: string };
  author?: { id: string; customerNo?: string };
}

interface PendingCommentsTableProps {
  comments: CommentItem[];
  onRefresh?: () => void;
  onCommentClick?: (comment: any) => void;
}

export default function PendingCommentsTable({
  comments,
  onRefresh,
  onCommentClick,
}: PendingCommentsTableProps) {
  const [actingId, setActingId] = useState<string | null>(null);

  const handleAction = async (e: React.MouseEvent, commentId: string, action: 'publish' | 'hide') => {
    e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setActingId(commentId);
    try {
      const endpoint = action === 'publish' ? 'publish' : 'hide';
      const res = await fetch(`${API_BASE_URL}/admin/club/comments/${commentId}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: action === 'hide' ? JSON.stringify({ reason: 'Moderatör tarafından gizlendi' }) : undefined,
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      } else {
        alert('İşlem gerçekleştirilemedi.');
      }
    } catch (err) {
      alert('Hata oluştu.');
    } finally {
      setActingId(null);
    }
  };

  if (!comments || comments.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-white/10 bg-slate-900/60 text-center font-mono text-xs">
        <span className="text-3xl mb-2 block">✅</span>
        <h3 className="text-sm font-bold text-slate-200 font-sans">İncelemede Bekleyen Yorum Bulunmuyor</h3>
        <p className="text-xs text-slate-400 mt-1">Tüm topluluk yorumları yayında ve onaylanmış durumda.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden font-mono text-xs">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏳</span>
          <h3 className="text-sm font-black text-white font-sans">İnceleme Bekleyen Yorumlar</h3>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {comments.length} Bekliyor
          </span>
        </div>
        <Link
          href="/admin/club/comments?status=PENDING_REVIEW"
          className="text-xs font-bold text-orange-400 hover:text-orange-300 transition"
        >
          Tümünü Gör ➡️
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 uppercase font-mono text-[10px] border-b border-white/5">
            <tr>
              <th className="p-3">Kullanıcı (Müşteri No — İsim)</th>
              <th className="p-3">Yorum İçeriği</th>
              <th className="p-3 text-right">Aksiyonlar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {comments.map((comment) => (
              <tr
                key={comment.id}
                onClick={() => onCommentClick && onCommentClick(comment)}
                className="hover:bg-white/[0.04] transition cursor-pointer"
              >
                <td className="p-3 font-semibold text-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-bold">{comment.authorFormatted}</span>
                    {comment.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                        {comment.badge.label}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-slate-300 font-sans max-w-xs truncate">{comment.content}</td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={(e) => handleAction(e, comment.id, 'publish')}
                    disabled={actingId === comment.id}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] hover:bg-emerald-500/30 transition disabled:opacity-50 cursor-pointer"
                  >
                    Onayla / Yayına Al
                  </button>
                  <button
                    onClick={(e) => handleAction(e, comment.id, 'hide')}
                    disabled={actingId === comment.id}
                    className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[11px] hover:bg-rose-500/30 transition disabled:opacity-50 cursor-pointer"
                  >
                    Gizle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
