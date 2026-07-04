"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  // State
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Fetch Brands on Load
  useEffect(() => {
    setLoadingBrands(true);
    fetch("http://localhost:3000/vehicles/brands")
      .then(res => res.json())
      .then(data => {
        setBrands(Array.isArray(data) ? data : []);
        setLoadingBrands(false);
      })
      .catch(() => setLoadingBrands(false));
  }, []);

  // Fetch Models when Brand changes
  const handleBrandChange = (brandId: string) => {
    setSelectedBrand(brandId);
    setSelectedModel("");
    setSelectedVariant("");
    setModels([]);
    setVariants([]);

    if (!brandId) return;

    setLoadingModels(true);
    fetch(`http://localhost:3000/vehicles/models?brandId=${brandId}`)
      .then(res => res.json())
      .then(data => {
        setModels(Array.isArray(data) ? data : []);
        setLoadingModels(false);
      })
      .catch(() => setLoadingModels(false));
  };

  // Fetch Variants when Model changes
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setSelectedVariant("");
    setVariants([]);

    if (!modelId) return;

    setLoadingVariants(true);
    fetch(`http://localhost:3000/vehicles/variants?modelId=${modelId}`)
      .then(res => res.json())
      .then(data => {
        setVariants(Array.isArray(data) ? data : []);
        setLoadingVariants(false);
      })
      .catch(() => setLoadingVariants(false));
  };

  const handleInspect = () => {
    if (!selectedVariant) return;
    router.push(`/vehicle/${selectedVariant}`);
  };

  return (
    <div className="flex flex-col items-center justify-start py-12 px-6 gap-16">
      {/* Hero Section */}
      <div className="text-center max-w-3xl flex flex-col items-center gap-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
          İkinci El Alacağın Aracın{" "}
          <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
            Tüm Sırlarını
          </span>{" "}
          Öğrenin
        </h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium mt-2 leading-relaxed">
          Almak istediğiniz aracın kronik arızalarını, geri çağırma kayıtlarını ve alınabilirlik puanını yapay zeka desteğiyle saniyeler içinde analiz edin.
        </p>
      </div>

      {/* Interactive Vehicle Selector */}
      <div className="w-full max-w-4xl glass p-8 rounded-3xl flex flex-col gap-6 shadow-2xl shadow-orange-500/5">
        <h2 className="text-xl font-extrabold text-slate-200 flex items-center gap-2">
          🚗 Hızlı Araç Sorgulama
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Brand Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marka</label>
            <select
              value={selectedBrand}
              onChange={e => handleBrandChange(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={loadingBrands}
            >
              <option value="">Seçiniz...</option>
              {brands.map(b => (
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
              onChange={e => handleModelChange(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedBrand || loadingModels}
            >
              <option value="">Seçiniz...</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Variant Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Varyant (Yıl/Motor/Şanzıman)</label>
            <select
              value={selectedVariant}
              onChange={e => setSelectedVariant(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedModel || loadingVariants}
            >
              <option value="">Seçiniz...</option>
              {variants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.year} - {v.engine.code} - {v.transmission.name} ({v.trim.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Action */}
        <button
          onClick={handleInspect}
          disabled={!selectedVariant}
          className="w-full mt-4 bg-gradient-to-r from-orange-600 to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed hover:opacity-90 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/10 transition text-center"
        >
          Aracı İncele & AI Raporu Al
        </button>
      </div>

      {/* Subscription Tiers Segment */}
      <div id="packages" className="w-full max-w-5xl flex flex-col gap-8 items-center py-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-200">Abonelik Paketleri</h2>
          <p className="text-sm text-slate-400 mt-1">İhtiyacınıza uygun paketi seçerek yapay zeka limitlerinizi artırın.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-4">
          {/* Free Card */}
          <div className="border border-white/5 bg-slate-950/20 p-8 rounded-3xl flex flex-col justify-between gap-6">
            <div>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">FREE</span>
              <h3 className="text-xl font-bold text-slate-200 mt-2">Ücretsiz Başlangıç</h3>
              <p className="text-2xl font-black text-white mt-1">0 TL <span className="text-xs text-slate-500">/ ömür boyu</span></p>
              <p className="text-xs text-slate-400 mt-2">Temel kronik sorun ve araç kataloğu incelemesi için.</p>
              <div className="border-t border-white/5 my-4"></div>
              <ul className="text-xs text-slate-400 flex flex-col gap-2">
                <li>• Günlük 5 Yapay Zeka Mesaj Sınırı</li>
                <li>• Toplam 1 Karşılaştırma Hakkı</li>
                <li>❌ Satıcı Soruları Kapalı</li>
                <li>❌ Ekspertiz Kontrol Listesi Kapalı</li>
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
              <p className="text-xs text-slate-400 mt-2">Araç satın alım aşamasında olan aktif alıcılar için ideal.</p>
              <div className="border-t border-orange-500/10 my-4"></div>
              <ul className="text-xs text-slate-400 flex flex-col gap-2">
                <li className="text-slate-300">• Günlük 10 Yapay Zeka Mesaj Hakkı</li>
                <li className="text-slate-300">• Aylık 10 Karşılaştırma Hakkı</li>
                <li className="text-slate-300">• 20 Adet Favori Listesi Sınırı</li>
                <li className="text-slate-300">• Satıcı Soruları & Checklistler Açık</li>
              </ul>
            </div>
            <a href="/register?tier=STANDARD" className="bg-orange-600 text-center py-2.5 rounded-xl text-xs font-bold text-white hover:bg-orange-500 transition">
              Standart Paket Satın Al
            </a>
          </div>

          {/* Pro Card */}
          <div className="border border-white/5 bg-slate-950/20 p-8 rounded-3xl flex flex-col justify-between gap-6">
            <div>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">PRO</span>
              <h3 className="text-xl font-bold text-slate-200 mt-2">Profesyonel Paket</h3>
              <p className="text-2xl font-black text-white mt-1">899 TL <span className="text-xs text-slate-500">/ aylık</span></p>
              <p className="text-xs text-slate-400 mt-2">Galeri, ekspertiz firmaları ve otomotiv profesyonelleri için.</p>
              <div className="border-t border-white/5 my-4"></div>
              <ul className="text-xs text-slate-400 flex flex-col gap-2">
                <li>• Günlük 100 Yapay Zeka Mesaj Hakkı</li>
                <li>• Sınırsız Karşılaştırma</li>
                <li>• Sınırsız Favori Listesi</li>
                <li>• Satıcı Soruları & Tüm Checklistler Açık</li>
              </ul>
            </div>
            <a href="/register?tier=PRO" className="border border-white/10 text-center py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 transition">
              Pro Paket Satın Al
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
