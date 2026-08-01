"use client";

import React from "react";

interface ActivityItem {
  id: string;
  action: string;
  targetType: string;
  reason?: string;
  createdAt: string;
  actor?: { username?: string; firstName?: string; lastName?: string };
}

export default function RecentClubActivity({ activities }: { activities: ActivityItem[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
        <p className="text-xs text-slate-400">Son yönetim aktivitesi bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="text-sm font-black text-white">Son Yönetim Aktiviteleri</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {activities.map((item) => (
          <div key={item.id} className="flex items-start gap-3 text-xs">
            <span className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 mt-0.5">
              ⚡
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-slate-200 font-medium">
                <span className="font-bold text-orange-400">
                  {item.actor?.username || item.actor?.firstName || "Moderatör"}
                </span>{" "}
                - <span className="font-mono text-slate-300">{item.action}</span> ({item.targetType})
              </p>
              {item.reason && <p className="text-[11px] text-slate-400 mt-0.5">"{item.reason}"</p>}
              <span className="text-[10px] text-slate-500 block mt-1">
                {new Date(item.createdAt).toLocaleString("tr-TR")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
