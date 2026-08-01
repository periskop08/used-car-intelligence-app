"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminClubRestrictionsPage() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type") || "ALL";
  const statusFilter = searchParams.get("status") || "ALL";

  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRestrictions = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(
        `${API_URL}/api/admin/club/restrictions?type=${encodeURIComponent(typeFilter)}&status=${encodeURIComponent(statusFilter)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRestrictions(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestrictions();
  }, [typeFilter, statusFilter]);

  const handleUnban = async (userId: string) => {
    if (!confirm("Bu kullanıcının engelini kaldırmak istediğinize emin misiniz?")) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const res = await fetch(`${API_URL}/api/admin/club/users/${userId}/unban`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchRestrictions();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-white">Susturma (Mute) ve Ban Yönetimi</h2>
        <p className="text-xs text-slate-400">
          Geçici susturulmuş veya kalıcı banlanmış kullanıcı kısıtlamalarını inceleyin ve kaldırın.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {["ALL", "MUTE", "BAN"].map((t) => (
          <Link
            key={t}
            href={`/admin/club/restrictions?type=${t}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              typeFilter === t
                ? "bg-white/15 text-white border border-white/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t === "ALL" ? "Tüm Türler" : t === "MUTE" ? "🔇 Mute (Susturma)" : "🚫 Ban (Yasaklama)"}
          </Link>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {["ALL", "ACTIVE"].map((st) => (
            <Link
              key={st}
              href={`/admin/club/restrictions?type=${typeFilter}&status=${st}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === st
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {st === "ALL" ? "Tüm Kayıtlar" : "Sadece Aktifler"}
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-xs font-bold">Kısıtlamalar Yükleniyor...</p>
        </div>
      ) : restrictions.length === 0 ? (
        <div className="p-12 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
          <p className="text-xs text-slate-400">Filtreye uygun kısıtlama bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {restrictions.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      item.type === "BAN"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {item.type}
                  </span>
                  <span className="text-xs font-bold text-white">{item.userFormatted}</span>
                </div>
                <p className="text-xs text-slate-300">Neden: {item.reason}</p>
                <p className="text-[11px] text-slate-500">
                  Uygulayan: {item.createdByFormatted} • Tarih:{" "}
                  {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                </p>
              </div>

              {item.type === "BAN" && !item.revokedAt && (
                <button
                  onClick={() => handleUnban(item.userId)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition whitespace-nowrap"
                >
                  Engeli Kaldır (Unban)
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
