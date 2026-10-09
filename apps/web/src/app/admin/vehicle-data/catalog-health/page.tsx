'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  Eye,
  Database,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface AnomalyItem {
  id: string;
  category: string;
  severity: string;
  vehicleType?: string;
  brandName?: string;
  modelName?: string;
  source: string;
  title: string;
  description: string;
  rawPayload?: any;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface Metrics {
  totalVariants: number;
  openCount: number;
  criticalCount: number;
  resolvedCount: number;
  totalTracked: number;
  healthScore: number;
}

export default function CatalogHealthAdminPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalVariants: 588099,
    openCount: 0,
    criticalCount: 0,
    resolvedCount: 0,
    totalTracked: 0,
    healthScore: 100,
  });
  const [items, setItems] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchAnomalies = useCallback(() => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (severityFilter !== 'ALL') params.append('severity', severityFilter);
    if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
    if (search.trim()) params.append('search', search.trim());

    fetch(`${API_BASE_URL}/admin/catalog-watchdog/anomalies?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Katalog anomalileri yüklenemedi.');
        return res.json();
      })
      .then((data) => {
        setItems(data.items || []);
        if (data.metrics) setMetrics(data.metrics);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [statusFilter, severityFilter, categoryFilter, search]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const handleRunScan = async () => {
    setScanning(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/catalog-watchdog/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Tarama tamamlanamadı.');
      showToast(
        `Sağlık taraması tamamlandı! ${data.scannedModels} model kontrol edildi (${data.newAnomaliesCount} yeni, ${data.autoResolvedCount} çözüldü).`
      );
      fetchAnomalies();
    } catch (err: any) {
      showToast(`Hata: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (id: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/catalog-watchdog/anomalies/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: 'Admin paneli üzerinden çözüldü olarak işaretlendi.' }),
      });
      if (!res.ok) throw new Error('İşlem başarısız.');
      showToast('Kayıt başarıyla çözüldü olarak güncellendi.');
      fetchAnomalies();
    } catch (err: any) {
      showToast(`Hata: ${err.message}`);
    }
  };

  const handleIgnore = async (id: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/catalog-watchdog/anomalies/${id}/ignore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Admin incelemesi sonucu gözardı edildi.' }),
      });
      if (!res.ok) throw new Error('İşlem başarısız.');
      showToast('Kayıt gözardı edildi.');
      fetchAnomalies();
    } catch (err: any) {
      showToast(`Hata: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Katalog Sağlığı & Hata Takibi
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
            Veri kazıma (scraper), içe aktarma ayrıştırıcıları, eksik model yılları ve filtre kademelendirme hatalarının merkezi izleme ve çözümleme paneli.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Katalog Taranıyor...' : 'Sağlık Taraması Başlat'}</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Variants */}
        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Toplam Araç Varyantı</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics.totalVariants.toLocaleString('tr-TR')}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Tüm kategoriler aktif ve onaylı</span>
          </div>
        </div>

        {/* Health Score */}
        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Katalog Sağlık Skoru</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            %{metrics.healthScore}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Zorunlu alanlarda %100 bütünlük</span>
          </div>
        </div>

        {/* Open Anomalies */}
        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Açık / Bekleyen Sorunlar</span>
            <AlertTriangle className={`w-4 h-4 ${metrics.openCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl font-black ${metrics.openCount > 0 ? 'text-amber-400' : 'text-white'}`}>
            {metrics.openCount}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            {metrics.criticalCount > 0 ? (
              <span className="text-rose-400 font-bold">{metrics.criticalCount} kritik sorun</span>
            ) : (
              <span>Aktif kritik bloklayıcı yok</span>
            )}
          </div>
        </div>

        {/* Resolved Anomalies */}
        <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Çözülen Hatalar</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics.resolvedCount}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <span>Parser ve regex iyileştirmeleri</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Marka, model veya hata ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-orange-500 font-semibold"
          >
            <option value="ALL">Durum: Tümü</option>
            <option value="OPEN">Açık / Beklemede</option>
            <option value="RESOLVED">Çözüldü</option>
            <option value="IGNORED">Gözardı Edildi</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-orange-500 font-semibold"
          >
            <option value="ALL">Önem: Tümü</option>
            <option value="CRITICAL">Kritik</option>
            <option value="WARNING">Uyarı</option>
            <option value="INFO">Bilgi</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-orange-500 font-semibold"
          >
            <option value="ALL">Tür: Tümü</option>
            <option value="PARSER_DROP">Parser Düşürmesi</option>
            <option value="MISSING_YEARS">Eksik Model Yılı</option>
            <option value="ORPHAN_MODEL">Varyantsız Model</option>
            <option value="CASCADE_ERROR">Filtre Hatası</option>
          </select>

          <button
            onClick={fetchAnomalies}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            title="Listeyi Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Anomaly Items List */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-white/5 space-y-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-semibold">Katalog hata kayıtları yükleniyor...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-white/5 space-y-3">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <h3 className="text-sm font-bold text-white">Harika! Açık Katalog Hatası Bulunmuyor</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Seçili filtrelere uygun herhangi bir hata kaydı yok. Tüm popüler modellerin tavan yılları güncel ve veritabanı filtreleri sorunsuz çalışıyor.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            const isCritical = item.severity === 'CRITICAL';
            const isResolved = item.status === 'RESOLVED';
            const isIgnored = item.status === 'IGNORED';

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isResolved
                    ? 'bg-slate-900/40 border-emerald-500/20'
                    : isCritical
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : 'bg-slate-900/60 border-white/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Severity */}
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : item.severity === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}
                      >
                        {item.severity === 'CRITICAL' ? 'Kritik' : item.severity === 'WARNING' ? 'Uyarı' : 'Bilgi'}
                      </span>

                      {/* Status */}
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                          isResolved
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : isIgnored
                            ? 'bg-slate-700/50 text-slate-400 border-slate-600'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                        }`}
                      >
                        {isResolved ? (
                          <>
                            <Check className="w-3 h-3" /> Çözüldü
                          </>
                        ) : isIgnored ? (
                          'Gözardı Edildi'
                        ) : (
                          'Beklemede (Açık)'
                        )}
                      </span>

                      {/* Source Badge (Where did the error come from?) */}
                      <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 border border-white/10 rounded-md text-[10px] font-bold">
                        Kaynak: {item.source}
                      </span>

                      {/* Vehicle Identity */}
                      {item.brandName && (
                        <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md text-[10px] font-bold">
                          {item.brandName} {item.modelName} {item.vehicleType ? `(${item.vehicleType})` : ''}
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{item.title}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.description}</p>
                    </div>

                    {/* Resolution / Metadata details */}
                    <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Tespit: {new Date(item.detectedAt).toLocaleString('tr-TR')}
                      </span>
                      {item.resolvedAt && (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Çözüm: {item.resolvedBy || 'Admin'} ({new Date(item.resolvedAt).toLocaleDateString('tr-TR')})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                    {item.rawPayload && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isExpanded ? 'Gizle' : 'Ham Veri'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}

                    {!isResolved && (
                      <>
                        <button
                          onClick={() => handleResolve(item.id)}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Çözüldü</span>
                        </button>
                        <button
                          onClick={() => handleIgnore(item.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition"
                        >
                          Gözardı Et
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Raw Payload */}
                {isExpanded && item.rawPayload && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-2 font-mono text-[11px]">
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>Ham Hata ve Bağlam Verisi</span>
                    </div>
                    <pre className="p-3 bg-slate-950 rounded-xl border border-white/5 text-cyan-300 overflow-x-auto leading-relaxed">
                      {JSON.stringify(item.rawPayload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
