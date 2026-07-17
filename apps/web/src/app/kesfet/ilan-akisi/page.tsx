"use client";

import React, { useState, useEffect, useRef } from "react";

// Env variable for API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface Location {
  city: string;
  district: string;
  neighborhood: string;
}

interface Seller {
  id: string;
  displayName: string;
  memberSince: string;
  avatarUrl: string | null;
}

interface Vehicle {
  brand: string;
  modelFamily: string;
  modelName: string;
  year: number;
  fuelType: string;
  transmissionType: string;
  condition: string;
  mileage: number;
  bodyType: string;
  enginePower: string;
  engineCapacity: string;
  drivetrain: string;
  color: string;
  warranty: boolean;
  heavyDamage: boolean;
  plateOrigin: string;
  sellerType: string;
  exchange: boolean;
  trimPackage: string | null;
  engineVersion: string | null;
}

interface Photo {
  id: string;
  url: string;
  order: number;
}

interface TechnicalSummary {
  maxPower: string | null;
  topSpeed: string | null;
  acceleration0100: string | null;
  fuelConsumption: string | null;
}

interface ListingFeedItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  listingDate: string;
  listingNo: string;
  location: Location;
  seller: Seller;
  vehicle: Vehicle;
  photos: Photo[];
  technicalSummary: TechnicalSummary;
  breadcrumb: string[];
  isFavorite: boolean;
  detailUrl: string;
}

