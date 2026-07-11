"use client";

import React, { useState } from "react";

export default function FeedbackPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message || sending) return;

    setSending(true);
    setTimeout(() => {
      setSuccess(true);
      setSubject("");
      setMessage("");
      setSending(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Geri Bildirim Gönder</h1>
        <p className="text-slate-400 text-xs">TorqueScout hakkındaki önerilerinizi ve bildirimlerinizi bizimle paylaşın.</p>
      </div>

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold rounded-2xl">
          Geri bildiriminiz başarıyla iletildi! Teşekkür ederiz.
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Konu</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="Öneri, Hata Bildirimi vb."
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Mesajınız</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="Geri bildiriminizi detaylandırın..."
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition resize-none"
            />
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={sending || !subject || !message}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-bold cursor-pointer transition shadow-lg shadow-orange-500/10"
          >
            {sending ? "Gönderiliyor..." : "Geri Bildirim Gönder"}
          </button>
        </div>
      </form>
    </div>
  );
}
