'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Bot,
  Car,
  CircleDollarSign,
  Shield,
  Database,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Store,
} from 'lucide-react';

export type AdminNavItem = {
  key: string;
  label: string;
  href: string;
};

export type AdminNavGroup = {
  key: string;
  label: string;
  icon: any;
  href?: string;
  children?: AdminNavItem[];
};

export const adminNavigationGroups: AdminNavGroup[] = [
  {
    key: 'EXECUTIVE_OVERVIEW',
    label: 'Yönetici Özeti',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    key: 'USERS',
    label: 'Kullanıcılar',
    icon: Users,
    children: [
      { key: 'USER_LIST', label: 'Kayıtlı Kullanıcılar', href: '/admin/users' },
      { key: 'USER_FEEDBACKS', label: 'Geri Bildirimler', href: '/admin/users/feedbacks' },
      { key: 'USER_MESSAGES', label: 'Kullanıcı Mesajları', href: '/admin/users/messages' },
    ],
  },
  {
    key: 'PRODUCT_AI',
    label: 'Ürün ve AI',
    icon: Bot,
    children: [
      { key: 'EVIDENCE_QUALITY', label: 'Claim / Evidence Kalitesi', href: '/admin/product-ai/evidence-quality' },
      { key: 'AI_OPERATIONS', label: 'AI Operasyonları', href: '/admin/product-ai/operations' },
    ],
  },
  {
    key: 'LISTINGS',
    label: 'İlanlar',
    icon: Car,
    children: [
      { key: 'LISTING_MODERATION', label: 'İlan Moderasyonu', href: '/admin/listings' },
      { key: 'LISTING_PERFORMANCE', label: 'İlan Performansı', href: '/admin/listings/performance' },
      { key: 'LISTING_QUALITY', label: 'İlan Veri Sağlığı', href: '/admin/listings/quality' },
    ],
  },
  {
    key: 'ISI_CEPTE',
    label: 'İşi Cepte',
    icon: Store,
    children: [
      { key: 'ISI_CEPTE_OVERVIEW', label: 'Genel Bakış', href: '/admin/isi-cepte' },
      { key: 'ISI_CEPTE_PROVIDERS', label: 'İşletmeler / Ustalar', href: '/admin/isi-cepte/providers' },
      { key: 'ISI_CEPTE_REGIONAL', label: 'Bölgesel Görünürlük', href: '/admin/isi-cepte/regional-visibility' },
      { key: 'ISI_CEPTE_SHOWCASE', label: 'Vitrin', href: '/admin/isi-cepte/showcase' },
      { key: 'ISI_CEPTE_NATIONAL', label: 'Ülke Geneli', href: '/admin/isi-cepte/national-visibility' },
      { key: 'ISI_CEPTE_PURCHASES', label: 'Satın Alımlar', href: '/admin/isi-cepte/purchases' },
    ],
  },
  {
    key: 'FINANCE',
    label: 'Finans',
    icon: CircleDollarSign,
    children: [
      { key: 'REVENUE', label: 'Finans Özeti & MRR', href: '/admin/finance' },
      { key: 'SUBSCRIPTIONS', label: 'Aktif Abonelikler', href: '/admin/finance/subscriptions' },
      { key: 'ONE_TIME_PACKAGES', label: 'Tek Seferlik Paketler', href: '/admin/finance/packages' },
      { key: 'COSTS', label: 'AI & Altyapı Maliyetleri', href: '/admin/finance/ai-costs' },
    ],
  },
  {
    key: 'CLUB',
    label: 'Tork Scout Club',
    icon: Shield,
    children: [
      { key: 'CLUB_POSTS', label: 'Gönderiler & Moderasyon', href: '/admin/club/posts' },
      { key: 'CLUB_USERS', label: 'Üyeler & Moderatörler', href: '/admin/club/members' },
      { key: 'CLUB_REPORTS', label: 'Şikayetler', href: '/admin/club/reports' },
    ],
  },
  {
    key: 'VEHICLE_DATA',
    label: 'Araç Verisi',
    icon: Database,
    children: [
      { key: 'VARIANT_DB', label: 'Araç Varyant Veritabanı', href: '/admin/vehicle-data/variants' },
      { key: 'VEHICLE_QUALITY', label: 'Araç Veri Kalitesi', href: '/admin/vehicle-data/quality' },
      { key: 'VEHICLE_GUIDE', label: 'Araç Rehberi Yönetimi', href: '/admin/vehicle-data/guide' },
      { key: 'VEHICLE_APPROVALS', label: 'Araç Onayları', href: '/admin/vehicle-data/approvals' },
      { key: 'COMMON_PROFILES', label: 'Ortak Araç Yönetimi', href: '/admin/vehicle-data/profiles' },
    ],
  },
  {
    key: 'SYSTEM',
    label: 'Sistem ve Güvenlik',
    icon: Settings,
    children: [
      { key: 'ROLES', label: 'Admin & Yetkiler', href: '/admin/system/roles' },
      { key: 'AUDIT_LOGS', label: 'Sistem Audit Logları', href: '/admin/system/audit-log' },
      { key: 'SYSTEM_HEALTH', label: 'Sistem Sağlığı', href: '/admin/system/health' },
    ],
  },
];

export function UnifiedAdminSidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const nextState: Record<string, boolean> = {};
    adminNavigationGroups.forEach((group) => {
      if (group.children?.some((child) => pathname === child.href || pathname.startsWith(child.href))) {
        nextState[group.key] = true;
      }
    });
    setOpenGroups((prev) => ({ ...prev, ...nextState }));
  }, [pathname]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-64 bg-[#090d16] border-r border-white/10 flex flex-col justify-between shrink-0 min-h-screen max-h-screen sticky top-0 overflow-y-auto text-slate-300 font-sans select-none z-30">
      <div className="p-4 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-500/30">
            TS
          </div>
          <div>
            <span className="font-black text-sm text-white tracking-wider uppercase block">TorqueScout</span>
            <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest block font-mono">
              Backoffice
            </span>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-1">
          {adminNavigationGroups.map((group) => {
            const Icon = group.icon;
            const isOpen = !!openGroups[group.key];
            const hasChildren = group.children && group.children.length > 0;
            const isGroupActive =
              group.href === pathname || group.children?.some((c) => pathname === c.href || pathname.startsWith(c.href));

            if (!hasChildren && group.href) {
              return (
                <Link
                  key={group.key}
                  href={group.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    isGroupActive
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{group.label}</span>
                </Link>
              );
            }

            return (
              <div key={group.key} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    isGroupActive
                      ? 'bg-white/5 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-orange-400" />
                    <span>{group.label}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>

                {isOpen && group.children && (
                  <div className="pl-9 pr-1 py-1 space-y-1 border-l-2 border-white/5 ml-4">
                    {group.children.map((child) => {
                      const isChildActive = pathname === child.href;
                      return (
                        <Link
                          key={child.key}
                          href={child.href}
                          className={`block px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                            isChildActive
                              ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-white/10 space-y-3 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-orange-400 font-mono">
            ADM
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">Sistem Yöneticisi</p>
            <p className="text-[10px] text-slate-500 font-mono truncate">admin@torquescout.com</p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 rounded-xl text-xs font-bold transition border border-white/5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Kullanıcı Görünümüne Dön</span>
        </Link>
      </div>
    </aside>
  );
}
