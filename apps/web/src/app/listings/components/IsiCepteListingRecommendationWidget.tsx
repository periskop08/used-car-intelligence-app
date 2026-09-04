'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  MapPin,
  Star,
  ChevronDown,
  X,
  ExternalLink,
  Search,
  CheckCircle2,
  Building,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

interface IsiCepteShowcaseItem {
  id: string;
  isicepteProviderId: string;
  businessName: string;
  slug: string;
  coverImageUrl?: string | null;
  city: string;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  isicepteProfileUrl: string;
  supportedBrands: string[];
  serviceCategories: string[];
  rating: number;
  reviewCount: number;
  isShowcase: boolean;
}

interface IsiCepteListingRecommendationWidgetProps {
  vehicleBrand?: string;
  listingId?: string;
  initialUserCity?: string;
  className?: string;
}

/**
 * OFFICIAL COMPLETE ARRAY OF ALL 81 TURKISH PROVINCES (ALPHABETICAL ORDER)
 */
export const TURKEY_81_PROVINCES: string[] = [
  'Adana',
  'Adıyaman',
  'Afyonkarahisar',
  'Ağrı',
  'Aksaray',
  'Amasya',
  'Ankara',
  'Antalya',
  'Ardahan',
  'Artvin',
  'Aydın',
  'Balıkesir',
  'Bartın',
  'Batman',
  'Bayburt',
  'Bilecik',
  'Bingöl',
  'Bitlis',
  'Bolu',
  'Burdur',
  'Bursa',
  'Çanakkale',
  'Çankırı',
  'Çorum',
  'Denizli',
  'Diyarbakır',
  'Düzce',
  'Edirne',
  'Elazığ',
  'Erzincan',
  'Erzurum',
  'Eskişehir',
  'Gaziantep',
  'Giresun',
  'Gümüşhane',
  'Hakkari',
  'Hatay',
  'Iğdır',
  'Isparta',
  'İstanbul',
  'İzmir',
  'Kahramanmaraş',
  'Karabük',
  'Karaman',
  'Kars',
  'Kastamonu',
  'Kayseri',
  'Kilis',
  'Kırıkkale',
  'Kırklareli',
  'Kırşehir',
  'Kocaeli',
  'Konya',
  'Kütahya',
  'Malatya',
  'Manisa',
  'Mardin',
  'Mersin',
  'Muğla',
  'Muş',
  'Nevşehir',
  'Niğde',
  'Ordu',
  'Osmaniye',
  'Rize',
  'Sakarya',
  'Samsun',
  'Şanlıurfa',
  'Siirt',
  'Sinop',
  'Şırnak',
  'Sivas',
  'Tekirdağ',
  'Tokat',
  'Trabzon',
  'Tunceli',
  'Uşak',
  'Van',
  'Yalova',
  'Yozgat',
  'Zonguldak',
];

