"use client";

import React, { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import {
  ShieldCheck,
  Shuffle,
  Filter,
  Star,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  X,
  RefreshCw,
  Search,
  Sparkles,
  ChevronRight,
  Info,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/apiConfig";

interface IsiCepteShowcaseItem {
  id: string;
  isicepteProviderId: string;
  businessName: string;
  slug: string;
  coverImageUrl?: string | null;
  city: string;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  isicepteProfileUrl: string;
  supportedBrands: string[];
  serviceCategories: string[];
  rating: number;
  reviewCount: number;
  isShowcase: boolean;
}

export default function IsiCepteOneriyorPage() {
  const [items, setItems] = useState<IsiCepteShowcaseItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Available filter options from active showcase pool
  const [availableCities, setAvailableCities] = useState<string[]>(["Tüm Şehirler"]);
  const [availableBrands, setAvailableBrands] = useState<string[]>(["Tüm Markalar"]);

  // Filter form state
  const [selectedCity, setSelectedCity] = useState<string>("Tüm Şehirler");
  const [selectedBrand, setSelectedBrand] = useState<string>("Tüm Markalar");

  // Applied filter state (applied upon clicking "Filtrele" or clearing)
  const [appliedCity, setAppliedCity] = useState<string>("Tüm Şehirler");
  const [appliedBrand, setAppliedBrand] = useState<string>("Tüm Markalar");

  // Selected Provider Detail Modal
  const [detailModalProvider, setDetailModalProvider] = useState<IsiCepteShowcaseItem | null>(null);

  // Fetch showcase recommendations from API
  const fetchRecommendations = useCallback(async (cityVal: string, brandVal: string, pageNum: number) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (cityVal && cityVal !== "Tüm Şehirler") {
        query.append("city", cityVal);
      }
      if (brandVal && brandVal !== "Tüm Markalar") {
        query.append("brand", brandVal);
      }
      query.append("page", pageNum.toString());
      query.append("limit", "12");

      const res = await fetch(`${API_BASE_URL}/isicepte/recommendations?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);

        if (Array.isArray(data.availableCities) && data.availableCities.length > 0) {
          setAvailableCities(data.availableCities);
        }
        if (Array.isArray(data.availableBrands) && data.availableBrands.length > 0) {
          setAvailableBrands(data.availableBrands);
        }

        // Record impression event for Vitrin analytics
        fetch(`${API_BASE_URL}/isicepte/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "ISICEPTE_SHOWCASE_IMPRESSION",
            city: cityVal !== "Tüm Şehirler" ? cityVal : undefined,
            brand: brandVal !== "Tüm Markalar" ? brandVal : undefined,
          }),
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Failed to load showcase providers:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations(appliedCity, appliedBrand, page);
  }, [appliedCity, appliedBrand, page, fetchRecommendations]);

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedCity(selectedCity);
    setAppliedBrand(selectedBrand);
  };

  const handleClearCityFilter = () => {
    setSelectedCity("Tüm Şehirler");
    setAppliedCity("Tüm Şehirler");
    setPage(1);
  };

  const handleClearBrandFilter = () => {
    setSelectedBrand("Tüm Markalar");
    setAppliedBrand("Tüm Markalar");
    setPage(1);
  };

  const handleClearAllFilters = () => {
    setSelectedCity("Tüm Şehirler");
    setSelectedBrand("Tüm Markalar");
    setAppliedCity("Tüm Şehirler");
    setAppliedBrand("Tüm Markalar");
    setPage(1);
  };

  const handleOpenDetailModal = (provider: IsiCepteShowcaseItem) => {
    setDetailModalProvider(provider);
    fetch(`${API_BASE_URL}/isicepte/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "ISICEPTE_PROFILE_CLICK",
        providerId: provider.id,
        city: provider.city,
      }),
    }).catch(() => {});
  };

  const handleOutboundClick = (provider: IsiCepteShowcaseItem) => {
    fetch(`${API_BASE_URL}/isicepte/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "ISICEPTE_OUTBOUND_CLICK",
        providerId: provider.id,
        city: provider.city,
      }),
    }).catch(() => {});
    window.open(provider.isicepteProfileUrl, "_blank", "noopener,noreferrer");
  };

  const isFiltered = appliedCity !== "Tüm Şehirler" || appliedBrand !== "Tüm Markalar";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
        
        {/* Top Header & Filter Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/10">
          
          {/* Title & Info Badges */}
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              İşiCepte Öneriyor
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sadece aktif vitrin üyeleri arasından otomotiv ustalarını ve servisleri keşfedin.
            </p>

            {/* Informative non-clickable chips */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold select-none">
                <ShieldCheck className="w-3.5 h-3.5" /> Sadece Vitrin Üyeleri
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold select-none">
                <Shuffle className="w-3.5 h-3.5" /> Rastgele Listeleme
              </span>
            </div>
          </div>

          {/* City & Brand Filters Form */}
          <form onSubmit={handleApplyFilters} className="flex flex-wrap sm:flex-nowrap items-end gap-3">
            {/* City Dropdown */}
            <div className="w-full sm:w-44 space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Şehir
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-[#0b0f19] border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:border-orange-500 focus:outline-none cursor-pointer transition"
              >
                {availableCities.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Dropdown */}
            <div className="w-full sm:w-44 space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Marka
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full bg-[#0b0f19] border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:border-orange-500 focus:outline-none cursor-pointer transition"
              >
                {availableBrands.map((b) => (
                  <option key={b} value={b} className="bg-slate-900 text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Button */}
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/25 shrink-0"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrele</span>
            </button>
          </form>
        </div>

        {/* Filtered Mode Context Bar (Image 2 representation) */}
        {isFiltered && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm sm:text-base font-bold text-white">
                {appliedCity !== "Tüm Şehirler" && appliedBrand !== "Tüm Markalar"
                  ? `${appliedCity} şehrinde ${appliedBrand} uzmanı vitrin üyeleri`
                  : appliedCity !== "Tüm Şehirler"
                  ? `${appliedCity} şehrindeki vitrin üyeleri`
                  : `${appliedBrand} uzmanı vitrin üyeleri`}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-mono font-bold">
                {totalCount} sonuç
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {appliedCity !== "Tüm Şehirler" && (
                <button
                  onClick={handleClearCityFilter}
                  className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{appliedCity}</span>
                  <X className="w-3 h-3" />
                </button>
              )}

              {appliedBrand !== "Tüm Markalar" && (
                <button
                  onClick={handleClearBrandFilter}
                  className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{appliedBrand}</span>
                  <X className="w-3 h-3" />
                </button>
              )}

              <button
                onClick={handleClearAllFilters}
                className="text-xs text-slate-400 hover:text-white underline font-semibold transition cursor-pointer ml-2"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
            <span className="text-xs text-slate-400 font-semibold">Vitrin üyeleri yükleniyor...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="py-20 px-6 rounded-3xl bg-slate-900/40 border border-white/10 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Search className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Bu şehir ve marka için şu anda İşiCepte Öneriyor üyesi bulunmuyor.
              </h3>
              <p className="text-xs text-slate-400">
                Marka filtresini kaldırarak şehirdeki diğer vitrin üyelerini görebilirsiniz.
              </p>
            </div>
            {isFiltered && (
              <button
                onClick={handleClearAllFilters}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-orange-600/20"
              >
                Tüm Vitrin Üyelerini Göster
              </button>
            )}
          </div>
        )}

        {/* Provider Cards Grid (3 Columns on Desktop, 2 Tablet, 1 Mobile) */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {items.map((provider) => (
              <div
                key={provider.id}
                className="rounded-3xl bg-[#0b101e]/90 border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl overflow-hidden flex flex-col justify-between group"
              >
                {/* Card Top: Cover Photo & Showcase Badge */}
                <div>
                  <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                    <img
                      src={
                        provider.coverImageUrl ||
                        "https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={provider.businessName}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b101e] via-transparent to-black/40" />

                    {/* Vitrin Üyesi Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black shadow-lg uppercase tracking-wider">
                        👑 Vitrin Üyesi
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 space-y-3.5">
                    {/* Header: Name and Rating */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-white tracking-tight line-clamp-1">
                        {provider.businessName}
                      </h3>
                      {provider.rating > 0 && (
                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-1 text-orange-400 font-bold text-sm">
                            <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                            <span>{provider.rating.toFixed(1)}</span>
                          </div>
                          {provider.reviewCount > 0 && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {provider.reviewCount} değerlendirme
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        {provider.city} {provider.district ? `/ ${provider.district}` : ""}
                      </span>
                    </div>

                    {/* Supported Brands */}
                    {provider.supportedBrands && provider.supportedBrands.length > 0 && (
                      <div className="text-xs text-slate-300 font-medium">
                        {provider.supportedBrands.join(" • ")}
                      </div>
                    )}

                    {/* Service Categories Chips */}
                    {provider.serviceCategories && provider.serviceCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {provider.serviceCategories.map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/5 text-slate-300 text-[11px] font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-6 pt-0 flex items-center gap-3">
                  <button
                    onClick={() => handleOpenDetailModal(provider)}
                    className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition text-center shadow-lg shadow-orange-600/20 cursor-pointer"
                  >
                    Profili Gör
                  </button>
                  <button
                    onClick={() => handleOutboundClick(provider)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>İşiCepte&apos;de Aç</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer"
            >
              Önceki
            </button>
            <span className="text-xs text-slate-400 font-mono px-3">
              Sayfa {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer"
            >
              Sonraki
            </button>
          </div>
        )}
      </main>

      {/* PROVIDER DETAIL PREVIEW MODAL */}
      {detailModalProvider && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101e] border border-white/15 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                  👑 İşiCepte Vitrin Üyesi
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">
                  {detailModalProvider.businessName}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalProvider(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Cover Image */}
            <div className="h-44 w-full rounded-2xl bg-slate-950 overflow-hidden relative">
              <img
                src={
                  detailModalProvider.coverImageUrl ||
                  "https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=800&q=80"
                }
                alt={detailModalProvider.businessName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details Section */}
            <div className="space-y-4 text-xs text-slate-300">
              {/* Rating & Reviews */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Müşteri Değerlendirmesi</div>
                  <div className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                    <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                    <span>{detailModalProvider.rating.toFixed(1)} / 5.0</span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400 font-mono">
                  {detailModalProvider.reviewCount} gerçek değerlendirme
                </div>
              </div>

              {/* Location & Address */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Adres & Konum</div>
                <div className="text-slate-200">
                  {detailModalProvider.address || `${detailModalProvider.city} / ${detailModalProvider.district || ""}`}
                </div>
              </div>

              {/* Supported Brands */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Hizmet Verilen Araç Markaları</div>
                <div className="flex flex-wrap gap-1.5">
                  {detailModalProvider.supportedBrands.map((b, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-semibold">
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Service Categories */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Hizmet Uzmanlıkları</div>
                <div className="flex flex-wrap gap-1.5">
                  {detailModalProvider.serviceCategories.map((c, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/5 text-slate-300 text-[11px] font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Phone / Contact */}
              {detailModalProvider.phone && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">İletişim Telefonu</div>
                  <div className="text-slate-200 font-mono font-bold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-orange-400" />
                    <span>{detailModalProvider.phone}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDetailModalProvider(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => handleOutboundClick(detailModalProvider)}
                className="flex-1 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/30"
              >
                <ExternalLink className="w-4 h-4" />
                <span>İşiCepte&apos;de Profili Aç</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
