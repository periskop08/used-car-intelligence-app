"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#0b1329] border border-white/10 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 mx-auto flex items-center justify-center text-2xl font-bold">
            ⚠️
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Uygulama Yüklenirken Hata Oluştu</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Kritik bir hata nedeniyle uygulama başlatılamadı. Lütfen sayfayı yenilemeyi deneyin.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => reset()}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-orange-500/20 cursor-pointer"
            >
              Uygulamayı Yeniden Yükle
            </button>
            <a
              href="/"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl font-semibold transition border border-white/10"
            >
              Ana Sayfaya Git
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
