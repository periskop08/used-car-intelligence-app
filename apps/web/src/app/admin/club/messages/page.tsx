"use client";

import React, { useEffect, useState } from "react";
import ClubUserSearch from "../components/ClubUserSearch";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubMessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const fetchConversations = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/club/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSendMessage = async () => {
    if (!selectedUser || !messageText.trim()) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/club/users/${selectedUser.id}/message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageText.trim() }),
      });

      if (res.ok) {
        alert("Mesaj başarıyla gönderildi!");
        setMessageText("");
        setSelectedUser(null);
        fetchConversations();
      } else {
        const err = await res.json();
        alert(err.message || "Mesaj gönderilemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-black text-white">Club Admin Özel Mesajlaşma</h2>
        <p className="text-xs text-slate-400">
          Kullanıcılara doğrudan resmi Club bilgilendirme ve duyuru mesajı gönderin (`CLUB_ADMIN`).
        </p>
      </div>

      {/* New DM Card */}
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <span>✉️</span> Kullanıcıya Yeni Mesaj Gönder
        </h3>

        <ClubUserSearch onSelectUser={(u) => setSelectedUser(u)} />

        {selectedUser && (
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white">Alıcı: {selectedUser.displayName}</span>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Değiştir ✖️
              </button>
            </div>

            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Mesaj metnini yazın..."
              className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />

            <button
              disabled={sending}
              onClick={handleSendMessage}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs shadow-md transition"
            >
              {sending ? "Gönderiliyor..." : "Mesajı Gönder 🚀"}
            </button>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-white">Geçmiş Admin Konuşmaları</h3>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-orange-500 mx-auto mb-2"></div>
            <p className="text-xs">Konuşmalar yükleniyor...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
            <p className="text-xs text-slate-400">Henüz admin mesajı başlatılmamış.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{conv.userFormatted}</h4>
                  <p className="text-xs text-slate-300 mt-1">{conv.lastMessage}</p>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    {new Date(conv.lastMessageAt).toLocaleString("tr-TR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
