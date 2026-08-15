'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Pin, MessageSquare, Image, Upload, Trash2, CheckCircle2, ArrowLeft, X } from 'lucide-react';
import PollCreationFields, { PollFormData } from '../../components/PollCreationFields';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function NewClubPostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [pollData, setPollData] = useState<PollFormData>({
    enabled: false,
    question: '',
    options: ['', ''],
    selectionType: 'SINGLE',
    maxSelections: 1,
    resultVisibility: 'AFTER_VOTE',
    durationType: 'UNLIMITED',
    customEndsAt: '',
    notifyParticipantsOnClose: false,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!file || !token) return;

    if (mediaUrls.length >= 10) {
      alert('Gönderi başına en fazla 10 fotoğraf yüklenebilir.');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/admin/club/media/upload`, {
        method: 'POST',
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
        alert(err.message || 'Fotoğraf yüklenemedi.');
      }
    } catch (err) {
      alert('Fotoğraf yükleme sırasında bir hata oluştu.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      alert('Lütfen gönderi başlığı, metni, fotoğraf veya anket alanlarından en az birini doldurun.');
      return;
    }

    if (pollData.enabled) {
      if (!pollData.question.trim()) {
        alert('Lütfen anket sorusunu girin.');
        return;
      }
      const validOpts = pollData.options.map((o) => o.trim()).filter(Boolean);
      if (validOpts.length < 2) {
        alert('Anket için en az 2 geçerli seçenek girmelisiniz.');
        return;
      }
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setSubmitting(true);
    try {
      const payload: any = {
        title: postTitle.trim() || undefined,
        content: postContent.trim() || undefined,
        mediaUrls,
        isPinned,
        commentsEnabled,
        publishImmediately: publish,
      };

      if (pollData.enabled) {
        payload.poll = {
          question: pollData.question.trim(),
          options: pollData.options.map((o) => o.trim()).filter(Boolean),
          selectionType: pollData.selectionType,
          maxSelections: pollData.maxSelections,
          resultVisibility: pollData.resultVisibility,
          endsAt: pollData.durationType === 'CUSTOM' && pollData.customEndsAt ? pollData.customEndsAt : undefined,
          notifyParticipantsOnClose: pollData.notifyParticipantsOnClose,
        };
      }

      const res = await fetch(`${API_BASE_URL}/admin/club/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/admin/club/posts');
      } else {
        const err = await res.json();
        alert(err.message || 'Gönderi oluşturulamadı.');
      }
    } catch (e) {
      alert('Hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/club/posts"
            className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white font-sans">Yeni Club Gönderisi Oluştur</h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Tork Scout Club ana akışına yeni duyuru, analiz veya anket gönderisi ekleyin.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPreviewModal(true)}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <Eye className="w-4 h-4 text-orange-400" /> Önizle
        </button>
      </div>

      <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/10 space-y-6">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block font-sans">Gönderi Başlığı</label>
          <input
            type="text"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            placeholder="Örn: 2026 İkinci El Otomobil Piyasası Risk Analizi..."
            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans"
          />
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block font-sans">Gönderi Metni & Açıklama</label>
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Gönderinizin detaylı metnini girin..."
            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 h-36 font-sans leading-relaxed"
          />
        </div>

        {/* Media Upload */}
        <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2 font-sans">
              <Image className="w-4 h-4 text-orange-400" /> Fotoğraflar (En fazla 10)
            </label>
            <span className="text-[11px] text-slate-500 font-mono">{mediaUrls.length}/10 Fotoğraf Yüklendi</span>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {mediaUrls.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                <img src={url} alt="Uploaded" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {mediaUrls.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="aspect-square rounded-lg border border-dashed border-white/20 hover:border-orange-500/50 bg-slate-900 hover:bg-slate-900/80 flex flex-col items-center justify-center text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-bold">Foto Yükle</span>
              </button>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Poll Section */}
        <PollCreationFields value={pollData} onChange={setPollData} />

        {/* Options */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/60 rounded-xl border border-white/5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="accent-orange-500 w-4 h-4"
            />
            <span className="text-xs font-bold text-slate-200 font-sans">Ana Akışın Üstüne Sabitle</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={commentsEnabled}
              onChange={(e) => setCommentsEnabled(e.target.checked)}
              className="accent-orange-500 w-4 h-4"
            />
            <span className="text-xs font-bold text-slate-200 font-sans">Yorumlara Açık Olsun</span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Taslak Kaydet
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Hemen Yayınla
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-sm font-sans flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-400" /> Club Akış Görünümü (Önizleme)
              </h3>
              <button onClick={() => setShowPreviewModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 border border-white/5 rounded-xl space-y-3 font-sans">
              {isPinned && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold font-mono">
                  📌 Sabitlenmiş Duyuru
                </span>
              )}
              <h2 className="font-bold text-white text-base">{postTitle || 'Başlıksız Gönderi'}</h2>
              <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{postContent}</p>

              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {mediaUrls.map((u, i) => (
                    <img key={i} src={u} alt="Preview" className="w-full aspect-video object-cover rounded-lg border border-white/10" />
                  ))}
                </div>
              )}

              {pollData.enabled && (
                <div className="p-3 bg-slate-950 rounded-lg border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-orange-400">📊 {pollData.question}</span>
                  <div className="space-y-1">
                    {pollData.options.filter(Boolean).map((opt, idx) => (
                      <div key={idx} className="p-2 bg-slate-900 rounded text-xs text-slate-300 border border-white/5">
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-orange-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
