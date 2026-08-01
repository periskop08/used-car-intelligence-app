"use client";

import React from "react";

interface EngagementData {
  range: string;
  visitors: number;
  uniqueCommenters: number;
  totalComments: number;
  averageCommentsPerPost: number;
}

export default function ClubEngagementSummary({ summary }: { summary?: EngagementData }) {
  if (!summary) return null;

  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <div>
            <h3 className="text-sm font-black text-white">Club Etkileşim Özeti</h3>
            <p className="text-[11px] text-slate-400">Topluluk hareketliliği ve katılım durumu</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300">
          {summary.range} Trendi
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 my-2">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-[11px] text-slate-400 font-bold block">Tahmini Ziyaretçi</span>
          <span className="text-xl font-black text-white">{summary.visitors.toLocaleString("tr-TR")}</span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-[11px] text-slate-400 font-bold block">Tekil Yorumcu</span>
          <span className="text-xl font-black text-emerald-400">
            {summary.uniqueCommenters.toLocaleString("tr-TR")}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-[11px] text-slate-400 font-bold block">Dönem İçi Yorum</span>
          <span className="text-xl font-black text-orange-400">
            {summary.totalComments.toLocaleString("tr-TR")}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-[11px] text-slate-400 font-bold block">Gönderi Başı Yorum</span>
          <span className="text-xl font-black text-blue-400">{summary.averageCommentsPerPost}</span>
        </div>
      </div>
    </div>
  );
}
