"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function SubscriptionPage() {
  const [profile, setProfile] = useState<any>(null);
  const [buyerCredits, setBuyerCredits] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    Promise.all([
      fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch(`${API_URL}/buyer-packages/my-credits`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()).catch(() => null),
    ])
      .then(([userData, creditsData]) => {
        setProfile(userData);
        setBuyerCredits(creditsData);
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

  const hasBuyerCredits = buyerCredits && buyerCredits.activePurchases && buyerCredits.activePurchases.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Abonelik & Paketlerim</h1>
        <p className="text-slate-400 text-xs">Mevcut üyelik planınızı ve ek Alıcı paketlerinizi görüntüleyin.</p>
      </div>

      {/* Monthly Subscription Card */}
      <div className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Aylık Abonelik Paketiniz</span>
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
          <h3 className="text-sm font-bold text-slate-200 mb-4">Abonelik Detayları & Haklarınız</h3>
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

      {/* Ek Alıcı Paketleri Section */}
      <div className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <span>🛒 Ek Alıcı Paketi Hakları</span>
              <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-mono font-bold">
                Tek Seferlik
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Satın aldığınız ek AI raporu ve chatbot mesaj haklarınız.</p>
          </div>

          <a
            href="/#buyer-packages"
            className="px-4 py-2.5 border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-slate-200 text-xs font-bold rounded-2xl transition"
          >
            + Alıcı Paketi Ekle
          </a>
        </div>

        {hasBuyerCredits ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kalan Ek AI Raporu</span>
                <div className="text-xl font-black text-orange-400">
                  {buyerCredits.totalAiReportsRemaining} Rapor
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kalan Ek Chatbot Mesajı</span>
                <div className="text-xl font-black text-orange-400">
                  {buyerCredits.totalChatbotMessagesRemaining} Mesaj
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-xs font-bold text-slate-300 mb-3">Aktif Ek Paketleriniz</h4>
              <div className="space-y-2">
                {buyerCredits.activePurchases.map((purchase: any) => {
                  const remAi = Math.max(0, purchase.aiReportLimit - purchase.aiReportUsed);
                  const remChat = Math.max(0, purchase.chatbotMessageLimit - purchase.chatbotMessageUsed);
                  const expiryStr = new Date(purchase.expiresAt).toLocaleDateString("tr-TR");
                  return (
                    <div key={purchase.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 text-xs">
                      <div>
                        <span className="font-bold text-slate-200 block">{purchase.packageCode.replace("_", " ")}</span>
                        <span className="text-[10px] text-slate-400">Son Kullanma Tarihi: {expiryStr}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-orange-400 block">{remAi} AI Rapor</span>
                        <span className="text-[10px] font-mono text-slate-400">{remChat} Chatbot Mesajı</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-950/40 border border-white/5 text-center space-y-3">
            <p className="text-xs text-slate-400">Henüz satın alınmış ek Alıcı Paketiniz bulunmuyor.</p>
            <a
              href="/#buyer-packages"
              className="inline-block px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 text-xs font-bold rounded-xl transition"
            >
              Alıcı Paketlerini İncele (149 TL'den başlayan fiyatlarla)
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
