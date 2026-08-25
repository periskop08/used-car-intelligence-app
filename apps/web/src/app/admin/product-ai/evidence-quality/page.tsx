'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Globe,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminEvidenceQualityPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        statusFilter,
      });

      const res = await fetch(`${API_BASE_URL}/admin/ai-operations/evidence-quality?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setClaims(Array.isArray(data.items) ? data.items : []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setClaims([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Evidence quality fetch error:', err);
      setClaims([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Claim & Evidence Kalite Yönetimi
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Web-Grounded AI Araştırma Pipeline'ındaki gerçek iddiaların ve kanıtların doğruluk durumları
            <span className="text-cyan-400 font-bold font-mono ml-2">(Toplam {totalCount} gerçek kayıt)</span>
          </p>
        </div>
        <button
          onClick={fetchClaims}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Gerçek iddia metni, araç veya kaynak URL ile ara..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 outline-none cursor-pointer"
          >
            <option value="">Tüm Doğrulama Durumları</option>
            <option value="VERIFIED">VERIFIED (Doğrulanmış)</option>
            <option value="REJECTED">REJECTED (Reddedilmiş)</option>
            <option value="INSUFFICIENT_EVIDENCE">INSUFFICIENT_EVIDENCE (İncelemede / Yetersiz Kanıt)</option>
          </select>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Gerçek veritabanı kanıt kayıtları yükleniyor...</span>
          </div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Database className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="font-bold text-sm text-slate-300">Henüz claim / evidence kaydı bulunmuyor.</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Araç araştırmaları ve doğrulama süreçleri çalıştıkça gerçek claim ve kanıt kayıtları burada görüntülenecektir.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5 font-mono">
                  <tr>
                    <th className="p-4">Claim ID / Araç</th>
                    <th className="p-4">İddia Türü</th>
                    <th className="p-4">İddia Metni</th>
                    <th className="p-4">Doğrulama Durumu</th>
                    <th className="p-4">Kaynak Sayısı</th>
                    <th className="p-4 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {claims.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.03] transition">
                      <td className="p-4 font-mono">
                        <div className="font-bold text-cyan-400 text-[11px] truncate max-w-[180px]">
                          {c.id.substring(0, 8)}...
                        </div>
                        <div className="text-[11px] text-slate-200 font-sans font-bold mt-0.5">
                          {c.vehicleVariant}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-cyan-400 font-bold text-[10px]">
                        {c.claimType === 'CHRONIC_PROBLEM' ? 'KRONİK PROBLEM' : c.claimType === 'RECALL_ISSUE' ? 'GERİ ÇAĞIRMA' : c.claimType}
                      </td>
                      <td className="p-4 text-slate-200 max-w-md line-clamp-2">{c.claimText}</td>
                      <td className="p-4">
                        {c.verificationStatus === 'VERIFIED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-mono text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> VERIFIED
                          </span>
                        )}
                        {c.verificationStatus === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded font-mono text-[10px] font-bold">
                            <XCircle className="w-3 h-3" /> REJECTED
                          </span>
                        )}
                        {c.verificationStatus === 'INSUFFICIENT_EVIDENCE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-mono text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" /> INSUFFICIENT
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-300">{c.sourceCount} kaynak</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedClaim(c)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          İncele →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Sayfa <strong className="text-white">{page}</strong> / {totalPages} (Toplam {totalCount} kayıt)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-300 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-300 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CLAIM DETAIL MODAL */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-xl w-full bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl font-mono text-xs">
            <div className="flex justify-between items-start pb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block truncate max-w-md">
                  {selectedClaim.id}
                </span>
                <h3 className="text-sm font-bold text-white mt-1 font-sans">{selectedClaim.vehicleVariant}</h3>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block font-mono">İddia Metni</span>
                <p className="text-white font-bold leading-relaxed">{selectedClaim.claimText}</p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block font-mono">Kanıt Alıntısı (Evidence Excerpt)</span>
                <p className="text-slate-300 leading-relaxed font-sans">{selectedClaim.evidenceExcerpt}</p>
              </div>

              {selectedClaim.rejectedReason && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 text-rose-300">
                  <span className="text-[10px] font-bold uppercase font-mono">Red Neden / Açıklaması</span>
                  <p className="text-xs font-sans">{selectedClaim.rejectedReason}</p>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-slate-500 text-[10px] uppercase font-bold block font-mono">
                  Destekleyen Kanıt Kaynakları ({selectedClaim.sources?.length || 0})
                </span>
                <div className="flex flex-col gap-2 font-mono text-xs">
                  {selectedClaim.sources?.map((src: string, idx: number) => (
                    <div key={idx} className="p-2.5 bg-slate-950 border border-white/5 rounded-xl text-cyan-300 flex items-center justify-between gap-2 overflow-hidden">
                      <span className="truncate flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                        <span className="truncate">{src}</span>
                      </span>
                      {src.startsWith('http') && (
                        <a
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded text-[10px] font-bold shrink-0"
                        >
                          Aç ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Varyant ID: <code className="text-slate-200">{selectedClaim.vehicleVariantId}</code></span>
                <span>Tarih: {new Date(selectedClaim.researchedAt).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
