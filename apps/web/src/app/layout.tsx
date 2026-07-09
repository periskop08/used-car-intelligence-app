import "./globals.css";
import React from "react";
import Header from "../components/Header";

export const metadata = {
  title: "Used Car Intelligence App",
  description: "Yapay zeka destekli ikinci el araç bilgi ve değerlendirme sistemi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen flex flex-col">
        {/* Client Header component */}
        <Header />

        {/* Core Layout Main View */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-[#020617]/40 py-8 text-center text-xs text-slate-600">
          <p>© 2026 TorqueScout. Tüm hakları saklıdır.</p>
          <p className="mt-2 text-slate-700">AI analizi doğruluğu teknik veriler ve onaylanmış sorunlara dayanmaktadır.</p>
        </footer>
      </body>
    </html>
  );
}
