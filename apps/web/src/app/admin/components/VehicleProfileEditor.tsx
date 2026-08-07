"use client";

import React, { useState, useEffect } from "react";

interface CriticalInfoInput {
  title: string;
  description: string;
  sortOrder: number;
}

interface VehicleProfileEditorProps {
  initialData?: any;
  defaultShowInGuide?: boolean;
  defaultShowInDiscovery?: boolean;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const BODY_TYPES = [
  { value: "SEDAN", label: "Sedan" },
  { value: "HATCHBACK", label: "Hatchback" },
  { value: "SUV", label: "SUV" },
  { value: "COUPE", label: "Coupe" },
  { value: "CONVERTIBLE", label: "Cabrio" },
  { value: "WAGON", label: "Station Wagon" },
  { value: "PICKUP", label: "Pickup" },
  { value: "VAN", label: "Van / Minivan" },
];

export default function VehicleProfileEditor({
  initialData,
  defaultShowInGuide = true,
  defaultShowInDiscovery = true,
  onSave,
  onCancel,
  loading = false,
}: VehicleProfileEditorProps) {
  const [activeTab, setActiveTab] = useState<
    "basic" | "technical" | "guide" | "discovery" | "images" | "publish"
  >("basic");

  // Form State
  const [brand, setBrand] = useState(initialData?.brand || "");
  const [model, setModel] = useState(initialData?.model || "");
  const [generationName, setGenerationName] = useState(initialData?.generationName || "");
  const [generationCode, setGenerationCode] = useState(initialData?.generationCode || "");
  const [bodyType, setBodyType] = useState(initialData?.bodyType || "SEDAN");
  const [yearStart, setYearStart] = useState<number>(initialData?.yearStart || 2018);
  const [yearEnd, setYearEnd] = useState<number | "">(initialData?.yearEnd || "");
  const [displayName, setDisplayName] = useState(initialData?.displayName || "");

  // Technical State
  const [fuelType, setFuelType] = useState(initialData?.fuelType || "PETROL");
  const [transmissionType, setTransmissionType] = useState(initialData?.transmissionType || "AUTOMATIC");
  const [representativeEngine, setRepresentativeEngine] = useState(initialData?.representativeEngine || "");
  const [powerHp, setPowerHp] = useState<number | "">(initialData?.powerHp || "");
  const [torqueNm, setTorqueNm] = useState<number | "">(initialData?.torqueNm || "");
  const [drivetrain, setDrivetrain] = useState(initialData?.drivetrain || "Önden Çekiş");
  const [averageConsumption, setAverageConsumption] = useState(initialData?.averageConsumption || "");

  // Guide State
  const [guideSummary, setGuideSummary] = useState(initialData?.guideSummary || "");
  const [criticalInfos, setCriticalInfos] = useState<CriticalInfoInput[]>(
    initialData?.criticalInfos || [
      { title: "Konfor ve Güvenlik Yapısı", description: "Geniş iç hacim ve üst düzey sürüş dinamiği.", sortOrder: 0 },
      { title: "Bakım ve Şanzıman Geçmişi", description: "Düzenli yetkili servis bakımı kontrol edilmelidir.", sortOrder: 1 },
    ]
  );

  // Discovery State
  const [discoverySummary, setDiscoverySummary] = useState(initialData?.discoverySummary || "");
  const [discoveryHighlight, setDiscoveryHighlight] = useState(initialData?.discoveryHighlight || "");
  const [discoveryWatchout, setDiscoveryWatchout] = useState(initialData?.discoveryWatchout || "");
  const [tagsInput, setTagsInput] = useState<string>(
    initialData?.tags ? (Array.isArray(initialData.tags) ? initialData.tags.join(", ") : initialData.tags) : "sedan, benzinli, otomatik, konfor, aile-araci"
  );

  // Images State
  const [heroImageUrl, setHeroImageUrl] = useState(initialData?.heroImageUrl || "");

  // Visibility Toggles State
  const [showInGuide, setShowInGuide] = useState<boolean>(
    initialData?.showInGuide ?? defaultShowInGuide
  );
  const [showInDiscovery, setShowInDiscovery] = useState<boolean>(
    initialData?.showInDiscovery ?? defaultShowInDiscovery
  );
  const [isActive, setIsActive] = useState<boolean>(initialData?.isActive ?? true);

  const [errorMsg, setErrorMsg] = useState("");

  const handleAddCriticalInfo = () => {
    setCriticalInfos((prev) => [
      ...prev,
      { title: "", description: "", sortOrder: prev.length },
    ]);
  };

  const handleRemoveCriticalInfo = (index: number) => {
    setCriticalInfos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateCriticalInfo = (index: number, field: "title" | "description", val: string) => {
    setCriticalInfos((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!brand.trim() || !model.trim() || !bodyType || !yearStart) {
      setErrorMsg("Lütfen Marka, Model, Kasa Tipi ve Başlangıç Yılını eksiksiz doldurun.");
      setActiveTab("basic");
      return;
    }

    const tagsArr = tagsInput
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const payload = {
      brand: brand.trim(),
      model: model.trim(),
      generationName: generationName.trim() || undefined,
      generationCode: generationCode.trim() || undefined,
      bodyType,
      yearStart: Number(yearStart),
      yearEnd: yearEnd ? Number(yearEnd) : null,
      displayName: displayName.trim() || undefined,
      heroImageUrl: heroImageUrl.trim() || undefined,

      fuelType: fuelType || undefined,
      transmissionType: transmissionType || undefined,
      representativeEngine: representativeEngine.trim() || undefined,
      powerHp: powerHp ? Number(powerHp) : undefined,
      torqueNm: torqueNm ? Number(torqueNm) : undefined,
      drivetrain: drivetrain.trim() || undefined,
      averageConsumption: averageConsumption.trim() || undefined,

      guideSummary: guideSummary.trim() || undefined,
      criticalInfos: criticalInfos.filter((c) => c.title.trim()),

      discoverySummary: discoverySummary.trim() || undefined,
      discoveryHighlight: discoveryHighlight.trim() || undefined,
      discoveryWatchout: discoveryWatchout.trim() || undefined,
      tags: tagsArr,

      showInGuide,
      showInDiscovery,
      isActive,
    };

    try {
      await onSave(payload);
    } catch (err: any) {
      setErrorMsg(err.message || "Kaydetme sırasında bir hata oluştu.");
    }
  };

  return (
    <div className="bg-[#050914] border border-white/10 rounded-2xl overflow-hidden shadow-2xl text-slate-200">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
        <div>
          <h3 className="text-lg font-bold text-white">
            {initialData ? "Ortak Araç Profilini Düzenle" : "Yeni Ortak Araç Profili Ekle"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Araç Rehberi ve Aracını Bul özellikleri için ortak veri kaydı (`VehicleProfile`).
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
        >
          Kapat
        </button>
      </div>

      {errorMsg && (
        <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-white/10 bg-slate-950/20 overflow-x-auto text-xs font-bold">
        {[
          { id: "basic", label: "1. Temel Bilgiler" },
          { id: "technical", label: "2. Teknik Bilgiler" },
          { id: "guide", label: "3. Araç Rehberi" },
          { id: "discovery", label: "4. Aracını Bul" },
          { id: "images", label: "5. Görseller" },
          { id: "publish", label: "6. Yayın Ayarları" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-5 py-3.5 whitespace-nowrap transition border-b-2 ${
              activeTab === t.id
                ? "border-orange-500 text-orange-400 bg-orange-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* TAB 1: BASIC INFO */}
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
            <div>
              <label className="block text-slate-400 mb-1">Marka *</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Örn: BMW, Audi, Volkswagen"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Model *</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Örn: 5 Serisi, A6, Passat"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Nesil Adı (Generation Name)</label>
              <input
                type="text"
                value={generationName}
                onChange={(e) => setGenerationName(e.target.value)}
                placeholder="Örn: 7. Nesil (2017-2023)"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Nesil Kodu (Generation Code)</label>
              <input
                type="text"
                value={generationCode}
                onChange={(e) => setGenerationCode(e.target.value)}
                placeholder="Örn: G30, C8, B8"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Kasa Tipi *</label>
              <select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              >
                {BODY_TYPES.map((bt) => (
                  <option key={bt.value} value={bt.value}>
                    {bt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Başlangıç Yılı *</label>
                <input
                  type="number"
                  value={yearStart}
                  onChange={(e) => setYearStart(Number(e.target.value))}
                  className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Bitiş Yılı (Opsiyonel)</label>
                <input
                  type="number"
                  value={yearEnd}
                  onChange={(e) => setYearEnd(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Devam ediyorsa boş bırakın"
                  className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1">Görünür İsim (Display Name)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Örn: BMW 5 Serisi G30 Sedan"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* TAB 2: TECHNICAL INFO */}
        {activeTab === "technical" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
            <div className="md:col-span-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300">
              ℹ️ <strong>Önemli Kural:</strong> Profil seviyesindeki bu teknik değerler yalnız genel özet ve fallback amaçlıdır. Aracını Bul kartında filtreye uyan spesifik varyant (`representativeVariant`) seçildiğinde, karttaki teknik değerler <strong>tamamen o varyanttan</strong> çekilir.
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Varsayılan Yakıt Tipi</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              >
                <option value="PETROL">Benzin</option>
                <option value="DIESEL">Dizel</option>
                <option value="LPG">LPG</option>
                <option value="HYBRID">Hibrit</option>
                <option value="PLUG_IN_HYBRID">Plug-in Hibrit</option>
                <option value="ELECTRIC">Elektrik</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Varsayılan Vites Tipi</label>
              <select
                value={transmissionType}
                onChange={(e) => setTransmissionType(e.target.value)}
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              >
                <option value="AUTOMATIC">Otomatik</option>
                <option value="MANUAL">Manuel</option>
                <option value="SEMI_AUTOMATIC">Yarı Otomatik</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Temsilci Motor Versiyonu</label>
              <input
                type="text"
                value={representativeEngine}
                onChange={(e) => setRepresentativeEngine(e.target.value)}
                placeholder="Örn: 2.0 TFSI 190 HP"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Çekiş Tipi</label>
              <input
                type="text"
                value={drivetrain}
                onChange={(e) => setDrivetrain(e.target.value)}
                placeholder="Örn: Önden Çekiş / Arkadan İtiş / 4x4"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Motor Gücü (HP)</label>
              <input
                type="number"
                value={powerHp}
                onChange={(e) => setPowerHp(e.target.value ? Number(e.target.value) : "")}
                placeholder="Örn: 190"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Tork (Nm)</label>
              <input
                type="number"
                value={torqueNm}
                onChange={(e) => setTorqueNm(e.target.value ? Number(e.target.value) : "")}
                placeholder="Örn: 320"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1">Ortalama Tüketim</label>
              <input
                type="text"
                value={averageConsumption}
                onChange={(e) => setAverageConsumption(e.target.value)}
                placeholder="Örn: 6.2 L/100km"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* TAB 3: VEHICLE GUIDE CONTENT */}
        {activeTab === "guide" && (
          <div className="space-y-4 text-xs font-bold">
            <div>
              <label className="block text-slate-400 mb-1">Araç Rehberi Özeti (Guide Summary)</label>
              <textarea
                rows={3}
                value={guideSummary}
                onChange={(e) => setGuideSummary(e.target.value)}
                placeholder="Araç Rehberi detay görünümünde gösterilecek genel inceleme özeti..."
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl p-3 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-300 font-extrabold text-xs uppercase tracking-wider">
                  Kritik Bilgi Kartları (`criticalInfoCards`)
                </span>
                <button
                  type="button"
                  onClick={handleAddCriticalInfo}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[11px] font-bold transition"
                >
                  + Kritik Bilgi Ekle
                </button>
              </div>

              <div className="space-y-3">
                {criticalInfos.map((ci, idx) => (
                  <div key={idx} className="p-3 bg-[#090d1a] border border-white/10 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={ci.title}
                        onChange={(e) => handleUpdateCriticalInfo(idx, "title", e.target.value)}
                        placeholder="Kart Başlığı (Örn: Konfor ve Güvenlik)"
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-slate-200 focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCriticalInfo(idx)}
                        className="text-rose-400 hover:text-rose-300 text-[11px] font-bold px-2 py-1 bg-rose-500/10 rounded-lg"
                      >
                        Sil
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={ci.description}
                      onChange={(e) => handleUpdateCriticalInfo(idx, "description", e.target.value)}
                      placeholder="Kart açıklaması..."
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-slate-300 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DISCOVERY CONTENT */}
        {activeTab === "discovery" && (
          <div className="space-y-4 text-xs font-bold">
            <div>
              <label className="block text-slate-400 mb-1">
                BU ARAÇ NASIL? (`discoverySummary` — 2–3 Satır Özet)
              </label>
              <textarea
                rows={3}
                value={discoverySummary}
                onChange={(e) => setDiscoverySummary(e.target.value)}
                placeholder="Uzun yol konforu, geniş kabini ve dengeli sürüş karakteriyle öne çıkan bir sedan..."
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl p-3 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-emerald-400 mb-1">
                ✓ ÖNE ÇIKAN ÖZELLİK (`discoveryHighlight`)
              </label>
              <input
                type="text"
                value={discoveryHighlight}
                onChange={(e) => setDiscoveryHighlight(e.target.value)}
                placeholder="Örn: Uzun yol ve konfor odaklı kullanım dinamikleri"
                className="w-full bg-[#090d1a] border border-emerald-500/30 rounded-xl px-4 py-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-amber-400 mb-1">
                ⚠ DİKKAT EDİLECEK NOKTA (`discoveryWatchout`)
              </label>
              <input
                type="text"
                value={discoveryWatchout}
                onChange={(e) => setDiscoveryWatchout(e.target.value)}
                placeholder="Örn: Şanzıman ve periyodik bakım geçmişi kontrol edilmelidir"
                className="w-full bg-[#090d1a] border border-amber-500/30 rounded-xl px-4 py-2.5 text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Etiketler (`tags` — Virgülle Ayrılmış)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="sedan, benzinli, otomatik, aile-araci, konfor, uzun-yol"
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* TAB 5: IMAGES */}
        {activeTab === "images" && (
          <div className="space-y-4 text-xs font-bold">
            <div>
              <label className="block text-slate-400 mb-1">Ana Görsel URL (Primary / Hero Image)</label>
              <input
                type="text"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full bg-[#090d1a] border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {heroImageUrl && (
              <div className="mt-2">
                <span className="block text-[11px] text-slate-400 mb-1">Görsel Önizleme:</span>
                <img
                  src={heroImageUrl}
                  alt="Önizleme"
                  className="w-full max-h-48 object-cover rounded-xl border border-white/10"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PUBLISH SETTINGS */}
        {activeTab === "publish" && (
          <div className="space-y-4 text-xs font-bold">
            <div className="p-4 bg-slate-900 border border-white/10 rounded-xl space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="block text-slate-200">Araç Rehberi'nde Göster (`showInGuide`)</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Bu araç profilini /vehicle-guide listesinde yayınla.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showInGuide}
                  onChange={(e) => setShowInGuide(e.target.checked)}
                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                />
              </label>

              <div className="border-t border-white/5 pt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="block text-slate-200">Aracını Bul'da Göster (`showInDiscovery`)</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Bu aracı Aracını Bul swipe aday havuzuna dahil et.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showInDiscovery}
                    onChange={(e) => setShowInDiscovery(e.target.checked)}
                    className="w-5 h-5 accent-orange-500 cursor-pointer"
                  />
                </label>
              </div>

              <div className="border-t border-white/5 pt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="block text-slate-200">Aktif Yayın Seviyesi (`isActive`)</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Pasife alındığında araç iki tarafta da kamuya gizlenir.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 accent-emerald-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
          >
            İptal
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
          >
            {loading ? "Kaydediliyor..." : initialData ? "Guncelle" : "Ortak Profili Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
