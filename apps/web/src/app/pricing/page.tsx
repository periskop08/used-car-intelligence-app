"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface UserProfile {
  id: string;
  subscriptionTier: string;
  email: string;
}

export default function PricingPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingPackage, setBuyingPackage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setProfile(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rawTier = profile?.subscriptionTier || "TANISMA";
  const currentTier =
    rawTier === "FREE" ? "TANISMA" : rawTier === "STANDARD" ? "YETKIN" : rawTier === "PREMIUM" ? "PROFESYONEL" : rawTier;

  const handleSubscribe = async (tierCode: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      window.location.href = `/login?redirect=/pricing`;
      return;
    }

    setBuyingPackage(tierCode);
    try {
      const res = await fetch(`${API_URL}/subscriptions/upgrade`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier: tierCode }),
      });

      if (res.ok) {
        alert("Abonelik paketiniz başarıyla güncellendi!");
        window.location.href = "/dashboard/subscription";
      } else {
        const err = await res.json();
        alert(err.message || "Abonelik işlemi gerçekleştirilemedi.");
      }
    } catch (e) {
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setBuyingPackage(null);
    }
  };

  return (
    <div className="w-full bg-[#060813] text-slate-100 selection:bg-orange-500 selection:text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Page Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
            <span>💎</span> TorqueScout Üyelik Paketleri
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            İhtiyacınıza Uygun <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">Planı Seçin</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 font-medium">
            AI destekli araç analiz raporları, sınırsız kronik sorun sorgulama ve vitrin ilanları ile araç alım-satımında 1-0 öne geçin.
          </p>

          {profile && (
            <div className="pt-2">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs">
                <span className="text-slate-400">Aktif Paketiniz:</span>
                <span className="font-black text-orange-400">{currentTier} PAKETİ</span>
                <Link
                  href="/dashboard/subscription/rights"
                  className="ml-2 font-bold text-slate-300 hover:text-white underline"
                >
                  Paket Haklarımı Gör ➡️
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 1. Monthly Subscription Tiers */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white">Aylık Abonelik Paketleri</h2>
            <p className="text-xs text-slate-400">Aylık yenilenen araç sorgulama ve rapor hakları.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tanışma Card */}
            <div className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
              currentTier === "TANISMA"
                ? "bg-slate-900/90 border-2 border-orange-500/50 shadow-2xl shadow-orange-500/10"
                : "bg-slate-900/60 border border-white/10 hover:border-white/20"
            }`}>
              {currentTier === "TANISMA" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  Mevcut Paketiniz
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Başlangıç</span>
                  <h3 className="text-2xl font-black text-white mt-1">Tanışma Paketi</h3>
                  <p className="text-xs text-slate-400 mt-2">Platformu keşfetmek ve temel sorgulamalar yapmak isteyen bireysel kullanıcılar için.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">Ücretsiz</span>
                  <span className="text-xs text-slate-400 font-bold">/ Süresiz</span>
                </div>

                <div className="border-t border-white/10 pt-6 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-emerald-400 font-bold">✓</span> 3 Araç Karşılaştırma Hakkı
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-emerald-400 font-bold">✓</span> 3 AI Chatbot Soru Hakkı
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-emerald-400 font-bold">✓</span> 1 Detaylı AI Araç Analiz Raporu
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-emerald-400 font-bold">✓</span> 1 Aktif İlan Yayınlama Hakkı
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 line-through">
                    <span>✕</span> Vitrin İlanı (Pakette Yok)
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button
                  disabled={currentTier === "TANISMA"}
                  onClick={() => handleSubscribe("TANISMA")}
                  className={`w-full py-3.5 rounded-2xl text-xs font-bold transition shadow-md ${
                    currentTier === "TANISMA"
                      ? "bg-slate-800 text-slate-400 cursor-default"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {currentTier === "TANISMA" ? "Mevcut Planınız" : "Ücretsiz Başla"}
                </button>
              </div>
            </div>

            {/* Yetkin Card (POPULAR) */}
            <div className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
              currentTier === "YETKIN"
                ? "bg-gradient-to-b from-orange-950/40 via-slate-900/90 to-slate-900/90 border-2 border-orange-500 shadow-2xl shadow-orange-500/20"
                : "bg-slate-900/80 border-2 border-orange-500/40 hover:border-orange-500 shadow-xl shadow-orange-500/5"
            }`}>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                🔥 En Çok Tercih Edilen
              </span>

              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">Standart Plan</span>
                  <h3 className="text-2xl font-black text-white mt-1">Yetkin Paket</h3>
                  <p className="text-xs text-slate-300 mt-2">Aktif olarak araç arayan, piyasa takibi yapan ve detaylı kronik problem analizi isteyenler için.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">499 TL</span>
                  <span className="text-xs text-slate-400 font-bold">/ ay</span>
                </div>

                <div className="border-t border-white/10 pt-6 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-100 font-semibold">
                    <span className="text-orange-400 font-bold">✓</span> 20 Araç Karşılaştırma Hakkı
                  </div>
                  <div className="flex items-center gap-2 text-slate-100 font-semibold">
                    <span className="text-orange-400 font-bold">✓</span> 50 AI Chatbot Soru Hakkı
                  </div>
                  <div className="flex items-center gap-2 text-slate-100 font-semibold">
                    <span className="text-orange-400 font-bold">✓</span> 5 Detaylı AI Araç Analiz Raporu
                  </div>
                  <div className="flex items-center gap-2 text-slate-100 font-semibold">
                    <span className="text-orange-400 font-bold">✓</span> 5 Aktif İlan Yayınlama Hakkı
                  </div>
                  <div className="flex items-center gap-2 text-slate-100 font-semibold">
                    <span className="text-orange-400 font-bold">✓</span> 1 Vitrin İlanı (14 Gün Ön Çıkarma)
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button
                  disabled={currentTier === "YETKIN" || buyingPackage === "YETKIN"}
                  onClick={() => handleSubscribe("YETKIN")}
                  className={`w-full py-3.5 rounded-2xl text-xs font-black transition shadow-lg ${
                    currentTier === "YETKIN"
                      ? "bg-slate-800 text-slate-400 cursor-default"
                      : "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-orange-500/25"
                  }`}
                >
                  {buyingPackage === "YETKIN"
                    ? "İşleniyor..."
                    : currentTier === "YETKIN"
                    ? "Mevcut Planınız"
                    : "Yetkin Pakete Geç"}
                </button>
              </div>
            </div>

            {/* Profesyonel Card */}
            <div className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
              currentTier === "PROFESYONEL"
                ? "bg-slate-900/90 border-2 border-amber-500/60 shadow-2xl shadow-amber-500/10"
                : "bg-slate-900/60 border border-white/10 hover:border-white/20"
            }`}>
              {currentTier === "PROFESYONEL" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  Mevcut Paketiniz
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Kurumsal & Galeri</span>
                  <h3 className="text-2xl font-black text-white mt-1">Profesyonel Paket</h3>
                  <p className="text-xs text-slate-400 mt-2">Galeriler, alım-satım danışmanları ve çoklu araç yönetimi yapan profesyoneller için sınırsız güç.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">1.499 TL</span>
                  <span className="text-xs text-slate-400 font-bold">/ ay</span>
                </div>

                <div className="border-t border-white/10 pt-6 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-amber-400 font-bold">✓</span> Sınırsız Araç Karşılaştırma Hakkı
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-amber-400 font-bold">✓</span> Sınırsız AI Chatbot Soru Hakkı
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-amber-400 font-bold">✓</span> 20 Detaylı AI Araç Analiz Raporu
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-amber-400 font-bold">✓</span> 15 Aktif İlan Yayınlama Hakkı
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-amber-400 font-bold">✓</span> 3 Vitrin İlanı (14 Gün Ön Çıkarma)
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button
                  disabled={currentTier === "PROFESYONEL" || buyingPackage === "PROFESYONEL"}
                  onClick={() => handleSubscribe("PROFESYONEL")}
                  className={`w-full py-3.5 rounded-2xl text-xs font-black transition shadow-md ${
                    currentTier === "PROFESYONEL"
                      ? "bg-slate-800 text-slate-400 cursor-default"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  }`}
                >
                  {buyingPackage === "PROFESYONEL"
                    ? "İşleniyor..."
                    : currentTier === "PROFESYONEL"
                    ? "Mevcut Planınız"
                    : "Profesyonel Pakete Geç"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. One-time Add-on Packages */}
        <div className="space-y-6 pt-6 border-t border-white/10">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white">Ek Alıcı Paketleri (Tek Seferlik Kredi)</h2>
            <p className="text-xs text-slate-400">Abonelik paketinize ek olarak alabileceğiniz süresiz ek sorgulama hakları.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  EK SORGULAMA
                </span>
                <h3 className="text-base font-black text-white mt-2">Analiz & Rapor Paketi</h3>
                <p className="text-xs text-slate-400 mt-1">3 Ek AI Araç Analiz Raporu + 10 Ek Karşılaştırma</p>
                <div className="text-2xl font-black text-white mt-3">149 TL</div>
              </div>
              <Link
                href="/dashboard/subscription"
                className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-200 hover:bg-white/5 transition text-center block"
              >
                Kredi Ekle
              </Link>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  CHATBOT KREDİSİ
                </span>
                <h3 className="text-base font-black text-white mt-2">Ekspertiz Chatbot Paketi</h3>
                <p className="text-xs text-slate-400 mt-1">30 Ek AI Chatbot Sorusu</p>
                <div className="text-2xl font-black text-white mt-3">99 TL</div>
              </div>
              <Link
                href="/dashboard/subscription"
                className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-200 hover:bg-white/5 transition text-center block"
              >
                Kredi Ekle
              </Link>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  İLAN ÖN ÇIKARMA
                </span>
                <h3 className="text-base font-black text-white mt-2">Vitrin İlan Paketi</h3>
                <p className="text-xs text-slate-400 mt-1">1 Ek Vitrin İlanı (14 Gün Süreli Ön Çıkarma)</p>
                <div className="text-2xl font-black text-white mt-3">199 TL</div>
              </div>
              <Link
                href="/dashboard/subscription"
                className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-200 hover:bg-white/5 transition text-center block"
              >
                Kredi Ekle
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="p-8 rounded-3xl border border-white/10 bg-slate-900/40 space-y-6">
          <h2 className="text-xl font-black text-white text-center">Sıkça Sorulan Sorular</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-200 text-sm">Abonelik haklarım ne zaman yenilenir?</h4>
              <p className="text-slate-400">Aylık abonelik paketlerinizin hakları her fatura kesim döneminizde otomatik olarak sıfırlanır ve yenilenir.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-slate-200 text-sm">Paketimi dilediğim zaman yükseltebilir miyim?</h4>
              <p className="text-slate-400">Evet, Tanışma paketinden Yetkin veya Profesyonel pakete istediğiniz an geçiş yapabilirsiniz.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-slate-200 text-sm">Ek alıcı kredilerinin süresi var mıdır?</h4>
              <p className="text-slate-400">Tek seferlik satın alınan ek kredi paketleri süresizdir; kullanım haklarınız bitene kadar hesabınızda saklanır.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-slate-200 text-sm">Vitrin ilanı nedir?</h4>
              <p className="text-slate-400">Vitrin ilanı, ilanınızın arama sonuçlarında ve ana sayfada en üst bölümlerde öne çıkarılmasını sağlar.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
