"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface AdminStats {
  totalPosts: number;
  totalComments: number;
  activeModerators: number;
  activeMutes: number;
  activeBans: number;
}

export default function AdminClubPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // New Post Form State
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postSuccess, setPostSuccess] = useState<string | null>(null);

  // Moderator Assignment State
  const [targetUserId, setTargetUserId] = useState("");
  const [modSuccess, setModSuccess] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    if (!savedToken) {
      router.push("/login?redirect=/admin/club");
      return;
    }
    setToken(savedToken);
    fetchStats(savedToken);
  }, []);

  const fetchStats = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/club/stats`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (mediaUrls.length >= 10) {
      alert("Gönderi başına en fazla 10 fotoğraf yüklenebilir.");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/admin/club/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setMediaUrls((prev) => [...prev, data.url]);
        }
      } else {
        const err = await res.json();
        alert(err.message || "Fotoğraf yüklenemedi.");
      }
    } catch (err) {
      alert("Fotoğraf yükleme sırasında bir hata oluştu.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddMediaUrl = () => {
    const url = mediaUrlInput.trim();
    if (!url) return;
    if (mediaUrls.length >= 10) {
      alert("Gönderi başına en fazla 10 fotoğraf yüklenebilir.");
      return;
    }
    setMediaUrls((prev) => [...prev, url]);
    setMediaUrlInput("");
  };

  const handleRemoveMediaUrl = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!token || !postContent.trim() || submittingPost) return;

    setSubmittingPost(true);
    try {
      const res = await fetch(`${API_URL}/admin/club/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: postTitle.trim() || undefined,
          content: postContent.trim(),
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          isPinned,
          commentsEnabled,
        }),
      });

      if (res.ok) {
        setPostSuccess("Yeni Club gönderisi başarıyla yayınlandı!");
        setPostTitle("");
        setPostContent("");
        setMediaUrls([]);
        setIsPinned(false);
        fetchStats(token);
        setTimeout(() => setPostSuccess(null), 4000);
      } else {
        const err = await res.json().catch(() => ({ message: "Gönderi kaydedilemedi." }));
        alert(err.message || "Gönderi yayınlanamadı.");
      }
    } catch (e) {
      alert("Bağlantı hatası.");
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleAssignModerator = async () => {
    if (!token || !targetUserId.trim()) return;

    try {
      const res = await fetch(`${API_URL}/admin/club/moderators/${targetUserId.trim()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setModSuccess("Kullanıcıya başarıyla Moderatör rolü verildi.");
        setTargetUserId("");
        fetchStats(token);
        setTimeout(() => setModSuccess(null), 4000);
      } else {
        const err = await res.json();
        alert(err.message || "Moderatör atanamadı.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="bg-slate-900/80 border border-white/10 p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚙️</span>
              <h1 className="text-xl font-black text-white">Tork Scout Club — Yönetim Paneli</h1>
            </div>
            <p className="text-xs text-slate-400">
              Gönderi oluşturma, moderatör atama, yasak ve topluluk istatistiklerini buradan yönetin.
            </p>
          </div>
          <Link
            href="/club"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs border border-white/10 transition shrink-0"
          >
            ← Club Akışına Dön
          </Link>
        </div>

        {/* Dashboard Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Gönderi</span>
              <p className="text-2xl font-black text-white">{stats.totalPosts}</p>
            </div>
            <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Yorum</span>
              <p className="text-2xl font-black text-orange-400">{stats.totalComments}</p>
            </div>
            <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aktif Moderatör</span>
              <p className="text-2xl font-black text-blue-400">{stats.activeModerators}</p>
            </div>
            <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geçici Susturulan</span>
              <p className="text-2xl font-black text-amber-400">{stats.activeMutes}</p>
            </div>
            <div className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Yasaklı Kullanıcı</span>
              <p className="text-2xl font-black text-red-400">{stats.activeBans}</p>
            </div>
          </div>
        )}

        {/* Form Grid: Post Creator + Moderator Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Post Creator (Left 2 cols) */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-white/10 p-6 md:p-8 rounded-3xl space-y-6 shadow-xl">
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <span>✍️</span> Yeni Ana Gönderi Oluştur
            </h2>

            {postSuccess && (
              <div className="bg-green-500/20 border border-green-500/30 text-green-300 text-xs p-3.5 rounded-xl font-bold">
                ✓ {postSuccess}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Gönderi Başlığı (İsteğe Bağlı)</label>
                <input
                  type="text"
                  placeholder="Örn: TorqueScout v5.5 Güncellemesi Yayınlandı!"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Gönderi İçeriği (Zorunlu)</label>
                <textarea
                  rows={6}
                  placeholder="Duyuru veya içerik detaylarını yazın..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500/50 leading-relaxed"
                />
              </div>

              {/* Photo Upload File Picker & Input */}
              <div className="space-y-3">
                <label className="font-bold text-slate-300 block">Fotoğraf Ekle (Maks 10 Fotoğraf)</label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage || mediaUrls.length >= 10}
                    className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <span>📷</span>
                    <span>{uploadingImage ? "Fotoğraf Yükleniyor..." : "Cihazımdan Fotoğraf Seç / Yükle"}</span>
                  </button>
                </div>

                {/* Optional URL Add */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Veya harici Görsel URL yapıştırın..."
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddMediaUrl}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs border border-white/10 cursor-pointer"
                  >
                    Ekle
                  </button>
                </div>

                {/* Uploaded Photos Preview List */}
                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {mediaUrls.map((url, idx) => (
                      <div key={idx} className="relative group bg-slate-950 border border-white/10 rounded-xl overflow-hidden h-24">
                        <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveMediaUrl(idx)}
                          className="absolute top-1 right-1 bg-red-600/90 text-white w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shadow hover:bg-red-500 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Post Toggles */}
              <div className="flex flex-wrap gap-6 pt-2 border-t border-white/10">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                  />
                  <span>Gönderiyi Üste Sabitle 📌</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={commentsEnabled}
                    onChange={(e) => setCommentsEnabled(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                  />
                  <span>Yorum Yapmaya İzin Ver 💬</span>
                </label>
              </div>

              <button
                onClick={handleCreatePost}
                disabled={submittingPost || !postContent.trim()}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-3.5 rounded-2xl shadow-xl transition text-xs cursor-pointer"
              >
                {submittingPost ? "Yayınlanıyor..." : "Gönderiyi Yayınla"}
              </button>
            </div>
          </div>

          {/* Moderator Assignment Card */}
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl text-xs">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>🛡️</span> Moderatör Atama
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Kullanıcı ID'si girerek seçtiğiniz üyeye yorum düzenini yönetmesi için Moderatör rolü verebilirsiniz.
              </p>

              {modSuccess && (
                <div className="bg-green-500/20 border border-green-500/30 text-green-300 text-[11px] p-2.5 rounded-xl font-bold">
                  ✓ {modSuccess}
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Kullanıcı ID girin..."
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                />
                <button
                  onClick={handleAssignModerator}
                  disabled={!targetUserId.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Moderatör Rolü Ver
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
