"use client";

import React from "react";
import { CheckCircle2, Zap, Star, Flame, AlertCircle } from "lucide-react";

export type PromotionSku = "URGENT_LISTING" | "SHOWCASE_FEED" | "URGENT_SHOWCASE_BUNDLE" | null;

interface PricingDetails {
  urgentPriceAmount?: number;
  showcasePriceAmount?: number;
  bundlePriceAmount?: number;
  individualTotalAmount?: number;
  savingsAmount?: number;
  canBuyUrgent?: boolean;
  canBuyShowcase?: boolean;
  canBuyBundle?: boolean;
}

interface ListingPromotionCardsProps {
  selectedSku: PromotionSku;
  onSelectSku: (sku: PromotionSku) => void;
  termsAccepted: boolean;
  onTermsAcceptedChange: (accepted: boolean) => void;
  pricingDetails?: PricingDetails;
  remainingDays?: number;
  isCreateFlow?: boolean;
}

export default function ListingPromotionCards({
  selectedSku,
  onSelectSku,
  termsAccepted,
  onTermsAcceptedChange,
  pricingDetails,
  remainingDays,
  isCreateFlow = true,
}: ListingPromotionCardsProps) {
  const urgentPrice = pricingDetails?.urgentPriceAmount ?? 99;
  const showcasePrice = pricingDetails?.showcasePriceAmount ?? 199;
  const bundlePrice = pricingDetails?.bundlePriceAmount ?? 249;
  const individualTotal = pricingDetails?.individualTotalAmount ?? (urgentPrice + showcasePrice);
  const savings = pricingDetails?.savingsAmount ?? (individualTotal - bundlePrice);

  const canBuyUrgent = pricingDetails?.canBuyUrgent !== false;
  const canBuyShowcase = pricingDetails?.canBuyShowcase !== false;
  const canBuyBundle = pricingDetails?.canBuyBundle !== false;

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <span>🚀</span> İlanını Öne Çıkar & Satışını Hızlandır
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            İlanınızın görünürlüğünü artırmak için aşağıdaki opsiyonel promosyon seçeneklerinden birini tercih edebilirsiniz.
          </p>
        </div>
        {remainingDays !== undefined && remainingDays > 0 && (
          <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs font-bold text-orange-400 shrink-0">
            ⏳ İlan Kalan Süresi: <strong>{remainingDays} Gün</strong>
          </div>
        )}
      </div>

      {/* 3 Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Acil İlan */}
        <div
          onClick={() => canBuyUrgent && onSelectSku(selectedSku === "URGENT_LISTING" ? null : "URGENT_LISTING")}
          className={`relative flex flex-col justify-between p-5 rounded-2xl border transition duration-300 select-none cursor-pointer ${
            !canBuyUrgent
              ? "opacity-50 cursor-not-allowed bg-slate-900/20 border-white/5"
              : selectedSku === "URGENT_LISTING"
              ? "bg-red-950/40 border-red-500 shadow-xl shadow-red-500/10 ring-2 ring-red-500/40"
              : "bg-slate-900/40 border-white/10 hover:border-red-500/40 hover:bg-slate-900/70"
          }`}
        >
          {/* Radio indicator */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                <Zap className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-extrabold text-white text-base">Acil İlan</h4>
                <span className="text-[10px] text-red-400 font-mono font-bold uppercase tracking-wider block">🚨 Kırmızı Rozet</span>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
              selectedSku === "URGENT_LISTING" ? "border-red-500 bg-red-500 text-white" : "border-slate-600 bg-slate-950"
            }`}>
              {selectedSku === "URGENT_LISTING" && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            İlanınız kırmızı <strong>ACİL</strong> rozetiyle öne çıkar, Acil İlanlar sayfasında ve acil filtrelerinde görünür.
          </p>

          <ul className="space-y-1.5 text-[11px] text-slate-400 mb-5">
            <li className="flex items-center gap-1.5">✓ Kırmızı yanıp sönen ACİL rozeti</li>
            <li className="flex items-center gap-1.5">✓ Acil İlanlar özel sayfası</li>
            <li className="flex items-center gap-1.5">✓ Sadece Acil arama filtresi</li>
          </ul>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between mt-auto">
            <div className="text-xs text-slate-400">
              {isCreateFlow ? "İlan süresince" : `Kalan ${remainingDays ?? 30} gün`}
            </div>
            <span className="text-lg font-black text-white">{urgentPrice} TL</span>
          </div>
        </div>

        {/* Card 2: Vitrin + Akış */}
        <div
          onClick={() => canBuyShowcase && onSelectSku(selectedSku === "SHOWCASE_FEED" ? null : "SHOWCASE_FEED")}
          className={`relative flex flex-col justify-between p-5 rounded-2xl border transition duration-300 select-none cursor-pointer ${
            !canBuyShowcase
              ? "opacity-50 cursor-not-allowed bg-slate-900/20 border-white/5"
              : selectedSku === "SHOWCASE_FEED"
              ? "bg-amber-950/40 border-amber-500 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/40"
              : "bg-slate-900/40 border-white/10 hover:border-amber-500/40 hover:bg-slate-900/70"
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Star className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-extrabold text-white text-base">Vitrin + Akış</h4>
                <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider block">⭐ Çift Yüzey</span>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
              selectedSku === "SHOWCASE_FEED" ? "border-amber-500 bg-amber-500 text-white" : "border-slate-600 bg-slate-950"
            }`}>
              {selectedSku === "SHOWCASE_FEED" && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            İlanınız ana sayfadaki <strong>Vitrin</strong> alanında ve Keşfet içerisindeki <strong>İlan Akışı</strong> bölümünde yer alır.
          </p>

          <ul className="space-y-1.5 text-[11px] text-slate-400 mb-5">
            <li className="flex items-center gap-1.5">✓ Ana Sayfa Vitrin alanı</li>
            <li className="flex items-center gap-1.5">✓ Keşfet &gt; İlan Akışı</li>
            <li className="flex items-center gap-1.5">✓ Maksimum ana sayfa görünürlüğü</li>
          </ul>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between mt-auto">
            <div className="text-xs text-slate-400">
              {isCreateFlow ? "İlan süresince" : `Kalan ${remainingDays ?? 30} gün`}
            </div>
            <span className="text-lg font-black text-white">{showcasePrice} TL</span>
          </div>
        </div>

        {/* Card 3: Hızlı Satış Paketi (Bundle) */}
        <div
          onClick={() => canBuyBundle && onSelectSku(selectedSku === "URGENT_SHOWCASE_BUNDLE" ? null : "URGENT_SHOWCASE_BUNDLE")}
          className={`relative flex flex-col justify-between p-5 rounded-2xl border transition duration-300 select-none cursor-pointer ${
            !canBuyBundle
              ? "opacity-50 cursor-not-allowed bg-slate-900/20 border-white/5"
              : selectedSku === "URGENT_SHOWCASE_BUNDLE"
              ? "bg-gradient-to-br from-orange-950/60 via-slate-900 to-rose-950/60 border-orange-500 shadow-2xl shadow-orange-500/20 ring-2 ring-orange-500/50"
              : "bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-orange-500/30 hover:border-orange-500/60"
          }`}
        >
          {/* Badge */}
          <div className="absolute -top-3 right-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10px] uppercase px-3 py-0.5 rounded-full shadow-lg border border-orange-300/40 tracking-wider">
            🔥 EN AVANTAJLI PAKET
          </div>

          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Flame className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-extrabold text-white text-base">Hızlı Satış</h4>
                <span className="text-[10px] text-orange-400 font-mono font-bold uppercase tracking-wider block">Acil + Vitrin + Akış</span>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
              selectedSku === "URGENT_SHOWCASE_BUNDLE" ? "border-orange-500 bg-orange-500 text-white" : "border-slate-600 bg-slate-950"
            }`}>
              {selectedSku === "URGENT_SHOWCASE_BUNDLE" && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Acil İlan ve Vitrin + Akış özelliklerini tek paket altında avantajlı fiyatla birlikte aktif eder.
          </p>

          <ul className="space-y-1.5 text-[11px] text-slate-300 font-medium mb-5">
            <li className="flex items-center gap-1.5 text-red-400 font-bold">✓ Kırmızı ACİL rozeti & Acil listesi</li>
            <li className="flex items-center gap-1.5 text-amber-400 font-bold">✓ Ana Sayfa Vitrin alanı</li>
            <li className="flex items-center gap-1.5 text-orange-400 font-bold">✓ Keşfet &gt; İlan Akışı görünürlüğü</li>
          </ul>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between mt-auto">
            <div>
              <span className="text-xs text-slate-500 line-through block">Ayrı Ayrı: {individualTotal} TL</span>
              {savings > 0 && (
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                  {savings} TL Avantaj
                </span>
              )}
            </div>
            <span className="text-xl font-black text-orange-400">{bundlePrice} TL</span>
          </div>
        </div>
      </div>

      {/* Terms Checkbox & Notice */}
      {selectedSku && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3 animate-fadeIn">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => onTermsAcceptedChange(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500/40"
            />
            <span className="text-xs text-slate-300 leading-relaxed">
              Seçtiğim ilan promosyonunun abonelik paketimden bağımsız, <strong>tek seferlik ek bir hizmet</strong> olduğunu ve promosyonun ilanın aktif yayın süresiyle sınırlı olduğunu kabul ediyorum.
            </span>
          </label>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
            <span>
              Promosyon satın almak ilanın toplam yayın süresini uzatmaz. Hizmet yalnız mevcut aktif yayın süreniz boyunca geçerlidir.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
