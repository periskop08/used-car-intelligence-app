"use client";

import React from "react";
import { AlertTriangle, RefreshCcw, ArrowLeft } from "lucide-react";

interface UrgentListingPaymentRecoveryProps {
  isOpen: boolean;
  onRetry: () => void;
  onContinueAsNormal: () => void;
  errorMessage?: string;
}

export default function UrgentListingPaymentRecovery({
  isOpen,
  onRetry,
  onContinueAsNormal,
  errorMessage = "Ödeme işlemi tamamlanamadı.",
}: UrgentListingPaymentRecoveryProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Ödeme Tamamlanamadı</h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            İlanınız <strong>taslak (DRAFT)</strong> olarak veritabanında güvenle saklanmıştır. İlan verileriniz kaybolmamıştır.
          </p>
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 font-semibold">
            {errorMessage}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={onRetry}
            className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Ödemeyi Tekrar Dene</span>
          </button>
          
          <button
            onClick={onContinueAsNormal}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Acil Seçeneğini Kaldır ve Normal İlan Olarak Gönder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
