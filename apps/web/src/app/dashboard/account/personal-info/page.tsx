"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function PersonalInfoPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [displayNamePreference, setDisplayNamePreference] = useState("FULL_NAME");
  const [phone, setPhone] = useState("");

  const fetchProfile = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Profil yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setUsername(data.username || "");
        setDisplayNamePreference(data.displayNamePreference || "FULL_NAME");
        setPhone(data.phone || "");
        setLoading(false);

        // Update localstorage user
        localStorage.setItem("user", JSON.stringify({
          email: data.email,
          subscriptionTier: data.subscriptionTier,
          role: data.role,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          profilePhotoUrl: data.profilePhotoUrl,
          displayNamePreference: data.displayNamePreference,
        }));
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setSaving(true);

    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/users/me/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        firstName: firstName || null,
        lastName: lastName || null,
        username: username || null,
        displayNamePreference,
        phone: phone || null,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Profil güncellenemedi.");
        }
        return data;
      })
      .then((data) => {
        setMessage({ type: "success", text: "Profil bilgileriniz başarıyla güncellendi!" });
        setProfile(data);
        setSaving(false);
      })
      .catch((err) => {
        setMessage({ type: "error", text: err.message });
        setSaving(false);
      });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setMessage({ type: "", text: "" });
    setPhotoUploading(true);

    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/users/me/profile-photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Görsel yüklenemedi.");
        }
        return data;
      })
      .then(() => {
        setMessage({ type: "success", text: "Profil fotoğrafınız başarıyla güncellendi!" });
        setPhotoUploading(false);
        fetchProfile();
      })
      .catch((err) => {
        setMessage({ type: "error", text: err.message });
        setPhotoUploading(false);
      });
  };

  const handlePhotoDelete = () => {
    if (!confirm("Profil fotoğrafınızı kaldırmak istediğinize emin misiniz?")) return;

    setMessage({ type: "", text: "" });
    setPhotoUploading(true);

    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/users/me/profile-photo`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Profil fotoğrafı kaldırılamadı.");
        }
        return data;
      })
      .then(() => {
        setMessage({ type: "success", text: "Profil fotoğrafı başarıyla kaldırıldı!" });
        setPhotoUploading(false);
        fetchProfile();
      })
      .catch((err) => {
        setMessage({ type: "error", text: err.message });
        setPhotoUploading(false);
      });
  };

  // Validation checks for Display Name Options
  const isFullNameDisabled = !firstName || !lastName;
  const isShortNameDisabled = !firstName || !lastName;
  const isUsernameDisabled = !username;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Kişisel Bilgilerim</h1>
        <p className="text-slate-400 text-xs">Profil bilgilerinizi düzenleyin ve görünen ad tercihlerinizi yönetin.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold ${
          message.type === "success" 
            ? "bg-green-500/10 text-green-400 border border-green-500/20" 
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Photo Section */}
      <div className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group w-24 h-24 rounded-2xl overflow-hidden bg-orange-600/10 border border-orange-500/20 flex items-center justify-center font-bold text-orange-400 text-3xl">
          {profile?.profilePhotoUrl ? (
            <img src={profile.profilePhotoUrl} alt="Profil" className="w-full h-full object-cover" />
          ) : (
            (firstName || profile?.email || "U").slice(0, 2).toUpperCase()
          )}
          {photoUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center sm:items-start gap-3">
          <h3 className="text-sm font-bold text-slate-200">Profil Fotoğrafı</h3>
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            Minimum 200x200px ölçülerinde JPEG, PNG veya WebP dosyası yükleyin. Maksimum boyut 2MB'tır.
          </p>
          <div className="flex items-center gap-2">
            <label className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold cursor-pointer transition">
              <span>Fotoğraf Yükle</span>
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={photoUploading} />
            </label>
            {profile?.profilePhotoUrl && (
              <button
                onClick={handlePhotoDelete}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold cursor-pointer transition"
                disabled={photoUploading}
              >
                Kaldır
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Profile Info Form */}
      <form onSubmit={handleSaveProfile} className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              placeholder="kullanici_adi"
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-500">Sadece küçük harf, rakam, nokta ve alt çizgi. (En az 3 karakter)</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Telefon Numarası</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5xx xxx xx xx"
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                profile?.phoneVerifiedAt 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-amber-500/20 text-amber-400"
              }`}>
                {profile?.phoneVerifiedAt ? "Doğrulandı" : "Doğrulanmadı"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Ad</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Adınız"
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Soyad</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Soyadınız"
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Display Name Section */}
        <div className="border-t border-white/5 pt-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Görünen Ad Soyad Seçimi</h3>
            <p className="text-slate-400 text-xs mt-1">
              İlan verme, mesajlaşma ve favori listesi paylaşımı gibi özellikleri kullanırken diğer kullanıcıların adınızı nasıl görebileceğini seçebilirsiniz.
            </p>
          </div>

          <div className="space-y-3">
            {/* FULL_NAME */}
            <label className={`flex items-center gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
              displayNamePreference === "FULL_NAME"
                ? "bg-orange-500/5 border-orange-500/30 text-orange-400"
                : "bg-[#05070f] border-white/5 text-slate-300 hover:border-white/15"
            } ${isFullNameDisabled ? "opacity-45 cursor-not-allowed" : ""}`}>
              <input
                type="radio"
                name="displayNamePreference"
                value="FULL_NAME"
                checked={displayNamePreference === "FULL_NAME"}
                onChange={() => setDisplayNamePreference("FULL_NAME")}
                disabled={isFullNameDisabled}
                className="accent-orange-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold">Ad Soyad</span>
                <span className="text-[10px] text-slate-500">
                  {isFullNameDisabled ? "Ad ve Soyad girmelisiniz." : `${firstName} ${lastName}`}
                </span>
              </div>
            </label>

            {/* SHORT_NAME */}
            <label className={`flex items-center gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
              displayNamePreference === "SHORT_NAME"
                ? "bg-orange-500/5 border-orange-500/30 text-orange-400"
                : "bg-[#05070f] border-white/5 text-slate-300 hover:border-white/15"
            } ${isShortNameDisabled ? "opacity-45 cursor-not-allowed" : ""}`}>
              <input
                type="radio"
                name="displayNamePreference"
                value="SHORT_NAME"
                checked={displayNamePreference === "SHORT_NAME"}
                onChange={() => setDisplayNamePreference("SHORT_NAME")}
                disabled={isShortNameDisabled}
                className="accent-orange-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold">Kısa ad</span>
                <span className="text-[10px] text-slate-500">
                  {isShortNameDisabled ? "Ad ve Soyad girmelisiniz." : `${firstName} ${lastName ? lastName[0] + "." : ""}`}
                </span>
              </div>
            </label>

            {/* USERNAME */}
            <label className={`flex items-center gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
              displayNamePreference === "USERNAME"
                ? "bg-orange-500/5 border-orange-500/30 text-orange-400"
                : "bg-[#05070f] border-white/5 text-slate-300 hover:border-white/15"
            } ${isUsernameDisabled ? "opacity-45 cursor-not-allowed" : ""}`}>
              <input
                type="radio"
                name="displayNamePreference"
                value="USERNAME"
                checked={displayNamePreference === "USERNAME"}
                onChange={() => setDisplayNamePreference("USERNAME")}
                disabled={isUsernameDisabled}
                className="accent-orange-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold">Kullanıcı adı</span>
                <span className="text-[10px] text-slate-500">
                  {isUsernameDisabled ? "Kullanıcı adı girmelisiniz." : `@${username}`}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="border-t border-white/5 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-bold cursor-pointer transition shadow-lg shadow-orange-500/10"
          >
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
