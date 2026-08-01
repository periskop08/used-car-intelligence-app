"use client";

import React from "react";

interface EngagementData {
  range?: string;
  postViews?: number;
  totalComments?: number;
  uniqueActiveUsers?: number;
  clubVisitors?: number;
  trends?: {
    postViews?: number;
    comments?: number;
    activeUsers?: number;
    visitors?: number;
  };
}

export default function ClubEngagementSummary({ summary }: { summary?: EngagementData }) {
  const data = {
    postViews: summary?.postViews ?? 2384,
    totalComments: summary?.totalComments ?? 184,
    uniqueActiveUsers: summary?.uniqueActiveUsers ?? 156,
    clubVisitors: summary?.clubVisitors ?? 412,
    trends: {
      postViews: summary?.trends?.postViews ?? 18.6,
      comments: summary?.trends?.comments ?? 12.3,
      activeUsers: summary?.trends?.activeUsers ?? 10.2,
      visitors: summary?.trends?.visitors ?? 8.4,
    },
  };

  const metrics = [
    { label: "Gönderi Görüntüleme", value: data.postViews, trend: data.trends.postViews, color: "text-blue-400" },
    { label: "Yorum", value: data.totalComments, trend: data.trends.comments, color: "text-orange-400" },
    { label: "Tekil Aktif Üye", value: data.uniqueActiveUsers, trend: data.trends.activeUsers, color: "text-emerald-400" },
    { label: "Club Ziyaretçisi", value: data.clubVisitors, trend: data.trends.visitors, color: "text-purple-400" },
  ];

  return (
    <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <h3 className="text-sm font-black text-white">Son 7 Gün Etkileşim Özeti</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Europe/Istanbul (UTC+3)</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block truncate">{m.label}</span>
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-lg font-black ${m.color}`}>
                {m.value.toLocaleString("tr-TR")}
              </span>
              <span className="text-[10px] font-bold font-mono text-emerald-400">
                ↑ %{m.trend}
              </span>
            </div>

            {/* Sparkline SVG */}
            <svg className="w-full h-5 stroke-current opacity-60 overflow-visible" viewBox="0 0 100 20">
              <path
                d="M 0 15 Q 25 5, 50 12 T 100 3"
                fill="none"
                strokeWidth="2"
                className={m.color}
              />
            </svg>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-500 text-right">
        <span>Son 7 gün, önceki 7 güne göre karşılaştırmadır.</span>
      </div>
    </div>
  );
}
