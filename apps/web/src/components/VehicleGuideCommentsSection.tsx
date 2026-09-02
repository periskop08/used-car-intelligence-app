"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Star, Clock, CheckCircle, AlertCircle, Check, ThumbsUp, UserCheck, Send } from "lucide-react";

interface VehicleGuideCommentsSectionProps {
  guideCardId: string;
  guideCardTitle: string;
  token?: string;
}

export default function VehicleGuideCommentsSection({
  guideCardId,
  guideCardTitle,
  token,
}: VehicleGuideCommentsSectionProps) {
  const [commentsData, setCommentsData] = useState<{
    comments: any[];
    approvedCount: number;
    ratingSummary: any;
  }>({
    comments: [],
    approvedCount: 0,
    ratingSummary: null,
  });
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [usageMonths, setUsageMonths] = useState<number | "">(12);
  const [isOwner, setIsOwner] = useState(true);
  const [recommends, setRecommends] = useState(true);

  // 7 Star Ratings (1-5)
  const [reliabilityRating, setReliabilityRating] = useState(5);
  const [fuelRating, setFuelRating] = useState(4);
  const [comfortRating, setComfortRating] = useState(5);
  const [partsRating, setPartsRating] = useState(4);
  const [maintenanceRating, setMaintenanceRating] = useState(4);
  const [resaleRating, setResaleRating] = useState(4);
  const [overallRating, setOverallRating] = useState(5);

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const fetchComments = async () => {
    if (!guideCardId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/vehicle-guide/cards/${guideCardId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setCommentsData(data);
      }
    } catch (err) {
      console.error("Failed to load guide comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [guideCardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccessMsg(null);
    setSubmitErrorMsg(null);

    const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("accessToken") : "");
    if (!authToken) {
      setSubmitErrorMsg("Yorum yazabilmek için lütfen hesabınıza giriş yapın.");
      return;
    }

    if (!commentText || commentText.trim().length < 20) {
      setSubmitErrorMsg("Yorumunuz en az 20 karakter olmalıdır.");
      return;
    }
    if (commentText.trim().length > 1000) {
      setSubmitErrorMsg("Yorumunuz en fazla 1000 karakter olabilir.");
      return;
    }
    if (typeof usageMonths !== "number" || usageMonths < 0) {
      setSubmitErrorMsg("Lütfen geçerli bir kullanım süresi (ay) girin.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/vehicle-guide/cards/${guideCardId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          comment: commentText.trim(),
          usageMonths: Math.floor(usageMonths),
          isOwner,
          recommends,
          reliabilityRating,
          fuelRating,
          comfortRating,
          partsRating,
          maintenanceRating,
          resaleRating,
          overallRating,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.message || "Yorum gönderilemedi.");
      }

      setSubmitSuccessMsg(resData.message || "Yorumunuz alındı ve yayınlanmadan önce incelenecektir.");
      setCommentText("");
      setShowForm(false);
    } catch (err: any) {
      setSubmitErrorMsg(err.message || "Yorum gönderilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarInput = (label: string, value: number, onChange: (val: number) => void) => (
    <div className="flex items-center justify-between p-2.5 bg-[#05070f] rounded-xl border border-white/5">
      <span className="text-xs font-bold text-slate-300">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-125 transition cursor-pointer"
          >
            <Star
              className={`w-4 h-4 ${
                star <= value ? "fill-amber-400 text-amber-400" : "text-slate-600"
              }`}
            />
          </button>
        ))}
        <span className="text-[10px] font-mono font-bold text-amber-400 ml-1.5 min-w-[36px] text-right">
          {value} ⭐
        </span>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[840px] mt-8 bg-[#090d1a] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl text-slate-100 font-sans">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-orange-400" />
            <span>💬 Kullanıcı Yorumları ({commentsData.approvedCount})</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {guideCardTitle} deneyimini paylaşan gerçek kullanıcı değerlendirmeleri.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center gap-2 cursor-pointer"
        >
          <span>✍</span> {showForm ? "Formu Kapat" : "Araç Hakkında Yorum Yaz"}
        </button>
      </div>

      {/* RATING SUMMARY CARDS (If approved comments exist) */}
      {commentsData.ratingSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 p-4 bg-[#05070f] rounded-2xl border border-white/5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Genel Puan</span>
            <div className="flex items-center gap-1">
              <span className="text-base font-black text-amber-400">{commentsData.ratingSummary.overallRating}</span>
              <span className="text-xs text-slate-500">/ 5 ⭐</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Güvenilirlik</span>
            <span className="text-sm font-bold text-slate-200">{commentsData.ratingSummary.reliabilityRating} ⭐</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Yakıt Tüketimi</span>
            <span className="text-sm font-bold text-slate-200">{commentsData.ratingSummary.fuelRating} ⭐</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Konfor</span>
            <span className="text-sm font-bold text-slate-200">{commentsData.ratingSummary.comfortRating} ⭐</span>
          </div>
        </div>
      )}

      {/* SUCCESS NOTIFICATION */}
      {submitSuccessMsg && (
        <div className="my-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2.5">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{submitSuccessMsg}</span>
        </div>
      )}

      {/* ERROR NOTIFICATION */}
      {submitErrorMsg && (
        <div className="my-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{submitErrorMsg}</span>
        </div>
      )}

      {/* COMMENT FORM (TOGGLEABLE) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="my-6 p-6 rounded-2xl bg-[#050714] border border-orange-500/30 flex flex-col gap-5">
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <span>✍</span> {guideCardTitle} İçin Yorumunu Yaz
          </h4>

          {/* 7 Star Ratings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderStarInput("Güvenilirlik", reliabilityRating, setReliabilityRating)}
            {renderStarInput("Yakıt Tüketimi", fuelRating, setFuelRating)}
            {renderStarInput("Konfor", comfortRating, setComfortRating)}
            {renderStarInput("Parça Bulunabilirliği", partsRating, setPartsRating)}
            {renderStarInput("Bakım ve Servis", maintenanceRating, setMaintenanceRating)}
            {renderStarInput("İkinci El Satış", resaleRating, setResaleRating)}
            {renderStarInput("Genel Memnuniyet", overallRating, setOverallRating)}
          </div>

          {/* Comment Textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Yorumunuz (En az 20 karakter)</label>
            <textarea
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Aracın konforu, yakıt tüketimi, kronik sorunları ve kullanıcı deneyimleriniz hakkında ayrıntılı bilgi yazın..."
              className="w-full p-3 bg-[#02040a] border border-white/10 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none transition resize-none"
            />
            <span className="text-[10px] font-mono text-slate-500 text-right">
              {commentText.length} / 1000 Karakter
            </span>
          </div>

          {/* Usage Months & Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-300">Kullanım Süresi (Ay)</label>
              <input
                type="number"
                min={0}
                max={600}
                value={usageMonths}
                onChange={(e) => setUsageMonths(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Örn: 12"
                className="w-full px-3 py-2 bg-[#02040a] border border-white/10 rounded-xl text-xs font-bold text-white focus:border-orange-500 focus:outline-none transition"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-4 sm:pt-0">
              <input
                type="checkbox"
                checked={isOwner}
                onChange={(e) => setIsOwner(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-slate-900 text-orange-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-300">Araç Sahibiyim</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer pt-2 sm:pt-0">
              <input
                type="checkbox"
                checked={recommends}
                onChange={(e) => setRecommends(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-slate-900 text-orange-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-300">Tavsiye Ediyorum</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <span className="animate-pulse">Gönderiliyor...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Yorumu Gönder</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* COMMENTS LIST */}
      <div className="flex flex-col gap-4 my-4">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse font-medium">
            Yorumlar yükleniyor...
          </div>
        ) : commentsData.comments.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-[#05070f] border border-white/5 text-slate-400 text-xs font-medium">
            Bu araç rehberi için henüz onaylanmış bir kullanıcı yorumu bulunmuyor. İlk yorumu sen yaz!
          </div>
        ) : (
          commentsData.comments.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-[#050714] border border-white/5 flex flex-col gap-3 hover:border-white/10 transition"
            >
              {/* Comment Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{c.displayName}</span>
                  {c.customerNo && (
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 text-[10px] font-mono">
                      {c.customerNo}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {c.usageMonths > 0 && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold">
                      {c.usageMonths} Ay Kullanım
                    </span>
                  )}
                  {c.isOwner && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Araç Sahibi
                    </span>
                  )}
                  {c.recommends && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> Tavsiye Ediyor
                    </span>
                  )}
                </div>
              </div>

              {/* Comment Body */}
              <p className="text-xs leading-relaxed text-slate-200 font-medium whitespace-pre-wrap">
                {c.comment}
              </p>

              {/* Star Rating Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-[10px] text-slate-400 font-bold">
                <span className="text-amber-400 font-black">Genel: {c.overallRating} ⭐</span>
                <span>• Güvenilirlik: {c.reliabilityRating}</span>
                <span>• Yakıt: {c.fuelRating}</span>
                <span>• Konfor: {c.comfortRating}</span>
                <span>• Parça: {c.partsRating}</span>
                <span>• Bakım: {c.maintenanceRating}</span>
                <span>• Satış: {c.resaleRating}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
