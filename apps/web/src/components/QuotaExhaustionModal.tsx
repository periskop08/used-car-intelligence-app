"use client";

import React from "react";

interface QuotaExhaustionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBuyerPackage?: (code: string) => void;
  onSelectSubscription?: () => void;
}

export default function QuotaExhaustionModal({
  isOpen,
  onClose,
  onSelectBuyerPackage,
  onSelectSubscription,
}: QuotaExhaustionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b0f19]/95 border border-orange-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl shadow-orange-500/10 flex flex-col gap-5 relative max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition"
          aria-label="Kapat"
        >
          ✕
        </button>

        {/* Header Section */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
            ⚡
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-semibold tracking-wide">
            KOTA HATIRLATMASI
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            Araştırma Haklarınız Doldu
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Ücretsiz sorgulama limitinize ulaştınız. Araç incelemelerinize kesintisiz devam etmek için en popüler başlangıç paketimiz <strong className="text-slate-200">Alıcı Mini</strong>'yi tercih edebilirsiniz.
          </p>
        </div>

        {/* Hero Recommended Card: Alıcı Mini */}
        <div className="relative rounded-2xl border-2 border-orange-500/50 bg-gradient-to-b from-orange-950/30 via-slate-900/60 to-slate-950/80 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-orange-500 text-slate-950 uppercase tracking-wider">
              ÖNERİLEN BAŞLANGIÇ
            </span>
            <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tek Seferlik • Taahhütsüz
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">Alıcı Mini Paketi</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Karar aşamasındaki araçlar için ideal</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-black text-orange-400 font-mono tracking-tight">149 TL</div>
              <div className="text-[10px] text-slate-400">Tek seferlik</div>
            </div>
          </div>

          {/* Features Checklist */}
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold flex-shrink-0">✔</span>
              <span className="font-semibold text-slate-200">5 Kapsamlı AI Araç Analiz Raporu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold flex-shrink-0">✔</span>
              <span className="font-semibold text-slate-200">15 Uzman Danışman Chatbot Mesajı</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold flex-shrink-0">✔</span>
              <span>Satıcıya Özel Kontrol & Pazarlık Soruları</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold flex-shrink-0">✔</span>
              <span>30 Gün Boyunca Geçerli Kullanım</span>
            </div>
          </div>

          {/* Primary CTA Button */}
          <a
            href="/#buyer-packages"
            onClick={() => {
              onClose();
              if (onSelectBuyerPackage) onSelectBuyerPackage("ALICI_MINI");
            }}
            className="w-full block text-center py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs sm:text-sm font-black transition shadow-lg shadow-orange-500/25 active:scale-[0.99]"
          >
            Alıcı Mini Paketini Seç (149 TL) →
          </a>
        </div>

        {/* Secondary Navigation Options */}
        <div className="flex items-center justify-between gap-3 pt-1 text-[11px]">
          <a
            href="/#buyer-packages"
            onClick={onClose}
            className="text-slate-400 hover:text-orange-400 font-semibold underline underline-offset-4 transition"
          >
            Diğer Alıcı Paketleri (Plus / Max)
          </a>
          <a
            href="/register?tier=YETKIN"
            onClick={() => {
              onClose();
              if (onSelectSubscription) onSelectSubscription();
            }}
            className="text-orange-400 hover:text-orange-300 font-bold transition flex items-center gap-1"
          >
            Yetkin Abonelik →
          </a>
        </div>
      </div>
    </div>
  );
}
