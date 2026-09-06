"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TURKEY_CITIES, getDistrictsForCity } from "@used-car-intelligence/shared";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const PAINTED_COMPONENTS = [
  "FRONT_BUMPER", "REAR_BUMPER", "HOOD", "ROOF", "TRUNK",
  "LEFT_FRONT_DOOR", "LEFT_REAR_DOOR", "RIGHT_FRONT_DOOR", "RIGHT_REAR_DOOR",
  "LEFT_FRONT_FENDER", "LEFT_REAR_FENDER", "RIGHT_FRONT_FENDER", "RIGHT_REAR_FENDER"
];

const PART_LABELS: Record<string, string> = {
  FRONT_BUMPER: "Ön Tampon",
  REAR_BUMPER: "Arka Tampon",
  HOOD: "Kaput",
  ROOF: "Tavan",
  TRUNK: "Bagaj Kapağı",
  LEFT_FRONT_FENDER: "Sol Ön Çamurluk",
  RIGHT_FRONT_FENDER: "Sağ Ön Çamurluk",
  LEFT_FRONT_DOOR: "Sol Ön Kapı",
  RIGHT_FRONT_DOOR: "Sağ Ön Kapı",
  LEFT_REAR_DOOR: "Sol Arka Kapı",
  RIGHT_REAR_DOOR: "Sağ Arka Kapı",
  LEFT_REAR_FENDER: "Sol Arka Çamurluk",
  RIGHT_REAR_FENDER: "Sağ Arka Çamurluk",
};

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
import { vehicleTaxonomyApi, TaxonomyOption } from "@/services/vehicleTaxonomyApi";

const mapToBodyTypeEnum = (bt: string): string => {
  const clean = (bt || "").toLowerCase().trim();
  if (clean === "sedan") return "SEDAN";
  if (clean === "hatchback") return "HATCHBACK";
  if (clean === "suv") return "SUV";
  if (clean === "coupe") return "COUPE";
  if (clean === "cabrio" || clean === "cabriolet" || clean === "convertible") return "CONVERTIBLE";
  if (clean === "station wagon" || clean === "wagon") return "WAGON";
  if (clean === "minivan" || clean === "mpv") return "MINIVAN";
  if (clean === "panelvan" || clean === "van") return "VAN";
  if (clean === "pick-up" || clean === "pickup") return "PICKUP";
  return "SEDAN";
};

const mapToFuelTypeEnum = (ft: string): string => {
  const clean = (ft || "").toLowerCase().trim();
  if (clean === "benzin") return "PETROL";
  if (clean === "dizel") return "DIESEL";
  if (clean === "hibrit") return "HYBRID";
  if (clean === "elektrik") return "ELECTRIC";
  if (clean === "lpg" || clean.includes("lpg")) return "LPG";
  return "PETROL";
};

const mapToTransmissionEnum = (tr: string): string => {
  const clean = (tr || "").toLowerCase().trim();
  if (clean === "manuel" || clean.includes("manuel") || clean.includes("düz")) return "MANUAL";
  return "AUTOMATIC";
};

