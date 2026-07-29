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
  cumulativeText?: string;
  features: Array<{ text: string }>;
}

const PACKAGE_DETAILS: Record<string, PackageDetail> = {
  TANISMA: {
    code: "TANISMA",
    name: "Tanışma Paketi",
    badge: "TANIŞMA",
    badgeStyle: "bg-slate-800 text-slate-300 border border-white/10",
    price: "0 TL",
    period: "/ aylık",
    description: "TorqueScout’ı tanımak, araç araştırmak ve ilk ilanını ücretsiz yayınlamak isteyenler için.",
    ctaText: "Ücretsiz Başla",
    features: [
      { text: "Ayda 3 AI araç raporu" },
      { text: "Ayda 3 chatbot mesajı" },
      { text: "1 aktif ilan" },
      { text: "30 gün ilan yayın süresi" },
      { text: "Ayda 3 karşılaştırma" },
      { text: "Karşılaştırma başına 2 araç" },
    ],
  },
  YETKIN: {
    code: "YETKIN",
    name: "Yetkin Paket",
    badge: "YETKİN",
    badgeStyle: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    popularTag: "En Çok Tercih Edilen",
    price: "499 TL",
    period: "/ aylık",
    description: "Daha fazla araç araştıran, gelişmiş karşılaştırma kullanan ve birden fazla ilan yayınlayan aktif kullanıcılar için.",
    ctaText: "Yetkin Paketi Al ve Kayıt Ol",
    cumulativeText: "Tanışma paketindeki tüm özellikler, ayrıca:",
    features: [
      { text: "Ayda 10 AI araç raporu" },
      { text: "Ayda 30 chatbot mesajı" },
      { text: "Her raporda satıcıya sorulacak sorular" },
      { text: "Her raporda ekspertiz kontrol listesi" },
      { text: "10 aktif ilan" },
      { text: "30 gün ilan yayın süresi" },
      { text: "Ayda 10 karşılaştırma" },
      { text: "Karşılaştırma başına 5 araç" },
      { text: "Ayda 1 vitrin hakkı" },
    ],
  },
  PROFESYONEL: {
    code: "PROFESYONEL",
    name: "Profesyonel Paket",
    badge: "PROFESYONEL",
    badgeStyle: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    popularTag: "Profesyonel",
    price: "1.499 TL",
    period: "/ aylık",
    description: "Galeriler, kurumsal satıcılar ve yüksek hacimli ilan yönetimi yapan ekipler için.",
    ctaText: "Profesyonel Paketi Al ve Kayıt Ol",
    cumulativeText: "Yetkin paketindeki tüm özellikler, ayrıca:",
    features: [
      { text: "Ayda 50 AI araç raporu" },
      { text: "Ayda 150 chatbot mesajı" },
      { text: "Her raporda satıcıya sorulacak sorular" },
      { text: "Her raporda ekspertiz kontrol listesi" },
      { text: "50 aktif ilan" },
      { text: "45 gün ilan yayın süresi" },
      { text: "Ayda 30 karşılaştırma" },
      { text: "Karşılaştırma başına 10 araç" },
      { text: "Ayda 5 vitrin hakkı" },
      { text: "Kurumsal satıcı profili" },
      { text: "Öncelikli destek" },
      { text: "Çoklu kullanıcı ve ekip erişimi" },
    ],
  },
};

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState("TANISMA");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const rawTier = searchParams.get("tier")?.toUpperCase();
    if (rawTier) {
      if (rawTier === "FREE" || rawTier === "TANISMA") setTier("TANISMA");
      else if (rawTier === "STANDARD" || rawTier === "YETKIN") setTier("YETKIN");
      else if (rawTier === "PREMIUM" || rawTier === "PROFESYONEL") setTier("PROFESYONEL");
    }
  }, [searchParams]);

  const activePackage = PACKAGE_DETAILS[tier] || PACKAGE_DETAILS.TANISMA;

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
        } else if (tier === "YETKIN" || tier === "PROFESYONEL") {
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
                  <option value="TANISMA">Tanışma Paketi (0 TL / Ay)</option>
                  <option value="YETKIN">Yetkin Paket (499 TL / Ay)</option>
                  <option value="PROFESYONEL">Profesyonel Paket (1.499 TL / Ay)</option>
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
              {activePackage.cumulativeText && (
                <span className="text-[11px] font-bold text-orange-400">
                  {activePackage.cumulativeText}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paket Hakları & Kotaları</span>
              <ul className="flex flex-col gap-2.5">
                {activePackage.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed">
                    <span className="text-orange-500 font-bold flex-shrink-0 mt-0.5">•</span>
                    <span className="text-slate-200 font-medium">
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
