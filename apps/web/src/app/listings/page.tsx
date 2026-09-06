"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ListingFilters from "../../components/listings/ListingFilters";
import ListingCard from "../../components/listings/ListingCard";
import UrgentListingBadge from "../../components/listings/UrgentListingBadge";
import { formatCurrency } from "@/utils/formatters";
import {
  VEHICLE_COLORS,
  isApprovedVehicleColor,
  normalizeVehicleColor,
  HORSEPOWER_RANGES,
  ENGINE_DISPLACEMENT_RANGES,
  getHpRangeById,
  getCcRangeById,
  isValidHpRangeId,
  isValidCcRangeId,
} from "@used-car-intelligence/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const TURKISH_CITIES = [
  "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", 
  "Adana", "Konya", "Gaziantep", "Kayseri", "Kocaeli",
  "Samsun", "Mersin", "Eskişehir", "Trabzon", "Diyarbakır"
];

function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter States
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedEngineId, setSelectedEngineId] = useState("");
  const [vehicleVariantId, setVehicleVariantId] = useState("");
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minKm, setMinKm] = useState("");
  const [maxKm, setMaxKm] = useState("");
  const [isAiReady, setIsAiReady] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [showcaseOnly, setShowcaseOnly] = useState(false);

  // sahibinden.com style extended filters
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("TRY");
  const [fuelTypes, setFuelTypes] = useState<string[]>([]);
  const [transmissions, setTransmissions] = useState<string[]>([]);
  const [vehicleStatuses, setVehicleStatuses] = useState<string[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);
  const [powerRanges, setPowerRanges] = useState<string[]>([]);
  const [displacementRanges, setDisplacementRanges] = useState<string[]>([]);
  const [isPowerExpanded, setIsPowerExpanded] = useState(false);
  const [isDisplacementExpanded, setIsDisplacementExpanded] = useState(false);
  const [isColorExpanded, setIsColorExpanded] = useState(false);
  const [drivetrains, setDrivetrains] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [hasWarranty, setHasWarranty] = useState<string>(""); 
  const [heavyDamage, setHeavyDamage] = useState<string>(""); 
  const [plateTypes, setPlateTypes] = useState<string[]>([]);
  const [sellerType, setSellerType] = useState(""); 
  const [exchangeable, setExchangeable] = useState<string>(""); 
  const [keyword, setKeyword] = useState("");
  const [includeDescription, setIncludeDescription] = useState(false);

  // Data States
  const [listings, setListings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [token, setToken] = useState("");
  const [preferenceProfileId, setPreferenceProfileId] = useState("");
  const [prefSessionId, setPrefSessionId] = useState("");

  // Fetch Brands on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    if (savedToken) setToken(savedToken);

    fetch(`${API_URL}/vehicles/brands`)
      .then((res) => res.json())
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching brands:", e));
  }, []);

  // Fetch Models when selectedBrand changes
  useEffect(() => {
    if (!selectedBrand) {
      setModels([]);
      setSelectedModel("");
      return;
    }
    fetch(`${API_URL}/vehicles/models?brandId=${selectedBrand}`)
      .then((res) => res.json())
      .then((data) => setModels(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching models:", e));
  }, [selectedBrand]);

  // Read URL parameters on load
  useEffect(() => {
    const brand = searchParams.get("brandId");
    const model = searchParams.get("modelId");
    const engineVal = searchParams.get("engineId");
    const variantId = searchParams.get("vehicleVariantId");
    const bodyVal = searchParams.get("bodyType");
    const fuelVal = searchParams.get("fuelType");
    const transVal = searchParams.get("transmission");
    const minP = searchParams.get("minPrice");
    const maxP = searchParams.get("maxPrice");
    const aiReady = searchParams.get("isAiReady") === "true";
    const urgentVal = searchParams.get("urgentOnly") === "true";
    const showcaseVal = searchParams.get("showcaseOnly") === "true";
    const statusVal = searchParams.get("vehicleStatus");
    const cityVal = searchParams.get("city");
    const profileId = searchParams.get("preferenceProfileId");
    const sId = searchParams.get("sessionId");

    const colorsParam = searchParams.get("colors") || searchParams.get("color");
    const powerParam = searchParams.get("powerRanges");
    const dispParam = searchParams.get("displacementRanges");
    
    if (brand) setSelectedBrand(brand);
    if (model) setSelectedModel(model);
    if (engineVal) setSelectedEngineId(engineVal);
    if (variantId) setVehicleVariantId(variantId);
    if (bodyVal) setBodyTypes(bodyVal.split(","));
    if (fuelVal) setFuelTypes(fuelVal.split(","));
    if (transVal) setTransmissions(transVal.split(","));
    if (minP) setMinPrice(minP);
    if (maxP) setMaxPrice(maxP);
    if (aiReady) setIsAiReady(true);
    if (urgentVal) setUrgentOnly(true);
    if (showcaseVal) setShowcaseOnly(true);
    if (statusVal) setVehicleStatuses(statusVal.split(","));
    if (cityVal) setCity(cityVal);
    if (profileId) setPreferenceProfileId(profileId);
    if (sId) setPrefSessionId(sId);

    // Safe hydration: filter out any invalid/stale values without crashing
    if (colorsParam) {
      const validCols = colorsParam
        .split(",")
        .map((x) => x.trim())
        .filter((c) => isApprovedVehicleColor(c))
        .map((c) => normalizeVehicleColor(c)!)
        .filter(Boolean);
      if (validCols.length > 0) setColors(validCols);
    }
    if (powerParam) {
      const validPower = powerParam
        .split(",")
        .map((x) => x.trim())
        .filter((id) => isValidHpRangeId(id));
      if (validPower.length > 0) setPowerRanges(validPower);
    }
    if (dispParam) {
      const validDisp = dispParam
        .split(",")
        .map((x) => x.trim())
        .filter((id) => isValidCcRangeId(id));
      if (validDisp.length > 0) setDisplacementRanges(validDisp);
    }
  }, [searchParams]);

  // Main Fetch function
  const fetchListings = () => {
    setLoading(true);
    let query = `?page=${page}&limit=9&sort=${sort}`;
    if (selectedBrand) query += `&brandId=${selectedBrand}`;
    if (selectedModel) query += `&modelId=${selectedModel}`;
    if (selectedEngineId) query += `&engineId=${selectedEngineId}`;
    if (vehicleVariantId) query += `&vehicleVariantId=${vehicleVariantId}`;
    if (minYear) query += `&minYear=${minYear}`;
    if (maxYear) query += `&maxYear=${maxYear}`;
    if (minPrice) query += `&minPrice=${minPrice}`;
    if (maxPrice) query += `&maxPrice=${maxPrice}`;
    if (minKm) query += `&minKm=${minKm}`;
    if (maxKm) query += `&maxKm=${maxKm}`;
    if (isAiReady) query += `&isAiReady=true`;
    if (urgentOnly) query += `&urgentOnly=true`;
    if (showcaseOnly) query += `&showcaseOnly=true`;
    if (preferenceProfileId) query += `&preferenceProfileId=${preferenceProfileId}`;
    if (prefSessionId) query += `&sessionId=${prefSessionId}`;

    if (city) query += `&city=${encodeURIComponent(city)}`;
    if (district) query += `&district=${encodeURIComponent(district)}`;
    if (selectedCurrency) query += `&currency=${selectedCurrency}`;
    if (fuelTypes.length > 0) query += `&fuelType=${fuelTypes.join(",")}`;
    if (transmissions.length > 0) query += `&transmission=${transmissions.join(",")}`;
    if (vehicleStatuses.length > 0) query += `&vehicleStatus=${vehicleStatuses.join(",")}`;
    if (bodyTypes.length > 0) query += `&bodyType=${bodyTypes.join(",")}`;
    if (drivetrains.length > 0) query += `&drivetrain=${drivetrains.join(",")}`;
    if (colors.length > 0) query += `&colors=${encodeURIComponent(colors.join(","))}`;
    if (powerRanges.length > 0) query += `&powerRanges=${encodeURIComponent(powerRanges.join(","))}`;
    if (displacementRanges.length > 0) query += `&displacementRanges=${encodeURIComponent(displacementRanges.join(","))}`;
    if (hasWarranty) query += `&hasWarranty=${hasWarranty}`;
    if (heavyDamage) query += `&heavyDamage=${heavyDamage}`;
    if (plateTypes.length > 0) query += `&plateType=${plateTypes.join(",")}`;
    if (sellerType) query += `&sellerType=${sellerType}`;
    if (exchangeable) query += `&exchangeable=${exchangeable}`;
    if (keyword) query += `&keyword=${encodeURIComponent(keyword)}`;
    if (includeDescription) query += `&includeDescription=true`;

    const headers: any = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`${API_URL}/listings${query}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        setListings(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Error fetching listings:", e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchListings();
  }, [page, sort, selectedBrand, selectedModel, vehicleVariantId, minPrice, maxPrice, fuelTypes, transmissions, bodyTypes, isAiReady, urgentOnly, showcaseOnly, token, preferenceProfileId, prefSessionId]);

  const handleToggleFavorite = (e: React.MouseEvent, listingId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token) {
      router.push(`/login?redirect=/listings`);
      return;
    }

    fetch(`${API_URL}/listings/${listingId}/favorite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("İşlem başarısız.");
        return res.json();
      })
      .then((data) => {
        setListings((prev) =>
          prev.map((item) =>
            item.id === listingId
              ? {
                  ...item,
                  isFavorited: data.isFavorited,
                  favoriteCount: data.favoriteCount !== undefined ? data.favoriteCount : (data.isFavorited ? (item.favoriteCount || 0) + 1 : Math.max(0, (item.favoriteCount || 0) - 1)),
                }
              : item
          )
        );
      })
      .catch((err) => console.error("Error toggling favorite:", err));
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);

    // Sync URL query state so that active filters survive pagination, refresh, and browser back/forward
    const params = new URLSearchParams();
    if (selectedBrand) params.set("brandId", selectedBrand);
    if (selectedModel) params.set("modelId", selectedModel);
    if (selectedEngineId) params.set("engineId", selectedEngineId);
    if (vehicleVariantId) params.set("vehicleVariantId", vehicleVariantId);
    if (minYear) params.set("minYear", minYear);
    if (maxYear) params.set("maxYear", maxYear);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (minKm) params.set("minKm", minKm);
    if (maxKm) params.set("maxKm", maxKm);
    if (isAiReady) params.set("isAiReady", "true");
    if (urgentOnly) params.set("urgentOnly", "true");
    if (showcaseOnly) params.set("showcaseOnly", "true");
    if (city) params.set("city", city);
    if (district) params.set("district", district);
    if (fuelTypes.length > 0) params.set("fuelType", fuelTypes.join(","));
    if (transmissions.length > 0) params.set("transmission", transmissions.join(","));
    if (vehicleStatuses.length > 0) params.set("vehicleStatus", vehicleStatuses.join(","));
    if (bodyTypes.length > 0) params.set("bodyType", bodyTypes.join(","));
    if (drivetrains.length > 0) params.set("drivetrain", drivetrains.join(","));
    if (colors.length > 0) params.set("colors", colors.join(","));
    if (powerRanges.length > 0) params.set("powerRanges", powerRanges.join(","));
    if (displacementRanges.length > 0) params.set("displacementRanges", displacementRanges.join(","));
    if (hasWarranty) params.set("hasWarranty", hasWarranty);
    if (heavyDamage) params.set("heavyDamage", heavyDamage);
    if (plateTypes.length > 0) params.set("plateType", plateTypes.join(","));
    if (sellerType) params.set("sellerType", sellerType);
    if (exchangeable) params.set("exchangeable", exchangeable);
    if (keyword) params.set("keyword", keyword);
    if (includeDescription) params.set("includeDescription", "true");

    const newQuery = params.toString();
    router.push(newQuery ? `/listings?${newQuery}` : "/listings");
    fetchListings();
  };

  const handleClearFilters = () => {
    setSelectedBrand("");
    setSelectedModel("");
    setMinYear("");
    setMaxYear("");
    setMinPrice("");
    setMaxPrice("");
    setMinKm("");
    setMaxKm("");
    setIsAiReady(false);
    setUrgentOnly(false);
    setShowcaseOnly(false);
    setCity("");
    setDistrict("");
    setSelectedCurrency("TRY");
    setFuelTypes([]);
    setTransmissions([]);
    setVehicleStatuses([]);
    setBodyTypes([]);
    setPowerRanges([]);
    setDisplacementRanges([]);
    setDrivetrains([]);
    setColors([]);
    setHasWarranty("");
    setHeavyDamage("");
    setPlateTypes([]);
    setSellerType("");
    setExchangeable("");
    setKeyword("");
    setIncludeDescription(false);
    setPage(1);
    router.push("/listings");
  };

  // Helper toggle functions
  const toggleFuelType = (val: string) => {
    setFuelTypes(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  const toggleTransmission = (val: string) => {
    setTransmissions(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  const toggleVehicleStatus = (val: string) => {
    setVehicleStatuses(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  const toggleBodyType = (val: string) => {
    setBodyTypes(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  const toggleDrivetrain = (val: string) => {
    setDrivetrains(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  const toggleColor = (val: string) => {
    setColors(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  const togglePowerRange = (val: string) => {
    setPowerRanges(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  const toggleDisplacementRange = (val: string) => {
    setDisplacementRanges(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  const togglePlateType = (val: string) => {
    setPlateTypes(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };


  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-200 canvas-title tracking-tight">Araç İlanları</h1>
        <p className="text-sm text-slate-400 canvas-subtitle mt-1">TorqueScout AI onaylı varyantlar ve kapsamlı kullanıcı analizleri ile ikinci el ilanları.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Filter Column */}
        <form onSubmit={handleFilterSubmit} className="lg:col-span-1 flex flex-col gap-5 bg-slate-900/20 border border-white/5 p-6 rounded-3xl h-fit max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-200 text-xs uppercase tracking-wider">Detaylı Filtreleme</h3>
            <button type="button" onClick={handleClearFilters} className="text-xs text-orange-500 hover:underline">Temizle</button>
          </div>

          <div className="border-t border-white/5"></div>

          {/* Adres */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adres (İl / İlçe)</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
            >
              <option value="">İl Seçin</option>
              {TURKISH_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="İlçe girin..."
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
            />
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Brand & Model */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marka & Model</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
            >
              <option value="">Marka Seçin</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedBrand}
            >
              <option value="">Model Seçin</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Fiyat & Para Birimi */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fiyat</label>
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-white/10 text-[10px] font-bold text-slate-400">
              {["TRY", "USD", "EUR", "GBP"].map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setSelectedCurrency(curr)}
                  className={`flex-1 py-1 rounded-md transition ${selectedCurrency === curr ? "bg-orange-600 text-white" : "hover:text-slate-200"}`}
                >
                  {curr === "TRY" ? "TL" : curr}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Model Yılı */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Yıl</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minYear}
                onChange={(e) => setMinYear(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxYear}
                onChange={(e) => setMaxYear(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Kilometre */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KM</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minKm}
                onChange={(e) => setMinKm(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxKm}
                onChange={(e) => setMaxKm(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Araç Durumu */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Araç Durumu</label>
            <div className="flex flex-col gap-1.5 text-xs text-slate-300">
              {[
                { label: "İkinci El", val: "USED" },
                { label: "Sıfır", val: "NEW" },
                { label: "İthal Sıfır", val: "IMPORTED_NEW" }
              ].map((item) => (
                <label key={item.val} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={vehicleStatuses.includes(item.val)}
                    onChange={() => toggleVehicleStatus(item.val)}
                    className="accent-orange-500 rounded border-white/10"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Yakıt Tipi */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Yakıt Tipi</label>
            <div className="flex flex-col gap-1.5 text-xs text-slate-300">
              {[
                { label: "Benzinli", val: "PETROL" },
                { label: "Dizel", val: "DIESEL" },
                { label: "Benzin & LPG", val: "LPG" },
                { label: "Hibrit", val: "HYBRID" },
                { label: "Elektrikli", val: "ELECTRIC" }
              ].map((item) => (
                <label key={item.val} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fuelTypes.includes(item.val)}
                    onChange={() => toggleFuelType(item.val)}
                    className="accent-orange-500 rounded border-white/10"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Vites */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vites</label>
            <div className="flex flex-col gap-1.5 text-xs text-slate-300">
              {[
                { label: "Manuel", val: "MANUAL" },
                { label: "Otomatik", val: "AUTOMATIC" }
              ].map((item) => (
                <label key={item.val} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={transmissions.includes(item.val)}
                    onChange={() => toggleTransmission(item.val)}
                    className="accent-orange-500 rounded border-white/10"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Kasa Tipi */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kasa Tipi</label>
            <div className="flex flex-col gap-1.5 text-xs text-slate-300">
              {[
                { label: "Sedan", val: "SEDAN" },
                { label: "Hatchback", val: "HATCHBACK" },
                { label: "SUV", val: "SUV" },
                { label: "Coupe", val: "COUPE" },
                { label: "Station Wagon", val: "WAGON" }
              ].map((item) => (
                <label key={item.val} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bodyTypes.includes(item.val)}
                    onChange={() => toggleBodyType(item.val)}
                    className="accent-orange-500 rounded border-white/10"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Motor Gücü (HP) - Collapsible Multi-Select */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Motor Gücü (HP)
              </label>
              {powerRanges.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPowerRanges([])}
                  className="text-[10px] text-orange-400 hover:underline"
                >
                  Sıfırla
                </button>
              )}
            </div>
            <button
              type="button"
              aria-expanded={isPowerExpanded}
              onClick={() => setIsPowerExpanded(!isPowerExpanded)}
              className="w-full bg-slate-900 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs text-slate-200 flex items-center justify-between transition focus:outline-none focus:border-orange-500"
            >
              <span className="truncate">
                {powerRanges.length === 0
                  ? "Motor Gücü Seçiniz"
                  : powerRanges.length === 1
                  ? getHpRangeById(powerRanges[0])?.label || "1 seçim"
                  : `${powerRanges.length} aralık seçildi`}
              </span>
              <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${isPowerExpanded ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            {isPowerExpanded && (
              <div className="flex flex-col gap-1 p-2 bg-slate-950/70 border border-white/5 rounded-xl max-h-56 overflow-y-auto custom-scrollbar">
                {HORSEPOWER_RANGES.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 p-1 rounded-md hover:bg-white/5 cursor-pointer select-none text-xs text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={powerRanges.includes(item.id)}
                      onChange={() => togglePowerRange(item.id)}
                      className="accent-orange-500 rounded border-white/10 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="truncate">{item.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Motor Hacmi (CC) - Collapsible Multi-Select */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Motor Hacmi (CC)
              </label>
              {displacementRanges.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDisplacementRanges([])}
                  className="text-[10px] text-orange-400 hover:underline"
                >
                  Sıfırla
                </button>
              )}
            </div>
            <button
              type="button"
              aria-expanded={isDisplacementExpanded}
              onClick={() => setIsDisplacementExpanded(!isDisplacementExpanded)}
              className="w-full bg-slate-900 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs text-slate-200 flex items-center justify-between transition focus:outline-none focus:border-orange-500"
            >
              <span className="truncate">
                {displacementRanges.length === 0
                  ? "Motor Hacmi Seçiniz"
                  : displacementRanges.length === 1
                  ? getCcRangeById(displacementRanges[0])?.label || "1 seçim"
                  : `${displacementRanges.length} aralık seçildi`}
              </span>
              <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${isDisplacementExpanded ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            {isDisplacementExpanded && (
              <div className="flex flex-col gap-1 p-2 bg-slate-950/70 border border-white/5 rounded-xl max-h-56 overflow-y-auto custom-scrollbar">
                {ENGINE_DISPLACEMENT_RANGES.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 p-1 rounded-md hover:bg-white/5 cursor-pointer select-none text-xs text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={displacementRanges.includes(item.id)}
                      onChange={() => toggleDisplacementRange(item.id)}
                      className="accent-orange-500 rounded border-white/10 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="truncate">{item.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Çekiş */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Çekiş</label>
            <div className="flex flex-col gap-1.5 text-xs text-slate-300">
              {[
                { label: "Önden Çekiş", val: "FWD" },
                { label: "Arkadan İtiş", val: "RWD" },
                { label: "4WD (Sürekli)", val: "4WD" },
                { label: "AWD (Elektronik)", val: "AWD" }
              ].map((item) => (
                <label key={item.val} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={drivetrains.includes(item.val)}
                    onChange={() => toggleDrivetrain(item.val)}
                    className="accent-orange-500 rounded border-white/10"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Renk - Collapsible Multi-Select */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Renk
              </label>
              {colors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setColors([])}
                  className="text-[10px] text-orange-400 hover:underline"
                >
                  Sıfırla
                </button>
              )}
            </div>
            <button
              type="button"
              aria-expanded={isColorExpanded}
              onClick={() => setIsColorExpanded(!isColorExpanded)}
              className="w-full bg-slate-900 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs text-slate-200 flex items-center justify-between transition focus:outline-none focus:border-orange-500"
            >
              <span className="truncate">
                {colors.length === 0
                  ? "Renk Seçiniz"
                  : colors.length === 1
                  ? colors[0]
                  : colors.length === 2
                  ? `${colors[0]}, ${colors[1]}`
                  : `${colors.length} renk seçildi`}
              </span>
              <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${isColorExpanded ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            {isColorExpanded && (
              <div className="grid grid-cols-2 gap-1 p-2 bg-slate-950/70 border border-white/5 rounded-xl max-h-56 overflow-y-auto custom-scrollbar">
                {VEHICLE_COLORS.map((col) => (
                  <label
                    key={col}
                    className="flex items-center gap-1.5 p-1 rounded-md hover:bg-white/5 cursor-pointer select-none text-xs text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={colors.includes(col)}
                      onChange={() => toggleColor(col)}
                      className="accent-orange-500 rounded border-white/10 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="truncate">{col}</span>
                  </label>
                ))}
              </div>
            )}
          </div>


          <div className="border-t border-white/5 my-1"></div>

          {/* Garanti & Hasar */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Garanti & Hasar</label>
            <div className="flex flex-col gap-2 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasWarranty === "true"}
                  onChange={(e) => setHasWarranty(e.target.checked ? "true" : "")}
                  className="accent-orange-500 rounded border-white/10"
                />
                <span>Garantili</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heavyDamage === "true"}
                  onChange={(e) => setHeavyDamage(e.target.checked ? "true" : "")}
                  className="accent-orange-500 rounded border-white/10"
                />
                <span>Ağır Hasar Kayıtlı Değil</span>
              </label>
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Plaka ve Uyruk */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plaka / Uyruk</label>
            <div className="flex flex-col gap-1.5 text-xs text-slate-300">
              {[
                { label: "TR Plakalı", val: "TR_PLATE" },
                { label: "Mavi Plakalı (MA)", val: "MA_PLATE" },
                { label: "Özel Plaka", val: "SPECIAL_PLATE" }
              ].map((item) => (
                <label key={item.val} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={plateTypes.includes(item.val)}
                    onChange={() => togglePlateType(item.val)}
                    className="accent-orange-500 rounded border-white/10"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Kimden */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kimden</label>
            <div className="flex flex-col gap-1.5 text-xs text-slate-300">
              {[
                { label: "Tümü", val: "" },
                { label: "Sahibinden", val: "OWNER" },
                { label: "Galeriden", val: "DEALER" },
                { label: "Yetkili Bayiden", val: "AUTHORIZED_DEALER" }
              ].map((item) => (
                <label key={item.val} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="sellerTypeRadio"
                    checked={sellerType === item.val}
                    onChange={() => setSellerType(item.val)}
                    className="accent-orange-500 rounded border-white/10"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Takaslı */}
          <div className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="exchangeableCheckbox"
              checked={exchangeable === "true"}
              onChange={(e) => setExchangeable(e.target.checked ? "true" : "")}
              className="accent-orange-500 rounded border-white/10"
            />
            <label htmlFor="exchangeableCheckbox" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
              🔄 Takaslı
            </label>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Kelime ile Filtrele */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelime İle Filtrele</label>
            <input
              type="text"
              placeholder="Kelime giriniz..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
            />
            <label className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-400 mt-1 select-none">
              <input
                type="checkbox"
                checked={includeDescription}
                onChange={(e) => setIncludeDescription(e.target.checked)}
                className="accent-orange-500 rounded border-white/10"
              />
              <span>Açıklamaları dahil et</span>
            </label>
          </div>

          {/* AI Ready Toggle */}
          <div className="flex items-center gap-2 cursor-pointer mt-2 border-t border-white/5 pt-3">
            <input
              type="checkbox"
              id="aiReadyCheckbox"
              checked={isAiReady}
              onChange={(e) => setIsAiReady(e.target.checked)}
              className="accent-orange-500 rounded border-white/10"
            />
            <label htmlFor="aiReadyCheckbox" className="text-xs font-black text-slate-200 cursor-pointer select-none flex items-center gap-1">
              ✨ Yalnızca AI Analizli
            </label>
          </div>

          {/* Acil İlanlar Toggle */}
          <div className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              id="urgentOnlyCheckbox"
              checked={urgentOnly}
              onChange={(e) => setUrgentOnly(e.target.checked)}
              className="accent-red-500 rounded border-white/10"
            />
            <label htmlFor="urgentOnlyCheckbox" className="text-xs font-black text-rose-400 cursor-pointer select-none flex items-center gap-1">
              ⚡ Yalnızca Acil İlanlar
            </label>
          </div>

          {/* Vitrin İlanları Toggle */}
          <div className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              id="showcaseOnlyCheckbox"
              checked={showcaseOnly}
              onChange={(e) => setShowcaseOnly(e.target.checked)}
              className="accent-amber-500 rounded border-white/10"
            />
            <label htmlFor="showcaseOnlyCheckbox" className="text-xs font-black text-amber-400 cursor-pointer select-none flex items-center gap-1">
              ⭐ Yalnızca Vitrin İlanları
            </label>
          </div>

          {/* Sticky Apply Button */}
          <div className="sticky bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md -mx-6 -mb-6 p-4 border-t border-white/5 flex flex-col gap-2 z-10 shadow-[0_-8px_24px_rgba(0,0,0,0.6)] rounded-b-3xl">
            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              🔍 Filtreleri Uygula (Ara)
            </button>
          </div>
        </form>

        {/* Right Listings Grid Column */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-slate-950/20 border border-white/5 px-6 py-4 rounded-2xl">
            <span className="text-xs font-bold text-slate-400">
              {loading ? "Yükleniyor..." : `${total} İlan Bulundu`}
            </span>

            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Sırala:</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
              >
                <option value="newest">En Yeni</option>
                <option value="price_asc">Fiyat (Düşükten Yükseğe)</option>
                <option value="price_desc">Fiyat (Yüksekten Düşüğe)</option>
                <option value="km_asc">Kilometre (Düşükten Yükseğe)</option>
                <option value="featured">Öne Çıkanlar</option>
              </select>
            </div>
          </div>

          {preferenceProfileId && (
            <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold px-4 py-3 rounded-2xl mb-6 flex items-center gap-2 animate-in fade-in duration-200">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              <span>Seçimlerinize göre sana daha yakın ilanlar öne çıkarıldı.</span>
            </div>
          )}

          {/* Grid list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="animate-spin text-3xl">⏳</span>
              <span className="text-slate-400 font-bold text-sm">İlanlar yükleniyor, lütfen bekleyin...</span>
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-white/10 rounded-3xl bg-slate-950/5">
              <span className="text-4xl">🚗</span>
              <span className="text-slate-300 font-bold text-lg">Eşleşen ilan bulunamadı.</span>
              <button onClick={handleClearFilters} className="text-xs text-orange-500 font-bold hover:underline">Filtreleri Temizle</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {listings.map((listing) => {
                const cover = listing.media && listing.media[0] ? listing.media[0].url : "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=60";
                return (
                  <a
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="group flex flex-col bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/5 transition duration-300"
                  >
                    <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                      {/* Favorite Button with Count */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, listing.id)}
                        className={`absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full border flex items-center gap-1 transition shadow-lg backdrop-blur-md text-[11px] font-bold ${
                          listing.isFavorited
                            ? "bg-red-500/20 text-red-500 border-red-500/40"
                            : "bg-slate-950/80 text-slate-450 border-white/10 hover:text-white"
                        }`}
                        title={listing.isFavorited ? "Favorilerden Kaldır" : "Favoriye Ekle"}
                      >
                        <span>{listing.isFavorited ? "❤️" : "🤍"}</span>
                        {listing.favoriteCount !== undefined && listing.favoriteCount > 0 && (
                          <span className="text-[10px] font-extrabold">{listing.favoriteCount}</span>
                        )}
                      </button>

                      <img
                        src={cover}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder-car.jpg";
                        }}
                      />
                      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
                        {listing.isUrgent && (
                          <UrgentListingBadge size="small" animated />
                        )}
                        {listing.isShowcaseFeedActive && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-lg border border-amber-300/40">
                            ⭐ Vitrin
                          </span>
                        )}
                        {listing.isAiReady && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-600/90 text-white backdrop-blur-sm border border-orange-500/30 shadow-md flex items-center gap-1">
                            ✨ AI Analizli
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 flex flex-col justify-between flex-1 gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {listing.modelYear} • {listing.city}
                        </span>
                        <h3 className="font-bold text-slate-200 text-[13px] line-clamp-1 group-hover:text-orange-400 transition mt-0.5">
                          {listing.title}
                        </h3>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {listing.kilometers.toLocaleString('tr-TR')} km
                        </p>
                      </div>

                      <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                        <span className="font-black text-slate-100 text-sm">
                          {formatCurrency(listing.priceAmount, listing.currency)}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {listing.vehicleVariant?.brand.name}
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition"
              >
                Önceki
              </button>
              <span className="text-xs text-slate-400 font-bold mx-2">Sayfa {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Listings() {
  return (
    <Suspense fallback={<div className="text-slate-400 font-bold text-lg text-center py-24">İlanlar yükleniyor...</div>}>
      <ListingsContent />
    </Suspense>
  );
}
