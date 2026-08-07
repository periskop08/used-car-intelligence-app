"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const SUBJECT_OPTIONS = [
  { value: "GENERAL_SUGGESTION", label: "Genel Öneri" },
  { value: "BUG_REPORT", label: "Hata Bildirimi" },
  { value: "VEHICLE_QUERY_AI_REPORT", label: "Araç Sorgulama / AI Rapor" },
  { value: "INCORRECT_VEHICLE_DATA", label: "Eksik veya Hatalı Araç Bilgisi" },
  { value: "LISTINGS", label: "İlanlar" },
  { value: "MESSAGES", label: "Mesajlar" },
  { value: "FAVORITES", label: "Favoriler" },
  { value: "SUBSCRIPTION_PACKAGES", label: "Abonelik / Paketler" },
  { value: "ACCOUNT_PROFILE", label: "Hesap / Profil" },
  { value: "VEHICLE_GUIDE", label: "Araç Rehberi" },
  { value: "VEHICLE_COMPARISON", label: "Araç Karşılaştırma" },
  { value: "FIND_MY_CAR", label: "Aracını Bul" },
  { value: "DESIGN_USABILITY", label: "Tasarım / Kullanım Kolaylığı" },
  { value: "SECURITY_SUSPICIOUS_ACTIVITY", label: "Güvenlik / Şüpheli İşlem" },
  { value: "OTHER", label: "Diğer" },
];

function FeedbackPageContent() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listingId");
  const isListingReport = Boolean(listingId);

  const [category, setCategory] = useState(isListingReport ? "LISTINGS" : "");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [listingDetails, setListingDetails] = useState<any | null>(null);

  useEffect(() => {
    if (isListingReport && listingId) {
      setCategory("LISTINGS");
      // Fetch basic listing title for user display
      fetch(`${API_URL}/listings/${listingId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setListingDetails(data);
        })
        .catch((err) => console.error("Error fetching listing details for report:", err));
    }
  }, [listingId, isListingReport]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (selectedFile.size > maxSizeBytes) {
      setErrorMsg("Ekran görüntüsü boyutu en fazla 5MB olabilir.");
      setFile(null);
      e.target.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setErrorMsg("Yalnızca JPG, JPEG, PNG ve WEBP formatında görsel ekleyebilirsiniz.");
      setFile(null);
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!category && !isListingReport) {
      setErrorMsg("Lütfen geri bildiriminiz için bir konu seçin.");
      return;
    }

    if (message.length < 10) {
      setErrorMsg("Açıklamanız en az 10 karakter olmalıdır.");
      return;
    }

    if (message.length > 2000) {
      setErrorMsg("Açıklamanız en fazla 2000 karakter olmalıdır.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setErrorMsg("Oturum bulunamadı. Bildirim göndermek için lütfen giriş yapın.");
      return;
    }

    setSending(true);

    const formData = new FormData();
    formData.append("message", message);
    if (!isListingReport) {
      formData.append("subjectCategory", category);
    }
    if (file) {
      formData.append("attachment", file);
    }

    const endpoint = isListingReport
      ? `${API_URL}/listings/${listingId}/report`
      : `${API_URL}/feedback`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || "Bildirim gönderilemedi. Lütfen tekrar deneyin.");
      }

      if (isListingReport) {
        setSuccessMsg(
          `Bildiriminiz alındı. (Bildirim No: ${responseData.ticketNo || "RPT-KAYIT"}). İnceleme sonucunda gerekli görülmesi halinde sizinle iletişime geçeceğiz.`
        );
      } else {
        setSuccessMsg("Geri bildiriminiz alındı. TorqueScout’u geliştirmemize yardımcı olduğunuz için teşekkür ederiz.");
        setCategory("");
      }

      setMessage("");
      setFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      setErrorMsg(err.message || "Bildirim gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSending(false);
    }
  };

  const isFormValid = message.length >= 10 && message.length <= 2000 && !sending;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          {isListingReport ? "⚑ İlanı Bildir / Şikâyet Et" : "Geri Bildirim Gönder"}
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          {isListingReport
            ? "Şüpheli, hatalı veya kurallara aykırı olduğunu düşündüğünüz aracı yönetici ekibimize bildirin."
            : "TorqueScout hakkındaki önerilerinizi ve bildirimlerinizi bizimle paylaşın."}
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-2xl leading-relaxed">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-2xl leading-relaxed">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="space-y-5 max-w-xl">
          {/* Topic Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400">Konu</label>
              {isListingReport && (
                <span className="text-[10px] text-orange-400 font-extrabold flex items-center gap-1">
                  🔒 İlan Şikâyeti (Kilitli)
                </span>
              )}
            </div>
            {isListingReport ? (
              <div className="w-full bg-[#05070f] border border-orange-500/30 rounded-2xl px-4 py-3 text-xs font-bold text-orange-400 flex items-center justify-between select-none">
                <span>İlanlar</span>
                <span>🔒</span>
              </div>
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition appearance-none cursor-pointer"
              >
                <option value="" disabled>Bir konu seçin</option>
                {SUBJECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#090d1a]">
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Locked Listing Reference Card if from listing flow */}
          {isListingReport && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">İlgili İlan</label>
              <div className="p-4 bg-slate-950/80 border border-white/10 rounded-2xl flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400 font-bold">İlan No:</span>
                  <strong className="text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                    {listingId?.substring(0, 8).toUpperCase()}
                  </strong>
                </div>
                {listingDetails && (
                  <div className="flex flex-col gap-0.5 pt-1 border-t border-white/5 mt-1">
                    <span className="text-slate-300 font-bold line-clamp-1">{listingDetails.title}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {listingDetails.modelYear} • {listingDetails.kilometers?.toLocaleString("tr-TR")} km • {listingDetails.city}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">
              {isListingReport ? "Şikâyetiniz / Açıklamanız" : "Mesajınız"}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              maxLength={2000}
              placeholder={
                isListingReport
                  ? "Bu ilanla ilgili bildirmek istediğiniz durumu açıklayın (en az 10 karakter)..."
                  : "Geri bildiriminizi detaylandırın (en az 10 karakter)..."
              }
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition resize-none"
            />
            <div className="flex justify-end text-[10px] text-slate-500">
              {message.length} / 2000 karakter
            </div>
          </div>

          {/* Screenshot Upload (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Ekran görüntüsü ekle (Opsiyonel)</label>
            <input
              id="file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:cursor-pointer transition"
            />
            <p className="text-[10px] text-slate-500">İzin verilen formatlar: JPG, JPEG, PNG, WEBP. Maksimum dosya boyutu: 5MB</p>
          </div>
        </div>

        {/* Submit button */}
        <div className="border-t border-white/5 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={!isFormValid}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-bold cursor-pointer transition shadow-lg shadow-orange-500/10"
          >
            {sending ? "Gönderiliyor..." : isListingReport ? "Şikâyeti Gönder" : "Geri Bildirim Gönder"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400 text-xs font-bold text-center">Yükleniyor...</div>}>
      <FeedbackPageContent />
    </Suspense>
  );
}
