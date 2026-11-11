"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Share2,
  Pin,
  PlusCircle,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Car,
  AlertTriangle,
  Camera,
  Trash2,
  Send,
  Bookmark,
  Image as Images,
  MoreHorizontal,
} from "lucide-react";
import { API_BASE_URL, getAuthToken } from "@/utils/apiConfig";
import PollCard, { PollData } from "./components/PollCard";

const resolvePostMediaUrl = (url?: string | null): string => {
  if (!url) return "";
  if (url.includes(".r2.dev/") || url.includes("cloudflarestorage.com/")) {
    const parts = url.split(".r2.dev/");
    const storageKey = parts.length > 1 ? parts[1].split("?")[0] : "";
    if (storageKey) {
      return `${API_BASE_URL}/listings/media-proxy/${storageKey}`;
    }
  }
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
};

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
  status?: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  isUserSubmission?: boolean;
  rejectionReason?: string | null;
  isPinned: boolean;
  publishedAt: string;
  createdAt?: string;
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

function ScoutRgbWelcomeBanner() {
  return (
    <div className="relative rounded-[22px] p-[2.5px] overflow-hidden shadow-[0_8px_30px_rgba(6,182,212,0.16)]">
      {/* Infinite rotating Scout RGB gradient border */}
      <div
        className="absolute inset-[-150%] animate-[spin_4s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, #0052d4, #0284c7, #00d2ff, #14b8a6, #10b981, #00f2fe, #0284c7, #0052d4)",
        }}
      />
      <div className="relative bg-white rounded-[19.5px] px-5 py-4 sm:px-6 sm:py-5">
        <h2 className="text-lg sm:text-xl font-black text-[#ea580c] tracking-tight">
          Kulübe Hoş Geldiniz!
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-[#0f172a] mt-1 leading-relaxed">
          Araç sahipleriyle tecrübe paylaşın, anketlere katılın ve özel duyurulardan anında haberdar olun.
        </p>
      </div>
    </div>
  );
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
      while (
        curr &&
        curr.replyReference &&
        curr.replyReference.commentId &&
        commentMap.has(curr.replyReference.commentId)
      ) {
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
  const garageFileInputRef = useRef<HTMLInputElement | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  // Category Tabs: ALL | POLLS | GARAGE
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "POLLS" | "GARAGE">("ALL");

  // Feed & Pinned Posts
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<any[]>([]);
  const [activeMediaIndices, setActiveMediaIndices] = useState<Record<string, number>>({});

  // Lightbox Modal State
  const [lightboxPostId, setLightboxPostId] = useState<string | null>(null);
  const [lightboxMediaIndex, setLightboxMediaIndex] = useState<number>(0);

  // Auth Prompt Modal State (for guests clicking Like / Comment / Share / Vote)
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);

  // Garage State
  const [garageItems, setGarageItems] = useState<ClubPost[]>([]);
  const [loadingGarage, setLoadingGarage] = useState(false);
  const [garageFiles, setGarageFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [garageTitle, setGarageTitle] = useState("");
  const [garageCaption, setGarageCaption] = useState("");
  const [shareInClub, setShareInClub] = useState(true);
  const [submittingGarage, setSubmittingGarage] = useState(false);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);

  // Admin Create Post Modal State
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postMediaUrl, setPostMediaUrl] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [adminMenuPostId, setAdminMenuPostId] = useState<string | null>(null);

  // Comments State
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, ClubComment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyTargetMap, setReplyTargetMap] = useState<
    Record<string, { commentId: string; displayName: string; preview?: string } | null>
  >({});

  // Popover & Admin DM states
  const [selectedUser, setSelectedUser] = useState<CommentAuthor | null>(null);
  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [dmText, setDmText] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = getAuthToken();
    const savedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;

    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {}
    }

    setToken(savedToken);

    if (savedToken) {
      fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setCurrentUser(d);
        })
        .catch(() => {});
      fetchMyGarage(savedToken);
    }

    fetchClubPosts(savedToken);
    fetchPinnedPosts(savedToken);
  }, []);

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

  const fetchClubPosts = async (authToken?: string | null) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const res = await fetch(`${API_BASE_URL}/club/posts?limit=30`, { headers });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "CLUB_BANNED" || data.message?.includes("sınırlandırılmıştır")) {
          setIsBanned(true);
          setBanReason(data.message || "Topluluk kuralları ihlali nedeniyle erişim kısıtlandı.");
        }
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const rawPosts = data.posts || (Array.isArray(data) ? data : data.items || []);
        setPosts(rawPosts);
      }
    } catch (e) {
      console.error("Failed to fetch club posts", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPinnedPosts = async (authToken?: string | null) => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const res = await fetch(`${API_BASE_URL}/club/posts/pinned`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPinnedPosts(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
  };

  const fetchMyGarage = async (authToken?: string | null) => {
    const activeToken = authToken ?? token;
    if (!activeToken) return;
    setLoadingGarage(true);
    try {
      const res = await fetch(`${API_BASE_URL}/club/garage`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setGarageItems(items);
      }
    } catch (e) {
      console.warn("Error fetching garage:", e);
    } finally {
      setLoadingGarage(false);
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/club/posts/${postId}/comments?limit=50`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.comments || data.items || [];
        setCommentsMap((prev) => ({ ...prev, [postId]: list }));
      }
    } catch (e) {}
  };

  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // LIKE, COMMENT, SHARE HANDLERS WITH GUEST CHECK
  const handleToggleLike = async (post: ClubPost) => {
    const currentToken = token || getAuthToken();
    if (!currentToken) {
      setAuthPromptMessage("Gönderileri beğenmek için lütfen giriş yapın.");
      return;
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              isLiked: !p.isLiked,
              likeCount: p.isLiked ? Math.max(0, p.likeCount - 1) : (p.likeCount || 0) + 1,
            }
          : p
      )
    );

    try {
      const res = await fetch(`${API_BASE_URL}/club/posts/${post.id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, isLiked: data.isLiked } : p))
        );
      }
    } catch (e) {}
  };

  const toggleCommentsView = (post: ClubPost, fromLightbox: boolean = false) => {
    const currentToken = token || getAuthToken();
    if (!currentToken) {
      setAuthPromptMessage("Yorumları görüntülemek ve yorum yapmak için lütfen giriş yapın.");
      return;
    }

    if (fromLightbox) {
      setLightboxPostId(null);
      setOpenCommentsPostId(post.id);
      fetchComments(post.id);
      setTimeout(() => handleScrollToPost(post.id), 150);
      return;
    }

    if (openCommentsPostId === post.id) {
      setOpenCommentsPostId(null);
    } else {
      setOpenCommentsPostId(post.id);
      fetchComments(post.id);
    }
  };

  const handleSharePost = async (post: ClubPost) => {
    const currentToken = token || getAuthToken();
    if (!currentToken) {
      setAuthPromptMessage("Gönderileri paylaşmak için lütfen giriş yapın.");
      return;
    }

    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/club?post=${post.id}`
        : `https://torquescout.com/club?post=${post.id}`;
    const shareTitle = post.title || "TorkScout Club Paylaşımı";
    const shareText = `${post.title ? post.title + " — " : ""}${post.content}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        showToast("Gönderi bağlantısı panoya kopyalandı!");
      }
    } catch (e) {}
  };

  // GARAGE UPLOAD & SHARE HANDLERS
  const handleSelectGarageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const remaining = 5 - garageFiles.length;
    if (remaining <= 0) {
      alert("Garajınıza en fazla 5 adet araç görseli ekleyebilirsiniz.");
      return;
    }

    const selected = Array.from(fileList).slice(0, remaining);
    const mapped = selected.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setGarageFiles((prev) => [...prev, ...mapped].slice(0, 5));
    e.target.value = "";
  };

  const handleRemoveGarageFile = (index: number) => {
    setGarageFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const uploadSingleFileToClub = async (file: File, authToken: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/club/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Görsel yüklenemedi.");
    }
    const data = await res.json();
    if (!data?.url) {
      throw new Error("Görsel bağlantısı alınamadı.");
    }
    return data.url;
  };

  const handleSubmitGarage = async () => {
    const currentToken = token || getAuthToken();
    if (!currentToken) {
      setAuthPromptMessage("Garajınıza araç eklemek ve Club'da paylaşmak için lütfen giriş yapın.");
      return;
    }

    if (garageFiles.length === 0) {
      alert("Lütfen aracınıza ait en az 1 görsel (en fazla 5 görsel) seçin.");
      return;
    }

    if (shareInClub && !garageCaption.trim() && !garageTitle.trim()) {
      alert("Club'da paylaşmak için lütfen aracınız hakkında kısa bir açıklama veya model başlığı yazın.");
      return;
    }

    setSubmittingGarage(true);
    try {
      const uploadedUrls: string[] = [];
      for (const item of garageFiles.slice(0, 5)) {
        const remoteUrl = await uploadSingleFileToClub(item.file, currentToken);
        uploadedUrls.push(remoteUrl);
      }

      const res = await fetch(`${API_BASE_URL}/club/garage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: garageTitle.trim() || undefined,
          content: garageCaption.trim(),
          mediaUrls: uploadedUrls,
          shareInClub,
        }),
      });

      if (res.ok) {
        garageFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
        setGarageFiles([]);
        setGarageTitle("");
        setGarageCaption("");
        await fetchMyGarage(currentToken);
        if (shareInClub) {
          showToast(
            'Aracınızın görselleri ve açıklaması yönetici onayına gönderildi! Onaylandığında "Tümü" akışında yayınlanacaktır.'
          );
        } else {
          showToast("Aracınızın görselleri Garajınıza kaydedildi.");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Gönderi kaydedilemedi.");
      }
    } catch (e: any) {
      alert(e?.message || "Görseller yüklenirken hata oluştu.");
    } finally {
      setSubmittingGarage(false);
    }
  };

  const handleShareSavedGarageItem = async (item: ClubPost) => {
    const currentToken = token || getAuthToken();
    if (!currentToken) return;

    setSharingPostId(item.id);
    try {
      const res = await fetch(`${API_BASE_URL}/club/garage/${item.id}/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: item.title || undefined,
          content: item.content || "",
        }),
      });

      if (res.ok) {
        await fetchMyGarage(currentToken);
        showToast(
          'Garajınızdaki araç paylaşımı yönetici onayına gönderildi. Onaylandığında "Tümü" sekmesinde yayınlanacaktır.'
        );
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Paylaşım onaya gönderilemedi.");
      }
    } catch (e) {
      alert("Bağlantı hatası oluştu.");
    } finally {
      setSharingPostId(null);
    }
  };

  const handleDeleteGarageItem = async (item: ClubPost) => {
    if (!confirm("Bu araç paylaşımını garajınızdan ve kulüp akışından kaldırmak istediğinize emin misiniz?")) {
      return;
    }
    const currentToken = token || getAuthToken();
    if (!currentToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/club/garage/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        await fetchMyGarage(currentToken);
        await fetchClubPosts(currentToken);
        showToast("Araç paylaşımı garajınızdan kaldırıldı.");
      }
    } catch (e) {
      alert("Silme işlemi başarısız oldu.");
    }
  };

  // ADMIN IN-PAGE CREATE POST & ACTIONS
  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const handleUpdatePollOption = (idx: number, val: string) => {
    const next = [...pollOptions];
    next[idx] = val;
    setPollOptions(next);
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handlePublishAdminPost = async () => {
    if (!postContent.trim()) {
      alert("Lütfen gönderi içeriğini yazın.");
      return;
    }
    if (hasPoll && (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2)) {
      alert("Lütfen anket sorusunu ve en az 2 seçeneği doldurun.");
      return;
    }

    const currentToken = token || getAuthToken();
    if (!currentToken) return;

    setSubmittingPost(true);
    try {
      const payload: any = {
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
        mediaUrls: postMediaUrl.trim() ? [postMediaUrl.trim()] : [],
        isPinned,
        commentsEnabled,
        publishImmediately: true,
      };

      if (hasPoll) {
        payload.poll = {
          question: pollQuestion.trim(),
          options: pollOptions.filter((o) => o.trim()),
          selectionType: "SINGLE",
        };
      }

      const res = await fetch(`${API_BASE_URL}/admin/club/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCreatePostModalOpen(false);
        setPostTitle("");
        setPostContent("");
        setPostMediaUrl("");
        setIsPinned(false);
        setCommentsEnabled(true);
        setHasPoll(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
        await fetchClubPosts(currentToken);
        await fetchPinnedPosts(currentToken);
        showToast("Club gönderiniz başarıyla yayınlandı!");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Gönderi yayınlanamadı.");
      }
    } catch (e) {
      alert("Bağlantı hatası oluştu.");
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleTogglePinPost = async (post: ClubPost) => {
    const currentToken = token || getAuthToken();
    if (!currentToken) return;
    setAdminMenuPostId(null);
    await fetch(`${API_BASE_URL}/admin/club/posts/${post.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isPinned: !post.isPinned }),
    });
    fetchClubPosts(currentToken);
    fetchPinnedPosts(currentToken);
  };

  const handleArchivePost = async (post: ClubPost) => {
    if (!confirm("Bu gönderiyi yayından kaldırmak istediğinize emin misiniz?")) return;
    const currentToken = token || getAuthToken();
    if (!currentToken) return;
    setAdminMenuPostId(null);
    await fetch(`${API_BASE_URL}/admin/club/posts/${post.id}/archive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    fetchClubPosts(currentToken);
    fetchPinnedPosts(currentToken);
  };

  // COMMENTS & REPLIES
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

  const handleScrollToComment = (commentId: string) => {
    const el = document.getElementById(`club-comment-${commentId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("club-comment-highlight");
      void el.offsetWidth;
      el.classList.add("club-comment-highlight");
      setTimeout(() => el.classList.remove("club-comment-highlight"), 2000);
    }
  };

  const handleScrollToPost = (postId: string) => {
    setSelectedCategory("ALL");
    setTimeout(() => {
      const el = document.getElementById(`club-post-${postId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("club-pinned-post-highlight");
        void el.offsetWidth;
        el.classList.add("club-pinned-post-highlight");
        setTimeout(() => el.classList.remove("club-pinned-post-highlight"), 2000);
      } else {
        router.push(`/club?post=${postId}`);
      }
    }, 50);
  };

  const handleAddComment = async (postId: string) => {
    const currentToken = token || getAuthToken();
    if (!currentToken) {
      setAuthPromptMessage("Yorum yapmak için lütfen giriş yapın.");
      return;
    }

    const content = commentInput[postId]?.trim();
    if (!content || commentSubmitting) return;

    const replyTarget = replyTargetMap[postId];

    setCommentSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/club/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
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
          prev.map((p) => (p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Yorum gönderilemedi.");
      }
    } catch (e) {
      alert("Bağlantı hatası.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleSendAdminDM = async () => {
    const currentToken = token || getAuthToken();
    if (!currentToken || !selectedUser || !dmText.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/users/${selectedUser.id}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ message: dmText.trim() }),
      });

      if (res.ok) {
        showToast(`Mesaj ${selectedUser.displayName} adlı kullanıcıya gönderildi.`);
        setDmModalOpen(false);
        setDmText("");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Mesaj gönderilemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  const handleMuteUser = async (targetUserId: string) => {
    const currentToken = token || getAuthToken();
    if (!currentToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/users/${targetUserId}/mute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ reason: "Topluluk kuralı ihlali", durationDays: 3 }),
      });
      if (res.ok) {
        alert("Kullanıcı 3 gün süreyle geçici susturuldu.");
        setSelectedUser(null);
      }
    } catch (e) {}
  };

  // Render Instagram-Style Media Carousel on Post Card
  const renderPostMediaCarousel = (post: ClubPost) => {
    const mediaList = Array.isArray(post.media) ? post.media : [];
    if (mediaList.length === 0) return null;

    const currentIdx = Math.min(activeMediaIndices[post.id] || 0, mediaList.length - 1);
    const activeMedia = mediaList[currentIdx];

    return (
      <div className="space-y-2.5 pt-1">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950 group">
          <div
            onClick={() => {
              setLightboxPostId(post.id);
              setLightboxMediaIndex(currentIdx);
            }}
            className="w-full h-72 sm:h-96 cursor-zoom-in overflow-hidden flex items-center justify-center bg-slate-950"
          >
            <img
              src={resolvePostMediaUrl(activeMedia.mediaUrl)}
              alt={post.title || "TorkScout Club Görseli"}
              className="w-full h-full object-cover group-hover:scale-[1.015] transition-transform duration-300"
            />
          </div>

          {mediaList.length > 1 && (
            <>
              {/* Counter Pill */}
              <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-white/15 text-white px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 pointer-events-none">
                <Images className="w-3.5 h-3.5 text-orange-400" />
                <span>
                  {currentIdx + 1}/{mediaList.length}
                </span>
              </div>

              {/* Left / Right Controls */}
              {currentIdx > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMediaIndices((prev) => ({
                      ...prev,
                      [post.id]: Math.max(0, currentIdx - 1),
                    }));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-orange-500 text-white border border-white/15 flex items-center justify-center transition cursor-pointer shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {currentIdx < mediaList.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMediaIndices((prev) => ({
                      ...prev,
                      [post.id]: Math.min(mediaList.length - 1, currentIdx + 1),
                    }));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-orange-500 text-white border border-white/15 flex items-center justify-center transition cursor-pointer shadow-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Dots Indicator */}
        {mediaList.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {mediaList.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveMediaIndices((prev) => ({ ...prev, [post.id]: idx }))}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentIdx ? "w-5 bg-orange-500" : "w-1.5 bg-slate-600 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

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

  const activeLightboxPost =
    posts.find((p) => p.id === lightboxPostId) ||
    garageItems.find((g) => g.id === lightboxPostId) ||
    null;

  const filteredPosts = posts.filter((p) => {
    if (selectedCategory === "POLLS") return !!p.poll;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Club Header Bar */}
        <div className="bg-slate-900/80 border border-white/10 px-6 py-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight">
                <span className="text-white">Tork</span>
                <span className="bg-gradient-to-r from-[#0052d4] via-[#00d2ff] to-[#10b981] bg-clip-text text-transparent">
                  Scout
                </span>{" "}
                <span className="text-white not-italic">Club</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Otomobil Tutkunları Topluluğu
            </p>
          </div>

          {!token && (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login?redirect=/club"
                className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register?redirect=/club"
                className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                Ücretsiz Kayıt Ol
              </Link>
            </div>
          )}
        </div>

        {/* Category Filter Tabs Row (Left: 🔥 Tümü & 📊 Anketler — Far Right: 🚗 Garajım) */}
        <div className="bg-slate-900/80 border border-white/10 px-4 py-3 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { key: "ALL", label: "🔥 Tümü" },
              { key: "POLLS", label: "📊 Anketler" },
            ].map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key as any)}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer border ${
                    isActive
                      ? "bg-orange-500/15 text-orange-400 border-orange-500 shadow-sm"
                      : "bg-slate-950/70 text-slate-400 border-white/10 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedCategory("GARAGE");
              if (token) {
                fetchMyGarage(token);
              }
            }}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer border ${
              selectedCategory === "GARAGE"
                ? "bg-orange-500/15 text-orange-400 border-orange-500 shadow-sm"
                : "bg-slate-950/70 text-slate-300 border-white/15 hover:border-orange-500/50 hover:text-white"
            }`}
          >
            🚗 Garajım
          </button>
        </div>

        {/* Action success toast */}
        {actionSuccess && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs p-4 rounded-2xl font-bold text-center">
            ✓ {actionSuccess}
          </div>
        )}

        {/* Main Content Layout (Left 2 Cols + Right Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Feed OR Garage */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCategory === "GARAGE" ? (
              <div className="space-y-6">
                {/* Anti-Listing Warning Card */}
                <div className="bg-red-950/40 border-2 border-red-500/40 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-black text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>Önemli Topluluk & Paylaşım Kuralı</span>
                  </div>
                  <p className="text-xs sm:text-sm text-red-200/90 leading-relaxed">
                    Yüklediğiniz araç görsellerini{" "}
                    <strong className="text-white font-black">satış ilanı olarak veya ilan gibi</strong>{" "}
                    (fiyat, telefon numarası, satılık ibaresi vb. ekleyerek) paylaşmak kesinlikle yasaktır. İlan
                    niteliği tespit edilen gönderiler yayınlanmaz ve bu durumun birkaç kez tespit edilmesi halinde
                    hesabınız <strong className="text-white font-black">TorkScout Club&apos;dan çıkarılır.</strong>
                  </p>
                </div>

                {!token ? (
                  <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-8 text-center space-y-4 shadow-xl">
                    <div className="w-14 h-14 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto text-orange-400">
                      <Car className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-black text-white">Kendi Garajınızı Oluşturun</h3>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                      Aracınızın en güzel fotoğraflarını (en fazla 5 adet) yüklemek ve TorkScout Club akışında
                      Instagram gönderisi gibi paylaşmak için lütfen giriş yapın.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Link
                        href="/login?redirect=/club"
                        className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-6 py-3 rounded-xl text-xs transition"
                      >
                        Giriş Yap
                      </Link>
                      <Link
                        href="/register?redirect=/club"
                        className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold px-6 py-3 rounded-xl text-xs transition"
                      >
                        Ücretsiz Üye Ol
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Garage Upload & Share Composer Card */}
                    <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 space-y-5 shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white">
                            Aracını Garajına Ekle & Paylaş
                          </h3>
                          <p className="text-xs text-slate-400">
                            En fazla 5 adet fotoğraf seçip açıklamanızla birlikte Club akışında paylaşabilirsiniz.
                          </p>
                        </div>
                      </div>

                      {/* Photo Picker Slots (Max 5) */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                            ARAÇ GÖRSELLERİ ({garageFiles.length}/5)
                          </label>
                          {garageFiles.length < 5 && (
                            <button
                              type="button"
                              onClick={() => garageFileInputRef.current?.click()}
                              className="text-xs font-extrabold text-orange-400 hover:text-orange-300 cursor-pointer"
                            >
                              + Fotoğraf Seç
                            </button>
                          )}
                        </div>

                        <input
                          ref={garageFileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleSelectGarageFiles}
                          className="hidden"
                        />

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {garageFiles.map((item, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-square rounded-2xl overflow-hidden border border-white/15 bg-slate-950"
                            >
                              <img
                                src={item.previewUrl}
                                alt={`Araç ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-2 left-2 bg-slate-950/80 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                                {idx + 1}/5
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveGarageFile(idx)}
                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer shadow"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          {garageFiles.length < 5 && (
                            <button
                              type="button"
                              onClick={() => garageFileInputRef.current?.click()}
                              className="aspect-square rounded-2xl border-2 border-dashed border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 flex flex-col items-center justify-center gap-1 text-orange-400 transition cursor-pointer"
                            >
                              <Images className="w-6 h-6" />
                              <span className="text-xs font-extrabold">Görsel Yükle</span>
                              <span className="text-[10px] text-slate-400">
                                {5 - garageFiles.length} hak kaldı
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Vehicle Title */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          ARAÇ / MODEL BAŞLIĞI (OPSİYONEL)
                        </label>
                        <input
                          type="text"
                          placeholder="Örn: 2021 BMW 320i M Sport / Hafta Sonu Kurulumu"
                          value={garageTitle}
                          onChange={(e) => setGarageTitle(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                        />
                      </div>

                      {/* Instagram Style Caption */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          GÖNDERİ AÇIKLAMASI *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Aracınızla ilgili hikayenizi, sürüş deneyiminizi veya yaptığınız dokunuşları paylaşın (İlan / fiyat bilgisi yazmayınız)..."
                          value={garageCaption}
                          onChange={(e) => setGarageCaption(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                        />
                      </div>

                      {/* Club'da Paylaş Toggle */}
                      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-white/10">
                        <div>
                          <span className="text-xs sm:text-sm font-extrabold text-white block">
                            Club&apos;da Paylaş 🌍
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Açık olduğunda gönderiniz yönetici onayından sonra &quot;Tümü&quot; sekmesi altında Instagram gönderisi gibi tüm kulüp üyeleriyle paylaşılır.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShareInClub(!shareInClub)}
                          className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${
                            shareInClub ? "bg-orange-500" : "bg-slate-600"
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                              shareInClub ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="button"
                        disabled={submittingGarage}
                        onClick={handleSubmitGarage}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3.5 px-6 rounded-2xl text-xs sm:text-sm shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {submittingGarage ? (
                          <span>Yükleniyor...</span>
                        ) : (
                          <>
                            {shareInClub ? <Send className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                            <span>
                              {shareInClub ? "Garaja Ekle & Club'da Paylaş" : "Sadece Garajıma Kaydet"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* User's Saved Garage & Submissions List */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-white px-1">
                        Garajım & Paylaşımlarım ({garageItems.length})
                      </h3>

                      {loadingGarage ? (
                        <div className="bg-slate-900/60 border border-white/10 p-8 rounded-3xl text-center text-xs text-slate-400">
                          Garajınız yükleniyor...
                        </div>
                      ) : garageItems.length === 0 ? (
                        <div className="bg-slate-900/60 border border-white/10 p-10 rounded-3xl text-center space-y-2">
                          <Car className="w-10 h-10 text-slate-500 mx-auto" />
                          <h4 className="text-sm font-bold text-slate-300">
                            Garajınızda henüz araç görseli yok
                          </h4>
                          <p className="text-xs text-slate-500">
                            Yukarıdaki alandan aracınızın fotoğraflarını yükleyip TorkScout Club&apos;da paylaşabilirsiniz.
                          </p>
                        </div>
                      ) : (
                        garageItems.map((item) => {
                          const isPublished = item.status === "PUBLISHED";
                          const isPending = item.status === "PENDING_REVIEW";
                          const isRejected = item.status === "REJECTED";

                          return (
                            <article
                              key={item.id}
                              className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl"
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`px-3 py-1 rounded-full text-[11px] font-black border ${
                                    isPublished
                                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                      : isPending
                                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                      : isRejected
                                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                      : "bg-slate-800 text-slate-300 border-white/10"
                                  }`}
                                >
                                  {isPublished
                                    ? "✅ CLUB'DA YAYINDA"
                                    : isPending
                                    ? "⏳ YÖNETİCİ ONAYI BEKLİYOR"
                                    : isRejected
                                    ? "❌ REDDEDİLDİ"
                                    : "🔒 SADECE GARAJIMDA"}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteGarageItem(item)}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                  title="Garajdan Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {item.title && <h4 className="text-base font-black text-white">{item.title}</h4>}
                              {item.content && (
                                <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                                  {item.content}
                                </p>
                              )}

                              {item.rejectionReason && (
                                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                                  <strong className="block text-rose-400 mb-0.5">Reddedilme Gerekçesi:</strong>
                                  {item.rejectionReason}
                                </div>
                              )}

                              {renderPostMediaCarousel(item)}

                              {!isPublished && !isPending && (
                                <button
                                  type="button"
                                  disabled={sharingPostId === item.id}
                                  onClick={() => handleShareSavedGarageItem(item)}
                                  className="w-full py-2.5 px-4 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>
                                    {sharingPostId === item.id
                                      ? "Gönderiliyor..."
                                      : "Club'da Paylaş (Onaya Gönder)"}
                                  </span>
                                </button>
                              )}
                            </article>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Admin Management Hero Card (Matching Mobile) */}
                {isAdmin && (
                  <div className="bg-white rounded-3xl border-2 border-orange-200 p-5 sm:p-6 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-[#ea580c]">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-slate-900">Club Yönetim Paneli</h3>
                            <span className="bg-[#ea580c] text-white text-[10px] font-black px-2 py-0.5 rounded">
                              YÖNETİCİ
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Duyuru, anket ve içerik yayınlama yetkisine sahipsiniz.
                          </p>
                        </div>
                      </div>

                      <Link
                        href="/admin/club/posts"
                        className="text-xs font-extrabold text-[#ea580c] hover:underline"
                      >
                        Detaylı Moderasyon Paneli →
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCreatePostModalOpen(true)}
                      className="w-full bg-[#ea580c] hover:bg-orange-600 text-white font-extrabold py-3.5 px-5 rounded-2xl text-xs sm:text-sm shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Yeni Gönderi & Duyuru Paylaş</span>
                    </button>
                  </div>
                )}

                {/* Scout RGB Welcome Banner */}
                <ScoutRgbWelcomeBanner />

                {/* Feed Posts List */}
                {loading ? (
                  <div className="bg-slate-900/60 border border-white/10 p-12 rounded-3xl text-center animate-pulse space-y-3">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400">Kulüp akışı yükleniyor...</p>
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="bg-slate-900/60 border border-white/10 p-12 rounded-3xl text-center space-y-2">
                    <span className="text-4xl block">📭</span>
                    <h3 className="text-sm font-bold text-slate-300">
                      Bu kategoride henüz paylaşım yok
                    </h3>
                    <p className="text-xs text-slate-500">
                      Farklı bir kategori seçebilir veya ilk yorumu yapabilirsiniz.
                    </p>
                  </div>
                ) : (
                  filteredPosts.map((post) => {
                    const isOpenComments = openCommentsPostId === post.id;
                    const comments = commentsMap[post.id] || [];
                    const replyTarget = replyTargetMap[post.id];
                    const isPostAdmin =
                      post.author?.role === "ADMIN" || post.author?.role === "SUPER_ADMIN";

                    return (
                      <article
                        id={`club-post-${post.id}`}
                        key={post.id}
                        className="club-post-card bg-slate-900/90 border border-white/10 rounded-3xl p-6 md:p-7 space-y-4 shadow-xl hover:border-orange-500/20 transition"
                      >
                        {/* Top Bar: Pinned / User Submission Badge & Admin Menu */}
                        {(post.isPinned || post.isUserSubmission || isAdmin) && (
                          <div className="flex items-center justify-between">
                            <div>
                              {post.isPinned ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md font-black uppercase tracking-wider">
                                  <Pin className="w-3 h-3 text-orange-400" /> SABİTLENMİŞ DUYURU
                                </span>
                              ) : post.isUserSubmission ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-md font-black uppercase tracking-wider">
                                  <Car className="w-3.5 h-3.5 text-sky-400" /> ÜYE GARAJI PAYLAŞIMI
                                </span>
                              ) : null}
                            </div>

                            {isAdmin && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAdminMenuPostId(adminMenuPostId === post.id ? null : post.id)
                                  }
                                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                {adminMenuPostId === post.id && (
                                  <div className="absolute right-0 mt-1 w-48 rounded-2xl bg-slate-950 border border-white/15 shadow-2xl py-1.5 z-20 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePinPost(post)}
                                      className="w-full text-left px-4 py-2 hover:bg-white/5 text-slate-200 font-bold cursor-pointer"
                                    >
                                      {post.isPinned ? "Sabitlemeyi Kaldır" : "Duyuruyu Sabitle 📌"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleArchivePost(post)}
                                      className="w-full text-left px-4 py-2 hover:bg-rose-500/10 text-rose-400 font-bold cursor-pointer"
                                    >
                                      Gönderiyi Kaldır / Arşivle 🗑️
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Post Author Bar */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-600/30 border border-orange-500/40 flex items-center justify-center font-black text-orange-400 text-sm overflow-hidden">
                              {post.author?.profilePhotoUrl ? (
                                <img
                                  src={resolvePostMediaUrl(post.author.profilePhotoUrl)}
                                  alt="Author"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (
                                  post.author?.firstName?.[0] ||
                                  post.author?.username?.[0] ||
                                  "T"
                                ).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white">
                                  {post.author?.firstName
                                    ? `${post.author.firstName} ${post.author.lastName || ""}`.trim()
                                    : post.author?.username || "TorqueScout Üyesi"}
                                </span>
                                {isPostAdmin ? (
                                  <span className="text-[9px] bg-[#ea580c] text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                    YÖNETİCİ
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-slate-800 text-slate-300 border border-white/10 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                                    CLUB ÜYESİ
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {new Date(post.publishedAt || post.createdAt || Date.now()).toLocaleDateString(
                                  "tr-TR",
                                  {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="space-y-2.5">
                          {post.title && <h3 className="text-lg font-black text-white">{post.title}</h3>}
                          {post.content && (
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                              {post.content}
                            </p>
                          )}
                        </div>

                        {/* Post Media Carousel (Click to open Fullscreen Lightbox Banner) */}
                        {renderPostMediaCarousel(post)}

                        {/* Optional Poll Widget */}
                        {post.poll && (
                          <PollCard
                            poll={post.poll}
                            onRequireAuth={(msg) => setAuthPromptMessage(msg)}
                          />
                        )}

                        {/* Post Actions Bar (Like, Comment, Share) */}
                        <div className="flex items-center gap-2.5 border-t border-white/5 pt-4 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleLike(post)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition cursor-pointer font-bold ${
                              post.isLiked
                                ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                : "bg-slate-800/60 border-white/5 text-slate-300 hover:text-white"
                            }`}
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                post.isLiked ? "fill-rose-500 text-rose-500" : ""
                              }`}
                            />
                            <span>{post.likeCount || 0} Beğeni</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleCommentsView(post)}
                            className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl transition cursor-pointer font-bold"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.commentCount || 0} Yorum</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSharePost(post)}
                            className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl transition cursor-pointer font-bold"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Paylaş</span>
                          </button>
                        </div>

                        {/* Expanded Comments Section */}
                        {isOpenComments && (
                          <div className="pt-4 border-t border-white/10 space-y-4">
                            {replyTarget && (
                              <div className="bg-orange-500/10 border border-orange-500/30 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs text-orange-400 font-bold">
                                <span>↩ {replyTarget.displayName} adlı kullanıcıya yanıt veriyorsunuz</span>
                                <button
                                  type="button"
                                  onClick={() => handleCancelReply(post.id)}
                                  className="text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
                                >
                                  İptal ×
                                </button>
                              </div>
                            )}

                            {post.commentsEnabled ? (
                              <div className="flex gap-2">
                                <input
                                  id={`comment-input-${post.id}`}
                                  type="text"
                                  placeholder={
                                    replyTarget
                                      ? `${replyTarget.displayName}’e yanıtınızı yazın...`
                                      : "Fikrinizi veya tecrübenizi paylaşın... (Max 1000 karakter)"
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
                                  type="button"
                                  onClick={() => handleAddComment(post.id)}
                                  disabled={commentSubmitting || !commentInput[post.id]?.trim()}
                                  className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shrink-0"
                                >
                                  {replyTarget ? "Yanıtla" : "Gönder"}
                                </button>
                              </div>
                            ) : (
                              <div className="text-center text-xs text-slate-500 italic py-2 bg-slate-950/60 rounded-xl">
                                🔒 Bu gönderi için yorumlar kapatılmıştır.
                              </div>
                            )}

                            <div className="space-y-4">
                              {(() => {
                                const { parentComments, repliesMap } = groupCommentsByThread(comments);
                                if (comments.length === 0) {
                                  return (
                                    <p className="text-xs text-slate-500 text-center py-3">
                                      İlk yorumu siz yazın!
                                    </p>
                                  );
                                }

                                return parentComments.map((parent) => {
                                  const parentReplies = repliesMap[parent.id] || [];

                                  return (
                                    <div
                                      id={`club-comment-${parent.id}`}
                                      key={parent.id}
                                      className="club-comment-card bg-slate-950/70 border border-white/5 p-4 rounded-2xl space-y-3 text-xs transition-all"
                                    >
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

                                        <p className="text-slate-300 leading-normal pl-8 text-xs sm:text-sm">
                                          {parent.content}
                                        </p>

                                        <div className="pl-8 pt-0.5">
                                          <button
                                            type="button"
                                            onClick={() => handleStartReply(post.id, parent)}
                                            className="text-[11px] text-slate-400 hover:text-orange-400 font-bold flex items-center gap-1 transition cursor-pointer"
                                          >
                                            <span>↩</span>
                                            <span>Yanıtla</span>
                                          </button>
                                        </div>
                                      </div>

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

                                              <p className="text-slate-300 leading-normal pl-7 text-xs">
                                                {r.content}
                                              </p>

                                              <div className="pl-7 pt-0.5">
                                                <button
                                                  type="button"
                                                  onClick={() => handleStartReply(post.id, r)}
                                                  className="text-[10px] text-slate-400 hover:text-orange-400 font-bold flex items-center gap-1 transition cursor-pointer"
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
              </>
            )}
          </div>

          {/* Right Column: Pinned Posts, Community Rules, Support */}
          <div className="space-y-6">
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

            <div className="bg-slate-900/90 border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>📜</span> Topluluk Kuralları
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">1.</span> Saygılı ve yapıcı bir dil kullanın.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">2.</span> Garajım sekmesinden satış ilanı veya ilan formatında paylaşım yapmayın.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">3.</span> Kişisel verileri ve telefon numaralarını açıkça paylaşmayın.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">4.</span> Gönderi konusuyla ilgili yorum yapın.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">5.</span> Admin ve moderatör kararlarına uyun.
                </li>
              </ul>
            </div>

            <div className="bg-slate-900/90 border border-white/10 p-5 rounded-3xl space-y-3 shadow-xl text-center">
              <span className="text-2xl block">💬</span>
              <h4 className="text-xs font-bold text-white">Sorun mu yaşıyorsunuz?</h4>
              <p className="text-[11px] text-slate-400">
                Görüş, öneri veya şikâyetlerinizi destek ekibimize iletebilirsiniz.
              </p>
              <Link
                href="/dashboard/support/feedback"
                className="inline-block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs border border-white/10 transition"
              >
                Destek Merkezi’ne Git
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN PHOTO LIGHTBOX BANNER MODAL WITH ACTIVE LIKE / COMMENT / SHARE BAR */}
      {activeLightboxPost && (
        <div
          onClick={() => setLightboxPostId(null)}
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 sm:p-6"
        >
          {/* Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4 pb-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-600/30 border border-orange-500/40 flex items-center justify-center font-black text-orange-400 text-sm overflow-hidden">
                {activeLightboxPost.author?.profilePhotoUrl ? (
                  <img
                    src={resolvePostMediaUrl(activeLightboxPost.author.profilePhotoUrl)}
                    alt="Author"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (
                    activeLightboxPost.author?.firstName?.[0] ||
                    activeLightboxPost.author?.username?.[0] ||
                    "T"
                  ).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  {activeLightboxPost.author?.firstName
                    ? `${activeLightboxPost.author.firstName} ${activeLightboxPost.author.lastName || ""}`.trim()
                    : activeLightboxPost.author?.username || "TorqueScout Üyesi"}
                </h4>
                <span className="text-xs text-slate-400">
                  {new Date(
                    activeLightboxPost.publishedAt || activeLightboxPost.createdAt || Date.now()
                  ).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeLightboxPost.media && activeLightboxPost.media.length > 1 && (
                <span className="bg-slate-900 border border-white/15 text-white px-3 py-1 rounded-full text-xs font-extrabold">
                  {lightboxMediaIndex + 1}/{activeLightboxPost.media.length}
                </span>
              )}
              <button
                type="button"
                onClick={() => setLightboxPostId(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Image Stage */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 my-2">
            {activeLightboxPost.media?.[lightboxMediaIndex]?.mediaUrl && (
              <img
                onClick={(e) => e.stopPropagation()}
                src={resolvePostMediaUrl(activeLightboxPost.media[lightboxMediaIndex].mediaUrl)}
                alt={activeLightboxPost.title || "Post Görseli"}
                className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />
            )}

            {activeLightboxPost.media && activeLightboxPost.media.length > 1 && (
              <>
                {lightboxMediaIndex > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxMediaIndex((prev) => Math.max(0, prev - 1));
                    }}
                    className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 hover:bg-orange-500 text-white border border-white/15 flex items-center justify-center transition cursor-pointer shadow-xl"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                {lightboxMediaIndex < activeLightboxPost.media.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxMediaIndex((prev) =>
                        Math.min(activeLightboxPost.media.length - 1, prev + 1)
                      );
                    }}
                    className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 hover:bg-orange-500 text-white border border-white/15 flex items-center justify-center transition cursor-pointer shadow-xl"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Bottom Caption & Active Like / Comment / Share Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full mx-auto bg-slate-900/95 border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xl"
          >
            {activeLightboxPost.title && (
              <h3 className="text-base font-black text-white">{activeLightboxPost.title}</h3>
            )}
            {activeLightboxPost.content && (
              <p className="text-xs sm:text-sm text-slate-300 line-clamp-3">
                {activeLightboxPost.content}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleToggleLike(activeLightboxPost)}
                className={`py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                  activeLightboxPost.isLiked
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                    : "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    activeLightboxPost.isLiked ? "fill-rose-500 text-rose-500" : ""
                  }`}
                />
                <span>{activeLightboxPost.likeCount || 0} Beğeni</span>
              </button>

              <button
                type="button"
                onClick={() => toggleCommentsView(activeLightboxPost, true)}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{activeLightboxPost.commentCount || 0} Yorum</span>
              </button>

              <button
                type="button"
                onClick={() => handleSharePost(activeLightboxPost)}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Paylaş</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GUEST AUTH PROMPT MODAL */}
      {authPromptMessage && (
        <div
          onClick={() => setAuthPromptMessage(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-orange-500/30 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto text-orange-400 text-xl">
              🔒
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white">Giriş Yapın</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{authPromptMessage}</p>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setAuthPromptMessage(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Vazgeç
              </button>
              <Link
                href="/login?redirect=/club"
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs"
              >
                Giriş Yap
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN CREATE POST & ANNOUNCEMENT MODAL (Matching Mobile) */}
      {createPostModalOpen && (
        <div
          onClick={() => setCreatePostModalOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">📢</span>
                <h3 className="text-base font-black text-slate-900">
                  Club Gönderisi & Duyuru Yayınla
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreatePostModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  BAŞLIK (OPSİYONEL)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Yeni Topluluk Güncellemesi ve Etkinlikler"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  GÖNDERİ İÇERİĞİ *
                </label>
                <textarea
                  rows={4}
                  placeholder="Kulüp üyeleriyle paylaşmak istediğiniz duyuru, haber veya analiz içeriğini buraya yazın..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  GÖRSEL URL (OPSİYONEL)
                </label>
                <input
                  type="text"
                  placeholder="https://... görsel bağlantısı"
                  value={postMediaUrl}
                  onChange={(e) => setPostMediaUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500"
                />
              </div>

              {/* Switches */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <span className="font-extrabold text-slate-900 block">
                    Sabitlenmiş Duyuru Yap 📌
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Akışın en üstünde sabitlenmiş rozetle görünür.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
                    isPinned ? "bg-[#ea580c]" : "bg-[#cbd5e1]"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      isPinned ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <span className="font-extrabold text-slate-900 block">Yorumlara İzin Ver 💬</span>
                  <span className="text-[11px] text-slate-500">
                    Kullanıcılar bu gönderiye yorum yazabilir.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCommentsEnabled(!commentsEnabled)}
                  className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
                    commentsEnabled ? "bg-[#ea580c]" : "bg-[#cbd5e1]"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      commentsEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <span className="font-extrabold text-slate-900 block">Anket Ekle 📊</span>
                  <span className="text-[11px] text-slate-500">
                    Gönderiye interaktif oylama anketi bağlayın.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHasPoll(!hasPoll)}
                  className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
                    hasPoll ? "bg-[#ea580c]" : "bg-[#cbd5e1]"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      hasPoll ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {hasPoll && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-black text-slate-900">Anket Detayları</h4>
                  <input
                    type="text"
                    placeholder="Anket sorusu (Örn: Bir sonraki inceleme hangi segment olsun?)"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 outline-none"
                  />
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
                      SEÇENEKLER
                    </span>
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Seçenek ${idx + 1}`}
                          value={opt}
                          onChange={(e) => handleUpdatePollOption(idx, e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 outline-none"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePollOption(idx)}
                            className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 6 && (
                      <button
                        type="button"
                        onClick={handleAddPollOption}
                        className="w-full py-2 rounded-xl bg-orange-50 border border-orange-200 text-[#ea580c] font-extrabold cursor-pointer"
                      >
                        + Seçenek Ekle
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={submittingPost}
                onClick={handlePublishAdminPost}
                className="w-full bg-[#ea580c] hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{submittingPost ? "Yayınlanıyor..." : "Gönderiyi Hemen Yayınla"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Popover Action Modal */}
      {selectedUser && (
        <div
          onClick={() => setSelectedUser(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Kullanıcı Bilgileri</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
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
                <span className="font-bold text-orange-400">
                  {selectedUser.packageBadge?.label || "Tanışma"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rol:</span>
                <span className="font-bold text-blue-400">{selectedUser.clubRole}</span>
              </div>
            </div>

            {isAdmin && (
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
        <div
          onClick={() => setDmModalOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-orange-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
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
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={handleSendAdminDM}
                disabled={!dmText.trim()}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl cursor-pointer"
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
