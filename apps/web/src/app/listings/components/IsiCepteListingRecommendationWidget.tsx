'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  X,
  ExternalLink,
  Star,
  Building,
  Wrench,
  ShieldCheck,
  Phone,
  FileText,
  ArrowRight,
  Car,
  CheckCircle2,
  Search,
  Map,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';

export interface IsiCepteShowcaseItem {
  id: string;
  isicepteProviderId: string;
  businessName: string;
  slug: string;
  coverImageUrl?: string | null;
  avatarUrl?: string | null;
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
  // Mount state for SSR safe Portal rendering
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // City state: prioritizes initialUserCity, then localStorage, or fallback empty (all cities)
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if (initialUserCity && initialUserCity.trim() !== '') return initialUserCity.trim();
    if (typeof window !== 'undefined') {
      const storedCity = localStorage.getItem('userSelectedCity');
      if (storedCity) return storedCity;
    }
    return '';
  });

  const [items, setItems] = useState<IsiCepteShowcaseItem[]>([]);
  const [showcaseItems, setShowcaseItems] = useState<IsiCepteShowcaseItem[]>([]);
  const [regularItems, setRegularItems] = useState<IsiCepteShowcaseItem[]>([]);
  const [totalShowcase, setTotalShowcase] = useState<number>(0);
  const [totalRegular, setTotalRegular] = useState<number>(0);
  const [totalAll, setTotalAll] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal / Dropdown states
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState<boolean>(false);
  const [isExpandedModalOpen, setIsExpandedModalOpen] = useState<boolean>(false);
  const [expandedActiveTab, setExpandedActiveTab] = useState<'ALL' | 'SHOWCASE' | 'REGULAR'>('ALL');
  const [detailModalProvider, setDetailModalProvider] = useState<IsiCepteShowcaseItem | null>(null);
  const [citySearch, setCitySearch] = useState<string>('');

  // Randomized seed per page load so Vitrin list order changes on each refresh (Rule 9)
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(2, 9));

  // Fetch recommendations with SHOWCASE_WITH_FALLBACK scope
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
      query.append('limit', '100'); // Retrieve all matching providers
      query.append('scope', 'SHOWCASE_WITH_FALLBACK');
      query.append('seed', sessionSeed);

      const res = await fetch(`${API_BASE_URL}/isicepte/recommendations?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const mainItems = Array.isArray(data.items) ? data.items : [];
        const scItems = Array.isArray(data.showcaseItems) ? data.showcaseItems : [];
        const regItems = Array.isArray(data.regularItems) ? data.regularItems : [];

        setItems(mainItems);
        setShowcaseItems(scItems);
        setRegularItems(regItems);
        setTotalShowcase(data.totalShowcase ?? scItems.length);
        setTotalRegular(data.totalRegular ?? regItems.length);
        setTotalAll(data.totalAll ?? mainItems.length);

        // Record impression event
        if (mainItems.length > 0) {
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
        setShowcaseItems([]);
        setRegularItems([]);
        setTotalShowcase(0);
        setTotalRegular(0);
        setTotalAll(0);
      }
    } catch (err) {
      console.error('Recommendation fetch error:', err);
      setItems([]);
      setShowcaseItems([]);
      setRegularItems([]);
      setTotalShowcase(0);
      setTotalRegular(0);
      setTotalAll(0);
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
    if (provider.isicepteProfileUrl) {
      window.open(provider.isicepteProfileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Turkish character insensitive search over 81 provinces
  const filteredCities = TURKEY_81_PROVINCES.filter((c) =>
    c.toLocaleLowerCase('tr-TR').includes(citySearch.toLocaleLowerCase('tr-TR'))
  );

  // Tab filtered items for "Tümünü Gör" Modal (Rule 22)
  const modalTabItems = useMemo(() => {
    if (expandedActiveTab === 'SHOWCASE') return showcaseItems;
    if (expandedActiveTab === 'REGULAR') return regularItems;
    // ALL tab: combine showcase first, then regular
    return [...showcaseItems, ...regularItems];
  }, [expandedActiveTab, showcaseItems, regularItems]);

  return (
    <div
      className={`glass p-4 rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-950/20 via-[#0b0f19] to-[#0b0f19] flex flex-col justify-between gap-3 shadow-xl relative overflow-hidden font-sans h-[590px] max-h-[590px] ${className}`}
    >
      <span className="absolute -top-10 -right-10 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></span>

      {/* Widget Header with Real İşi Cepte Logo & City Selector */}
      <div className="flex flex-col gap-2 pb-2.5 border-b border-white/10 shrink-0">
        {/* Row 1: Logo + Brand Heading on Left, City Pill on Right */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden shrink-0 shadow-md border border-white/10 bg-[#161a29] p-0.5">
              <img
                src="/assets/images/isicepte-logo.jpeg"
                alt="İşi Cepte Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-[11px] sm:text-xs font-black text-orange-400 tracking-wide uppercase">
                İŞİ CEPTE
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 tracking-wider uppercase">
                ÖNERİYOR
              </span>
            </div>
          </div>

          {/* Compact Location Selector Button */}
          <button
            type="button"
            onClick={() => setIsCitySelectorOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0f172a]/95 hover:bg-[#1e293b] border border-white/15 hover:border-orange-500/40 rounded-xl text-[10.5px] font-bold text-slate-200 hover:text-orange-300 transition cursor-pointer shrink-0 shadow-sm"
          >
            <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="truncate max-w-[80px]">{selectedCity || 'Tüm İller'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Row 2: Dedicated context bar for Badge + Subtitle (full width, spacious) */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/5 min-w-0">
          {totalShowcase > 0 ? (
            <span className="text-[9.5px] font-extrabold text-amber-300 bg-amber-500/20 border border-amber-500/35 px-1.5 py-0.5 rounded-md leading-none shrink-0 flex items-center gap-1">
              👑 Vitrin
            </span>
          ) : totalRegular > 0 ? (
            <span className="text-[9.5px] font-extrabold text-orange-300 bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.5 rounded-md leading-none shrink-0 flex items-center gap-1">
              🔧 Uzman Servisler
            </span>
          ) : null}
          <span className="text-[10px] sm:text-[10.5px] text-slate-300 font-medium truncate leading-none">
            {vehicleBrand} markasına hizmet veren {totalShowcase > 0 ? 'vitrin servisleri' : 'uzman servisler'}
          </span>
        </div>
      </div>

      {/* Main Body: Scrollable viewport */}
      <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono animate-pulse my-auto">
            Servis önerileri yükleniyor...
          </div>
        ) : items.length === 0 ? (
          /* Empty State (Rule 25 & 26: Only if Vitrin === 0 AND Regular === 0) */
          <div className="flex-1 flex flex-col items-center justify-center p-5 text-center space-y-3 bg-slate-950/60 rounded-xl border border-white/5 my-auto">
            <Building className="w-9 h-9 text-slate-600 mx-auto" />
            <h4 className="text-xs font-bold text-white leading-snug">
              Bu araç ve konum için henüz uygun servis bulunamadı.
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              {vehicleBrand} markası için {selectedCity ? `${selectedCity} bölgesinde` : ''} servis eklendiğinde burada listelenecektir.
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
          /* Scrollable Vertical List of Compact Cards (Strictly 5 visible cards, rest scrollable inside box) */
          <div className="flex-1 min-h-0 max-h-[415px] overflow-y-auto pr-1 space-y-2 custom-scrollbar overscroll-contain">
            {items.map((shop) => (
              <div
                key={shop.id}
                onClick={() => handleOpenDetail(shop)}
                className="p-2 sm:p-2.5 rounded-2xl bg-[#091124]/90 hover:bg-[#0f1b36] border border-white/10 hover:border-orange-500/40 transition flex items-center gap-2.5 cursor-pointer group shadow-sm select-none"
              >
                {/* Left Thumbnail Image (Compact & Proportional) */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0 relative flex items-center justify-center">
                  {shop.coverImageUrl || shop.avatarUrl ? (
                    <img
                      src={shop.coverImageUrl || shop.avatarUrl || ''}
                      alt={shop.businessName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-slate-600">
                      <Wrench className="w-5 h-5 text-slate-500" />
                    </div>
                  )}
                </div>

                {/* Middle Info Details (Full Width Service Name) */}
                <div className="flex flex-col min-w-0 flex-1 gap-0.5 justify-center">
                  <h4 className="text-xs font-bold text-white group-hover:text-orange-300 transition truncate leading-snug">
                    {shop.businessName}
                  </h4>

                  <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono truncate leading-tight">
                    <MapPin className="w-2.5 h-2.5 text-orange-400/80 shrink-0" />
                    <span className="truncate">
                      {shop.district || shop.city}
                    </span>
                  </div>

                  {shop.rating > 0 ? (
                    <div className="text-[10px] text-slate-300 flex items-center gap-1 font-mono whitespace-nowrap leading-tight">
                      <Star className="w-2.5 h-2.5 fill-orange-400 text-orange-400 shrink-0" />
                      <span className="font-bold text-white">{shop.rating.toFixed(1)}</span>
                      {shop.reviewCount > 0 && (
                        <span className="text-slate-400 truncate">({shop.reviewCount})</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[9.5px] text-orange-400/90 font-medium truncate leading-tight">
                      {vehicleBrand} uzmanı
                    </div>
                  )}
                </div>

                {/* Right Chevron Affordance */}
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-400 transition ml-auto shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Button: "TÜMÜNÜ GÖR" (Opens Central Overlay Modal - Matches Reference Image 1) */}
      {items.length > 0 && (
        <button
          type="button"
          onClick={() => setIsExpandedModalOpen(true)}
          className="w-full py-2.5 bg-[#0f172a]/90 hover:bg-[#1e293b] border border-white/10 hover:border-orange-500/40 rounded-xl text-xs font-bold text-orange-400 hover:text-orange-300 transition cursor-pointer flex items-center justify-center gap-1.5 mt-auto shadow-md"
        >
          <span>Tümünü Gör {totalAll > 0 ? `(${totalAll})` : ''}</span>
          <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
        </button>
      )}

      {/* 81 PROVINCES CITY SELECTOR MODAL (Rendered via Portal into body to escape CSS stacking context) */}
      {mounted &&
        isCitySelectorOpen &&
        createPortal(
          <div
            onClick={() => setIsCitySelectorOpen(false)}
            className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
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
                <button
                  type="button"
                  onClick={() => handleCitySelect('')}
                  className={`w-full text-left px-3 py-1.5 sm:py-2 rounded-xl transition flex items-center justify-between cursor-pointer text-[11px] sm:text-xs font-sans ${
                    !selectedCity || selectedCity === 'Tüm Şehirler'
                      ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" />
                    <span>Tüm Şehirler (Türkiye Geneli)</span>
                  </span>
                  {(!selectedCity || selectedCity === 'Tüm Şehirler') && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                  )}
                </button>
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
          </div>,
          document.body
        )}

      {/* CENTRAL ALL SHOWCASE + REGULAR PROVIDERS MODAL (Rendered via Portal into body - Rules 20, 21, 22, 23, 24) */}
      {mounted &&
        isExpandedModalOpen &&
        createPortal(
          <div
            onClick={() => setIsExpandedModalOpen(false)}
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#081120] border border-sky-500/20 rounded-[28px] p-5 sm:p-7 space-y-5 shadow-2xl max-h-[88vh] overflow-y-auto flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start pb-4 border-b border-white/10 shrink-0">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                    <ShieldCheck className="w-3 h-3" /> İŞİCEPTE ÖNERİYOR
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-1">
                    <Wrench className="w-5 h-5 text-orange-400" /> {vehicleBrand} İçin Önerilen Servisler
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedCity ? `📍 ${selectedCity} bölgesinde` : 'Tüm şehirlerdeki'} hizmet verebilecek {totalAll} usta ve servis
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

              {/* Filter Tabs: Tümü, Vitrin Üyeleri, Üyeler (Rule 22) */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => setExpandedActiveTab('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    expandedActiveTab === 'ALL'
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  Tümü ({totalAll})
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedActiveTab('SHOWCASE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    expandedActiveTab === 'SHOWCASE'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <span>👑 Vitrin Üyeleri</span>
                  <span>({totalShowcase})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedActiveTab('REGULAR')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    expandedActiveTab === 'REGULAR'
                      ? 'bg-slate-200 text-slate-950 shadow-md'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  Üyeler ({totalRegular})
                </button>
              </div>

              {/* Modal Content: Full List of Matching Providers (Rule 23: Clean card without specialty tags) */}
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                {modalTabItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-mono">
                    Bu sekmede listelenecek işletme bulunamadı.
                  </div>
                ) : (
                  modalTabItems.map((shop) => (
                    <div
                      key={shop.id}
                      onClick={() => handleOpenDetail(shop)}
                      className="p-3 bg-slate-900/80 rounded-2xl border border-white/10 hover:border-orange-500/40 transition flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-950 border border-white/10 shrink-0 relative flex items-center justify-center">
                          {shop.coverImageUrl || shop.avatarUrl ? (
                            <img
                              src={shop.coverImageUrl || shop.avatarUrl || ''}
                              alt={shop.businessName}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                          ) : (
                            <Wrench className="w-5 h-5 text-slate-500" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-white group-hover:text-orange-300 transition truncate">
                              {shop.businessName}
                            </h3>
                            {shop.isShowcase ? (
                              <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded leading-none">
                                👑 Vitrin Üyesi
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-800 border border-white/10 px-1.5 py-0.5 rounded leading-none">
                                Üye
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono truncate">
                            <MapPin className="w-2.5 h-2.5 text-orange-400/80 shrink-0" />
                            <span className="truncate">
                              {shop.city} {shop.district ? `/ ${shop.district}` : ''}
                            </span>
                          </div>

                          {shop.rating > 0 && (
                            <div className="text-[10.5px] text-slate-300 flex items-center gap-1 font-mono">
                              <Star className="w-3 h-3 fill-orange-400 text-orange-400 shrink-0" />
                              <span className="font-bold text-white">{shop.rating.toFixed(1)}</span>
                              {shop.reviewCount > 0 && (
                                <span className="text-slate-400">· {shop.reviewCount} değerlendirme</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(shop);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <span>Detay</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* SINGLE PROVIDER DETAIL MODAL (Rendered via Portal into body - Matches Reference Image 2 exactly) */}
      {mounted &&
        detailModalProvider &&
        createPortal(
          <div
            onClick={() => setDetailModalProvider(null)}
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#081120] border border-sky-500/20 rounded-[28px] max-w-2xl w-full p-5 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto flex flex-col relative"
            >
              {/* Modal Header (Matches Reference Image 2) */}
              <div className="flex items-start justify-between border-b border-white/10 pb-3 shrink-0">
                <div className="space-y-1">
                  {detailModalProvider.isShowcase ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                      👑 VİTRİN ÜYESİ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-wider border border-white/10">
                      İŞİ CEPTE ÜYESİ
                    </span>
                  )}
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {detailModalProvider.businessName}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-400" />
                      {detailModalProvider.city} {detailModalProvider.district ? `/ ${detailModalProvider.district}` : ''}
                    </span>
                    {detailModalProvider.rating > 0 && (
                      <span className="flex items-center gap-1 text-slate-300 font-bold">
                        <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                        {detailModalProvider.rating.toFixed(1)}
                        {detailModalProvider.reviewCount > 0 && (
                          <span className="text-slate-400 font-normal font-mono">
                            · {detailModalProvider.reviewCount} değerlendirme
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModalProvider(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Cover Image Banner (Matches Reference Image 2) */}
              <div className="h-44 sm:h-60 w-full rounded-2xl bg-slate-950 overflow-hidden relative flex items-center justify-center border border-white/10 shrink-0">
                {detailModalProvider.coverImageUrl || detailModalProvider.avatarUrl ? (
                  <img
                    src={detailModalProvider.coverImageUrl || detailModalProvider.avatarUrl || ''}
                    alt={detailModalProvider.businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Wrench className="w-10 h-10 text-slate-500" />
                    <span className="text-xs font-medium text-slate-400">İşletme Görseli</span>
                  </div>
                )}
              </div>

              {/* Detail Section Cards (Matches Reference Image 2 Layout) */}
              <div className="space-y-3 text-xs text-slate-300">
                {/* 1. Row: Adres & Konum */}
                <div className="p-3.5 rounded-2xl bg-[#0d1629] border border-white/5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        ADRES & KONUM
                      </div>
                      <div className="text-slate-200 text-xs sm:text-sm leading-snug">
                        {detailModalProvider.address ||
                          `${detailModalProvider.city} ${
                            detailModalProvider.district ? `/ ${detailModalProvider.district}` : ''
                          }`}
                      </div>
                    </div>
                  </div>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      detailModalProvider.address || `${detailModalProvider.businessName} ${detailModalProvider.city}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Map className="w-3.5 h-3.5 text-blue-400" />
                    <span>Haritada Gör</span>
                  </a>
                </div>

                {/* 2. Row: Hizmet Verdiği Araç Markaları */}
                <div className="p-3.5 rounded-2xl bg-[#0d1629] border border-white/5 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                    <Car className="w-4 h-4" />
                  </div>
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      HİZMET VERDİĞİ ARAÇ MARKALARI
                    </div>
                    {detailModalProvider.supportedBrands && detailModalProvider.supportedBrands.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {detailModalProvider.supportedBrands.map((b, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-white/10 text-slate-200 text-[11px] font-semibold"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">Tüm binek ve ticari araçlar</span>
                    )}

                    {/* Rule 17: Bu Araçla Eşleşme Bilgisi */}
                    {vehicleBrand && vehicleBrand !== 'Bu Araç' && (
                      <div className="text-[11px] text-orange-400/95 font-medium pt-0.5">
                        ✓ Bu işletme İşi Cepte profilinde {vehicleBrand} markasına hizmet verdiğini belirtmiştir.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Row: Hizmet Uzmanlıkları (Rule 16: Canonical Set Only in Detail Modal) */}
                <div className="p-3.5 rounded-2xl bg-[#0d1629] border border-white/5 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      HİZMET UZMANLIKLARI
                    </div>
                    {detailModalProvider.serviceCategories && detailModalProvider.serviceCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {detailModalProvider.serviceCategories.map((c, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-white/10 text-slate-200 text-[11px] font-medium"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">Genel Oto Servis Hizmetleri</span>
                    )}
                  </div>
                </div>

                {/* 4. Row: İletişim Telefonu (If Available) */}
                {detailModalProvider.phone && (
                  <div className="p-3.5 rounded-2xl bg-[#0d1629] border border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          İLETİŞİM TELEFONU
                        </div>
                        <div className="text-slate-100 font-mono font-bold text-xs sm:text-sm">
                          {detailModalProvider.phone}
                        </div>
                      </div>
                    </div>

                    <a
                      href={`tel:${detailModalProvider.phone.replace(/\s+/g, '')}`}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Ara</span>
                    </a>
                  </div>
                )}

                {/* 5. Row: Kısa Açıklama */}
                <div className="p-3.5 rounded-2xl bg-[#0d1629] border border-white/5 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      KISA AÇIKLAMA
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {vehicleBrand} başta olmak üzere binek ve ticari araçlarda uzmanlaşmış, deneyimli teknik kadrosuyla {detailModalProvider.city} bölgesinde hizmet veren yetkili/özel servistir. Şeffaf ekspertiz ve kaliteli işçilik prensibiyle çalışır.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Bottom CTA Actions (Matches Reference Image 2) */}
              <div className="pt-2 flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setDetailModalProvider(null)}
                  className="py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs sm:text-sm font-bold border border-white/10 transition cursor-pointer"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={() => handleOutboundClick(detailModalProvider)}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm transition flex flex-col items-center justify-center cursor-pointer shadow-xl shadow-orange-500/20 active:scale-95 leading-tight"
                >
                  <div className="flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4" />
                    <span>İşiCepte&apos;de Profili Aç</span>
                  </div>
                  <span className="text-[10px] text-orange-100/90 font-normal mt-0.5">
                    Detaylı bilgiler, yorumlar ve randevu için
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
