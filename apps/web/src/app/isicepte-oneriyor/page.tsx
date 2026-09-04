"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Shuffle,
  Filter,
  Star,
  MapPin,
  ExternalLink,
  Phone,
  Wrench,
  X,
  RefreshCw,
  Search,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/apiConfig";

// Canonical locked 11 automotive categories
const CANONICAL_ISICEPTE_OTO_CATEGORIES = [
  "Motor/Mekanik",
  "Kaporta/Boya",
  "Oto Çekici/Kurtarıcı",
  "Oto Elektrik/Elektronik",
  "Motosiklet Servisi",
  "Cam Filmi/Kaplama",
  "Oto Yıkama & Detay",
  "Lastik/Jant",
  "Oto Aksesuar",
  "Oto Yedek Parça",
  "Oto Ekspertiz",
] as const;

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

function IsiCepteOneriyorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial query params
  const initialCity = searchParams.get("city") || "Tüm Şehirler";
  const initialBrand = searchParams.get("brand") || "Tüm Markalar";
  const initialCategory = searchParams.get("category") || "Tüm Kategoriler";
  const initialScope = (searchParams.get("scope") as 'SHOWCASE_ONLY' | 'ALL_ELIGIBLE') || "SHOWCASE_ONLY";

  const [items, setItems] = useState<IsiCepteShowcaseItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalShowcase, setTotalShowcase] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [scope, setScope] = useState<'SHOWCASE_ONLY' | 'ALL_ELIGIBLE'>(initialScope);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Available filter options from active showcase pool
  const [availableCities, setAvailableCities] = useState<string[]>(["Tüm Şehirler"]);
  const [availableBrands, setAvailableBrands] = useState<string[]>(["Tüm Markalar"]);
  const availableCategories = ["Tüm Kategoriler", ...CANONICAL_ISICEPTE_OTO_CATEGORIES];

  // Filter form state (dropdown selections before submit)
  const [selectedCity, setSelectedCity] = useState<string>(initialCity);
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

  // Applied filter state (triggers API fetch)
  const [appliedCity, setAppliedCity] = useState<string>(initialCity);
  const [appliedBrand, setAppliedBrand] = useState<string>(initialBrand);
  const [appliedCategory, setAppliedCategory] = useState<string>(initialCategory);

  // Selected Provider Detail Modal
  const [detailModalProvider, setDetailModalProvider] = useState<IsiCepteShowcaseItem | null>(null);

  // Session seed for stable randomization per page view
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(2, 9));

  // Update URL query parameters cleanly
  const syncUrlParams = useCallback(
    (cityVal: string, brandVal: string, catVal: string, scopeVal: 'SHOWCASE_ONLY' | 'ALL_ELIGIBLE') => {
      const params = new URLSearchParams();
      if (cityVal && cityVal !== "Tüm Şehirler") {
        params.set("city", cityVal);
      }
      if (brandVal && brandVal !== "Tüm Markalar") {
        params.set("brand", brandVal);
      }
      if (catVal && catVal !== "Tüm Kategoriler") {
        params.set("category", catVal);
      }
      if (scopeVal && scopeVal !== "SHOWCASE_ONLY") {
        params.set("scope", scopeVal);
      }
      const qs = params.toString();
      const newUrl = qs ? `/isicepte-oneriyor?${qs}` : "/isicepte-oneriyor";
      window.history.replaceState(null, "", newUrl);
    },
    []
  );

  // Sync state if URL searchParams change (e.g. back/forward navigation)
  useEffect(() => {
    const qCity = searchParams.get("city") || "Tüm Şehirler";
    const qBrand = searchParams.get("brand") || "Tüm Markalar";
    const qCategory = searchParams.get("category") || "Tüm Kategoriler";
    const qScope = (searchParams.get("scope") as 'SHOWCASE_ONLY' | 'ALL_ELIGIBLE') || "SHOWCASE_ONLY";

    setSelectedCity(qCity);
    setSelectedBrand(qBrand);
    setSelectedCategory(qCategory);
    setAppliedCity(qCity);
    setAppliedBrand(qBrand);
    setAppliedCategory(qCategory);
    setScope(qScope);
  }, [searchParams]);

  // Fetch recommendations from API
  const fetchRecommendations = useCallback(
    async (
      cityVal: string,
      brandVal: string,
      catVal: string,
      scopeVal: 'SHOWCASE_ONLY' | 'ALL_ELIGIBLE',
      pageNum: number
    ) => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (cityVal && cityVal !== "Tüm Şehirler") {
          query.append("city", cityVal);
        }
        if (brandVal && brandVal !== "Tüm Markalar") {
          query.append("brand", brandVal);
        }
        if (catVal && catVal !== "Tüm Kategoriler") {
          query.append("category", catVal);
        }
        query.append("scope", scopeVal);
        query.append("page", pageNum.toString());
        query.append("limit", scopeVal === "SHOWCASE_ONLY" ? "10" : "12");
        query.append("seed", sessionSeed);

        const res = await fetch(`${API_BASE_URL}/isicepte/recommendations?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
          setTotalCount(data.total || 0);
          setTotalShowcase(data.totalShowcase || 0);
          setTotalAll(data.totalAll || 0);
          setTotalPages(data.totalPages || 1);

          if (Array.isArray(data.availableCities) && data.availableCities.length > 0) {
            setAvailableCities(data.availableCities);
          }
          if (Array.isArray(data.availableBrands) && data.availableBrands.length > 0) {
            setAvailableBrands(data.availableBrands);
          }

          // Record impression event for Vitrin analytics if items exist
          if (data.items && data.items.length > 0) {
            fetch(`${API_BASE_URL}/isicepte/events`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventType: "ISICEPTE_SHOWCASE_IMPRESSION",
                city: cityVal !== "Tüm Şehirler" ? cityVal : undefined,
                brand: brandVal !== "Tüm Markalar" ? brandVal : undefined,
                metadata: {
                  category: catVal !== "Tüm Kategoriler" ? catVal : undefined,
                  scope: scopeVal,
                },
              }),
            }).catch(() => {});
          }
        } else {
          setItems([]);
          setTotalCount(0);
          setTotalShowcase(0);
          setTotalAll(0);
        }
      } catch (e) {
        console.error("Failed to load providers:", e);
        setItems([]);
        setTotalCount(0);
        setTotalShowcase(0);
        setTotalAll(0);
      } finally {
        setLoading(false);
      }
    },
    [sessionSeed]
  );

  useEffect(() => {
    fetchRecommendations(appliedCity, appliedBrand, appliedCategory, scope, page);
  }, [appliedCity, appliedBrand, appliedCategory, scope, page, fetchRecommendations]);

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedCity(selectedCity);
    setAppliedBrand(selectedBrand);
    setAppliedCategory(selectedCategory);
    syncUrlParams(selectedCity, selectedBrand, selectedCategory, scope);
  };

  const handleClearCityFilter = () => {
    setSelectedCity("Tüm Şehirler");
    setAppliedCity("Tüm Şehirler");
    setPage(1);
    syncUrlParams("Tüm Şehirler", appliedBrand, appliedCategory, scope);
  };

  const handleClearBrandFilter = () => {
    setSelectedBrand("Tüm Markalar");
    setAppliedBrand("Tüm Markalar");
    setPage(1);
    syncUrlParams(appliedCity, "Tüm Markalar", appliedCategory, scope);
  };

  const handleClearCategoryFilter = () => {
    setSelectedCategory("Tüm Kategoriler");
    setAppliedCategory("Tüm Kategoriler");
    setPage(1);
    syncUrlParams(appliedCity, appliedBrand, "Tüm Kategoriler", scope);
  };

  const handleClearAllFilters = () => {
    setSelectedCity("Tüm Şehirler");
    setSelectedBrand("Tüm Markalar");
    setSelectedCategory("Tüm Kategoriler");
    setAppliedCity("Tüm Şehirler");
    setAppliedBrand("Tüm Markalar");
    setAppliedCategory("Tüm Kategoriler");
    setPage(1);
    syncUrlParams("Tüm Şehirler", "Tüm Markalar", "Tüm Kategoriler", scope);
  };

  const handleToggleScope = (newScope: 'SHOWCASE_ONLY' | 'ALL_ELIGIBLE') => {
    setScope(newScope);
    setPage(1);
    syncUrlParams(appliedCity, appliedBrand, appliedCategory, newScope);
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

  const isFiltered =
    appliedCity !== "Tüm Şehirler" ||
    appliedBrand !== "Tüm Markalar" ||
    appliedCategory !== "Tüm Kategoriler";

  // Build contextual results summary
  const getContextualSummaryTitle = () => {
    const hasCity = appliedCity !== "Tüm Şehirler";
    const hasBrand = appliedBrand !== "Tüm Markalar";
    const hasCat = appliedCategory !== "Tüm Kategoriler";

    let descriptor = "";
    if (hasCity && hasBrand && hasCat) {
      descriptor = `${appliedCity} şehrinde ${appliedBrand} için ${appliedCategory} hizmeti veren`;
    } else if (hasCity && hasBrand) {
      descriptor = `${appliedCity} şehrinde ${appliedBrand} uzmanı`;
    } else if (hasCity && hasCat) {
      descriptor = `${appliedCity} şehrinde ${appliedCategory} hizmeti veren`;
    } else if (hasBrand && hasCat) {
      descriptor = `${appliedBrand} için ${appliedCategory} hizmeti veren`;
    } else if (hasCity) {
      descriptor = `${appliedCity} şehrindeki`;
    } else if (hasBrand) {
      descriptor = `${appliedBrand} uzmanı`;
    } else if (hasCat) {
      descriptor = `${appliedCategory} hizmeti veren`;
    }

    if (scope === "SHOWCASE_ONLY") {
      return descriptor ? `${descriptor} vitrin üyeleri` : "Tüm Vitrin Üyeleri";
    } else {
      return descriptor ? `${descriptor} tüm ustalar ve servisler` : "Tüm Ustalar ve Servisler";
    }
  };

  return (
    <div className="w-full flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Top Header & Filter Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/10">
        {/* Title & Info Badges */}
        <div className="space-y-3 max-w-xl">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            İşiCepte Öneriyor
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            {scope === "SHOWCASE_ONLY"
              ? "Sadece aktif vitrin üyeleri arasından öne çıkan otomotiv ustalarını ve servisleri keşfedin."
              : "TorqueScout onaylı tüm aktif İşiCepte otomotiv servislerini ve vitrin üyelerini keşfedin."}
          </p>

          {/* Informative chips & view mode selector */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleToggleScope("SHOWCASE_ONLY")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                scope === "SHOWCASE_ONLY"
                  ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 text-orange-400 font-bold shadow-sm"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>👑 Vitrin Üyeleri {totalShowcase > 0 ? `(${totalShowcase})` : ""}</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleScope("ALL_ELIGIBLE")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                scope === "ALL_ELIGIBLE"
                  ? "bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold shadow-sm"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span>🛠️ Tüm Ustaları Gör {totalAll > 0 ? `(${totalAll})` : ""}</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold select-none">
              <Shuffle className="w-3.5 h-3.5" /> Adil Sıralama
            </span>
          </div>
        </div>

        {/* 3-Filter Form: ŞEHİR | MARKA | KATEGORİ | [FİLTRELE] */}
        <form
          onSubmit={handleApplyFilters}
          className="flex flex-wrap lg:flex-nowrap items-end gap-3 w-full lg:w-auto"
        >
          {/* 1. City Dropdown */}
          <div className="w-full sm:w-[150px] lg:w-[160px] space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Şehir
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-[#0b0f19] border border-white/15 text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:border-orange-500 focus:outline-none cursor-pointer transition"
            >
              {availableCities.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Brand Dropdown */}
          <div className="w-full sm:w-[150px] lg:w-[160px] space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Marka
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-[#0b0f19] border border-white/15 text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:border-orange-500 focus:outline-none cursor-pointer transition"
            >
              {availableBrands.map((b) => (
                <option key={b} value={b} className="bg-slate-900 text-white">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Category Dropdown */}
          <div className="w-full sm:w-[180px] lg:w-[200px] space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Kategori
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#0b0f19] border border-white/15 text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:border-orange-500 focus:outline-none cursor-pointer transition truncate"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filter Button */}
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/25 shrink-0 h-[38px]"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrele</span>
          </button>
        </form>
      </div>

      {/* Filtered Mode Context Bar & Chips */}
      {(isFiltered || scope === "ALL_ELIGIBLE") && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm sm:text-base font-bold text-white">
              {getContextualSummaryTitle()}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-mono font-bold">
              {scope === "SHOWCASE_ONLY" ? `${totalCount} vitrin üyesi` : `${totalCount} toplam işletme`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Mode Indicator */}
            {scope === "ALL_ELIGIBLE" && (
              <button
                type="button"
                onClick={() => handleToggleScope("SHOWCASE_ONLY")}
                className="px-3 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>← Sadece Vitrin Üyeleri</span>
              </button>
            )}

            {/* City Chip */}
            {appliedCity !== "Tüm Şehirler" && (
              <button
                type="button"
                onClick={handleClearCityFilter}
                className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{appliedCity}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Brand Chip */}
            {appliedBrand !== "Tüm Markalar" && (
              <button
                type="button"
                onClick={handleClearBrandFilter}
                className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{appliedBrand}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Category Chip */}
            {appliedCategory !== "Tüm Kategoriler" && (
              <button
                type="button"
                onClick={handleClearCategoryFilter}
                className="px-3 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{appliedCategory}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {isFiltered && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs text-slate-400 hover:text-white underline font-semibold transition cursor-pointer ml-2"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-xs text-slate-400 font-semibold">
            {scope === "SHOWCASE_ONLY" ? "Vitrin üyeleri yükleniyor..." : "Tüm ustalar ve servisler yükleniyor..."}
          </span>
        </div>
      )}

      {/* Empty State — 100% Real, Zero Mock Filler */}
      {!loading && items.length === 0 && (
        <div className="py-20 px-6 rounded-3xl bg-slate-900/40 border border-white/10 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {scope === "SHOWCASE_ONLY"
                ? "Bu filtrelere uygun aktif Vitrin üyesi bulunmuyor."
                : isFiltered
                ? "Seçtiğiniz şehir, marka ve kategoriye uygun işletme bulunamadı."
                : "Şu anda İşiCepte Öneriyor bölümünde aktif işletme bulunmuyor."}
            </h3>
            <p className="text-xs text-slate-400">
              {scope === "SHOWCASE_ONLY" && totalAll > 0
                ? `Bu filtrelerle eşleşen ${totalAll} standart usta ve servis bulunuyor. "Tüm Ustaları Gör" butonuna tıklayarak erişebilirsiniz.`
                : isFiltered
                ? "Filtreleri değiştirerek veya temizleyerek diğer servisleri görebilirsiniz."
                : "Yeni üye otomotiv servisleri eklendikçe burada listelenecektir."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {scope === "SHOWCASE_ONLY" && totalAll > 0 && (
              <button
                type="button"
                onClick={() => handleToggleScope("ALL_ELIGIBLE")}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
              >
                <span>Tüm Ustaları Gör ({totalAll} İşletme)</span>
                <span>➔</span>
              </button>
            )}
            {isFiltered && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-white/10"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Provider Cards Grid (3 Columns Desktop, 2 Tablet, 1 Mobile) */}
      {!loading && items.length > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {items.map((provider) => (
              <div
                key={provider.id}
                className="rounded-3xl bg-[#0b101e]/90 border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl overflow-hidden flex flex-col justify-between group"
              >
                {/* Card Top: Cover Image Area & Showcase Badge */}
                <div>
                  <div className="relative h-48 w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                    {provider.coverImageUrl ? (
                      <img
                        src={provider.coverImageUrl}
                        alt={provider.businessName}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center text-slate-600 gap-2">
                        <Wrench className="w-8 h-8 text-slate-500" />
                        <span className="text-[11px] font-medium text-slate-400">İşiCepte Otomotiv Servisi</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b101e] via-transparent to-black/40" />

                    {/* Vitrin Üyesi Badge (Only if real showcase active entitlement) */}
                    {provider.isShowcase && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black shadow-lg uppercase tracking-wider">
                          👑 Vitrin Üyesi
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-6 space-y-3.5">
                    {/* Header: Name and Real Rating */}
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

                    {/* Canonical Service Categories Chips */}
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
                    type="button"
                    onClick={() => handleOpenDetailModal(provider)}
                    className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition text-center shadow-lg shadow-orange-600/20 cursor-pointer"
                  >
                    Profili Gör
                  </button>
                  <button
                    type="button"
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

          {/* Under Vitrin Section CTA: "TÜM USTALARI GÖR" Button in Showcase View */}
          {scope === "SHOWCASE_ONLY" && totalAll > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-base font-extrabold text-white">
                  Tüm Ustaları ve Servisleri Görün
                </h3>
                <p className="text-xs text-slate-400">
                  Aynı filtre kriterlerine uyan toplam {totalAll} adet kayıtlı işletme bulunmaktadır.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleScope("ALL_ELIGIBLE")}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-blue-600/25 shrink-0 flex items-center gap-2"
              >
                <span>Tüm Ustaları Gör ({totalAll})</span>
                <span>➔</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            type="button"
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
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* PROVIDER DETAIL MODAL (Matching Görsel 3) */}
      {detailModalProvider && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101e] border border-white/15 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                  👑 İŞİCEPTE VİTRİN ÜYESİ
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">
                  {detailModalProvider.businessName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalProvider(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Cover Image */}
            <div className="h-44 w-full rounded-2xl bg-slate-950 overflow-hidden relative flex items-center justify-center">
              {detailModalProvider.coverImageUrl ? (
                <img
                  src={detailModalProvider.coverImageUrl}
                  alt={detailModalProvider.businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Wrench className="w-8 h-8 text-slate-500" />
                  <span className="text-xs font-medium text-slate-400">İşletme Görseli</span>
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="space-y-4 text-xs text-slate-300">
              {/* Rating & Reviews (Only if real data exists) */}
              {detailModalProvider.rating > 0 && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">
                      Müşteri Değerlendirmesi
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                      <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                      <span>{detailModalProvider.rating.toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                  {detailModalProvider.reviewCount > 0 && (
                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      {detailModalProvider.reviewCount} gerçek değerlendirme
                    </div>
                  )}
                </div>
              )}

              {/* Location & Address */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Adres & Konum</div>
                <div className="text-slate-200">
                  {detailModalProvider.address ||
                    `${detailModalProvider.city} ${
                      detailModalProvider.district ? `/ ${detailModalProvider.district}` : ""
                    }`}
                </div>
              </div>

              {/* Supported Brands (Only if exists) */}
              {detailModalProvider.supportedBrands && detailModalProvider.supportedBrands.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Hizmet Verilen Araç Markaları
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailModalProvider.supportedBrands.map((b, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-semibold"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hizmet Uzmanlıkları (Strict Canonical Oto Hizmetleri Categories) */}
              {detailModalProvider.serviceCategories && detailModalProvider.serviceCategories.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Hizmet Uzmanlıkları
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailModalProvider.serviceCategories.map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/5 text-slate-300 text-[11px] font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Phone / Contact (Only if exists) */}
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

export default function IsiCepteOneriyorPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex-1 max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-xs text-slate-400 font-semibold">Sayfa yükleniyor...</span>
        </div>
      }
    >
      <IsiCepteOneriyorContent />
    </Suspense>
  );
}
