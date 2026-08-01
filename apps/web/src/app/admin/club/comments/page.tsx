"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface PostGroup {
  post: {
    id: string;
    title: string;
    status: string;
    publishedAt?: string;
    createdAt: string;
  };
  counts: {
    total: number;
    visible: number;
    pendingReview: number;
    hidden: number;
    deleted: number;
  };
}

export default function AdminClubCommentsPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || "ALL";

  const [groups, setGroups] = useState<PostGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  const [postCommentsMap, setPostCommentsMap] = useState<Record<string, any[]>>({});
  const [loadingCommentsMap, setLoadingCommentsMap] = useState<Record<string, boolean>>({});

  const [selectedCommentIds, setSelectedCommentIds] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);

  const fetchGroups = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setLoading(true);
    try {
      let res = await fetch(
        `${API_URL}/api/admin/club/comments/groups?status=${encodeURIComponent(statusFilter)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok && res.status === 404) {
        res = await fetch(
          `${API_URL}/admin/club/comments/groups?status=${encodeURIComponent(statusFilter)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    setSelectedCommentIds(new Set());
  }, [statusFilter]);

  const toggleAccordion = async (postId: string) => {
    const next = new Set(expandedPostIds);
    if (next.has(postId)) {
      next.delete(postId);
      setExpandedPostIds(next);
      return;
    }

    next.add(postId);
    setExpandedPostIds(next);

    if (!postCommentsMap[postId]) {
      fetchCommentsForPost(postId);
    }
  };

  const fetchCommentsForPost = async (postId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setLoadingCommentsMap((prev) => ({ ...prev, [postId]: true }));
    try {
      let res = await fetch(
        `${API_URL}/api/admin/club/posts/${postId}/comments?status=${encodeURIComponent(statusFilter)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok && res.status === 404) {
        res = await fetch(
          `${API_URL}/admin/club/posts/${postId}/comments?status=${encodeURIComponent(statusFilter)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
      if (res.ok) {
        const data = await res.json();
        setPostCommentsMap((prev) => ({ ...prev, [postId]: data.comments || [] }));
      }
    } catch (e) {
    } finally {
      setLoadingCommentsMap((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleAction = async (commentId: string, action: "hide" | "review" | "restore", postId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      let res = await fetch(`${API_URL}/api/admin/club/comments/${commentId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: action === "hide" ? JSON.stringify({ reason: "Moderasyon kararı" }) : undefined,
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_URL}/admin/club/comments/${commentId}/${action}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: action === "hide" ? JSON.stringify({ reason: "Moderasyon kararı" }) : undefined,
        });
      }
      if (res.ok) {
        fetchCommentsForPost(postId);
        fetchGroups();
      }
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  const toggleSelectComment = (commentId: string) => {
    const next = new Set(selectedCommentIds);
    if (next.has(commentId)) next.delete(commentId);
    else next.add(commentId);
    setSelectedCommentIds(next);
  };

  const handleBulkStatusChange = async (targetStatus: "VISIBLE" | "HIDDEN" | "PENDING_REVIEW") => {
    if (selectedCommentIds.size === 0) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setBulkActing(true);
    try {
      let res = await fetch(`${API_URL}/api/admin/club/comments/bulk-status`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentIds: Array.from(selectedCommentIds),
          targetStatus,
        }),
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_URL}/admin/club/comments/bulk-status`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            commentIds: Array.from(selectedCommentIds),
            targetStatus,
          }),
        });
      }
      if (res.ok) {
        setSelectedCommentIds(new Set());
        fetchGroups();
        // Refresh open accordions
        expandedPostIds.forEach((pId) => fetchCommentsForPost(pId));
      }
    } catch (e) {
      alert("Toplu işlem sırasında hata oluştu.");
    } finally {
      setBulkActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Yorum Moderasyonu (Gönderi Accordion Yapısı)</h2>
          <p className="text-xs text-slate-400">
            Topluluk yorumlarını gönderilere göre filtrelenmiş açılır gruplar hâlinde inceleyin ve yönetin.
          </p>
        </div>

        {selectedCommentIds.size > 0 && (
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-bold text-orange-400">{selectedCommentIds.size} Yorum Seçildi</span>
            <button
              disabled={bulkActing}
              onClick={() => handleBulkStatusChange("PENDING_REVIEW")}
              className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-500/30"
            >
              İncelemeye Al
            </button>
            <button
              disabled={bulkActing}
              onClick={() => handleBulkStatusChange("VISIBLE")}
              className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-500/30"
            >
              Görünür Yap
            </button>
            <button
              disabled={bulkActing}
              onClick={() => handleBulkStatusChange("HIDDEN")}
              className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold hover:bg-rose-500/30"
            >
              Gizle
            </button>
            <button
              onClick={() => setSelectedCommentIds(new Set())}
              className="text-xs text-slate-400 hover:text-white underline ml-1"
            >
              Temizle
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 flex-wrap">
        {[
          { key: "ALL", label: "Tümü" },
          { key: "PENDING_REVIEW", label: "⏳ İncelemede Bekleyenler" },
          { key: "VISIBLE", label: "✅ Yayındakiler" },
          { key: "HIDDEN", label: "🙈 Gizlenenler" },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/club/comments?status=${tab.key}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === tab.key
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-xs font-bold">Gönderi Grupları Yükleniyor...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="p-12 rounded-2xl border border-white/10 bg-slate-900/60 text-center space-y-1">
          <span className="text-2xl block">✅</span>
          <p className="text-xs font-bold text-slate-300">Filtreye Uygun Gönderi Yorum Grubu Bulunmadı</p>
          <p className="text-[11px] text-slate-500">Seçilen duruma ait yorum içeren gönderi kaydı yok.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((grp) => {
            const isExpanded = expandedPostIds.has(grp.post.id);
            const comments = postCommentsMap[grp.post.id] || [];
            const isCommentsLoading = loadingCommentsMap[grp.post.id];

            return (
              <div
                key={grp.post.id}
                className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden transition"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleAccordion(grp.post.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{grp.post.title || "Başlıksız Gönderi"}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                        {grp.post.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>Toplam: {grp.counts.total}</span>
                      <span className="text-emerald-400">Görünür: {grp.counts.visible}</span>
                      <span className="text-amber-400">İncelemede: {grp.counts.pendingReview}</span>
                      <span className="text-rose-400">Gizli: {grp.counts.hidden}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <span>{isExpanded ? "Yorumları Gizle ▲" : "Yorumları Göster ▼"}</span>
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="border-t border-white/10 p-4 bg-slate-950/50 space-y-3">
                    {isCommentsLoading ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-orange-500 mx-auto mb-2"></div>
                        Yorumlar yükleniyor...
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">Bu gönderide filtrenize uyan yorum yok.</p>
                    ) : (
                      comments.map((c) => (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-xl border border-white/5 bg-slate-900/80 flex flex-col sm:flex-row items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedCommentIds.has(c.id)}
                              onChange={() => toggleSelectComment(c.id)}
                              className="mt-1 rounded border-white/20 text-orange-500 focus:ring-orange-500"
                            />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-white">{c.authorFormatted}</span>
                                {c.badge && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                    {c.badge}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                    c.status === "VISIBLE"
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : c.status === "PENDING_REVIEW"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-rose-500/20 text-rose-400"
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200">{c.content}</p>
                              <span className="text-[10px] font-mono text-slate-500 block">
                                {new Date(c.createdAt).toLocaleString("tr-TR")}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            {c.status === "VISIBLE" && (
                              <button
                                onClick={() => handleAction(c.id, "review", grp.post.id)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-500/30 transition"
                              >
                                İncelemeye Al
                              </button>
                            )}

                            {c.status === "PENDING_REVIEW" && (
                              <button
                                onClick={() => handleAction(c.id, "restore", grp.post.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-500/30 transition"
                              >
                                İncelemeden Kaldır
                              </button>
                            )}

                            {c.status !== "HIDDEN" && (
                              <button
                                onClick={() => handleAction(c.id, "hide", grp.post.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold hover:bg-rose-500/30 transition"
                              >
                                Gizle
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
