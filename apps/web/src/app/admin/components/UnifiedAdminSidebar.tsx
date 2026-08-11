'use client';

import React, { useState } from 'react';
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
  Megaphone,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  ShieldAlert,
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
      { key: 'USER_MESSAGES', label: 'Kullanıcı Mesajları', href: '/admin/reports/messaging' },
    ],
  },
  {
    key: 'PRODUCT_AI',
    label: 'Ürün ve AI',
    icon: Bot,
    children: [
      { key: 'AI_REPORTS', label: 'AI Raporları', href: '/admin/reports/product/ai-reports' },
      { key: 'RESEARCH_QUEUE', label: 'Araştırma Kuyruğu', href: '/admin/product-ai/research-queue' },
      { key: 'EVIDENCE_QUALITY', label: 'Claim / Evidence Kalitesi', href: '/admin/reports/vehicle-data/evidence' },
      { key: 'AI_COSTS', label: 'AI Kullanımı & Maliyet', href: '/admin/reports/system-ai' },
      { key: 'PROVIDER_HEALTH', label: 'Provider Sağlığı', href: '/admin/product-ai/provider-health' },
    ],
  },
  {
    key: 'LISTINGS',
    label: 'İlanlar',
    icon: Car,
    children: [
      { key: 'LISTING_MODERATION', label: 'İlan Moderasyonu', href: '/admin/listings' },
      { key: 'LISTING_PERFORMANCE', label: 'İlan Performansı', href: '/admin/reports/listings/performance' },
      { key: 'LISTING_QUALITY', label: 'Kalite Denetimi', href: '/admin/reports/listings/quality' },
    ],
  },
  {
    key: 'FINANCE',
    label: 'Finans',
    icon: CircleDollarSign,
    children: [
      { key: 'REVENUE', label: 'Finans Özeti & MRR', href: '/admin/reports/finance/revenue' },
      { key: 'SUBSCRIPTIONS', label: 'Aktif Abonelikler', href: '/admin/reports/finance/subscriptions' },
      { key: 'ONE_TIME_PACKAGES', label: 'Tek Seferlik Paketler', href: '/admin/reports/finance/one-time-packages' },
      { key: 'COSTS', label: 'Maliyetler & Kârlılık', href: '/admin/reports/finance/costs' },
    ],
  },
  {
    key: 'CLUB',
    label: 'Tork Scout Club',
    icon: Shield,
    children: [
      { key: 'CLUB_POSTS', label: 'Gönderiler & Moderasyon', href: '/admin/club' },
      { key: 'CLUB_USERS', label: 'Üyeler & Moderatörler', href: '/admin/club/users' },
      { key: 'CLUB_REPORTS', label: 'Şikayetler', href: '/admin/club/reports' },
    ],
  },
  {
    key: 'VEHICLE_DATA',
    label: 'Araç Verisi',
    icon: Database,
    children: [
      { key: 'VARIANT_DB', label: 'Araç Varyant Veritabanı', href: '/admin/vehicle-data/variants' },
      { key: 'VEHICLE_GUIDE', label: 'Araç Rehberi Yönetimi', href: '/admin/vehicle-data/guide' },
      { key: 'VEHICLE_APPROVALS', label: 'Araç Onayları', href: '/admin/vehicle-data/approvals' },
      { key: 'COMMON_PROFILES', label: 'Ortak Araç Yönetimi', href: '/admin/vehicle-data/profiles' },
      { key: 'DATA_COVERAGE', label: 'Veri Kalitesi & Kapsam', href: '/admin/reports/vehicle-data/coverage' },
    ],
  },
  {
    key: 'MARKETING',
    label: 'Pazarlama ve Kitle',
    icon: Megaphone,
    children: [
      { key: 'CAMPAIGNS', label: 'Kampanyalar & ROAS', href: '/admin/reports/marketing' },
      { key: 'GEOGRAPHY', label: 'Coğrafya ve Cihaz', href: '/admin/reports/geography-device' },
    ],
  },
  {
    key: 'SYSTEM',
    label: 'Sistem ve Güvenlik',
    icon: Settings,
    children: [
      { key: 'SYSTEM_HEALTH', label: 'Sistem Performansı', href: '/admin/reports/system-ai' },
      { key: 'SECURITY_LOGS', label: 'Audit & Güvenlik Kayıtları', href: '/admin/reports/security' },
    ],
  },
];

export function UnifiedAdminSidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    adminNavigationGroups.forEach((group) => {
      if (group.children?.some((child) => pathname === child.href || pathname.startsWith(child.href))) {
        initial[group.key] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-full lg:w-72 bg-[#080d1a] border-b lg:border-b-0 lg:border-r border-white/10 p-4 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Sidebar Header */}
      <div className="flex items-center gap-3 px-3 py-3 mb-4 rounded-xl bg-slate-900/80 border border-white/5">
        <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold">
          TS
        </div>
        <div>
          <h2 className="text-xs font-black text-white uppercase tracking-wider">TorqueScout</h2>
          <p className="text-[10px] font-semibold text-orange-400">Backoffice Admin Panel</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="space-y-1.5 flex-1">
        {adminNavigationGroups.map((group) => {
          const Icon = group.icon;
          const hasChildren = group.children && group.children.length > 0;
          const isGroupActive = hasChildren
            ? group.children!.some((child) => pathname === child.href || (child.href !== '/admin' && pathname.startsWith(child.href)))
            : pathname === group.href;
          const isOpen = openGroups[group.key] ?? isGroupActive;

          if (!hasChildren && group.href) {
            return (
              <Link
                key={group.key}
                href={group.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  isGroupActive
                    ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-500/10'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isGroupActive ? 'text-orange-400' : 'text-slate-400'}`} />
                <span>{group.label}</span>
              </Link>
            );
          }

          return (
            <div key={group.key} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isGroupActive
                    ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isGroupActive ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span>{group.label}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {isOpen && (
                <div className="pl-9 pr-1 py-1 space-y-1 border-l-2 border-white/5 ml-4">
                  {group.children!.map((child) => {
                    const isChildActive = pathname === child.href || (child.href !== '/admin' && pathname.startsWith(child.href));
                    return (
                      <Link
                        key={child.key}
                        href={child.href}
                        className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          isChildActive
                            ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30'
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

      {/* Footer Info */}
      <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500">
        <span>v1.0.0 Backoffice</span>
        <a href="/" className="hover:text-slate-300 transition">Ana Sayfa →</a>
      </div>
    </aside>
  );
}
