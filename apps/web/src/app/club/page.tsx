"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import PollCard, { PollData } from "./components/PollCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface PostMedia {
  id: string;
  mediaUrl: string;
  thumbnailUrl?: string;
}

interface PostAuthor {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profilePhotoUrl?: string;
  role?: string;
}

interface ClubPost {
  id: string;
  title?: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  author: PostAuthor;
  media: PostMedia[];
  commentCount: number;
  likeCount: number;
  isLiked?: boolean;
  commentsEnabled: boolean;
  poll?: PollData;
}

interface CommentAuthor {
  id: string;
  displayName: string;
  profilePhotoUrl?: string;
  packageBadge: { code: string; label: string };
  clubRole: "ADMIN" | "MODERATOR" | "MEMBER";
}

interface ClubComment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  author: CommentAuthor;
  replyReference?: {
    commentId: string;
    author: { displayName: string };
    preview?: string;
    availability: "AVAILABLE" | "DELETED" | "HIDDEN" | "UNAVAILABLE";
  };
}

function groupCommentsByThread(flatComments: ClubComment[]) {
  const commentMap = new Map<string, ClubComment>();
  flatComments.forEach((c) => commentMap.set(c.id, c));

  const parentComments: ClubComment[] = [];
  const repliesMap: Record<string, ClubComment[]> = {};

  flatComments.forEach((c) => {
    if (!c.replyReference || !c.replyReference.commentId || !commentMap.has(c.replyReference.commentId)) {
      parentComments.push(c);
    } else {
      let rootParentId = c.replyReference.commentId;
      let curr = commentMap.get(rootParentId);
      while (curr && curr.replyReference && curr.replyReference.commentId && commentMap.has(curr.replyReference.commentId)) {
        rootParentId = curr.replyReference.commentId;
        curr = commentMap.get(rootParentId);
      }

      if (!repliesMap[rootParentId]) {
        repliesMap[rootParentId] = [];
      }
      repliesMap[rootParentId].push(c);
    }
  });

  return { parentComments, repliesMap };
}

function ClubPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<any[]>([]);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, ClubComment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Reply Mode Target per post
  const [replyTargetMap, setReplyTargetMap] = useState<
    Record<string, { commentId: string; displayName: string; preview?: string } | null>
  >({});

  // Popover & Admin DM states
  const [selectedUser, setSelectedUser] = useState<CommentAuthor | null>(null);
  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [dmText, setDmText] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {}
    }

    if (!savedToken) {
      setLoading(false);
      return;
    }

    setToken(savedToken);
    fetchClubPosts(savedToken);
    fetchPinnedPosts(savedToken);
  }, []);

  // Handle URL parameters for scrolling to post or comment
  useEffect(() => {
    const targetPostId = searchParams?.get("post");
    const targetCommentId = searchParams?.get("comment");

    if (targetPostId && posts.length > 0) {
      setOpenCommentsPostId(targetPostId);
      fetchComments(targetPostId);
      setTimeout(() => {
        handleScrollToPost(targetPostId);
        if (targetCommentId) {
          setTimeout(() => handleScrollToComment(targetCommentId), 400);
        }
      }, 300);
    }
  }, [searchParams, posts]);

  const fetchClubPosts = async (authToken: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/club/posts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.code === "CLUB_BANNED" || data.message?.includes("kısıtlanmıştır")) {
          setIsBanned(true);
          setBanReason(data.message || "Topluluk kuralları ihlali nedeniyle erişim kısıtlandı.");
        }
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (e) {
      console.error("Failed to fetch club posts", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPinnedPosts = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/club/posts/pinned`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPinnedPosts(data || []);
      }
    } catch (e) {}
  };

  const fetchComments = async (postId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/club/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCommentsMap((prev) => ({ ...prev, [postId]: data.comments || [] }));
      }
    } catch (e) {}
  };

  const toggleCommentsView = (postId: string) => {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
    } else {
      setOpenCommentsPostId(postId);
      fetchComments(postId);
    }
  };

  // Reply mode handlers
  const handleStartReply = (postId: string, comment: ClubComment) => {
    setReplyTargetMap((prev) => ({
      ...prev,
      [postId]: {
        commentId: comment.id,
        displayName: comment.author.displayName,
        preview: comment.content,
      },
    }));

    setTimeout(() => {
      const el = document.getElementById(`comment-input-${postId}`);
      el?.focus();
    }, 100);
  };

  const handleCancelReply = (postId: string) => {
    setReplyTargetMap((prev) => ({ ...prev, [postId]: null }));
  };

  // Scroll to target comment and highlight
  const handleScrollToComment = (commentId: string) => {
    const el = document.getElementById(`club-comment-${commentId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("club-comment-highlight");
      void el.offsetWidth; // trigger reflow
      el.classList.add("club-comment-highlight");
      setTimeout(() => el.classList.remove("club-comment-highlight"), 2000);
    }
  };

  // Scroll to target post and apply 3-pulse orange glow animation
  const handleScrollToPost = (postId: string) => {
    const el = document.getElementById(`club-post-${postId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("club-pinned-post-highlight");
      void el.offsetWidth; // trigger reflow for restartable animation
      el.classList.add("club-pinned-post-highlight");
      setTimeout(() => el.classList.remove("club-pinned-post-highlight"), 2000);
    } else {
      router.push(`/club?post=${postId}`);
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInput[postId]?.trim();
    if (!content || !token || commentSubmitting) return;

    const replyTarget = replyTargetMap[postId];

    setCommentSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/club/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          replyToCommentId: replyTarget ? replyTarget.commentId : undefined,
        }),
      });

      if (res.ok) {
        setCommentInput((prev) => ({ ...prev, [postId]: "" }));
        setReplyTargetMap((prev) => ({ ...prev, [postId]: null }));
        fetchComments(postId);
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p))
        );
      } else {
        const err = await res.json();
        alert(err.message || "Yorum gönderilemedi.");
      }
    } catch (e) {
      alert("Bağlantı hatası.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/club/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  isLiked: data.isLiked,
                  likeCount: data.isLiked ? p.likeCount + 1 : Math.max(0, p.likeCount - 1),
                }
              : p
          )
        );
      }
    } catch (e) {}
  };

  const handleSendAdminDM = async () => {
    if (!token || !selectedUser || !dmText.trim()) return;

    try {
      const res = await fetch(`${API_URL}/admin/club/users/${selectedUser.id}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: dmText.trim() }),
      });

      if (res.ok) {
        setActionSuccess(`Mesaj ${selectedUser.displayName} adlı kullanıcıya gönderildi.`);
        setDmModalOpen(false);
        setDmText("");
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        const err = await res.json();
        alert(err.message || "Mesaj gönderilemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  const handleMuteUser = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/club/users/${targetUserId}/mute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: "Topluluk kuralı ihlali", durationDays: 3 }),
      });
      if (res.ok) {
        alert("Kullanıcı 3 gün süreyle geçici susturuldu.");
        setSelectedUser(null);
      }
    } catch (e) {}
  };

  // Guest view redirect
  if (!token && !loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-900/90 border border-orange-500/30 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
          <span className="text-5xl block">🏎️</span>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Tork Scout Club</h2>
            <p className="text-sm text-slate-300">
              Tork Scout Club’a katılmak için giriş yapın veya ücretsiz hesap oluşturun.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/login?redirect=/club"
              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold py-3 px-4 rounded-xl text-xs transition"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register?redirect=/club"
              className="flex-1 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold py-3 px-4 rounded-xl text-xs transition"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 403 Ban Explanation Card
  if (isBanned) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-950/30 border border-red-500/30 p-8 rounded-3xl max-w-lg w-full space-y-5 shadow-2xl">
          <span className="text-5xl block">🚫</span>
          <h2 className="text-xl font-black text-red-400">Club Erişiminiz Sınırlandırılmıştır</h2>
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-white/5">
            {banReason}
          </p>
          <div className="text-xs text-slate-400">
            Ana TorqueScout platform hesabınız aktiftir. Club erişimi ile ilgili sorularınız için Destek ekibimizle iletişime geçebilirsiniz.
          </div>
          <Link
            href="/dashboard/support/feedback"
            className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl text-xs border border-white/10 transition"
          >
            Destek Merkezi’ne Git
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="bg-slate-900/80 border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏎️</span>
              <h1 className="text-2xl md:text-3xl font-black text-white">Tork Scout Club</h1>
              <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Yalnızca Üyeler
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
              TorqueScout duyurularını, araç dünyasından özel içerikleri ve topluluk paylaşımlarını takip edin.
            </p>
          </div>

          {/* Admin Management Navigation Button */}
          {(currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN") && (
            <Link
              href="/admin/club"
              className="bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold px-5 py-3 rounded-2xl text-xs shadow-lg transition flex items-center gap-2 shrink-0"
            >
              <span>⚙️</span> Club Yönetim Paneli
            </Link>
          )}
        </div>

        {/* Action success alert */}
        {actionSuccess && (
          <div className="bg-green-500/20 border border-green-500/30 text-green-300 text-xs p-4 rounded-2xl font-bold text-center">
            ✓ {actionSuccess}
          </div>
        )}

        {/* Main Content Layout (Left Feed + Right Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Post Feed */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="bg-slate-900/60 border border-white/10 p-12 rounded-3xl text-center animate-pulse space-y-3">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400">Club akışı yükleniyor...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-slate-900/60 border border-white/10 p-12 rounded-3xl text-center space-y-2">
                <span className="text-4xl block">📭</span>
                <h3 className="text-sm font-bold text-slate-300">Henüz Club gönderisi yayınlanmadı.</h3>
                <p className="text-xs text-slate-500">Yeni duyurular ve özel içerikler yakında burada olacak.</p>
              </div>
            ) : (
              posts.map((post) => {
                const isOpenComments = openCommentsPostId === post.id;
                const comments = commentsMap[post.id] || [];
                const replyTarget = replyTargetMap[post.id];

                return (
                  <article
                    id={`club-post-${post.id}`}
                    key={post.id}
                    className="club-post-card bg-slate-900/90 border border-white/10 rounded-3xl p-6 md:p-7 space-y-5 shadow-xl hover:border-orange-500/20 transition"
                  >
                    {/* Post Author Bar */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-600/30 border border-orange-500/40 flex items-center justify-center font-black text-orange-400 text-sm overflow-hidden">
                          {post.author.profilePhotoUrl ? (
                            <img src={post.author.profilePhotoUrl} alt="Author" className="w-full h-full object-cover" />
                          ) : (
                            "TS"
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">
                              {post.author.username || `${post.author.firstName || ""} ${post.author.lastName || ""}`.trim() || "TorqueScout Admin"}
                            </span>
                            <span className="text-[9px] bg-orange-500 text-slate-950 font-black px-2 py-0.5 rounded uppercase tracking-wider">
                              YÖNETİCİ
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(post.publishedAt).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {post.isPinned && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          📌 SABİTLENDİ
                        </span>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="space-y-3">
                      {post.title && <h3 className="text-lg font-black text-white">{post.title}</h3>}
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                        {post.content}
                      </p>
                    </div>

                    {/* Post Media Gallery */}
                    {post.media && post.media.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {post.media.map((m) => (
                          <div key={m.id} className="rounded-2xl overflow-hidden border border-white/10 bg-slate-950 max-h-80">
                            <img src={m.mediaUrl} alt="Post image" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Optional Poll Widget */}
                    {post.poll && <PollCard poll={post.poll} />}

                    {/* Post Actions Bar */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs text-slate-400">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                          post.isLiked
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-slate-800/60 border-white/5 text-slate-300 hover:text-white"
                        }`}
                      >
                        <span>{post.isLiked ? "❤️" : "🤍"}</span>
                        <span className="font-bold">{post.likeCount}</span>
                      </button>

                      <button
                        onClick={() => toggleCommentsView(post.id)}
                        className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-800 border border-white/5 text-slate-300 px-4 py-1.5 rounded-xl transition cursor-pointer font-bold"
                      >
                        <span>💬</span>
                        <span>Yorumlar ({post.commentCount})</span>
                        <span>{isOpenComments ? "▲" : "▼"}</span>
                      </button>
                    </div>

                    {/* Expanded Comments Section */}
                    {isOpenComments && (
                      <div className="pt-4 border-t border-white/10 space-y-4 animate-fadeIn">
                        {/* Reply Mode Active Banner */}
                        {replyTarget && (
                          <div className="bg-orange-500/10 border border-orange-500/30 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs text-orange-400 font-bold">
                            <span>↩ {replyTarget.displayName} adlı kullanıcıya yanıt veriyorsunuz</span>
                            <button
                              type="button"
                              onClick={() => handleCancelReply(post.id)}
                              className="text-slate-400 hover:text-white text-xs font-bold transition"
                            >
                              İptal ×
                            </button>
                          </div>
                        )}

                        {/* Comment Input Form */}
                        {post.commentsEnabled ? (
                          <div className="flex gap-2">
                            <input
                              id={`comment-input-${post.id}`}
                              type="text"
                              placeholder={
                                replyTarget
                                  ? `${replyTarget.displayName}’e yanıtınızı yazın...`
                                  : "Yorumunuzu yazın... (Max 1000 karakter)"
                              }
                              maxLength={1000}
                              value={commentInput[post.id] || ""}
                              onChange={(e) =>
                                setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              disabled={commentSubmitting || !commentInput[post.id]?.trim()}
                              className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shrink-0"
                            >
                              {replyTarget ? "Yanıtla" : "Yorum Yap"}
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-slate-500 italic py-2 bg-slate-950/60 rounded-xl">
                            🔒 Bu gönderi için yorumlar kapatılmıştır.
                          </div>
                        )}

                        {/* Threaded Nested Comment List */}
                        <div className="space-y-4">
                          {(() => {
                            const { parentComments, repliesMap } = groupCommentsByThread(comments);
                            if (comments.length === 0) {
                              return <p className="text-xs text-slate-500 text-center py-3">İlk yorumu siz yapın.</p>;
                            }

                            return parentComments.map((parent) => {
                              const parentReplies = repliesMap[parent.id] || [];

                              return (
                                <div
                                  id={`club-comment-${parent.id}`}
                                  key={parent.id}
                                  className="club-comment-card bg-slate-950/70 border border-white/5 p-4 rounded-2xl space-y-3 text-xs transition-all"
                                >
                                  {/* Parent Comment Header & Content */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div
                                        onClick={() => setSelectedUser(parent.author)}
                                        className="flex items-center gap-2 cursor-pointer group"
                                      >
                                        <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-300">
                                          {parent.author.displayName.slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-slate-200 group-hover:text-orange-400 transition">
                                          {parent.author.displayName}
                                        </span>

                                        {/* Dynamic Package Badge */}
                                        <span
                                          className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                                            parent.author.packageBadge?.code === "YETKIN"
                                              ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                              : parent.author.packageBadge?.code === "PROFESYONEL"
                                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                              : "bg-slate-800 text-slate-300 border border-white/10"
                                          }`}
                                        >
                                          {parent.author.packageBadge?.label || "Tanışma"}
                                        </span>

                                        {/* Role Badges */}
                                        {parent.author.clubRole === "ADMIN" && (
                                          <span className="text-[9px] bg-orange-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                                            YÖNETİCİ
                                          </span>
                                        )}
                                        {parent.author.clubRole === "MODERATOR" && (
                                          <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-1.5 py-0.5 rounded">
                                            MOD
                                          </span>
                                        )}
                                      </div>

                                      <span className="text-[10px] text-slate-500">
                                        {new Date(parent.createdAt).toLocaleTimeString("tr-TR", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                        {parent.editedAt && " (Düzenlendi)"}
                                      </span>
                                    </div>

                                    <p className="text-slate-300 leading-normal pl-8 text-xs sm:text-sm">{parent.content}</p>

                                    <div className="pl-8 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleStartReply(post.id, parent)}
                                        className="text-[11px] text-slate-400 hover:text-orange-400 font-bold flex items-center gap-1 transition"
                                      >
                                        <span>↩</span>
                                        <span>Yanıtla</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* NESTED REPLIES CONTAINER (Directly Inside Parent Comment Box) */}
                                  {parentReplies.length > 0 && (
                                    <div className="mt-3 pl-3 sm:pl-4 border-l-2 border-orange-500/40 space-y-2.5 pt-1">
                                      {parentReplies.map((r) => (
                                        <div
                                          id={`club-comment-${r.id}`}
                                          key={r.id}
                                          className="club-comment-card bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-2 text-xs transition-all"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div
                                              onClick={() => setSelectedUser(r.author)}
                                              className="flex items-center gap-2 cursor-pointer group"
                                            >
                                              <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[9px] text-slate-300">
                                                {r.author.displayName.slice(0, 2).toUpperCase()}
                                              </div>
                                              <span className="font-bold text-slate-200 group-hover:text-orange-400 transition text-[11px]">
                                                {r.author.displayName}
                                              </span>

                                              <span
                                                className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                                                  r.author.packageBadge?.code === "YETKIN"
                                                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                                    : r.author.packageBadge?.code === "PROFESYONEL"
                                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                    : "bg-slate-800 text-slate-300 border border-white/10"
                                                }`}
                                              >
                                                {r.author.packageBadge?.label || "Tanışma"}
                                              </span>

                                              {r.author.clubRole === "ADMIN" && (
                                                <span className="text-[8px] bg-orange-500 text-slate-950 font-black px-1 py-0.5 rounded">
                                                  YÖNETİCİ
                                                </span>
                                              )}
                                              {r.author.clubRole === "MODERATOR" && (
                                                <span className="text-[8px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-1 py-0.5 rounded">
                                                  MOD
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[10px] text-slate-500">
                                              {new Date(r.createdAt).toLocaleTimeString("tr-TR", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}
                                            </span>
                                          </div>

                                          <p className="text-slate-300 leading-normal pl-7 text-xs">{r.content}</p>

                                          <div className="pl-7 pt-0.5">
                                            <button
                                              type="button"
                                              onClick={() => handleStartReply(post.id, r)}
                                              className="text-[10px] text-slate-400 hover:text-orange-400 font-bold flex items-center gap-1 transition"
                                            >
                                              <span>↩</span>
                                              <span>Yanıtla</span>
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>

          {/* Right Column: Pinned Posts, Community Rules, Support */}
          <div className="space-y-6">
            {/* Clickable Pinned Posts Sidebar Card */}
            {pinnedPosts.length > 0 && (
              <div className="bg-slate-900/90 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>📌</span> Sabitlenen Gönderiler
                </h3>
                <div className="space-y-3">
                  {pinnedPosts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleScrollToPost(p.id)}
                      aria-label={`${p.title || p.content} sabitlenmiş gönderisine git`}
                      className="w-full text-left bg-slate-950/70 hover:bg-slate-800/80 p-3.5 rounded-2xl border border-white/5 hover:border-orange-500/40 transition cursor-pointer group space-y-1 block"
                    >
                      <h4 className="text-xs font-bold text-white group-hover:text-orange-400 transition line-clamp-2">
                        {p.title || p.content}
                      </h4>
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(p.publishedAt).toLocaleDateString("tr-TR")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Community Rules Card */}
            <div className="bg-slate-900/90 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>📜</span> Topluluk Kuralları
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">1.</span> Saygılı ve yapıcı bir dil kullanın.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">2.</span> Spam veya izinsiz reklam paylaşmayın.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">3.</span> Kişisel verileri açıkça paylaşmayın.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">4.</span> Gönderi konusuyla ilgili yorum yapın.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">5.</span> Admin ve moderatör kararlarına uyun.
                </li>
              </ul>
            </div>

            {/* Support Link Card */}
            <div className="bg-slate-900/90 border border-white/10 p-5 rounded-3xl space-y-3 shadow-xl text-center">
              <span className="text-2xl block">💬</span>
              <h4 className="text-xs font-bold text-white">Sorun mu yaşıyorsunuz?</h4>
              <p className="text-[11px] text-slate-400">Görüş, öneri veya şikâyetlerinizi destek ekibimize iletebilirsiniz.</p>
              <Link
                href="/dashboard/support/feedback"
                className="inline-block w-full bg-slate-800 hover:bg-slate-750 text-white font-bold py-2.5 rounded-xl text-xs border border-white/10 transition"
              >
                Destek Merkezi’ne Git
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* User Popover Action Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Kullanıcı Bilgileri</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Kullanıcı Adı:</span>
                <span className="font-bold text-white">{selectedUser.displayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Paket:</span>
                <span className="font-bold text-orange-400">{selectedUser.packageBadge?.label || "Tanışma"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rol:</span>
                <span className="font-bold text-blue-400">{selectedUser.clubRole}</span>
              </div>
            </div>

            {/* Admin Action Buttons */}
            {(currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN") && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <button
                  onClick={() => setDmModalOpen(true)}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  📩 Mesaj Gönder
                </button>
                <button
                  onClick={() => handleMuteUser(selectedUser.id)}
                  className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  ⏳ 3 Gün Geçici Sustur
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin DM Modal */}
      {dmModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-orange-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">
              {selectedUser.displayName} Adlı Kullanıcıya Özel Mesaj
            </h3>
            <textarea
              rows={4}
              placeholder="Mesajınızı yazın... (Mesajlar sekmesine ve bildirim paneline düşecektir)"
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3 text-xs text-white outline-none focus:border-orange-500/50"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDmModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                İptal
              </button>
              <button
                onClick={handleSendAdminDM}
                disabled={!dmText.trim()}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClubPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-400">Yükleniyor...</div>}>
      <ClubPageContent />
    </Suspense>
  );
}
