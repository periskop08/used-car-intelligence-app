import React from "react";

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">DASHBOARD</h1>
        <p className="text-sm text-slate-400 mt-1">Sistem durumunu ve veri onay süreçlerini takip edin.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-slate-800 bg-slate-950/20 p-6 rounded-2xl flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Toplam Marka</span>
          <span className="text-2xl font-black text-slate-200">5</span>
        </div>
        <div className="border border-slate-800 bg-slate-950/20 p-6 rounded-2xl flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Toplam Model</span>
          <span className="text-2xl font-black text-slate-200">10</span>
        </div>
        <div className="border border-slate-800 bg-slate-950/20 p-6 rounded-2xl flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Araç Varyantı</span>
          <span className="text-2xl font-black text-slate-200">15</span>
        </div>
        <div className="border border-slate-800 bg-slate-950/20 p-6 rounded-2xl flex flex-col gap-1 border-orange-500/20 bg-orange-950/5">
          <span className="text-xs text-orange-500 font-bold uppercase tracking-wider">Onay Bekleyen Veri</span>
          <span className="text-2xl font-black text-orange-400">3</span>
        </div>
      </div>

      {/* Task Queue Card */}
      <div className="border border-slate-800 bg-slate-950/10 p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Onay Bekleyen İçerikler</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-4">Tür</th>
                <th className="py-3 px-4">Araç Varyantı</th>
                <th className="py-3 px-4">Başlık</th>
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/50 hover:bg-slate-800/10 transition">
                <td className="py-3 px-4 font-mono text-xs text-amber-500">KRONİK_SORUN</td>
                <td className="py-3 px-4 text-slate-300">VW Golf 2018 1.6 TDI Comfortline</td>
                <td className="py-3 px-4 text-slate-300">Klima Aktüatör Motoru Arızası</td>
                <td className="py-3 px-4 text-slate-400">04.07.2026</td>
                <td className="py-3 px-4 text-right">
                  <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition">
                    İncele & Onayla
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