export default function CreateListing() {
  const router = useRouter();

  // Wizard Step State
  const [step, setStep] = useState(1);
  const [token, setToken] = useState("");

  // Promotion State
  const [selectedPromotionSku, setSelectedPromotionSku] = useState<PromotionSku>(null);
  const [promotionTermsAccepted, setPromotionTermsAccepted] = useState(false);
  const [promotionPricingDetails, setPromotionPricingDetails] = useState<any>(null);
  const [standardSuccessModalOpen, setStandardSuccessModalOpen] = useState(false);
  const [checkoutUnavailableModalOpen, setCheckoutUnavailableModalOpen] = useState(false);
  const [createdListingForModal, setCreatedListingForModal] = useState<any>(null);
  const [paymentError, setPaymentError] = useState("");

  // Step 1: Canonical Vehicle Taxonomy State
  const [brands, setBrands] = useState<TaxonomyOption[]>([]);
  const [models, setModels] = useState<TaxonomyOption[]>([]);
  const [years, setYears] = useState<TaxonomyOption[]>([]);
  const [bodyTypes, setBodyTypes] = useState<TaxonomyOption[]>([]);
  const [engines, setEngines] = useState<TaxonomyOption[]>([]);
  const [fuelTypes, setFuelTypes] = useState<TaxonomyOption[]>([]);
  const [transmissions, setTransmissions] = useState<TaxonomyOption[]>([]);
  const [trims, setTrims] = useState<TaxonomyOption[]>([]);

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingBodyTypes, setLoadingBodyTypes] = useState(false);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [loadingFuels, setLoadingFuels] = useState(false);
  const [loadingTransmissions, setLoadingTransmissions] = useState(false);
  const [loadingTrims, setLoadingTrims] = useState(false);
  const [matchingVariant, setMatchingVariant] = useState(false);

  // Selected Dimensions (Canonical strings)
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedBodyType, setSelectedBodyType] = useState("");
  const [selectedEngine, setSelectedEngine] = useState("");
  const [selectedFuelType, setSelectedFuelType] = useState("");
  const [selectedTransmission, setSelectedTransmission] = useState("");
  const [selectedTrim, setSelectedTrim] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(""); // Exact vehicleVariantId

  // Technical Specs Enrichment States (cc & HP)
  const [loadingTechSpecs, setLoadingTechSpecs] = useState(false);
  const [techSpecsVerified, setTechSpecsVerified] = useState(false);
  const [techSpecsConflict, setTechSpecsConflict] = useState(false);

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

    // Fetch Brands via shared vehicleTaxonomyApi
    setLoadingBrands(true);
    vehicleTaxonomyApi.getBrands()
      .then((data) => {
        setBrands(data);
        setLoadingBrands(false);
      })
      .catch((e) => {
        console.error("Error fetching brands:", e);
        setLoadingBrands(false);
      });

    // Fetch promotion catalog pricing
    fetch(`${API_URL}/listing-promotions/catalog`)
      .then((res) => res.json())
      .then((data) => setPromotionPricingDetails(data))
      .catch(() => null);
  }, []);

  // Cascade Handlers for 8 Canonical Dimensions
  const handleBrandChange = async (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("");
    setSelectedYear("");
    setSelectedBodyType("");
    setSelectedEngine("");
    setSelectedFuelType("");
    setSelectedTransmission("");
    setSelectedTrim("");
    setSelectedVariant("");

    setModels([]);
    setYears([]);
    setBodyTypes([]);
    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!brand) return;
    setLoadingModels(true);
    try {
      const data = await vehicleTaxonomyApi.getModels(brand);
      setModels(data);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    setSelectedYear("");
    setSelectedBodyType("");
    setSelectedEngine("");
    setSelectedFuelType("");
    setSelectedTransmission("");
    setSelectedTrim("");
    setSelectedVariant("");

    setYears([]);
    setBodyTypes([]);
    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!model || !selectedBrand) return;
    setLoadingYears(true);
    try {
      const data = await vehicleTaxonomyApi.getYears(selectedBrand, model);
      setYears(data);
      if (data.length === 1) {
        handleYearChange(data[0].value, model);
      }
    } finally {
      setLoadingYears(false);
    }
  };

  const handleYearChange = async (year: string, currentModel = selectedModel) => {
    setSelectedYear(year);
    setSelectedBodyType("");
    setSelectedEngine("");
    setSelectedFuelType("");
    setSelectedTransmission("");
    setSelectedTrim("");
    setSelectedVariant("");

    setBodyTypes([]);
    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!year || !currentModel || !selectedBrand) return;
    setLoadingBodyTypes(true);
    try {
      const data = await vehicleTaxonomyApi.getBodyTypes(selectedBrand, currentModel, year);
      setBodyTypes(data);
      if (data.length === 1) {
        handleBodyTypeChange(data[0].value, year, currentModel);
      }
    } finally {
      setLoadingBodyTypes(false);
    }
  };

  const handleBodyTypeChange = async (body: string, currentYear = selectedYear, currentModel = selectedModel) => {
    setSelectedBodyType(body);
    setSelectedEngine("");
    setSelectedFuelType("");
    setSelectedTransmission("");
    setSelectedTrim("");
    setSelectedVariant("");

    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!body || !currentYear || !currentModel || !selectedBrand) return;
    setLoadingEngines(true);
    try {
      const data = await vehicleTaxonomyApi.getEngines(selectedBrand, currentModel, currentYear, body);
      setEngines(data);
      if (data.length === 1) {
        handleEngineChange(data[0].value, body, currentYear, currentModel);
      }
    } finally {
      setLoadingEngines(false);
    }
  };

  const handleEngineChange = async (engine: string, currentBody = selectedBodyType, currentYear = selectedYear, currentModel = selectedModel) => {
    setSelectedEngine(engine);
    setSelectedFuelType("");
    setSelectedTransmission("");
    setSelectedTrim("");
    setSelectedVariant("");

    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!engine || !currentBody || !currentYear || !currentModel || !selectedBrand) return;
    setLoadingFuels(true);
    try {
      const data = await vehicleTaxonomyApi.getFuelTypes(selectedBrand, currentModel, currentYear, currentBody, engine);
      setFuelTypes(data);
      if (data.length === 1) {
        handleFuelTypeChange(data[0].value, engine, currentBody, currentYear, currentModel);
      }
    } finally {
      setLoadingFuels(false);
    }
  };

  const handleFuelTypeChange = async (fuel: string, currentEngine = selectedEngine, currentBody = selectedBodyType, currentYear = selectedYear, currentModel = selectedModel) => {
    setSelectedFuelType(fuel);
    setSelectedTransmission("");
    setSelectedTrim("");
    setSelectedVariant("");

    setTransmissions([]);
    setTrims([]);

    if (!fuel || !currentEngine || !currentBody || !currentYear || !currentModel || !selectedBrand) return;
    setLoadingTransmissions(true);
    try {
      const data = await vehicleTaxonomyApi.getTransmissions(selectedBrand, currentModel, currentYear, currentBody, currentEngine, fuel);
      setTransmissions(data);
      if (data.length === 1) {
        handleTransmissionChange(data[0].value, fuel, currentEngine, currentBody, currentYear, currentModel);
      }
    } finally {
      setLoadingTransmissions(false);
    }
  };

  const handleTransmissionChange = async (trans: string, currentFuel = selectedFuelType, currentEngine = selectedEngine, currentBody = selectedBodyType, currentYear = selectedYear, currentModel = selectedModel) => {
    setSelectedTransmission(trans);
    setSelectedTrim("");
    setSelectedVariant("");

    setTrims([]);

    if (!trans || !currentFuel || !currentEngine || !currentBody || !currentYear || !currentModel || !selectedBrand) return;
    setLoadingTrims(true);
    try {
      const data = await vehicleTaxonomyApi.getTrims(selectedBrand, currentModel, currentYear, currentBody, currentEngine, currentFuel, trans);
      setTrims(data);
      if (data.length === 1) {
        handleTrimChange(data[0].value, trans, currentFuel, currentEngine, currentBody, currentYear, currentModel);
      }
    } finally {
      setLoadingTrims(false);
    }
  };

  const handleTrimChange = async (trim: string, currentTrans = selectedTransmission, currentFuel = selectedFuelType, currentEngine = selectedEngine, currentBody = selectedBodyType, currentYear = selectedYear, currentModel = selectedModel) => {
    setSelectedTrim(trim);
    setSelectedVariant("");

    if (!trim || !currentTrans || !currentFuel || !currentEngine || !currentBody || !currentYear || !currentModel || !selectedBrand) return;

    setMatchingVariant(true);
    try {
      const res = await vehicleTaxonomyApi.matchVariant({
        brand: selectedBrand,
        model: currentModel,
        year: currentYear,
        bodyType: currentBody,
        engine: currentEngine,
        fuelType: currentFuel,
        transmission: currentTrans,
        trim,
      });

      if (res.success && res.variantId) {
        setSelectedVariant(res.variantId);
        setBodyType(mapToBodyTypeEnum(currentBody));
        setFuelType(mapToFuelTypeEnum(currentFuel));
        setTransmission(mapToTransmissionEnum(currentTrans));

        // Automatically resolve authoritative technical specs (Motor Hacmi cc + Motor Gücü HP)
        resolveTechnicalSpecs(res.variantId);
      } else {
        setSelectedVariant("");
        setTechSpecsVerified(false);
      }
    } catch (e) {
      console.error("Error matching variant:", e);
      setSelectedVariant("");
      setTechSpecsVerified(false);
    } finally {
      setMatchingVariant(false);
    }
  };

  const resolveTechnicalSpecs = async (variantId: string) => {
    if (!variantId) return;
    setLoadingTechSpecs(true);
    setTechSpecsConflict(false);
    try {
      // 1. Read existing verified technical facts
      let specs = await vehicleTaxonomyApi.getTechnicalSpecs(variantId);

      // 2. If missing cc or HP, trigger controlled authenticated enrichment
      if ((!specs?.engineDisplacementCc || !specs?.enginePowerHp) && token) {
        const enriched = await vehicleTaxonomyApi.enrichTechnicalSpecs(variantId, token);
        if (enriched) specs = enriched;
      }

      if (specs?.isCatalogVerified && specs.engineDisplacementCc && specs.enginePowerHp) {
        setEngineDisplacement(String(specs.engineDisplacementCc));
        setEnginePower(String(specs.enginePowerHp));
        setTechSpecsVerified(true);
        setTechSpecsConflict(false);
      } else if (specs?.engineDisplacementCc || specs?.enginePowerHp) {
        if (specs.engineDisplacementCc) setEngineDisplacement(String(specs.engineDisplacementCc));
        if (specs.enginePowerHp) setEnginePower(String(specs.enginePowerHp));
        setTechSpecsVerified(true);
      } else {
        setTechSpecsConflict(true);
      }
    } catch (err) {
      console.error("Technical specs resolution error:", err);
      setTechSpecsConflict(true);
    } finally {
      setLoadingTechSpecs(false);
    }
  };


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

    const vehicleTitleDefault = `${selectedBrand || customBrand} ${selectedModel || customModel} ${selectedTrim || ""}`.trim();

    const draftPayload = {
      title: title || vehicleTitleDefault || "Araç İlanı",
      description: description || "Henüz açıklama girilmedi.",
      priceAmount: parsedPrice ? parseFloat(parsedPrice) : 0,
      currency: "TRY",
      countryCode: "TR",
      city: city || "İstanbul",
      district: district || "Kadıköy",
      modelYear: parseInt(selectedYear || customYear || "2020", 10),
      kilometers: parsedKm ? parseInt(parsedKm, 10) : 0,
      fuelType: !useCustomVariant && selectedFuelType ? mapToFuelTypeEnum(selectedFuelType) : fuelType,
      transmission: !useCustomVariant && selectedTransmission ? mapToTransmissionEnum(selectedTransmission) : transmission,
      bodyType: !useCustomVariant && selectedBodyType ? mapToBodyTypeEnum(selectedBodyType) : bodyType,
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

    if (!useCustomVariant && selectedVariant) {
      if (loadingTechSpecs) {
        setErrorMsg("Motor teknik verileri (cc ve HP) doğrulanıyor, lütfen birkaç saniye bekleyin...");
        return;
      }
      if (techSpecsConflict || !engineDisplacement || !enginePower) {
        setErrorMsg("Seçilen katalog aracı için motor teknik özellikleri (cc / HP) henüz doğrulanamadı (TECHNICAL_SPEC_CONFLICT_REQUIRES_REVIEW). Lütfen araç seçimini gözden geçirin.");
        return;
      }
    }

    setSaving(true);

    const parsedPrice = parseNumberInput(priceAmount);
    const parsedKm = parseNumberInput(kilometers);

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
      fuelType: !useCustomVariant && selectedFuelType ? mapToFuelTypeEnum(selectedFuelType) : fuelType,
      transmission: !useCustomVariant && selectedTransmission ? mapToTransmissionEnum(selectedTransmission) : transmission,
      bodyType: !useCustomVariant && selectedBodyType ? mapToBodyTypeEnum(selectedBodyType) : bodyType,
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
      urgentRequested: selectedPromotionSku === "URGENT_LISTING" || selectedPromotionSku === "URGENT_SHOWCASE_BUNDLE",
      showcaseRequested: selectedPromotionSku === "SHOWCASE_FEED" || selectedPromotionSku === "URGENT_SHOWCASE_BUNDLE",
    };

    const isPaidPromotion = !!selectedPromotionSku;

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
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "İlan kaydedilemedi.");
        }
        return res.json();
      })
      .then(async (listing) => {
        setCreatedListingId(listing.id);
        setCreatedListingForModal(listing);

        // A. STANDARD LISTING (NO PROMOTION)
        if (!isPaidPromotion) {
          const statusRes = await fetch(`${API_URL}/listings/${listing.id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: "PENDING_REVIEW" }),
          });
          if (!statusRes.ok) {
            const err = await statusRes.json().catch(() => ({}));
            throw new Error(err.message || "İlan incelemeye gönderilemedi.");
          }
          setSaving(false);
          setStandardSuccessModalOpen(true);
          return;
        }

        // B. PROMOTION LISTING IN CONTROLLED TEST COMMERCE MODE
        const isTestMode = promotionPricingDetails?.commerceMode !== "LIVE";
        if (isTestMode) {
          try {
            const testRes = await fetch(`${API_URL}/listing-promotions/test-checkout/${listing.id}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                productSku: selectedPromotionSku,
              }),
            });
            const testData = await testRes.json();
            if (!testRes.ok) throw new Error(testData.message || "Test promosyon işlemi başlatılamadı.");

            setSaving(false);
            setStandardSuccessModalOpen(true);
            return;
          } catch (e: any) {
            console.error("Listing promotion test mode error:", e);
            setSaving(false);
            setErrorMsg(e.message || "Promosyonlu ilan incelemeye gönderilemedi.");
            return;
          }
        }

        // C. PROMOTION LISTING IN LIVE COMMERCE MODE (REQUIRES REAL GATEWAY)
        try {
          // 1. Generate Quote
          const quoteRes = await fetch(`${API_URL}/listing-promotions/quotes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              listingId: listing.id,
              productSku: selectedPromotionSku,
            }),
          });
          const quoteData = await quoteRes.json();
          if (!quoteRes.ok) throw new Error(quoteData.message || "Teklif alınamadı.");

          // 2. Initialize Checkout
          const idempotencyKey = `chk_crt_${listing.id}_${selectedPromotionSku}_${Date.now()}`;
          const checkoutRes = await fetch(`${API_URL}/listing-promotions/checkout/${listing.id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              quoteId: quoteData.quoteId,
              idempotencyKey,
              termsAccepted: true,
              termsVersion: quoteData.termsVersion || "v1",
              entryPoint: "LISTING_CREATE",
            }),
          });
          const checkoutData = await checkoutRes.json();
          if (!checkoutRes.ok) throw new Error(checkoutData.message || "Ödeme başlatılamadı.");

          setSaving(false);

          // 3. Check if checkout destination is legitimately available
          if (checkoutData.checkoutAvailable && checkoutData.paymentProviderUrl) {
            // Development-only testing shortcut
            if (process.env.NODE_ENV === "development" && checkoutData.purchaseId) {
              await fetch(`${API_URL}/listing-promotions/webhooks/mock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  eventType: "payment.success",
                  purchaseId: checkoutData.purchaseId,
                  paymentReferenceId: `PAY_DEV_${Date.now()}`,
                }),
              }).catch(() => null);
              router.push(`/listings/checkout/status?purchaseId=${checkoutData.purchaseId}&listingId=${listing.id}`);
              return;
            }

            window.location.href = checkoutData.paymentProviderUrl;
          } else {
            // Checkout destination is unavailable / missing DNS. Retain draft safely!
            setPaymentError(checkoutData.checkoutUnavailableMessage || "Ödeme işlemi şu anda başlatılamıyor.");
            setCheckoutUnavailableModalOpen(true);
          }
        } catch (e: any) {
          console.error("Listing promotion checkout error:", e);
          setSaving(false);
          setPaymentError(e.message || "Ödeme başlatılamadı.");
          setCheckoutUnavailableModalOpen(true);
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || "İlan oluşturulurken bir hata oluştu.");
        setSaving(false);
      });
  };

  const handleAbandonPromotionSubmit = async () => {
    if (!createdListingForModal?.id) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/listing-promotions/abandon/${createdListingForModal.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "İşlem gerçekleştirilemedi.");

      setCheckoutUnavailableModalOpen(false);
      setStandardSuccessModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
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
          <p className="text-xs text-slate-400">Aracınızın doğru teknik katalog verisine ve yapay zeka analizine bağlanabilmesi için aracınızı seçiniz.</p>

          <div className="flex items-center gap-2 cursor-pointer bg-slate-900/40 p-4 rounded-xl border border-white/5">
            <input
              type="checkbox"
              id="customVariantToggle"
              checked={useCustomVariant}
              onChange={(e) => {
                setUseCustomVariant(e.target.checked);
                if (e.target.checked) {
                  setSelectedVariant("");
                }
              }}
              className="accent-orange-500 rounded border-white/10"
            />
            <label htmlFor="customVariantToggle" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
              Aracımı listede bulamadım (Özel detaylar gireceğim)
            </label>
          </div>

          {!useCustomVariant ? (
            <div className="flex flex-col gap-5">
              {/* Row 1: Marka | Model | Model Yılı | Kasa Tipi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Marka</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                    disabled={loadingBrands}
                  >
                    <option value="">{loadingBrands ? "Yükleniyor..." : "Seçiniz..."}</option>
                    {brands.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Model</label>
                  <select
                    value={selectedModel}
                    disabled={!selectedBrand || loadingModels}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition disabled:opacity-40"
                  >
                    <option value="">{loadingModels ? "Yükleniyor..." : "Seçiniz..."}</option>
                    {models.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Model Yılı</label>
                  <select
                    value={selectedYear}
                    disabled={!selectedModel || loadingYears || years.length === 0}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition disabled:opacity-40"
                  >
                    <option value="">{loadingYears ? "Yükleniyor..." : "Seçiniz..."}</option>
                    {years.map((y) => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kasa Tipi</label>
                  <select
                    value={selectedBodyType}
                    disabled={!selectedYear || loadingBodyTypes || bodyTypes.length === 0}
                    onChange={(e) => handleBodyTypeChange(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition disabled:opacity-40"
                  >
                    <option value="">{loadingBodyTypes ? "Yükleniyor..." : "Seçiniz..."}</option>
                    {bodyTypes.map((bt) => (
                      <option key={bt.value} value={bt.value}>{BODY_TYPE_LABELS[bt.value] || bt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Motor / Versiyon | Yakıt Türü | Şanzıman Tipi | Donanım Paketi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Motor / Versiyon</label>
                  <select
                    value={selectedEngine}
                    disabled={!selectedBodyType || loadingEngines || engines.length === 0}
                    onChange={(e) => handleEngineChange(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition disabled:opacity-40"
                  >
                    <option value="">{loadingEngines ? "Yükleniyor..." : "Seçiniz..."}</option>
                    {engines.map((eng) => (
                      <option key={eng.value} value={eng.value}>{eng.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Yakıt Türü</label>
                  <select
                    value={selectedFuelType}
                    disabled={!selectedEngine || loadingFuels || fuelTypes.length === 0}
                    onChange={(e) => handleFuelTypeChange(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition disabled:opacity-40"
                  >
                    <option value="">{loadingFuels ? "Yükleniyor..." : "Seçiniz..."}</option>
                    {fuelTypes.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Şanzıman Tipi</label>
                  <select
                    value={selectedTransmission}
                    disabled={!selectedFuelType || loadingTransmissions || transmissions.length === 0}
                    onChange={(e) => handleTransmissionChange(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition disabled:opacity-40"
                  >
                    <option value="">{loadingTransmissions ? "Yükleniyor..." : "Seçiniz..."}</option>
                    {transmissions.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Donanım Paketi</label>
                  <select
                    value={selectedTrim}
                    disabled={!selectedTransmission || loadingTrims || trims.length === 0}
                    onChange={(e) => handleTrimChange(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition disabled:opacity-40"
                  >
                    <option value="">{loadingTrims ? "Yükleniyor..." : "Seçiniz..."}</option>
                    {trims.map((tr) => (
                      <option key={tr.value} value={tr.value}>{tr.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resolution Status Banner */}
              {matchingVariant ? (
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span>Varyant doğrulanıyor ve eşleştiriliyor...</span>
                </div>
              ) : loadingTechSpecs ? (
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span>Motor teknik bilgileri doğrulanıyor (cc ve HP)...</span>
                </div>
              ) : selectedVariant ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>✅ Araç Veritabanı Eşleşmesi Başarılı: {selectedBrand} {selectedModel} ({selectedYear}) {selectedTrim} {engineDisplacement ? `• ${engineDisplacement} cc` : ""} {enginePower ? `• ${enginePower} HP` : ""} (Varyant ID: {selectedVariant.slice(0, 8)}...)</span>
                </div>
              ) : (selectedBrand && selectedModel && selectedYear && selectedBodyType && selectedEngine && selectedFuelType && selectedTransmission && selectedTrim) ? (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>❌ Bu kombinasyon için net varyant eşleşmesi bulunamadı. Lütfen seçimlerinizi kontrol ediniz veya &quot;Aracımı listede bulamadım&quot; seçeneğini işaretleyiniz.</span>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>ℹ️ İlerlemeden önce lütfen aracın tüm özelliklerini (8 kriter) eksiksiz seçiniz.</span>
                </div>
              )}
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
              <p className="text-[10px] text-amber-500 italic">⚠️ Manuel varyant girişinde ilanınız yayında kalır fakat &quot;AI Analizli İlan&quot; rozeti alamaz.</p>
            </div>
          )}

          <button
            onClick={() => {
              if (!title) {
                const autoTitle = `${selectedBrand || customBrand} ${selectedModel || customModel} ${selectedTrim || ""}`.trim();
                setTitle(autoTitle);
              }
              setStep(2);
            }}
            disabled={!useCustomVariant ? (!selectedVariant) : (!customBrand || !customModel || !customYear)}
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

          {!useCustomVariant ? (
            <div className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col gap-2">
              <span className="text-xs font-bold text-orange-400">🚗 Seçilen Doğrulanmış Araç:</span>
              <div className="text-sm font-bold text-slate-100">
                {selectedBrand} {selectedModel} ({selectedYear}) • {selectedBodyType} • {selectedEngine} • {selectedFuelType} • {selectedTransmission} • <span className="text-orange-400">{selectedTrim}</span>
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>TorqueScout Araç Kataloğu Eşleşmesi Doğrulandı (Varyant ID: {selectedVariant.slice(0, 8)}...)</span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/60 border border-amber-500/20 rounded-2xl flex flex-col gap-1">
              <span className="text-xs font-bold text-amber-400">⚠️ Manuel Araç Girişi:</span>
              <div className="text-sm font-bold text-slate-200">
                {customBrand} {customModel} ({customYear})
              </div>
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
                  disabled={!useCustomVariant && !!selectedVariant}
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
                  disabled={!useCustomVariant && !!selectedVariant}
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
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Motor Hacmi (cc)</label>
                  {!useCustomVariant && selectedVariant && (
                    loadingTechSpecs ? (
                      <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">
                        Doğrulanıyor...
                      </span>
                    ) : techSpecsVerified && engineDisplacement ? (
                      <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        ✓ Katalogdan
                      </span>
                    ) : null
                  )}
                </div>
                <input
                  type="number"
                  value={engineDisplacement}
                  onChange={(e) => setEngineDisplacement(e.target.value)}
                  readOnly={!useCustomVariant && !!selectedVariant && techSpecsVerified}
                  placeholder={loadingTechSpecs ? "Doğrulanıyor..." : "Örn: 1498"}
                  className={`border rounded-xl px-4 py-3 text-sm outline-none transition ${
                    !useCustomVariant && selectedVariant && techSpecsVerified
                      ? "bg-slate-900/60 border-emerald-500/30 text-emerald-300 font-semibold cursor-default"
                      : "bg-slate-900 border-white/10 text-slate-200 focus:border-orange-500"
                  }`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Motor Gücü (HP)</label>
                  {!useCustomVariant && selectedVariant && (
                    loadingTechSpecs ? (
                      <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">
                        Doğrulanıyor...
                      </span>
                    ) : techSpecsVerified && enginePower ? (
                      <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        ✓ Katalogdan
                      </span>
                    ) : null
                  )}
                </div>
                <input
                  type="number"
                  value={enginePower}
                  onChange={(e) => setEnginePower(e.target.value)}
                  readOnly={!useCustomVariant && !!selectedVariant && techSpecsVerified}
                  placeholder={loadingTechSpecs ? "Doğrulanıyor..." : "Örn: 150"}
                  className={`border rounded-xl px-4 py-3 text-sm outline-none transition ${
                    !useCustomVariant && selectedVariant && techSpecsVerified
                      ? "bg-slate-900/60 border-emerald-500/30 text-emerald-300 font-semibold cursor-default"
                      : "bg-slate-900 border-white/10 text-slate-200 focus:border-orange-500"
                  }`}
                />
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
                type="text"
                value={formatNumberInput(tramerAmount)}
                onChange={(e) => setTramerAmount(parseNumberInput(e.target.value))}
                placeholder="Örn: 5.000"
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
                    <span className="text-[11px] font-bold text-slate-300 truncate">{PART_LABELS[part] || part}</span>
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
              pricingDetails={promotionPricingDetails}
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

          {promotionPricingDetails?.commerceMode !== "LIVE" && selectedPromotionSku && (
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl text-xs font-medium flex items-center gap-2">
              <span className="text-base">ℹ️</span>
              <span>Test Modu Aktif: Promosyon talebiniz test yetkisiyle onaylanarak doğrudan incelemeye iletilecektir.</span>
            </div>
          )}

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setStep(4)}
              className="w-1/3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3.5 rounded-2xl transition cursor-pointer"
            >
              Geri
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={saving || !responsibilityAccepted || (!!selectedPromotionSku && !promotionTermsAccepted)}
              className="w-2/3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? (
                "İşleniyor..."
              ) : selectedPromotionSku && promotionPricingDetails?.commerceMode === "LIVE" ? (
                selectedPromotionSku === "URGENT_LISTING" ? (
                  `Ödemeye Geç (${promotionPricingDetails?.urgentPriceAmount ?? 99} TL) ➔`
                ) : selectedPromotionSku === "SHOWCASE_FEED" ? (
                  `Ödemeye Geç (${promotionPricingDetails?.showcasePriceAmount ?? 199} TL) ➔`
                ) : (
                  `Ödemeye Geç (${promotionPricingDetails?.bundlePriceAmount ?? 249} TL) ➔`
                )
              ) : (
                "İlanı İncelemeye Gönder ➔"
              )}
            </button>
          </div>
        </div>
      )}

      {/* STANDARD LISTING SUCCESS MODAL */}
      {standardSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-100">İlanınız Başarıyla İncelemeye Gönderildi</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                İlanınız moderasyon ekibimiz tarafından kontrol edilecek. Durumu İlanlarım bölümünden takip edebilirsiniz.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
              <button
                onClick={() => router.push("/dashboard/listings?tab=active")}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition"
              >
                İlanlarıma Git
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Ana Sayfaya Dön
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT UNAVAILABLE / RECOVERY MODAL */}
      {checkoutUnavailableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-100">Ödeme İşlemi Başlatılamıyor</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {paymentError || "Ödeme altyapısı şu anda kullanılamıyor. İlanınız taslak olarak güvenle saklandı."}
              </p>
            </div>
            <div className="flex flex-col gap-2.5 w-full pt-2">
              <button
                onClick={handleFinalSubmit}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {saving ? "İşleniyor..." : "Ödemeyi Tekrar Dene"}
              </button>
              <button
                onClick={handleAbandonPromotionSubmit}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition disabled:opacity-50"
              >
                Promosyonsuz İncelemeye Gönder
              </button>
              <button
                onClick={() => router.push("/dashboard/listings")}
                className="w-full py-2.5 rounded-xl bg-transparent text-slate-500 hover:text-slate-400 text-xs font-semibold transition"
              >
                İlanlarıma Git (Taslak Olarak Kalsın)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
