"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface FavoriteSeller {
  id: string;
  sellerId: string;
  createdAt: string;
  seller: {
    id: string;
    email: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    profilePhotoUrl: string | null;
    displayNamePreference: string;
  };
}

export default function FavoriteSellersPage() {
  const [sellers, setSellers] = useState<FavoriteSeller[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSellers = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch(`${API_URL}/favorites/sellers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setSellers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleRemove = (sellerId: string) => {
    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/favorites/sellers/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sellerId }),
    })
      .then((res) => res.json())
      .then(() => {
        setSellers((prev) => prev.filter((s) => s.sellerId !== sellerId));
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  const formatUserName = (u: any) => {
    if (!u) return "Kullanıcı";
    if (u.displayNamePreference === "USERNAME" && u.username) return `@${u.username}`;
    if (u.displayNamePreference === "SHORT_NAME" && u.firstName) {
      return `${u.firstName} ${u.lastName ? u.lastName[0] + "." : ""}`.trim();
    }
    if (u.firstName || u.lastName) {
      return `${u.firstName || ""} ${u.lastName || ""}`.trim();
    }
    return u.email.split("@")[0];
  };

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
        <h1 className="text-2xl font-bold text-slate-100">Favori Satıcılarım</h1>
        <p className="text-slate-400 text-xs">Takip ettiğiniz satıcı profillerini görüntüleyin.</p>
      </div>

      {sellers.length === 0 ? (
        <div className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-12 text-center space-y-4">
          <span className="text-4xl block">👤</span>
          <h3 className="text-sm font-bold text-slate-300">Favori Satıcınız Bulunmuyor</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            İlan sahiplerini takip ederek güvenilir satıcıları favorilerinize ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sellers.map((item) => (
            <div
              key={item.id}
              className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 flex flex-col items-center text-center gap-4 hover:border-orange-500/20 transition duration-300"
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-orange-600/10 border border-orange-500/20 flex items-center justify-center font-bold text-orange-400 text-xl">
                {item.seller.profilePhotoUrl ? (
                  <img src={item.seller.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (item.seller.firstName || item.seller.email).slice(0, 2).toUpperCase()
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-200">{formatUserName(item.seller)}</h3>
                <span className="text-[10px] text-slate-500 font-mono block mt-1">{item.seller.email}</span>
              </div>

              <button
                onClick={() => handleRemove(item.sellerId)}
                className="w-full py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Takipten Çık
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
