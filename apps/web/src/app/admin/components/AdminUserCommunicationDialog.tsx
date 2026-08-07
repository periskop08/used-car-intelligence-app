"use client";

import React, { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface AdminUserCommunicationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  feedbackId: string;
  recipient: "REPORTER" | "LISTING_OWNER";
  recipientDisplayName: string;
  recipientCustomerNo?: string;
  recipientEmail?: string;
  token: string;
  onSuccess?: () => void;
}

export default function AdminUserCommunicationDialog({
  isOpen,
  onClose,
  feedbackId,
  recipient,
  recipientDisplayName,
  recipientCustomerNo,
  recipientEmail,
  token,
  onSuccess,
}: AdminUserCommunicationDialogProps) {
  const [subject, setSubject] = useState(
    recipient === "LISTING_OWNER"
      ? "İlanınız Hakkında Bildirim"
      : "Şikâyetiniz Hakkında Bilgilendirme"
  );
  const [message, setMessage] = useState("");
  const [inAppChannel, setInAppChannel] = useState(true);
  const [emailChannel, setEmailChannel] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (!message.trim()) {
      setFeedbackMsg({ type: "error", text: "Lütfen bir mesaj içeriği girin." });
      return;
    }

    const channels: ("IN_APP" | "EMAIL")[] = [];
    if (inAppChannel) channels.push("IN_APP");
    if (emailChannel) channels.push("EMAIL");

    if (channels.length === 0) {
      setFeedbackMsg({ type: "error", text: "En az bir gönderim kanalı (Site içi veya E-posta) seçilmelidir." });
      return;
    }

    setSending(true);

    try {
      const res = await fetch(`${API_URL}/admin/feedbacks/${feedbackId}/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient,
          channels,
          subject,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Mesaj gönderilemedi.");
      }

      setFeedbackMsg({
        type: "success",
        text: `Mesaj ${
          recipient === "LISTING_OWNER" ? "İlan Sahibine" : "Şikâyet Eden Kullanıcıya"
        } başarıyla iletildi! (${channels.join(", ")})`,
      });

      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setMessage("");
        setFeedbackMsg(null);
      }, 2000);
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Bir hata oluştu." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0b0f19] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h3 className="text-base font-black text-white">
              {recipient === "LISTING_OWNER" ? "İlan Sahibine Mesaj Gönder" : "Şikâyet Edene Mesaj Gönder"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Target Recipient Banner */}
        <div className="p-3 bg-slate-950/80 border border-white/5 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
              {recipient === "LISTING_OWNER" ? "Hedef: İlan Sahibi" : "Hedef: Şikâyet Eden Reporter"}
            </span>
            <span className="font-bold text-slate-200">{recipientDisplayName}</span>
          </div>
          {recipientCustomerNo && (
            <span className="font-mono text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-1 rounded-md font-bold">
              {recipientCustomerNo}
            </span>
          )}
        </div>

        {recipient === "LISTING_OWNER" && (
          <p className="text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl leading-relaxed">
            🔒 <strong>Gizlilik Uyarısı:</strong> İlan sahibine iletilen mesajlarda şikâyet eden kullanıcının kişisel bilgileri (Ad, E-posta, Telefon) otomatik olarak gizli tutulmaktadır.
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">Konu</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-orange-500 transition"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">Mesaj İçeriği</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Kullanıcıya iletmek istediğiniz açıklama..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-orange-500 transition resize-none"
              required
            />
          </div>

          {/* Channels Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block">Gönderim Kanalları</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex items-center gap-2 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={inAppChannel}
                  onChange={(e) => setInAppChannel(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-orange-500 focus:ring-0 bg-slate-950 cursor-pointer"
                />
                <span className="font-bold text-slate-200">📱 Site İçi Mesaj</span>
              </label>

              <label className="p-3 bg-slate-900/60 border border-white/5 rounded-xl flex items-center gap-2 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={emailChannel}
                  onChange={(e) => setEmailChannel(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-orange-500 focus:ring-0 bg-slate-950 cursor-pointer"
                />
                <span className="font-bold text-slate-200">✉️ E-posta</span>
              </label>
            </div>
          </div>

          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold ${
                feedbackMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
              }`}
            >
              {feedbackMsg.text}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 transition cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
            >
              {sending ? "Gönderiliyor..." : "Mesajı Gönder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
