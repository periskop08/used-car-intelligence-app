'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const ReportSidebar: React.FC = () => {
  const pathname = usePathname();

  const sections = [
    {
      title: 'GENEL BAKIŞ',
      items: [
        { label: '📊 Executive Overview', href: '/admin/reports' },
      ],
    },
    {
      title: 'KULLANICI RAPORLARI',
      items: [
        { label: '📈 Kullanıcı Büyümesi', href: '/admin/reports/users/growth' },
        { label: '🔻 Dönüşüm Hunisi', href: '/admin/reports/users/funnel' },
        { label: '🔥 Retention / Cohort', href: '/admin/reports/users/retention' },
        { label: '📦 Paket Dağılımı', href: '/admin/reports/users/packages' },
      ],
    },
    {
      title: 'ÜRÜN VE AI',
      items: [
        { label: '🤖 AI Araç Raporları', href: '/admin/reports/product/ai-reports' },
        { label: '💬 Gemini Chatbot', href: '/admin/reports/product/chatbot' },
        { label: '⚖️ Araç Karşılaştırma', href: '/admin/reports/product/comparisons' },
        { label: '📚 Araç Ansiklopedisi', href: '/admin/reports/product/encyclopedia' },
        { label: '🔍 Aracını Bul (Swipe)', href: '/admin/reports/product/vehicle-discovery' },
      ],
    },
    {
      title: 'İLAN MODERASYON & PERFORMANS',
      items: [
        { label: '🚗 İlan Genel Bakış', href: '/admin/reports/listings/overview' },
        { label: '⚡ İlan Performansı', href: '/admin/reports/listings/performance' },
        { label: '🎯 İlan Kalite Denetimi', href: '/admin/reports/listings/quality' },
        { label: '⭐ Vitrin Lift Performansı', href: '/admin/reports/listings/showcase' },
        { label: '⚖️ Arz–Talep Açıkları', href: '/admin/reports/listings/supply-demand' },
      ],
    },
    {
      title: 'FİNANS VE GELİR',
      items: [
        { label: '💳 Abonelik Metrikleri', href: '/admin/reports/finance/subscriptions' },
        { label: '💰 Gelir & MRR / ARR', href: '/admin/reports/finance/revenue' },
        { label: '🎁 Tek Seferlik Paketler', href: '/admin/reports/finance/one-time-packages' },
        { label: '💸 AI & Altyapı Maliyeti', href: '/admin/reports/finance/costs' },
        { label: '📈 Net Kârlılık & Marj', href: '/admin/reports/finance/profitability' },
      ],
    },
    {
      title: 'COMMUNITY & DATA',
      items: [
        { label: '🛡️ Club & Moderasyon', href: '/admin/reports/club' },
        { label: '📐 Araç Veri Kapsamı', href: '/admin/reports/vehicle-data/coverage' },
        { label: '🔍 Evidence Kalitesi', href: '/admin/reports/vehicle-data/evidence' },
        { label: '⚠️ Veri Açıkları Kuyruğu', href: '/admin/reports/vehicle-data/gaps' },
      ],
    },
    {
      title: 'OPERASYON & GÜVENLİK',
      items: [
        { label: '📢 Pazarlama & ROAS/CAC', href: '/admin/reports/marketing' },
        { label: '🌐 Coğrafya & Cihaz', href: '/admin/reports/geography-device' },
        { label: '⚙️ Sistem & AI Gecikmeleri', href: '/admin/reports/system-ai' },
        { label: '💬 Mesajlaşma Analitiği', href: '/admin/reports/messaging' },
        { label: '🔒 Güvenlik Audit Log', href: '/admin/reports/security' },
      ],
    },
  ];

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 bg-slate-900/40 p-4 rounded-2xl border border-white/5 space-y-6">
      <div className="px-2 py-1 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rapor Menüsü</span>
        <span className="text-[10px] bg-orange-500/20 text-orange-400 font-mono font-bold px-1.5 py-0.5 rounded">BI v3.1</span>
      </div>

      <nav className="space-y-6 text-xs">
        {sections.map((sec, idx) => (
          <div key={idx} className="space-y-1.5">
            <h3 className="px-2 font-bold text-[10px] text-slate-400 tracking-wider uppercase">{sec.title}</h3>
            <div className="space-y-0.5">
              {sec.items.map((item, i) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={i}
                    href={item.href}
                    className={`block px-3 py-2 rounded-xl font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-orange-400 font-bold border border-orange-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};
