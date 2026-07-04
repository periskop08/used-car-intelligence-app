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

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // AI Search states (structured)
  const [aiBrand, setAiBrand] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiYear, setAiYear] = useState("2018");
  const [aiBodyType, setAiBodyType] = useState("HATCHBACK");
  const [aiTransmission, setAiTransmission] = useState("Otomatik");
  const [aiEngine, setAiEngine] = useState("");
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");



  // Fetch Brands on Load
  useEffect(() => {
    setLoadingBrands(true);
    fetch(`${API_URL}/vehicles/brands`)
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
    fetch(`${API_URL}/vehicles/models?brandId=${brandId}`)
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
    fetch(`${API_URL}/vehicles/variants?modelId=${modelId}`)
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

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiBrand.trim() || !aiModel.trim() || !aiEngine.trim()) {
      setErrorMsg("Lütfen Marka, Model ve Motor alanlarını doldurun.");
      return;
    }

    setGenerating(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_URL}/vehicles/ai-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand: aiBrand,
          model: aiModel,
          year: Number(aiYear),
          bodyType: aiBodyType,
          transmission: aiTransmission,
          engine: aiEngine,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Araç oluşturulurken bir hata oluştu.");
      }

      const data = await res.json();
      router.push(`/vehicle/${data.variantId}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Araç oluşturulamadı. Lütfen girilen verileri kontrol edin.");
    } finally {
      setGenerating(false);
    }
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

        {/* Divider */}
        <div className="flex items-center gap-4 my-2">
          <div className="h-[1px] bg-white/10 flex-1"></div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Veya Yapay Zeka Arama</span>
          <div className="h-[1px] bg-white/10 flex-1"></div>
        </div>

        {/* Global AI Search Input */}
        <form onSubmit={handleAiGenerate} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Brand Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marka</label>
              <input
                type="text"
                value={aiBrand}
                onChange={e => setAiBrand(e.target.value)}
                placeholder="Örn: Peugeot"
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                disabled={generating}
                required
              />
            </div>

            {/* Model Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model</label>
              <input
                type="text"
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                placeholder="Örn: 307"
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                disabled={generating}
                required
              />
            </div>

            {/* Year Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yıl</label>
              <select
                value={aiYear}
                onChange={e => setAiYear(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                disabled={generating}
              >
                {Array.from({ length: 30 }, (_, i) => 2026 - i).map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Body Type Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasa Tipi</label>
              <select
                value={aiBodyType}
                onChange={e => setAiBodyType(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                disabled={generating}
              >
                <option value="HATCHBACK">Hatchback</option>
                <option value="SEDAN">Sedan</option>
                <option value="SUV">SUV / Crossover</option>
                <option value="COUPE">Coupe</option>
                <option value="CABRIOLET">Cabriolet</option>
                <option value="WAGON">Station Wagon</option>
                <option value="MINIVAN">Minivan</option>
                <option value="OTHER">Diğer</option>
              </select>
            </div>

            {/* Transmission Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Şanzıman</label>
              <select
                value={aiTransmission}
                onChange={e => setAiTransmission(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                disabled={generating}
              >
                <option value="Otomatik">Otomatik (Tork Konvertörlü)</option>
                <option value="Manuel">Manuel</option>
                <option value="DSG">DSG / Çift Kavrama DCT</option>
                <option value="CVT">CVT</option>
                <option value="S Tronic">S Tronic</option>
                <option value="EDC">EDC</option>
              </select>
            </div>

            {/* Engine Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motor / Yakıt</label>
              <input
                type="text"
                value={aiEngine}
                onChange={e => setAiEngine(e.target.value)}
                placeholder="Örn: 1.6 Benzin, 2.0 TDI Dizel, 1.8 Hibrit"
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                disabled={generating}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/10 transition text-center"
          >
            {generating ? "Yapay Zeka Aracı Analiz Ediyor & Oluşturuyor..." : "Yapay Zeka ile Aracı Analiz Et & Kaydet"}
          </button>

          {errorMsg && <p className="text-xs font-semibold text-rose-500 text-center">{errorMsg}</p>}
          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            * İstediğiniz herhangi bir dünya modelini yapılandırın. Sistem bunu global veritabanından dinamik olarak üretip sisteme kaydedecektir.
          </p>
        </form>
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
