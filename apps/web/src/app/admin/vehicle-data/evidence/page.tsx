'use client';

import React, { useEffect, useState } from 'react';
import { Database, Search, ShieldCheck, Globe, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export default function AdminEvidenceQualityPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Simulated evidence sources metrics
    setLoading(false);
    setSources([
      { domain: 'sahibinden.com', kind: 'LISTING_AGGREGATOR', reliabilityScore: 94, totalClaims: 1420, marketRegion: 'TR' },
      { domain: 'arabam.com', kind: 'LISTING_AGGREGATOR', reliabilityScore: 92, totalClaims: 890, marketRegion: 'TR' },
      { domain: 'autodata.net', kind: 'TECHNICAL_SPEC', reliabilityScore: 98, totalClaims: 3200, marketRegion: 'GLOBAL' },
      { domain: 'car-recalls.eu', kind: 'RECALL_DATABASE', reliabilityScore: 99, totalClaims: 410, marketRegion: 'EU' },
      { domain: 'nhtsa.gov', kind: 'SAFETY_RECALL', reliabilityScore: 99, totalClaims: 650, marketRegion: 'US' },
    ]);
  }, []);

  const filtered = sources.filter((s) => s.domain.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Kaynak & Kanıt Kalitesi (Evidence Quality)</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            AI araştırma ve kronik sorun veri toplama pipeline'ının kaynak güvenilirlik skorları.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex items-center justify-between">
        <div className="flex flex-1 max-w-md items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Alan adı (domain) veya kaynak türü ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>
      </div>

      {/* Sources Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Kaynak verileri yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="p-4">Domain / Alan Adı</th>
                  <th className="p-4">Kaynak Türü (SourceKind)</th>
                  <th className="p-4">Güvenilirlik Skoru</th>
                  <th className="p-4">Toplam İddia / Kanıt Sayısı</th>
                  <th className="p-4">Bölge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filtered.map((s) => (
                  <tr key={s.domain} className="hover:bg-white/[0.03] transition font-mono">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span>{s.domain}</span>
                    </td>
                    <td className="p-4 text-slate-300 font-sans">{s.kind}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-bold text-[11px]">
                        %{s.reliabilityScore}
                      </span>
                    </td>
                    <td className="p-4 text-orange-400 font-bold">{s.totalClaims} iddia</td>
                    <td className="p-4 text-slate-400">{s.marketRegion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
