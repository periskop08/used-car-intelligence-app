'use client';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  reportNavigationConfig,
  ReportNavigationGroup,
} from './reportNavigationConfig';
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
  Search,
  History,
  Menu,
  X,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Bot,
  Car,
  CircleDollarSign,
  Shield,
  Database,
  Megaphone,
  Settings,
};

const RECENT_REPORTS_KEY = 'torquescout_recent_reports_v1';

interface RecentReport {
  href: string;
  label: string;
  categoryLabel: string;
}

const ReportSidebarInner: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Identify active group based on current pathname / searchParams
  const activeInfo = useMemo(() => {
    for (const group of reportNavigationConfig) {
      if (group.href && group.href === pathname) {
        return { groupKey: group.key, itemKey: group.key, label: group.label, categoryLabel: group.label, href: group.href };
      }
      if (group.children) {
        for (const child of group.children) {
          if (child.href === fullPath || child.href === pathname) {
            return { groupKey: group.key, itemKey: child.key, label: child.label, categoryLabel: group.label, href: child.href };
          }
        }
      }
    }
    return null;
  }, [pathname, fullPath]);

  // Auto-expand active category when route changes
  useEffect(() => {
    if (activeInfo?.groupKey && activeInfo.groupKey !== 'OVERVIEW') {
      setExpandedGroups({ [activeInfo.groupKey]: true });
    }
  }, [activeInfo]);

  // Load recent reports from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_REPORTS_KEY);
      if (stored) {
        setRecentReports(JSON.parse(stored));
      }
    } catch (e) {
      // ignore storage error
    }
  }, []);

  // Track active report in recent reports list
  useEffect(() => {
    if (!activeInfo || activeInfo.groupKey === 'OVERVIEW') return;
    setRecentReports((prev) => {
      const filtered = prev.filter((r) => r.href !== activeInfo.href);
      const updated = [{ href: activeInfo.href, label: activeInfo.label, categoryLabel: activeInfo.categoryLabel }, ...filtered].slice(0, 3);
      try {
        localStorage.setItem(RECENT_REPORTS_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  }, [activeInfo]);

  // Toggle group expansion (accordion: only 1 expanded by default)
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const nextState = !prev[key];
      return nextState ? { [key]: true } : {};
    });
  };

  // Filter groups and items based on search query
  const filteredConfig = useMemo(() => {
    if (!searchQuery.trim()) return reportNavigationConfig;
    const q = searchQuery.toLowerCase().trim();

    return reportNavigationConfig.map((group) => {
      if (group.label.toLowerCase().includes(q)) {
        return group;
      }
      if (group.children) {
        const matchingChildren = group.children.filter(
          (child) =>
            child.label.toLowerCase().includes(q) ||
            child.keywords?.some((k) => k.toLowerCase().includes(q))
        );
        if (matchingChildren.length > 0) {
          return { ...group, children: matchingChildren };
        }
      }
      return null;
    }).filter(Boolean) as ReportNavigationGroup[];
  }, [searchQuery]);

  const renderNavContent = () => (
    <div className="space-y-4">
      {/* Compact Search Field */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rapor ara..."
          className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Recently Viewed Reports */}
      {recentReports.length > 0 && !searchQuery && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <History className="w-3 h-3 text-orange-400" />
            <span>Son Kullanılanlar</span>
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            {recentReports.map((recent, idx) => (
              <Link
                key={idx}
                href={recent.href}
                onClick={() => setIsMobileOpen(false)}
                className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-slate-950/40 hover:bg-slate-800/50 border border-white/5 text-slate-300 hover:text-orange-400 transition-all"
              >
                <span className="truncate">{recent.label}</span>
                <span className="text-[9px] text-slate-500 ml-2 shrink-0 font-sans">{recent.categoryLabel}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Accordion List */}
      <nav className="space-y-1.5 text-xs font-medium">
        {filteredConfig.map((group) => {
          const IconComp = ICON_MAP[group.iconName] || LayoutDashboard;
          const isDirectLink = !!group.href;
          const isGroupExpanded = searchQuery ? true : !!expandedGroups[group.key];
          const isGroupActive = activeInfo?.groupKey === group.key;

          if (isDirectLink) {
            const isOverviewActive = pathname === '/admin/reports';
            return (
              <Link
                key={group.key}
                href={group.href!}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                  isOverviewActive
                    ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-orange-400 font-bold border border-orange-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <IconComp className={`w-4 h-4 ${isOverviewActive ? 'text-orange-400' : 'text-slate-400'}`} />
                <span className="font-bold text-xs">{group.label}</span>
              </Link>
            );
          }

          return (
            <div key={group.key} className="rounded-xl overflow-hidden transition-all border border-transparent">
              {/* Category Header Button */}
              <button
                onClick={() => toggleGroup(group.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                  isGroupActive
                    ? 'bg-slate-800/60 text-slate-100 border border-white/10 font-bold'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComp className={`w-4 h-4 ${isGroupActive ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold">{group.label}</span>
                </div>
                {isGroupExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200" />
                )}
              </button>

              {/* Sub-Items Collapsible Accordion */}
              {isGroupExpanded && group.children && (
                <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-0.5 py-1 transition-all duration-200">
                  {group.children.map((child) => {
                    const isItemActive = child.href === fullPath || child.href === pathname;
                    return (
                      <Link
                        key={child.key}
                        href={child.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`block px-3 py-1.5 rounded-lg text-xs transition-all ${
                          isItemActive
                            ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
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

        {filteredConfig.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-500 font-medium">
            Aramanızla eşleşen rapor bulunamadı.
          </div>
        )}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Trigger Button */}
      <div className="lg:hidden w-full mb-4">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/80 border border-white/10 rounded-2xl text-slate-200 text-xs font-bold shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Menu className="w-4 h-4 text-orange-400" />
            <span>Rapor Menüsü</span>
          </div>
          <span className="text-[10px] text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full">
            {activeInfo?.label || 'Kategoriler'}
          </span>
        </button>
      </div>

      {/* Mobile Overlay Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <div className="relative w-full max-w-xs bg-slate-900 border-r border-white/10 p-5 overflow-y-auto space-y-4 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-sm font-black text-slate-200 tracking-tight">Raporlar Merkezi</span>
              <button onClick={() => setIsMobileOpen(false)} className="p-1 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavContent()}
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0 bg-slate-900/40 p-4 rounded-2xl border border-white/5 space-y-4 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto custom-scrollbar backdrop-blur-md">
        <div className="px-1 py-0.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Rapor Menüsü</span>
        </div>
        {renderNavContent()}
      </aside>
    </>
  );
};

export const ReportSidebar: React.FC = () => {
  return (
    <Suspense fallback={<aside className="w-72 p-4 bg-slate-900/40 rounded-2xl border border-white/5 text-slate-500 text-xs">Yükleniyor...</aside>}>
      <ReportSidebarInner />
    </Suspense>
  );
};
