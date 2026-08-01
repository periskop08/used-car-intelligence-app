"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubMessagesPage() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("selected");

  const [users, setUsers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkContent, setBulkContent] = useState("");
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkJobResult, setBulkJobResult] = useState<any | null>(null);

  const fetchData = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setLoading(true);
    try {
      const [convRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/club/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/admin/club/users?limit=50&sort=CREATED_AT_ASC`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : { users: [] })),
      ]);

      setConversations(Array.isArray(convRes) ? convRes : []);
      setUsers(usersRes.users || []);

      if (preselected) {
        const ids = preselected.split(",").filter(Boolean);
        setSelectedUserIds(new Set(ids));
        setShowBulkModal(true);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSelectUser = (userId: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUserIds(next);
  };

  const handleSendBulkMessage = async () => {
    if (selectedUserIds.size === 0 || !bulkContent.trim()) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setSendingBulk(true);
    try {
      let res = await fetch(`${API_URL}/api/admin/club/messages/bulk`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          content: bulkContent.trim(),
          sendNotification: true,
        }),
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_URL}/admin/club/messages/bulk`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userIds: Array.from(selectedUserIds),
            content: bulkContent.trim(),
            sendNotification: true,
          }),
        });
      }
      if (res.ok) {
        const job = await res.json();
        setBulkJobResult(job);
        setShowBulkModal(false);
        setBulkContent("");
        setSelectedUserIds(new Set());
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || "Toplu mesaj gönderilemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    } finally {
      setSendingBulk(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Toplu ve Bireysel Yönetici Mesajlaşması</h2>
          <p className="text-xs text-slate-400">
            Kullanıcıları otomatik listeden seçerek her alıcıya özel 1-e-1 mesaj gönderin.
          </p>
        </div>

        {selectedUserIds.size > 0 && (
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black text-xs transition shadow-lg shadow-orange-600/20"
          >
            Seçilen {selectedUserIds.size} Kullanıcıya Mesaj Gönder ✉️
          </button>
        )}
      </div>

      {/* Mesaj Alıcısı Aday Kullanıcılar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <span className="text-lg">👥</span>
          <h3 className="text-sm font-black text-white">Alıcı Kullanıcı Listesi (Eskiden Yeniye)</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">Kullanıcılar Yükleniyor...</div>
        ) : users.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">Kullanıcı bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-bold">
                  <th className="p-3 w-10 text-center">Seç</th>
                  <th className="p-3">Müşteri No & Kullanıcı</th>
                  <th className="p-3">Paket</th>
                  <th className="p-3">Kayıt Tarihi</th>
                  <th className="p-3 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(u.id)}
                        onChange={() => toggleSelectUser(u.id)}
                        className="rounded border-white/20 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="p-3 font-bold text-white">
                      {u.customerNo} — {u.displayName}
                    </td>
                    <td className="p-3">
                      {u.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {typeof u.badge === "object" ? u.badge.label || u.badge.code : u.badge}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        AKTİF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Geçmiş Konuşmalar */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h3 className="text-sm font-black text-white">Son Yönetici Konuşmaları ({conversations.length})</h3>
        </div>

        {conversations.length === 0 ? (
          <div className="p-8 rounded-2xl border border-white/10 bg-slate-900/60 text-center text-xs text-slate-400">
            Henüz yönetici mesajı gönderilmemiş.
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold text-white block">{c.userFormatted}</span>
                  <p className="text-xs text-slate-300 line-clamp-1">{c.lastMessage || "Mesaj içeriği yok"}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                  {new Date(c.lastMessageAt || c.updatedAt).toLocaleDateString("tr-TR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Message Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg p-6 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">
                {selectedUserIds.size} Kullanıcıya Özel Mesaj Gönder
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Mesajınız seçilen her kullanıcıya ayrı ve özel 1-e-1 yönetici mesajı olarak iletilecektir. Kullanıcılar bir grup sohbeti oluşturmayacaktır.
            </p>

            <textarea
              rows={4}
              value={bulkContent}
              onChange={(e) => setBulkContent(e.target.value)}
              placeholder="Mesaj içeriğini buraya yazın..."
              className="w-full bg-slate-950 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={sendingBulk}
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 transition"
              >
                İptal
              </button>
              <button
                disabled={sendingBulk || !bulkContent.trim()}
                onClick={handleSendBulkMessage}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-black transition shadow-lg shadow-orange-600/20"
              >
                {sendingBulk ? "Gönderiliyor..." : "Mesajları Gönder ✉️"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Message Job Status Modal */}
      {bulkJobResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white">Toplu Mesaj Gönderim Sonucu</h3>
            <div className="text-xs font-mono space-y-1">
              <p className="text-slate-300">Durum: <strong className="text-orange-400">{bulkJobResult.status}</strong></p>
              <p className="text-emerald-400">✅ Başarılı Alıcı: {bulkJobResult.successCount}</p>
              <p className="text-rose-400">❌ Başarısız Alıcı: {bulkJobResult.failureCount}</p>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setBulkJobResult(null)}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
