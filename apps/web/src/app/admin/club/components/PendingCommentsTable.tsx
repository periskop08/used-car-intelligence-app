"use client";

import React, { useState } from "react";
import Link from "next/link";

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  authorFormatted: string;
  badge?: { label: string; code: string };
  post?: { id: string; title: string };
  author?: { id: string; customerNo?: string };
}

export default function PendingCommentsTable({
  comments,
  onRefresh,
}: {
  comments: CommentItem[];
  onRefresh?: () => void;
}) {
  const [actingId, setActingId] = useState<string | null>(null);

  const handleAction = async (commentId: string, action: "review" | "hide") => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setActingId(commentId);
    try {
      const endpoint = action === "review" ? "review" : "hide";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/admin/club/comments/${commentId}/${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: action === "hide" ? JSON.stringify({ reason: "Uygunsuz içerik" }) : undefined,
        }
      );
      if (res.ok) {
        if (onRefresh) onRefresh();
      } else {
        alert("İşlem gerçekleştirilemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    } finally {
      setActingId(null);
    }
  };

  if (!comments || comments.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
        <span className="text-3xl mb-2 block">✅</span>
        <h3 className="text-sm font-bold text-slate-200">İncelemede Bekleyen Yorum Bulunmuyor</h3>
        <p className="text-xs text-slate-400 mt-1">Tüm topluluk yorumları yayında ve onaylanmış durumda.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏳</span>
          <h3 className="text-sm font-black text-white">İnceleme Bekleyen Yorumlar</h3>
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
              <th className="p-3">Gönderi</th>
              <th className="p-3 text-right">Aksiyonlar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {comments.map((comment) => (
              <tr key={comment.id} className="hover:bg-white/[0.02] transition">
                <td className="p-3 font-semibold text-slate-200 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>{comment.authorFormatted}</span>
                    {comment.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                        {comment.badge.label}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-slate-300 max-w-xs truncate">{comment.content}</td>
                <td className="p-3 text-slate-400 max-w-xs truncate">
                  {comment.post?.title || "Gönderi"}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      disabled={actingId === comment.id}
                      onClick={() => handleAction(comment.id, "review")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold hover:bg-emerald-500/30 transition text-xs disabled:opacity-50"
                    >
                      {actingId === comment.id ? "..." : "Görünür Yap / Yayına Al"}
                    </button>
                    <button
                      disabled={actingId === comment.id}
                      onClick={() => handleAction(comment.id, "hide")}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold hover:bg-rose-500/30 transition text-xs disabled:opacity-50"
                    >
                      Gizle
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
