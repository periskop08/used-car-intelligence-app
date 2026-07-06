"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const PAINTED_COMPONENTS = [
  "FRONT_BUMPER", "REAR_BUMPER", "HOOD", "ROOF", "TRUNK",
  "LEFT_FRONT_DOOR", "LEFT_REAR_DOOR", "RIGHT_FRONT_DOOR", "RIGHT_REAR_DOOR",
  "LEFT_FRONT_FENDER", "LEFT_REAR_FENDER", "RIGHT_FRONT_FENDER", "RIGHT_REAR_FENDER"
];

export default function EditListing() {
  const router = useRouter();
  const { id: listingId } = useParams();

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
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

  // Condition & Paint checklist
  const [tramerAmount, setTramerAmount] = useState("0");
  const [damageRecord, setDamageRecord] = useState("");
  const [paintedParts, setPaintedParts] = useState<string[]>([]);
  const [changedParts, setChangedParts] = useState<string[]>([]);
  const [localPaintedParts, setLocalPaintedParts] = useState<string[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState("");

  // Media
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    if (!savedToken) {
      router.push(`/login?redirect=/listings/${listingId}/edit`);
      return;
    }
    setToken(savedToken);

    // Fetch listing details to prefill
    fetch(`${API_URL}/listings/${listingId}`)
      .then((res) => {
        if (!res.ok) throw new Error("İlan detayları yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setTitle(data.title || "");
        setDescription(data.description || "");
        setPriceAmount(data.priceAmount ? String(data.priceAmount) : "");
        setCurrency(data.currency || "TRY");
        setKilometers(data.kilometers ? String(data.kilometers) : "");
        setCity(data.city || "");
        setDistrict(data.district || "");
        setFuelType(data.fuelType || "PETROL");
        setTransmission(data.transmission || "MANUAL");
        setBodyType(data.bodyType || "SEDAN");
        setColor(data.color || "");

        setVehicleStatus(data.vehicleStatus || "USED");
        setHasWarranty(!!data.hasWarranty);
        setHeavyDamage(!!data.heavyDamage);
        setPlateType(data.plateType || "TR_PLATE");
        setSellerType(data.sellerType || "OWNER");
        setExchangeable(!!data.exchangeable);
        setEngineDisplacement(data.engineDisplacement ? String(data.engineDisplacement) : "");
        setEnginePower(data.enginePower ? String(data.enginePower) : "");
        setDrivetrain(data.drivetrain || "FWD");

        setTramerAmount(data.tramerAmount ? String(data.tramerAmount) : "0");
        setDamageRecord(data.damageRecord || "");
        setPaintedParts(Array.isArray(data.paintedParts) ? data.paintedParts : []);
        setChangedParts(Array.isArray(data.changedParts) ? data.changedParts : []);
        setLocalPaintedParts(Array.isArray(data.localPaintedParts) ? data.localPaintedParts : []);
        setMaintenanceHistory(data.maintenanceHistory || "");

        setUploadedPhotos(Array.isArray(data.media) ? data.media : []);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  }, [listingId]);

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

    fetch(`${API_URL}/listings/${listingId}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Görsel yüklenemedi.");
        return res.json();
      })
      .then((newMedia) => {
        setUploadedPhotos((prev) => [...prev, newMedia]);
        setUploading(false);
      })
      .catch((err) => {
        setMediaError(err.message);
        setUploading(false);
      });
  };

  const handleDeletePhoto = (mediaId: string) => {
    setMediaError("");
    fetch(`${API_URL}/listings/${listingId}/media/${mediaId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Silinemedi.");
        setUploadedPhotos((prev) => prev.filter((photo) => photo.id !== mediaId));
      })
      .catch((err) => setMediaError(err.message));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSaving(true);

    const payload = {
      title,
      description,
      priceAmount: parseFloat(priceAmount) || 0,
      currency,
      kilometers: parseInt(kilometers, 10) || 0,
      city,
      district,
      fuelType,
      transmission,
      bodyType,
      color,
      tramerAmount: parseInt(tramerAmount, 10) || 0,
      damageRecord,
      paintedParts,
      changedParts,
      localPaintedParts,
      maintenanceHistory,
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
        setSuccessMsg("İlanınız başarıyla güncellendi!");
        setSaving(false);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: "smooth" });
        // Redirect to dashboard listings after 1.5 seconds
        setTimeout(() => {
          router.push("/dashboard/listings");
        }, 1500);
      })
      .catch((err) => {
        setErrorMsg(err.message || "İlan güncellenirken bir hata oluştu.");
        setSaving(false);
      });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <span className="animate-spin text-3xl">⏳</span>
        <span className="text-slate-400 font-bold text-sm">İlan bilgileri yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black text-slate-200 tracking-tight">✏️ İlanı Düzenle</h1>
        <p className="text-sm text-slate-400 mt-1">Fiyat, açıklama, fotoğraf ve araç özelliklerini dilediğiniz gibi güncelleyin.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-xs font-bold">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Section 1: Temel Bilgiler */}
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-base font-bold text-slate-200 border-b border-white/5 pb-3">🚗 Temel İlan Bilgileri</h2>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">İlan Başlığı</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Fiyat</label>
                <input
                  type="number"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  required
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Para Birimi</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                >
                  <option value="TRY">TL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kilometre</label>
                <input
                  type="number"
                  value={kilometers}
                  onChange={(e) => setKilometers(e.target.value)}
                  required
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Renk</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
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
                  required
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">İlçe</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
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
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kasa Tipi</label>
                <select
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-orange-500"
                >
                  <option value="SEDAN">Sedan</option>
                  <option value="HATCHBACK">Hatchback</option>
                  <option value="SUV">SUV</option>
                  <option value="COUPE">Coupe</option>
                  <option value="WAGON">Station Wagon</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Detaylı Özellikler */}
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-base font-bold text-slate-200 border-b border-white/5 pb-3">⚙️ Detaylı Araç Özellikleri</h2>

          <div className="flex flex-col gap-4">
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

            <div className="grid grid-cols-3 gap-4 bg-slate-950/20 p-4 border border-white/5 rounded-2xl mt-2">
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-slate-350">
                <input
                  type="checkbox"
                  checked={hasWarranty}
                  onChange={(e) => setHasWarranty(e.target.checked)}
                  className="accent-orange-500 rounded border-white/10"
                />
                <span>Garanti Kapsamında</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-slate-350">
                <input
                  type="checkbox"
                  checked={heavyDamage}
                  onChange={(e) => setHeavyDamage(e.target.checked)}
                  className="accent-orange-500 rounded border-white/10"
                />
                <span>Ağır Hasar Kaydı Var</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-slate-350">
                <input
                  type="checkbox"
                  checked={exchangeable}
                  onChange={(e) => setExchangeable(e.target.checked)}
                  className="accent-orange-500 rounded border-white/10"
                />
                <span>Takasa Uygun (Takaslı)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Hasar & Kaporta Boya Durumu */}
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-base font-bold text-slate-200 border-b border-white/5 pb-3">🛠️ Kaporta Boya Durumu & Tramer</h2>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tramer Hasar Kaydı Tutarı (TL)</label>
                <input
                  type="number"
                  value={tramerAmount}
                  onChange={(e) => setTramerAmount(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Hasar Detay Kaydı Açıklaması</label>
                <input
                  type="text"
                  value={damageRecord}
                  onChange={(e) => setDamageRecord(e.target.value)}
                  placeholder="Örn: Sol çamurluk otopark sürtmesi kaynaklı lokal boyalı."
                  className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

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

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Bakım Geçmişi & Ek Açıklamalar</label>
              <textarea
                value={maintenanceHistory}
                onChange={(e) => setMaintenanceHistory(e.target.value)}
                placeholder="Periyodik bakımları zamanında yetkili serviste yapılmıştır."
                rows={3}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Görseller */}
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-base font-bold text-slate-200 border-b border-white/5 pb-3">🖼️ İlan Fotoğrafları</h2>

          {mediaError && (
            <div className="text-xs text-red-400 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/10">
              {mediaError}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {uploadedPhotos.map((photo) => (
              <div key={photo.id} className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 group bg-slate-950">
                <img src={photo.url} alt="Araç görseli" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold flex items-center justify-center text-xs shadow-lg transition opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}

            {uploadedPhotos.length < 10 && (
              <label className="aspect-[4/3] rounded-2xl border-2 border-dashed border-white/10 hover:border-orange-500/40 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/20">
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                {uploading ? (
                  <span className="text-xs text-slate-400 animate-pulse">Yükleniyor...</span>
                ) : (
                  <>
                    <span className="text-xl">📸</span>
                    <span className="text-[10px] text-slate-500 font-bold mt-1">Fotoğraf Ekle</span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>

        {/* Section 5: Açıklama */}
        <div className="glass p-8 rounded-3xl flex flex-col gap-6">
          <h2 className="text-base font-bold text-slate-200 border-b border-white/5 pb-3">✍️ İlan Açıklaması</h2>
          <div className="flex flex-col gap-1.5">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Araç hakkında ekstra belirtmek istediğiniz detayları giriniz..."
              rows={6}
              required
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-orange-600/10 cursor-pointer disabled:opacity-50"
        >
          {saving ? "Güncelleniyor..." : "İlanı Güncelle (Değişiklikleri Kaydet)"}
        </button>
      </form>
    </div>
  );
}
