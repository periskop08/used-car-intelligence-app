"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubCommentsPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || "ALL";

  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchComments = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(
        `${API_URL}/api/admin/club/comments?status=${encodeURIComponent(statusFilter)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [statusFilter]);

  const handleAction = async (commentId: string, action: "review" | "hide" | "restore") => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setActingId(commentId);
    try {
      const res = await fetch(`${API_URL}/api/admin/club/comments/${commentId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: action === "hide" ? JSON.stringify({ reason: "Moderasyon Kararı" }) : undefined,
      });
      if (res.ok) fetchComments();
    } catch (e) {
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white">Yorum Moderasyon Masası</h2>
        <p className="text-xs text-slate-400">
          İnceleme bekleyen, yayınlanan veya gizlenen topluluk yorumlarını yönetin.
        </p>
      </div>

      {/* Status Filter Bar */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {["ALL", "PENDING_REVIEW", "VISIBLE", "HIDDEN"].map((st) => (
          <Link
            key={st}
            href={`/admin/club/comments${st !== "ALL" ? `?status=${st}` : ""}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === st
                ? "bg-white/15 text-white border border-white/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {st === "ALL"
              ? "Tümü"
              : st === "PENDING_REVIEW"
              ? "⏳ İncelemede Bekleyenler"
              : st === "VISIBLE"
              ? "Yayındakiler"
              : "Gizlenenler"}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-xs font-bold">Yorumlar Yükleniyor...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="p-12 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
          <p className="text-xs text-slate-400">Filtreye uygun yorum bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">{comment.authorFormatted}</span>
                  {comment.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                      {comment.badge.label}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      comment.status === "PENDING_REVIEW"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : comment.status === "VISIBLE"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {comment.status}
                  </span>
                </div>

                <p className="text-xs text-slate-200">{comment.content}</p>
                <p className="text-[11px] text-slate-500">
                  Gönderi: {comment.post?.title || "Gönderi"} •{" "}
                  {new Date(comment.createdAt).toLocaleString("tr-TR")}
                </p>
              </div>

              <div className="flex items-center gap-2 whitespace-nowrap">
                {comment.status === "PENDING_REVIEW" && (
                  <button
                    disabled={actingId === comment.id}
                    onClick={() => handleAction(comment.id, "review")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition"
                  >
                    Görünür Yap / Yayına Al
                  </button>
                )}
                {comment.status !== "HIDDEN" && (
                  <button
                    disabled={actingId === comment.id}
                    onClick={() => handleAction(comment.id, "hide")}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition"
                  >
                    Gizle
                  </button>
                )}
                {comment.status === "HIDDEN" && (
                  <button
                    disabled={actingId === comment.id}
                    onClick={() => handleAction(comment.id, "restore")}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-white/10 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Geri Yükle
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
