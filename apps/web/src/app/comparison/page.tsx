"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ComparisonPage() {
  const router = useRouter();

  // Brands list
  const [brands, setBrands] = useState<any[]>([]);

  // Vehicle 1 Selection states
  const [models1, setModels1] = useState<any[]>([]);
  const [variants1, setVariants1] = useState<any[]>([]);
  const [selectedBrand1, setSelectedBrand1] = useState("");
  const [selectedModel1, setSelectedModel1] = useState("");
  const [selectedVariant1, setSelectedVariant1] = useState("");
  const [loadingModels1, setLoadingModels1] = useState(false);
  const [loadingVariants1, setLoadingVariants1] = useState(false);

  // Vehicle 2 Selection states
  const [models2, setModels2] = useState<any[]>([]);
  const [variants2, setVariants2] = useState<any[]>([]);
  const [selectedBrand2, setSelectedBrand2] = useState("");
  const [selectedModel2, setSelectedModel2] = useState("");
  const [selectedVariant2, setSelectedVariant2] = useState("");
  const [loadingModels2, setLoadingModels2] = useState(false);
  const [loadingVariants2, setLoadingVariants2] = useState(false);

  // Result comparison state
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch brands on load
  useEffect(() => {
    fetch("http://localhost:3000/vehicles/brands")
      .then(res => res.json())
      .then(data => {
        setBrands(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  // Handle Brand 1 change
  const handleBrand1Change = (brandId: string) => {
    setSelectedBrand1(brandId);
    setSelectedModel1("");
    setSelectedVariant1("");
    setModels1([]);
    setVariants1([]);

    if (!brandId) return;
    setLoadingModels1(true);
    fetch(`http://localhost:3000/vehicles/models?brandId=${brandId}`)
      .then(res => res.json())
      .then(data => {
        setModels1(Array.isArray(data) ? data : []);
        setLoadingModels1(false);
      })
      .catch(() => setLoadingModels1(false));
  };

  // Handle Model 1 change
  const handleModel1Change = (modelId: string) => {
    setSelectedModel1(modelId);
    setSelectedVariant1("");
    setVariants1([]);

    if (!modelId) return;
    setLoadingVariants1(true);
    fetch(`http://localhost:3000/vehicles/variants?modelId=${modelId}`)
      .then(res => res.json())
      .then(data => {
        setVariants1(Array.isArray(data) ? data : []);
        setLoadingVariants1(false);
      })
      .catch(() => setLoadingVariants1(false));
  };

  // Handle Brand 2 change
  const handleBrand2Change = (brandId: string) => {
    setSelectedBrand2(brandId);
    setSelectedModel2("");
    setSelectedVariant2("");
    setModels2([]);
    setVariants2([]);

    if (!brandId) return;
    setLoadingModels2(true);
    fetch(`http://localhost:3000/vehicles/models?brandId=${brandId}`)
      .then(res => res.json())
      .then(data => {
        setModels2(Array.isArray(data) ? data : []);
        setLoadingModels2(false);
      })
      .catch(() => setLoadingModels2(false));
  };

  // Handle Model 2 change
  const handleModel2Change = (modelId: string) => {
    setSelectedModel2(modelId);
    setSelectedVariant2("");
    setVariants2([]);

    if (!modelId) return;
    setLoadingVariants2(true);
    fetch(`http://localhost:3000/vehicles/variants?modelId=${modelId}`)
      .then(res => res.json())
      .then(data => {
        setVariants2(Array.isArray(data) ? data : []);
        setLoadingVariants2(false);
      })
      .catch(() => setLoadingVariants2(false));
  };

  // Submit Compare API
  const handleCompare = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");
    setComparisonResult(null);

    fetch("http://localhost:3000/comparisons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        variant1Id: selectedVariant1,
        variant2Id: selectedVariant2,
      }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Karşılaştırma başarısız.");
          });
        }
        return res.json();
      })
      .then(data => {
        setComparisonResult(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    <div className="max-w-6xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
          ⚖️ Araç Karşılaştırma
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          İki farklı aracı yan yana getirerek teknik özelliklerini ve kronik risk seviyelerini analiz edin.
        </p>
      </div>

      {/* Selectors grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Vehicle 1 Selector */}
        <div className="glass p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-orange-500">1. Araç Seçimi</h2>
          <div className="flex flex-col gap-3">
            <select
              value={selectedBrand1}
              onChange={e => handleBrand1Change(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">Marka Seçiniz...</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={selectedModel1}
              onChange={e => handleModel1Change(e.target.value)}
              disabled={!selectedBrand1 || loadingModels1}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">Model Seçiniz...</option>
              {models1.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <select
              value={selectedVariant1}
              onChange={e => setSelectedVariant1(e.target.value)}
              disabled={!selectedModel1 || loadingVariants1}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">Varyant Seçiniz...</option>
              {variants1.map(v => (
                <option key={v.id} value={v.id}>{v.year} - {v.engine.code} ({v.trim.name})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicle 2 Selector */}
        <div className="glass p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-orange-500">2. Araç Seçimi</h2>
          <div className="flex flex-col gap-3">
            <select
              value={selectedBrand2}
              onChange={e => handleBrand2Change(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">Marka Seçiniz...</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={selectedModel2}
              onChange={e => handleModel2Change(e.target.value)}
              disabled={!selectedBrand2 || loadingModels2}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">Model Seçiniz...</option>
              {models2.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <select
              value={selectedVariant2}
              onChange={e => setSelectedVariant2(e.target.value)}
              disabled={!selectedModel2 || loadingVariants2}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">Varyant Seçiniz...</option>
              {variants2.map(v => (
                <option key={v.id} value={v.id}>{v.year} - {v.engine.code} ({v.trim.name})</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Compare action button */}
      <button
        onClick={handleCompare}
        disabled={!selectedVariant1 || !selectedVariant2 || loading}
        className="w-full bg-gradient-to-r from-orange-600 to-amber-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl transition text-center text-sm"
      >
        {loading ? "Karşılaştırılıyor..." : "Seçili Araçları Karşılaştır"}
      </button>

      {/* Error alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-2xl font-semibold text-center">
          ⚠️ {error}
        </div>
      )}

      {/* Side by side result display */}
      {comparisonResult && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6 shadow-2xl">
          <h2 className="text-xl font-extrabold text-slate-200 border-b border-white/5 pb-3">📊 Karşılaştırma Sonuçları</h2>
          
          <div className="grid grid-cols-3 gap-4 text-center items-center mt-2">
            
            {/* Header titles */}
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider text-left">Parametre</div>
            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl font-bold text-sm text-orange-400">
              {comparisonResult.vehicle1.name}
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl font-bold text-sm text-blue-400">
              {comparisonResult.vehicle2.name}
            </div>

            {/* Spec lines */}
            <div className="text-slate-400 text-xs font-semibold text-left">Motor Seçeneği</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle1.engine}</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle2.engine}</div>

            <div className="text-slate-400 text-xs font-semibold text-left">Şanzıman Tipi</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle1.transmission}</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle2.transmission}</div>

            <div className="text-slate-400 text-xs font-semibold text-left">Donanım Paketi</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle1.trim}</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle2.trim}</div>

            {/* Specs compare */}
            {Object.keys(comparisonResult.specComparison).map((key) => {
              const spec = comparisonResult.specComparison[key];
              return (
                <React.Fragment key={key}>
                  <div className="text-slate-400 text-xs font-semibold text-left">{spec.label}</div>
                  <div className="text-xs text-slate-200 font-bold">{spec.v1}</div>
                  <div className="text-xs text-slate-200 font-bold">{spec.v2}</div>
                </React.Fragment>
              );
            })}

            {/* Problems compared */}
            <div className="text-slate-400 text-xs font-semibold text-left">Onaylı Kronik Hatalar</div>
            <div className="text-xs text-red-400 font-bold">{comparisonResult.vehicle1.problemsCount} Adet</div>
            <div className="text-xs text-red-400 font-bold">{comparisonResult.vehicle2.problemsCount} Adet</div>

          </div>
        </div>
      )}

    </div>
  );
}
