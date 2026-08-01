"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubModeratorsPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [activeModerators, setActiveModerators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [resultModal, setResultModal] = useState<any | null>(null);

  const fetchData = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setLoading(true);
    try {
      const [modRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/club/moderators`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_URL}/api/admin/club/users?limit=50&sort=CREATED_AT_ASC`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : { users: [] })),
      ]);

      setActiveModerators(Array.isArray(modRes) ? modRes : []);
      setCandidates(usersRes.users || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSelectCandidate = (userId: string) => {
    const next = new Set(selectedCandidateIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedCandidateIds(next);
  };

  const handleBulkAssign = async () => {
    if (selectedCandidateIds.size === 0) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setAssigning(true);
    try {
      let res = await fetch(`${API_URL}/api/admin/club/moderators/bulk-assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds: Array.from(selectedCandidateIds) }),
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_URL}/admin/club/moderators/bulk-assign`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userIds: Array.from(selectedCandidateIds) }),
        });
      }
      if (res.ok) {
        const data = await res.json();
        setResultModal(data);
        setSelectedCandidateIds(new Set());
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || "Moderatör atama işlemi başarısız.");
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

    let res = await fetch(`${API_URL}/api/admin/club/moderators/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status === 404) {
      res = await fetch(`${API_URL}/admin/club/moderators/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    if (res.ok) fetchData();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-black text-white">Moderatör Ekibi & Atama Yönetimi</h2>
        <p className="text-xs text-slate-400">
          Aday kullanıcıları otomatik listeden seçerek moderatör yetkisi verin veya mevcut moderatörleri yönetin.
        </p>
      </div>

      {/* Bölüm 1: Moderatör Adayı Kullanıcılar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <h3 className="text-sm font-black text-white">Bölüm 1: Moderatör Adayı Kullanıcılar (Eskiden Yeniye)</h3>
          </div>

          {selectedCandidateIds.size > 0 && (
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-orange-400">{selectedCandidateIds.size} Aday Seçildi</span>
              <button
                disabled={assigning}
                onClick={handleBulkAssign}
                className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition shadow-lg shadow-orange-600/20"
              >
                {assigning ? "Atanıyor..." : "Seçilenleri Moderatör Yap 🛡️"}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">Kullanıcılar Yükleniyor...</div>
        ) : candidates.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">Aday kullanıcı bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-bold">
                  <th className="p-3 w-10 text-center">Seç</th>
                  <th className="p-3">Müşteri No & Ad Soyad</th>
                  <th className="p-3">Paket</th>
                  <th className="p-3">Kayıt Tarihi</th>
                  <th className="p-3 text-center">Yorum</th>
                  <th className="p-3 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCandidateIds.has(c.id)}
                        onChange={() => toggleSelectCandidate(c.id)}
                        disabled={c.role === "ADMIN" || c.isBanned}
                        className="rounded border-white/20 text-orange-500 focus:ring-orange-500"
                      />
                    </td>
                    <td className="p-3 font-bold text-white">
                      {c.customerNo} — {c.displayName}
                    </td>
                    <td className="p-3">
                      {c.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {typeof c.badge === "object" ? c.badge.label || c.badge.code : c.badge}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="p-3 text-center font-bold text-white">{c.commentCount}</td>
                    <td className="p-3 text-center">
                      {c.isBanned ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                          BANLI
                        </span>
                      ) : c.role === "ADMIN" ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                          ADMİN
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          UYGUN
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bölüm 2: Aktif Moderatörler */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">👑</span>
          <h3 className="text-sm font-black text-white">Bölüm 2: Aktif Moderatörler ({activeModerators.length})</h3>
        </div>

        {activeModerators.length === 0 ? (
          <div className="p-8 rounded-2xl border border-white/10 bg-slate-900/60 text-center text-xs text-slate-400">
            Aktif moderatör ataması bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeModerators.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{m.userFormatted}</span>
                    {m.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                        {typeof m.badge === "object" ? m.badge.label || m.badge.code : m.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Atayan: {m.assignedByFormatted} • Tarih: {new Date(m.assignedAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>

                <button
                  onClick={() => handleRevoke(m.userId)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition whitespace-nowrap"
                >
                  Yetkiyi Kaldır
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Result Feedback Modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white">Moderatör Atama Sonucu</h3>
            <div className="text-xs text-slate-300 space-y-1 font-mono">
              <p className="text-emerald-400">✅ Başarıyla Atanan: {resultModal.assigned}</p>
              {resultModal.failed > 0 && <p className="text-rose-400">❌ Başarısız/Atanamayan: {resultModal.failed}</p>}
            </div>

            {resultModal.failures && resultModal.failures.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1 text-rose-300 max-h-32 overflow-y-auto">
                {resultModal.failures.map((f: any, idx: number) => (
                  <p key={idx}>
                    Kullanıcı: {f.userId} — Nedeni: {f.reason}
                  </p>
                ))}
              </div>
            )}

            <div className="text-right pt-2">
              <button
                onClick={() => setResultModal(null)}
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
