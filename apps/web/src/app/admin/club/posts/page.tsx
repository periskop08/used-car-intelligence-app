"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubPostsPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || "ALL";

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      let res = await fetch(
        `${API_URL}/api/admin/club/posts?status=${encodeURIComponent(statusFilter)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok && res.status === 404) {
        res = await fetch(
          `${API_URL}/admin/club/posts?status=${encodeURIComponent(statusFilter)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [statusFilter]);

  const handlePublish = async (postId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const res = await fetch(`${API_URL}/api/admin/club/posts/${postId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchPosts();
  };

  const handleArchive = async (postId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const res = await fetch(`${API_URL}/api/admin/club/posts/${postId}/archive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchPosts();
  };

  const handleToggleComments = async (postId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const res = await fetch(`${API_URL}/api/admin/club/posts/${postId}/comments-toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchPosts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Topluluk Gönderi Yönetimi</h2>
          <p className="text-xs text-slate-400">Yayınlanmış, taslak veya arşivlenmiş ana gönderileri yönetin.</p>
        </div>

        <Link
          href="/admin/club/posts/new"
          className="bg-orange-500 hover:bg-orange-400 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center gap-2"
        >
          <span>➕</span> Yeni Gönderi Ekleyin
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((st) => (
          <Link
            key={st}
            href={`/admin/club/posts${st !== "ALL" ? `?status=${st}` : ""}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === st
                ? "bg-white/15 text-white border border-white/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {st === "ALL" ? "Tümü" : st === "PUBLISHED" ? "Yayındakiler" : st === "DRAFT" ? "Taslaklar" : "Arşiv"}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-xs font-bold">Gönderiler Yükleniyor...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
          <p className="text-xs text-slate-400">Filtreye uygun gönderi bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {post.isPinned && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      📌 SABİTLENMİŞ
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      post.status === "PUBLISHED"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-700/40 text-slate-400 border border-white/10"
                    }`}
                  >
                    {post.status}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate">
                    {post.title || post.content.substring(0, 50) + "..."}
                  </h3>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">{post.content}</p>
                <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                  <span>Yazar: {post.authorFormatted}</span>
                  <span>•</span>
                  <span>💬 {post._count?.comments || 0} Yorum</span>
                  <span>•</span>
                  <span>📷 {post.media?.length || 0} Görsel</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
                {post.status === "DRAFT" && (
                  <button
                    onClick={() => handlePublish(post.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition"
                  >
                    Yayınla
                  </button>
                )}
                {post.status === "PUBLISHED" && (
                  <button
                    onClick={() => handleArchive(post.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-white/10 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Arşivle
                  </button>
                )}
                <button
                  onClick={() => handleToggleComments(post.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                    post.commentsEnabled
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                  }`}
                >
                  {post.commentsEnabled ? "💬 Yorumlar Açık" : "🔇 Yorumlar Kapalı"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
