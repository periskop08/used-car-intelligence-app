"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState("FREE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlTier = searchParams.get("tier");
    if (urlTier === "STANDARD" || urlTier === "PRO") {
      setTier(urlTier);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    fetch("http://localhost:3000/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        subscriptionTier: tier,
      }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Kayıt başarısız.");
          });
        }
        return res.json();
      })
      .then(data => {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("user", JSON.stringify(data.user));
        setLoading(false);
        window.location.href = "/";
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-6">
      <div className="w-full max-w-md glass p-8 rounded-3xl flex flex-col gap-6 shadow-2xl">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-200">Kayıt Ol</h1>
          <p className="text-xs text-slate-400 mt-1">Hızlıca hesabınızı oluşturun ve analiz etmeye başlayın.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Adresi</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Şifre (En az 6 haneli)</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seçilen Abonelik Paketi</label>
            <select
              value={tier}
              onChange={e => setTier(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500 transition"
            >
              <option value="FREE">FREE (Limitli)</option>
              <option value="STANDARD">STANDARD (349 TL / Ay)</option>
              <option value="PRO">PRO (899 TL / Ay)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition text-center text-sm"
          >
            {loading ? "Kaydolunuyor..." : "Kayıt Ol & Giriş Yap"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Zaten hesabınız var mı?{" "}
          <a href="/login" className="text-orange-500 font-bold hover:underline">
            Giriş Yapın
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div className="text-slate-400 font-bold text-lg text-center py-24">Yükleniyor...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
