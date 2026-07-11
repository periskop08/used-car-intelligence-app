"use client";

import React from "react";

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Hesap Güvenliği</h1>
        <p className="text-slate-400 text-xs">Hesabınızın güvenlik ayarlarını ve iki adımlı doğrulamayı yönetin.</p>
      </div>

      <div className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-200">İki Adımlı Doğrulama (2FA)</h3>
            <p className="text-[10px] text-slate-500 max-w-md">
              Hesabınıza giriş yaparken ek güvenlik adımı olarak mobil doğrulama uygulaması kullanın.
            </p>
          </div>
          <button
            onClick={() => alert("İki adımlı doğrulama kurulum sihirbazı yakında aktif olacaktır.")}
            className="px-4 py-2 bg-slate-900 border border-white/10 hover:border-orange-500/30 text-slate-300 hover:text-orange-400 rounded-xl text-xs font-bold transition"
          >
            Kurulumu Başlat
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-200">Aktif Oturumlar</h3>
            <p className="text-[10px] text-slate-500 max-w-md">
              Hesabınızın açık olduğu aktif tarayıcı ve mobil cihazları görüntüleyin.
            </p>
          </div>
          <button
            onClick={() => alert("Tüm aktif oturumlar başarıyla kapatıldı!")}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition"
          >
            Diğer Oturumları Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
