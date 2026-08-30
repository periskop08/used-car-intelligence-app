"use client";

import React, { useState, useRef } from "react";
import VehicleGuideCardLayout, {
  CardFactItem,
  TechnicalInfoData,
  translateBodyType,
} from "./VehicleGuideCardLayout";
import { API_BASE_URL } from "@/utils/apiConfig";
import { Upload, X } from "lucide-react";

export interface VehicleGuideCardEditorProps {
  initialData?: any;
  onSave: (payload: any) => Promise<void>;
  onClose: () => void;
  submitting?: boolean;
}

const BODY_TYPES = [
  { value: "SUV", label: "SUV" },
  { value: "HATCHBACK", label: "Hatchback" },
  { value: "SEDAN", label: "Sedan" },
  { value: "STATION_WAGON", label: "Station Wagon" },
  { value: "COUPE", label: "Kupe" },
  { value: "CONVERTIBLE", label: "Cabriolet" },
  { value: "MINIVAN", label: "Minivan / VAN" },
  { value: "PICKUP", label: "Pickup" },
];

export default function VehicleGuideCardEditor({
  initialData,
  onSave,
  onClose,
  submitting = false,
}: VehicleGuideCardEditorProps) {
  // Form Data State
  const [heroImageUrl, setHeroImageUrl] = useState<string>(initialData?.heroImageUrl || initialData?.imageUrl || "");
  const [brand, setBrand] = useState<string>(initialData?.brand || "");
  const [model, setModel] = useState<string>(initialData?.model || "");
  const [generationCode, setGenerationCode] = useState<string>(initialData?.generationCode || "");
  const [yearStart, setYearStart] = useState<number | "">(initialData?.yearStart || 2018);
  const [yearEnd, setYearEnd] = useState<number | "">(initialData?.yearEnd ?? "");
  const [bodyType, setBodyType] = useState<string>(initialData?.bodyType || "SUV");
  const [shortSummary, setShortSummary] = useState<string>(
    initialData?.shortSummary || initialData?.guideSummary || ""
  );

  // Status State: "DRAFT" (Taslak) or "APPROVED" (Yayında)
  const [status, setStatus] = useState<"DRAFT" | "APPROVED">(
    initialData?.status === "APPROVED" || initialData?.showInGuide === true ? "APPROVED" : "DRAFT"
  );

  // Mandatory Exactly 4 Critical Info Cards
  const initialFacts: CardFactItem[] = [
    { title: "", description: "" },
    { title: "", description: "" },
    { title: "", description: "" },
    { title: "", description: "" },
  ];

  if (initialData?.facts && Array.isArray(initialData.facts)) {
    initialData.facts.slice(0, 4).forEach((ci: any, idx: number) => {
      initialFacts[idx] = {
        title: ci.title || "",
        description: ci.description || "",
      };
    });
  } else if (initialData?.criticalInfos && Array.isArray(initialData.criticalInfos)) {
    initialData.criticalInfos.slice(0, 4).forEach((ci: any, idx: number) => {
      initialFacts[idx] = {
        title: ci.title || "",
        description: ci.description || "",
      };
    });
  }

  const [criticalInfos, setCriticalInfos] = useState<CardFactItem[]>(initialFacts);

  // Technical Specs
  const [techOpen, setTechOpen] = useState(false);
  const [techData, setTechData] = useState<TechnicalInfoData>({
    productionYears: initialData?.yearStart ? `${initialData.yearStart} - ${initialData.yearEnd || "Günümüz"}` : "",
    segment: translateBodyType(initialData?.bodyType || "SUV"),
    drivetrain: initialData?.drivetrain || "Önden Çekiş",
    engineOptions: initialData?.representativeEngine ? [initialData.representativeEngine] : ["1.2 PureTech", "1.5 BlueHDi"],
    fuelTypes: initialData?.fuelType ? [initialData.fuelType] : ["PETROL", "DIESEL"],
    transmissionOptions: initialData?.transmissionType ? [initialData.transmissionType] : ["AUTOMATIC"],
    averageConsumption: initialData?.averageConsumption || "5.4 lt / 100km",
    powerRange: initialData?.powerHp ? `${initialData.powerHp} HP` : "130 HP",
    torqueRange: initialData?.torqueNm ? `${initialData.torqueNm} Nm` : "300 Nm",
    trunkVolume: "580 LT",
    safetyInfo: "5 Yıldız Euro NCAP",
    localizedNotes: initialData?.guideSummary || "Sürüş konforu ve süspansiyon yapısı ile sınıfının lideri.",
  });

  // Uploading state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tempPreviewUrl, setTempPreviewUrl] = useState<string>("");
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hard Validation Checks
  const isImageOk =
    !!heroImageUrl.trim() &&
    (heroImageUrl.startsWith("http://") || heroImageUrl.startsWith("https://"));

  const isIdentityOk = !!brand.trim() && !!model.trim();
  const isYearsOk =
    !!yearStart &&
    Number(yearStart) > 1900 &&
    (!yearEnd || Number(yearEnd) >= Number(yearStart));
  const isBodyTypeOk = !!bodyType;
  const isSummaryOk = shortSummary.trim().length >= 10;

  const validFactsCount = criticalInfos.filter(
    (ci) => ci.title.trim().length >= 3 && ci.description.trim().length >= 5
  ).length;
  const isFactsOk = validFactsCount === 4;

  const isAllComplete =
    isImageOk &&
    isIdentityOk &&
    isYearsOk &&
    isBodyTypeOk &&
    isSummaryOk &&
    isFactsOk;

  // File Upload Handler (Rejects Base64 Data URL for persistent DB save)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Lütfen yalnızca resim dosyası (PNG, JPG, WEBP) yükleyin.");
      return;
    }

    setUploadingImage(true);
    setImageError("");

    const localBlobUrl = URL.createObjectURL(file);
    setTempPreviewUrl(localBlobUrl);

    try {
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/admin/vehicle-profiles/upload-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Görsel sunucuya yüklenemedi. Lütfen tekrar deneyin.");
      }

      const data = await res.json();
      if (data.url && (data.url.startsWith("http://") || data.url.startsWith("https://"))) {
        setHeroImageUrl(data.url);
      } else {
        throw new Error("Geçerli bir CDN/R2 görsel URL'si alınamadı.");
      }
    } catch (err: any) {
      setImageError(err.message || "Görsel yüklenirken bir hata oluştu.");
      setHeroImageUrl("");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async () => {
    if (!isAllComplete) return;

    const payload = {
      brand: brand.trim(),
      model: model.trim(),
      generationCode: generationCode.trim() || undefined,
      bodyType: bodyType.toUpperCase(),
      yearStart: Number(yearStart),
      yearEnd: yearEnd ? Number(yearEnd) : null,
      heroImageUrl: heroImageUrl.trim(),
      shortSummary: shortSummary.trim(),
      status,
      facts: criticalInfos.map((ci, idx) => ({
        title: ci.title.trim(),
        description: ci.description.trim(),
        displayOrder: idx,
      })),
    };

    await onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-[1280px] bg-[#050914] border border-white/10 rounded-[32px] md:rounded-[40px] p-4 md:p-6 flex flex-col gap-4 shadow-2xl relative max-h-[96vh] overflow-y-auto font-sans">
        
        {/* TOP HEADER & STATUS BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10 flex-none">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
              {initialData ? "Araç Rehberi Kartını Düzenle" : "+ Yeni Araç Rehberi Kartı Editörü"}
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">
              WYSIWYG Canlı Mod
            </span>
          </div>

          {/* Section Completion Progress */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
            <span className={`px-2.5 py-1 rounded-lg border transition ${isImageOk ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/10"}`}>
              {isImageOk ? "✓ Görsel" : "○ Görsel"}
            </span>
            <span className={`px-2.5 py-1 rounded-lg border transition ${isIdentityOk ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/10"}`}>
              {isIdentityOk ? "✓ Marka/Model" : "○ Marka/Model"}
            </span>
            <span className={`px-2.5 py-1 rounded-lg border transition ${isYearsOk ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/10"}`}>
              {isYearsOk ? "✓ Yıllar" : "○ Yıllar"}
            </span>
            <span className={`px-2.5 py-1 rounded-lg border transition ${isBodyTypeOk ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/10"}`}>
              {isBodyTypeOk ? "✓ Kasa Tipi" : "○ Kasa Tipi"}
            </span>
            <span className={`px-2.5 py-1 rounded-lg border transition ${isSummaryOk ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/10"}`}>
              {isSummaryOk ? "✓ Özet" : "○ Özet"}
            </span>
            <span className={`px-2.5 py-1 rounded-lg border transition ${isFactsOk ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
              {isFactsOk ? "✓ 4 Kritik Bilgi" : `○ Kritik Bilgiler (${validFactsCount}/4)`}
            </span>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* COMPACT STATUS CONTROL BAR */}
        <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">Yayın Durumu:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus("DRAFT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  status === "DRAFT"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-slate-900 text-slate-400 border border-white/10 hover:text-white"
                }`}
              >
                📝 Taslak
              </button>
              <button
                type="button"
                onClick={() => setStatus("APPROVED")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  status === "APPROVED"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-slate-900 text-slate-400 border border-white/10 hover:text-white"
                }`}
              >
                🚀 Yayında
              </button>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 italic">
            {status === "APPROVED" ? "Kart kullanıcı Araç Rehberi'nde canlı yayınlanacak." : "Kart yalnızca taslak modunda kalacak, kullanıcıya görünmeyecek."}
          </span>
        </div>

        {/* MAIN CANVASES: REAL CARD PREVIEW & EDITING SLOTS */}
        <div className="flex items-center justify-center py-2 overflow-x-auto">
          <VehicleGuideCardLayout
            brand={brand}
            model={model}
            generationCode={generationCode}
            yearStart={yearStart}
            yearEnd={yearEnd}
            bodyType={bodyType}
            heroImageUrl={tempPreviewUrl || heroImageUrl}
            shortSummary={shortSummary}
            facts={criticalInfos}
            techOpen={techOpen}
            onToggleTech={() => setTechOpen(!techOpen)}
            technicalInfo={techData}
            isReadonly={false}

            /* 1. HERO IMAGE EDIT SLOT */
            customHeroSlot={
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="w-full h-full p-4 flex flex-col items-center justify-center gap-2 text-center bg-black/70 backdrop-blur-sm cursor-pointer border-2 border-dashed border-orange-500/50 hover:border-orange-500 rounded-xl transition"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />

                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2 text-white font-bold text-xs">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span>R2 Sunucusuna Yükleniyor...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-orange-400" />
                    <span className="text-xs font-bold text-white">Görsel Sürükleyin veya Tıklayın</span>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[10px] font-bold"
                      >
                        Bilgisayardan Seç
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowUrlFallback(!showUrlFallback);
                        }}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-[10px] font-bold"
                      >
                        CDN URL Yaz
                      </button>
                    </div>

                    {showUrlFallback && (
                      <div className="mt-2 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          placeholder="https://...r2.dev/..."
                          value={heroImageUrl}
                          onChange={(e) => setHeroImageUrl(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-900 border border-white/20 rounded text-[10px] text-white outline-none"
                        />
                      </div>
                    )}

                    {imageError && <span className="text-[10px] text-rose-400 font-bold max-w-xs">{imageError}</span>}
                  </>
                )}
              </div>
            }

            /* 2. BRAND, MODEL, YEARS & BODY TYPE EDIT SLOT */
            customIdentitySlot={
              <div className="flex flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
                {/* Brand & Model */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Marka (Örn: Citroen)"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-1/2 px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-black text-white uppercase outline-none focus:border-orange-500"
                  />
                  <input
                    type="text"
                    placeholder="Model (Örn: C5 Aircross)"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-1/2 px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-black text-orange-400 uppercase outline-none focus:border-orange-500"
                  />
                </div>

                {/* Gen code, years & body type */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <input
                    type="text"
                    placeholder="Jenerasyon (Örn: Mk8)"
                    value={generationCode}
                    onChange={(e) => setGenerationCode(e.target.value)}
                    className="w-24 px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-[10px] text-slate-300 font-mono outline-none"
                  />

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="Başlangıç Yılı"
                      value={yearStart}
                      onChange={(e) => setYearStart(e.target.value ? Number(e.target.value) : "")}
                      className="w-20 px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-[10px] text-slate-200 outline-none font-bold"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                      type="number"
                      placeholder="Bitiş Yılı"
                      value={yearEnd}
                      onChange={(e) => setYearEnd(e.target.value ? Number(e.target.value) : "")}
                      className="w-20 px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-[10px] text-slate-200 outline-none font-bold"
                    />
                  </div>

                  <select
                    value={bodyType}
                    onChange={(e) => setBodyType(e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-[10px] font-bold text-orange-300 outline-none"
                  >
                    {BODY_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>
                        {bt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            }

            /* 3. EDITORIAL SUMMARY EDIT SLOT */
            customSummarySlot={
              <div className="flex flex-col gap-1">
                <textarea
                  rows={3}
                  placeholder="Araç hakkında kısa editoryal yayın özeti (Minimum 10 karakter)..."
                  value={shortSummary}
                  onChange={(e) => setShortSummary(e.target.value)}
                  className="w-full p-3 bg-white/5 border border-white/10 focus:border-orange-500/50 rounded-2xl text-xs text-slate-200 leading-relaxed italic outline-none resize-none"
                />
              </div>
            }

            /* 4. MANDATORY EXACTLY 4 CRITICAL INFOS EDIT SLOT */
            customFactsSlot={
              <div className="flex flex-col gap-2">
                {criticalInfos.map((fact, idx) => {
                  const isItemOk = fact.title.trim().length >= 3 && fact.description.trim().length >= 5;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-2xl border transition flex flex-col gap-1.5 ${
                        isItemOk
                          ? "bg-slate-900/90 border-emerald-500/30"
                          : "bg-slate-950 border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                          KRİTİK BİLGİ {idx + 1} {isItemOk ? "✓" : "○"}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder={`Başlık ${idx + 1} (Örn: YÜKSEK HIZDA KONFOR)`}
                        value={fact.title}
                        onChange={(e) => {
                          const updated = [...criticalInfos];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setCriticalInfos(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-slate-950 border border-white/10 rounded-lg text-xs font-black text-slate-200 uppercase outline-none focus:border-orange-500"
                      />
                      <textarea
                        rows={2}
                        placeholder={`Açıklama ${idx + 1}...`}
                        value={fact.description}
                        onChange={(e) => {
                          const updated = [...criticalInfos];
                          updated[idx] = { ...updated[idx], description: e.target.value };
                          setCriticalInfos(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-slate-950 border border-white/10 rounded-lg text-[10.5px] font-medium text-slate-300 outline-none resize-none focus:border-orange-500"
                      />
                    </div>
                  );
                })}
              </div>
            }

            /* 5. FOOTER CONTROL & SAVE BUTTON SLOT */
            customFooterSlot={
              <div className="p-4 border-t border-white/5 flex items-center justify-between gap-3 bg-[#070b17] flex-none">
                <button
                  type="button"
                  onClick={() => setTechOpen(!techOpen)}
                  className="py-2.5 px-4 rounded-xl bg-[#0f172a] border border-blue-900/60 hover:bg-[#1e293b] text-xs font-bold text-blue-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>🛠️ Teknik Bilgileri Düzenle</span>
                  <span>{techOpen ? "↑" : "↓"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    İptal
                  </button>

                  <button
                    type="button"
                    disabled={!isAllComplete || submitting}
                    onClick={handleSave}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black tracking-wide text-white transition shadow-lg ${
                      isAllComplete && !submitting
                        ? "bg-orange-600 hover:bg-orange-500 shadow-orange-500/20 cursor-pointer animate-pulse"
                        : "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50"
                    }`}
                  >
                    {submitting
                      ? "Kaydediliyor..."
                      : initialData
                      ? "Değişiklikleri Kaydet"
                      : "KAYDET VE EKLE"}
                  </button>
                </div>
              </div>
            }

            /* 6. TECHNICAL DRAWER EDIT SLOT */
            customTechDrawerSlot={
              <div className="absolute inset-x-0 bottom-0 bg-[#090d1e] border-t border-white/15 rounded-t-[32px] p-6 shadow-2xl z-50 animate-in slide-in-from-bottom">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">🛠️ Rehber Kartı Teknik Verileri</h2>
                  <button
                    onClick={() => setTechOpen(false)}
                    className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-400 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1 text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Üretim Yılları Metni</label>
                    <input
                      type="text"
                      value={techData.productionYears || ""}
                      onChange={(e) => setTechData({ ...techData, productionYears: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Ortalama Tüketim</label>
                    <input
                      type="text"
                      value={techData.averageConsumption || ""}
                      onChange={(e) => setTechData({ ...techData, averageConsumption: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Güç Aralığı</label>
                    <input
                      type="text"
                      value={techData.powerRange || ""}
                      onChange={(e) => setTechData({ ...techData, powerRange: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Tork Aralığı</label>
                    <input
                      type="text"
                      value={techData.torqueRange || ""}
                      onChange={(e) => setTechData({ ...techData, torqueRange: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">💡 TorqueScout Uzman Notu</label>
                    <textarea
                      rows={2}
                      value={techData.localizedNotes || ""}
                      onChange={(e) => setTechData({ ...techData, localizedNotes: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-white text-xs resize-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTechOpen(false)}
                  className="w-full mt-3 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-xs"
                >
                  Teknik Bilgileri Tamamla
                </button>
              </div>
            }
          />
        </div>

      </div>
    </div>
  );
}
