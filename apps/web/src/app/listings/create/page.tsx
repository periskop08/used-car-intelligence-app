"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TURKEY_CITIES, getDistrictsForCity, resolveHorsepower } from "@used-car-intelligence/shared";
import { AlertCircle, AlertTriangle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const PAINTED_COMPONENTS = [
  "FRONT_BUMPER", "REAR_BUMPER", "HOOD", "ROOF", "TRUNK",
  "LEFT_FRONT_DOOR", "LEFT_REAR_DOOR", "RIGHT_FRONT_DOOR", "RIGHT_REAR_DOOR",
  "LEFT_FRONT_FENDER", "LEFT_REAR_FENDER", "RIGHT_FRONT_FENDER", "RIGHT_REAR_FENDER"
];

const BODY_TYPE_LABELS: Record<string, string> = {
  SEDAN: "Sedan",
  HATCHBACK: "Hatchback",
  SUV: "SUV",
  COUPE: "Coupe",
  CABRIO: "Cabrio / Convertible",
  STATION_WAGON: "Station Wagon",
  MINIVAN: "Minivan / MPV",
  PICKUP: "Pick-up",
  VAN: "Panelvan / Minibüs"
};

const formatNumberInput = (val: string | number) => {
  if (val === "" || val === undefined || val === null) return "";
  const numStr = String(val).replace(/\D/g, "");
  if (!numStr) return "";
  return parseInt(numStr, 10).toLocaleString("tr-TR");
};

const parseNumberInput = (val: string): string => {
  return val.replace(/\D/g, "");
};

import QuotaBadge from "@/components/QuotaBadge";
import ListingPromotionCards, { PromotionSku } from "@/components/listings/ListingPromotionCards";
import UrgentListingPaymentRecovery from "@/components/listings/UrgentListingPaymentRecovery";
import { formatImageUrl } from "@/utils/media";

export default function CreateListing() {
  const router = useRouter();

  // Wizard Step State
  const [step, setStep] = useState(1);
  const [token, setToken] = useState("");

  // Promotion State
  const [selectedPromotionSku, setSelectedPromotionSku] = useState<PromotionSku>(null);
  const [promotionTermsAccepted, setPromotionTermsAccepted] = useState(false);
  const [promotionPricingDetails, setPromotionPricingDetails] = useState<any>(null);
  const [paymentRecoveryOpen, setPaymentRecoveryOpen] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Step 1: Vehicle selection (Marka, Model, Yıl)
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(""); // Exact vehicleVariantId

  // Custom details fallback if variant doesn't exist
  const [useCustomVariant, setUseCustomVariant] = useState(false);
  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customYear, setCustomYear] = useState("");

  // Step 2: Canonical Vehicle Attributes
  const [selectedBodyType, setSelectedBodyType] = useState("");
  const [selectedTrim, setSelectedTrim] = useState("");
  const [selectedEngineVariant, setSelectedEngineVariant] = useState("");

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

  // Fetch models on Brand change
  useEffect(() => {
    setSelectedModel("");
    setSelectedYear("");
    setVariants([]);
    setSelectedVariant("");
    setSelectedBodyType("");
    setSelectedTrim("");
    setSelectedEngineVariant("");

    if (!selectedBrand) {
      setModels([]);
      return;
    }

    fetch(`${API_URL}/vehicles/models?brandId=${selectedBrand}`)
      .then((res) => res.json())
      .then((data) => setModels(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching models:", e));
  }, [selectedBrand]);

  // Fetch variants on Model change
  useEffect(() => {
    setSelectedYear("");
    setSelectedVariant("");
    setSelectedBodyType("");
    setSelectedTrim("");
    setSelectedEngineVariant("");

    if (!selectedModel) {
      setVariants([]);
      return;
    }

    fetch(`${API_URL}/vehicles/variants?modelId=${selectedModel}`)
      .then((res) => res.json())
      .then((data) => setVariants(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching variants:", e));
  }, [selectedModel]);

  // Compute available years from variants
  const availableYears = Array.from(
    new Set(variants.map((v) => v.year).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a));

  // Step 2 Candidates Filtering
  const yearCandidates = variants.filter(
    (v) => String(v.year) === String(selectedYear)
  );

  const availableBodyTypes = Array.from(
    new Set(yearCandidates.map((v) => v.bodyType || "SEDAN").filter(Boolean))
  );

  useEffect(() => {
    if (availableBodyTypes.length === 1 && !selectedBodyType) {
      setSelectedBodyType(availableBodyTypes[0]);
    }
  }, [availableBodyTypes, selectedBodyType]);

  const bodyCandidates = yearCandidates.filter(
    (v) => (v.bodyType || "SEDAN") === selectedBodyType
  );

  const availableTrims = Array.from(
    new Set(bodyCandidates.map((v) => v.trim?.name).filter(Boolean))
  );

  useEffect(() => {
    if (availableTrims.length === 1 && !selectedTrim) {
      setSelectedTrim(availableTrims[0]);
    }
  }, [availableTrims, selectedTrim]);

  const trimCandidates = bodyCandidates.filter(
    (v) => !selectedTrim || v.trim?.name === selectedTrim
  );

  const availableEngineVariants = Array.from(
    new Set(
      trimCandidates
        .map((v) => `${v.engine?.code || v.engine?.name || ""} (${v.transmission?.name || ""})`.trim())
        .filter(Boolean)
    )
  );

  const finalCandidates = selectedEngineVariant
    ? trimCandidates.filter(
        (v) =>
          `${v.engine?.code || v.engine?.name || ""} (${v.transmission?.name || ""})`.trim() ===
          selectedEngineVariant
      )
    : trimCandidates;

  const availableDisplacements = Array.from(
    new Set(
      finalCandidates
        .map((v) => v.engine?.displacement || v.engine?.displacementCc || (typeof v.specs?.specs === 'object' ? v.specs?.specs?.engineDisplacement : v.specs?.engineDisplacement))
        .filter(Boolean)
    )
  );

  const availablePowers = Array.from(
    new Set(
      finalCandidates
        .map((v) => resolveHorsepower(v))
        .filter(Boolean) as number[]
    )
  );

  useEffect(() => {
    if (!useCustomVariant && availableDisplacements.length > 0) {
      const firstDisp = String(availableDisplacements[0]);
      if (availableDisplacements.length === 1 || !engineDisplacement || !availableDisplacements.map(String).includes(String(engineDisplacement))) {
        setEngineDisplacement(firstDisp);
      }
    }
  }, [availableDisplacements, useCustomVariant]);

  useEffect(() => {
    if (!useCustomVariant && availablePowers.length > 0) {
      const firstHp = String(availablePowers[0]);
      if (availablePowers.length === 1 || !enginePower || !availablePowers.map(String).includes(String(enginePower))) {
        setEnginePower(firstHp);
      }
    }
  }, [availablePowers, useCustomVariant]);

  // Exact Variant Resolution Effect
  useEffect(() => {
    if (useCustomVariant) return;

    if (finalCandidates.length === 1) {
      const exact = finalCandidates[0];
      setSelectedVariant(exact.id);

      // Auto populate / sync technical fields
      if (exact.fuelType) setFuelType(exact.fuelType);
      if (exact.transmission?.type) setTransmission(exact.transmission.type);
      if (exact.bodyType) setBodyType(exact.bodyType);

      const disp = exact.engine?.displacement || exact.engine?.displacementCc || (typeof exact.specs?.specs === 'object' ? exact.specs?.specs?.engineDisplacement : exact.specs?.engineDisplacement);
      if (disp) setEngineDisplacement(String(disp));

      const hp = resolveHorsepower(exact);
      if (hp) setEnginePower(String(hp));

      const dt = typeof exact.specs?.specs === 'object' ? exact.specs?.specs?.drivetrain : exact.specs?.drivetrain;
      if (dt) setDrivetrain(dt);
    } else {
      setSelectedVariant("");
    }
  }, [finalCandidates, useCustomVariant]);

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

  // State to hold temporary listing ID created during photo upload
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  const createDraftListingOrGetId = async (): Promise<string> => {
    if (createdListingId) return createdListingId;

    const parsedPrice = parseNumberInput(priceAmount);
    const parsedKm = parseNumberInput(kilometers);

    const brandObj = brands.find((b) => b.id === selectedBrand);
    const modelObj = models.find((m) => m.id === selectedModel);

    const draftPayload = {
      title: title || `${brandObj?.name || customBrand} ${modelObj?.name || customModel}`,
      description: description || "Henüz açıklama girilmedi.",
      priceAmount: parsedPrice ? parseFloat(parsedPrice) : 0,
      currency: "TRY",
      countryCode: "TR",
      city: city || "İstanbul",
      district: district || "Kadıköy",
      modelYear: parseInt(selectedYear || customYear || "2020", 10),
      kilometers: parsedKm ? parseInt(parsedKm, 10) : 0,
      fuelType,
      transmission,
      bodyType: selectedBodyType || bodyType,
      color: color || "Belirtilmedi",
      vehicleStatus,
      hasWarranty,
      heavyDamage,
      plateType,
      sellerType,
      exchangeable,
      engineDisplacement: engineDisplacement ? parseInt(engineDisplacement, 10) : null,
      enginePower: enginePower ? parseInt(enginePower, 10) : null,
      drivetrain,
      damageRecord,
      tramerAmount: parseInt(tramerAmount, 10) || 0,
      paintedParts,
      changedParts,
      localPaintedParts,
      maintenanceHistory,
      vehicleVariantId: !useCustomVariant ? selectedVariant : null,
    };

    const res = await fetch(`${API_URL}/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(draftPayload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Taslak oluşturulamadı.");
    }

    const created = await res.json();
    setCreatedListingId(created.id);
    return created.id;
  };

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

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    createDraftListingOrGetId()
      .then((listingId) => {
        return fetch(`${API_URL}/listings/${listingId}/media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
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
        setMediaError(err.message || "Fotoğraf yüklenirken bir hata oluştu.");
        setUploading(false);
      });
  };

  const handleDeletePhoto = (mediaId: string) => {
    if (!createdListingId) return;
    fetch(`${API_URL}/listings/${createdListingId}/media/${mediaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          setUploadedPhotos((prev) => prev.filter((p) => p.id !== mediaId));
        }
      })
      .catch((e) => console.error("Error deleting photo:", e));
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

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!responsibilityAccepted) {
      setErrorMsg("Lütfen ilan yayınlama kurallarını ve sorumluluk beyanını kabul edin.");
      return;
    }

    setSaving(true);

    const parsedPrice = parseNumberInput(priceAmount);
    const parsedKm = parseNumberInput(kilometers);

    const brandObj = brands.find((b) => b.id === selectedBrand);
    const modelObj = models.find((m) => m.id === selectedModel);

    const payload = {
      title,
      description,
      priceAmount: parseFloat(parsedPrice) || 0,
      currency: "TRY",
      countryCode: "TR",
      city,
      district,
      modelYear: parseInt(selectedYear || customYear, 10),
      kilometers: parseInt(parsedKm, 10) || 0,
      fuelType,
      transmission,
      bodyType: selectedBodyType || bodyType,
      color,
      vehicleStatus,
      hasWarranty,
      heavyDamage,
      plateType,
      sellerType,
      exchangeable,
      engineDisplacement: engineDisplacement ? parseInt(engineDisplacement, 10) : null,
      enginePower: enginePower ? parseInt(enginePower, 10) : null,
      drivetrain,
      damageRecord,
      tramerAmount: parseInt(tramerAmount, 10) || 0,
      paintedParts,
      changedParts,
      localPaintedParts,
      maintenanceHistory,
      vehicleVariantId: !useCustomVariant ? selectedVariant : null,
      customBrand: useCustomVariant ? customBrand : undefined,
      customModel: useCustomVariant ? customModel : undefined,
      customYear: useCustomVariant ? parseInt(customYear, 10) : undefined,
    };

    const savePromise = createdListingId
      ? fetch(`${API_URL}/listings/${createdListingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
      : fetch(`${API_URL}/listings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

    savePromise
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message || "İlan kaydedilemedi.");
          });
        }
        return res.json();
      })
      .then((listing) => {
        return fetch(`${API_URL}/listings/${listing.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "PENDING_REVIEW" }),
        }).then((res) => {
          if (!res.ok) {
            return res.json().then((err) => {
              throw new Error(err.message || "İlan incelemeye gönderilemedi.");
            });
          }
          return listing;
        });
      })
      .then((listing) => {
        if (selectedPromotionSku) {
          return fetch(`${API_URL}/listing-promotions/purchase`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              listingId: listing.id,
              sku: selectedPromotionSku,
              termsAccepted: true,
            }),
          })
            .then((res) => res.json())
            .then((purchaseRes) => {
              setSaving(false);
              router.push(purchaseRes.redirectUrl || "/dashboard/listings?tab=active");
            })
            .catch(() => {
              setSaving(false);
              router.push("/dashboard/listings?tab=active");
            });
        } else {
          setSaving(false);
          router.push("/dashboard/listings?tab=active");
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || "İlan oluşturulurken bir hata oluştu.");
        setSaving(false);
      });
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    setDistrict(""); // Reset district when city changes
  };

  const availableDistricts = getDistrictsForCity(city);

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8 font-sans">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-200 tracking-tight">➕ Yeni İlan Ver</h1>
          <p className="text-sm text-slate-400 mt-1">Aracınızı TorqueScout ilan ağına ekleyin.</p>
        </div>
        <QuotaBadge feature="activeListings" />
      </div>

      {/* Step Progress Bar */}
      <div className="flex items-center justify-between bg-slate-900/30 border border-white/5 p-4 rounded-2xl">
        <div className="grid grid-cols-5 gap-2 w-full">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s <= step ? "bg-orange-500" : "bg-slate-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: Select Vehicle / Variant */}
      {step === 1 && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-lg font-bold text-slate-200">🚗 Adım 1: Araç Seçimi</h2>
          <p className="text-xs text-slate-400">Aracınızın veritabanı kaydına bağlanabilmesi için Marka, Model ve Model Yılı seçiniz.</p>

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
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition disabled:opacity-40"
                >
                  <option value="">Seçiniz...</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Model Yılı</label>
                <select
                  value={selectedYear}
                  disabled={!selectedModel || availableYears.length === 0}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition disabled:opacity-40"
                >
                  <option value="">Seçiniz...</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
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
            disabled={!useCustomVariant ? (!selectedBrand || !selectedModel || !selectedYear) : (!customBrand || !customModel || !customYear)}
            className="w-full mt-4 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-2xl transition cursor-pointer"
          >
            Devam Et
          </button>
        </div>
      )}

      {/* STEP 2: Basic Details */}
      {step === 2 && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-lg font-bold text-slate-200">📝 Adım 2: İlan Detayları</h2>

          {!useCustomVariant && (
            <div className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col gap-3">
              <span className="text-xs font-bold text-orange-400">🚗 Seçilen Araç Kombinasyonu:</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kasa Tipi</label>
                  <select
                    value={selectedBodyType}
                    onChange={(e) => setSelectedBodyType(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">Kasa Tipi Seçiniz...</option>
                    {availableBodyTypes.map((bt) => (
                      <option key={bt} value={bt}>{BODY_TYPE_LABELS[bt] || bt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Donanım Paketi</label>
                  <select
                    value={selectedTrim}
                    onChange={(e) => setSelectedTrim(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">Donanım Paketi Seçiniz...</option>
                    {availableTrims.map((tr) => (
                      <option key={tr} value={tr}>{tr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {availableEngineVariants.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Motor / Versiyon</label>
                  <select
                    value={selectedEngineVariant}
                    onChange={(e) => setSelectedEngineVariant(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">Motor Versiyonu Seçiniz...</option>
                    {availableEngineVariants.map((ev) => (
                      <option key={ev} value={ev}>{ev}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Match Resolution Banner */}
              {finalCandidates.length === 0 ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>Seçilen araç kombinasyonu araç veritabanıyla eşleştirilemedi. Lütfen araç bilgilerini kontrol edin.</span>
                </div>
              ) : finalCandidates.length === 1 ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <span>✅ Araç Veritabanı Eşleşmesi Başarılı: (ID: {finalCandidates[0].id.slice(0, 8)}...)</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <span>ℹ️ Tam araç eşleşmesi için lütfen Donanım Paketi / Motor Versiyonunu seçiniz ({finalCandidates.length} aday eşleşti).</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">İlan Başlığı</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Hatasız Düşük Kilometreli Araç"
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Fiyat (TL)</label>
                <input
                  type="text"
                  value={formatNumberInput(priceAmount)}
                  onChange={(e) => setPriceAmount(parseNumberInput(e.target.value))}
                  placeholder="Örn: 1.000.000"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kilometre</label>
                <input
                  type="text"
                  value={formatNumberInput(kilometers)}
                  onChange={(e) => setKilometers(parseNumberInput(e.target.value))}
                  placeholder="Örn: 128.500"
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            {/* City & District Dependent Dropdowns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Şehir (81 İl)</label>
                <select
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                >
                  <option value="">Şehir Seçiniz...</option>
                  {TURKEY_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">İlçe</label>
                <select
                  value={district}
                  disabled={!city || availableDistricts.length === 0}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition disabled:opacity-40"
                >
                  <option value="">İlçe Seçiniz...</option>
                  {availableDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Yakıt</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  disabled={!useCustomVariant && finalCandidates.length === 1}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60"
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
                  disabled={!useCustomVariant && finalCandidates.length === 1}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60"
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
                  <option value="TR_PLATE">Türkiye (TR) Plakalı</option>
                  <option value="MA_PLATE">MA (Misafir) Plakalı</option>
                  <option value="SPECIAL_PLATE">Özel / Yabancı Plaka</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Motor Hacmi (cc)</label>
                {!useCustomVariant && availableDisplacements.length > 0 ? (
                  <select
                    value={engineDisplacement}
                    onChange={(e) => setEngineDisplacement(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">Motor Hacmi Seçiniz...</option>
                    {availableDisplacements.map((disp) => (
                      <option key={disp} value={String(disp)}>{disp} cc</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={engineDisplacement}
                    onChange={(e) => setEngineDisplacement(e.target.value)}
                    placeholder="Örn: 1598"
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Motor Gücü (HP)</label>
                {!useCustomVariant && availablePowers.length > 0 ? (
                  <select
                    value={enginePower}
                    onChange={(e) => setEnginePower(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                  >
                    <option value="">Motor Gücü Seçiniz...</option>
                    {availablePowers.map((hp) => (
                      <option key={hp} value={String(hp)}>{hp} HP</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={enginePower}
                    onChange={(e) => setEnginePower(e.target.value)}
                    placeholder="Örn: 110"
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Çekiş</label>
                <select
                  value={drivetrain}
                  onChange={(e) => setDrivetrain(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                >
                  <option value="FWD">Önden Çekiş</option>
                  <option value="RWD">Arkadan İtiş</option>
                  <option value="AWD">Dört Çeker (AWD / 4x4)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasWarranty}
                  onChange={(e) => setHasWarranty(e.target.checked)}
                  className="accent-orange-500 rounded border-white/10"
                />
                Garanti Kapsamında
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-rose-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heavyDamage}
                  onChange={(e) => setHeavyDamage(e.target.checked)}
                  className="accent-rose-500 rounded border-white/10"
                />
                Ağır Hasar Kaydı Var
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exchangeable}
                  onChange={(e) => setExchangeable(e.target.checked)}
                  className="accent-orange-500 rounded border-white/10"
                />
                Takasa Uygun
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setStep(1)}
              className="w-1/3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3.5 rounded-2xl transition cursor-pointer"
            >
              Geri
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={
                !title ||
                !priceAmount ||
                !kilometers ||
                !city ||
                !district ||
                (!useCustomVariant && !selectedVariant)
              }
              className="w-2/3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-2xl transition cursor-pointer"
            >
              Devam Et (Boya & Hasar Adımı)
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Condition & Paint checklist */}
      {step === 3 && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6 font-sans">
          <h2 className="text-lg font-bold text-slate-200">🛠️ Adım 3: Boya, Değişen ve Tramer Bilgisi</h2>
          <p className="text-xs text-slate-400">Aracınızın kaporta ve ekspertiz durumunu şeffafça işaretleyin.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Tramer Hasar Kaydı Tutarı (TL)</label>
              <input
                type="number"
                value={tramerAmount}
                onChange={(e) => setTramerAmount(e.target.value)}
                placeholder="Örn: 5000"
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Hasar Kaydı Açıklaması</label>
              <input
                type="text"
                value={damageRecord}
                onChange={(e) => setDamageRecord(e.target.value)}
                placeholder="Örn: Sol ön çamurluk değişti"
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-300">Boya & Değişen Parçaları Seçin:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAINTED_COMPONENTS.map((part) => {
                const isPainted = paintedParts.includes(part);
                const isChanged = changedParts.includes(part);
                return (
                  <div key={part} className="flex flex-col gap-1 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] font-bold text-slate-300 truncate">{part.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleTogglePart(part, "painted")}
                        className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                          isPainted ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        Boyalı
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePart(part, "changed")}
                        className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                          isChanged ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        Değişen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Bakım Geçmişi & Notlar</label>
            <textarea
              value={maintenanceHistory}
              onChange={(e) => setMaintenanceHistory(e.target.value)}
              placeholder="Son yağ bakımı, triger değişimi vb. detayları yazabilirsiniz..."
              rows={3}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
            />
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setStep(2)}
              className="w-1/3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3.5 rounded-2xl transition cursor-pointer"
            >
              Geri
            </button>
            <button
              onClick={() => setStep(4)}
              className="w-2/3 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl transition cursor-pointer"
            >
              Devam Et (Fotoğraf Yükleme)
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Photo uploads */}
      {step === 4 && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6 font-sans">
          <h2 className="text-lg font-bold text-slate-200">📸 Adım 4: Araç Fotoğrafları</h2>
          <p className="text-xs text-slate-400">İlanınız için en fazla 10 fotoğraf yükleyebilirsiniz. En az 1 görsel gereklidir.</p>

          {mediaError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold">
              {mediaError}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {uploadedPhotos.map((photo, idx) => (
              <div key={photo.id || idx} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-white/10 group">
                <img src={photo.url} alt="Uploaded" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}

            {uploadedPhotos.length < 10 && (
              <label className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-orange-500/50 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/30">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? (
                  <span className="text-xs text-slate-400 animate-pulse">Yükleniyor...</span>
                ) : (
                  <>
                    <span className="text-2xl">➕</span>
                    <span className="text-[11px] font-bold text-slate-400 mt-1">Fotoğraf Yükle</span>
                  </>
                )}
              </label>
            )}
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setStep(3)}
              className="w-1/3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3.5 rounded-2xl transition cursor-pointer"
            >
              Geri
            </button>
            <button
              onClick={() => setStep(5)}
              disabled={uploadedPhotos.length === 0}
              className="w-2/3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-2xl transition cursor-pointer"
            >
              Devam Et (Onay ve Yayınlama)
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Quota & Confirm */}
      {step === 5 && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6 font-sans">
          <h2 className="text-lg font-bold text-slate-200">🚀 Adım 5: İlanı İncelemeye Gönder</h2>

          {loadingQuota ? (
            <div className="text-xs text-slate-400">Kota bilgisi kontrol ediliyor...</div>
          ) : quota ? (
            <div className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col gap-2">
              <span className="text-xs text-slate-400 font-bold">Mevcut Paketiniz: <strong className="text-orange-400">{quota.tier}</strong></span>
              <span className="text-xs text-slate-400 font-bold">Aktif İlan Kullanımınız: <strong className="text-white">{quota.activeCount} / {quota.limit}</strong></span>
            </div>
          ) : null}

          {/* Promotion Selection */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-200">İlanınızı Öne Çıkarın (Opsiyonel)</h3>
            <ListingPromotionCards
              selectedSku={selectedPromotionSku}
              onSelectSku={(sku) => setSelectedPromotionSku(sku)}
              termsAccepted={promotionTermsAccepted}
              onTermsAcceptedChange={setPromotionTermsAccepted}
            />
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              id="responsibilityCheckbox"
              checked={responsibilityAccepted}
              onChange={(e) => setResponsibilityAccepted(e.target.checked)}
              className="accent-orange-500 rounded border-white/10"
            />
            <label htmlFor="responsibilityCheckbox" className="text-xs text-slate-300 cursor-pointer select-none">
              İlan verdiğim aracın ruhsat sahibi/yetkili satıcısı olduğumu ve doğru bilgi verdiğimi beyan ederim.
            </label>
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setStep(4)}
              className="w-1/3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3.5 rounded-2xl transition cursor-pointer"
            >
              Geri
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={saving || !responsibilityAccepted}
              className="w-2/3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? "Kaydediliyor..." : "İlanı İncelemeye Gönder ➔"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
