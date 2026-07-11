"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function SubscriptionPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tier = profile?.subscriptionTier || "FREE";

  const getTierBadge = () => {
    switch (tier) {
      case "PREMIUM":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "STANDARD":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      default:
        return "bg-slate-800 text-slate-400 border border-white/5";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Abonelik Paketim</h1>
        <p className="text-slate-400 text-xs">Mevcut üyelik planınızı görüntüleyin ve yönetin.</p>
      </div>

      <div className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Aktif Paketiniz</span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-slate-200">TorqueScout {tier}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getTierBadge()}`}>{tier}</span>
            </div>
          </div>

          {tier !== "PREMIUM" && (
            <a
              href="/#packages"
              className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-orange-500/10"
            >
              Planı Yükselt
            </a>
          )}
        </div>

        <div className="border-t border-white/5 pt-6">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Paket Detayları & Avantajları</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <span className="text-sm">🚗</span>
              <h4 className="text-xs font-bold text-slate-300">İlan Hakkı</h4>
              <p className="text-[11px] text-slate-500">
                {tier === "PREMIUM" ? "Aynı anda 50 aktif ilan yayını." : tier === "STANDARD" ? "Aynı anda 10 aktif ilan yayını." : "Aynı anda 1 aktif ilan yayını."}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <span className="text-sm">📅</span>
              <h4 className="text-xs font-bold text-slate-300">Yayın Süresi</h4>
              <p className="text-[11px] text-slate-500">
                {tier === "PREMIUM" ? "İlanlarınız 45 gün boyunca yayında kalır." : "İlanlarınız 30 gün boyunca yayında kalır."}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <span className="text-sm">⚡</span>
              <h4 className="text-xs font-bold text-slate-300">Pasif Bekleme</h4>
              <p className="text-[11px] text-slate-500">
                Süresi dolan ilanlarınız 15 gün boyunca pasif listede saklanır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
