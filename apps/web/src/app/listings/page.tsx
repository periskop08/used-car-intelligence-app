"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minKm, setMinKm] = useState("");
  const [maxKm, setMaxKm] = useState("");
  const [isAiReady, setIsAiReady] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  // sahibinden.com style extended filters
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("TRY");
  const [fuelTypes, setFuelTypes] = useState<string[]>([]);
  const [transmissions, setTransmissions] = useState<string[]>([]);
  const [vehicleStatuses, setVehicleStatuses] = useState<string[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);
  const [minHp, setMinHp] = useState("");
  const [maxHp, setMaxHp] = useState("");
  const [minCc, setMinCc] = useState("");
  const [maxCc, setMaxCc] = useState("");
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
    const aiReady = searchParams.get("isAiReady") === "true";
    const statusVal = searchParams.get("vehicleStatus");
    const cityVal = searchParams.get("city");
    
    if (brand) setSelectedBrand(brand);
    if (model) setSelectedModel(model);
    if (aiReady) setIsAiReady(true);
    if (statusVal) setVehicleStatuses(statusVal.split(","));
    if (cityVal) setCity(cityVal);
  }, [searchParams]);

  // Main Fetch function
  const fetchListings = () => {
    setLoading(true);
    let query = `?page=${page}&limit=9&sort=${sort}`;
    if (selectedBrand) query += `&brandId=${selectedBrand}`;
    if (selectedModel) query += `&modelId=${selectedModel}`;
    if (minYear) query += `&minYear=${minYear}`;
    if (maxYear) query += `&maxYear=${maxYear}`;
    if (minPrice) query += `&minPrice=${minPrice}`;
    if (maxPrice) query += `&maxPrice=${maxPrice}`;
    if (minKm) query += `&minKm=${minKm}`;
    if (maxKm) query += `&maxKm=${maxKm}`;
    if (isAiReady) query += `&isAiReady=true`;

    if (city) query += `&city=${encodeURIComponent(city)}`;
    if (district) query += `&district=${encodeURIComponent(district)}`;
    if (selectedCurrency) query += `&currency=${selectedCurrency}`;
    if (fuelTypes.length > 0) query += `&fuelType=${fuelTypes.join(",")}`;
    if (transmissions.length > 0) query += `&transmission=${transmissions.join(",")}`;
    if (vehicleStatuses.length > 0) query += `&vehicleStatus=${vehicleStatuses.join(",")}`;
    if (bodyTypes.length > 0) query += `&bodyType=${bodyTypes.join(",")}`;
    if (minHp) query += `&minEnginePower=${minHp}`;
    if (maxHp) query += `&maxEnginePower=${maxHp}`;
    if (minCc) query += `&minEngineDisplacement=${minCc}`;
    if (maxCc) query += `&maxEngineDisplacement=${maxCc}`;
    if (drivetrains.length > 0) query += `&drivetrain=${drivetrains.join(",")}`;
    if (colors.length > 0) query += `&color=${colors.join(",")}`;
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
  }, [page, sort, selectedBrand, selectedModel, isAiReady, token]);

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
            item.id === listingId ? { ...item, isFavorited: data.isFavorited } : item
          )
        );
      })
      .catch((err) => console.error("Error toggling favorite:", err));
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
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
    setCity("");
    setDistrict("");
    setSelectedCurrency("TRY");
    setFuelTypes([]);
    setTransmissions([]);
    setVehicleStatuses([]);
    setBodyTypes([]);
    setMinHp("");
    setMaxHp("");
    setMinCc("");
    setMaxCc("");
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
  const togglePlateType = (val: string) => {
    setPlateTypes(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-200 tracking-tight">Araç İlanları</h1>
        <p className="text-sm text-slate-400 mt-1">TorqueScout AI onaylı varyantlar ve kapsamlı kronik detayları ile ikinci el ilanları.</p>
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

          {/* Motor Hacmi & Gücü */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motor Gücü (HP)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minHp}
                onChange={(e) => setMinHp(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none text-center"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxHp}
                onChange={(e) => setMaxHp(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none text-center"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motor Hacmi (cc)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minCc}
                onChange={(e) => setMinCc(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none text-center"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxCc}
                onChange={(e) => setMaxCc(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none text-center"
              />
            </div>
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

          {/* Renk */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Renk</label>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-300">
              {["Beyaz", "Siyah", "Gri", "Gümüş", "Kırmızı", "Mavi", "Sarı", "Yeşil"].map((col) => (
                <label key={col} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={colors.includes(col)}
                    onChange={() => toggleColor(col)}
                    className="accent-orange-500 rounded border-white/10"
                  />
                  <span>{col}</span>
                </label>
              ))}
            </div>
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

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition text-xs mt-3 shadow-lg shadow-orange-500/10"
          >
            Filtreleri Uygula (Ara)
          </button>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {listings.map((listing) => {
                const cover = listing.media && listing.media[0] ? listing.media[0].url : "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=60";
                return (
                  <a
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="group flex flex-col bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/5 transition duration-300"
                  >
                    <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, listing.id)}
                        className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full border flex items-center justify-center transition shadow-lg backdrop-blur-sm ${
                          listing.isFavorited
                            ? "bg-red-500/20 text-red-500 border-red-500/40"
                            : "bg-slate-950/80 text-slate-450 border-white/10 hover:text-white"
                        }`}
                        title={listing.isFavorited ? "Favorilerden Kaldır" : "Favoriye Ekle"}
                      >
                        {listing.isFavorited ? "❤️" : "🤍"}
                      </button>

                      <img
                        src={cover}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      {listing.isAiReady && (
                        <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-600/90 text-white backdrop-blur-sm border border-orange-500/30 shadow-md flex items-center gap-1">
                          ✨ AI Analizli
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex flex-col justify-between flex-1 gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {listing.modelYear} • {listing.city}
                        </span>
                        <h3 className="font-bold text-slate-200 text-sm line-clamp-1 group-hover:text-orange-400 transition mt-1">
                          {listing.title}
                        </h3>
                        <p className="text-slate-400 text-xs mt-1">
                          {listing.kilometers.toLocaleString('tr-TR')} km
                        </p>
                      </div>

                      <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                        <span className="font-black text-slate-100 text-sm">
                          {Number(listing.priceAmount).toLocaleString('tr-TR')} {listing.currency === "TRY" ? "TL" : listing.currency}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
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
