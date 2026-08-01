"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const tabs = [
  { key: "overview", label: "Genel Bakış", href: "/admin/club", icon: "📊" },
  { key: "posts", label: "Gönderiler", href: "/admin/club/posts", icon: "📝" },
  { key: "comments", label: "Yorumlar", href: "/admin/club/comments", icon: "💬" },
  { key: "users", label: "Kullanıcılar", href: "/admin/club/users", icon: "👤" },
  { key: "moderators", label: "Moderatörler", href: "/admin/club/moderators", icon: "🛡️" },
  { key: "restrictions", label: "Susturma ve Ban", href: "/admin/club/restrictions", icon: "🚫" },
  { key: "messages", label: "Mesajlar", href: "/admin/club/messages", icon: "✉️", adminOnly: true },
  { key: "reports", label: "Raporlar", href: "/admin/club/reports", icon: "📈", adminOnly: true },
  { key: "audit-log", label: "Audit Log", href: "/admin/club/audit-log", icon: "📋", adminOnly: true },
  { key: "settings", label: "Ayarlar", href: "/admin/club/settings", icon: "⚙️", adminOnly: true },
];

export default function AdminClubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login?redirect=/admin/club");
      return;
    }

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (!user) {
          router.push("/login?redirect=/admin/club");
          return;
        }
        setUserRole(user.role);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-sm font-semibold">Tork Scout Club Operasyon Merkezi Yükleniyor...</p>
      </div>
    );
  }

  const isModerator = userRole === "MODERATOR";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white">
      {/* Top Banner Header */}
      <div className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              🛡️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">Tork Scout Club</h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Operasyon ve Yönetim Merkezi v3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Topluluk içeriklerini, moderasyon onay kuyruklarını ve kullanıcı kısıtlamalarını yönetin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Link
              href="/club"
              className="glass px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:text-white hover:border-white/20 transition flex items-center gap-2"
            >
              <span>⬅️</span> Club Akışına Dön
            </Link>
            {!isModerator && (
              <Link
                href="/admin/club/posts/new"
                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-orange-600/20 transition flex items-center gap-2"
              >
                <span>➕</span> Yeni Gönderi Oluştur
              </Link>
            )}
          </div>
        </div>

        {/* Nested Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto custom-scrollbar border-t border-white/5 py-2">
          {tabs.map((tab) => {
            if (tab.adminOnly && isModerator) return null;
            const isActive =
              tab.href === "/admin/club"
                ? pathname === "/admin/club"
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Page Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
