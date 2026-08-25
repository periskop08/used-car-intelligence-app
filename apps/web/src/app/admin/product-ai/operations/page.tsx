'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Activity,
  Bot,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  DollarSign,
  Cpu,
  Server,
  Database,
  Search,
  Filter,
  Play,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  X,
  FileText,
  Info,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

type TabKey = 'live' | 'queue' | 'errors' | 'cost-tokens' | 'provider-health';

type TimeRangeKey =
  | 'LAST_1_HOUR'
  | 'LAST_24_HOURS'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH';

const TIME_RANGES: { key: TimeRangeKey; label: string }[] = [
  { key: 'LAST_1_HOUR', label: 'Son 1 Saat' },
  { key: 'LAST_24_HOURS', label: 'Son 24 Saat' },
  { key: 'LAST_7_DAYS', label: 'Son 7 Gün' },
  { key: 'LAST_30_DAYS', label: 'Son 30 Gün' },
  { key: 'THIS_MONTH', label: 'Bu Ay' },
];

export default function AdminAiOperationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;

  const [activeTab, setActiveTab] = useState<TabKey>(
    tabParam && ['live', 'queue', 'errors', 'cost-tokens', 'provider-health'].includes(tabParam)
      ? tabParam
      : 'live',
  );

  const [timeRange, setTimeRange] = useState<TimeRangeKey>('LAST_24_HOURS');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Data states
  const [metrics, setMetrics] = useState<any>(null);
  const [liveStream, setLiveStream] = useState<any[]>([]);
  const [liveStreamTotal, setLiveStreamTotal] = useState(0);
  const [slowRequests, setSlowRequests] = useState<any[]>([]);
  const [errorsData, setErrorsData] = useState<any>(null);
  const [costData, setCostData] = useState<any>(null);
  const [providerData, setProviderData] = useState<any[]>([]);
  const [queueJobs, setQueueJobs] = useState<any[]>([]);

  // Queue Tab States & Race condition ref
  const [queueInitialLoading, setQueueInitialLoading] = useState(true);
  const [queueRefreshing, setQueueRefreshing] = useState(false);
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>('ALL');
  const [selectedQueueJob, setSelectedQueueJob] = useState<any>(null);
  const queueRequestIdRef = useRef(0);

  // Filters & Modal
  const [opTypeFilter, setOpTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrace, setSelectedTrace] = useState<any>(null);

  // Loadings
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchLiveMetrics = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/ai-operations/metrics?range=${timeRange}`,
        { headers: getHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [timeRange]);

  const fetchLiveStream = useCallback(async () => {
    try {
      const query = new URLSearchParams({
        limit: '50',
        operationType: opTypeFilter,
        status: statusFilter,
        search: searchQuery,
      });
      const res = await fetch(
        `${API_BASE_URL}/admin/ai-operations/live-stream?${query.toString()}`,
        { headers: getHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setLiveStream(data.items || []);
        setLiveStreamTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [opTypeFilter, statusFilter, searchQuery]);

  const fetchSlowRequests = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/ai-operations/slow-requests?range=${timeRange}&thresholdMs=2500`,
        { headers: getHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setSlowRequests(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [timeRange]);

  const fetchErrorsData = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/ai-operations/errors?range=${timeRange}`,
        { headers: getHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setErrorsData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [timeRange]);

  const fetchCostData = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/ai-operations/cost-tokens?range=${timeRange}`,
        { headers: getHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setCostData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [timeRange]);

  const fetchProviderStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/ai-operations/provider-status?range=${timeRange}`,
        { headers: getHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setProviderData(data.services || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [timeRange]);

  const fetchQueueJobs = useCallback(async (isSilent = false) => {
    const reqId = ++queueRequestIdRef.current;
    if (!isSilent && queueJobs.length === 0) {
      setQueueInitialLoading(true);
    }
    setQueueRefreshing(true);

    try {
      const res = await fetch(`${API_BASE_URL}/research/jobs`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        // Prevent race condition: only apply if this is the latest request
        if (reqId === queueRequestIdRef.current) {
          setQueueJobs(Array.isArray(data) ? data : []);
        }
      }
    } catch (e) {
      console.error('Queue fetch error:', e);
    } finally {
      if (reqId === queueRequestIdRef.current) {
        setQueueInitialLoading(false);
        setQueueRefreshing(false);
      }
    }
  }, [queueJobs.length]);

  const loadAllTabData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'live') {
      await Promise.all([fetchLiveMetrics(), fetchLiveStream(), fetchSlowRequests()]);
    } else if (activeTab === 'queue') {
      await fetchQueueJobs();
    } else if (activeTab === 'errors') {
      await fetchErrorsData();
    } else if (activeTab === 'cost-tokens') {
      await fetchCostData();
    } else if (activeTab === 'provider-health') {
      await fetchProviderStatus();
    }
    setLoading(false);
  }, [
    activeTab,
    fetchLiveMetrics,
    fetchLiveStream,
    fetchSlowRequests,
    fetchQueueJobs,
    fetchErrorsData,
    fetchCostData,
    fetchProviderStatus,
  ]);

  useEffect(() => {
    loadAllTabData();
  }, [loadAllTabData]);

  // Periodic auto refresh polling (every 6s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (activeTab === 'live') {
        fetchLiveMetrics();
        fetchLiveStream();
      } else if (activeTab === 'queue') {
        fetchQueueJobs(true);
      } else if (activeTab === 'provider-health') {
        fetchProviderStatus();
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, fetchLiveMetrics, fetchLiveStream, fetchQueueJobs, fetchProviderStatus]);

  const changeTab = (tab: TabKey) => {
    setActiveTab(tab);
    router.push(`/admin/product-ai/operations?tab=${tab}`, { scroll: false });
  };

  const handleRetryJob = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const res = await fetch(`${API_BASE_URL}/research/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('İş yeniden başlatılamadı.');
      await fetchQueueJobs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('Bu araştırma işini iptal etmek istediğinize emin misiniz?')) return;
    setActionLoading(jobId);
    try {
      const res = await fetch(`${API_BASE_URL}/research/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('İş iptal edilemedi.');
      await fetchQueueJobs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getOpBadge = (type: string) => {
    switch (type) {
      case 'VEHICLE_REPORT':
        return <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-semibold text-[10px]">Araç Raporu</span>;
      case 'VEHICLE_CHATBOT':
        return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold text-[10px]">Araç Chatbot</span>;
      case 'COMPARISON_REPORT':
        return <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-semibold text-[10px]">Karşılaştırma Raporu</span>;
      case 'COMPARISON_CHATBOT':
        return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-semibold text-[10px]">Karşılaştırma Chatbot</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-white/5 rounded font-semibold text-[10px]">{type}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold text-[10px] flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> BAŞARILI</span>;
      case 'SUCCESS_WITH_FALLBACK':
        return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-semibold text-[10px] flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> FALLBACK BAŞARILI</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-semibold text-[10px] flex items-center gap-1"><XCircle className="w-2.5 h-2.5" /> HATALI</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-white/5 rounded font-semibold text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">AI Operasyonları</h1>
            <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-[10px] font-mono font-bold uppercase tracking-wider">Canlı İzleme</span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            AI istekleri, araştırma süreçleri, provider durumu, hata ve maliyet metriklerinin canlı takibi.
          </p>
        </div>

        {/* Action controls & Shared time filter */}
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
            className="px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            {TIME_RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => loadAllTabData()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { key: 'live', label: 'Canlı Akış', icon: Activity },
          { key: 'queue', label: 'Kuyruk', icon: Clock },
          { key: 'errors', label: 'Hatalar', icon: AlertTriangle },
          { key: 'cost-tokens', label: 'Maliyet & Token', icon: DollarSign },
          { key: 'provider-health', label: 'Provider Durumu', icon: Cpu },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => changeTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CANLI AKIŞ */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1 font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Toplam İşlem</span>
              <div className="text-lg font-black text-white">
                {metrics?.hasData ? metrics.totalOperations : '—'}
              </div>
              <span className="text-[10px] text-slate-500 block">
                {metrics?.hasData ? `${timeRange} zaman diliminde` : 'Henüz veri yok'}
              </span>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1 font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Başarı Oranı</span>
              <div className="text-lg font-black text-emerald-400">
                {metrics?.hasData && metrics.successRate !== null ? `%${metrics.successRate}` : '—'}
              </div>
              <span className="text-[10px] text-slate-500 block">
                {metrics?.hasData ? 'Başarılı / Toplam' : 'Ölçülemiyor'}
              </span>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1 font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ort. Süre</span>
              <div className="text-lg font-black text-cyan-400">
                {metrics?.hasData && metrics.avgDurationMs !== null ? `${metrics.avgDurationMs}ms` : '—'}
              </div>
              <span className="text-[10px] text-slate-500 block">
                {metrics?.hasData ? 'Tamamlanma süresi' : 'Ölçülemiyor'}
              </span>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1 font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fallback Oranı</span>
              <div className="text-lg font-black text-amber-400">
                {metrics?.hasData && metrics.fallbackRate !== null ? `%${metrics.fallbackRate}` : '—'}
              </div>
              <span className="text-[10px] text-slate-500 block">
                {metrics?.hasData ? 'İkincil motor devrede' : 'Henüz veri yok'}
              </span>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1 font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hata Oranı</span>
              <div className="text-lg font-black text-rose-400">
                {metrics?.hasData && metrics.errorRate !== null ? `%${metrics.errorRate}` : '—'}
              </div>
              <span className="text-[10px] text-slate-500 block">
                {metrics?.hasData ? 'Başarısız istekler' : 'Ölçülemiyor'}
              </span>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1 font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cache Hit Oranı</span>
              <div className="text-lg font-black text-purple-400">
                {metrics?.hasData && metrics.cacheHitRate !== null ? `%${metrics.cacheHitRate}` : '—'}
              </div>
              <span className="text-[10px] text-slate-500 block">
                {metrics?.hasData && metrics.cacheHitRate !== null ? 'Önbellek isabeti' : 'Ölçülemiyor'}
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>İşlem Tipi:</span>
              </div>
              <select
                value={opTypeFilter}
                onChange={(e) => setOpTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-slate-200"
              >
                <option value="ALL">Tümü</option>
                <option value="VEHICLE_REPORT">Araç Raporu</option>
                <option value="VEHICLE_CHATBOT">Araç Chatbot</option>
                <option value="COMPARISON_REPORT">Karşılaştırma Raporu</option>
                <option value="COMPARISON_CHATBOT">Karşılaştırma Chatbot</option>
              </select>

              <div className="flex items-center gap-1.5 text-slate-400 ml-2">
                <span>Durum:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-slate-200"
              >
                <option value="ALL">Tümü</option>
                <option value="SUCCESS">Başarılı</option>
                <option value="SUCCESS_WITH_FALLBACK">Fallback Başarılı</option>
                <option value="FAILED">Hatalı</option>
              </select>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Trace ID veya provider ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* Live Terminal Stream Table */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Canlı AI İstek Akışı ({liveStreamTotal} kayıt)</span>
              </h3>
            </div>

            {liveStream.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium text-xs">
                Henüz izlenecek AI işlemi yok veya filtreye uyan kayıt bulunamadı.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-white/5 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Zaman</th>
                      <th className="p-3">Trace ID</th>
                      <th className="p-3">İşlem Tipi</th>
                      <th className="p-3">Provider / Aşama</th>
                      <th className="p-3">Durum</th>
                      <th className="p-3">Süre</th>
                      <th className="p-3">Cache</th>
                      <th className="p-3 text-right">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {liveStream.map((item) => (
                      <tr
                        key={item.id || item.traceId}
                        onClick={() => setSelectedTrace(item)}
                        className="hover:bg-slate-800/40 transition cursor-pointer"
                      >
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {new Date(item.startedAt).toLocaleTimeString('tr-TR')}
                        </td>
                        <td className="p-3 text-cyan-400 font-bold whitespace-nowrap">
                          {item.traceId ? item.traceId.substring(0, 8) + '...' : '—'}
                        </td>
                        <td className="p-3 whitespace-nowrap">{getOpBadge(item.operationType)}</td>
                        <td className="p-3 font-semibold text-slate-200">
                          {item.provider || item.stage || '—'}
                        </td>
                        <td className="p-3 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                        <td className="p-3 font-bold text-slate-300 whitespace-nowrap">
                          {item.durationMs !== null ? `${item.durationMs}ms` : 'Ölçülmedi'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {item.cacheStatus === 'HIT' ? (
                            <span className="text-purple-400 font-bold text-[10px] uppercase">HIT</span>
                          ) : (
                            <span className="text-slate-600 font-bold text-[10px] uppercase">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrace(item);
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-cyan-400 font-bold cursor-pointer"
                          >
                            İncele
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Slow Requests Section */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-4 space-y-4">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Yavaş İstekler (&gt; 2500ms)</span>
            </h3>

            {slowRequests.length === 0 ? (
              <div className="text-xs text-slate-500">Seçilen dönemde yavaş çalışan AI isteği bulunmuyor.</div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {slowRequests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedTrace(req)}
                    className="p-3 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between hover:border-amber-500/30 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 font-bold">{req.durationMs}ms</span>
                      {getOpBadge(req.operationType)}
                      <span className="text-slate-400 text-[11px] truncate max-w-xs">{req.provider || req.stage}</span>
                    </div>
                    <span className="text-cyan-400 text-[10px] font-bold">Trace ID: {req.traceId?.substring(0, 8)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: KUYRUK */}
      {activeTab === 'queue' && (
        <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden space-y-0">
          <div className="p-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <span>AI Araştırma İş Kuyruğu</span>
                {queueRefreshing && (
                  <span className="text-[10px] text-cyan-400 font-normal flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Arka planda güncelleniyor...
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Araç kronik sorunları ve web araştırma işlerinin canlı kuyruk durumu ({queueJobs.length} toplam kayıt).
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-white/5 text-[11px]">
                {[
                  { key: 'ALL', label: 'Tümü' },
                  { key: 'ACTIVE', label: 'Aktif' },
                  { key: 'QUEUED', label: 'Bekleyen' },
                  { key: 'IN_PROGRESS', label: 'Çalışan' },
                  { key: 'COMPLETED', label: 'Tamamlanan' },
                  { key: 'FAILED', label: 'Hatalı' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setQueueStatusFilter(f.key)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      queueStatusFilter === f.key
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchQueueJobs(false)}
                disabled={queueRefreshing}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${queueRefreshing ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>
            </div>
          </div>

          {queueInitialLoading && queueJobs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Kuyruktaki işler yükleniyor...</span>
            </div>
          ) : (() => {
            const filteredJobs = queueJobs.filter((job) => {
              if (queueStatusFilter === 'ACTIVE') return job.status === 'QUEUED' || job.status === 'IN_PROGRESS';
              if (queueStatusFilter === 'QUEUED') return job.status === 'QUEUED';
              if (queueStatusFilter === 'IN_PROGRESS') return job.status === 'IN_PROGRESS';
              if (queueStatusFilter === 'COMPLETED') return job.status === 'COMPLETED';
              if (queueStatusFilter === 'FAILED') return job.status === 'FAILED';
              return true;
            });

            if (filteredJobs.length === 0) {
              return (
                <div className="p-12 text-center text-slate-500 font-medium text-xs">
                  {queueStatusFilter === 'ACTIVE' && 'Şu anda çalışan veya bekleyen işlem bulunmuyor.'}
                  {queueStatusFilter === 'COMPLETED' && 'Tamamlanmış işlem bulunmuyor.'}
                  {queueStatusFilter === 'FAILED' && 'Hatalı işlem bulunmuyor.'}
                  {queueStatusFilter === 'QUEUED' && 'Bekleyen işlem bulunmuyor.'}
                  {queueStatusFilter === 'IN_PROGRESS' && 'Şu an çalışan işlem bulunmuyor.'}
                  {queueStatusFilter === 'ALL' && 'Henüz kuyruk işlemi bulunmuyor.'}
                </div>
              );
            }

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-white/5 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">İşlem Tipi</th>
                      <th className="p-3">Hedef Araç</th>
                      <th className="p-3">Durum</th>
                      <th className="p-3">Deneme</th>
                      <th className="p-3">Süre</th>
                      <th className="p-3">Oluşturulma</th>
                      <th className="p-3 text-right">Detay / Eylem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {filteredJobs.map((job) => {
                      const v = job.variant;
                      const vehicleTitle = v
                        ? `${v.brand?.name || ''} ${v.model?.name || ''} ${v.year ? `(${v.year})` : ''}`.trim()
                        : null;
                      const vehicleSub = v
                        ? [v.engine?.code, v.transmission?.name, v.trim?.name].filter(Boolean).join(' • ')
                        : null;

                      let scopeLabel = 'Araç Araştırma İşlemi';
                      if (job.researchScope === 'FULL_REPORT') scopeLabel = 'Tam Rapor Araştırması';
                      if (job.researchScope === 'CHRONIC_PROBLEMS') scopeLabel = 'Kronik Problem Araştırması';
                      if (job.researchScope === 'TECHNICAL_SPECS') scopeLabel = 'Teknik Veri Araştırması';

                      let durationText = '—';
                      if (job.updatedAt && (job.lockedAt || job.createdAt)) {
                        const start = new Date(job.lockedAt || job.createdAt).getTime();
                        const end = new Date(job.updatedAt).getTime();
                        if (end > start) {
                          durationText = `${((end - start) / 1000).toFixed(1)} sn`;
                        }
                      }

                      return (
                        <tr key={job.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3">
                            <span className="font-bold text-white block">{scopeLabel}</span>
                            <span className="text-[10px] text-slate-500">Öncelik: {job.priority || 'MEDIUM'}</span>
                          </td>
                          <td className="p-3">
                            {vehicleTitle ? (
                              <div>
                                <span className="font-bold text-cyan-300 block">{vehicleTitle}</span>
                                {vehicleSub && <span className="text-[10px] text-slate-400 block">{vehicleSub}</span>}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Araç bilgisi bulunamadı</span>
                            )}
                          </td>
                          <td className="p-3">{getStatusBadge(job.status)}</td>
                          <td className="p-3 font-semibold">{job.attemptCount} / {job.maxAttempts || 3}</td>
                          <td className="p-3 text-slate-300">{durationText}</td>
                          <td className="p-3 text-slate-400">{new Date(job.createdAt).toLocaleString('tr-TR')}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedQueueJob(job)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Detay
                              </button>
                              {job.status === 'FAILED' && (
                                <button
                                  onClick={() => handleRetryJob(job.id)}
                                  disabled={actionLoading === job.id}
                                  className="px-2 py-1 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Yeniden Başlat
                                </button>
                              )}
                              {job.status === 'QUEUED' && (
                                <button
                                  onClick={() => handleCancelJob(job.id)}
                                  disabled={actionLoading === job.id}
                                  className="px-2 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  İptal Et
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: HATALAR */}
      {activeTab === 'errors' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-4 space-y-4">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Hata Kategorileri Dağılımı ({errorsData?.totalErrors || 0} Hata)</span>
            </h3>

            {!errorsData?.hasData ? (
              <div className="p-8 text-center text-slate-500 text-xs">Seçilen dönemde hata kaydı bulunmuyor.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                {errorsData.categories.map((cat: any) => (
                  <div key={cat.category} className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase">{cat.category}</span>
                    <div className="text-lg font-black text-white">{cat.count} Adet</div>
                    <span className="text-[10px] text-slate-500 block">Örnek Trace: {cat.sampleTraceId?.substring(0, 8)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Failures List */}
          {errorsData?.recentFailures?.length > 0 && (
            <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Son Gerçekleşen Hata Kayıtları</h4>
              </div>
              <div className="divide-y divide-white/5 font-mono text-xs">
                {errorsData.recentFailures.map((fail: any) => (
                  <div
                    key={fail.id}
                    onClick={() => setSelectedTrace(fail)}
                    className="p-3 hover:bg-slate-800/40 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-rose-400 font-bold">{fail.errorCategory || 'UNKNOWN'}</span>
                        {getOpBadge(fail.operationType)}
                        <span className="text-slate-400 text-[10px]">Trace ID: {fail.traceId?.substring(0, 8)}</span>
                      </div>
                      <p className="text-slate-300 text-xs font-sans">{fail.errorMessage || 'Açıklama belirtilmedi.'}</p>
                    </div>
                    <span className="text-slate-500 text-[10px] whitespace-nowrap self-start md:self-auto">
                      {new Date(fail.startedAt).toLocaleString('tr-TR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MALİYET & TOKEN */}
      {activeTab === 'cost-tokens' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Token Card */}
            <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
              <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Token Kullanımı</span>
              </h3>

              {!costData?.hasData ? (
                <div className="text-xs text-slate-500 py-4">Seçilen dönem için kullanım verisi bulunmuyor.</div>
              ) : (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Giriş Token (Input):</span>
                    <strong className="text-white">{costData.totalInputTokens.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Çıkış Token (Output):</span>
                    <strong className="text-white">{costData.totalOutputTokens.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1 pt-2 font-bold text-sm">
                    <span className="text-amber-400">Toplam Token:</span>
                    <strong className="text-amber-400">{costData.totalTokens.toLocaleString()}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Cost Card */}
            <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
              <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Tahmini Maliyet</span>
              </h3>

              {!costData?.hasData ? (
                <div className="text-xs text-slate-500 py-4">Seçilen dönem için kullanım verisi bulunmuyor.</div>
              ) : costData.costCalculable ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="text-2xl font-black text-emerald-400">${costData.totalCost} USD</div>
                  <p className="text-slate-400 text-[11px] font-sans">
                    Sağlayıcı API yanıtlarından hesaplanan doğrudan maliyet tutarı.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-2">
                  <span className="text-xs font-bold text-amber-400 block">Maliyet hesaplanamıyor</span>
                  <p className="text-[11px] text-slate-400 font-sans">
                    {costData.costUncalculableReason || 'Sağlayıcı yanıtında doğrudan maliyet bilgisi verilmedi.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Tables */}
          {costData?.hasData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
              <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-4 space-y-3">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Provider Bazlı Dağılım</h4>
                <div className="divide-y divide-white/5">
                  {costData.byProvider.map((p: any) => (
                    <div key={p.provider} className="py-2 flex justify-between items-center">
                      <span className="text-slate-300 font-semibold">{p.provider}</span>
                      <span className="text-amber-400 font-bold">{p.totalTokens.toLocaleString()} Token</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-4 space-y-3">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">İşlem Tipi Bazlı Dağılım</h4>
                <div className="divide-y divide-white/5">
                  {costData.byOperation.map((op: any) => (
                    <div key={op.operationType} className="py-2 flex justify-between items-center">
                      {getOpBadge(op.operationType)}
                      <span className="text-amber-400 font-bold">{op.totalTokens.toLocaleString()} Token</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PROVIDER DURUMU */}
      {activeTab === 'provider-health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {providerData.map((srv) => (
              <div key={srv.name} className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{srv.type}</span>
                    <h3 className="font-bold text-sm text-white mt-0.5">{srv.name}</h3>
                  </div>

                  {/* Dual Badges: Configuration & Operational Status */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 border rounded font-bold text-[10px] uppercase ${
                      srv.isConfigured
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 border-white/10'
                    }`}>
                      {srv.configText || (srv.isConfigured ? 'Yapılandırılmış' : 'Yapılandırılmamış')}
                    </span>

                    {srv.healthStatus === 'HEALTHY' && (
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {srv.healthText || 'Çalışıyor'}
                      </span>
                    )}
                    {srv.healthStatus === 'DEGRADED' && (
                      <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg font-bold text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {srv.healthText || 'Performans Düşük'}
                      </span>
                    )}
                    {srv.healthStatus === 'UNHEALTHY' && (
                      <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg font-bold text-[10px] flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> {srv.healthText || 'Erişilemiyor'}
                      </span>
                    )}
                    {srv.healthStatus === 'INSUFFICIENT_DATA' && (
                      <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 border border-white/10 rounded-lg font-bold text-[10px] flex items-center gap-1">
                        {srv.healthText || 'Veri Yetersiz'}
                      </span>
                    )}
                    {srv.healthStatus === 'NOT_CONFIGURED' && (
                      <span className="px-2.5 py-0.5 bg-slate-800/80 text-slate-500 border border-white/5 rounded-lg font-bold text-[10px]">
                        Yapılandırılmamış
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5 font-mono text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-500 text-[10px] block">İstek Sayısı</span>
                    <strong className="text-white">{srv.totalRequests !== null ? srv.totalRequests : '—'}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-500 text-[10px] block">Başarı Oranı</span>
                    <strong className="text-emerald-400">{srv.successRate !== null ? `%${srv.successRate}` : '—'}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-500 text-[10px] block">Ort. Latency</span>
                    <strong className="text-cyan-400">{srv.avgLatencyMs !== null ? `${srv.avgLatencyMs}ms` : '—'}</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-1">
                  <div className="flex justify-between">
                    <span>Son Başarılı İstek:</span>
                    <span className="text-slate-200">{srv.lastSuccess ? new Date(srv.lastSuccess).toLocaleString('tr-TR') : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Son Hata:</span>
                    <span className={srv.lastError ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                      {srv.lastError ? srv.lastError.message : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5 text-[11px] text-slate-400 text-center font-sans">
            Provider durumları gerçek kullanım verileri ve mevcut sağlık kontrollerinden hesaplanır. Yeterli ölçüm bulunmayan servislerde tahmini durum gösterilmez.
          </div>
        </div>
      )}

      {/* TRACE DETAIL DRAWER MODAL */}
      {selectedTrace && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-slate-950 border-l border-white/10 h-full p-6 overflow-y-auto space-y-6 text-xs font-mono text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase">Trace Detayı</span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedTrace.traceId}</h3>
              </div>
              <button
                onClick={() => setSelectedTrace(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">İşlem Tipi:</span>
                  {getOpBadge(selectedTrace.operationType)}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Durum:</span>
                  {getStatusBadge(selectedTrace.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Provider:</span>
                  <strong className="text-white">{selectedTrace.provider || selectedTrace.primaryProvider || 'Mevcut değil'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Süre:</span>
                  <strong className="text-cyan-400">{selectedTrace.durationMs !== null ? `${selectedTrace.durationMs}ms` : 'Ölçülmedi'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cache Durumu:</span>
                  <strong className="text-purple-400">{selectedTrace.cacheStatus || 'NOT_APPLICABLE'}</strong>
                </div>
              </div>

              {selectedTrace.errorMessage && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 text-rose-300">
                  <span className="text-[10px] font-bold uppercase">Hata Mesajı</span>
                  <p className="text-xs font-sans">{selectedTrace.errorMessage}</p>
                </div>
              )}

              <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Zaman Bilgisi</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Başlangıç:</span>
                  <span>{new Date(selectedTrace.startedAt).toLocaleString('tr-TR')}</span>
                </div>
                {selectedTrace.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bitiş:</span>
                    <span>{new Date(selectedTrace.completedAt).toLocaleString('tr-TR')}</span>
                  </div>
                )}
              </div>

              {selectedTrace.vehicleVariantId && (
                <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">İlişkili Varyant ID</span>
                  <div className="text-slate-200 text-xs">{selectedTrace.vehicleVariantId}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUEUE JOB DETAIL DRAWER MODAL */}
      {selectedQueueJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-slate-950 border-l border-white/10 h-full p-6 overflow-y-auto space-y-6 text-xs font-mono text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase">Kuyruk İş Detayı</span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedQueueJob.id}</h3>
              </div>
              <button
                onClick={() => setSelectedQueueJob(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">İşlem Kapsamı:</span>
                  <strong className="text-white">{selectedQueueJob.researchScope || 'FULL_REPORT'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Durum:</span>
                  {getStatusBadge(selectedQueueJob.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Öncelik:</span>
                  <strong className="text-amber-400">{selectedQueueJob.priority || 'MEDIUM'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Deneme Sayısı:</span>
                  <strong className="text-cyan-400">{selectedQueueJob.attemptCount} / {selectedQueueJob.maxAttempts || 3}</strong>
                </div>
              </div>

              {selectedQueueJob.variant && (
                <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] text-cyan-400 uppercase font-bold">Hedef Araç Bilgileri</span>
                  <div className="text-white font-bold text-sm">
                    {selectedQueueJob.variant.brand?.name} {selectedQueueJob.variant.model?.name} {selectedQueueJob.variant.year && `(${selectedQueueJob.variant.year})`}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {[selectedQueueJob.variant.engine?.code, selectedQueueJob.variant.transmission?.name, selectedQueueJob.variant.trim?.name].filter(Boolean).join(' • ') || '—'}
                  </div>
                  <div className="text-slate-500 text-[11px] pt-1">
                    Varyant ID: <code className="text-slate-300">{selectedQueueJob.vehicleVariantId}</code>
                  </div>
                </div>
              )}

              {selectedQueueJob.errorMessage && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 text-rose-300">
                  <span className="text-[10px] font-bold uppercase">Hata Günlüğü</span>
                  <p className="text-xs font-sans whitespace-pre-wrap">{selectedQueueJob.errorMessage}</p>
                </div>
              )}

              <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Zaman Çizelgesi</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Oluşturuldu:</span>
                  <span>{new Date(selectedQueueJob.createdAt).toLocaleString('tr-TR')}</span>
                </div>
                {selectedQueueJob.lockedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kilitlendi (Başladı):</span>
                    <span>{new Date(selectedQueueJob.lockedAt).toLocaleString('tr-TR')}</span>
                  </div>
                )}
                {selectedQueueJob.updatedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Son Güncelleme:</span>
                    <span>{new Date(selectedQueueJob.updatedAt).toLocaleString('tr-TR')}</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2 text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Ülke / Dil:</span>
                  <span className="text-white">{selectedQueueJob.countryCode || 'TR'} / {selectedQueueJob.languageCode || 'tr'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pazar Bölgesi:</span>
                  <span className="text-white">{selectedQueueJob.marketRegion || 'EU_TR'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
