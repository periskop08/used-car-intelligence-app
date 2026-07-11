"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface SavedSearch {
  id: string;
  title: string;
  filters: any;
  isEmailAlertActive: boolean;
  isPushAlertActive: boolean;
  lastRunAt: string | null;
  lastMatchedCount: number;
  createdAt: string;
}

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSearches = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch(`${API_URL}/saved-searches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Arama kayıtları yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setSearches(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Kayıtlı aramalar yüklenirken bir sorun oluştu.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSearches();
  }, []);

  const handleToggleAlert = (id: string, emailVal: boolean, pushVal: boolean) => {
    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/saved-searches/${id}/alert`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        isEmailAlertActive: emailVal,
        isPushAlertActive: pushVal,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Bildirim ayarı güncellenemedi.");
        return res.json();
      })
      .then(() => {
        // Refresh local state
        setSearches((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, isEmailAlertActive: emailVal, isPushAlertActive: pushVal }
              : s
          )
        );
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bu kayıtlı aramayı silmek istediğinize emin misiniz?")) return;

    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/saved-searches/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Arama kaydı silinemedi.");
        return res.json();
      })
      .then(() => {
        setSearches((prev) => prev.filter((s) => s.id !== id));
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  const buildSearchUrl = (filters: any) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (val !== null && val !== undefined && val !== "") {
        params.append(key, String(val));
      }
    });
    return `/listings?${params.toString()}`;
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
        <h1 className="text-2xl font-bold text-slate-100">Favori Aramalarım</h1>
        <p className="text-slate-400 text-xs">Kaydettiğiniz arama filtrelerini yönetin ve yeni ilan alarmları kurun.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      {searches.length === 0 ? (
        <div className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-12 text-center space-y-4">
          <span className="text-4xl block">🔍</span>
          <h3 className="text-sm font-bold text-slate-300">Henüz Kayıtlı Aramanız Yok</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            İlanlar sayfasında yaptığınız filtre aramalarını favorilere kaydederek yeni ilanlardan anında haberdar olabilirsiniz.
          </p>
          <a
            href="/listings"
            className="inline-block px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition mt-2"
          >
            İlanları İncele
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {searches.map((search) => (
            <div
              key={search.id}
              className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 flex flex-col justify-between gap-6 hover:border-orange-500/20 transition duration-300"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-200 truncate">{search.title}</h3>
                <span className="text-[10px] text-slate-500 font-mono block mt-1">
                  Kayıt: {new Date(search.createdAt).toLocaleDateString("tr-TR")}
                </span>

                {/* Filter tags summary */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {Object.keys(search.filters).map((k) => {
                    const val = search.filters[k];
                    if (val === null || val === undefined || val === "") return null;
                    return (
                      <span key={k} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-slate-400 font-medium">
                        {k}: {String(val)}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-4">
                {/* Alert toggle switches */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={search.isEmailAlertActive}
                        onChange={(e) => handleToggleAlert(search.id, e.target.checked, search.isPushAlertActive)}
                        className="accent-orange-500 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] font-bold text-slate-400">E-posta Alarmı</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={search.isPushAlertActive}
                        onChange={(e) => handleToggleAlert(search.id, search.isEmailAlertActive, e.target.checked)}
                        className="accent-orange-500 w-3.5 h-3.5"
                      />
                      <span className="text-[11px] font-bold text-slate-400">Push Alarmı</span>
                    </label>
                  </div>

                  <button
                    onClick={() => handleDelete(search.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition text-[10px] font-bold"
                  >
                    Sil
                  </button>
                </div>

                <a
                  href={buildSearchUrl(search.filters)}
                  className="w-full py-2.5 bg-slate-900/60 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 text-slate-300 hover:text-orange-400 rounded-2xl text-xs font-bold text-center block transition"
                >
                  Aramayı Tekrar Aç
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
