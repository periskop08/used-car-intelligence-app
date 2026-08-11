'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UnifiedAdminSidebar } from './components/UnifiedAdminSidebar';
import Header from '@/components/Header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken');
    if (!savedToken) {
      router.push('/login?redirect=' + encodeURIComponent(pathname));
      return;
    }

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role !== 'ADMIN' && parsed.role !== 'SUPER_ADMIN' && parsed.role !== 'MODERATOR') {
          setErrorMsg('Bu alana erişim yetkiniz bulunmamaktadır. Yalnızca yetkili yönetici hesapları girebilir.');
          setLoading(false);
        } else {
          setIsAdmin(true);
          setLoading(false);
        }
      } catch (e) {
        setErrorMsg('Oturum bilgisi doğrulanamadı.');
        setLoading(false);
      }
    } else {
      router.push('/login?redirect=' + encodeURIComponent(pathname));
    }
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        <div className="p-8 bg-slate-900/60 border border-white/10 rounded-2xl text-center space-y-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-300">Yönetici yetkileri kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
              🚫
            </div>
            <h1 className="text-lg font-black text-white">Erişim Engellendi</h1>
            <p className="text-xs font-semibold text-rose-300 leading-relaxed">{errorMsg}</p>
            <a
              href="/"
              className="inline-block px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
            >
              Ana Sayfaya Dön
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      <Header />

      <div className="flex-1 flex flex-col lg:flex-row w-full">
        <UnifiedAdminSidebar />
        <main className="flex-1 p-4 lg:p-8 min-w-0 bg-gradient-to-b from-[#03081b] to-[#020617]">
          {children}
        </main>
      </div>
    </div>
  );
}
