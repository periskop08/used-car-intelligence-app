"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PollCreationFields, { PollFormData } from "../../components/PollCreationFields";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function NewClubPostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pollData, setPollData] = useState<PollFormData>({
    enabled: false,
    question: "",
    options: ["", ""],
    selectionType: "SINGLE",
    maxSelections: 1,
    resultVisibility: "AFTER_VOTE",
    durationType: "UNLIMITED",
    customEndsAt: "",
    notifyParticipantsOnClose: false,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const token = localStorage.getItem("accessToken");
    if (!file || !token) return;

    if (mediaUrls.length >= 10) {
      alert("Gönderi başına en fazla 10 fotoğraf yüklenebilir.");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/admin/club/media/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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

  const handleRemoveImage = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (publish: boolean) => {
    const hasContent = !!postContent.trim();
    const hasTitle = !!postTitle.trim();
    const hasMedia = mediaUrls.length > 0;
    const hasPoll = pollData.enabled && !!pollData.question.trim();

    if (!hasContent && !hasTitle && !hasMedia && !hasPoll) {
      alert("Lütfen gönderi başlığı, metni, fotoğraf veya anket alanlarından en az birini doldurun.");
      return;
    }

    if (pollData.enabled) {
      if (!pollData.question.trim()) {
        alert("Lütfen anket sorusunu girin.");
        return;
      }
      const validOpts = pollData.options.map((o) => o.trim()).filter(Boolean);
      if (validOpts.length < 2) {
        alert("Anket için en az 2 geçerli seçenek girmelisiniz.");
        return;
      }
    }

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setSubmitting(true);
    try {
      let pollPayload = undefined;
      if (pollData.enabled) {
        const validOpts = pollData.options.map((o) => o.trim()).filter(Boolean);

        let calculatedEndsAt: string | undefined = undefined;
        if (pollData.durationType === "CUSTOM") {
          calculatedEndsAt = pollData.customEndsAt || undefined;
        } else if (pollData.durationType !== "UNLIMITED") {
          const now = new Date();
          switch (pollData.durationType) {
            case "1H":
              now.setHours(now.getHours() + 1);
              break;
            case "6H":
              now.setHours(now.getHours() + 6);
              break;
            case "12H":
              now.setHours(now.getHours() + 12);
              break;
            case "1D":
              now.setDate(now.getDate() + 1);
              break;
            case "3D":
              now.setDate(now.getDate() + 3);
              break;
            case "7D":
              now.setDate(now.getDate() + 7);
              break;
          }
          calculatedEndsAt = now.toISOString();
        }

        pollPayload = {
          question: pollData.question.trim(),
          options: validOpts,
          selectionType: pollData.selectionType,
          maxSelections: pollData.selectionType === "MULTIPLE" ? pollData.maxSelections : 1,
          resultVisibility: pollData.resultVisibility,
          endsAt: calculatedEndsAt,
          notifyParticipantsOnClose: pollData.notifyParticipantsOnClose,
        };
      }

      const res = await fetch(`${API_URL}/api/admin/club/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: postTitle.trim() || undefined,
          content: postContent.trim(),
          mediaUrls,
          isPinned,
          commentsEnabled,
          poll: pollPayload,
        }),
      });

      if (res.ok) {
        const post = await res.json();
        if (publish && post.status !== "PUBLISHED") {
          await fetch(`${API_URL}/api/admin/club/posts/${post.id}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        alert(publish ? "Gönderi başarıyla yayınlandı!" : "Taslak kaydedildi!");
        router.push("/admin/club/posts");
      } else {
        const err = await res.json();
        alert(err.message || "Gönderi kaydedilemedi.");
      }
    } catch (e) {
      alert("Gönderi kaydı sırasında hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Yeni Ana Gönderi Oluştur</h2>
          <p className="text-xs text-slate-400">
            Tork Scout Club üyelerine duyuru, rehber, içerik veya anket paylaşın.
          </p>
        </div>
        <Link
          href="/admin/club/posts"
          className="text-xs font-bold text-slate-400 hover:text-white transition"
        >
          ✖️ İptal Et
        </Link>
      </div>

      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/80 space-y-6">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">Gönderi Başlığı (Opsiyonel):</label>
          <input
            type="text"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            placeholder="Örn: 2026 İkinci El Araç Piyasasında Önemli Değişiklikler"
            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">Gönderi İçeriği (Opsiyonel):</label>
          <textarea
            rows={6}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Gönderi metnini yazın (Sadece anket yayınlayacaksanız boş bırakabilirsiniz)..."
            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition resize-y"
          />
        </div>

        {/* Media Upload Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-300">Fotoğraf Yükle (Max 10):</label>
            <span className="text-xs font-mono text-slate-400">{mediaUrls.length}/10 Fotoğraf</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
            {mediaUrls.map((url, idx) => (
              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group">
                <img src={url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white text-[10px] opacity-0 group-hover:opacity-100 transition"
                >
                  ✖️
                </button>
              </div>
            ))}

            {mediaUrls.length < 10 && (
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video rounded-xl border border-dashed border-white/20 hover:border-orange-500/50 bg-slate-950 flex flex-col items-center justify-center text-slate-400 hover:text-orange-400 transition"
              >
                <span className="text-xl">📷</span>
                <span className="text-[10px] font-bold mt-1">
                  {uploadingImage ? "Yükleniyor..." : "+ Görsel Ekle"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Poll Fields Component */}
        <PollCreationFields value={pollData} onChange={setPollData} />

        {/* Options Row */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-white/20 bg-slate-950 text-orange-500 focus:ring-orange-500"
              />
              📌 Ana Akışın Üstüne Sabitle
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={commentsEnabled}
                onChange={(e) => setCommentsEnabled(e.target.checked)}
                className="rounded border-white/20 bg-slate-950 text-orange-500 focus:ring-orange-500"
              />
              💬 Yorumlara Açık Olsun
            </label>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-white/10 font-bold text-xs text-slate-300 hover:text-white transition"
            >
              Taslak Kaydet
            </button>
            <button
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs shadow-lg shadow-orange-500/20 transition"
            >
              {submitting ? "Yayınlanıyor..." : "Hemen Yayınla 🚀"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
