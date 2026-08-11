'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw, Eye, CheckCircle2, XCircle, Info, Database } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminVehicleDataQualityPage() {
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview & Approval Modal State
  const [previewVariantId, setPreviewVariantId] = useState<string>('');
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyingFix, setApplyingFix] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchOverview = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/vehicles/admin/quality-check`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Veri kalitesi metrikleri alınamadı.');
        return res.json();
      })
      .then((data) => setOverview(data))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/vehicles/admin/quality-check`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setOverview(data);
        setToastMsg('Kalite metrikleri yenilendi.');
        setTimeout(() => setToastMsg(null), 3000);
      })
      .catch((err) => alert(err.message))
      .finally(() => setRefreshing(false));
  };

  const handlePreview = (variantId: string) => {
    setPreviewVariantId(variantId);
    setPreviewLoading(true);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/vehicles/admin/quality-check/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ issueId: variantId }),
    })
      .then((res) => res.json())
      .then((data) => setPreviewData(data))
      .catch((err) => alert(err.message))
      .finally(() => setPreviewLoading(false));
  };

  const handleApplyFix = () => {
    if (!previewData || !previewVariantId) return;
    setApplyingFix(true);
    const token = localStorage.getItem('accessToken');

    fetch(`${API_BASE_URL}/vehicles/admin/quality-check/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        issueId: previewVariantId,
        fixData: previewData.proposedFix,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Düzeltme uygulanamadı.');
        return res.json();
      })
      .then(() => {
        setToastMsg('Yönetici onayı ile düzeltme başarıyla uygulandı ve loglandı.');
        setTimeout(() => setToastMsg(null), 4000);
        setPreviewData(null);
        setPreviewVariantId('');
        fetchOverview();
      })
      .catch((err) => alert(err.message))
      .finally(() => setApplyingFix(false));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Araç Veri Kalitesi (Data Quality)</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Tespit Et → Önizle → Admin Onayı → Uygula disiplini ile 800,000+ araç varyant verisinin kalite takibi.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Kalite Taraması Çalıştır</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5">
          Kalite metrikleri ve anomali raporu yükleniyor...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-400 font-bold text-xs bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          {error}
        </div>
      ) : overview ? (
        <>
          {/* Quality Score Banner */}
          <div className="p-6 bg-slate-900/80 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl font-mono">
                %{overview.qualityScore}
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Genel Araç Veri Kalite Skoru</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Son tarama zamanı: {new Date(overview.createdAt).toLocaleString('tr-TR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl">
              <Info className="w-4 h-4 shrink-0" />
              <span>Otomatik veritabanı yazımı kapalıdır. Değişiklikler yalnızca yönetici önizleme onayıyla uygulanır.</span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Mükerrer Varyantlar</span>
              <p className="text-xl font-bold text-amber-400">{overview.totalDuplicates}</p>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Eksik Trim / Donanım</span>
              <p className="text-xl font-bold text-cyan-400">{overview.missingTrims}</p>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Eksik Motor Özelliği</span>
              <p className="text-xl font-bold text-purple-400">{overview.missingEngines}</p>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Şüpheli Model Yılı</span>
              <p className="text-xl font-bold text-rose-400">{overview.suspiciousYears}</p>
            </div>
          </div>

          {/* Anomaly Inspection Input */}
          <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-orange-400" />
              <span>Varyant Kalite İnceleme & Onay</span>
            </h3>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="İncelemek istediğiniz Araç Varyant ID'sini yapıştırın..."
                value={previewVariantId}
                onChange={(e) => setPreviewVariantId(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono"
              />
              <button
                onClick={() => handlePreview(previewVariantId)}
                disabled={previewLoading || !previewVariantId.trim()}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40"
              >
                {previewLoading ? 'Önizleniyor...' : 'Düzeltme Önizle'}
              </button>
            </div>

            {/* PREVIEW & APPROVAL CARD */}
            {previewData && (
              <div className="p-5 bg-slate-950 rounded-2xl border border-white/10 space-y-4 font-mono text-xs animate-in fade-in duration-200">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <h4 className="font-bold text-white font-sans text-sm">Düzeltme Önizleme Raporu</h4>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                    ONAY BEKLİYOR
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-900 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Mevcut Durum</span>
                    <p className="text-slate-300">
                      {previewData.currentVariant?.brand} {previewData.currentVariant?.model} ({previewData.currentVariant?.year})
                    </p>
                    <p className="text-[11px] text-rose-400 mt-1">Trim: {previewData.currentVariant?.trim}</p>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Önerilen Düzeltme</span>
                    <pre className="text-emerald-400 text-[11px] font-mono">
                      {JSON.stringify(previewData.proposedFix, null, 2)}
                    </pre>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 font-sans italic">{previewData.note}</p>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => setPreviewData(null)}
                    className="px-4 py-2 bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer font-sans"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleApplyFix}
                    disabled={applyingFix}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer font-sans disabled:opacity-40"
                  >
                    {applyingFix ? 'Uygulanıyor...' : 'Onayla ve Veritabanına Yaz'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