export default function ListingFeedPage() {
  const [listings, setListings] = useState<ListingFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [seed, setSeed] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);

  // States per listing
  const [activeTabs, setActiveTabs] = useState<Record<string, "info" | "desc" | "loc">>({});
  const [activePhotoIndices, setActivePhotoIndices] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Seen list to pass as excludeIds (limit to 100)
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const loadingMoreRef = useRef(false);

  // Refs for scroll snapping
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const viewedTimerRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const viewedLoggedRefs = useRef<Record<string, boolean>>({});

  // Generate initial seed on client load
  useEffect(() => {
    const generatedSeed = Math.random().toString(36).substring(2, 15);
    setSeed(generatedSeed);
    fetchFeed(generatedSeed, true, []);
    logEvent("listing_feed_opened", {});
  }, []);

  const getHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchFeed = async (activeSeed: string, replace: boolean, currentSeen: string[]) => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    if (replace) setLoading(true);

    try {
      const excludeIdsParam = currentSeen.slice(-100).join(",");
      const response = await fetch(
        `${API_URL}/listings/feed?limit=10&seed=${activeSeed}&excludeIds=${excludeIdsParam}`,
        { headers: getHeaders() }
      );

      if (!response.ok) {
        throw new Error("İlan akışı yüklenirken bir hata oluştu.");
      }

      const data = await response.json();
      const newItems: ListingFeedItem[] = data.items || [];

      if (replace) {
        setListings(newItems);
        // Default values for new items
        const initialTabs: Record<string, "info" | "desc" | "loc"> = {};
        const initialPhotos: Record<string, number> = {};
        const initialFavs: Record<string, boolean> = {};

        newItems.forEach((item) => {
          initialTabs[item.id] = "info";
          initialPhotos[item.id] = 0;
          initialFavs[item.id] = item.isFavorite;
        });

        setActiveTabs(initialTabs);
        setActivePhotoIndices(initialPhotos);
        setFavorites(initialFavs);
      } else {
        setListings((prev) => {
          const filtered = newItems.filter(item => !prev.some(p => p.id === item.id));
          return [...prev, ...filtered];
        });

        setActiveTabs((prev) => {
          const updated = { ...prev };
          newItems.forEach((item) => {
            if (!updated[item.id]) updated[item.id] = "info";
          });
          return updated;
        });

        setActivePhotoIndices((prev) => {
          const updated = { ...prev };
          newItems.forEach((item) => {
            if (updated[item.id] === undefined) updated[item.id] = 0;
          });
          return updated;
        });

        setFavorites((prev) => {
          const updated = { ...prev };
          newItems.forEach((item) => {
            if (updated[item.id] === undefined) updated[item.id] = item.isFavorite;
          });
          return updated;
        });
      }

      setHasMore(data.hasMore);
      if (data.nextSeed) setSeed(data.nextSeed);
      setError(null);
    } catch (err: any) {
      setError(err.message || "İlan akışı yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  };

  // Visibility tracking for viewed event
  useEffect(() => {
    if (listings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-id");
          if (!id) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            // Find active index
            const index = listings.findIndex((x) => x.id === id);
            if (index !== -1) {
              setCurrentIndex(index);
              
              // Infinite scroll prefetch: if user is at index 7, load next
              if (index >= listings.length - 3 && hasMore) {
                const nextSeen = [...seenIds, ...listings.map(x => x.id)];
                fetchFeed(seed, false, nextSeen);
              }
            }

            // Start viewed timer (500ms)
            if (!viewedLoggedRefs.current[id]) {
              if (viewedTimerRefs.current[id]) clearTimeout(viewedTimerRefs.current[id]);
              viewedTimerRefs.current[id] = setTimeout(() => {
                viewedLoggedRefs.current[id] = true;
                const item = listings.find((x) => x.id === id);
                if (item) {
                  logEvent("listing_feed_item_viewed", {
                    listingId: item.id,
                    sellerId: item.seller.id,
                    brand: item.vehicle.brand,
                    modelFamily: item.vehicle.modelFamily,
                    year: item.vehicle.year,
                    position: index,
                  });
                  setSeenIds((prev) => {
                    if (prev.includes(id)) return prev;
                    return [...prev, id];
                  });
                }
              }, 500);
            }
          } else {
            // Cancel viewed timer if card becomes less than 70% visible
            if (viewedTimerRefs.current[id]) {
              clearTimeout(viewedTimerRefs.current[id]);
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.7,
      }
    );

    Object.values(cardRefs.current).forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => {
      observer.disconnect();
    };
  }, [listings]);

  const logEvent = (eventName: string, params: Record<string, any>) => {
    console.log(`[Analytics Event] ${eventName}:`, {
      ...params,
      source: "listing_feed",
      timestamp: new Date().toISOString(),
    });
    // Call mock API for logging if desired
    fetch(`${API_URL}/audit-logs`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ action: eventName, details: params }),
    }).catch(() => {});
  };

  const handleFavoriteToggle = async (id: string, item: ListingFeedItem) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Devam etmek için ücretsiz giriş yapmalısın.");
      window.location.href = `/login?redirect=/kesfet/ilan-akisi`;
      return;
    }

    const currentFav = favorites[id];
    // Optimistic update
    setFavorites((prev) => ({ ...prev, [id]: !currentFav }));

    try {
      const response = await fetch(`${API_URL}/listings/${id}/favorite`, {
        method: "POST",
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error();
      }
      logEvent("listing_feed_favorite_clicked", { listingId: id, sellerId: item.seller.id });
    } catch {
      // Revert on error
      setFavorites((prev) => ({ ...prev, [id]: currentFav }));
      alert("Favorilere eklenirken bir hata oluştu.");
    }
  };

  const handleShare = async (item: ListingFeedItem) => {
    const shareUrl = `${window.location.origin}/listings/${item.id}`;
    logEvent("listing_feed_share_clicked", { listingId: item.id });

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          url: shareUrl,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("İlan linki panoya kopyalandı!");
    }
  };

  const handleCall = (item: ListingFeedItem) => {
    logEvent("listing_feed_call_clicked", { listingId: item.id });
    alert("Satıcı iletişim bilgisi için ilan detay sayfasına yönlendiriliyorsunuz.");
    window.location.href = `/listings/${item.id}`;
  };

  const handleMessage = (item: ListingFeedItem) => {
    logEvent("listing_feed_message_clicked", { listingId: item.id });
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Devam etmek için ücretsiz giriş yapmalısın.");
      window.location.href = `/login?redirect=/kesfet/ilan-akisi`;
      return;
    }
    // Redirect to chat
    window.location.href = `/dashboard/messages?listingId=${item.id}`;
  };

  return (
    <div className="flex-1 flex justify-center items-center py-6 px-4">
      <div className="w-full max-w-[540px] h-[calc(100dvh-180px)] min-h-[660px] bg-[#0b0f19] border border-white/10 rounded-[36px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] relative flex flex-col overflow-hidden">
          
          {loading && listings.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-3">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Akış hazırlanıyor...</p>
            </div>
          ) : error && listings.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-4 px-6 text-center">
              <span className="text-4xl">⚠️</span>
              <p className="text-sm font-semibold text-slate-300">{error}</p>
              <button
                onClick={() => fetchFeed(seed || "retry_seed", true, [])}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 transition text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20"
              >
                Tekrar Dene
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-3 px-6 text-center">
              <span className="text-4xl">🎞️</span>
              <p className="text-sm font-semibold text-slate-300">Şu anda akışta gösterilecek aktif ilan bulunmuyor.</p>
              <p className="text-xs text-slate-500">Yeni ilanlar yayına alındığında burada görünecek.</p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="flex-1 overflow-y-scroll scroll-snap-y-mandatory"
              style={{
                scrollSnapType: "y mandatory",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {listings.map((item, index) => {
                const activeTab = activeTabs[item.id] || "info";
                const activePhoto = activePhotoIndices[item.id] || 0;
                const isFav = favorites[item.id] || false;

                return (
                  <div
                    key={item.id}
                    ref={(el) => { cardRefs.current[item.id] = el; }}
                    data-id={item.id}
                    className="w-full h-full scroll-snap-align-start flex flex-col justify-between p-4 relative"
                    style={{ scrollSnapAlign: "start", height: "100%" }}
                  >
                    {/* Top Bar Actions */}
                    <div className="flex justify-between items-center z-10 pb-2">
                      <button
                        onClick={() => { window.location.href = "/"; }}
                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10"
                      >
                        ◀
                      </button>
                      <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
                        🎞️ İLAN AKIŞI
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleShare(item)}
                          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10"
                        >
                          📤
                        </button>
                        <button
                          onClick={() => handleFavoriteToggle(item.id, item)}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            isFav
                              ? "bg-red-500/20 border-red-500/50 text-red-500"
                              : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          {isFav ? "❤️" : "🤍"}
                        </button>
                      </div>
                    </div>

                    {/* Compact Image Container with horizontal photo swipe only */}
                    <div className="relative w-full h-[260px] rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                      {item.photos.length > 0 ? (
                        <>
                          <img
                            src={item.photos[activePhoto]?.url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] font-bold text-slate-300">
                            {activePhoto + 1} / {item.photos.length}
                          </div>
                          {/* Carousel Navigation overlays */}
                          {item.photos.length > 1 && (
                            <>
                              <button
                                onClick={() =>
                                  setActivePhotoIndices((prev) => ({
                                    ...prev,
                                    [item.id]: Math.max(0, activePhoto - 1),
                                  }))
                                }
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-xs"
                              >
                                ◀
                              </button>
                              <button
                                onClick={() =>
                                  setActivePhotoIndices((prev) => ({
                                    ...prev,
                                    [item.id]: Math.min(item.photos.length - 1, activePhoto + 1),
                                  }))
                                }
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-xs"
                              >
                                ▶
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                          Görsel Bulunmuyor
                        </div>
                      )}
                    </div>

                    {/* Listing Title & Location */}
                    <div className="py-2">
                      <p className="text-xs font-bold text-slate-200 line-clamp-1">
                        {item.title.toUpperCase()}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span>
                          👤 {item.seller.displayName} ({item.seller.memberSince})
                        </span>
                        <span>
                          📍 {item.location.city}, {item.location.district}
                        </span>
                      </div>
                    </div>

                    {/* Breadcrumb */}
                    <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-semibold text-blue-400 whitespace-nowrap overflow-x-auto scrollbar-none">
                      {item.breadcrumb.join(" > ")}
                    </div>

                    {/* Glassmorphism Tabs */}
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      {(["info", "desc", "loc"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTabs((prev) => ({ ...prev, [item.id]: tab }))}
                          className={`py-1 text-[10px] font-black rounded-lg border transition-all ${
                            activeTab === tab
                              ? "bg-blue-600/20 border-blue-500 text-blue-400"
                              : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-300"
                          }`}
                        >
                          {tab === "info" ? "Özellikler" : tab === "desc" ? "Açıklama" : "Konum"}
                        </button>
                      ))}
                    </div>

                    {/* Tab Contents - Compact Height to avoid overflow & scroll conflict */}
                    <div className="flex-1 h-[180px] bg-black/20 border border-white/5 rounded-2xl p-4 my-2 overflow-hidden text-xs">
                      {activeTab === "info" && (
                        <div className="w-full h-full overflow-y-auto pr-1 flex flex-col gap-1 text-[11px] scrollbar-none">
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-400">Fiyat</span>
                            <span className="font-extrabold text-orange-500">
                              {item.price.toLocaleString("tr-TR")} {item.currency}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-400">İlan No</span>
                            <span className="text-slate-200">{item.listingNo}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-400">Model Yılı</span>
                            <span className="text-slate-200">{item.vehicle.year}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-400">KM</span>
                            <span className="text-slate-200">
                              {item.vehicle.mileage.toLocaleString("tr-TR")} km
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-400">Yakıt</span>
                            <span className="text-slate-200">{item.vehicle.fuelType}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-400">Vites</span>
                            <span className="text-slate-200">{item.vehicle.transmissionType}</span>
                          </div>
                        </div>
                      )}

                      {activeTab === "desc" && (
                        <div className="w-full h-full flex flex-col justify-between">
                          <p className="text-slate-300 italic line-clamp-4 leading-relaxed text-[11px]">
                            "Bu araç TorqueScout akıllı yapay zeka analizinden başarıyla geçti. Hasar geçmişi ve kronik problemleri sorgulandı."
                          </p>
                          <a
                            href={item.detailUrl}
                            onClick={() => logEvent("listing_feed_detail_clicked", { listingId: item.id })}
                            className="text-[10px] text-orange-400 font-extrabold self-end hover:underline"
                          >
                            İlan Detayına Git ➔
                          </a>
                        </div>
                      )}

                      {activeTab === "loc" && (
                        <div className="w-full h-full flex flex-col justify-between">
                          <div className="text-slate-300 flex flex-col gap-1 text-[11px]">
                            <p className="font-bold text-white">📍 İlan Konumu</p>
                            <p>Şehir: {item.location.city}</p>
                            <p>İlçe: {item.location.district || "Belirtilmemiş"}</p>
                          </div>
                          <a
                            href={item.detailUrl}
                            onClick={() => logEvent("listing_feed_detail_clicked", { listingId: item.id })}
                            className="text-[10px] text-blue-400 font-extrabold self-end hover:underline"
                          >
                            Haritada Göster ➔
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Compact Specs Box */}
                    <div className="bg-[#141b2c] border border-blue-500/10 rounded-xl p-2 flex justify-between text-[9px] text-slate-300 mb-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500">Güç</span>
                        <span className="font-bold">{item.technicalSummary.maxPower || "-"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500">Azami Hız</span>
                        <span className="font-bold">{item.technicalSummary.topSpeed || "-"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500">0-100 km/s</span>
                        <span className="font-bold">{item.technicalSummary.acceleration0100 || "-"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500">Tüketim</span>
                        <span className="font-bold">{item.technicalSummary.fuelConsumption || "-"}</span>
                      </div>
                    </div>

                    {/* Action CTA Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleCall(item)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase bg-[#141b2c] border border-white/10 hover:bg-[#1a233a] transition-all text-slate-200"
                      >
                        📞 Arama Başlat
                      </button>
                      <button
                        onClick={() => handleMessage(item)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 transition-all text-white shadow-lg shadow-orange-500/15"
                      >
                        💬 Mesaj Gönder
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
  );
}
