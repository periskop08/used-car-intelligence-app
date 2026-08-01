'use client';
import React, { useEffect, useState } from 'react';
import { CustomerReference } from './CustomerReference';
import { fetchReportApi } from '@/utils/apiConfig';

interface ReportDrilldownDrawerProps {
  drilldownKey: string | null;
  params?: Record<string, any>;
  onClose: () => void;
}

export const ReportDrilldownDrawer: React.FC<ReportDrilldownDrawerProps> = ({
  drilldownKey,
  params = {},
  onClose,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!drilldownKey) return;
    setLoading(true);
    setError(null);

    const query = new URLSearchParams(params).toString();
    fetchReportApi(`/admin/reports/drilldowns/${drilldownKey}?${query}`)
      .then((res) => {
        if (!res.ok) throw new Error('Drill-down verisi alınamadı');
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
  }, [drilldownKey, params]);

  if (!drilldownKey) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end transition-all">
      <div className="w-full max-w-3xl bg-slate-900 border-l border-white/10 h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded uppercase">
                Drill-down Detay Görünümü
              </span>
              <h2 className="text-xl font-black text-slate-100 mt-1">Anahtar: {drilldownKey}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition-all text-sm"
            >
              ✕ Kapat
            </button>
          </div>

          {/* Body */}
          <div className="mt-6">
            {loading && <p className="text-xs text-slate-400">Veriler yükleniyor...</p>}
            {error && <p className="text-xs text-red-400 font-bold">{error}</p>}

            {data && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Toplam Kayıt: <strong className="text-white font-mono">{data.total}</strong></span>
                </div>

                <div className="overflow-x-auto border border-white/10 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
                      <tr>
                        {data.columns.map((col: any) => (
                          <th key={col.key} className="px-4 py-3">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                      {data.rows.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          {data.columns.map((col: any) => {
                            const val = row[col.key];
                            if (col.type === 'CUSTOMER_REF') {
                              return (
                                <td key={col.key} className="px-4 py-3">
                                  <CustomerReference customerNo={String(val)} name={row.displayName} />
                                </td>
                              );
                            }
                            if (col.type === 'BADGE') {
                              return (
                                <td key={col.key} className="px-4 py-3 font-sans">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-200 border border-white/10">
                                    {String(val)}
                                  </span>
                                </td>
                              );
                            }
                            return (
                              <td key={col.key} className="px-4 py-3">
                                {val !== undefined && val !== null ? String(val) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 flex justify-between items-center text-xs text-slate-400">
          <span>Tork Scout Business Intelligence</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
