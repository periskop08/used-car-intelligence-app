'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ReportHeader } from '../../components/ReportHeader';
import { ReportSidebar } from '../../components/ReportSidebar';

export default function UserDetailPage() {
  const params = useParams();
  const customerNo = params?.customerNo as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerNo) return;
    const token = localStorage.getItem('token');
    fetch(`/api/admin/reports/users/${encodeURIComponent(customerNo)}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Kullanıcı detay verisi alınamadı');
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [customerNo]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      <ReportHeader
        title={`Kullanıcı Detayı: ${customerNo}`}
        subtitle="Müşteri numarası bazlı kullanım kotaları, harcama ve abonelik geçmişi."
      />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ReportSidebar />

        <main className="flex-1 space-y-8 w-full">
          {loading && (
            <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/5 font-medium">
              Kullanıcı bilgileri yükleniyor...
            </div>
          )}

          {error && (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-bold text-xs">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {/* Identity Banner */}
              <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-md border border-orange-500/30">
                      {data.profile.customerNo}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-white/10">
                      {data.profile.subscriptionTier}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-100 mt-2">{data.profile.displayName}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{data.profile.email} • Rol: {data.profile.role}</p>
                </div>
                <div className="text-right font-mono text-xs text-slate-400">
                  <span>Kayıt Tarihi: <strong className="text-slate-200">{new Date(data.profile.createdAt).toLocaleDateString('tr-TR')}</strong></span>
                </div>
              </div>

              {/* Usage & Quota Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-xs font-bold text-slate-400 block">AI Raporu Kullanımı</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-slate-100">{data.usage.aiReportsUsed}</span>
                    <span className="text-xs text-slate-400 font-mono">Kalan: {data.usage.aiReportsRemaining}</span>
                  </div>
                </div>

                <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-xs font-bold text-slate-400 block">Chatbot Kullanımı</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-slate-100">{data.usage.chatbotUsed}</span>
                    <span className="text-xs text-slate-400 font-mono">Kalan: {data.usage.chatbotRemaining}</span>
                  </div>
                </div>

                <div className="p-5 bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-xs font-bold text-slate-400 block">Karşılaştırma Kullanımı</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-slate-100">{data.usage.comparisonsUsed}</span>
                    <span className="text-xs text-slate-400 font-mono">Kalan: {data.usage.comparisonsRemaining}</span>
                  </div>
                </div>
              </div>

              {/* Financial Transaction History */}
              <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200">Finansal Ödeme Geçmişi</h3>
                <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-white/5 font-mono text-xs">
                  <span className="text-slate-400">Toplam Harcama</span>
                  <strong className="text-emerald-400 text-lg">₺{data.financials.totalSpent.toLocaleString('tr-TR')}</strong>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
