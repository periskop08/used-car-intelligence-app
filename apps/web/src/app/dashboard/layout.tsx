"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "../../components/Header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface MenuItem {
  name: string;
  href: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: "İlan Yönetimi",
    items: [
      { name: "İlanlarım", href: "/dashboard/listings" },
      { name: "İlan Ekle", href: "/listings/create" },
    ],
  },
  {
    title: "Favorilerim",
    items: [
      { name: "Favori İlanlarım", href: "/dashboard/favorites" },
      { name: "Favori Satıcılarım", href: "/dashboard/favorites/sellers" },
      { name: "Favori Aramalarım", href: "/dashboard/favorites/searches" },
    ],
  },
  {
    title: "Mesajlar",
    items: [
      { name: "Mesajlarım", href: "/dashboard/messages" },
    ],
  },
  {
    title: "Abonelik",
    items: [
      { name: "Paketim", href: "/dashboard/subscription" },
      { name: "Paket Haklarım", href: "/dashboard/subscription/rights" },
    ],
  },
  {
    title: "Hesap",
    items: [
      { name: "Kişisel Bilgilerim", href: "/dashboard/account/personal-info" },
      { name: "E-posta Adresi", href: "/dashboard/account/email" },
      { name: "Telefon Numarası", href: "/dashboard/account/phone" },
      { name: "Şifre Değiştir", href: "/dashboard/account/password" },
      { name: "Bildirim Ayarları", href: "/dashboard/account/notifications" },
      { name: "Hesap Güvenliği", href: "/dashboard/account/security" },
      { name: "Hesap İptali", href: "/dashboard/account/cancel" },
    ],
  },
  {
    title: "Destek",
    items: [
      { name: "Yardım Merkezi", href: "/dashboard/support/help" },
      { name: "Geri Bildirim Gönder", href: "/dashboard/support/feedback" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Load user profile & verify status
    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Oturum doğrulanamadı.");
        }
        return res.json();
      })
      .then((data) => {
        if (!data.isActive) {
          localStorage.removeItem("user");
          localStorage.removeItem("accessToken");
          router.push("/login?error=inactive");
          return;
        }
        setProfile(data);
        // Sync local storage user
        localStorage.setItem("user", JSON.stringify({
          email: data.email,
          subscriptionTier: data.subscriptionTier,
          role: data.role,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          profilePhotoUrl: data.profilePhotoUrl,
          displayNamePreference: data.displayNamePreference,
        }));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Profile load error:", err);
        // Fallback to offline localstorage if API is down
        const localUser = localStorage.getItem("user");
        if (localUser) {
          setProfile(JSON.parse(localUser));
          setLoading(false);
        } else {
          localStorage.removeItem("accessToken");
          router.push("/login");
        }
      });
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-400">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Profile summary */}
      {profile && (
        <div className="p-4 border-b border-white/5 flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-orange-600/20 border border-orange-500/30 flex items-center justify-center font-bold text-orange-400">
            {profile.profilePhotoUrl ? (
              <img src={profile.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (profile.firstName || profile.email).slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-slate-200 truncate">
              {profile.firstName && profile.lastName 
                ? `${profile.firstName} ${profile.lastName}` 
                : profile.username || profile.email.split("@")[0]}
            </span>
            <span className="text-[10px] text-slate-500 truncate">{profile.email}</span>
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="flex-1 overflow-y-auto space-y-6 px-2 pr-3 custom-scrollbar">
        {MENU_GROUPS.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <span className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              {group.title}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item, iIdx) => {
                const isActive = pathname === item.href;
                return (
                  <a
                    key={iIdx}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {item.name}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-white/5 mt-auto">
        <button
          onClick={handleLogout}
          className="w-full py-2.5 rounded-xl text-xs font-black text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition text-center block cursor-pointer"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      <Header />

      <div className="flex-1 max-w-7xl w-full mx-auto flex px-4 py-8 gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-4 sticky top-28 h-[calc(100vh-160px)]">
          {renderSidebarContent()}
        </aside>

        {/* Mobile menu button and Drawer */}
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-14 h-14 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-xl shadow-orange-500/25 transition cursor-pointer"
          >
            {mobileMenuOpen ? (
              <span className="text-xl">✕</span>
            ) : (
              <span className="text-xl">☰</span>
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-30 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-72 bg-[#090d1a] border-r border-white/5 h-full p-4 flex flex-col z-10 animate-in slide-in-from-left duration-250">
              {renderSidebarContent()}
            </div>
          </div>
        )}

        {/* Content area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
