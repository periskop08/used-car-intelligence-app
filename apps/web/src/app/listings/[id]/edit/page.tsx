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

            <div className="flex flex-col gap-3 mt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Boya & Değişen Parça İşaretleme</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/20 p-6 border border-white/5 rounded-2xl">
                {/* Boyalı Parçalar */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 mb-3">🎨 Boyalı Parçalar</h4>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {PAINTED_COMPONENTS.map((part) => (
                      <label key={part} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={paintedParts.includes(part)}
                          onChange={() => handleTogglePart(part, "painted")}
                          className="accent-orange-500 rounded"
                        />
                        <span>{part.replace(/_/g, " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Değişen Parçalar */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 mb-3">🔄 Değişen Parçalar</h4>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {PAINTED_COMPONENTS.map((part) => (
                      <label key={part} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={changedParts.includes(part)}
                          onChange={() => handleTogglePart(part, "changed")}
                          className="accent-orange-500 rounded"
                        />
                        <span>{part.replace(/_/g, " ")}</span>
                      </label>
                    ))}
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
