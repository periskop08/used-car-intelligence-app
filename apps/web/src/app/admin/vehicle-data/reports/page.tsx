'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Bot,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Archive,
  Car,
  Mountain,
  Truck,
  Bike,
  Layers,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface VehicleIdentity {
  brand: string;
  model: string;
  year: number;
  bodyType: string;
  trim: string;
  engineCode: string;
  displacementCc?: number;
  powerHp?: number;
  transmission: string;
  fuelType: string;
  vehicleType?: string;
}

interface ReportSummary {
  id: string;
  mode: string;
  variantId: string | null;
  listingId: string | null;
  vehicleType?: string;
  status: string;
  versionNumber: number;
  isCurrentPublished: boolean;
  isDraft: boolean;
  sourceType: string;
  changeNote: string | null;
  editedByAdminId: string | null;
  qualityScore: number | null;
  provider: string | null;
  modelName: string | null;
  generatedAt: string;
  completedAt: string | null;
  updatedAt: string;
  pendingIssueCount: number;
  likeCount: number;
  dislikeCount: number;
  vehicleIdentity: VehicleIdentity | null;
}

export default function AdminVehicleReportsPage() {
  const router = useRouter();

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'active' (Yayında) | 'drafts' (Taslaklar) | 'archived' (Arşiv) | 'all' (Tümü)
  const [activeTab, setActiveTab] = useState<'active' | 'drafts' | 'archived' | 'all'>('active');
  const [counts, setCounts] = useState<{ active: number; drafts: number; archived: number; all: number }>({
    active: 0,
    drafts: 0,
    archived: 0,
    all: 0,
  });

  // Category Filter & Counts (Otomobil, Arazi & SUV, Minivan & Panelvan, Motosiklet)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<{
    automobile: number;
    suvPickup: number;
    minivanPanelvan: number;
    motorcycle: number;
  }>({
    automobile: 0,
    suvPickup: 0,
    minivanPanelvan: 0,
    motorcycle: 0,
  });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyEdited, setOnlyEdited] = useState(false);
  const [onlyWithFeedback, setOnlyWithFeedback] = useState(false);
  const [onlyDraft, setOnlyDraft] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const params = new URLSearchParams();

      params.append('tab', activeTab);
      if (selectedCategory) params.append('vehicleType', selectedCategory);
      if (search.trim()) params.append('search', search.trim());
      if (brandFilter.trim()) params.append('brand', brandFilter.trim());
      if (modelFilter.trim()) params.append('model', modelFilter.trim());
      if (yearFilter.trim()) params.append('year', yearFilter.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (onlyEdited) params.append('isEdited', 'true');
      if (onlyWithFeedback) params.append('hasFeedback', 'true');
      if (onlyDraft) params.append('isDraft', 'true');

      params.append('page', page.toString());
      params.append('limit', '20');

      const res = await fetch(`${API_BASE_URL}/admin/vehicle-reports?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Bu sayfaya erişim yetkiniz bulunmuyor (Admin / Moderatör yetkisi gereklidir).');
        }
        throw new Error(`Raporlar yüklenemedi: HTTP ${res.status}`);
      }

      const data = await res.json();
      setReports(data.reports || []);
      setTotalReports(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.counts) {
        setCounts(data.counts);
      }
      if (data.categoryCounts) {
        setCategoryCounts(data.categoryCounts);
      }
    } catch (err: any) {
      setError(err.message || 'Rapor listesi alınırken beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, search, brandFilter, modelFilter, yearFilter, statusFilter, onlyEdited, onlyWithFeedback, onlyDraft, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
  };

  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSearch('');
    setBrandFilter('');
    setModelFilter('');
    setYearFilter('');
    setStatusFilter('');
    setOnlyEdited(false);
    setOnlyWithFeedback(false);
    setOnlyDraft(false);
    setPage(1);
  };

  const renderSourceBadge = (sourceType: string, versionNumber: number) => {
    if (sourceType === 'ADMIN_EDIT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
          <Edit3 className="w-3 h-3" />
          <span>v{versionNumber} • Admin Düzenledi</span>
        </span>
      );
    }
    if (sourceType === 'RESEARCH_REFRESH') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          <RefreshCw className="w-3 h-3" />
          <span>v{versionNumber} • Yeniden Araştırıldı</span>
        </span>
      );
    }
    if (sourceType === 'RESTORED_DRAFT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Sparkles className="w-3 h-3" />
          <span>v{versionNumber} • Geri Yüklendi</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
        <Bot className="w-3 h-3" />
        <span>v{versionNumber} • AI Üretti</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Araç Raporları Yönetim Merkezi
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Kayıtlı ve üretilmiş araç raporlarını inceleyin, kullanıcı görünümünde düzenleyin ve versiyonlayın.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Toplam Rapor</span>
            <span className="text-lg font-black text-white">{totalReports}</span>
          </div>
          <button
            onClick={() => fetchReports()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-orange-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* 4 VEHICLE CATEGORY BOXES (Otomobil, Arazi SUV & Pickup, Minivan & Panelvan, Motosiklet) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            id: 'AUTOMOBILE',
            label: 'Otomobil',
            icon: Car,
            count: categoryCounts.automobile,
            bgClass: 'bg-blue-500/10',
            borderClass: 'border-blue-500/20',
            textClass: 'text-blue-400',
            activeClass: 'border-blue-500 bg-slate-900 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/40',
            activeBadge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          },
          {
            id: 'SUV_PICKUP',
            label: 'Arazi, SUV & Pickup',
            icon: Mountain,
            count: categoryCounts.suvPickup,
            bgClass: 'bg-emerald-500/10',
            borderClass: 'border-emerald-500/20',
            textClass: 'text-emerald-400',
            activeClass: 'border-emerald-500 bg-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40',
            activeBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          },
          {
            id: 'MINIVAN_PANELVAN',
            label: 'Minivan & Panelvan',
            icon: Truck,
            count: categoryCounts.minivanPanelvan,
            bgClass: 'bg-amber-500/10',
            borderClass: 'border-amber-500/20',
            textClass: 'text-amber-400',
            activeClass: 'border-amber-500 bg-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/40',
            activeBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          },
          {
            id: 'MOTORCYCLE',
            label: 'Motosiklet',
            icon: Bike,
            count: categoryCounts.motorcycle,
            bgClass: 'bg-purple-500/10',
            borderClass: 'border-purple-500/20',
            textClass: 'text-purple-400',
            activeClass: 'border-purple-500 bg-slate-900 shadow-[0_0_20px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/40',
            activeBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          },
        ].map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory((prev) => (prev === cat.id ? null : cat.id));
                setPage(1);
              }}
              className={`relative flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer overflow-hidden group ${
                isSelected
                  ? cat.activeClass
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`p-2.5 rounded-xl border transition-all ${
                    isSelected
                      ? `${cat.activeBadge} shadow-md`
                      : `${cat.bgClass} ${cat.borderClass} ${cat.textClass} group-hover:scale-105`
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span
                    className={`text-xs font-bold block transition-colors ${
                      isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {cat.count} Rapor
                  </span>
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center">
                {isSelected ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cat.activeBadge}`}>
                    Aktif
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-700 group-hover:bg-slate-500 transition-colors" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Category Notice Banner */}
      {selectedCategory && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-300">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>
              Şu an yalnızca <strong>{
                selectedCategory === 'AUTOMOBILE' ? 'Otomobil' :
                selectedCategory === 'SUV_PICKUP' ? 'Arazi, SUV & Pickup' :
                selectedCategory === 'MINIVAN_PANELVAN' ? 'Minivan & Panelvan' : 'Motosiklet'
              }</strong> kategorisindeki raporlar filtreleniyor.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory(null);
              setPage(1);
            }}
            className="text-xs font-bold text-orange-400 hover:text-orange-200 underline cursor-pointer shrink-0 ml-2"
          >
            Filtreyi Temizle (Tümü)
          </button>
        </div>
      )}

      {/* TABS: Yayındaki Raporlar, Taslaklar, Arşiv, Tümü */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
        <button
          type="button"
          onClick={() => {
            setActiveTab('active');
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Yayındaki Güncel Raporlar</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 font-mono text-emerald-400 border border-emerald-500/30">
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('drafts');
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'drafts'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Taslaklar</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 font-mono text-amber-400 border border-amber-500/30">
            {counts.drafts}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('archived');
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'archived'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Archive className="w-4 h-4 text-blue-400" />
          <span>Arşiv (Eski Versiyonlar)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 font-mono text-blue-400 border border-blue-500/30">
            {counts.archived}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-400" />
          <span>Tüm Raporlar</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 font-mono text-purple-400 border border-purple-500/30">
            {counts.all}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Query */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Marka, model, varyant veya rapor ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          {/* Brand */}
          <div>
            <input
              type="text"
              placeholder="Marka (örn. BMW)"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          {/* Model */}
          <div>
            <input
              type="text"
              placeholder="Model (örn. 3 Serisi)"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500/50 transition-colors cursor-pointer"
            >
              <option value="">Tüm Durumlar</option>
              <option value="COMPLETED">Tamamlandı</option>
              <option value="SAFE_FALLBACK">Güvenli Yedek</option>
              <option value="FAILED">Başarısız</option>
            </select>
          </div>
        </form>

        {/* Quick Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={onlyDraft}
                onChange={(e) => {
                  setOnlyDraft(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-orange-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Yalnızca Taslaklar</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={onlyEdited}
                onChange={(e) => {
                  setOnlyEdited(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-purple-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Admin Tarafından Düzenlenenler</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={onlyWithFeedback}
                onChange={(e) => {
                  setOnlyWithFeedback(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                <span>Kullanıcı Bildirimi Olanlar</span>
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            {(search || brandFilter || modelFilter || yearFilter || statusFilter || onlyEdited || onlyWithFeedback || onlyDraft) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
              >
                Filtreleri Temizle
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPage(1);
                fetchReports();
              }}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition shadow"
            >
              Filtrele
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold select-none">
              <tr>
                <th className="py-3.5 px-4">Araç / Varyant Kimliği</th>
                <th className="py-3.5 px-3">Durum</th>
                <th className="py-3.5 px-3">Versiyon / Kaynak</th>
                <th className="py-3.5 px-3">Kullanıcı Bildirimi</th>
                <th className="py-3.5 px-3">Oluşturulma / Güncelleme</th>
                <th className="py-3.5 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-400" />
                    <span>Araç raporları yükleniyor...</span>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="font-semibold text-slate-300">
                      {activeTab === 'archived'
                        ? 'Arşivlenmiş Eski Rapor Bulunamadı'
                        : activeTab === 'drafts'
                        ? 'Kayıtlı Taslak Rapor Bulunamadı'
                        : activeTab === 'active'
                        ? 'Yayında Güncel Araç Raporu Bulunamadı'
                        : 'Kayıtlı Araç Raporu Bulunamadı'}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Arama kriterlerinizi değiştirebilir veya diğer sekmeleri inceleyebilirsiniz.
                    </p>
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const veh = report.vehicleIdentity;
                  const isPublished = report.isCurrentPublished && !report.isDraft;

                  return (
                    <tr
                      key={report.id}
                      onClick={() => router.push(`/admin/vehicle-data/reports/${report.id}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Vehicle Identity */}
                      <td className="py-4 px-4">
                        {veh ? (
                          <div className="space-y-1">
                            {/* Category badge */}
                            {(() => {
                              const vType = (report.vehicleType || veh.vehicleType || veh.bodyType || '').toUpperCase();
                              const isMoto = vType.includes('MOTO') || vType.includes('MOTOSİKLET');
                              const isSuv = vType.includes('SUV') || vType.includes('PICKUP') || vType.includes('ARAZİ');
                              const isVan = vType.includes('MINIVAN') || vType.includes('PANELVAN') || vType.includes('COMMERCIAL') || vType.includes('TİCARİ');

                              const catConfig = isMoto
                                ? { label: 'Motosiklet', icon: Bike, badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/30' }
                                : isSuv
                                ? { label: 'Arazi, SUV & Pickup', icon: Mountain, badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' }
                                : isVan
                                ? { label: 'Minivan & Panelvan', icon: Truck, badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30' }
                                : { label: 'Otomobil', icon: Car, badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30' };
                              const CatIcon = catConfig.icon;

                              return (
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConfig.badgeClass}`}>
                                  <CatIcon className="w-3 h-3" />
                                  <span>{catConfig.label}</span>
                                </div>
                              );
                            })()}

                            <span className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors block">
                              {veh.year} {veh.brand} {veh.model}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                              {veh.trim && <span className="text-slate-300 font-medium">{veh.trim}</span>}
                              {veh.engineCode && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span>{veh.engineCode}</span>
                                </>
                              )}
                              {veh.powerHp && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span>{veh.powerHp} HP</span>
                                </>
                              )}
                              {veh.transmission && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span>{veh.transmission}</span>
                                </>
                              )}
                              {veh.fuelType && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span>{veh.fuelType}</span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              ID: {report.id}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="font-bold text-white text-sm">
                              {report.mode === 'LISTING_REPORT' ? 'İlan Özel Rapor' : 'Genel Araç Raporu'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              ID: {report.id}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Yayında</span>
                          </span>
                        ) : report.isDraft ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>Taslak</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            <span>Arşiv</span>
                          </span>
                        )}
                      </td>

                      {/* Version & Source */}
                      <td className="py-4 px-3">
                        <div className="space-y-1">
                          {renderSourceBadge(report.sourceType, report.versionNumber)}
                          {report.changeNote && (
                            <p className="text-[11px] text-slate-400 max-w-[200px] truncate" title={report.changeNote}>
                              📝 {report.changeNote}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* User Feedback & Votes */}
                      <td className="py-4 px-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5 text-xs">
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold" title="Beğeni sayısı">
                              <span>👍</span>
                              <span>{report.likeCount ?? 0}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 text-rose-400 font-semibold" title="Beğenmeme sayısı">
                              <span>👎</span>
                              <span>{report.dislikeCount ?? 0}</span>
                            </span>
                          </div>

                          {report.pendingIssueCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <ShieldAlert className="w-3 h-3" />
                              <span>{report.pendingIssueCount} Bildirim</span>
                            </span>
                          ) : (
                            (!report.likeCount && !report.dislikeCount) ? (
                              <span className="text-slate-500 text-[11px] block">Sorun yok</span>
                            ) : null
                          )}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-3 text-slate-400 text-[11px] space-y-0.5">
                        <div title="Oluşturulma Tarihi">
                          Oluşum: {new Date(report.generatedAt).toLocaleDateString('tr-TR')}
                        </div>
                        <div className="text-slate-500" title="Son Güncellenme">
                          Güncelleme: {new Date(report.updatedAt).toLocaleDateString('tr-TR')}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/admin/vehicle-data/reports/${report.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-orange-600 hover:text-white border border-slate-700 hover:border-orange-500 text-slate-200 rounded-xl text-xs font-semibold transition-all shadow"
                        >
                          <span>Görüntüle / Yönet</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Toplam <span className="font-bold text-white">{totalReports}</span> rapordan{' '}
              <span className="font-bold text-white">{(page - 1) * 20 + 1}</span> -{' '}
              <span className="font-bold text-white">{Math.min(page * 20, totalReports)}</span> arası gösteriliyor
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Sayfa <span className="text-white font-bold">{page}</span> / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
