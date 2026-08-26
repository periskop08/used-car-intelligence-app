'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  MapPin,
  Star,
  Award,
  Globe,
  ChevronDown,
  X,
  ExternalLink,
  Search,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import { IsiCepteProvider } from '@/types/isiCepteDomain';

interface RecommendationCandidate {
  id: string;
  isicepteProviderId: string;
  businessName: string;
  resultGroup: 'LOCAL' | 'NATIONAL';
  showcaseActive: boolean;
  nationalVisibilityActive: boolean;
  countryCode: string;
  regionCode: string;
  district?: string | null;
  autoServiceCategories?: { id: string; name: string }[];
  supportedVehicleBrands?: { id?: string | null; name: string }[];
  rating?: number | null;
  link?: string | null;
  image?: string | null;
  rawProvider?: IsiCepteProvider;
}

interface IsiCepteListingRecommendationWidgetProps {
  vehicleBrand?: string;
  listingId?: string;
  initialUserCity?: string;
  className?: string;
}

/**
 * OFFICIAL COMPLETE ARRAY OF ALL 81 TURKISH PROVINCES (ALPHABETICAL ORDER)
 * All 81 provinces are selectable regardless of current provider availability in inventory.
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
  // Determine initial selected city from user profile or prop
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if (initialUserCity) return initialUserCity;
    if (typeof window !== 'undefined') {
      const storedCity = localStorage.getItem('userSelectedCity');
      if (storedCity) return storedCity;
    }
    return '';
  });

  const [candidates, setCandidates] = useState<RecommendationCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal / Dropdown states
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState<boolean>(false);
  const [isExpandedModalOpen, setIsExpandedModalOpen] = useState<boolean>(false);
  const [citySearch, setCitySearch] = useState<string>('');

  // Fetch recommendations from API based on brand & selected city
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        brand: vehicleBrand,
        region: selectedCity,
        limit: '20',
      });

      const res = await fetch(`${API_BASE_URL}/admin/isi-cepte/recommendations?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(Array.isArray(data.items) ? data.items : []);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.error('Recommendation fetch error:', err);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [vehicleBrand, selectedCity]);

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

  // Group candidates into Top 5 compact results according to Phase 6 rules:
  const localShowcase = candidates.filter((c) => c.resultGroup === 'LOCAL' && c.showcaseActive);
  const localNormal = candidates.filter((c) => c.resultGroup === 'LOCAL' && !c.showcaseActive);
  const nationalShowcase = candidates.filter((c) => c.resultGroup === 'NATIONAL' && c.showcaseActive);
  const nationalNormal = candidates.filter((c) => c.resultGroup === 'NATIONAL' && !c.showcaseActive);

  const compactTop5 = [
    ...localShowcase,
    ...localNormal,
    ...nationalShowcase,
    ...nationalNormal,
  ].slice(0, 5);

  // All local vs national candidates for Expanded Modal
  const allLocalCandidates = [...localShowcase, ...localNormal];
  const allNationalCandidates = [...nationalShowcase, ...nationalNormal];

  // Turkish character insensitive search over all 81 provinces
  const filteredCities = TURKEY_81_PROVINCES.filter((c) =>
    c.toLocaleLowerCase('tr-TR').includes(citySearch.toLocaleLowerCase('tr-TR'))
  );

  return (
    <div
      className={`glass p-4 rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-950/20 via-[#0b0f19] to-[#0b0f19] flex flex-col justify-between gap-3 shadow-xl relative overflow-hidden font-sans h-full flex-1 ${className}`}
    >
      <span className="absolute -top-10 -right-10 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl"></span>

      {/* Widget Header with Real İşi Cepte Logo & Non-truncated Subtitle (Fix #1) */}
      <div className="flex items-start justify-between border-b border-white/10 pb-3 gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {/* REAL İŞİ CEPTE LOGO */}
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-md border border-white/10 bg-[#161a29] mt-0.5">
            <img
              src="/assets/images/isicepte-logo.jpeg"
              alt="İşi Cepte Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">
              İŞİ CEPTE ÖNERİYOR
            </span>
            {/* Non-truncated multiline subtitle */}
            <span className="text-[9.5px] text-slate-300 font-medium mt-1 leading-tight whitespace-normal break-words">
              {vehicleBrand} markasına hizmet veren servisler
            </span>
          </div>
        </div>

        {/* Compact Location Selector Button (Fix #1 & #2) */}
        <button
          onClick={() => setIsCitySelectorOpen(true)}
          className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-orange-500/30 rounded-lg text-[10px] font-bold text-orange-300 transition cursor-pointer shrink-0"
        >
          <MapPin className="w-2.5 h-2.5 text-orange-400 shrink-0" />
          <span className="truncate max-w-[75px]">{selectedCity || 'Şehir Seç'}</span>
          <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Main Body: Fills vertical space down to TorqueScout İlan Zekası (Fix #3) */}
      <div className="flex-1 flex flex-col justify-between gap-3 min-h-[200px] my-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono animate-pulse my-auto">
            Servis önerileri hesaplanıyor...
          </div>
        ) : compactTop5.length === 0 ? (
          /* Truthful Empty State (Fills container down to bottom boundary) */
          <div className="flex-1 flex flex-col items-center justify-center p-5 text-center space-y-3 bg-slate-950/60 rounded-xl border border-white/5 my-auto">
            <Building className="w-9 h-9 text-slate-600 mx-auto" />
            <h4 className="text-xs font-bold text-white leading-snug">
              Bu araç ve konum için henüz uygun servis bulunamadı.
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              İşi Cepte servisleri bu bölgede kullanılabilir olduğunda, {vehicleBrand} markası için uygun işletmeler burada listelenecektir.
            </p>
            <button
              onClick={() => setIsCitySelectorOpen(true)}
              className="px-3.5 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded-lg text-[10.5px] font-bold transition cursor-pointer"
            >
              Farklı Şehir Seç ➔
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 my-auto">
            {compactTop5.map((shop) => (
              <div
                key={shop.id}
                className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col gap-2 hover:border-orange-500/30 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-white truncate">{shop.businessName}</h4>

                      {/* SHOWCASE Badge */}
                      {shop.showcaseActive && (
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Award className="w-2.5 h-2.5 text-amber-400" /> Öne Çıkan
                        </span>
                      )}

                      {/* NATIONAL Context Badge */}
                      {shop.resultGroup === 'NATIONAL' && (
                        <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Globe className="w-2.5 h-2.5 text-purple-400" /> Türkiye Genelinden
                        </span>
                      )}
                    </div>

                    {/* Location & Brand Wording */}
                    <div className="text-[10px] text-slate-400 mt-1 space-y-0.5 font-mono">
                      <div>
                        📍 {shop.countryCode} • {shop.regionCode} {shop.district ? `/ ${shop.district}` : ''}
                      </div>
                      <div className="text-orange-400/90 font-medium font-sans">
                        {vehicleBrand} markasına hizmet veriyor
                      </div>
                    </div>
                  </div>

                  {/* Rating if real */}
                  {shop.rating ? (
                    <span className="text-[9.5px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-emerald-400" /> {shop.rating}
                    </span>
                  ) : null}
                </div>

                {/* Action */}
                <a
                  href={shop.link || 'https://isicepte.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 rounded-lg bg-gradient-to-r from-orange-500/15 to-amber-500/15 hover:from-orange-500/25 hover:to-amber-500/25 border border-orange-500/30 text-orange-400 font-bold text-[10px] text-center transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Servise Git</span>
                  <span>→</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Button: "Tüm Uygun Servisleri Gör →" */}
      {candidates.length > 0 && (
        <button
          onClick={() => setIsExpandedModalOpen(true)}
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5 mt-auto"
        >
          <span>Tüm Uygun Servisleri Gör</span>
          <span>→</span>
        </button>
      )}

      {/* COMPLETE TURKEY 81 PROVINCES CITY SELECTOR MODAL (Fix #2: Scaled, non-overflowing modal) */}
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
                <span className="text-[10px] text-slate-400 font-mono">Türkiye (81 İl Selektörü)</span>
              </div>
              <button
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
                placeholder="81 il içerisinde ara (örn. İstanbul, Bayburt, Iğdır)..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-500 outline-none text-[11px] sm:text-xs"
              />
            </div>

            {/* Scrollable List with custom subtle scrollbar */}
            <div className="flex-1 overflow-y-auto max-h-[50vh] pr-1 space-y-1 font-mono text-xs scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-slate-950">
              {filteredCities.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">Aramayla eşleşen il bulunamadı.</div>
              ) : (
                filteredCities.map((city) => (
                  <button
                    key={city}
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

      {/* EXPANDED FULL MODAL OVERLAY */}
      {isExpandedModalOpen && (
        <div
          onClick={() => setIsExpandedModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl bg-[#0b0f19] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-400" /> {vehicleBrand} İçin Uygun Servisler
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedCity ? `📍 ${selectedCity}` : 'Şehir seçilmedi'} için doğrulanmış İşi Cepte üyesi servisler
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCitySelectorOpen(true)}
                  className="px-3 py-1.5 bg-slate-900 border border-orange-500/30 rounded-xl text-xs font-bold text-orange-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  <span>📍 {selectedCity || 'Şehir Seç'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                <button
                  onClick={() => setIsExpandedModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SECTION 1: SIZE YAKIN SERVİSLER */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Size Yakın Servisler ({allLocalCandidates.length})
              </h3>
              {allLocalCandidates.length === 0 ? (
                <div className="p-4 bg-slate-950 rounded-xl border border-white/5 text-slate-400 text-xs font-mono text-center">
                  Seçili şehirde ({selectedCity || 'Belirtilmedi'}) uygun servis bulunamadı.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allLocalCandidates.map((shop) => (
                    <div
                      key={shop.id}
                      className="p-4 bg-slate-900/80 rounded-2xl border border-white/10 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-extrabold text-white">{shop.businessName}</h4>
                          {shop.showcaseActive && (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded">
                              Öne Çıkan
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          📍 {shop.countryCode} • {shop.regionCode} {shop.district ? `/ ${shop.district}` : ''}
                        </div>
                        <div className="text-[11px] text-orange-400 font-medium">
                          {vehicleBrand} markasına hizmet veriyor
                        </div>
                      </div>
                      <a
                        href={shop.link || 'https://isicepte.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-xl text-[11px] font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Servise Git</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: TÜRKİYE GENELİNDEN SERVİSLER */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h3 className="text-xs font-black text-purple-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> Türkiye Genelinden Servisler ({allNationalCandidates.length})
              </h3>
              {allNationalCandidates.length === 0 ? (
                <div className="p-4 bg-slate-950 rounded-xl border border-white/5 text-slate-400 text-xs font-mono text-center">
                  Türkiye genelinden ek servis bulunmuyor.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allNationalCandidates.map((shop) => (
                    <div
                      key={shop.id}
                      className="p-4 bg-slate-900/80 rounded-2xl border border-white/10 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-extrabold text-white">{shop.businessName}</h4>
                          <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded">
                            Türkiye Genelinden
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          📍 {shop.countryCode} • {shop.regionCode} {shop.district ? `/ ${shop.district}` : ''}
                        </div>
                        <div className="text-[11px] text-orange-400 font-medium">
                          {vehicleBrand} markasına hizmet veriyor
                        </div>
                      </div>
                      <a
                        href={shop.link || 'https://isicepte.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-xl text-[11px] font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Servise Git</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
