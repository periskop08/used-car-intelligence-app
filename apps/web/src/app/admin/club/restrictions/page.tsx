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
  const [modalItem, setModalItem] = useState<any | null>(null);
  const [acting, setActing] = useState(false);

  const fetchRestrictions = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      let res = await fetch(
        `${API_URL}/api/admin/club/restrictions?type=${encodeURIComponent(typeFilter)}&status=${encodeURIComponent(statusFilter)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok && res.status === 404) {
        res = await fetch(
          `${API_URL}/admin/club/restrictions?type=${encodeURIComponent(typeFilter)}&status=${encodeURIComponent(statusFilter)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
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

  const handleRevoke = async () => {
    if (!modalItem) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setActing(true);
    const endpointsToTry = [
      `${API_URL}/api/admin/club/restrictions/${modalItem.id}/revoke`,
      `${API_URL}/admin/club/restrictions/${modalItem.id}/revoke`,
      `${API_URL}/api/admin/club/users/${modalItem.userId}/${modalItem.type === "BAN" ? "unban" : "unmute"}`,
      `${API_URL}/admin/club/users/${modalItem.userId}/${modalItem.type === "BAN" ? "unban" : "unmute"}`,
      `${API_URL}/api/admin/club/restrictions/${modalItem.id}/${modalItem.type === "BAN" ? "unban" : "unmute"}`,
      `${API_URL}/admin/club/restrictions/${modalItem.id}/${modalItem.type === "BAN" ? "unban" : "unmute"}`,
    ];

    try {
      let res: Response | null = null;
      for (const endpoint of endpointsToTry) {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok || res.status !== 404) break;
      }

      if (res && res.ok) {
        setModalItem(null);
        fetchRestrictions();
      } else {
        const err = res ? await res.json().catch(() => ({})) : {};
        alert(err.message || "Kısıtlama kaldırma işlemi gerçekleştirilemedi.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    } finally {
      setActing(false);
    }
  };

  const getStatusBadge = (item: any) => {
    if (item.revokedAt) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
          KALDIRILDI
        </span>
      );
    }
    if (item.expiresAt && new Date(item.expiresAt) < new Date()) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/10">
          SÜRESİ DOLDU
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        AKTİF
      </span>
    );
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
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 flex-wrap">
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
        <div className="p-12 rounded-2xl border border-white/10 bg-slate-900/60 text-center space-y-1">
          <span className="text-2xl block">✅</span>
          <p className="text-xs font-bold text-slate-300">Filtreye Uygun Kısıtlama Bulunmadı</p>
          <p className="text-[11px] text-slate-500">Şu anda sistemde aktif veya geçmiş kısıtlama kaydı bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {restrictions.map((item) => {
            const isActive = !item.revokedAt && (!item.expiresAt || new Date(item.expiresAt) > new Date());
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        item.type === "BAN"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {item.type === "BAN" ? "CLUB YASAĞI" : "SUSTURMA (MUTE)"}
                    </span>

                    {getStatusBadge(item)}

                    <span className="text-xs font-bold text-white">{item.userFormatted}</span>
                  </div>

                  <p className="text-xs text-slate-300">Sebep: {item.reason || "Belirtilmedi"}</p>
                  <p className="text-[11px] text-slate-500">
                    Uygulayan: {item.createdByFormatted} • Başlangıç:{" "}
                    {new Date(item.createdAt).toLocaleDateString("tr-TR")}{" "}
                    {item.expiresAt && `• Bitiş: ${new Date(item.expiresAt).toLocaleDateString("tr-TR")}`}
                  </p>
                </div>

                {isActive && (
                  <button
                    onClick={() => setModalItem(item)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition whitespace-nowrap"
                  >
                    {item.type === "BAN" ? "Club'dan Yasağı Kaldır" : "Susturmayı Kaldır"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-black text-white">
                {modalItem.type === "BAN" ? "Club Yasağını Kaldır" : "Susturmayı Kaldır"}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>{modalItem.userFormatted}</strong> kullanıcısına uygulanan{" "}
              {modalItem.type === "BAN" ? "Club yasağını" : "geçici susturmayı"} kaldırmak istediğinizden emin misiniz? Kullanıcı topluluğa yeniden erişim kazanacaktır.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={acting}
                onClick={() => setModalItem(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 transition"
              >
                İptal
              </button>
              <button
                disabled={acting}
                onClick={handleRevoke}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition shadow-lg shadow-emerald-600/20"
              >
                {acting ? "Kaldırılıyor..." : modalItem.type === "BAN" ? "Yasağı Kaldır" : "Susturmayı Kaldır"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
