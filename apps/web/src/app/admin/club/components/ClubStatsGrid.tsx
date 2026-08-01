"use client";

import React from "react";
import Link from "next/link";

export type ClubDashboardStatKey =
  | "TOTAL_POSTS"
  | "PUBLISHED_POSTS"
  | "TOTAL_COMMENTS"
  | "PENDING_COMMENTS"
  | "ACTIVE_MODERATORS"
  | "ACTIVE_MUTES"
  | "ACTIVE_BANS";

export interface ClubDashboardStat {
  key: ClubDashboardStatKey;
  label: string;
  value: number;
  secondaryText?: string;
  trend?: {
    value: number;
    direction: "UP" | "DOWN" | "FLAT";
    period: string;
  };
  severity?: "NORMAL" | "INFO" | "WARNING" | "CRITICAL";
}

const statRoutes: Record<ClubDashboardStatKey, string> = {
  TOTAL_POSTS: "/admin/club/posts",
  PUBLISHED_POSTS: "/admin/club/posts?status=PUBLISHED",
  TOTAL_COMMENTS: "/admin/club/comments",
  PENDING_COMMENTS: "/admin/club/comments?status=PENDING_REVIEW",
  ACTIVE_MODERATORS: "/admin/club/moderators",
  ACTIVE_MUTES: "/admin/club/restrictions?type=MUTE&status=ACTIVE",
  ACTIVE_BANS: "/admin/club/restrictions?type=BAN&status=ACTIVE",
};

const statIcons: Record<ClubDashboardStatKey, string> = {
  TOTAL_POSTS: "📝",
  PUBLISHED_POSTS: "🌐",
  TOTAL_COMMENTS: "💬",
  PENDING_COMMENTS: "⏳",
  ACTIVE_MODERATORS: "🛡️",
  ACTIVE_MUTES: "🔇",
  ACTIVE_BANS: "🚫",
};

export default function ClubStatsGrid({ stats }: { stats: ClubDashboardStat[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const href = statRoutes[stat.key] || "/admin/club";
        const icon = statIcons[stat.key] || "📊";

        let borderClass = "border-white/10 hover:border-white/20";
        let bgClass = "bg-slate-900/60";
        let textClass = "text-white";

        if (stat.severity === "WARNING" && stat.value > 0) {
          borderClass = "border-amber-500/40 hover:border-amber-500/60 shadow-lg shadow-amber-500/10";
          bgClass = "bg-amber-950/20";
          textClass = "text-amber-400";
        } else if (stat.severity === "CRITICAL" && stat.value > 0) {
          borderClass = "border-rose-500/40 hover:border-rose-500/60 shadow-lg shadow-rose-500/10";
          bgClass = "bg-rose-950/20";
          textClass = "text-rose-400";
        } else if (stat.severity === "INFO") {
          borderClass = "border-blue-500/30 hover:border-blue-500/50";
          bgClass = "bg-blue-950/20";
          textClass = "text-blue-400";
        }

        return (
          <Link
            key={stat.key}
            href={href}
            className={`group p-5 rounded-2xl border ${borderClass} ${bgClass} transition-all transform hover:-translate-y-0.5 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition">
                  {stat.label}
                </span>
                <span className="text-xl p-2 rounded-xl bg-white/5 border border-white/10">{icon}</span>
              </div>
              <div className={`text-3xl font-black ${textClass} tracking-tight mb-1`}>
                {stat.value.toLocaleString("tr-TR")}
              </div>
            </div>

            {stat.secondaryText && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate">{stat.secondaryText}</span>
                <span className="text-orange-400 group-hover:translate-x-0.5 transition">➡️</span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
