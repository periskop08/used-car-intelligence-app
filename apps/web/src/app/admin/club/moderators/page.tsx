"use client";

import React, { useEffect, useState } from "react";
import ClubUserSearch from "../components/ClubUserSearch";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubModeratorsPage() {
  const [moderators, setModerators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);

  const fetchModerators = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/club/moderators`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setModerators(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerators();
  }, []);

  const handleAssign = async () => {
    if (!selectedUser) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setAssigning(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/club/moderators/${selectedUser.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert(`${selectedUser.displayName} başarıyla moderatör atandı!`);
        setSelectedUser(null);
        fetchModerators();
      } else {
        const err = await res.json();
        alert(err.message || "Moderatör atama başarısız.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm("Bu kullanıcının moderatör yetkisini kaldırmak istediğinize emin misiniz?")) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/club/moderators/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchModerators();
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-black text-white">Moderatör Yönetim Masası</h2>
        <p className="text-xs text-slate-400">
          Müşteri numarası veya ad soyad ile kullanıcı arayarak onaylı moderatör ataması yapın.
        </p>
      </div>

      {/* Moderator Assignment Form Card */}
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <span>🛡️</span> Yeni Moderatör Atama
        </h3>

        <ClubUserSearch onSelectUser={(u) => setSelectedUser(u)} />

        {selectedUser && (
          <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{selectedUser.displayName}</span>
                {selectedUser.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                    {selectedUser.badge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Müşteri No: {selectedUser.customerNo}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-slate-400 hover:text-white"
              >
                Vazgeç
              </button>
              <button
                disabled={assigning}
                onClick={handleAssign}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs shadow-md transition"
              >
                {assigning ? "..." : "Moderatör Yap ✅"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Moderators List */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-white">Aktif Moderatör Listesi</h3>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-orange-500 mx-auto mb-2"></div>
            <p className="text-xs">Moderatörler yükleniyor...</p>
          </div>
        ) : moderators.length === 0 ? (
          <div className="p-8 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
            <p className="text-xs text-slate-400">Henüz atanmış aktif moderatör yok.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {moderators.map((mod) => (
              <div
                key={mod.id}
                className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{mod.userFormatted}</span>
                    {mod.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                        {mod.badge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Atayan Admin: {mod.assignedByFormatted}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Tarih: {new Date(mod.assignedAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>

                <button
                  onClick={() => handleRevoke(mod.userId)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition"
                >
                  Yetkiyi Kaldır
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
