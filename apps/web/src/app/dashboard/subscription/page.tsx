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

  const rawTier = profile?.subscriptionTier || "TANISMA";
  const tier = rawTier === "FREE" ? "TANISMA" : rawTier === "STANDARD" ? "YETKIN" : rawTier === "PREMIUM" ? "PROFESYONEL" : rawTier;

  const getTierBadge = () => {
    switch (tier) {
      case "PROFESYONEL":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "YETKIN":
        return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      default:
        return "bg-slate-800 text-slate-300 border border-white/10";
    }
  };

  const getTierDisplayName = () => {
    switch (tier) {
      case "PROFESYONEL":
        return "Profesyonel Paket (1.499 TL / ay)";
      case "YETKIN":
        return "Yetkin Paket (499 TL / ay)";
      default:
        return "Tanışma Paketi (0 TL / ay)";
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
              <span className="text-lg font-bold text-slate-200">{getTierDisplayName()}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getTierBadge()}`}>{tier}</span>
            </div>
          </div>

          {tier !== "PROFESYONEL" && (
            <a
              href="/#packages"
              className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-orange-500/10"
            >
              Planı Yükselt
            </a>
          )}
        </div>

        <div className="border-t border-white/5 pt-6">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Paket Detayları & Haklarınız</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <span className="text-sm">🤖</span>
              <h4 className="text-xs font-bold text-slate-300">Yapay Zekâ Raporu</h4>
              <p className="text-[11px] text-slate-400">
                {tier === "PROFESYONEL" ? "Ayda 50 AI araç raporu ve 150 chatbot mesajı." : tier === "YETKIN" ? "Ayda 10 AI araç raporu ve 30 chatbot mesajı." : "Ayda 3 AI araç raporu ve 3 chatbot mesajı."}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <span className="text-sm">🚗</span>
              <h4 className="text-xs font-bold text-slate-300">İlan Hakkı</h4>
              <p className="text-[11px] text-slate-400">
                {tier === "PROFESYONEL" ? "Aynı anda 50 aktif ilan yayını." : tier === "YETKIN" ? "Aynı anda 10 aktif ilan yayını." : "Aynı anda 1 aktif ilan yayını."}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <span className="text-sm">📅</span>
              <h4 className="text-xs font-bold text-slate-300">Yayın Süresi</h4>
              <p className="text-[11px] text-slate-400">
                {tier === "PROFESYONEL" ? "İlan başına 45 gün yayın süresi." : "İlan başına 30 gün yayın süresi."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
