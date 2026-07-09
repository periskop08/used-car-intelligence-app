"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function Home() {
  const router = useRouter();

  // State
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedBodyType, setSelectedBodyType] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedEngine, setSelectedEngine] = useState("");
  const [selectedFuelType, setSelectedFuelType] = useState("");
  const [selectedTrim, setSelectedTrim] = useState("");
  const [selectedTransmission, setSelectedTransmission] = useState("");

  const [years, setYears] = useState<number[]>([]);
  const [engines, setEngines] = useState<string[]>([]);
  const [fuelTypes, setFuelTypes] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  const [transmissions, setTransmissions] = useState<string[]>([]);
  const [matchedVariantId, setMatchedVariantId] = useState<string | null>(null);

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [loadingFuels, setLoadingFuels] = useState(false);
  const [loadingTrims, setLoadingTrims] = useState(false);
  const [loadingTransmissions, setLoadingTransmissions] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);

  // Speedometer needle animation state (simulating acceleration)
  const [needleAngle, setNeedleAngle] = useState(-30);
  useEffect(() => {
    const interval = setInterval(() => {
      setNeedleAngle((prev) => (prev === -30 ? 60 : -30));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Featured Listings on Load
  useEffect(() => {
    setLoadingListings(true);
    fetch(`${API_URL}/listings?limit=4&sort=featured`)
      .then((res) => res.json())
      .then((data) => {
        setFeaturedListings(data.items && Array.isArray(data.items) ? data.items : []);
        setLoadingListings(false);
      })
      .catch(() => setLoadingListings(false));
  }, []);

  // Fetch Brands on Load
  useEffect(() => {
    setLoadingBrands(true);
    fetch(`${API_URL}/vehicles/brands`)
      .then((res) => res.json())
      .then((data) => {
        setBrands(Array.isArray(data) ? data : []);
        setLoadingBrands(false);
      })
      .catch(() => setLoadingBrands(false));
  }, []);

  // Fetch Models when Brand changes
  const handleBrandChange = (brandId: string) => {
    setSelectedBrand(brandId);
    setSelectedModel("");
    setSelectedBodyType("");
    setSelectedYear("");
    setSelectedEngine("");
    setSelectedFuelType("");
    setSelectedTrim("");
    setSelectedTransmission("");
    
    setModels([]);
    setYears([]);
    setEngines([]);
    setFuelTypes([]);
    setTrims([]);
    setTransmissions([]);
    setMatchedVariantId(null);

    if (!brandId) return;

    setLoadingModels(true);
    fetch(`${API_URL}/vehicles/models?brandId=${brandId}`)
      .then((res) => res.json())
      .then((data) => {
        setModels(Array.isArray(data) ? data : []);
        setLoadingModels(false);
      })
      .catch(() => setLoadingModels(false));
  };

  // Fetch Variants when Model changes
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setSelectedBodyType("");
    setSelectedYear("");
    setSelectedEngine("");
    setSelectedFuelType("");
    setSelectedTrim("");
    setSelectedTransmission("");

    setYears([]);
    setEngines([]);
    setFuelTypes([]);
    setTrims([]);
    setTransmissions([]);
    setMatchedVariantId(null);
  };

  // 1. Body Types Options
  const bodyTypes = [
    "SEDAN",
    "HATCHBACK",
    "SUV",
    "COUPE",
    "CONVERTIBLE",
    "WAGON",
    "MINIVAN",
    "VAN",
    "PICKUP"
  ];

  // Fetch Years when Brand, Model, or Body Type changes
  useEffect(() => {
    setYears([]);
    setSelectedYear("");
    if (!selectedBrand || !selectedModel || !selectedBodyType) return;
    
    const brandName = brands.find(b => b.id === selectedBrand)?.name;
    const modelName = models.find(m => m.id === selectedModel)?.name;
    if (!brandName || !modelName) return;
    
    setLoadingYears(true);
    fetch(`${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(brandName)}&model=${encodeURIComponent(modelName)}&body_type=${encodeURIComponent(selectedBodyType)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setYears(res.data.map((item: any) => parseInt(item.value)));
        }
        setLoadingYears(false);
      })
      .catch(() => setLoadingYears(false));
  }, [selectedBrand, selectedModel, selectedBodyType, brands, models]);

  // Fetch Engines when Year changes
  useEffect(() => {
    setEngines([]);
    setSelectedEngine("");
    if (!selectedBrand || !selectedModel || !selectedBodyType || !selectedYear) return;
    
    const brandName = brands.find(b => b.id === selectedBrand)?.name;
    const modelName = models.find(m => m.id === selectedModel)?.name;
    if (!brandName || !modelName) return;
    
    setLoadingEngines(true);
    fetch(`${API_URL}/vehicle-filters/engines?brand=${encodeURIComponent(brandName)}&model=${encodeURIComponent(modelName)}&body_type=${encodeURIComponent(selectedBodyType)}&year=${selectedYear}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setEngines(res.data.map((item: any) => item.value));
        }
        setLoadingEngines(false);
      })
      .catch(() => setLoadingEngines(false));
  }, [selectedYear, selectedBrand, selectedModel, selectedBodyType, brands, models]);

  // Fetch Fuel Types when Engine changes
  useEffect(() => {
    setFuelTypes([]);
    setSelectedFuelType("");
    if (!selectedBrand || !selectedModel || !selectedBodyType || !selectedYear || !selectedEngine) return;
    
    const brandName = brands.find(b => b.id === selectedBrand)?.name;
    const modelName = models.find(m => m.id === selectedModel)?.name;
    if (!brandName || !modelName) return;
    
    setLoadingFuels(true);
    fetch(`${API_URL}/vehicle-filters/fuel-types?brand=${encodeURIComponent(brandName)}&model=${encodeURIComponent(modelName)}&body_type=${encodeURIComponent(selectedBodyType)}&year=${selectedYear}&engine=${encodeURIComponent(selectedEngine)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setFuelTypes(res.data.map((item: any) => item.value));
        }
        setLoadingFuels(false);
      })
      .catch(() => setLoadingFuels(false));
  }, [selectedEngine, selectedBrand, selectedModel, selectedBodyType, selectedYear, brands, models]);

  // Fetch Trims (Donanım Paketleri) when Fuel Type changes
  useEffect(() => {
    setTrims([]);
    setSelectedTrim("");
    if (!selectedBrand || !selectedModel || !selectedBodyType || !selectedYear || !selectedEngine || !selectedFuelType) return;
    
    const brandName = brands.find(b => b.id === selectedBrand)?.name;
    const modelName = models.find(m => m.id === selectedModel)?.name;
    if (!brandName || !modelName) return;
    
    setLoadingTrims(true);
    fetch(`${API_URL}/vehicle-filters/trims?brand=${encodeURIComponent(brandName)}&model=${encodeURIComponent(modelName)}&body_type=${encodeURIComponent(selectedBodyType)}&year=${selectedYear}&engine=${encodeURIComponent(selectedEngine)}&fuel_type=${encodeURIComponent(selectedFuelType)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setTrims(res.data.map((item: any) => item.value));
        }
        setLoadingTrims(false);
      })
      .catch(() => setLoadingTrims(false));
  }, [selectedFuelType, selectedBrand, selectedModel, selectedBodyType, selectedYear, selectedEngine, brands, models]);

  // Fetch Transmissions when Trim changes
  useEffect(() => {
    setTransmissions([]);
    setSelectedTransmission("");
    if (!selectedBrand || !selectedModel || !selectedBodyType || !selectedYear || !selectedEngine || !selectedFuelType || !selectedTrim) return;
    
    const brandName = brands.find(b => b.id === selectedBrand)?.name;
    const modelName = models.find(m => m.id === selectedModel)?.name;
    if (!brandName || !modelName) return;
    
    setLoadingTransmissions(true);
    fetch(`${API_URL}/vehicle-filters/transmissions?brand=${encodeURIComponent(brandName)}&model=${encodeURIComponent(modelName)}&body_type=${encodeURIComponent(selectedBodyType)}&year=${selectedYear}&engine=${encodeURIComponent(selectedEngine)}&fuel_type=${encodeURIComponent(selectedFuelType)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setTransmissions(res.data.map((item: any) => item.value));
        }
        setLoadingTransmissions(false);
      })
      .catch(() => setLoadingTransmissions(false));
  }, [selectedTrim, selectedBrand, selectedModel, selectedBodyType, selectedYear, selectedEngine, selectedFuelType, brands, models]);

  // Match final Variant ID when all selections are complete
  useEffect(() => {
    setMatchedVariantId(null);
    if (
      !selectedBrand ||
      !selectedModel ||
      !selectedBodyType ||
      !selectedYear ||
      !selectedEngine ||
      !selectedFuelType ||
      !selectedTrim ||
      !selectedTransmission
    ) return;
    
    const brandName = brands.find(b => b.id === selectedBrand)?.name;
    const modelName = models.find(m => m.id === selectedModel)?.name;
    if (!brandName || !modelName) return;
    
    setLoadingMatch(true);
    fetch(`${API_URL}/vehicle-filters/match-variant?brand=${encodeURIComponent(brandName)}&model=${encodeURIComponent(modelName)}&body_type=${encodeURIComponent(selectedBodyType)}&year=${selectedYear}&engine=${encodeURIComponent(selectedEngine)}&fuel_type=${encodeURIComponent(selectedFuelType)}&trim=${encodeURIComponent(selectedTrim)}&transmission=${encodeURIComponent(selectedTransmission)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.variantId) {
          setMatchedVariantId(res.variantId);
        }
        setLoadingMatch(false);
      })
      .catch(() => setLoadingMatch(false));
  }, [selectedTransmission, selectedBrand, selectedModel, selectedBodyType, selectedYear, selectedEngine, selectedFuelType, selectedTrim, brands, models]);

  const handleInspect = () => {
    if (!matchedVariantId) return;
    router.push(`/vehicle/${matchedVariantId}`);
  };

  const displayFuelType = (fuel: string) => {
    switch (fuel) {
      case "PETROL": return "Benzin";
      case "DIESEL": return "Dizel";
      case "LPG": return "LPG";
      case "HYBRID": return "Hibrit";
      case "PLUG_IN_HYBRID": return "Plug-in Hibrit";
      case "ELECTRIC": return "Elektrik";
      default: return fuel || "Diğer";
    }
  };

  const displayBodyType = (body: string) => {
    switch (body) {
      case "SEDAN": return "Sedan";
      case "HATCHBACK": return "Hatchback";
      case "CONVERTIBLE": return "Cabrio";
      case "COUPE": return "Coupe";
      case "SUV": return "SUV";
      case "WAGON": return "Station Wagon";
      case "PICKUP": return "Pickup";
      case "VAN": return "Van";
      case "MINIVAN": return "Minivan";
      default: return body || "Diğer";
    }
  };

  return (
    <div className="flex flex-col items-center justify-start py-12 px-6 gap-16">
      {/* Hero Section */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 py-4">
        {/* Left Side: Speed Lines (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center justify-end flex-none w-48 opacity-80">
          <svg width="180" height="60" viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="left-lines-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#0062ff" stop-opacity="0" />
                <stop offset="50%" stop-color="#0062ff" stop-opacity="0.5" />
                <stop offset="100%" stop-color="#00f2fe" />
              </linearGradient>
            </defs>
            <rect x="0" y="10" width="220" height="6" rx="3" fill="url(#left-lines-grad)" />
            <rect x="40" y="26" width="180" height="6" rx="3" fill="url(#left-lines-grad)" />
            <rect x="120" y="42" width="100" height="6" rx="3" fill="url(#left-lines-grad)" />
          </svg>
        </div>

        {/* Center: Hero Text */}
        <div className="text-center flex-1 max-w-3xl flex flex-col items-center gap-2.5">
          <h1 className="text-xl md:text-[38px] font-black tracking-tight leading-tight text-white whitespace-nowrap">
            İlanı gör, aracı anla,{" "}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              doğru kararı ver.
            </span>
          </h1>
          <p className="text-slate-400 text-xs md:text-[18px] font-medium leading-relaxed max-w-2xl">
            Araçları tanıyın, karşılaştırın ve size uygun ilanları keşfedin.
          </p>
        </div>

        {/* Right Side: Emblem Logo Symbol (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center justify-start flex-none w-48">
          <svg width="150" height="150" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <defs>
              <linearGradient id="t-gradient-large" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#00f2fe" />
                <stop offset="100%" stop-color="#0062ff" />
              </linearGradient>
              <linearGradient id="lines-gradient-large" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#0062ff" stop-opacity="0.1" />
                <stop offset="100%" stop-color="#00f2fe" />
              </linearGradient>
              <linearGradient id="arc-gradient-large" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stop-color="#0062ff" stop-opacity="0.2" />
                <stop offset="100%" stop-color="#00d2ff" />
              </linearGradient>
            </defs>
            
            {/* Speed Lines */}
            <rect x="15" y="75" width="35" height="7" rx="3.5" fill="url(#lines-gradient-large)" />
            <rect x="5" y="95" width="50" height="7" rx="3.5" fill="url(#lines-gradient-large)" />
            <rect x="20" y="115" width="25" height="7" rx="3.5" fill="url(#lines-gradient-large)" />

            {/* Speedometer Arc */}
            <path d="M 125 155 A 60 60 0 0 0 175 75" stroke="url(#arc-gradient-large)" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 5" />
            <path d="M 115 165 A 72 72 0 0 0 182 68" stroke="url(#t-gradient-large)" stroke-width="5" stroke-linecap="round" opacity="0.8" />
            
            {/* Speedometer Needle */}
            <line 
              x1="145" 
              y1="115" 
              x2="180" 
              y2="115" 
              stroke="#00f2fe" 
              strokeWidth="4.5" 
              strokeLinecap="round"
              style={{
                transform: `rotate(${needleAngle}deg)`,
                transformOrigin: '145px 115px',
                transition: 'transform 1.8s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
            />
            <circle cx="145" cy="115" r="6" fill="#00f2fe" />

            {/* Slanted "T" */}
            <path d="M 68 55 L 152 55 L 144 75 L 112 75 L 87 165 L 62 165 L 87 75 L 57 75 Z" fill="url(#t-gradient-large)" />
          </svg>
        </div>
      </div>

      {/* Interactive Vehicle Selector */}
      <div className="w-full max-w-5xl glass p-8 rounded-3xl flex flex-col gap-6 shadow-2xl shadow-orange-500/5">
        <h2 className="text-xl font-extrabold text-slate-200 flex items-center gap-2">
          🚗 Hızlı Araç Sorgulama
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Brand Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marka</label>
            <select
              value={selectedBrand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={loadingBrands}
            >
              <option value="">Seçiniz...</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Model Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedBrand || loadingModels}
            >
              <option value="">Seçiniz...</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Body Type Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasa Tipi</label>
            <select
              value={selectedBodyType}
              onChange={(e) => {
                setSelectedBodyType(e.target.value);
                setSelectedYear("");
                setSelectedEngine("");
                setSelectedFuelType("");
                setSelectedTrim("");
                setSelectedTransmission("");
              }}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedModel}
            >
              <option value="">Seçiniz...</option>
              {bodyTypes.map((body) => (
                <option key={body} value={body}>
                  {displayBodyType(body)}
                </option>
              ))}
            </select>
          </div>

          {/* Year Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yıl</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedEngine("");
                setSelectedFuelType("");
                setSelectedTrim("");
                setSelectedTransmission("");
              }}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedBodyType || loadingYears || years.length === 0}
            >
              <option value="">{loadingYears ? "Yükleniyor..." : "Seçiniz..."}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Engine Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motor</label>
            <select
              value={selectedEngine}
              onChange={(e) => {
                setSelectedEngine(e.target.value);
                setSelectedFuelType("");
                setSelectedTrim("");
                setSelectedTransmission("");
              }}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedYear || loadingEngines || engines.length === 0}
            >
              <option value="">{loadingEngines ? "Yükleniyor..." : "Seçiniz..."}</option>
              {engines.map((eng) => (
                <option key={eng} value={eng}>
                  {eng}
                </option>
              ))}
            </select>
          </div>

          {/* Fuel Type Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yakıt Türü</label>
            <select
              value={selectedFuelType}
              onChange={(e) => {
                setSelectedFuelType(e.target.value);
                setSelectedTrim("");
                setSelectedTransmission("");
              }}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedEngine || loadingFuels || fuelTypes.length === 0}
            >
              <option value="">{loadingFuels ? "Yükleniyor..." : "Seçiniz..."}</option>
              {fuelTypes.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {displayFuelType(fuel)}
                </option>
              ))}
            </select>
          </div>

          {/* Trim Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Donanım Paketi</label>
            <select
              value={selectedTrim}
              onChange={(e) => {
                setSelectedTrim(e.target.value);
                setSelectedTransmission("");
              }}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedFuelType || loadingTrims || trims.length === 0}
            >
              <option value="">{loadingTrims ? "Yükleniyor..." : "Seçiniz..."}</option>
              {trims.map((trimName) => (
                <option key={trimName} value={trimName}>
                  {trimName}
                </option>
              ))}
            </select>
          </div>

          {/* Transmission Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Şanzıman Tipi</label>
            <select
              value={selectedTransmission}
              onChange={(e) => setSelectedTransmission(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedTrim || loadingTransmissions || transmissions.length === 0}
            >
              <option value="">{loadingTransmissions ? "Yükleniyor..." : "Seçiniz..."}</option>
              {transmissions.map((trans) => (
                <option key={trans} value={trans}>
                  {trans}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Action */}
        <button
          onClick={handleInspect}
          disabled={!matchedVariantId}
          className="w-full mt-4 bg-gradient-to-r from-orange-600 to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed hover:opacity-90 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/10 transition text-center"
        >
          Aracı İncele & AI Raporu Al
        </button>
      </div>

      {/* Nasıl Çalışır Section */}
      <div className="w-full max-w-5xl flex flex-col gap-8 items-center py-8 border-t border-white/5">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-200">TorqueScout Nasıl Çalışır?</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">İlanı gör, aracı anla, doğru kararı ver.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-4">
          <div className="flex flex-col items-center text-center p-6 bg-slate-950/20 border border-white/5 rounded-3xl">
            <span className="text-3xl">🔍</span>
            <h3 className="text-lg font-bold text-slate-200 mt-4">1. İlanları Listele & Araştır</h3>
            <p className="text-xs text-slate-400 mt-2">
              Sitedeki ilanları arayın ya da doğrudan marka-model girerek araçların kronik sorun veritabanını tarayın.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-slate-950/20 border border-white/5 rounded-3xl">
            <span className="text-3xl">🤖</span>
            <h3 className="text-lg font-bold text-slate-200 mt-4">2. AI Destekli Detayları Oku</h3>
            <p className="text-xs text-slate-400 mt-2">
              Araç varyantına bağlı recall (geri çağırma) kayıtlarını, kullanıcı şikayetlerini ve satıcıya özel kontrol checklistini anında inceleyin.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-slate-950/20 border border-white/5 rounded-3xl">
            <span className="text-3xl">🤝</span>
            <h3 className="text-lg font-bold text-slate-200 mt-4">3. Güvenle Satın Al</h3>
            <p className="text-xs text-slate-400 mt-2">
              Ekspertiz sırasında neleri kontrol etmeniz gerektiğini bilerek satıcıyla masaya tam donanımlı oturun.
            </p>
          </div>
        </div>
      </div>

      {/* Featured Listings Section */}
      {featuredListings.length > 0 && (
        <div className="w-full max-w-5xl flex flex-col gap-8 py-8 border-t border-white/5">
          <div className="text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-200">Öne Çıkan İlanlar</h2>
              <p className="text-sm text-slate-400 mt-1">Yapay zeka analizli ve ekspertiz kontrol noktaları hazır satılık araçlar.</p>
            </div>
            <a href="/listings" className="text-xs font-bold text-orange-500 hover:text-orange-400 transition flex items-center gap-1">
              Tüm İlanları Gör →
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
            {featuredListings.map((listing: any) => {
              const coverImg = listing.media && listing.media[0] ? listing.media[0].url : "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=60";
              return (
                <a
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="group flex flex-col bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/5 transition duration-300"
                >
                  <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                    <img
                      src={coverImg}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    {listing.isAiReady && (
                      <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-600/90 text-white backdrop-blur-sm border border-orange-500/30 flex items-center gap-1 shadow-lg shadow-orange-950/20">
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
                        {Number(listing.priceAmount).toLocaleString('tr-TR')} {listing.currency}
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
        </div>
      )}

      {/* Subscription Tiers Segment */}
      <div id="packages" className="w-full max-w-5xl flex flex-col gap-8 items-center py-8 border-t border-white/5">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-200">Abonelik Paketleri</h2>
          <p className="text-sm text-slate-400 mt-1">İhtiyacınıza uygun paketi seçerek yapay zeka ve ilan yayınlama sınırlarınızı yönetin.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-4">
          {/* Free Card */}
          <div className="border border-white/5 bg-slate-950/20 p-8 rounded-3xl flex flex-col justify-between gap-6">
            <div>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">FREE</span>
              <h3 className="text-xl font-bold text-slate-200 mt-2">Ücretsiz Başlangıç</h3>
              <p className="text-2xl font-black text-white mt-1">0 TL <span className="text-xs text-slate-500">/ ömür boyu</span></p>
              <p className="text-xs text-slate-400 mt-2">Temel kronik sorun ve tekil ilan yayınlama denemeleri için.</p>
              <div className="border-t border-white/5 my-4"></div>
              <ul className="text-xs text-slate-400 flex flex-col gap-2">
                <li>• Günlük 5 Yapay Zeka Mesaj Sınırı</li>
                <li>• Maksimum 1 Aktif İlan Yayını</li>
                <li>• 30 Gün İlan Yayın Süresi</li>
                <li>❌ Satıcı Soruları & Checklistler Kapalı</li>
              </ul>
            </div>
            <a href="/register" className="border border-white/10 text-center py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 transition">
              Ücretsiz Kaydol
            </a>
          </div>

          {/* Standard Card */}
          <div className="border border-orange-500/30 bg-orange-950/5 p-8 rounded-3xl flex flex-col justify-between gap-6 relative">
            <span className="absolute -top-3 right-6 text-[10px] bg-orange-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Popüler</span>
            <div>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-mono font-bold">STANDARD</span>
              <h3 className="text-xl font-bold text-slate-200 mt-2">Standart Paket</h3>
              <p className="text-2xl font-black text-white mt-1">349 TL <span className="text-xs text-slate-500">/ aylık</span></p>
              <p className="text-xs text-slate-400 mt-2">Araç satın alım veya satış aşamasında olan aktif kullanıcılar için ideal.</p>
              <div className="border-t border-orange-500/10 my-4"></div>
              <ul className="text-xs text-slate-400 flex flex-col gap-2">
                <li className="text-slate-300">• Günlük 10 Yapay Zeka Mesaj Hakkı</li>
                <li className="text-slate-300">• Maksimum 10 Aktif İlan Yayını</li>
                <li className="text-slate-300">• 30 Gün İlan Yayın Süresi</li>
                <li className="text-slate-300">• Satıcı Soruları & Checklistler Açık</li>
              </ul>
            </div>
            <a href="/register?tier=STANDARD" className="bg-orange-600 text-center py-2.5 rounded-xl text-xs font-bold text-white hover:bg-orange-500 transition">
              Standart Paket Satın Al
            </a>
          </div>

          {/* Premium Card */}
          <div className="border border-white/5 bg-slate-950/20 p-8 rounded-3xl flex flex-col justify-between gap-6">
            <div>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">PREMIUM</span>
              <h3 className="text-xl font-bold text-slate-200 mt-2">Premium Paket</h3>
              <p className="text-2xl font-black text-white mt-1">899 TL <span className="text-xs text-slate-500">/ aylık</span></p>
              <p className="text-xs text-slate-400 mt-2">Galeri, ekspertiz firmaları ve otomotiv profesyonelleri için.</p>
              <div className="border-t border-white/5 my-4"></div>
              <ul className="text-xs text-slate-400 flex flex-col gap-2">
                <li>• Günlük 100 Yapay Zeka Mesaj Hakkı</li>
                <li>• Maksimum 50 Aktif İlan Yayını</li>
                <li>• 45 Gün İlan Yayın Süresi</li>
                <li>• Satıcı Soruları & Tüm Checklistler Açık</li>
              </ul>
            </div>
            <a href="/register?tier=PREMIUM" className="border border-white/10 text-center py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 transition">
              Premium Paket Satın Al
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
