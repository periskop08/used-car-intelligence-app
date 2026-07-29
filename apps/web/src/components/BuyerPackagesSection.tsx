"use client";

import React, { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface BuyerPackageItem {
  code: "ALICI_MINI" | "ALICI_PLUS" | "ALICI_MAX";
  name: string;
  badge: string;
  price: number;
  priceText: string;
  description: string;
  popularTag?: string;
  features: string[];
  ctaText: string;
  btnStyle: string;
}

export const BUYER_PACKAGES_DATA: BuyerPackageItem[] = [
  {
    code: "ALICI_MINI",
    name: "Alıcı Mini",
    badge: "MİNİ",
    price: 149,
    priceText: "149 TL",
    description: "Birkaç aracı detaylı incelemek ve karar sürecine devam etmek isteyenler için.",
    features: [
      "5 AI araç raporu",
      "15 chatbot mesajı",
      "30 gün kullanım süresi",
      "Her raporda satıcıya sorulacak sorular",
      "Her raporda ekspertiz kontrol listesi",
    ],
    ctaText: "Alıcı Mini Satın Al",
    btnStyle: "border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white",
  },
  {
    code: "ALICI_PLUS",
    name: "Alıcı Plus",
    badge: "PLUS",
    popularTag: "EN ÇOK TERCİH EDİLEN",
    price: 249,
    priceText: "249 TL",
    description: "Daha fazla aracı karşılaştırmak ve satın alma kararını netleştirmek isteyenler için.",
    features: [
      "10 AI araç raporu",
      "30 chatbot mesajı",
      "30 gün kullanım süresi",
      "Her raporda satıcıya sorulacak sorular",
      "Her raporda ekspertiz kontrol listesi",
    ],
    ctaText: "Alıcı Plus Satın Al",
    btnStyle: "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20",
  },
  {
    code: "ALICI_MAX",
    name: "Alıcı Max",
    badge: "MAX",
    price: 399,
    priceText: "399 TL",
    description: "Yoğun araç araştırması yapan ve daha geniş kullanım hakkına ihtiyaç duyanlar için.",
    features: [
      "20 AI araç raporu",
      "60 chatbot mesajı",
      "60 gün kullanım süresi",
      "Her raporda satıcıya sorulacak sorular",
      "Her raporda ekspertiz kontrol listesi",
    ],
    ctaText: "Alıcı Max Satın Al",
    btnStyle: "border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-slate-200 hover:text-orange-400",
  },
];

export default function BuyerPackagesSection() {
  const [selectedPkg, setSelectedPkg] = useState<BuyerPackageItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpenCheckout = (pkg: BuyerPackageItem) => {
    setSelectedPkg(pkg);
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleConfirmPurchase = () => {
    if (!selectedPkg) return;
    setLoading(true);

    const token = localStorage.getItem("accessToken");
    let userObj: any = null;
    try {
      userObj = JSON.parse(localStorage.getItem("user") || "{}");
    } catch (e) {}

    fetch(`${API_URL}/buyer-packages/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: userObj?.id || undefined,
        packageCode: selectedPkg.code,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Satın alma gerçekleştirilemedi.");
        return res.json();
      })
      .then((data) => {
        setLoading(false);
        setSuccessMessage(`${selectedPkg.name} haklarınız hesabınıza eklendi!`);
        setTimeout(() => {
          setSelectedPkg(null);
        }, 1500);
      })
      .catch((err) => {
        setLoading(false);
        setErrorMessage(err.message || "Bir hata oluştu.");
      });
  };

  return (
    <div id="buyer-packages" className="w-full max-w-5xl flex flex-col gap-8 items-center py-10 border-t border-white/5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold mb-3 uppercase tracking-wider">
          🛒 Tek Seferlik Paketler
        </div>
        <h2 className="text-3xl font-extrabold text-slate-100">Alıcı Paketleri</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-xl mx-auto">
          Yalnızca araç araştırmak için ihtiyacınıza uygun AI raporu ve chatbot haklarını tek seferlik satın alın.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-2 items-stretch">
        {BUYER_PACKAGES_DATA.map((pkg) => {
          const isFeatured = pkg.code === "ALICI_PLUS";
          return (
            <div
              key={pkg.code}
              className={`p-8 rounded-3xl flex flex-col justify-between gap-6 relative ${
                isFeatured
                  ? "border border-orange-500/40 bg-orange-950/10 shadow-xl shadow-orange-500/5"
                  : "border border-white/10 bg-slate-950/40"
              }`}
            >
              {pkg.popularTag && (
                <span className="absolute -top-3 right-6 text-[10px] bg-orange-600 text-white font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                  {pkg.popularTag}
                </span>
              )}

              <div className="flex flex-col gap-4">
                <div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded font-mono font-bold ${
                      pkg.code === "ALICI_MAX"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : pkg.code === "ALICI_PLUS"
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        : "bg-slate-800 text-slate-300 border border-white/10"
                    }`}
                  >
                    {pkg.badge}
                  </span>
                  <h3 className="text-xl font-bold text-slate-200 mt-3">{pkg.name}</h3>
                  <p className="text-2xl font-black text-white mt-1">
                    {pkg.priceText} <span className="text-xs text-slate-500 font-normal">/ tek seferlik</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{pkg.description}</p>
                </div>

                <div className="border-t border-white/10 my-1" />

                <ul className="text-xs text-slate-300 flex flex-col gap-2.5">
                  {pkg.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleOpenCheckout(pkg)}
                className={`w-full mt-auto text-center py-3.5 rounded-2xl text-xs font-bold transition cursor-pointer ${pkg.btnStyle}`}
              >
                {pkg.ctaText}
              </button>
            </div>
          );
        })}
      </div>

      {/* One-Time Payment Modal */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0f19] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col gap-5 relative">
            <button
              onClick={() => setSelectedPkg(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block">Ödeme Onayı</span>
              <h3 className="text-xl font-black text-slate-100">{selectedPkg.name} Satın Al</h3>
              <p className="text-xs text-slate-400">Tek seferlik ödeme yapacaksınız. Otomatik yenilenmez.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Paket Fiyatı:</span>
                <span className="font-bold text-white text-sm">{selectedPkg.priceText}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Ödeme Tipi:</span>
                <span className="font-bold text-green-400">Tek seferlik ödeme</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Kullanım Süresi:</span>
                <span className="font-bold text-slate-200">
                  {selectedPkg.code === "ALICI_MAX" ? "60 Gün" : "30 Gün"}
                </span>
              </div>
            </div>

            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-3 rounded-xl font-bold text-center">
                ✔ {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-bold text-center">
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setSelectedPkg(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5"
              >
                Vazgeç
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={loading || !!successMessage}
                className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                {loading ? "İşleniyor..." : "Ödemeyi Tamamla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
