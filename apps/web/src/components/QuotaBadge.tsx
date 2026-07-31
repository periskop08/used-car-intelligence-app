"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface QuotaBadgeProps {
  feature: "comparisons" | "aiReports" | "aiChat" | "activeListings";
  label?: string;
  showDetails?: boolean;
  className?: string;
}

export default function QuotaBadge({ feature, label, showDetails = true, className = "" }: QuotaBadgeProps) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    fetch(`${API_URL}/subscriptions/summary`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const defaultSummary = {
    tierName: "Tanışma Paketi",
    isUnlimited: false,
    rights: {
      comparisons: { totalLimit: 3, used: 0, remaining: 3, isUnlimited: false },
      aiReports: { totalLimit: 3, used: 0, remaining: 3, isUnlimited: false },
      aiChat: { totalLimit: 3, used: 0, remaining: 3, isUnlimited: false },
      activeListings: { totalLimit: 1, used: 0, remaining: 1, isUnlimited: false },
      maxVehiclesPerComparison: 2,
      listingDurationDays: 30,
    },
  };

  const activeSummary = summary || defaultSummary;

  const isUnlimited = activeSummary.isUnlimited || activeSummary.rights?.[feature]?.isUnlimited;
  const right = activeSummary.rights?.[feature];
  const remaining = right?.remaining ?? 3;
  const total = right?.totalLimit ?? 3;
  const used = right?.used ?? 0;

  const featureLabels: Record<string, { name: string; icon: string }> = {
    comparisons: { name: "Araç Karşılaştırma Hakkı", icon: "⚖️" },
    aiReports: { name: "AI Araç Raporu Hakkı", icon: "📄" },
    aiChat: { name: "AI Chatbot Mesaj Hakkı", icon: "🤖" },
    activeListings: { name: "Aktif İlan Hakkı", icon: "🚗" },
  };

  const featureMeta = featureLabels[feature] || { name: label || "Kullanım Hakkı", icon: "⚡" };
  const titleName = label || featureMeta.name;

  return (
    <div
      className={`w-full glass border border-white/10 rounded-2xl p-4 bg-slate-900/80 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
          {featureMeta.icon}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">{titleName}</h4>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
              {activeSummary.tierName}
            </span>
          </div>
          {showDetails && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              {feature === "comparisons" && (
                <>Karşılaştırma başına maksimum <strong className="text-slate-200">{activeSummary.rights?.maxVehiclesPerComparison || 2} araç</strong> ekleyebilirsiniz.</>
              )}
              {feature === "activeListings" && (
                <>İlan yayın süreniz <strong className="text-slate-200">{activeSummary.rights?.listingDurationDays || 30} gün</strong>dür.</>
              )}
              {feature === "aiReports" && (
                <>Araç alım sürecinde detaylı teknik ve kronik risk analizi üretir.</>
              )}
              {feature === "aiChat" && (
                <>Mevcut paketiniz ve ek paketlerinizin ortak canlı asistan kotasıdır.</>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Quota Badge Pills */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {isUnlimited ? (
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono tracking-wide">
            ✨ Sınırsız Hak
          </span>
        ) : (
          <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-white/10">
            <span className="text-slate-400 text-xs font-medium">Kalan:</span>
            <span
              className={`text-sm font-black font-mono ${
                remaining > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {remaining} / {total}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
