"use client";

import React, { useEffect, useState } from "react";
import { formatImageUrl } from "../utils/media";

export default function Header() {
  const [user, setUser] = useState<{ email: string; subscriptionTier: string; role?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
    <header className="sticky top-0 z-50 glass border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
      <a href="/" className="flex items-center gap-3 group/logo">
        <img 
          src="/logo.png" 
          alt="TorqueScout" 
          className="h-11 w-auto transform group-hover/logo:scale-[1.03] transition duration-300"
        />
      </a>

      <nav className="hidden md:flex items-center gap-8">
        <div className="relative group">
          <button className="text-sm font-semibold text-slate-300 hover:text-orange-500 transition flex items-center gap-1.5 cursor-pointer py-1">
            <span>Araç Sorgulama</span>
            <span className="text-[9px] text-slate-550 group-hover:text-orange-500 transition">▼</span>
          </button>
          <div className="absolute left-0 top-full pt-2 w-44 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="bg-[#090d1a] border border-white/5 rounded-2xl shadow-2xl p-2 flex flex-col gap-1">
              <a href="/" className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-slate-100 transition">
                🔍 Araç Sorgula
              </a>
              <a href="/add-vehicle" className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-slate-100 transition">
                ➕ Araç Ekle
              </a>
            </div>
          </div>
        </div>
        <a href="/comparison" className="text-sm font-semibold text-slate-300 hover:text-orange-500 transition">
          Araç Karşılaştırma
        </a>
        <a href="/vehicle-guide" className="text-sm font-semibold text-slate-300 hover:text-orange-500 transition">
          Araç Rehberi
        </a>
        <div className="relative group">
          <button className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3.5 py-1.5 rounded-full hover:bg-orange-500/20 transition flex items-center gap-1.5 cursor-pointer">
            <span>İlanlar</span>
            <span className="text-[8px] text-orange-400/80">▼</span>
          </button>
          <div className="absolute left-0 top-full pt-2 w-44 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="bg-[#090d1a] border border-white/5 rounded-2xl shadow-2xl p-2 flex flex-col gap-1">
              <a href="/listings" className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-slate-100 transition">
                🚗 İlanları İncele
              </a>
              <a href="/listings/create" className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-slate-100 transition">
                ➕ İlan Ekle
              </a>
            </div>
          </div>
        </div>
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
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 bg-slate-900/60 border border-white/10 px-4 py-2 rounded-2xl hover:border-orange-500/50 transition cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-orange-600/25 border border-orange-500/30 flex items-center justify-center font-black text-orange-400 text-sm">
                {(user as any).profilePhotoUrl ? (
                  <img src={formatImageUrl((user as any).profilePhotoUrl)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  ((user as any).firstName || user.email).slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex flex-col items-start hidden sm:flex">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Hoş Geldiniz</span>
                <span className="text-xs font-bold text-slate-200">
                  {(() => {
                    const u = user as any;
                    if (u.displayNamePreference === "USERNAME" && u.username) return u.username;
                    if (u.displayNamePreference === "SHORT_NAME" && u.firstName) {
                      return `${u.firstName} ${u.lastName ? u.lastName[0] + '.' : ''}`.trim();
                    }
                    if (u.firstName || u.lastName) {
                      return `${u.firstName || ''} ${u.lastName || ''}`.trim();
                    }
                    return u.email.split('@')[0];
                  })()}
                </span>
              </div>
              <span className="text-xs text-slate-500">▼</span>
            </button>

            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-56 bg-[#090d1a] border border-white/5 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-white/5 mb-1 flex flex-col">
                    <span className="text-xs text-slate-400 truncate font-semibold">{user.email}</span>
                    <span className={`text-[9px] w-fit mt-1 px-1.5 py-0.5 rounded font-mono font-bold ${
                      user.subscriptionTier === 'PREMIUM' 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                        : user.subscriptionTier === 'STANDARD'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {user.subscriptionTier}
                    </span>
                  </div>

                  <a
                    href="/dashboard/listings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-slate-100 transition"
                  >
                    <span>İlanlarım</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/listings/create"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-slate-100 transition"
                  >
                    <span>İlan Ekle</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/dashboard/favorites"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-slate-100 transition"
                  >
                    <span>Favorilerim</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/dashboard/messages"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-slate-100 transition"
                  >
                    <span>Mesajlarım</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/dashboard/subscription"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-slate-100 transition"
                  >
                    <span>Paketim</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/dashboard/account/personal-info"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-slate-100 transition"
                  >
                    <span>Kişisel Bilgilerim</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <div className="border-t border-white/5 my-1" />

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition"
                  >
                    Çıkış Yap
                  </button>
                </div>
              </>
            )}
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
