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
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedEngine, setSelectedEngine] = useState("");
  const [selectedFuelType, setSelectedFuelType] = useState("");
  const [selectedTrim, setSelectedTrim] = useState("");
  const [selectedTransmission, setSelectedTransmission] = useState("");

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);

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
    setSelectedYear("");
    setSelectedEngine("");
    setSelectedFuelType("");
    setSelectedTrim("");
    setSelectedTransmission("");
    setModels([]);
    setVariants([]);

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
    setSelectedYear("");
    setSelectedEngine("");
    setSelectedFuelType("");
    setSelectedTrim("");
    setSelectedTransmission("");
    setVariants([]);

    if (!modelId) return;

    setLoadingVariants(true);
    fetch(`${API_URL}/vehicles/variants?modelId=${modelId}`)
      .then((res) => res.json())
      .then((data) => {
        setVariants(Array.isArray(data) ? data : []);
        setLoadingVariants(false);
      })
      .catch(() => setLoadingVariants(false));
  };

  // 1. Years Options
  const years = React.useMemo(() => {
    if (!variants.length) return [];
    const uniqueYears = Array.from(new Set(variants.map((v) => v.year)));
    return uniqueYears.sort((a, b) => b - a);
  }, [variants]);

  // 2. Engines Options
  const engines = React.useMemo(() => {
    if (!selectedYear) return [];
    const filtered = variants.filter((v) => v.year === parseInt(selectedYear, 10));
    const uniqueEngines = Array.from(new Set(filtered.map((v) => v.engine?.code).filter(Boolean)));
    return uniqueEngines.sort();
  }, [variants, selectedYear]);

  // 3. Fuel Types Options
  const fuelTypes = React.useMemo(() => {
    if (!selectedYear || !selectedEngine) return [];
    const filtered = variants.filter(
      (v) => v.year === parseInt(selectedYear, 10) && v.engine?.code === selectedEngine
    );
    const uniqueFuels = Array.from(new Set(filtered.map((v) => v.fuelType).filter(Boolean)));
    return uniqueFuels.sort();
  }, [variants, selectedYear, selectedEngine]);

  // 4. Trims (Donanım Paketi) Options
  const trims = React.useMemo(() => {
    if (!selectedYear || !selectedEngine || !selectedFuelType) return [];
    const filtered = variants.filter(
      (v) =>
        v.year === parseInt(selectedYear, 10) &&
        v.engine?.code === selectedEngine &&
        v.fuelType === selectedFuelType
    );
    const uniqueTrims = Array.from(new Set(filtered.map((v) => v.trim?.name).filter(Boolean)));
    return uniqueTrims.sort();
  }, [variants, selectedYear, selectedEngine, selectedFuelType]);

  // 5. Transmissions Options
  const transmissions = React.useMemo(() => {
    if (!selectedYear || !selectedEngine || !selectedFuelType || !selectedTrim) return [];
    const filtered = variants.filter(
      (v) =>
        v.year === parseInt(selectedYear, 10) &&
        v.engine?.code === selectedEngine &&
        v.fuelType === selectedFuelType &&
        v.trim?.name === selectedTrim
    );
    const uniqueTrans = Array.from(new Set(filtered.map((v) => v.transmission?.name).filter(Boolean)));
    return uniqueTrans.sort();
  }, [variants, selectedYear, selectedEngine, selectedFuelType, selectedTrim]);

  // Auto-selection micro-interactions
  useEffect(() => {
    if (years.length === 1 && !selectedYear) {
      setSelectedYear(years[0].toString());
    }
  }, [years, selectedYear]);

  useEffect(() => {
    if (engines.length === 1 && !selectedEngine) {
      setSelectedEngine(engines[0]);
    }
  }, [engines, selectedEngine]);

  useEffect(() => {
    if (fuelTypes.length === 1 && !selectedFuelType) {
      setSelectedFuelType(fuelTypes[0]);
    }
  }, [fuelTypes, selectedFuelType]);

  useEffect(() => {
    if (trims.length === 1 && !selectedTrim) {
      setSelectedTrim(trims[0]);
    }
  }, [trims, selectedTrim]);

  useEffect(() => {
    if (transmissions.length === 1 && !selectedTransmission) {
      setSelectedTransmission(transmissions[0]);
    }
  }, [transmissions, selectedTransmission]);

  // Matched Variant ID
  const matchedVariantId = React.useMemo(() => {
    if (!selectedYear || !selectedEngine || !selectedFuelType || !selectedTrim || !selectedTransmission) return null;
    const found = variants.find(
      (v) =>
        v.year === parseInt(selectedYear, 10) &&
        v.engine?.code === selectedEngine &&
        v.fuelType === selectedFuelType &&
        v.trim?.name === selectedTrim &&
        v.transmission?.name === selectedTransmission
    );
    return found ? found.id : null;
  }, [variants, selectedYear, selectedEngine, selectedFuelType, selectedTrim, selectedTransmission]);

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

  return (
    <div className="flex flex-col items-center justify-start py-12 px-6 gap-16">
      {/* Hero Section */}
      <div className="text-center max-w-3xl flex flex-col items-center gap-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-slate-100">
          İkinci El Araçta Doğru Bilgiye ve{" "}
          <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
            İlanlara
          </span>{" "}
          Tek Yerden Ulaşın
        </h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium mt-2 leading-relaxed italic">
          "İlanı gör, aracı anla, doğru kararı ver."
        </p>
        <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
          TorqueScout ile sadece ilanları listelemekle kalmaz, ilgilendiğiniz her aracın kronik arızalarını, geri çağırma kayıtlarını ve AI destekli ekspertiz kontrol noktalarını tek ekranda incelersiniz.
        </p>
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
              disabled={!selectedModel || loadingVariants || years.length === 0}
            >
              <option value="">Seçiniz...</option>
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
              disabled={!selectedYear || engines.length === 0}
            >
              <option value="">Seçiniz...</option>
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
              disabled={!selectedEngine || fuelTypes.length === 0}
            >
              <option value="">Seçiniz...</option>
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
              disabled={!selectedFuelType || trims.length === 0}
            >
              <option value="">Seçiniz...</option>
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
              disabled={!selectedTrim || transmissions.length === 0}
            >
              <option value="">Seçiniz...</option>
              {transmissions.map((trans) => (
                <option key={trans} value={trans}>
                  {trans}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button aligned in the 4th column */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleInspect}
              disabled={!matchedVariantId}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed hover:opacity-90 text-white font-bold py-3.5 rounded-xl shadow-xl shadow-orange-500/10 transition text-center text-sm"
            >
              Aracı İncele & AI Raporu Al
            </button>
          </div>
        </div>
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
