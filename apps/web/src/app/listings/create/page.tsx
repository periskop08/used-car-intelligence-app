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

            {/* Painted parts select checklist */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300">Boyalı Parçalar</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {PAINTED_COMPONENTS.map((part) => {
                  const isSelected = paintedParts.includes(part);
                  return (
                    <button
                      key={part}
                      type="button"
                      onClick={() => handleTogglePart(part, "painted")}
                      className={`text-[10px] font-bold py-2 px-3 rounded-xl border text-center transition ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-500 text-amber-400"
                          : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10"
                      }`}
                    >
                      {part.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Changed parts select checklist */}
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs font-bold text-slate-300">Değişen Parçalar</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {PAINTED_COMPONENTS.map((part) => {
                  const isSelected = changedParts.includes(part);
                  return (
                    <button
                      key={part}
                      type="button"
                      onClick={() => handleTogglePart(part, "changed")}
                      className={`text-[10px] font-bold py-2 px-3 rounded-xl border text-center transition ${
                        isSelected
                          ? "bg-red-500/20 border-red-500 text-red-400"
                          : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10"
                      }`}
                    >
                      {part.replace(/_/g, " ")}
                    </button>
                  );
                })}
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
