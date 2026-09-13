"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home, ChevronDown, ChevronUp } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log client-side error to telemetry/console
    console.error("[TORQUE_SCOUT_WEB_ERROR_BOUNDARY]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg bg-[#0b1329]/90 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-orange-500/5 text-center flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Glowing Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Header Text */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Sayfa Yüklenirken Bir Aksaklık Oluştu
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
            Beklenmeyen bir veri durumu veya geçici bir bağlantı sorunu nedeniyle sayfa görüntülenemedi. Aşağıdaki seçeneklerle devam edebilirsiniz.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Sayfayı Yeniden Dene</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm rounded-xl transition active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Ana Sayfaya Dön</span>
          </Link>
        </div>

        {/* Expandable Technical Details (For diagnostics) */}
        {error && (
          <div className="w-full pt-4 border-t border-white/5 text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-500 hover:text-slate-300 transition py-1"
            >
              <span>Hata Tanılama Detayları</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDetails && (
              <div className="mt-2 p-3 rounded-xl bg-slate-950/80 border border-white/5 font-mono text-[10px] text-rose-300/90 break-all space-y-1">
                <div><strong>Mesaj:</strong> {error.message || "Bilinmeyen istemci hatası"}</div>
                {error.digest && <div><strong>Digest:</strong> {error.digest}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
