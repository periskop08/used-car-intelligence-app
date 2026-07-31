"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function RightsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;

    fetch(`${API_URL}/subscriptions/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const rights = summary?.rights || {};
  const isUnlimited = summary?.isUnlimited;

  const rightsList = [
    {
      key: "aiReports",
      title: "AI Araç Raporu Hakkı",
      icon: "📄",
      description: "Araçlar için üretilen kapsamlı teknik ve kronik arıza riski analizleri",
      data: rights.aiReports,
      unit: "Rapor",
    },
    {
      key: "aiChat",
      title: "AI Chatbot Mesaj Hakkı",
      icon: "🤖",
      description: "Araç karşılaştırma ve rapor detaylarında canlı yapay zeka danışman sohbet hakkı",
      data: rights.aiChat,
      unit: "Mesaj",
    },
    {
      key: "activeListings",
      title: "Aktif İlan Hakkı",
      icon: "🚗",
      description: "Aynı anda yayında tutabileceğiniz toplam aktif ilan kotanız",
      data: rights.activeListings,
      unit: "İlan",
    },
    {
      key: "comparisons",
      title: "Araç Karşılaştırma Hakkı",
      icon: "⚖️",
      description: "Detaylı araç karşılaştırma motorunu çalıştırma kotanız",
      data: rights.comparisons,
      unit: "Karşılaştırma",
    },
    {
      key: "vitrinListings",
      title: "Vitrin İlan Hakkı",
      icon: "⭐",
      description: "İlanlarınızı öne çıkarmak için ayrılan vitrin hakkı",
      data: rights.vitrinListings,
      unit: "Vitrin",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass border border-white/10 p-6 rounded-3xl bg-[#090d1a]/80 backdrop-blur-xl">
        <div>
          <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            {summary?.tierName || "Paketiniz"}
          </span>
          <h1 className="text-2xl font-black text-slate-100 mt-2">Paket Haklarım ve Limitlerim</h1>
          <p className="text-slate-400 text-xs mt-1">
            Mevcut paketinizin kullanım kotasını ve kalan tanımlı tüm haklarınızı anlık olarak takip edin.
          </p>
        </div>
        <div>
          <a
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg transition"
          >
            🚀 Paketi Yükselt
          </a>
        </div>
      </div>

      {/* Grid of All Defined Rights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rightsList.map((item) => {
          const itemData = item.data || { totalLimit: 0, used: 0, remaining: 0 };
          const itemUnlimited = isUnlimited || itemData.isUnlimited;
          const used = itemData.used || 0;
          const total = itemData.totalLimit || 0;
          const remaining = itemData.remaining || 0;
          const percent = itemUnlimited ? 0 : total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 100;

          return (
            <div
              key={item.key}
              className="glass border border-white/10 p-6 rounded-3xl bg-slate-900/60 backdrop-blur-md space-y-4 hover:border-white/20 transition flex flex-col justify-between shadow-xl"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
                      {item.icon}
                    </span>
                    <h3 className="text-sm font-black text-slate-100">{item.title}</h3>
                  </div>

                  {itemUnlimited ? (
                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full font-mono">
                      ✨ Sınırsız
                    </span>
                  ) : (
                    <span
                      className={`px-3 py-1 text-xs font-black rounded-full font-mono border ${
                        remaining > 0
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}
                    >
                      {remaining} Kalan
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              </div>

              {!itemUnlimited && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-300">
                    <span>Kullanım Oranı</span>
                    <span className="text-slate-200">
                      {used} / {total} {item.unit} (%{percent})
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percent >= 90 ? "bg-red-500" : "bg-gradient-to-r from-orange-600 to-orange-400"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rules & Durations Summary */}
      <div className="glass border border-white/10 p-6 rounded-3xl bg-slate-950/80 space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
          ⚙️ Tanımlı Kurallar ve Süre Limitleri
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold text-slate-300">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">İlan Yayın Süresi</span>
            <span className="text-sm font-black text-orange-400">{rights.listingDurationDays || 30} Gün</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Karşılaştırma Başına Araç</span>
            <span className="text-sm font-black text-orange-400">Max {rights.maxVehiclesPerComparison || 2} Araç</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Pasif İlan Saklama Süresi</span>
            <span className="text-sm font-black text-slate-200">15 Gün</span>
          </div>
        </div>
      </div>
    </div>
  );
}
