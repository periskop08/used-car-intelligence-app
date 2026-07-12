"use client";

import React, { useState } from "react";

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

export default function FeedbackPage() {
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Validate size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (selectedFile.size > maxSizeBytes) {
      setErrorMsg("Ekran görüntüsü boyutu en fazla 5MB olabilir.");
      setFile(null);
      e.target.value = "";
      return;
    }

    // Validate type
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

    if (!category) {
      setErrorMsg("Lütfen geri bildiriminiz için bir konu seçin.");
      return;
    }

    if (message.length < 10) {
      setErrorMsg("Mesajınız en az 10 karakter olmalıdır.");
      return;
    }

    if (message.length > 2000) {
      setErrorMsg("Mesajınız en fazla 2000 karakter olmalıdır.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setErrorMsg("Oturum bulunamadı. Geri bildirim göndermek için lütfen giriş yapın.");
      return;
    }

    setSending(true);

    const formData = new FormData();
    formData.append("subjectCategory", category);
    formData.append("message", message);
    if (file) {
      formData.append("attachment", file);
    }

    try {
      const res = await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Geri bildirim gönderilemedi. Lütfen tekrar deneyin.");
      }

      setSuccessMsg("Geri bildiriminiz alındı. TorqueScout’u geliştirmemize yardımcı olduğunuz için teşekkür ederiz.");
      setCategory("");
      setMessage("");
      setFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      setErrorMsg(err.message || "Geri bildirim gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSending(false);
    }
  };

  const isFormValid = category !== "" && message.length >= 10 && message.length <= 2000 && !sending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Geri Bildirim Gönder</h1>
        <p className="text-slate-400 text-xs">TorqueScout hakkındaki önerilerinizi ve bildirimlerinizi bizimle paylaşın.</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold rounded-2xl">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-2xl">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="space-y-4 max-w-md">
          {/* Topic Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Konu</label>
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
          </div>

          {/* Message Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Mesajınız</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              maxLength={2000}
              placeholder="Geri bildiriminizi detaylandırın (en az 10 karakter)..."
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
            {sending ? "Gönderiliyor..." : "Geri Bildirim Gönder"}
          </button>
        </div>
      </form>
    </div>
  );
}
