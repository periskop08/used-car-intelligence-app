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
      <div className="bg-[#0b0f19] border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
        >
          ✕
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-2xl mx-auto mb-2">
            ⚡
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100">Araştırma Haklarınız Doldu</h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Ücretsiz araştırma haklarınızı kullandınız. Yalnızca AI raporu ve chatbot hakkı satın alabilir veya daha geniş kullanım için Yetkin pakete geçebilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Option 1: One-time Buyer Packages */}
          <div className="glass p-5 rounded-2xl border border-white/10 bg-slate-950/40 flex flex-col justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                TEK SEFERLİK ÖDEME
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-2">Yalnızca araç araştırmaya devam et</h3>
              <p className="text-[11px] text-slate-400 mt-1">İlan hakkına ihtiyaç duymayanlar için tek seferlik paketler.</p>
            </div>

            <div className="space-y-2.5">
              <a
                href="/#buyer-packages"
                onClick={() => {
                  onClose();
                  if (onSelectBuyerPackage) onSelectBuyerPackage("ALICI_MINI");
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-orange-500/40 transition text-xs"
              >
                <div>
                  <span className="font-bold text-slate-200 block">Alıcı Mini</span>
                  <span className="text-[10px] text-slate-400">5 AI Rapor + 15 Chatbot</span>
                </div>
                <span className="font-mono font-bold text-orange-400">149 TL</span>
              </a>

              <a
                href="/#buyer-packages"
                onClick={() => {
                  onClose();
                  if (onSelectBuyerPackage) onSelectBuyerPackage("ALICI_PLUS");
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-orange-950/20 border border-orange-500/30 hover:border-orange-500 transition text-xs"
              >
                <div>
                  <span className="font-bold text-slate-200 block flex items-center gap-1.5">
                    Alıcı Plus
                    <span className="text-[9px] bg-orange-600 text-white px-1.5 py-0.2 rounded font-mono font-bold">Popüler</span>
                  </span>
                  <span className="text-[10px] text-slate-400">10 AI Rapor + 30 Chatbot</span>
                </div>
                <span className="font-mono font-bold text-orange-400">249 TL</span>
              </a>

              <a
                href="/#buyer-packages"
                onClick={() => {
                  onClose();
                  if (onSelectBuyerPackage) onSelectBuyerPackage("ALICI_MAX");
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-orange-500/40 transition text-xs"
              >
                <div>
                  <span className="font-bold text-slate-200 block">Alıcı Max</span>
                  <span className="text-[10px] text-slate-400">20 AI Rapor + 60 Chatbot</span>
                </div>
                <span className="font-mono font-bold text-orange-400">399 TL</span>
              </a>
            </div>

            <a
              href="/#buyer-packages"
              onClick={onClose}
              className="w-full text-center py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-slate-300 transition"
            >
              Alıcı Paketlerini İncele
            </a>
          </div>

          {/* Option 2: Monthly Subscription Upgrade */}
          <div className="glass p-5 rounded-2xl border border-orange-500/40 bg-orange-950/10 flex flex-col justify-between gap-4 relative">
            <span className="absolute -top-2.5 right-4 text-[9px] bg-orange-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Tavsiye Edilen
            </span>

            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                AYLIK ABONELİK
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-2">İlan ve aylık kullanım haklarını da artır</h3>
              <p className="text-[11px] text-slate-400 mt-1">Aktif araştırma yapan ve ilan yayınlayan kullanıcılar için.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-orange-500/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200 text-sm">Yetkin Paket</span>
                <span className="font-mono font-black text-orange-400 text-sm">499 TL <span className="text-[10px] font-normal text-slate-400">/ ay</span></span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1 pt-1">
                <li>• Ayda 10 AI araç raporu</li>
                <li>• Ayda 30 chatbot mesajı</li>
                <li>• 10 aktif ilan yayın hakkı</li>
                <li>• Ayda 1 vitrin hakkı</li>
              </ul>
            </div>

            <a
              href="/register?tier=YETKIN"
              onClick={() => {
                onClose();
                if (onSelectSubscription) onSelectSubscription();
              }}
              className="w-full text-center py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-lg shadow-orange-500/20"
            >
              Yetkin Pakete Geç (499 TL)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
