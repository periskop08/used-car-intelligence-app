"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter States
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minKm, setMinKm] = useState("");
  const [maxKm, setMaxKm] = useState("");
  const [isAiReady, setIsAiReady] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  // Data States
  const [listings, setListings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Fetch Brands on mount
  useEffect(() => {
    fetch(`${API_URL}/vehicles/brands`)
      .then((res) => res.json())
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching brands:", e));
  }, []);

  // Fetch Models when selectedBrand changes
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

  // Read URL parameters on load
  useEffect(() => {
    const brand = searchParams.get("brandId");
    const model = searchParams.get("modelId");
    const aiReady = searchParams.get("isAiReady") === "true";
    if (brand) setSelectedBrand(brand);
    if (model) setSelectedModel(model);
    if (aiReady) setIsAiReady(true);
  }, [searchParams]);

  // Main Fetch function
  const fetchListings = () => {
    setLoading(true);
    let query = `?page=${page}&limit=12&sort=${sort}`;
    if (selectedBrand) query += `&brandId=${selectedBrand}`;
    if (selectedModel) query += `&modelId=${selectedModel}`;
    if (minYear) query += `&minYear=${minYear}`;
    if (maxYear) query += `&maxYear=${maxYear}`;
    if (minPrice) query += `&minPrice=${minPrice}`;
    if (maxPrice) query += `&maxPrice=${maxPrice}`;
    if (minKm) query += `&minKm=${minKm}`;
    if (maxKm) query += `&maxKm=${maxKm}`;
    if (isAiReady) query += `&isAiReady=true`;

    fetch(`${API_URL}/listings${query}`)
      .then((res) => res.json())
      .then((data) => {
        setListings(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Error fetching listings:", e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchListings();
  }, [page, sort, selectedBrand, selectedModel, isAiReady]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchListings();
  };

  const handleClearFilters = () => {
    setSelectedBrand("");
    setSelectedModel("");
    setMinYear("");
    setMaxYear("");
    setMinPrice("");
    setMaxPrice("");
    setMinKm("");
    setMaxKm("");
    setIsAiReady(false);
    setPage(1);
    router.push("/listings");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-slate-200 tracking-tight">Araç İlanları</h1>
        <p className="text-sm text-slate-400 mt-1">TorqueScout AI onaylı varyantlar ve kapsamlı kronik detayları ile ikinci el ilanları.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Filter Column */}
        <form onSubmit={handleFilterSubmit} className="lg:col-span-1 flex flex-col gap-6 bg-slate-900/20 border border-white/5 p-6 rounded-3xl h-fit">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-200 text-sm uppercase tracking-wider">Filtreler</h3>
            <button type="button" onClick={handleClearFilters} className="text-xs text-orange-500 hover:underline">Temizle</button>
          </div>

          <div className="border-t border-white/5 my-1"></div>

          {/* Brand & Model */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marka</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
            >
              <option value="">Tümü</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
              disabled={!selectedBrand}
            >
              <option value="">Tümü</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Year Range */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Yıl Aralığı</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minYear}
                onChange={(e) => setMinYear(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxYear}
                onChange={(e) => setMaxYear(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fiyat Aralığı</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min TL"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
              <input
                type="number"
                placeholder="Max TL"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
            </div>
          </div>

          {/* Km Range */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kilometre</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minKm}
                onChange={(e) => setMinKm(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxKm}
                onChange={(e) => setMaxKm(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 text-center"
              />
            </div>
          </div>

          {/* AI Ready Toggle */}
          <div className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              id="aiReadyCheckbox"
              checked={isAiReady}
              onChange={(e) => setIsAiReady(e.target.checked)}
              className="accent-orange-500 rounded border-white/10"
            />
            <label htmlFor="aiReadyCheckbox" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
              ✨ Yalnızca AI Analizli İlanlar
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl transition text-xs mt-2"
          >
            Sonuçları Uygula
          </button>
        </form>

        {/* Right Listings Grid Column */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-slate-950/20 border border-white/5 px-6 py-4 rounded-2xl">
            <span className="text-xs font-bold text-slate-400">
              {loading ? "Yükleniyor..." : `${total} İlan Bulundu`}
            </span>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sırala:</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-orange-500 transition"
              >
                <option value="newest">En Yeni</option>
                <option value="price_asc">Fiyat (Düşükten Yükseğe)</option>
                <option value="price_desc">Fiyat (Yüksekten Düşüğe)</option>
                <option value="km_asc">Kilometre (Düşükten Yükseğe)</option>
                <option value="featured">Öne Çıkanlar</option>
              </select>
            </div>
          </div>

          {/* Grid list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="animate-spin text-3xl">⏳</span>
              <span className="text-slate-400 font-bold text-sm">İlanlar yükleniyor, lütfen bekleyin...</span>
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-white/10 rounded-3xl bg-slate-950/5">
              <span className="text-4xl">🚗</span>
              <span className="text-slate-300 font-bold text-lg">Eşleşen ilan bulunamadı.</span>
              <button onClick={handleClearFilters} className="text-xs text-orange-500 font-bold hover:underline">Filtreleri Temizle</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {listings.map((listing) => {
                const cover = listing.media && listing.media[0] ? listing.media[0].url : "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=60";
                return (
                  <a
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="group flex flex-col bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/5 transition duration-300"
                  >
                    <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                      <img
                        src={cover}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      {listing.isAiReady && (
                        <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-600/90 text-white backdrop-blur-sm border border-orange-500/30 shadow-md flex items-center gap-1">
                          ✨ AI Analizli
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex flex-col justify-between flex-1 gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {listing.modelYear} • {listing.city}
                        </span>
                        <h3 className="font-bold text-slate-200 text-sm line-clamp-1 group-hover:text-orange-400 transition mt-1">
                          {listing.title}
                        </h3>
                        <p className="text-slate-400 text-xs mt-1">
                          {listing.kilometers.toLocaleString('tr-TR')} km
                        </p>
                      </div>

                      <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                        <span className="font-black text-slate-100 text-sm">
                          {Number(listing.priceAmount).toLocaleString('tr-TR')} {listing.currency}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {listing.vehicleVariant?.brand.name}
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition"
              >
                Önceki
              </button>
              <span className="text-xs text-slate-400 font-bold mx-2">Sayfa {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Listings() {
  return (
    <Suspense fallback={<div className="text-slate-400 font-bold text-lg text-center py-24">İlanlar yükleniyor...</div>}>
      <ListingsContent />
    </Suspense>
  );
}
