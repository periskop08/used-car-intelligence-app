import "./globals.css";
import React from "react";

export const metadata = {
  title: "Used Car Intelligence - Admin Panel",
  description: "Used Car Intelligence Web Admin Panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <div className="min-h-screen flex flex-col">
          {/* Main Top Header */}
          <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black tracking-wider text-orange-500">USED CAR INTEL</span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded font-mono">ADMIN PANEL</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Hoş geldiniz,</span>
              <span className="text-sm font-bold text-slate-200">Demo Admin</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </header>

          <main className="flex-1 flex">
            {/* Sidebar Navigation */}
            <aside className="w-64 border-r border-slate-800 bg-slate-950/30 p-6 flex flex-col gap-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Yönetim</div>
              <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition">
                📊 Dashboard
              </a>
              <a href="/admin/research-jobs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition">
                ⚡ Araştırma İşleri (Jobs)
              </a>
              <a href="/admin/raw-sources" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition">
                🌐 Ham Kaynaklar (Sources)
              </a>
              <a href="/admin/data-quality" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition">
                🔍 Veri Kalitesi (Quality)
              </a>
              <a href="/admin/audit-logs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition">
                📜 Denetim Günlüğü (Audits)
              </a>
            </aside>

            {/* Core Content View */}
            <section className="flex-1 p-8 bg-slate-900/40">
              {children}
            </section>
          </main>
        </div>
      </body>
    </html>
  );
}
