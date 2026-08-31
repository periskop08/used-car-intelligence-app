'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Eye, 
  Filter, 
  Sparkles, 
  Tag, 
  Car, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  ImageOff, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  PlusCircle,
  SlidersHorizontal,
  Check,
  ShieldCheck,
  Info
} from 'lucide-react';
import { API_BASE_URL, getAuthToken } from '@/utils/apiConfig';
import { translateBodyType } from '@/components/VehicleGuideCardLayout';

export default function AdminVehicleDiscoveryPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalCandidates: 0,
    withListingsCount: 0,
    unfilteredEligibleCount: 0,
    missingContentCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'listings_only' | 'unfiltered_eligible' | 'missing_content'>('all');
  const [bodyType, setBodyType] = useState('all');
  const [fuelType, setFuelType] = useState('all');
  const [transmission, setTransmission] = useState('all');

  // Detail Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // Add Candidate Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchDiscoveryCandidates = () => {
    setLoading(true);
    setError(null);
    const token = getAuthToken();

    let query = `?page=${page}&limit=50&filterCategory=${filterCategory}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (bodyType !== 'all') query += `&bodyType=${bodyType}`;
    if (fuelType !== 'all') query += `&fuelType=${fuelType}`;
    if (transmission !== 'all') query += `&transmission=${transmission}`;

    fetch(`${API_BASE_URL}/admin/vehicle-discovery/candidates${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Aracını Bul keşif verileri yüklenemedi.');
        return res.json();
      })
      .then((data) => {
        setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
        if (data.summary) setSummary(data.summary);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDiscoveryCandidates();
  }, [page, filterCategory, bodyType, fuelType, transmission]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDiscoveryCandidates();
  };

  const formatPrice = (amount?: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  const translateFuel = (fuel: string) => {
    const f = (fuel || '').toUpperCase();
    if (f === 'PETROL' || f === 'BENZIN') return 'Benzinli';
    if (f === 'DIESEL' || f === 'DIZEL') return 'Dizel';
    if (f === 'HYBRID' || f === 'HIBRIT') return 'Hibrit';
    if (f === 'ELECTRIC' || f === 'ELEKTRIK') return 'Elektrikli';
    if (f === 'LPG') return 'LPG';
    return fuel;
  };

  const translateTrans = (trans: string) => {
    const t = (trans || '').toUpperCase();
    if (t.includes('MANUEL') || t.includes('MANUAL')) return 'Manuel';
    return 'Otomatik';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16 text-slate-100">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Aracını Bul Yönetimi</span>
            <span className="px-2.5 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold rounded-full">
              Operasyon Paneli
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Münferit araç varyantları yerine gerçek kullanıcı swipe kartı seviyesinde keşif adaylarını, yayın durumlarını ve aktif ilan uyumluluklarını yönetin.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Keşfe Araç Ekle</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/80 border border-white/10 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tüm Keşif Adayları</span>
          <div className="text-2xl font-black text-white">{summary.totalCandidates}</div>
          <div className="text-[10px] text-slate-500 mt-1">Gruplanmış Unique Aday</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-emerald-500/20 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">İlanlı Adaylar (Kriterli)</span>
          <div className="text-2xl font-black text-emerald-400">{summary.withListingsCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Aktif Satış İlanı Olan</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-sky-500/20 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-1">Kritersiz Keşfe Uygun</span>
          <div className="text-2xl font-black text-sky-400">{summary.unfilteredEligibleCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Görsel & Teknik Verisi Tam</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-amber-500/20 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">İçerik / Görsel Eksik</span>
          <div className="text-2xl font-black text-amber-400">{summary.missingContentCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Fallback Medya Bekleyen</div>
        </div>
      </div>

      {/* 2. FILTERS & SEARCH CONTROLS */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
          {[
            { key: 'all', label: 'Tüm Adaylar', count: summary.totalCandidates },
            { key: 'listings_only', label: 'İlanlı Adaylar', count: summary.withListingsCount },
            { key: 'unfiltered_eligible', label: 'Kritersiz Keşfe Uygun', count: summary.unfilteredEligibleCount },
            { key: 'missing_content', label: 'Eksik İçerik', count: summary.missingContentCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilterCategory(tab.key as any);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                filterCategory === tab.key
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-slate-950/60 text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-[10px]">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search & Criteria Dropdowns */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-1 min-w-[260px] items-center gap-2 px-3.5 py-2 bg-slate-950 rounded-xl border border-white/10 focus-within:border-orange-500/50 transition">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Marka, model, jenerasyon veya motor ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <select
            value={bodyType}
            onChange={(e) => { setBodyType(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950 text-xs font-bold text-slate-300 rounded-xl border border-white/10 outline-none cursor-pointer"
          >
            <option value="all">Kasa Tipi: Tümü</option>
            <option value="SEDAN">Sedan</option>
            <option value="HATCHBACK">Hatchback</option>
            <option value="SUV">SUV</option>
            <option value="WAGON">Station Wagon</option>
            <option value="VAN">Minivan / Van</option>
          </select>

          <select
            value={fuelType}
            onChange={(e) => { setFuelType(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950 text-xs font-bold text-slate-300 rounded-xl border border-white/10 outline-none cursor-pointer"
          >
            <option value="all">Yakıt: Tümü</option>
            <option value="BENZIN">Benzinli</option>
            <option value="DIZEL">Dizel</option>
            <option value="HIBRIT">Hibrit</option>
            <option value="ELEKTRIK">Elektrikli</option>
            <option value="LPG">LPG</option>
          </select>

          <select
            value={transmission}
            onChange={(e) => { setTransmission(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950 text-xs font-bold text-slate-300 rounded-xl border border-white/10 outline-none cursor-pointer"
          >
            <option value="all">Şanzıman: Tümü</option>
            <option value="AUTOMATIC">Otomatik</option>
            <option value="MANUAL">Manuel</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Filtrele
          </button>
        </form>
      </div>

      {/* 3. GROUPED CANDIDATE TABLE */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5">
          Keşif adayları yükleniyor...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-400 font-bold text-xs bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          {error}
        </div>
      ) : candidates.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium text-xs bg-slate-900/60 rounded-2xl border border-white/5">
          Seçilen kriterlere uygun keşif adayı bulunamadı.
        </div>
      ) : (
        <div className="bg-slate-900/80 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-white/10 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4 w-16">Görsel</th>
                  <th className="py-3.5 px-4">Keşif Adayı</th>
                  <th className="py-3.5 px-4">Kriter Bilgileri</th>
                  <th className="py-3.5 px-4">Aktif İlanlar</th>
                  <th className="py-3.5 px-4">Kritersiz Keşif</th>
                  <th className="py-3.5 px-4">Bağlı Varyantlar</th>
                  <th className="py-3.5 px-4 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {candidates.map((c) => (
                  <tr key={c.candidateId} className="hover:bg-white/[0.02] transition">
                    {/* Görsel */}
                    <td className="py-3 px-4">
                      <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-950 border border-white/10 relative">
                        <img
                          src={c.previewImageUrl}
                          alt={`${c.brandName} ${c.modelName}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>

                    {/* Keşif Adayı */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">
                        {c.brandName} {c.modelName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {c.generationName ? `${c.generationName} · ` : ''}{c.engineVersion}
                      </div>
                    </td>

                    {/* Kriter Bilgileri */}
                    <td className="py-3 px-4">
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded">
                          {translateBodyType(c.bodyType)}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded">
                          {translateFuel(c.fuelType)}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded">
                          {translateTrans(c.transmissionName)}
                        </span>
                      </div>
                    </td>

                    {/* Aktif İlanlar */}
                    <td className="py-3 px-4">
                      {c.activeListingCount > 0 ? (
                        <div>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded">
                            {c.activeListingCount} İlan
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            {formatPrice(c.minActivePrice)} - {formatPrice(c.maxActivePrice)}
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[10px] font-bold rounded">
                          0 İlan
                        </span>
                      )}
                    </td>

                    {/* Kritersiz Keşif Status */}
                    <td className="py-3 px-4">
                      {c.eligibilityStatus === 'ELIGIBLE' ? (
                        <span className="px-2.5 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold rounded-xl flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>✓ Uygun</span>
                        </span>
                      ) : c.eligibilityStatus === 'MISSING_IMAGE' ? (
                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded-xl flex items-center gap-1 w-fit">
                          <ImageOff className="w-3 h-3" />
                          <span>Görsel Eksik</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold rounded-xl flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" />
                          <span>Teknik Veri Eksik</span>
                        </span>
                      )}
                    </td>

                    {/* Bağlı Varyantlar */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-slate-950 text-slate-400 text-[10px] font-mono font-bold rounded-lg border border-white/5">
                        {c.variantCount} Varyant
                      </span>
                    </td>

                    {/* Aksiyon */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedCandidate(c)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ml-auto border border-white/10"
                      >
                        <Eye className="w-3.5 h-3.5 text-orange-400" />
                        <span>Detay / Önizle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION BAR */}
          <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Sayfa {page} / {totalPages} (Toplam {summary.totalCandidates} Keşif Adayı)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-slate-900 border border-white/10 text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 transition cursor-pointer"
              >
                Önceki
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-slate-900 border border-white/10 text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 transition cursor-pointer"
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DETAIL / PREVIEW DRAWER MODAL */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-[32px] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 relative my-auto animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1">
                  Keşif Adayı Önizleme ve Yönetimi
                </span>
                <h3 className="text-xl font-black text-white">
                  {selectedCandidate.brandName} {selectedCandidate.modelName} {selectedCandidate.generationName || ''}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedCandidate(null); setIsAccordionOpen(false); }}
                className="text-slate-500 hover:text-white p-2 rounded-full bg-white/5 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT: EXACT USER SWIPE CARD PREVIEW */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>Kullanıcı Swipe Kartı Önizlemesi</span>
                </span>

                <div className="bg-[#0c1224] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl flex flex-col min-h-[460px]">
                  {/* Photo area */}
                  <div className="relative h-44 w-full bg-slate-950 border-b border-white/5 overflow-hidden">
                    <img
                      src={selectedCandidate.previewImageUrl}
                      alt={selectedCandidate.modelName}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1224] to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 z-10">
                      <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest block">
                        {selectedCandidate.brandName}
                      </span>
                      <h4 className="text-base font-black text-white leading-tight">
                        {selectedCandidate.modelName}
                      </h4>
                    </div>
                  </div>

                  {/* Specs Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Kasa Tipi</span>
                        <span className="font-semibold text-slate-300">{translateBodyType(selectedCandidate.bodyType)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Yakıt</span>
                        <span className="font-semibold text-slate-300">{translateFuel(selectedCandidate.fuelType)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Şanzıman</span>
                        <span className="font-semibold text-slate-300">{translateTrans(selectedCandidate.transmissionName)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Motor</span>
                        <span className="font-semibold text-slate-300">{selectedCandidate.engineVersion}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Güç / Tork</span>
                        <span className="font-semibold text-slate-300">{selectedCandidate.powerHp} / {selectedCandidate.torqueNm}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ort. Tüketim</span>
                        <span className="font-semibold text-slate-300">{selectedCandidate.averageConsumption}</span>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-3 space-y-1">
                      <span className="text-[9px] font-extrabold text-orange-400 uppercase tracking-wider block">AI Sunum Etiketleri</span>
                      <div className="flex gap-1 flex-wrap">
                        {selectedCandidate.aiPresentationTags.map((tag: string, idx: number) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 text-[9px] font-semibold rounded border border-orange-500/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: ADMIN MANAGEMENT & CANONICAL DETAILS */}
              <div className="space-y-5">
                {/* 1. Availability Status */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Keşif Uygunluk Durumları</span>

                  <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className="text-slate-400">Kriterli Keşif:</span>
                    {selectedCandidate.isFilteredAvailable ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Kullanılabilir ({selectedCandidate.activeListingCount} İlan)</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 font-bold">İlan Yok</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-400">Kritersiz Keşif:</span>
                    {selectedCandidate.isUnfilteredEligible ? (
                      <span className="text-sky-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Kullanılabilir (✓ Tam)</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold">İçerik / Görsel Eksik</span>
                    )}
                  </div>
                </div>

                {/* 2. Read-Only Canonical Spec Box */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Teknik Veri Kaynağı</span>
                    <a
                      href={`/admin/vehicle-data/variants?search=${encodeURIComponent(selectedCandidate.brandName + ' ' + selectedCandidate.modelName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-orange-400 hover:underline flex items-center gap-1"
                    >
                      <span>Varyant VT'de Düzenle</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    Teknik veriler canonical <span className="text-slate-200 font-mono">VehicleVariant</span> tablosundan salt-okunur olarak çekilmektedir.
                  </p>
                </div>

                {/* 3. Accordion: Linked Variants */}
                <div className="bg-slate-950 rounded-2xl border border-white/5 overflow-hidden">
                  <button
                    onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                    className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-white/5 transition"
                  >
                    <span>Bağlı Varyantlar ({selectedCandidate.variantCount})</span>
                    {isAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isAccordionOpen && (
                    <div className="p-4 pt-0 space-y-2 border-t border-white/5">
                      {selectedCandidate.variants.map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                          <span className="text-slate-300 font-medium">{v.year} model · {v.trimName}</span>
                          <span className="text-slate-500 font-mono text-[10px]">{v.activeListings} aktif ilan</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Controls Action */}
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => alert(`Keşif adayı "${selectedCandidate.brandName} ${selectedCandidate.modelName}" yayında.`)}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-orange-500/15"
                  >
                    Kaydet ve Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD CANDIDATE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[32px] max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-white">Keşfe Araç Ekle</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-400" />
                <div className="leading-relaxed">
                  Aracını Bul sistemi canonical <span className="font-bold">VehicleVariant</span> veritabanı ile otomatik entegredir. <span className="font-bold">APPROVED</span> statüsündeki tüm teknik araçlar otomatik keşif adayıdır.
                </div>
              </div>

              <p className="text-slate-400">
                Teknik araç verisini ikinci kez elle girmeden Araç Varyant Veritabanıüzerinden onaylı araç ekleyebilirsiniz.
              </p>

              <a
                href="/admin/vehicle-data/variants"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <span>Araç Varyant Veritabanına Git</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
