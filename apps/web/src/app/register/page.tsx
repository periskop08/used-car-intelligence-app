"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface PackageDetail {
  code: string;
  name: string;
  badge: string;
  badgeStyle: string;
  popularTag?: string;
  price: string;
  period: string;
  description: string;
  ctaText: string;
  features: Array<{ text: string; included: boolean }>;
}

const PACKAGE_DETAILS: Record<string, PackageDetail> = {
  FREE: {
    code: "FREE",
    name: "Ücretsiz Başlangıç",
    badge: "FREE",
    badgeStyle: "bg-slate-800 text-slate-300 border border-white/10",
    price: "0 TL",
    period: "/ ömür boyu",
    description: "Temel araç incelemeleri ve tekil ilan yayınlama denemeleri için ideal başlangıç paketi.",
    ctaText: "Ücretsiz Kayıt Ol",
    features: [
      { text: "Günlük 5 Yapay Zeka Mesaj Hakkı", included: true },
      { text: "Maksimum 1 Aktif İlan Yayını", included: true },
      { text: "30 Gün İlan Yayın Süresi", included: true },
      { text: "Temel Araç Spesifikasyon Sorgulama", included: true },
      { text: "Satıcı Soruları & Ekspertiz Checklistler", included: false },
      { text: "Öncelikli Müşteri Desteği", included: false },
    ],
  },
  STANDARD: {
    code: "STANDARD",
    name: "Standart Paket",
    badge: "STANDARD",
    badgeStyle: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    popularTag: "En Popüler",
    price: "349 TL",
    period: "/ aylık",
    description: "Araç satın alma veya satış aşamasında olan aktif bireysel kullanıcılar için.",
    ctaText: "Standard Pakete Geç ve Kayıt Ol",
    features: [
      { text: "Günlük 10 Yapay Zeka Mesaj Hakkı", included: true },
      { text: "Maksimum 10 Aktif İlan Yayını", included: true },
      { text: "30 Gün İlan Yayın Süresi", included: true },
      { text: "Temel Araç Spesifikasyon Sorgulama", included: true },
      { text: "Satıcı Soruları & Ekspertiz Checklistler Açık", included: true },
      { text: "Gelişmiş Yapay Zeka Risk Analiz Raporu", included: true },
    ],
  },
  PREMIUM: {
    code: "PREMIUM",
    name: "Premium Paket",
    badge: "PREMIUM",
    badgeStyle: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    popularTag: "Profesyonel",
    price: "899 TL",
    period: "/ aylık",
    description: "Galeri, ekspertiz firmaları ve otomotiv profesyonelleri için kapsamlı çözüm paketi.",
    ctaText: "Premium Pakete Geç ve Kayıt Ol",
    features: [
      { text: "Günlük 100 Yapay Zeka Mesaj Hakkı", included: true },
      { text: "Maksimum 50 Aktif İlan Yayını", included: true },
      { text: "45 Gün İlan Yayın Süresi", included: true },
      { text: "Satıcı Soruları & Tüm Checklistler Açık", included: true },
      { text: "Sınırsız Yapay Zeka Varyant Karşılaştırma", included: true },
      { text: "VIP Müşteri Temsilcisi & 7/24 Öncelikli Destek", included: true },
    ],
  },
};

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState("FREE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlTier = searchParams.get("tier")?.toUpperCase();
    if (urlTier && PACKAGE_DETAILS[urlTier]) {
      setTier(urlTier);
    }
  }, [searchParams]);

  const activePackage = PACKAGE_DETAILS[tier] || PACKAGE_DETAILS.FREE;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        subscriptionTier: tier,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message || "Kayıt başarısız.");
          });
        }
        return res.json();
      })
      .then((data) => {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("user", JSON.stringify(data.user));
        setLoading(false);

        const redirectTarget = searchParams.get("redirect");
        if (redirectTarget) {
          window.location.href = redirectTarget;
        } else if (tier === "STANDARD" || tier === "PREMIUM") {
          window.location.href = "/dashboard/subscription?registeredTier=" + tier;
        } else {
          window.location.href = "/";
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const redirectParam = searchParams.get("redirect");
  const loginLink = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-12 flex flex-col gap-8">
      {/* Outer Grid: 2 equal-width, equal-height columns on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch w-full">
        
        {/* Left Column: Registration Form */}
        <div className="glass p-8 rounded-3xl flex flex-col justify-between gap-6 shadow-2xl border border-white/10 bg-[#0b0f19]/95 backdrop-blur-xl">
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">Kayıt Ol</h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Hızlıca hesabınızı oluşturun ve TorqueScout analizlerini keşfedin.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl font-semibold leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Adresi</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Şifre (En az 6 haneli)</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>

              {/* Package Selection Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abonelik Paketi</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="bg-slate-900 border border-orange-500/50 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition font-medium"
                >
                  <option value="FREE">FREE (Ücretsiz)</option>
                  <option value="STANDARD">STANDARD (349 TL / Ay)</option>
                  <option value="PREMIUM">PREMIUM (899 TL / Ay)</option>
                </select>
              </div>

              {/* Main Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition duration-200 text-center text-sm shadow-lg shadow-orange-500/10 cursor-pointer"
              >
                {loading ? "Kaydolunuyor..." : activePackage.ctaText}
              </button>
            </form>
          </div>

          <div className="text-center text-xs text-slate-400 border-t border-white/5 pt-4 mt-2">
            Zaten hesabınız var mı?{" "}
            <a href={loginLink} className="text-orange-500 font-bold hover:underline">
              Giriş Yapın
            </a>
          </div>
        </div>

        {/* Right Column: Selected Package Detail Panel */}
        <div className="glass p-8 rounded-3xl flex flex-col justify-between gap-6 shadow-2xl border border-white/10 bg-[#0b0f19]/95 backdrop-blur-xl relative overflow-hidden">
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">Paketler</h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">Seçili paketin içeriği</p>
            </div>

            <div className="border-t border-white/5 my-1" />

            {/* Package Header Info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md ${activePackage.badgeStyle}`}>
                  {activePackage.badge}
                </span>
                {activePackage.popularTag && (
                  <span className="text-[10px] bg-orange-600 text-white font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                    {activePackage.popularTag}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-100">{activePackage.name}</h3>
                <p className="text-2xl font-black text-white mt-1">
                  {activePackage.price} <span className="text-xs font-normal text-slate-400">{activePackage.period}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {activePackage.description}
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 my-2" />

            {/* Features Checklist */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paket Özellikleri & Hakları</span>
              <ul className="flex flex-col gap-2.5">
                {activePackage.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed">
                    {feat.included ? (
                      <span className="text-orange-500 font-bold flex-shrink-0 mt-0.5">✔</span>
                    ) : (
                      <span className="text-slate-600 font-bold flex-shrink-0 mt-0.5">✖</span>
                    )}
                    <span className={feat.included ? "text-slate-200 font-medium" : "text-slate-500"}>
                      {feat.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-900/50 border border-white/5 p-3 rounded-xl text-center">
            💡 Paket tercihinizi kayıt sonrasında dilediğiniz zaman hesabınızdan değiştirebilirsiniz.
          </div>
        </div>

      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div className="text-slate-400 font-bold text-lg text-center py-24">Yükleniyor...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
