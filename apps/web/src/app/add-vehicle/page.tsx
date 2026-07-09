"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const BODY_TYPES = [
  { label: "Sedan", value: "Sedan" },
  { label: "Hatchback", value: "Hatchback" },
  { label: "SUV", value: "SUV" },
  { label: "Coupe", value: "Coupe" },
  { label: "Cabrio", value: "Cabrio" },
  { label: "Station Wagon", value: "Station Wagon" },
  { label: "Minivan", value: "Minivan" },
  { label: "Van", value: "Van" },
  { label: "Pick-up", value: "Pick-up" }
];

const FUEL_TYPES = [
  { label: "Benzin", value: "Benzin" },
  { label: "Dizel", value: "Dizel" },
  { label: "Hibrit", value: "Hibrit" },
  { label: "Elektrik", value: "Elektrik" },
  { label: "LPG & Benzin", value: "LPG" }
];

const TRANSMISSIONS = [
  { label: "Manuel", value: "Manuel" },
  { label: "Otomatik", value: "Otomatik" },
  { label: "Yarı Otomatik", value: "Yarı Otomatik" }
];

export default function AddVehiclePage() {
  const router = useRouter();

  // Authentication
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Form selections
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [years, setYears] = useState<number[]>([]);

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedBodyType, setSelectedBodyType] = useState("");
  const [engineInput, setEngineInput] = useState("");
  const [selectedFuelType, setSelectedFuelType] = useState("");
  const [trimInput, setTrimInput] = useState("");
  const [selectedTransmission, setSelectedTransmission] = useState("");

  // UI States
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Confirmation view state
  const [isConfirming, setIsConfirming] = useState(false);

  // Check auth and fetch initial data
  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    if (!savedToken) {
      router.push("/login?redirect=/add-vehicle");
      return;
    }
    setToken(savedToken);
    setAuthLoading(false);

    // Populate years (2000 to current year 2026)
    const yearList = [];
    for (let yr = 2026; yr >= 2000; yr--) {
      yearList.push(yr);
    }
    setYears(yearList);

    // Fetch Brands
    setLoadingBrands(true);
    fetch(`${API_URL}/vehicles/brands`)
      .then((res) => res.json())
      .then((data) => {
        setBrands(Array.isArray(data) ? data : []);
        setLoadingBrands(false);
      })
      .catch(() => {
        setErrorMsg("Markalar yüklenemedi.");
        setLoadingBrands(false);
      });
  }, []);

  // Fetch models when brand changes
  const handleBrandChange = (brandId: string) => {
    setSelectedBrand(brandId);
    setSelectedModel("");
    setModels([]);

    if (!brandId) return;

    setLoadingModels(true);
    fetch(`${API_URL}/vehicles/models?brandId=${brandId}`)
      .then((res) => res.json())
      .then((data) => {
        setModels(Array.isArray(data) ? data : []);
        setLoadingModels(false);
      })
      .catch(() => {
        setLoadingModels(false);
      });
  };

  // Step 1: Pre-validation & enter confirmation mode
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (
      !selectedBrand ||
      !selectedModel ||
      !selectedYear ||
      !selectedBodyType ||
      !engineInput.trim() ||
      !selectedFuelType ||
      !trimInput.trim() ||
      !selectedTransmission
    ) {
      setErrorMsg("Lütfen tüm alanları doldurunuz.");
      return;
    }

    setIsConfirming(true);
  };

  // Step 2: Final API submission
  const handleFinalSubmit = () => {
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    fetch(`${API_URL}/vehicles/suggest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        brandId: selectedBrand,
        modelId: selectedModel,
        bodyType: selectedBodyType,
        engine: engineInput.trim(),
        fuelType: selectedFuelType,
        trimName: trimInput.trim(),
        transmission: selectedTransmission,
        year: Number(selectedYear)
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Talebiniz gönderilemedi.");
        }
        return data;
      })
      .then((data) => {
        setSuccessMsg(data.message || "Araç başarıyla ekleme talebi olarak admin onayına gönderildi!");
        setIsConfirming(false);
        // Reset form
        setSelectedBrand("");
        setSelectedModel("");
        setSelectedYear("");
        setSelectedBodyType("");
        setEngineInput("");
        setSelectedFuelType("");
        setTrimInput("");
        setSelectedTransmission("");
      })
      .catch((err) => {
        setErrorMsg(err.message || "Bir hata oluştu.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <span className="animate-spin text-4xl">⏳</span>
        <span className="text-slate-400 font-bold text-base">Oturum doğrulanıyor...</span>
      </div>
    );
  }

  // Confirmation mode view
  if (isConfirming) {
    const brandName = brands.find((b) => b.id === selectedBrand)?.name || "";
    const modelName = models.find((m) => m.id === selectedModel)?.name || "";
    const bodyTypeLabel = BODY_TYPES.find((b) => b.value === selectedBodyType)?.label || selectedBodyType;
    const fuelTypeLabel = FUEL_TYPES.find((f) => f.value === selectedFuelType)?.label || selectedFuelType;
    const transmissionLabel = TRANSMISSIONS.find((t) => t.value === selectedTransmission)?.label || selectedTransmission;

    return (
      <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8 animate-in fade-in duration-200">
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center justify-center gap-2">
            📋 Talebinizi Kontrol Edin
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Araç ekleme önerinizi göndermeden önce bilgilerin doğruluğundan emin olun.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs font-bold leading-relaxed">
            🛑 {errorMsg}
          </div>
        )}

        <div className="glass p-8 rounded-3xl flex flex-col gap-6 shadow-2xl">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl text-xs font-semibold leading-relaxed">
            💡 Araç bilgileriniz aşağıdaki şekilde kaydedilecektir. Bir hata fark ederseniz "Düzenle" butonuna tıklayarak düzeltebilirsiniz.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-white/5 pb-6 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marka</span>
              <span className="text-slate-200 font-semibold text-base">{brandName}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model</span>
              <span className="text-slate-200 font-semibold text-base">{modelName}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model Yılı</span>
              <span className="text-slate-200 font-semibold text-base">{selectedYear}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kasa Tipi</span>
              <span className="text-slate-200 font-semibold text-base">{bodyTypeLabel}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Motor Özelliği</span>
              <span className="text-slate-200 font-semibold text-base">{engineInput}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Yakıt Türü</span>
              <span className="text-slate-200 font-semibold text-base">{fuelTypeLabel}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Donanım Paketi</span>
              <span className="text-slate-200 font-semibold text-base">{trimInput}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Şanzıman Türü</span>
              <span className="text-slate-200 font-semibold text-base">{transmissionLabel}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold py-3.5 rounded-xl transition text-sm cursor-pointer"
              disabled={submitting}
            >
              ✏️ Düzenle
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold py-3.5 rounded-xl shadow-lg transition text-sm cursor-pointer"
              disabled={submitting}
            >
              {submitting ? "Gönderiliyor..." : "Onayla ve Gönder 🚀"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Editable form mode
  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center justify-center gap-2">
          ➕ Yeni Araç Ekleme Önerisi
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Sistemde bulamadığınız araç varyantlarını buraya ekleyerek admin onayına gönderebilirsiniz.
        </p>
      </div>

      {/* Success/Error Panels */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold leading-relaxed">
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs font-bold leading-relaxed">
          🛑 {errorMsg}
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleFormSubmit} className="glass p-8 rounded-3xl flex flex-col gap-6 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Brand Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marka</label>
            <select
              value={selectedBrand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={loadingBrands}
              required
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
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={loadingModels || !selectedBrand}
              required
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
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model Yılı</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              required
            >
              <option value="">Seçiniz...</option>
              {years.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Body Type Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kasa Tipi</label>
            <select
              value={selectedBodyType}
              onChange={(e) => setSelectedBodyType(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              required
            >
              <option value="">Seçiniz...</option>
              {BODY_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Engine Input (manual text field) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motor Özelliği (Hacim/Kod)</label>
            <input
              type="text"
              value={engineInput}
              onChange={(e) => setEngineInput(e.target.value)}
              placeholder="Örn: 1.6 TDI, 2.0 TFSI"
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-250 outline-none focus:border-orange-500 transition"
              required
            />
          </div>

          {/* Fuel Type Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yakıt Türü</label>
            <select
              value={selectedFuelType}
              onChange={(e) => setSelectedFuelType(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              required
            >
              <option value="">Seçiniz...</option>
              {FUEL_TYPES.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </select>
          </div>

          {/* Trim Input (manual text field) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Donanım Paketi</label>
            <input
              type="text"
              value={trimInput}
              onChange={(e) => setTrimInput(e.target.value)}
              placeholder="Örn: Highline, Premium, Comfortline"
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-250 outline-none focus:border-orange-500 transition"
              required
            />
          </div>

          {/* Transmission Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Şanzıman Türü</label>
            <select
              value={selectedTransmission}
              onChange={(e) => setSelectedTransmission(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              required
            >
              <option value="">Seçiniz...</option>
              {TRANSMISSIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

        </div>

        <button
          type="submit"
          className="mt-4 w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold py-3.5 rounded-xl shadow-lg transition cursor-pointer"
        >
          Kontrol Et ve Devam Et 🔍
        </button>
      </form>
    </div>
  );
}
