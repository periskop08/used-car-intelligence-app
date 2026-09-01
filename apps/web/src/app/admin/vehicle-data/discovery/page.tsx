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
  Info,
  RefreshCw
} from 'lucide-react';
import { API_BASE_URL, getAuthToken, fetchReportApi } from '@/utils/apiConfig';
import { formatImageUrl } from '@/utils/media';
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

  // WYSIWYG Card Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  
  // Cascading options
  const [dbBrands, setDbBrands] = useState<any[]>([]);
  const [dbModels, setDbModels] = useState<any[]>([]);
  const [dbVariants, setDbVariants] = useState<any[]>([]);

  // Form Fields
  const [formBrandId, setFormBrandId] = useState('');
  const [formBrandName, setFormBrandName] = useState('');
  const [formModelId, setFormModelId] = useState('');
  const [formModelName, setFormModelName] = useState('');
  const [formGenerationName, setFormGenerationName] = useState('');
  const [formBodyType, setFormBodyType] = useState('HATCHBACK');
  const [formFuelType, setFormFuelType] = useState('BENZIN');
  const [formTransmissionFamily, setFormTransmissionFamily] = useState('OTOMATIK');
  const [formTransmissionType, setFormTransmissionType] = useState('Otomatik');
  const [formEngineId, setFormEngineId] = useState('');
  const [formEngineVersion, setFormEngineVersion] = useState('');
  const [formPowerHp, setFormPowerHp] = useState('110 HP');
  const [formTorqueNm, setFormTorqueNm] = useState('143 Nm');
  const [formAverageConsumption, setFormAverageConsumption] = useState('5.5 L/100km');
  const [formDrivetrain, setFormDrivetrain] = useState('Önden Çekiş');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAllowInUnfiltered, setFormAllowInUnfiltered] = useState(true);
  const [formTags, setFormTags] = useState<string[]>(['#konfor', '#aile-araci']);
  const [formRepresentativeVariantId, setFormRepresentativeVariantId] = useState<string | null>(null);
  const [formTagInput, setFormTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDiscoveryCandidates = () => {
    setLoading(true);
    setError(null);

    let query = `?page=${page}&limit=50&filterCategory=${filterCategory}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (bodyType !== 'all') query += `&bodyType=${bodyType}`;
    if (fuelType !== 'all') query += `&fuelType=${fuelType}`;
    if (transmission !== 'all') query += `&transmission=${transmission}`;

    fetchReportApi(`admin/vehicle-discovery/candidates${query}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Aracını Bul keşif verileri yüklenemedi. (HTTP ${res.status})`);
        return res.json();
      })
      .then((data) => {
        setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
        if (data.summary) setSummary(data.summary);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err: any) => setError(err.message || 'Sunucu bağlantısı kurulamadı.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDiscoveryCandidates();
  }, [page, filterCategory, bodyType, fuelType, transmission]);

  // Load canonical Brands on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/vehicles/brands`)
      .then((res) => res.json())
      .then((data) => setDbBrands(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching brands:', err));
  }, []);

  // Load canonical Models when formBrandId changes
  useEffect(() => {
    if (!formBrandId) {
      setDbModels([]);
      return;
    }
    fetch(`${API_BASE_URL}/vehicles/models?brandId=${formBrandId}`)
      .then((res) => res.json())
      .then((data) => setDbModels(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching models:', err));
  }, [formBrandId]);

  // Load canonical Variants when formModelId changes
  useEffect(() => {
    if (!formModelId) {
      setDbVariants([]);
      return;
    }
    fetch(`${API_BASE_URL}/vehicles/variants?modelId=${formModelId}`)
      .then((res) => res.json())
      .then((data) => setDbVariants(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching variants:', err));
  }, [formModelId]);

  // Derived unique Engine choices for clean motor selection
  const uniqueEngineOptions = Array.from(
    new Map(
      dbVariants.map((v) => {
        const engId = v.engineId || v.engine?.id || v.id;
        const code = v.engine?.code || v.trim?.name || 'Standard';
        return [
          engId,
          {
            engineId: engId,
            code,
            horsepower: v.engine?.horsepower ? `${v.engine.horsepower} HP` : '110 HP',
            torque: v.engine?.torque ? `${v.engine.torque} Nm` : '143 Nm',
            bodyType: v.bodyType || 'SEDAN',
            fuelType: v.fuelType || 'BENZIN',
            transmissionName: v.transmission?.name || 'Otomatik',
            variantId: v.id
          }
        ];
      })
    ).values()
  );

  const openCreateEditor = () => {
    setEditingCandidateId(null);
    setFormBrandId('');
    setFormBrandName('');
    setFormModelId('');
    setFormModelName('');
    setFormGenerationName('');
    setFormBodyType('HATCHBACK');
    setFormFuelType('BENZIN');
    setFormTransmissionFamily('OTOMATIK');
    setFormTransmissionType('Otomatik');
    setFormEngineId('');
    setFormEngineVersion('');
    setFormPowerHp('');
    setFormTorqueNm('');
    setFormAverageConsumption('');
    setFormDrivetrain('Önden Çekiş');
    setFormImageUrl('');
    setFormIsActive(true);
    setFormAllowInUnfiltered(true);
    setFormTags(['#konfor', '#aile-araci']);
    setFormRepresentativeVariantId(null);
    setEditorOpen(true);
  };

  const openEditEditor = (c: any) => {
    setEditingCandidateId(c.candidateId);
    setFormBrandId(c.brandId || '');
    setFormBrandName(c.brandName || '');
    setFormModelId(c.modelId || '');
    setFormModelName(c.modelName || '');
    setFormGenerationName(c.generationName || '');
    setFormBodyType(c.bodyType || 'HATCHBACK');
    setFormFuelType(c.fuelType || 'BENZIN');
    setFormTransmissionType(c.transmissionName || 'Otomatik');
    setFormTransmissionFamily((c.transmissionName || '').toUpperCase().includes('MANUEL') ? 'MANUEL' : 'OTOMATIK');
    setFormEngineId(c.engineId || '');
    setFormEngineVersion(c.engineVersion || '');
    setFormPowerHp(c.powerHp || '');
    setFormTorqueNm(c.torqueNm || '');
    setFormAverageConsumption(c.averageConsumption || '');
    setFormDrivetrain(c.drivetrain || 'Önden Çekiş');
    setFormImageUrl(c.previewImageUrl || '');
    setFormIsActive(c.isPublished !== false);
    setFormAllowInUnfiltered(c.allowInUnfilteredDiscovery !== false);
    setFormTags(Array.isArray(c.aiPresentationTags) ? c.aiPresentationTags : ['#konfor']);
    setFormRepresentativeVariantId(c.representativeVariantId || null);
    setEditorOpen(true);
  };

  const handleSaveCandidate = () => {
    if (!formImageUrl || !formBrandName || !formModelName || !formEngineVersion || !formPowerHp || !formTorqueNm || !formAverageConsumption) {
      alert('Lütfen zorunlu alanları (görsel, marka, model, motor, güç, tork, ortalama tüketim) eksiksiz doldurun.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      candidateId: editingCandidateId || undefined,
      brandId: formBrandId || undefined,
      brand: formBrandName,
      modelId: formModelId || undefined,
      modelFamily: formModelName,
      generationName: formGenerationName || undefined,
      bodyType: formBodyType,
      fuelType: formFuelType,
      transmissionType: formTransmissionType,
      engineId: formEngineId || undefined,
      engineVersion: formEngineVersion,
      power: formPowerHp,
      torque: formTorqueNm,
      averageConsumption: formAverageConsumption,
      drivetrain: formDrivetrain,
      imageUrl: formImageUrl,
      isActive: formIsActive,
      allowInUnfilteredDiscovery: formAllowInUnfiltered,
      tags: formTags,
      representativeVariantId: formRepresentativeVariantId || undefined
    };

    fetchReportApi('admin/vehicle-discovery/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error('Keşif adayı kaydedilemedi.');
        return res.json();
      })
      .then(() => {
        alert(editingCandidateId ? 'Keşif adayı değişiklikleri kaydedildi.' : 'Yeni keşif adayı eklendi.');
        setEditorOpen(false);
        fetchDiscoveryCandidates();
      })
      .catch((err: any) => alert(err.message))
      .finally(() => setIsSubmitting(false));
  };

  const isFormValid = Boolean(
    formImageUrl &&
    formBrandName &&
    formModelName &&
    formBodyType &&
    formFuelType &&
    formTransmissionFamily &&
    formEngineVersion &&
    formPowerHp &&
    formTorqueNm &&
    formAverageConsumption
  );

  const isFilterBoundReady = Boolean(
    (formBrandId || formBrandName) &&
    (formModelId || formModelName) &&
    formBodyType &&
    formFuelType &&
    formTransmissionFamily
  );

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

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateEditor}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Keşfe Araç Ekle</span>
          </button>
        </div>
      </div>

      {/* 1. TOP SUMMARY STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/80 border border-white/10 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tüm Keşif Adayları</span>
          <div className="text-2xl font-black text-white">{loading ? '—' : summary.totalCandidates}</div>
          <div className="text-[10px] text-slate-500 mt-1">Gruplanmış Unique Aday</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-emerald-500/20 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">İlanlı Adaylar (Kriterli)</span>
          <div className="text-2xl font-black text-emerald-400">{loading ? '—' : summary.withListingsCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Aktif Satış İlanı Olan</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-sky-500/20 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-1">Kritersiz Keşfe Uygun</span>
          <div className="text-2xl font-black text-sky-400">{loading ? '—' : summary.unfilteredEligibleCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Görsel & Teknik Verisi Tam</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-amber-500/20 rounded-2xl backdrop-blur-md">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">İçerik / Görsel Eksik</span>
          <div className="text-2xl font-black text-amber-400">{loading ? '—' : summary.missingContentCount}</div>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                filterCategory === tab.key
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 bg-white/10 rounded-full text-[10px]">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search & Criteria Dropdowns */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Marka, model, jenerasyon veya motor ara..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <select
            value={bodyType}
            onChange={(e) => setBodyType(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="all">Kasa Tipi: Tümüne Bak</option>
            <option value="SEDAN">Sedan</option>
            <option value="HATCHBACK">Hatchback</option>
            <option value="SUV">SUV</option>
            <option value="STATION_WAGON">Station Wagon</option>
            <option value="COUPE">Coupe</option>
          </select>

          <select
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="all">Yakıt: Tümü</option>
            <option value="BENZIN">Benzinli</option>
            <option value="DIZEL">Dizel</option>
            <option value="HIBRIT">Hibrit</option>
            <option value="ELEKTRIK">Elektrikli</option>
          </select>

          <select
            value={transmission}
            onChange={(e) => setTransmission(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="all">Şanzıman: Tümü</option>
            <option value="AUTOMATIC">Otomatik</option>
            <option value="MANUAL">Manuel</option>
          </select>
        </form>
      </div>

      {/* 3. GROUPED CANDIDATE TABLE */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-slate-900/60 rounded-2xl border border-white/5">
          Keşif adayları yükleniyor...
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-3">
          <div className="text-rose-400 font-bold text-sm">
            Aracını Bul Keşif Adayları Yüklenemedi
          </div>
          <div className="text-slate-400 text-xs max-w-md mx-auto">
            {error}
          </div>
          <button
            onClick={() => fetchDiscoveryCandidates()}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/30 transition cursor-pointer"
          >
            Tekrar Dene
          </button>
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
                  <th className="py-3.5 px-4">Filtre Bağlantısı</th>
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
                          src={formatImageUrl(c.previewImageUrl)}
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
                        <span className="text-[10px] text-slate-500 italic">İlan Yok</span>
                      )}
                    </td>

                    {/* Kritersiz Keşif */}
                    <td className="py-3 px-4">
                      {c.isUnfilteredEligible ? (
                        <span className="px-2.5 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold rounded-xl flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Uygun</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold rounded-xl flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" />
                          <span>Eksik Veri</span>
                        </span>
                      )}
                    </td>

                    {/* Filtre Bağlantısı Status */}
                    <td className="py-3 px-4">
                      {c.isFilterReady !== false ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-md flex items-center gap-1 w-fit">
                          <ShieldCheck className="w-3 h-3" />
                          <span>✓ Hazır</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-md flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" />
                          <span>⚠ Eksik</span>
                        </span>
                      )}
                    </td>

                    {/* Aksiyon */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditEditor(c)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ml-auto border border-white/10"
                      >
                        <Eye className="w-3.5 h-3.5 text-orange-400" />
                        <span>Detay / Düzenle</span>
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
            <div className="flex items-center gap-2">
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

      {/* 4. UNIFIED WYSIWYG EDITABLE CARD EDITOR MODAL */}
      {editorOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-[32px] w-[94vw] max-w-6xl h-[90vh] max-h-[820px] overflow-hidden shadow-2xl flex flex-col relative my-auto animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{editingCandidateId ? 'Aracını Bul Kartı Düzenle' : '+ Keşfe Yeni Araç Ekle'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full">
                      WYSIWYG Editör
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Kullanıcının gördüğü canlı swipe kartı üzerinde doğrudan görsel ve metin bilgilerini düzenleyin.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Filter Binding Badge */}
                {isFilterBoundReady ? (
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>İLAN FİLTRE BAĞLANTISI: ✓ Hazır</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>İLAN FİLTRE BAĞLANTISI: ⚠ Eksik Eşleşme</span>
                  </span>
                )}

                <button
                  onClick={() => setEditorOpen(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Split View (WYSIWYG Preview on Left + Canonical Controls on Right) */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#080c18]">
              
              {/* LEFT COLUMN: LIVE USER SWIPE CARD PREVIEW (WYSIWYG) */}
              <div className="lg:col-span-6 flex flex-col items-center justify-start space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5 self-start">
                  <Eye className="w-4 h-4 text-orange-400" />
                  <span>Kullanıcı Canlı Kart Görünümü (Live Preview)</span>
                </span>

                <div className="w-full max-w-[420px] bg-[#0c1224] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col min-h-[520px] relative">
                  {/* Photo area */}
                  <div className="relative h-52 w-full bg-slate-950 border-b border-white/5 overflow-hidden group">
                    {formImageUrl ? (
                      <>
                        <img
                          src={formatImageUrl(formImageUrl)}
                          alt={formModelName || 'Araç Görseli'}
                          className="w-full h-full object-contain relative z-10"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1224] to-transparent z-20" />
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center">
                        <ImageOff className="w-8 h-8 text-slate-600" />
                        <span className="text-xs font-bold">Görsel Yükleyin</span>
                        <span className="text-[10px] text-slate-600">Cloudflare R2 aracini-bul/ klasörüne yüklenir</span>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-4 right-4 z-30">
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-0.5">
                        {formBrandName || 'MARKA SİLİNMEDİ'}
                      </span>
                      <h4 className="text-lg font-black text-white leading-tight">
                        {formModelName || 'Model / Başlık Girin'}
                      </h4>
                    </div>
                  </div>

                  {/* Specification Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                        <span className="text-slate-500 text-[10px] block font-medium">Kasa Tipi</span>
                        <span className="font-semibold text-slate-200">{translateBodyType(formBodyType)}</span>
                      </div>
                      <div className="p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                        <span className="text-slate-500 text-[10px] block font-medium">Yakıt</span>
                        <span className="font-semibold text-slate-200">{translateFuel(formFuelType)}</span>
                      </div>
                      <div className="p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                        <span className="text-slate-500 text-[10px] block font-medium">Şanzıman</span>
                        <span className="font-semibold text-slate-200">{translateTrans(formTransmissionType)} ({formTransmissionFamily})</span>
                      </div>
                      <div className="p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                        <span className="text-slate-500 text-[10px] block font-medium">Motor</span>
                        <span className="font-semibold text-slate-200">{formEngineVersion || '—'}</span>
                      </div>
                      <div className="p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                        <span className="text-slate-500 text-[10px] block font-medium">Güç / Tork</span>
                        <span className="font-semibold text-slate-200">{formPowerHp || '—'} / {formTorqueNm || '—'}</span>
                      </div>
                      <div className="p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                        <span className="text-slate-500 text-[10px] block font-medium">Ort. Tüketim</span>
                        <span className="font-semibold text-slate-200">{formAverageConsumption || '—'}</span>
                      </div>
                    </div>

                    {/* AI Presentation Tags */}
                    <div className="border-t border-white/10 pt-3 space-y-1.5">
                      <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wider block">
                        AI Sunum Etiketleri
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {formTags.map((tag: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] font-bold rounded-lg border border-orange-500/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: CANONICAL FILTER BINDING & EDITABLE CONTROLS */}
              <div className="lg:col-span-6 space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                  <span>Doğrudan Kart Üzerinde Seçim & Form Alanları</span>
                </span>

                {/* 1. IMAGE UPLOAD & PREVIEW LINK */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">1. Araç Görseli (Cloudflare R2 aracini-bul/)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="Görsel URL veya bilgisayardan yükleyin..."
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                    />
                    <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10 rounded-xl cursor-pointer transition shrink-0 flex items-center gap-1">
                      <span>Yükle</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const token = getAuthToken();
                            const res = await fetch(`${API_BASE_URL}/admin/vehicle-discovery/upload-image`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                              body: formData,
                            });
                            if (!res.ok) throw new Error('Görsel yüklenemedi.');
                            const data = await res.json();
                            if (data.url) {
                              setFormImageUrl(data.url);
                            }
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* 2. CASCADING MARKA & MODEL SEÇİMİ */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">2. Marka ve Model (Canonical Identity)</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Marka Seç / Gir</label>
                      <select
                        value={formBrandId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setFormBrandId(selectedId);
                          const found = dbBrands.find((b) => b.id === selectedId);
                          if (found) setFormBrandName(found.name);
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="">— Canonical Marka —</option>
                        {dbBrands.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Model Seç / Gir</label>
                      <select
                        value={formModelId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setFormModelId(selectedId);
                          const found = dbModels.find((m) => m.id === selectedId);
                          if (found) setFormModelName(found.name);
                        }}
                        disabled={!formBrandId && dbModels.length === 0}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 disabled:opacity-40"
                      >
                        <option value="">— Canonical Model —</option>
                        {dbModels.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Marka Display Adı</label>
                      <input
                        type="text"
                        value={formBrandName}
                        onChange={(e) => setFormBrandName(e.target.value)}
                        placeholder="Örn: MERCEDES-BENZ"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Model / Başlık Display Adı</label>
                      <input
                        type="text"
                        value={formModelName}
                        onChange={(e) => setFormModelName(e.target.value)}
                        placeholder="Örn: Corsa veya 3008 1.5 BlueHDi"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. KASA, YAKIT, ŞANZIMAN & MOTOR SEÇİMİ */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">3. Kasa, Yakıt, Şanzıman & Motor</span>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Kasa Tipi</label>
                      <select
                        value={formBodyType}
                        onChange={(e) => setFormBodyType(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="HATCHBACK">Hatchback</option>
                        <option value="SEDAN">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="STATION_WAGON">Station Wagon</option>
                        <option value="COUPE">Coupe</option>
                        <option value="CABRIO">Cabrio</option>
                        <option value="PICKUP">Pickup</option>
                        <option value="VAN">Van / Minivan</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Yakıt</label>
                      <select
                        value={formFuelType}
                        onChange={(e) => setFormFuelType(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="BENZIN">Benzinli</option>
                        <option value="DIZEL">Dizel</option>
                        <option value="HIBRIT">Hibrit</option>
                        <option value="ELEKTRIK">Elektrikli</option>
                        <option value="LPG">LPG</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Şanzıman Family</label>
                      <select
                        value={formTransmissionFamily}
                        onChange={(e) => {
                          const fam = e.target.value;
                          setFormTransmissionFamily(fam);
                          setFormTransmissionType(fam === 'MANUEL' ? 'Manuel' : 'Otomatik');
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="OTOMATIK">Otomatik</option>
                        <option value="MANUEL">Manuel</option>
                      </select>
                    </div>
                  </div>

                  {/* Clean Motor Options Dropdown */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Motor / Versiyon (Canonical Engine)</label>
                    {uniqueEngineOptions.length > 0 ? (
                      <select
                        value={formEngineId}
                        onChange={(e) => {
                          const engId = e.target.value;
                          setFormEngineId(engId);
                          const found = uniqueEngineOptions.find((o) => o.engineId === engId);
                          if (found) {
                            setFormEngineVersion(found.code);
                            if (found.horsepower) setFormPowerHp(found.horsepower);
                            if (found.torque) setFormTorqueNm(found.torque);
                            if (found.variantId) setFormRepresentativeVariantId(found.variantId);
                          }
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 mb-1"
                      >
                        <option value="">— Clean Canonical Motor Seç —</option>
                        {uniqueEngineOptions.map((opt) => (
                          <option key={opt.engineId} value={opt.engineId}>
                            {opt.code} ({opt.horsepower} · {opt.torque})
                          </option>
                        ))}
                      </select>
                    ) : null}

                    <input
                      type="text"
                      value={formEngineVersion}
                      onChange={(e) => setFormEngineVersion(e.target.value)}
                      placeholder="Motor Adı Display (Örn: 1.6 CDTI veya 1.5 BlueHDi 130)"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* 4. PERFORMANCE & CONSUMPTION (MANUAL DISPLAY FIELDS) */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">4. Performans ve Tüketim (Sunum Bilgileri)</span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Güç (HP)</label>
                      <input
                        type="text"
                        value={formPowerHp}
                        onChange={(e) => setFormPowerHp(e.target.value)}
                        placeholder="Örn: 130 HP"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Tork (Nm)</label>
                      <input
                        type="text"
                        value={formTorqueNm}
                        onChange={(e) => setFormTorqueNm(e.target.value)}
                        placeholder="Örn: 300 Nm"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Ort. Tüketim</label>
                      <input
                        type="text"
                        value={formAverageConsumption}
                        onChange={(e) => setFormAverageConsumption(e.target.value)}
                        placeholder="Örn: 4.5 L/100km"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. PUBLICATION & UNFILTERED DISCOVERY TOGGLES */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">5. Yayın Ayarları</span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-900 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white text-xs block">Yayın Durumu</span>
                        <span className="text-[10px] text-slate-400">Yayında / Taslak</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormIsActive(!formIsActive)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                          formIsActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-white/10'
                        }`}
                      >
                        {formIsActive ? 'Yayında' : 'Taslak'}
                      </button>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white text-xs block">Kritersiz Keşif</span>
                        <span className="text-[10px] text-slate-400">Açık / Kapalı</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormAllowInUnfiltered(!formAllowInUnfiltered)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                          formAllowInUnfiltered
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'bg-slate-800 text-slate-400 border border-white/10'
                        }`}
                      >
                        {formAllowInUnfiltered ? 'Açık' : 'Kapalı'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer CTA */}
            <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-400 font-medium">
                {isFormValid ? (
                  <span className="text-emerald-400 font-bold">✓ Tüm zorunlu alanlar dolduruldu.</span>
                ) : (
                  <span className="text-amber-400">⚠ Lütfen zorunlu alanları (görsel, marka, model, motor, güç, tork, tüketim) doldurun.</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-white/10 transition cursor-pointer"
                >
                  İptal
                </button>

                <button
                  type="button"
                  disabled={!isFormValid || isSubmitting}
                  onClick={handleSaveCandidate}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition disabled:opacity-40 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCandidateId ? 'Değişiklikleri Kaydet' : 'Kaydet ve Ekle'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
