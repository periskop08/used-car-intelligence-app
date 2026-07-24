"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { formatImageUrl } from "../utils/media";

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string; subscriptionTier: string; role?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);

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

  const toggleAccordion = (name: string) => {
    setMobileAccordion(mobileAccordion === name ? null : name);
  };

  // Active status helpers
  const isSorgulamaActive = pathname === "/" || pathname === "/comparison";
  const isKesfetActive = pathname === "/vehicle-guide" || pathname === "/aracini-bul";
  const isIlanlarActive = pathname === "/listings" || pathname === "/listings/create" || pathname.startsWith("/listings/");
  const isPaketlerActive = pathname === "/pricing" || pathname === "/#packages";

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
      
      {/* Left: Logo */}
      <a href="/" className="flex items-center gap-2.5 group/logo select-none -skew-x-12 transform group-hover/logo:scale-[1.02] transition duration-300">
        {/* Three horizontal speed capsules (right-aligned for outer-turned speed look) */}
        <div className="flex flex-col items-end gap-[3.5px] mt-[1.5px]">
          <div className="h-[3.5px] w-[16px] bg-sky-500 rounded-full"></div>
          <div className="h-[3.5px] w-[24px] bg-sky-500 rounded-full"></div>
          <div className="h-[3.5px] w-[16px] bg-sky-500 rounded-full"></div>
        </div>
        {/* Brand Text: TorkScoute */}
        <div className="flex items-baseline -ml-0.5 font-sans font-black text-2xl tracking-tight text-white">
          <span>Tork</span>
          <span className="text-sky-500 ml-1">S</span>
          <span className="text-cyan-400">c</span>
          {/* Speedometer inline SVG for letter 'o' */}
          <span className="text-cyan-400 inline-flex items-center mx-[1px] self-center">
            <svg className="w-[17px] h-[17px] stroke-[3.5] stroke-current fill-none" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              {/* Speedometer Ticks */}
              <line x1="7" y1="7" x2="8.5" y2="8.5" strokeWidth="2.5" />
              <line x1="12" y1="3" x2="12" y2="5.5" strokeWidth="2.5" />
              <line x1="17" y1="7" x2="15.5" y2="8.5" strokeWidth="2.5" />
              {/* Indicator Needle */}
              <line x1="12" y1="12" x2="18.5" y2="5.5" strokeWidth="3" />
              {/* Spindle Center Dot */}
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <span className="text-cyan-400">ute</span>
        </div>
      </a>

      {/* Middle: Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8">
        
        {/* 1. Araç Sorgulama Dropdown */}
        <div className="relative group">
          <button className={`text-sm font-semibold transition flex items-center gap-1 cursor-pointer py-1 ${
            isSorgulamaActive ? "text-orange-500 font-bold" : "text-slate-300 hover:text-orange-500"
          }`}>
            <span>Araç Sorgulama</span>
            <span className="text-[8px] opacity-70">▼</span>
          </button>
          <div className="absolute left-0 top-full pt-3 w-52 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 relative">
              <div className="absolute top-0 left-6 -mt-1 w-2.5 h-2.5 bg-[#0b0f19] border-t border-l border-white/10 rotate-45" />
              <a href="/" className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition flex items-center gap-2">
                <span>🔍</span> Araç Sorgulama
              </a>
              <a href="/comparison" className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition flex items-center gap-2">
                <span>⚖️</span> Araç Karşılaştırma
              </a>
            </div>
          </div>
        </div>

        {/* 2. Keşfet Dropdown */}
        <div className="relative group">
          <button className={`text-sm font-semibold transition flex items-center gap-1 cursor-pointer py-1 ${
            isKesfetActive ? "text-orange-500 font-bold" : "text-slate-300 hover:text-orange-500"
          }`}>
            <span>Keşfet</span>
            <span className="text-[8px] opacity-70">▼</span>
          </button>
          <div className="absolute left-0 top-full pt-3 w-52 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 relative">
              <div className="absolute top-0 left-6 -mt-1 w-2.5 h-2.5 bg-[#0b0f19] border-t border-l border-white/10 rotate-45" />
              <a href="/vehicle-guide" className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition flex items-center gap-2">
                <span>📖</span> Araç Rehberi
              </a>
              <a href="/aracini-bul" className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition flex items-center gap-2">
                <span>🧭</span> Aracını Bul
              </a>
              <a href="/kesfet/ilan-akisi" className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition flex items-center gap-2">
                <span>🎞️</span> İlan Akışı
              </a>
            </div>
          </div>
        </div>

        {/* 3. İlanlar Dropdown */}
        <div className="relative group">
          <button className={`text-sm font-semibold transition flex items-center gap-1 cursor-pointer py-1 ${
            isIlanlarActive ? "text-orange-500 font-bold" : "text-slate-300 hover:text-orange-500"
          }`}>
            <span>İlanlar</span>
            <span className="text-[8px] opacity-70">▼</span>
          </button>
          <div className="absolute left-0 top-full pt-3 w-52 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 relative">
              <div className="absolute top-0 left-6 -mt-1 w-2.5 h-2.5 bg-[#0b0f19] border-t border-l border-white/10 rotate-45" />
              <a href="/listings" className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition flex items-center gap-2">
                <span>🚗</span> Tüm İlanlar
              </a>
              <a href="/listings/create" className="px-4 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition flex items-center gap-2">
                <span>➕</span> İlan Ver
              </a>
            </div>
          </div>
        </div>

        {/* 4. Paketler */}
        <a href="/pricing" className={`text-sm font-semibold transition ${
          isPaketlerActive ? "text-orange-500 font-bold" : "text-slate-300 hover:text-orange-500"
        }`}>
          Paketler
        </a>

      </nav>

      {/* Right side area: profile or login */}
      <div className="flex items-center gap-4">
        
        {/* User profile dropdown or Sign In */}
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
              <span className="text-[10px] text-slate-500">▼</span>
            </button>

            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-3 w-56 bg-[#0b0f19]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="absolute top-0 right-6 -mt-1 w-2.5 h-2.5 bg-[#0b0f19] border-t border-l border-white/10 rotate-45" />
                  
                  <div className="px-3 py-2.5 border-b border-white/5 mb-1 flex flex-col">
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

                  {user.role === 'ADMIN' && (
                    <a
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-550/5 hover:bg-red-500/10 transition mb-1"
                    >
                      <span>🛠️ Admin Paneli</span>
                      <span>→</span>
                    </a>
                  )}

                  <a
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <span>Dashboard</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/dashboard/listings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <span>İlanlarım</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/dashboard/favorites"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <span>Favori İlanlarım</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/dashboard/favorites/reports"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <span>Favori Raporlarım</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/dashboard/messages"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <span>Mesajlarım</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/dashboard/subscription"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <span>Paketim</span>
                    <span className="text-slate-500">→</span>
                  </a>

                  <a
                    href="/dashboard/account/personal-info"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
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
          <div className="hidden md:flex items-center gap-3">
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

        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex items-center justify-center p-2 rounded-xl border border-white/10 hover:border-orange-500/40 text-slate-300 hover:text-white transition cursor-pointer"
        >
          {mobileMenuOpen ? (
            <span className="text-lg">✕</span>
          ) : (
            <span className="text-lg">☰</span>
          )}
        </button>

      </div>

      {/* Mobile Drawer (Menu Overlay) */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 top-[77px] bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-[77px] right-0 bottom-0 w-80 bg-[#070b14]/95 backdrop-blur-xl border-l border-white/5 shadow-2xl p-6 flex flex-col gap-6 overflow-y-auto z-40 md:hidden animate-in slide-in-from-right duration-300">
            
            {/* Mobile Accordion Menu */}
            <div className="flex flex-col gap-4">
              
              {/* 1. Araç Sorgulama Accordion */}
              <div className="flex flex-col border-b border-white/5 pb-3">
                <button
                  onClick={() => toggleAccordion("sorgulama")}
                  className={`w-full flex items-center justify-between text-left text-sm font-bold transition py-2 ${
                    isSorgulamaActive ? "text-orange-400" : "text-slate-200"
                  }`}
                >
                  <span>Araç Sorgulama</span>
                  <span className="text-xs">{mobileAccordion === "sorgulama" ? "▲" : "▼"}</span>
                </button>
                {mobileAccordion === "sorgulama" && (
                  <div className="flex flex-col gap-3 pl-4 mt-2 animate-in fade-in duration-200">
                    <a href="/" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                      🔍 Araç Sorgulama
                    </a>
                    <a href="/comparison" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                      ⚖️ Araç Karşılaştırma
                    </a>
                  </div>
                )}
              </div>

              {/* 2. Keşfet Accordion */}
              <div className="flex flex-col border-b border-white/5 pb-3">
                <button
                  onClick={() => toggleAccordion("kesfet")}
                  className={`w-full flex items-center justify-between text-left text-sm font-bold transition py-2 ${
                    isKesfetActive ? "text-orange-400" : "text-slate-200"
                  }`}
                >
                  <span>Keşfet</span>
                  <span className="text-xs">{mobileAccordion === "kesfet" ? "▲" : "▼"}</span>
                </button>
                {mobileAccordion === "kesfet" && (
                  <div className="flex flex-col gap-3 pl-4 mt-2 animate-in fade-in duration-200">
                    <a href="/vehicle-guide" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                      📖 Araç Rehberi
                    </a>
                    <a href="/aracini-bul" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                      🧭 Aracını Bul
                    </a>
                    <a href="/kesfet/ilan-akisi" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                      🎞️ İlan Akışı
                    </a>
                  </div>
                )}
              </div>

              {/* 3. İlanlar Accordion */}
              <div className="flex flex-col border-b border-white/5 pb-3">
                <button
                  onClick={() => toggleAccordion("ilanlar")}
                  className={`w-full flex items-center justify-between text-left text-sm font-bold transition py-2 ${
                    isIlanlarActive ? "text-orange-400" : "text-slate-200"
                  }`}
                >
                  <span>İlanlar</span>
                  <span className="text-xs">{mobileAccordion === "ilanlar" ? "▲" : "▼"}</span>
                </button>
                {mobileAccordion === "ilanlar" && (
                  <div className="flex flex-col gap-3 pl-4 mt-2 animate-in fade-in duration-200">
                    <a href="/listings" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                      🚗 Tüm İlanlar
                    </a>
                    <a href="/listings/create" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                      ➕ İlan Ver
                    </a>
                  </div>
                )}
              </div>

              {/* 4. Paketler */}
              <div className="border-b border-white/5 pb-3 py-2">
                <a
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-bold transition block ${
                    isPaketlerActive ? "text-orange-400" : "text-slate-200 hover:text-orange-400"
                  }`}
                >
                  Paketler
                </a>
              </div>

              {/* 5. Hesabım Accordion (Only visible when logged in) */}
              {user ? (
                <div className="flex flex-col border-b border-white/5 pb-3">
                  <button
                    onClick={() => toggleAccordion("hesap")}
                    className="w-full flex items-center justify-between text-left text-sm font-bold text-slate-200 transition py-2"
                  >
                    <span>Hesabım</span>
                    <span className="text-xs">{mobileAccordion === "hesap" ? "▲" : "▼"}</span>
                  </button>
                  {mobileAccordion === "hesap" && (
                    <div className="flex flex-col gap-3 pl-4 mt-2 animate-in fade-in duration-200">
                      <a href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                        Dashboard
                      </a>
                      <a href="/dashboard/listings" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                        İlanlarım
                      </a>
                      <a href="/dashboard/favorites" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                        Favori İlanlarım
                      </a>
                      <a href="/dashboard/favorites/reports" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                        Favori Raporlarım
                      </a>
                      <a href="/dashboard/messages" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                        Mesajlarım
                      </a>
                      <a href="/dashboard/subscription" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                        Paketim
                      </a>
                      <a href="/dashboard/account/personal-info" onClick={() => setMobileMenuOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition">
                        Kişisel Bilgilerim
                      </a>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="text-left text-xs font-bold text-red-400 hover:text-red-300 transition mt-1"
                      >
                        Çıkış Yap
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-2">
                  <a
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-200 hover:bg-white/5 transition"
                  >
                    Giriş Yap
                  </a>
                  <a
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-sm font-bold text-white transition shadow-lg shadow-orange-500/10"
                  >
                    Kayıt Ol
                  </a>
                </div>
              )}

            </div>

          </div>
        </>
      )}

    </header>
  );
}
