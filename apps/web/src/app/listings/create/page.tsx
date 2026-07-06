"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const PAINTED_COMPONENTS = [
  "FRONT_BUMPER", "REAR_BUMPER", "HOOD", "ROOF", "TRUNK",
  "LEFT_FRONT_DOOR", "LEFT_REAR_DOOR", "RIGHT_FRONT_DOOR", "RIGHT_REAR_DOOR",
  "LEFT_FRONT_FENDER", "LEFT_REAR_FENDER", "RIGHT_FRONT_FENDER", "RIGHT_REAR_FENDER"
];

export default function CreateListing() {
  const router = useRouter();

  // Wizard Step State
  const [step, setStep] = useState(1);
  const [token, setToken] = useState("");

  // Step 1: Vehicle & Variant selection
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");

  // Custom details fallback if variant doesn't exist
  const [useCustomVariant, setUseCustomVariant] = useState(false);
  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customYear, setCustomYear] = useState("");

  // Step 2: Basic Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [kilometers, setKilometers] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [fuelType, setFuelType] = useState("PETROL");
  const [transmission, setTransmission] = useState("MANUAL");
  const [bodyType, setBodyType] = useState("SEDAN");
  const [color, setColor] = useState("");

  // Extended Details States
  const [vehicleStatus, setVehicleStatus] = useState("USED"); 
  const [hasWarranty, setHasWarranty] = useState(false);
  const [heavyDamage, setHeavyDamage] = useState(false);
  const [plateType, setPlateType] = useState("TR_PLATE"); 
  const [sellerType, setSellerType] = useState("OWNER"); 
  const [exchangeable, setExchangeable] = useState(false);
  const [engineDisplacement, setEngineDisplacement] = useState("");
  const [enginePower, setEnginePower] = useState("");
  const [drivetrain, setDrivetrain] = useState("FWD");

  // Step 3: Condition & Paint checklist
  const [tramerAmount, setTramerAmount] = useState("0");
  const [damageRecord, setDamageRecord] = useState("");
  const [paintedParts, setPaintedParts] = useState<string[]>([]);
  const [changedParts, setChangedParts] = useState<string[]>([]);
  const [localPaintedParts, setLocalPaintedParts] = useState<string[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState("");

  // Step 4: Photo uploads
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Step 5: Quota & Confirm
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);
  const [quota, setQuota] = useState<{ tier: string; activeCount: number; limit: number; remaining: number } | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    if (!savedToken) {
      router.push("/login?redirect=/listings/create");
      return;
    }
    setToken(savedToken);

    // Fetch Brands
    fetch(`${API_URL}/vehicles/brands`)
      .then((res) => res.json())
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching brands:", e));
  }, []);

  // Fetch models
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

  // Fetch variants
  useEffect(() => {
    if (!selectedModel) {
      setVariants([]);
      setSelectedVariant("");
      return;
    }
    fetch(`${API_URL}/vehicles/variants?modelId=${selectedModel}`)
      .then((res) => res.json())
      .then((data) => setVariants(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching variants:", e));
  }, [selectedModel]);

  // Fetch quota info when arriving at Step 5
  useEffect(() => {
    if (step === 5 && token) {
      setLoadingQuota(true);
      fetch(`${API_URL}/me/listing-quota`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setQuota(data);
          setLoadingQuota(false);
        })
        .catch(() => setLoadingQuota(false));
    }
  }, [step, token]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadedPhotos.length >= 10) {
      setMediaError("Bu ilan için en fazla 10 fotoğraf yükleyebilirsiniz.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMediaError("Her fotoğraf maksimum 5MB olmalı.");
      return;
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      setMediaError("Desteklenen formatlar JPEG, PNG ve WebP'dir.");
      return;
    }

    setUploading(true);
    // Mimic R2/S3 upload in NestJS server, using multipart/form-data
    const formData = new FormData();
    formData.append("file", file);

    // Create a temporary listing record in background first if not created yet,
    // or upload to a temporary handler. For simplicity, we create a draft listing on first photo upload.
    // If no listing exists yet, we create a basic draft first.
    createDraftListingOrGetId().then((listingId) => {
      fetch(`${API_URL}/listings/${listingId}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
        .then((res) => {
          if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
          return res.json();
        })
        .then((mediaRecord) => {
          setUploadedPhotos((prev) => [...prev, mediaRecord]);
          setUploading(false);
        })
        .catch((err) => {
          setMediaError(`Yükleme hatası: ${err.message}`);
          setUploading(false);
        });
    });
  };

  const deletePhoto = (mediaId: string, listingId: string) => {
    fetch(`${API_URL}/listings/${listingId}/media/${mediaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Silinemedi.");
        setUploadedPhotos((prev) => prev.filter((photo) => photo.id !== mediaId));
      })
      .catch((err) => setMediaError(err.message));
  };

  // State to hold temporary listing ID created during photo upload
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  const createDraftListingOrGetId = async (): Promise<string> => {
    if (createdListingId) return createdListingId;

    // Create a barebones draft listing
    const response = await fetch(`${API_URL}/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: title || "Yeni Araç İlanı",
        priceAmount: Number(priceAmount) || 0,
        city: city || "Belirtilmedi",
        modelYear: Number(customYear) || 2020,
        kilometers: Number(kilometers) || 0,
      }),
    });

    if (!response.ok) {
      throw new Error("Geçici ilan kaydı oluşturulamadı.");
    }
    const data = await response.json();
    setCreatedListingId(data.id);
    return data.id;
  };

  const [hoveredPart, setHoveredPart] = useState("");

  const PART_LABELS: Record<string, string> = {
    FRONT_BUMPER: "Ön Tampon",
    LEFT_FRONT_FENDER: "Sol Ön Çamurluk",
    HOOD: "Kaput (Motor Kaputu)",
    RIGHT_FRONT_FENDER: "Sağ Ön Çamurluk",
    LEFT_FRONT_DOOR: "Sol Ön Kapı",
    ROOF: "Tavan",
    RIGHT_FRONT_DOOR: "Sağ Ön Kapı",
    LEFT_REAR_DOOR: "Sol Arka Kapı",
    RIGHT_REAR_DOOR: "Sağ Arka Kapı",
    LEFT_REAR_FENDER: "Sol Arka Çamurluk",
    TRUNK: "Bagaj Kapağı",
    RIGHT_REAR_FENDER: "Sağ Arka Çamurluk",
    REAR_BUMPER: "Arka Tampon"
  };

  const getPartColorClass = (partKey: string) => {
    if (changedParts.includes(partKey)) {
      return "fill-red-500/25 stroke-red-500/50 hover:fill-red-500/40";
    }
    if (paintedParts.includes(partKey)) {
      return "fill-blue-500/25 stroke-blue-500/50 hover:fill-blue-500/40";
    }
    if (localPaintedParts.includes(partKey)) {
      return "fill-orange-500/25 stroke-orange-500/50 hover:fill-orange-500/40";
    }
    return "fill-slate-900/50 stroke-white/10 hover:fill-slate-800/60";
  };

  const handlePartClick = (part: string) => {
    let current = "ORIGINAL";
    if (changedParts.includes(part)) current = "CHANGED";
    else if (paintedParts.includes(part)) current = "PAINTED";
    else if (localPaintedParts.includes(part)) current = "LOCAL_PAINTED";

    if (current === "ORIGINAL") {
      setLocalPaintedParts((prev) => [...prev, part]);
    } else if (current === "LOCAL_PAINTED") {
      setLocalPaintedParts((prev) => prev.filter((x) => x !== part));
      setPaintedParts((prev) => [...prev, part]);
    } else if (current === "PAINTED") {
      setPaintedParts((prev) => prev.filter((x) => x !== part));
      setChangedParts((prev) => [...prev, part]);
    } else if (current === "CHANGED") {
      setChangedParts((prev) => prev.filter((x) => x !== part));
    }
  };

  const handleTogglePart = (part: string, type: "painted" | "changed") => {
    const list = type === "painted" ? paintedParts : changedParts;
    const setter = type === "painted" ? setPaintedParts : setChangedParts;
    if (list.includes(part)) {
      setter(list.filter((x) => x !== part));
    } else {
      setter([...list, part]);
    }
  };

  const handleSaveAndPublish = (asDraft: boolean) => {
    setErrorMsg("");
    setSaving(true);

    if (!asDraft && !responsibilityAccepted) {
      setErrorMsg("Yayınlamak için sorumluluk onay kutusunu işaretlemelisiniz.");
      setSaving(false);
      return;
    }

    const payload = {
      title,
      description,
      priceAmount: parseFloat(priceAmount),
      kilometers: parseInt(kilometers, 10),
      city,
      district,
      fuelType,
      transmission,
      bodyType,
      color,
      tramerAmount: parseInt(tramerAmount, 10),
      damageRecord,
      paintedParts,
      changedParts,
      localPaintedParts,
      maintenanceHistory,
      vehicleVariantId: useCustomVariant ? null : selectedVariant || null,
      customBrand: useCustomVariant ? customBrand : null,
      customModel: useCustomVariant ? customModel : null,
      customYear: useCustomVariant ? parseInt(customYear, 10) : null,
      vehicleStatus,
      hasWarranty,
      heavyDamage,
      plateType,
      sellerType,
      exchangeable,
      engineDisplacement: engineDisplacement ? parseInt(engineDisplacement, 10) : null,
      enginePower: enginePower ? parseInt(enginePower, 10) : null,
      drivetrain,
    };

    createDraftListingOrGetId().then((listingId) => {
      // 1. Update listing details
      fetch(`${API_URL}/listings/${listingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
          return res.json();
        })
        .then(() => {
          if (asDraft) {
            router.push("/dashboard/listings");
          } else {
            // 2. Publish (Transition status to PENDING_REVIEW)
            fetch(`${API_URL}/listings/${listingId}/status`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ status: "PENDING_REVIEW" }),
            })
              .then((res) => {
                if (!res.ok) return res.json().then((err) => { throw new Error(err.message); });
                return res.json();
              })
              .then(() => {
                router.push("/dashboard/listings");
              })
              .catch((err) => {
                setErrorMsg(err.message);
                setSaving(false);
              });
          }
        })
        .catch((err) => {
          setErrorMsg(err.message);
          setSaving(false);
        });
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">
      {/* Step Indicator Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-black text-slate-200">Araç İlanı Ekle</h1>
        <div className="flex items-center gap-2 w-full bg-slate-950/40 p-1.5 rounded-full border border-white/5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`flex-1 text-center text-[10px] font-bold py-1.5 rounded-full transition ${
                step === s ? "bg-orange-600 text-white shadow" : "text-slate-500"
              }`}
            >
              Adım {s}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Select Vehicle / Variant */}
      {step === 1 && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-lg font-bold text-slate-200">🚗 Adım 1: Araç Varyant Seçimi</h2>
          <p className="text-xs text-slate-400">Aracınızın teknik özelliklerinin ve kronik analizlerinin eşleşmesi için varyant seçiniz.</p>

          <div className="flex items-center gap-2 cursor-pointer bg-slate-900/40 p-4 rounded-xl border border-white/5">
            <input
              type="checkbox"
              id="customVariantToggle"
              checked={useCustomVariant}
              onChange={(e) => setUseCustomVariant(e.target.checked)}
              className="accent-orange-500 rounded border-white/10"
            />
            <label htmlFor="customVariantToggle" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
              Aracımı listede bulamadım (Özel detaylar gireceğim)
            </label>
          </div>

          {!useCustomVariant ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Marka</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                >
                  <option value="">Seçiniz...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Model</label>
                <select
                  value={selectedModel}
                  disabled={!selectedBrand}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                >
                  <option value="">Seçiniz...</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Varyant (Motor/Şanzıman)</label>
                <select
                  value={selectedVariant}
                  disabled={!selectedModel}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                >
                  <option value="">Seçiniz...</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} - {v.engine.code} - {v.transmission.name} ({v.trim.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Marka İsmi</label>
                <input
                  type="text"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="Örn: Fiat"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Model İsmi</label>
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Örn: Egea"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Model Yılı</label>
                <input
                  type="number"
                  value={customYear}
                  onChange={(e) => setCustomYear(e.target.value)}
                  placeholder="Örn: 2018"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <p className="text-[10px] text-amber-500 italic">⚠️ Manuel varyant girişinde ilanınız yayında kalır fakat "AI Analizli İlan" rozeti alamaz.</p>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!useCustomVariant ? !selectedVariant : !customBrand || !customModel || !customYear}
            className="w-full mt-4 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-2xl transition"
          >
            Devam Et
          </button>
        </div>
      )}

      {/* STEP 2: Basic Details */}
      {step === 2 && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-lg font-bold text-slate-200">📝 Adım 2: İlan Detayları</h2>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">İlan Başlığı</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Hatasız Düşük Kilometreli Egea"
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Fiyat (TL)</label>
                <input
                  type="number"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  placeholder="Örn: 750000"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kilometre</label>
                <input
                  type="number"
                  value={kilometers}
                  onChange={(e) => setKilometers(e.target.value)}
                  placeholder="Örn: 85000"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Şehir</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Örn: İstanbul"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">İlçe</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Örn: Kadıköy"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Yakıt</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                >
                  <option value="PETROL">Benzin</option>
                  <option value="DIESEL">Dizel</option>
                  <option value="LPG">LPG</option>
                  <option value="HYBRID">Hibrit</option>
                  <option value="ELECTRIC">Elektrik</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Şanzıman</label>
                <select
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                >
                  <option value="MANUAL">Manuel</option>
                  <option value="AUTOMATIC">Otomatik</option>
                  <option value="SEMI_AUTOMATIC">Yarı Otomatik</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Renk</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Örn: Beyaz"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Araç Durumu</label>
                <select
                  value={vehicleStatus}
                  onChange={(e) => setVehicleStatus(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                >
                  <option value="USED">İkinci El</option>
                  <option value="NEW">Sıfır</option>
                  <option value="IMPORTED_NEW">İthal Sıfır</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kimden</label>
                <select
                  value={sellerType}
                  onChange={(e) => setSellerType(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                >
                  <option value="OWNER">Sahibinden</option>
                  <option value="DEALER">Galeriden</option>
                  <option value="AUTHORIZED_DEALER">Yetkili Bayiden</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Plaka Uyruğu</label>
                <select
                  value={plateType}
                  onChange={(e) => setPlateType(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                >
                  <option value="TR_PLATE">TR Plakalı</option>
                  <option value="MA_PLATE">Mavi Plakalı (MA)</option>
                  <option value="SPECIAL_PLATE">Özel Plaka</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Çekiş</label>
                <select
                  value={drivetrain}
                  onChange={(e) => setDrivetrain(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                >
                  <option value="FWD">Önden Çekiş</option>
                  <option value="RWD">Arkadan İtiş</option>
                  <option value="4WD">4WD (Sürekli)</option>
                  <option value="AWD">AWD (Elektronik)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Motor Hacmi (cc)</label>
                <input
                  type="number"
                  value={engineDisplacement}
                  onChange={(e) => setEngineDisplacement(e.target.value)}
                  placeholder="Örn: 1598"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Motor Gücü (HP)</label>
                <input
                  type="number"
                  value={enginePower}
                  onChange={(e) => setEnginePower(e.target.value)}
                  placeholder="Örn: 110"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-950/20 p-4 border border-white/5 rounded-2xl">
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={hasWarranty}
                  onChange={(e) => setHasWarranty(e.target.checked)}
                  className="accent-orange-500 rounded border-white/10"
                />
                <span>Garanti Kapsamında</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={heavyDamage}
                  onChange={(e) => setHeavyDamage(e.target.checked)}
                  className="accent-orange-500 rounded border-white/10"
                />
                <span>Ağır Hasar Kaydı Var</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={exchangeable}
                  onChange={(e) => setExchangeable(e.target.checked)}
                  className="accent-orange-500 rounded border-white/10"
                />
                <span>Takasa Uygun (Takaslı)</span>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Açıklama</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Araç kondisyonu, ekstra aksesuarlar hakkında detay yazın..."
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border border-white/10 text-slate-300 font-bold py-3 rounded-2xl hover:bg-white/5 transition"
            >
              Geri
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!title || !priceAmount || !kilometers || !city}
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-2xl transition"
            >
              Devam Et
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Appraisal & Painted Parts */}
      {step === 3 && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-lg font-bold text-slate-200">🛠️ Adım 3: Boya, Değişen ve Tramer Durumu</h2>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tramer Hasar Tutarı (TL)</label>
                <input
                  type="number"
                  value={tramerAmount}
                  onChange={(e) => setTramerAmount(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Hasar Detay Kaydı</label>
                <input
                  type="text"
                  value={damageRecord}
                  onChange={(e) => setDamageRecord(e.target.value)}
                  placeholder="Örn: Arka çamurluk sürtme kaydı"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            {/* Visual Car Parts Selector */}
            <div className="flex flex-col gap-4 bg-slate-950/20 p-6 border border-white/5 rounded-3xl mt-2">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Boyalı veya Değişen Parça Seçimi</span>
              
              <div className="flex items-center gap-4 text-xs font-bold mt-1">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-white/10 block"></span> Orijinal
                </span>
                <span className="flex items-center gap-1.5 text-orange-400">
                  <span className="w-3.5 h-3.5 rounded bg-orange-500/25 border border-orange-500/40 block"></span> Lokal Boyalı
                </span>
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-3.5 h-3.5 rounded bg-blue-500/25 border border-blue-500/40 block"></span> Boyalı
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-3.5 h-3.5 rounded bg-red-500/25 border border-red-500/40 block"></span> Değişen
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mt-4">
                {/* 1. Car Visual Silhouette (SVG) */}
                <div className="md:col-span-6 flex flex-col items-center gap-2">
                  <div className="relative w-full max-w-[260px] p-4 bg-slate-950/40 border border-white/5 rounded-3xl flex justify-center shadow-xl">
                    <svg viewBox="0 0 200 380" className="w-full h-auto">
                      {/* Static Tires */}
                      <rect x="23" y="55" width="14" height="32" rx="4" fill="#1e293b" />
                      <rect x="163" y="55" width="14" height="32" rx="4" fill="#1e293b" />
                      <rect x="23" y="280" width="14" height="32" rx="4" fill="#1e293b" />
                      <rect x="163" y="280" width="14" height="32" rx="4" fill="#1e293b" />

                      {/* FRONT BUMPER */}
                      <path
                        d="M 50 35 Q 100 20 150 35 L 142 45 Q 100 35 58 45 Z"
                        onClick={() => handlePartClick("FRONT_BUMPER")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["FRONT_BUMPER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("FRONT_BUMPER")}`}
                      />

                      {/* HOOD */}
                      <path
                        d="M 58 45 Q 100 35 142 45 L 135 110 L 65 110 Z"
                        onClick={() => handlePartClick("HOOD")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["HOOD"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("HOOD")}`}
                      />

                      {/* LEFT FRONT FENDER */}
                      <path
                        d="M 50 35 L 58 45 L 65 110 L 38 110 C 34 85 36 55 50 35 Z"
                        onClick={() => handlePartClick("LEFT_FRONT_FENDER")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["LEFT_FRONT_FENDER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("LEFT_FRONT_FENDER")}`}
                      />

                      {/* RIGHT FRONT FENDER */}
                      <path
                        d="M 150 35 C 164 55 166 85 162 110 L 135 110 L 142 45 Z"
                        onClick={() => handlePartClick("RIGHT_FRONT_FENDER")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["RIGHT_FRONT_FENDER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("RIGHT_FRONT_FENDER")}`}
                      />

                      {/* LEFT FRONT DOOR */}
                      <path
                        d="M 38 110 L 65 110 L 65 180 L 38 180 Z"
                        onClick={() => handlePartClick("LEFT_FRONT_DOOR")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["LEFT_FRONT_DOOR"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("LEFT_FRONT_DOOR")}`}
                      />

                      {/* RIGHT FRONT DOOR */}
                      <path
                        d="M 135 110 L 162 110 L 162 180 L 135 180 Z"
                        onClick={() => handlePartClick("RIGHT_FRONT_DOOR")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["RIGHT_FRONT_DOOR"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("RIGHT_FRONT_DOOR")}`}
                      />

                      {/* ROOF */}
                      <rect
                        x="65" y="110" width="70" height="140" rx="8"
                        onClick={() => handlePartClick("ROOF")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["ROOF"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("ROOF")}`}
                      />

                      {/* LEFT REAR DOOR */}
                      <path
                        d="M 38 180 L 65 180 L 65 250 L 38 250 Z"
                        onClick={() => handlePartClick("LEFT_REAR_DOOR")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["LEFT_REAR_DOOR"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("LEFT_REAR_DOOR")}`}
                      />

                      {/* RIGHT REAR DOOR */}
                      <path
                        d="M 135 180 L 162 180 L 162 250 L 135 250 Z"
                        onClick={() => handlePartClick("RIGHT_REAR_DOOR")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["RIGHT_REAR_DOOR"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("RIGHT_REAR_DOOR")}`}
                      />

                      {/* LEFT REAR FENDER */}
                      <path
                        d="M 38 250 L 65 250 L 60 330 L 53 340 C 36 320 34 280 38 250 Z"
                        onClick={() => handlePartClick("LEFT_REAR_FENDER")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["LEFT_REAR_FENDER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("LEFT_REAR_FENDER")}`}
                      />

                      {/* TRUNK */}
                      <path
                        d="M 65 250 L 135 250 L 140 330 Q 100 340 60 330 Z"
                        onClick={() => handlePartClick("TRUNK")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["TRUNK"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("TRUNK")}`}
                      />

                      {/* RIGHT REAR FENDER */}
                      <path
                        d="M 135 250 L 162 250 C 166 280 164 320 147 340 L 140 330 Z"
                        onClick={() => handlePartClick("RIGHT_REAR_FENDER")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["RIGHT_REAR_FENDER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("RIGHT_REAR_FENDER")}`}
                      />

                      {/* REAR BUMPER */}
                      <path
                        d="M 53 340 Q 100 350 147 340 L 152 350 Q 100 365 48 350 Z"
                        onClick={() => handlePartClick("REAR_BUMPER")}
                        onMouseEnter={() => setHoveredPart(PART_LABELS["REAR_BUMPER"])}
                        onMouseLeave={() => setHoveredPart("")}
                        className={`cursor-pointer transition duration-200 ${getPartColorClass("REAR_BUMPER")}`}
                      />

                      {/* Headlights and Tail lights */}
                      <ellipse cx="61" cy="41" rx="5" ry="2.5" fill="#fef08a" transform="rotate(-10 61 41)" opacity="0.9" pointerEvents="none" />
                      <ellipse cx="139" cy="41" rx="5" ry="2.5" fill="#fef08a" transform="rotate(10 139 41)" opacity="0.9" pointerEvents="none" />
                      <rect x="52" y="342" width="10" height="3" rx="0.5" fill="#ef4444" opacity="0.9" pointerEvents="none" />
                      <rect x="138" y="342" width="10" height="3" rx="0.5" fill="#ef4444" opacity="0.9" pointerEvents="none" />
                    </svg>
                  </div>
                  
                  {/* Hover status label indicator */}
                  <span className="text-[11px] font-bold text-slate-400 min-h-[16px] block text-center mt-1">
                    {hoveredPart ? hoveredPart : "Durumu değiştirmek için parçaya tıklayın"}
                  </span>
                </div>

                {/* 2. Side Lists: Summarizing current selections */}
                <div className="md:col-span-6 grid grid-cols-2 gap-4 h-full align-top">
                  <div className="flex flex-col gap-2 bg-slate-950/45 p-4 border border-white/5 rounded-2xl h-fit">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">🎨 Boyalı Parçalar</span>
                    <ul className="text-[11px] text-slate-300 flex flex-col gap-1.5">
                      {localPaintedParts.map(p => (
                        <li key={p} className="flex items-center justify-between bg-orange-500/10 px-2 py-1 rounded-md text-[10px] border border-orange-500/10">
                          <span>{PART_LABELS[p] || p.replace(/_/g, " ")}</span>
                          <span className="font-bold text-orange-400">Lokal Boya</span>
                        </li>
                      ))}
                      {paintedParts.map(p => (
                        <li key={p} className="flex items-center justify-between bg-blue-500/10 px-2 py-1 rounded-md text-[10px] border border-blue-500/10">
                          <span>{PART_LABELS[p] || p.replace(/_/g, " ")}</span>
                          <span className="font-bold text-blue-400">Boyalı</span>
                        </li>
                      ))}
                      {localPaintedParts.length === 0 && paintedParts.length === 0 && (
                        <span className="text-slate-500 font-bold text-[10px] italic">Hiç seçilmedi.</span>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2 bg-slate-950/45 p-4 border border-white/5 rounded-2xl h-fit">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">🔄 Değişen Parçalar</span>
                    <ul className="text-[11px] text-slate-300 flex flex-col gap-1.5">
                      {changedParts.map(p => (
                        <li key={p} className="flex items-center justify-between bg-red-500/10 px-2 py-1 rounded-md text-[10px] border border-red-500/10">
                          <span>{PART_LABELS[p] || p.replace(/_/g, " ")}</span>
                          <span className="font-bold text-red-400">Değişen</span>
                        </li>
                      ))}
                      {changedParts.length === 0 && (
                        <span className="text-slate-500 font-bold text-[10px] italic">Hiç seçilmedi.</span>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Bakım & Servis Geçmişi</label>
              <input
                type="text"
                value={maintenanceHistory}
                onChange={(e) => setMaintenanceHistory(e.target.value)}
                placeholder="Örn: Son 90bin bakımı yetkili serviste yapıldı."
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border border-white/10 text-slate-300 font-bold py-3 rounded-2xl hover:bg-white/5 transition"
            >
              Geri
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-2xl transition"
            >
              Devam Et
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Photo upload */}
      {step === 4 && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-200">📷 Adım 4: Görsel Yükle</h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-850 px-2.5 py-1 rounded-lg">
              {uploadedPhotos.length} / 10 Fotoğraf
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Aracınızın ön, arka, yan açılardan ve kadran / iç kabin detaylarını gösteren fotoğraflarını yükleyin. Minimum 1 fotoğraf olmadan ilan PENDING_REVIEW aşamasına geçemez.
          </p>

          {/* Upload Input Area */}
          <div className="relative border-2 border-dashed border-white/10 hover:border-orange-500/40 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-950/20 transition cursor-pointer">
            <input
              type="file"
              onChange={handlePhotoUpload}
              disabled={uploading}
              accept="image/jpeg,image/png,image/webp"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-3xl">{uploading ? "⏳" : "📤"}</span>
            <span className="text-xs font-bold text-slate-300">
              {uploading ? "Fotoğraf yükleniyor..." : "Dosya Seçin ya da Sürükleyin"}
            </span>
            <span className="text-[10px] text-slate-500">Maksimum 5MB • JPEG, PNG, WebP</span>
          </div>

          {mediaError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl font-bold">{mediaError}</p>}

          {/* Grid of uploaded photos */}
          {uploadedPhotos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              {uploadedPhotos.map((photo, index) => (
                <div key={photo.id} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group">
                  <img src={photo.url} alt="Uploaded car" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => deletePhoto(photo.id, photo.listingId)}
                      className="bg-red-600 text-white rounded-lg p-1.5 text-[10px] font-bold hover:bg-red-500 transition"
                    >
                      Sil
                    </button>
                  </div>
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 text-[8px] bg-orange-600 text-white font-bold px-1.5 py-0.5 rounded">
                      Kapak Görseli
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 border border-white/10 text-slate-300 font-bold py-3 rounded-2xl hover:bg-white/5 transition"
            >
              Geri
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-2xl transition"
            >
              Devam Et
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Quota Check, Terms and Confirmation */}
      {step === 5 && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-lg font-bold text-slate-200">🚀 Adım 5: Yayınlama Onayı</h2>

          {/* Quota indicator box */}
          {loadingQuota ? (
            <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/20 text-center text-xs text-slate-400">Quota verileri yükleniyor...</div>
          ) : quota ? (
            <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/10 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aktif Yayın Limitiniz</span>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-300 font-medium">Abonelik Tipi: <strong className="text-slate-100">{quota.tier}</strong></span>
                <span className="font-bold text-slate-200">{quota.activeCount} / {quota.limit} İlan</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2">
                <div
                  className="bg-orange-600 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (quota.activeCount / quota.limit) * 100)}%` }}
                />
              </div>
              {quota.remaining === 0 && (
                <p className="text-[10px] text-amber-500 italic mt-2">
                  ⚠️ Limitiniz dolmuştur. İlanı şimdilik taslak (DRAFT) olarak kaydedebilirsiniz. Yayınlamak için paketi yükseltmeniz gerekir.
                </p>
              )}
            </div>
          ) : null}

          {/* Legal check */}
          <div className="flex items-start gap-3 cursor-pointer bg-slate-900/40 p-5 rounded-2xl border border-white/5">
            <input
              type="checkbox"
              id="responsibilityCheckbox"
              checked={responsibilityAccepted}
              onChange={(e) => setResponsibilityAccepted(e.target.checked)}
              className="accent-orange-500 rounded border-white/10 mt-1"
            />
            <label htmlFor="responsibilityCheckbox" className="text-xs text-slate-300 cursor-pointer select-none leading-relaxed">
              İlanda paylaştığım kilometre, hasar, boya, değişen, tramer, bakım ve açıklama bilgilerinin doğruluğundan ben sorumluyum. TorqueScout bu bilgileri doğrulamış sayılmaz.
            </label>
          </div>

          {errorMsg && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl font-bold">{errorMsg}</p>}

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            <button
              onClick={() => setStep(4)}
              className="w-full sm:w-1/3 border border-white/10 text-slate-300 font-bold py-3.5 rounded-2xl hover:bg-white/5 transition text-sm"
            >
              Geri
            </button>
            <button
              onClick={() => handleSaveAndPublish(true)}
              disabled={saving}
              className="w-full sm:w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-2xl transition text-sm"
            >
              Taslak Olarak Kaydet
            </button>
            <button
              onClick={() => handleSaveAndPublish(false)}
              disabled={saving || (quota ? quota.remaining === 0 : false)}
              className="w-full sm:w-1/3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-950 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition text-sm shadow-lg shadow-orange-600/15"
            >
              {saving ? "Yayınlanıyor..." : "İncelemeye Gönder"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
