"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function ClubUserDetailPage() {
  const params = useParams();
  const customerNo = params?.customerNo as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mute Form State
  const [muteReason, setMuteReason] = useState("");
  const [muteDays, setMuteDays] = useState(1);
  const [muting, setMuting] = useState(false);

  const fetchProfile = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !customerNo) return;

    try {
      const res = await fetch(
        `${API_URL}/api/admin/club/users/${encodeURIComponent(customerNo)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [customerNo]);

  const handleMute = async () => {
    if (!muteReason.trim()) {
      alert("Lütfen susturma nedenini yazın.");
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token || !profile) return;

    setMuting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/club/users/${profile.id}/mute`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: muteReason.trim(),
          durationDays: muteDays,
        }),
      });

      if (res.ok) {
        alert("Kullanıcı geçici susturuldu.");
        setMuteReason("");
        fetchProfile();
      } else {
        const err = await res.json();
        alert(err.message || "Susturma işlemi başarısız.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto mb-3"></div>
        <p className="text-xs font-bold">Kullanıcı Profili Yükleniyor...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-12 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
        <h3 className="text-sm font-bold text-slate-200">Kullanıcı Bulunamadı</h3>
        <Link href="/admin/club/users" className="text-xs font-bold text-orange-400 mt-2 block">
          ⬅️ Kullanıcı Listesine Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-black text-white">{profile.displayName}</h2>
            {profile.badge && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white/10 text-slate-200">
                {profile.badge.label}
              </span>
            )}
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
              {profile.role}
            </span>
          </div>
          {profile.email && <p className="text-xs text-slate-400">E-posta: {profile.email}</p>}
        </div>

        <Link
          href="/admin/club/users"
          className="text-xs font-bold text-slate-400 hover:text-white transition"
        >
          ⬅️ Geri Dön
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-white/10 bg-slate-900/60">
          <span className="text-xs font-bold text-slate-400 block">Toplam Yorum Sayısı</span>
          <span className="text-2xl font-black text-white">{profile.stats?.totalComments || 0}</span>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-slate-900/60">
          <span className="text-xs font-bold text-slate-400 block">Gizlenen Yorum Sayısı</span>
          <span className="text-2xl font-black text-rose-400">{profile.stats?.hiddenComments || 0}</span>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-slate-900/60">
          <span className="text-xs font-bold text-slate-400 block">Aktif Kısıtlama</span>
          <span className="text-2xl font-black text-amber-400">
            {profile.stats?.activeRestrictionsCount || 0}
          </span>
        </div>
      </div>

      {/* Action Card: Apply Mute */}
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <span>🔇</span> Geçici Susturma Uygula (Max 7 Gün)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={muteReason}
              onChange={(e) => setMuteReason(e.target.value)}
              placeholder="Susturma nedeni (Örn: Uygunsuz dil kullanımı)..."
              className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={muteDays}
              onChange={(e) => setMuteDays(Number(e.target.value))}
              className="px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            >
              {[1, 2, 3, 5, 7].map((d) => (
                <option key={d} value={d}>
                  {d} Gün
                </option>
              ))}
            </select>
            <button
              disabled={muting}
              onClick={handleMute}
              className="w-full px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition"
            >
              {muting ? "..." : "Sustur"}
            </button>
          </div>
        </div>
      </div>

      {/* Moderation Log Timeline */}
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-4">
        <h3 className="text-sm font-black text-white">Moderasyon Geçmişi</h3>
        {profile.moderationLogs?.length === 0 ? (
          <p className="text-xs text-slate-500">Kullanıcı için geçmiş kaydı yok.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {profile.moderationLogs?.map((log: any) => (
              <div key={log.id} className="py-3 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-orange-400">{log.action}</span>
                  {log.reason && <span className="text-slate-300 ml-2">"{log.reason}"</span>}
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(log.createdAt).toLocaleString("tr-TR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
