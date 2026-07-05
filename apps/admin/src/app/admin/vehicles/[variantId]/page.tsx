'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function VehicleDetailPage() {
  const params = useParams();
  const variantId = params.variantId as string;

  const [variant, setVariant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchDetail = () => {
    setLoading(true);
    fetch(`${API_URL}/admin-approvals/vehicles/${variantId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Yükleme hatası.');
        return res.json();
      })
      .then((data) => {
        setVariant(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (variantId) fetchDetail();
  }, [variantId]);

  if (loading) return <p className="text-sm text-slate-400">Yükleniyor...</p>;
  if (error) return <p className="text-sm text-red-500">Hata: {error}</p>;
  if (!variant) return <p className="text-sm text-slate-500">Araç bulunamadı.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-200">
          {variant.brand?.name} {variant.model?.name} ({variant.year})
        </h1>
        <p className="text-sm text-slate-400 mt-1">Araç varyantı verilerini, kronik sorunları ve geri çağırmaları inceleyin.</p>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Specs Card */}
        <div className="border border-slate-800 bg-slate-950/20 p-6 rounded-2xl flex flex-col gap-3">
          <h2 className="text-lg font-bold text-slate-200">Teknik Detaylar</h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
            <div>Marka: <span className="font-semibold text-slate-100">{variant.brand?.name}</span></div>
            <div>Model: <span className="font-semibold text-slate-100">{variant.model?.name}</span></div>
            <div>Motor Kodu: <span className="font-semibold text-slate-100">{variant.engineId}</span></div>
            <div>Şanzıman: <span className="font-semibold text-slate-100">{variant.transmissionId}</span></div>
            <div>Gövde Tipi: <span className="font-semibold text-slate-100">{variant.bodyType || 'Belirtilmemiş'}</span></div>
            <div>Yakıt Türü: <span className="font-semibold text-slate-100">{variant.fuelType || 'Belirtilmemiş'}</span></div>
          </div>
        </div>

        {/* AI Cache Report status */}
        <div className="border border-slate-800 bg-slate-950/20 p-6 rounded-2xl flex flex-col gap-3">
          <h2 className="text-lg font-bold text-slate-200">Rapor Önbelleği (Report Cache)</h2>
          {variant.aiReports?.length === 0 ? (
            <p className="text-sm text-slate-500">Üretilmiş AI raporu bulunmamaktadır.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {variant.aiReports.map((report: any) => (
                <div key={report.id} className="border border-slate-800/80 p-3 rounded-lg flex justify-between items-center text-sm bg-slate-900/10">
                  <div>
                    <div className="font-bold text-slate-200">Dil: {report.languageCode.toUpperCase()}</div>
                    <div className="text-xs text-slate-500">Puan: {report.riskScore} (Risk), {report.buyabilityScore} (Alınabilirlik)</div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      report.status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : report.status === 'STALE'
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Problems, Recalls, Checklist, Questions list */}
      <div className="flex flex-col gap-4 border border-slate-800 bg-slate-950/10 p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-slate-200">Bağlı Veri Öğeleri</h2>

        {/* Problems */}
        <div className="flex flex-col gap-2">
          <h3 className="text-md font-bold text-slate-400">Kronik Sorunlar ({variant.problems?.length || 0})</h3>
          {variant.problems?.map((p: any) => (
            <div key={p.id} className="border border-slate-800/60 p-3 rounded-lg flex justify-between items-center text-sm">
              <div>
                <div className="font-bold text-slate-200">{p.title}</div>
                <div className="text-xs text-slate-500">{p.description}</div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">{p.status}</span>
            </div>
          ))}
        </div>

        {/* Recalls */}
        <div className="flex flex-col gap-2 mt-4">
          <h3 className="text-md font-bold text-slate-400">Geri Çağırmalar ({variant.recalls?.length || 0})</h3>
          {variant.recalls?.map((r: any) => (
            <div key={r.id} className="border border-slate-800/60 p-3 rounded-lg flex justify-between items-center text-sm">
              <div>
                <div className="font-bold text-slate-200">{r.title}</div>
                <div className="text-xs text-slate-500">{r.description}</div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
