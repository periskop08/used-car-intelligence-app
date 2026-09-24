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
}

interface ReportSummary {
  id: string;
  mode: string;
  variantId: string | null;
  listingId: string | null;
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
  vehicleIdentity: VehicleIdentity | null;
}

export default function AdminVehicleReportsPage() {
  const router = useRouter();

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || 'Rapor listesi alınırken beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [search, brandFilter, modelFilter, yearFilter, statusFilter, onlyEdited, onlyWithFeedback, onlyDraft, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
  };

  const handleResetFilters = () => {
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
                    <p className="font-semibold text-slate-300">Kayıtlı Araç Raporu Bulunamadı</p>
                    <p className="text-slate-500 text-[11px]">
                      Arama kriterlerinizi değiştirebilir veya filtreleri sıfırlayabilirsiniz.
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
                          <div className="space-y-0.5">
                            <span className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">
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

                      {/* User Feedback Count */}
                      <td className="py-4 px-3">
                        {report.pendingIssueCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>{report.pendingIssueCount} Bildirim</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">Sorun yok</span>
                        )}
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
