"use client";

import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface UrgentListingPriceChangeDialogProps {
  isOpen: boolean;
  newPrice: number;
  currency: string;
  onAcceptNewPrice: () => void;
  onCancel: () => void;
}

export default function UrgentListingPriceChangeDialog({
  isOpen,
  newPrice,
  currency,
  onAcceptNewPrice,
  onCancel,
}: UrgentListingPriceChangeDialogProps) {
  if (!isOpen) return null;

  const formattedPrice = newPrice.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Fiyat Güncellendi</h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Teklif süreniz dolduğu veya ürün fiyatı güncellendiği için yeni teklif oluşturuldu.
          </p>
          <div className="mt-4 p-4 bg-slate-950 border border-amber-500/20 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Güncel Fiyat:</span>
            <span className="text-xl font-black text-amber-400">{formattedPrice} {currency}</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={onAcceptNewPrice}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Yeni Fiyatı Kabul Et ve Devam Et</span>
          </button>
          
          <button
            onClick={onCancel}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            İptal Et
          </button>
        </div>
      </div>
    </div>
  );
}