export default function IsiCepteListingRecommendationWidget({
  vehicleBrand = 'Bu Araç',
  listingId,
  initialUserCity,
  className = '',
}: IsiCepteListingRecommendationWidgetProps) {
  // Determine selected city from prop, localStorage or listing
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if (initialUserCity && initialUserCity !== 'Belirtilmedi') return initialUserCity;
    if (typeof window !== 'undefined') {
      const storedCity = localStorage.getItem('userSelectedCity');
      if (storedCity) return storedCity;
    }
    return '';
  });

  const [items, setItems] = useState<IsiCepteShowcaseItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal / Dropdown states
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState<boolean>(false);
  const [isExpandedModalOpen, setIsExpandedModalOpen] = useState<boolean>(false);
  const [detailModalProvider, setDetailModalProvider] = useState<IsiCepteShowcaseItem | null>(null);
  const [citySearch, setCitySearch] = useState<string>('');

  // Stable seed per component lifecycle
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(2, 9));

  // Fetch strictly active showcase providers matching brand & city
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (vehicleBrand && vehicleBrand !== 'Bu Araç' && vehicleBrand !== 'Tüm Markalar') {
        query.append('brand', vehicleBrand);
      }
      if (selectedCity && selectedCity !== 'Tüm Şehirler') {
        query.append('city', selectedCity);
      }
      query.append('limit', '100'); // Retrieve ALL matching showcase providers
      query.append('scope', 'SHOWCASE_ONLY');
      query.append('seed', sessionSeed);

      const res = await fetch(`${API_BASE_URL}/isicepte/recommendations?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const showcaseItems = Array.isArray(data.items) ? data.items : [];
        setItems(showcaseItems);
        setTotalCount(data.total || showcaseItems.length);

        // Record impression event
        if (showcaseItems.length > 0) {
          fetch(`${API_BASE_URL}/isicepte/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'ISICEPTE_SHOWCASE_IMPRESSION',
              city: selectedCity || undefined,
              brand: vehicleBrand || undefined,
              metadata: { listingId },
            }),
          }).catch(() => {});
        }
      } else {
        setItems([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Recommendation fetch error:', err);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [vehicleBrand, selectedCity, sessionSeed, listingId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userSelectedCity', city);
    }
    setIsCitySelectorOpen(false);
  };

  const handleOpenDetail = (provider: IsiCepteShowcaseItem) => {
    setDetailModalProvider(provider);
    fetch(`${API_BASE_URL}/isicepte/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'ISICEPTE_PROFILE_CLICK',
        providerId: provider.id,
        city: provider.city,
      }),
    }).catch(() => {});
  };

  const handleOutboundClick = (provider: IsiCepteShowcaseItem) => {
    fetch(`${API_BASE_URL}/isicepte/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'ISICEPTE_OUTBOUND_CLICK',
        providerId: provider.id,
        city: provider.city,
      }),
    }).catch(() => {});
    window.open(provider.isicepteProfileUrl, '_blank', 'noopener,noreferrer');
  };

  // Turkish character insensitive search over 81 provinces
  const filteredCities = TURKEY_81_PROVINCES.filter((c) =>
    c.toLocaleLowerCase('tr-TR').includes(citySearch.toLocaleLowerCase('tr-TR'))
  );

  return (
    <div
      className={`glass p-4 rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-950/20 via-[#0b0f19] to-[#0b0f19] flex flex-col justify-between gap-3 shadow-xl relative overflow-hidden font-sans h-full flex-1 ${className}`}
    >
      <span className="absolute -top-10 -right-10 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl"></span>

      {/* Widget Header with Real İşi Cepte Logo */}
      <div className="flex items-start justify-between border-b border-white/10 pb-3 gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-md border border-white/10 bg-[#161a29] mt-0.5">
            <img
              src="/assets/images/isicepte-logo.jpeg"
              alt="İşi Cepte Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">
                İŞİ CEPTE ÖNERİYOR
              </span>
              <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 rounded leading-none">
                👑 Vitrin
              </span>
            </div>
            <span className="text-[9.5px] text-slate-300 font-medium mt-1 leading-tight whitespace-normal break-words">
              {vehicleBrand} markasına hizmet veren vitrin servisleri
            </span>
          </div>
        </div>

        {/* Compact Location Selector Button */}
        <button
          type="button"
          onClick={() => setIsCitySelectorOpen(true)}
          className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-orange-500/30 rounded-lg text-[10px] font-bold text-orange-300 transition cursor-pointer shrink-0"
        >
          <MapPin className="w-2.5 h-2.5 text-orange-400 shrink-0" />
          <span className="truncate max-w-[75px]">{selectedCity || 'Şehir Seç'}</span>
          <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Main Body: Fixed-height scrollable viewport showing approx 5 compact cards */}
      <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-[200px]">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono animate-pulse my-auto">
            Vitrin servisleri yükleniyor...
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-5 text-center space-y-3 bg-slate-950/60 rounded-xl border border-white/5 my-auto">
            <Building className="w-9 h-9 text-slate-600 mx-auto" />
            <h4 className="text-xs font-bold text-white leading-snug">
              Bu araç ve konum için henüz uygun servis bulunamadı.
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              {vehicleBrand} markası için {selectedCity ? `${selectedCity} bölgesinde` : ''} aktif vitrin servisi eklendiğinde burada listelenecektir.
            </p>
            <button
              type="button"
              onClick={() => setIsCitySelectorOpen(true)}
              className="px-3.5 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded-lg text-[10.5px] font-bold transition cursor-pointer"
            >
              Farklı Şehir Seç ➔
            </button>
          </div>
        ) : (
          /* Scrollable Vertical List: Contains all matching Vitrin providers */
          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-white/15 overscroll-contain">
            {items.map((shop) => (
              <div
                key={shop.id}
                className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col gap-2 hover:border-orange-500/30 transition group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-orange-300 transition">
                        {shop.businessName}
                      </h4>
                      <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        👑 Vitrin Üyesi
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1 space-y-0.5 font-mono">
                      <div>
                        📍 {shop.city} {shop.district ? `/ ${shop.district}` : ''}
                      </div>
                      <div className="text-orange-400/90 font-medium font-sans">
                        {vehicleBrand} markasına hizmet veriyor
                      </div>
                    </div>

                    {shop.serviceCategories && shop.serviceCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {shop.serviceCategories.slice(0, 2).map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {shop.rating > 0 && (
                    <span className="text-[9.5px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20 shrink-0 flex items-center gap-0.5 font-mono">
                      <Star className="w-2.5 h-2.5 fill-orange-400" /> {shop.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(shop)}
                    className="flex-1 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-[10px] font-bold text-center transition cursor-pointer"
                  >
                    Detay
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOutboundClick(shop)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-[10px] font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>İşiCepte&apos;de Aç</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Button: "TÜMÜNÜ GÖR" (Opens Central Overlay Modal) */}
      {items.length > 0 && (
        <button
          type="button"
          onClick={() => setIsExpandedModalOpen(true)}
          className="w-full py-2.5 bg-gradient-to-r from-orange-600/30 to-amber-600/30 hover:from-orange-600/40 hover:to-amber-600/40 border border-orange-500/40 rounded-xl text-xs font-bold text-orange-200 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5 mt-auto shadow-md"
        >
          <span>Tümünü Gör ({totalCount} Vitrin Servisi)</span>
          <span>➔</span>
        </button>
      )}

      {/* 81 PROVINCES CITY SELECTOR MODAL */}
      {isCitySelectorOpen && (
        <div
          onClick={() => setIsCitySelectorOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs sm:max-w-sm bg-[#0b0f19] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xl relative my-auto max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" /> Şehir Seçimi
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Türkiye (81 İl)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCitySelectorOpen(false)}
                className="p-1 text-slate-400 hover:text-white bg-white/5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 sm:py-2 bg-slate-950 rounded-xl border border-white/10 text-xs shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="İl ara (örn. İstanbul, Ankara, İzmir)..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-500 outline-none text-[11px] sm:text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[50vh] pr-1 space-y-1 font-mono text-xs scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-slate-950">
              {filteredCities.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">Aramayla eşleşen il bulunamadı.</div>
              ) : (
                filteredCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleCitySelect(city)}
                    className={`w-full text-left px-3 py-1.5 sm:py-2 rounded-xl transition flex items-center justify-between cursor-pointer text-[11px] sm:text-xs ${
                      selectedCity === city
                        ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{city}</span>
                    {selectedCity === city && <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CENTRAL ALL SHOWCASE PROVIDERS MODAL (Tümünü Gör Modalı) */}
      {isExpandedModalOpen && (
        <div
          onClick={() => setIsExpandedModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#0b101e] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-white/10 shrink-0">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                  <ShieldCheck className="w-3 h-3" /> İŞİCEPTE ÖNERİYOR • VİTRİN ÜYELERİ
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-1">
                  <Wrench className="w-5 h-5 text-orange-400" /> {vehicleBrand} İçin Önerilen Vitrin Servisleri
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedCity ? `📍 ${selectedCity} şehrindeki` : 'Tüm şehirlerdeki'} aktif vitrin üyeleri ({items.length} işletme)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCitySelectorOpen(true)}
                  className="px-3 py-1.5 bg-slate-900 border border-orange-500/30 rounded-xl text-xs font-bold text-orange-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  <span>{selectedCity || 'Şehir Seç'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpandedModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content: Full List of Matching Vitrin Providers */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {items.map((shop) => (
                <div
                  key={shop.id}
                  className="p-4 bg-slate-900/80 rounded-2xl border border-white/10 hover:border-orange-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white">{shop.businessName}</h3>
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded">
                        👑 Vitrin Üyesi
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      📍 {shop.city} {shop.district ? `/ ${shop.district}` : ''}
                    </div>

                    <div className="text-xs text-orange-400 font-medium">
                      {vehicleBrand} markasına hizmet veriyor
                    </div>

                    {shop.serviceCategories && shop.serviceCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {shop.serviceCategories.map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 border border-white/5 text-slate-300 text-[10px] font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExpandedModalOpen(false);
                        handleOpenDetail(shop);
                      }}
                      className="flex-1 sm:w-36 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition text-center cursor-pointer shadow-md"
                    >
                      Profili Gör
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOutboundClick(shop)}
                      className="flex-1 sm:w-36 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>İşiCepte&apos;de Aç</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SINGLE PROVIDER DETAIL MODAL */}
      {detailModalProvider && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101e] border border-white/15 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                  👑 İŞİCEPTE VİTRİN ÜYESİ
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">
                  {detailModalProvider.businessName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalProvider(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Cover Image */}
            <div className="h-44 w-full rounded-2xl bg-slate-950 overflow-hidden relative flex items-center justify-center">
              {detailModalProvider.coverImageUrl ? (
                <img
                  src={detailModalProvider.coverImageUrl}
                  alt={detailModalProvider.businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Wrench className="w-8 h-8 text-slate-500" />
                  <span className="text-xs font-medium text-slate-400">İşletme Görseli</span>
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="space-y-4 text-xs text-slate-300">
              {detailModalProvider.rating > 0 && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">
                      Müşteri Değerlendirmesi
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                      <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                      <span>{detailModalProvider.rating.toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                  {detailModalProvider.reviewCount > 0 && (
                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      {detailModalProvider.reviewCount} gerçek değerlendirme
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Adres & Konum</div>
                <div className="text-slate-200">
                  {detailModalProvider.address ||
                    `${detailModalProvider.city} ${
                      detailModalProvider.district ? `/ ${detailModalProvider.district}` : ''
                    }`}
                </div>
              </div>

              {detailModalProvider.supportedBrands && detailModalProvider.supportedBrands.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Hizmet Verilen Araç Markaları
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailModalProvider.supportedBrands.map((b, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-semibold"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailModalProvider.serviceCategories && detailModalProvider.serviceCategories.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Hizmet Uzmanlıkları
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailModalProvider.serviceCategories.map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/5 text-slate-300 text-[11px] font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailModalProvider.phone && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">İletişim Telefonu</div>
                  <div className="text-slate-200 font-mono font-bold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-orange-400" />
                    <span>{detailModalProvider.phone}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDetailModalProvider(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => handleOutboundClick(detailModalProvider)}
                className="flex-1 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/30"
              >
                <ExternalLink className="w-4 h-4" />
                <span>İşiCepte&apos;de Profili Aç</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

