"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface FavoriteReport {
  id: string;
  variantId: string;
  createdAt: string;
  variant: {
    id: string;
    year: number;
    bodyType: string;
    fuelType: string;
    brand: { name: string };
    model: { name: string };
    generation?: { name: string };
    engine?: { code: string };
    transmission?: { name: string };
    trim?: { name: string };
  };
}

export default function FavoriteReportsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [reports, setReports] = useState<FavoriteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    if (!savedToken) {
      router.push("/login?redirect=/dashboard/favorites/reports");
      return;
    }
    setToken(savedToken);
    fetchFavorites(savedToken);
  }, []);

  const fetchFavorites = (authToken: string) => {
    setLoading(true);
    fetch(`${API_URL}/favorites`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Favori raporlar yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setReports(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  };

  const handleRemoveFavorite = (e: React.MouseEvent, variantId: string) => {
    e.preventDefault();
    e.stopPropagation();

    fetch(`${API_URL}/favorites/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ variantId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("İşlem başarısız.");
        return res.json();
      })
      .then(() => {
        // Remove item from UI state
        setReports((prev) => prev.filter((item) => item.variantId !== variantId));
      })
      .catch((err) => console.error("Error toggling favorite:", err));
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black text-slate-200 tracking-tight">❤️ Favori Raporlarım</h1>
        <p className="text-sm text-slate-400 mt-1">Takip ettiğiniz, kronik sorunlarını ve AI raporlarını kaydettiğiniz araçlar.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <span className="animate-spin text-3xl">⏳</span>
          <span className="text-slate-400 font-bold text-sm">Favori raporlarınız yükleniyor, lütfen bekleyin...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-white/10 rounded-3xl bg-slate-950/5">
          <span className="text-4xl">📄</span>
          <span className="text-slate-300 font-bold text-lg">Henüz hiçbir aracı/raporu favorilerinize eklemediniz.</span>
          <a
            href="/"
            className="text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition"
          >
            Yeni Rapor Oluştur
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((item) => {
            const v = item.variant;
            if (!v) return null;

            return (
              <a
                key={item.id}
                href={`/vehicle/${v.id}`}
                className="group flex flex-col justify-between bg-slate-900/40 border border-white/5 rounded-2xl p-6 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/5 transition duration-300 relative"
              >
                {/* Remove Favorite Button */}
                <button
                  onClick={(e) => handleRemoveFavorite(e, v.id)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-950/80 border border-white/10 flex items-center justify-center text-red-500 hover:scale-110 transition shadow-lg backdrop-blur-sm"
                  title="Favorilerden Kaldır"
                >
                  ❤️
                </button>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">
                      {v.brand.name}
                    </span>
                    <h3 className="font-black text-slate-200 text-xl tracking-tight mt-0.5">
                      {v.model.name} ({v.year})
                    </h3>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-slate-400 border-t border-white/5 pt-3">
                    <p><strong>Kasa Tipi:</strong> {v.bodyType || "Belirtilmemiş"}</p>
                    <p><strong>Motor:</strong> {v.engine?.code || "Belirtilmemiş"} ({v.fuelType})</p>
                    <p><strong>Şanzıman:</strong> {v.transmission?.name || "Belirtilmemiş"}</p>
                    {v.trim?.name && <p><strong>Paket:</strong> {v.trim.name}</p>}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-xs text-slate-500 font-medium">
                    Ekleme: {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                  <span className="text-xs text-orange-500 font-bold group-hover:translate-x-1 transition duration-300">
                    Raporu İncele ➔
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
