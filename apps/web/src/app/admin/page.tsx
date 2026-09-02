'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  CreditCard,
  TrendingUp,
  DollarSign,
  FileText,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { fetchReportApi } from '@/utils/apiConfig';

export default function AdminExecutiveOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = () => {
    setLoading(true);
    setError(null);
    fetchReportApi('/admin/reports/overview')
      .then((res) => {
        if (!res.ok) throw new Error(`Yönetici raporları yüklenemedi (HTTP ${res.status})`);
        return res.json();
      })
      .then((d) => {
        if (d?.statusCode >= 400) throw new Error(d.message || 'Yönetici yetkisi gerekiyor.');
        setData(d);
      })
      .catch((e: any) => {
        setError(e.message || 'Rapor verileri yüklenirken hata oluştu.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Yönetici Özeti</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Platform performansı, canlı KPI'lar, kullanıcı büyümesi ve finansal durum genel bakışı.
          </p>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {loading && (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/40 rounded-2xl border border-white/5 space-y-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-300">KPI metrikleri yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 font-bold text-xs">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Executive KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* 1. Toplam Kullanıcı */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-orange-500/30 transition group">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toplam Kullanıcı</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{data.kpis?.find((k: any) => k.key === 'TOTAL_USERS')?.value || 0}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Platform kayıtlı sayısı</p>
              </div>
              <Link
                href="/admin/users"
                className="flex items-center justify-between text-xs font-bold text-orange-400 hover:text-orange-300 pt-2 border-t border-white/5 transition"
              >
                <span>Kullanıcıları Gör</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </Link>
            </div>

            {/* 2. Bugün Yeni Kayıt */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-orange-500/30 transition group">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bugün Yeni Kayıt</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <UserPlus className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{data.kpis?.find((k: any) => k.key === 'TODAY_NEW_USERS')?.value || 0}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Son 24 saat katılımı</p>
              </div>
              <Link
                href="/admin/users"
                className="flex items-center justify-between text-xs font-bold text-orange-400 hover:text-orange-300 pt-2 border-t border-white/5 transition"
              >
                <span>Kullanıcıları Gör</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </Link>
            </div>

            {/* 3. Aktif Ücretli Abonelik */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-orange-500/30 transition group">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aktif Ücretli Abonelik</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{data.kpis?.find((k: any) => k.key === 'ACTIVE_PAID_SUBS')?.value || 0}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Standard & Pro üyeler</p>
              </div>
              <Link
                href="/admin/reports/finance/subscriptions"
                className="flex items-center justify-between text-xs font-bold text-orange-400 hover:text-orange-300 pt-2 border-t border-white/5 transition"
              >
                <span>Abonelikleri Gör</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </Link>
            </div>

            {/* 4. MRR */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-orange-500/30 transition group">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MRR (Aylık Gelir)</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-400">
                  {data.kpis?.find((k: any) => k.key === 'MRR')?.formattedValue || '₺0'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Aylık tekrarlayan gelir</p>
              </div>
              <Link
                href="/admin/reports/finance/revenue"
                className="flex items-center justify-between text-xs font-bold text-orange-400 hover:text-orange-300 pt-2 border-t border-white/5 transition"
              >
                <span>Gelir Detayları</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </Link>
            </div>

            {/* 5. Bugün AI Raporu */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 hover:border-orange-500/30 transition group">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bugün AI Raporu</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-white">{data.kpis?.find((k: any) => k.key === 'TODAY_AI_REPORTS')?.value || 0}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Üretilen tamamlanmış rapor</p>
              </div>
              <Link
                href="/admin/reports/product/ai-reports"
                className="flex items-center justify-between text-xs font-bold text-orange-400 hover:text-orange-300 pt-2 border-t border-white/5 transition"
              >
                <span>Raporları Gör</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </div>

          {/* Additional Operations KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Moderasyon Bekleyen */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 flex justify-between items-center hover:border-orange-500/30 transition">
              <div>
                <span className="text-xs font-bold text-slate-400">Moderasyon Bekleyen İlan</span>
                <p className="text-xl font-black text-amber-400 mt-1">{data.pendingListingsCount || 0}</p>
              </div>
              <Link
                href="/admin/listings"
                className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-bold transition"
              >
                Moderasyonu Aç
              </Link>
            </div>

            {/* Araştırma Kuyruğu */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 flex justify-between items-center hover:border-orange-500/30 transition">
              <div>
                <span className="text-xs font-bold text-slate-400">Araştırma Kuyruğundaki İş</span>
                <p className="text-xl font-black text-cyan-400 mt-1">{data.queuedResearchJobsCount || 0}</p>
              </div>
              <Link
                href="/admin/product-ai/research-queue"
                className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl text-xs font-bold transition"
              >
                Kuyruğu İncele
              </Link>
            </div>

            {/* SAFE_FALLBACK Rapor */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 flex justify-between items-center hover:border-orange-500/30 transition">
              <div>
                <span className="text-xs font-bold text-slate-400">SAFE_FALLBACK Raporlar</span>
                <p className="text-xl font-black text-orange-400 mt-1">{data.fallbackReportsCount || 0}</p>
              </div>
              <Link
                href="/admin/reports/product/ai-reports"
                className="px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl text-xs font-bold transition"
              >
                Raporları Gör
              </Link>
            </div>

            {/* Açık Geri Bildirim */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 flex justify-between items-center hover:border-orange-500/30 transition">
              <div>
                <span className="text-xs font-bold text-slate-400">Açık Geri Bildirim</span>
                <p className="text-xl font-black text-rose-400 mt-1">{data.openFeedbacksCount || 0}</p>
              </div>
              <Link
                href="/admin/users/feedbacks?status=PENDING"
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition"
              >
                Geri Bildirimleri Gör
              </Link>
            </div>
          </div>

          {/* Breakdown & Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Package Distribution */}
            {data.packageDistribution && (
              <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-200">Paket Dağılımı & Abone Yapısı</h3>
                  <Link href="/admin/reports/users/packages" className="text-xs font-bold text-orange-400 hover:underline">
                    Detaylar →
                  </Link>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center p-3.5 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-400 font-sans">Tanışma / Ücretsiz (FREE)</span>
                    <strong className="text-slate-200 font-bold">{data.packageDistribution.tanismaUsers || 0}</strong>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-orange-400 font-sans font-bold">Yetkin / Standard</span>
                    <strong className="text-orange-400 font-bold">{data.packageDistribution.yetkinUsers || 0}</strong>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-purple-400 font-sans font-bold">Profesyonel / Pro / Premium</span>
                    <strong className="text-purple-400 font-bold">{data.packageDistribution.profesyonelUsers || 0}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            {data.financialSummary && (
              <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-200">Finansal Özeti & Marj</h3>
                  <Link href="/admin/reports/finance/revenue" className="text-xs font-bold text-orange-400 hover:underline">
                    Finans Tablosu →
                  </Link>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center p-3.5 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-400 font-sans">MRR (Aylık Düzenli Gelir)</span>
                    <strong className="text-emerald-400 font-bold">₺{(data.financialSummary.mrr || 0).toLocaleString('tr-TR')}</strong>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-400 font-sans">ARR (Yıllık Düzenli Gelir)</span>
                    <strong className="text-emerald-400 font-bold">₺{(data.financialSummary.arr || 0).toLocaleString('tr-TR')}</strong>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-slate-950 rounded-xl border border-white/5">
                    <span className="text-slate-400 font-sans">Tahmini Brüt Marj</span>
                    {data.financialSummary.grossMarginPct != null ? (
                      <strong className="text-amber-400 font-bold">%{data.financialSummary.grossMarginPct}</strong>
                    ) : (
                      <strong className="text-slate-400 font-bold" title="Maliyet verileri (AI provider harcamaları) henüz tam kayıt altına alınmadığı için hesaplanamamaktadır.">— (Veri Yok)</strong>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
