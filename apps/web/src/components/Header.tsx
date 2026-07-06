"use client";

import React, { useEffect, useState } from "react";

export default function Header() {
  const [user, setUser] = useState<{ email: string; subscriptionTier: string; role?: string } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Ignore corrupt storage
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5 bg-[#0b0f19]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
      <a href="/" className="flex items-center gap-2">
        <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
          TORQUESCOUT
        </span>
      </a>

      <nav className="hidden md:flex items-center gap-8">
        <a href="/" className="text-sm font-semibold text-slate-300 hover:text-orange-500 transition">
          Araç Sorgulama
        </a>
        <a href="/comparison" className="text-sm font-semibold text-slate-300 hover:text-orange-500 transition">
          Araç Karşılaştırma
        </a>
        <a href="/listings" className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-full hover:bg-orange-500/20 transition">
          İlanlar
        </a>
        {user && (
          <a href="/dashboard/listings" className="text-sm font-semibold text-slate-300 hover:text-orange-500 transition">
            İlanlarım
          </a>
        )}
        {user && user.role === 'ADMIN' && (
          <a href="/admin" className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-full hover:bg-red-500/20 transition">
            Admin Paneli
          </a>
        )}
        <a href="/#packages" className="text-sm font-semibold text-slate-300 hover:text-orange-500 transition">
          Abonelik Paketleri
        </a>
      </nav>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-400">Giriş yapıldı:</span>
              <span className="text-sm font-bold text-slate-200">{user.email}</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
              user.subscriptionTier === 'PREMIUM' 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : user.subscriptionTier === 'STANDARD'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {user.subscriptionTier}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
            >
              Çıkış Yap
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition">
              Giriş Yap
            </a>
            <a
              href="/register"
              className="text-sm font-bold px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition"
            >
              Kayıt Ol
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
