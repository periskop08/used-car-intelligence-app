'use client';

import React, { useEffect, useState } from 'react';
import { Search, Eye, Filter, Sparkles, Tag, Car, Layers } from 'lucide-react';
import { API_BASE_URL, getAuthToken } from '@/utils/apiConfig';
import { translateBodyType } from '@/components/VehicleGuideCardLayout';

export default function AdminVehicleDiscoveryPage() {
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterBodyType, setFilterBodyType] = useState('all');

  const fetchDiscoveryVariants = () => {
    setLoading(true);
    setError(null);
    const token = getAuthToken();

    fetch(`${API_BASE_URL}/admin/vehicle-discovery/variants`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Aracını Bul keşif verileri yüklenemedi.');
        return res.json();
      })
      .then((data) => setVariants(Array.isArray(data) ? data : []))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDiscoveryVariants();
  }, []);

  const filteredVariants = variants.filter((v) => {
    const title = `${v.brandName || ''} ${v.modelName || ''} ${v.generationName || ''}`;
    const query = search.toLowerCase();
    const searchMatch =
      title.toLowerCase().includes(query) ||
      (v.engineName || '').toLowerCase().includes(query) ||
      (v.transmissionName || '').toLowerCase().includes(query);

    if (filterBodyType !== 'all') {
      return searchMatch && (v.bodyType || '').toUpperCase() === filterBodyType.toUpperCase();
    }

    return searchMatch;
  });

  const formatPrice = (amount?: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Aracını Bul Yönetimi</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Aracını Bul keşif sisteminde aday olarak kullanılan araçların sunum etiketlerini, medya önizlemelerini ve bağlı aktif ilan durumlarını yönetin.
          </p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-1 min-w-[280px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Marka, model, jenerasyon veya motor ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'SEDAN', 'HATCHBACK', 'SUV', 'WAGON', 'VAN'].map((bt) => (
            <button
              key={bt}
              onClick={() => setFilterBodyType(bt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterBodyType === bt
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-slate-950 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              {bt === 'all' ? 'Tümü' : translateBodyType(bt)}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE VIEW */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5">
          Aracını Bul keşif verileri yükleniyor...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-400 font-bold text-xs bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          {error}
        </div>
      ) : filteredVariants.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium text-xs bg-slate-900/60 rounded-2xl border border-white/5">
          Kriterlerinize uygun keşif aracı bulunamadı.
        </div>
      ) : (
        <div className="bg-slate-900/80 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-white/10 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4 w-16">Görsel</th>
                  <th className="py-3.5 px-4">Marka / Model</th>
                  <th className="py-3.5 px-4">Motor & Şanzıman</th>
                  <th className="py-3.5 px-4">Kasa / Yakıt</th>
                  <th className="py-3.5 px-4">Aktif İlanlar</th>
                  <th className="py-3.5 px-4">AI Sunum Etiketleri</th>
                  <th className="py-3.5 px-4 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredVariants.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4">
                      <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-950 border border-white/10 relative">
                        <img
                          src={v.previewImageUrl}
                          alt={`${v.brandName} ${v.modelName}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">
                        {v.brandName} {v.modelName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {v.generationName ? `${v.generationName} · ` : ''}{v.yearStart}-{v.yearEnd || 'günümüz'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-200 font-medium">{v.engineName || '1.6 Motor'}</div>
                      <div className="text-[10px] text-slate-400">{v.transmissionName || 'Otomatik'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded">
                          {translateBodyType(v.bodyType)}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded">
                          {v.fuelType}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {v.activeListingCount > 0 ? (
                        <div>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded">
                            {v.activeListingCount} İlan Aktif
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            {formatPrice(v.minActivePrice)} - {formatPrice(v.maxActivePrice)}
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[10px] font-bold rounded">
                          0 İlan (Kriteriz Mod)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap max-w-[220px]">
                        {v.aiDisplayTags.map((tag: string, idx: number) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 text-[9px] font-semibold rounded border border-orange-500/20">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => alert(`Araç ID: ${v.id}\n${v.brandName} ${v.modelName} ${v.engineName || ''}\nKeşif adaylığı aktif.`)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Detay</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
