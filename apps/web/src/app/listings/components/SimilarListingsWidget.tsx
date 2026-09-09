'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Car,
  Gauge,
  Calendar,
  Fuel,
  Settings,
  MapPin,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

import CompactListingCard from '@/components/listings/CompactListingCard';

interface SimilarListingItem {
  id: string;
  title: string;
  brand?: string;
  model?: string;
  modelYear: number;
  kilometers: number;
  priceAmount: number;
  currency: string;
  city: string;
  district?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  bodyType?: string | null;
  enginePower?: number | null;
  engineDisplacement?: number | null;
  imageUrl?: string | null;
  similarityScore?: number;
  isUrgent?: boolean;
  isShowcaseFeedActive?: boolean;
  isFeatured?: boolean;
}

interface SimilarListingsWidgetProps {
  listingId: string;
  className?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://used-car-intelligence-app.onrender.com';

export default function SimilarListingsWidget({
  listingId,
  className = '',
}: SimilarListingsWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [items, setItems] = useState<SimilarListingItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!listingId) return;

    let isSubscribed = true;
    setLoading(true);

    fetch(`${API_BASE_URL}/listings/${listingId}/similar`)
      .then((res) => {
        if (!res.ok) throw new Error('Benzer ilanlar alınamadı');
        return res.json();
      })
      .then((data) => {
        if (isSubscribed) {
          const list = Array.isArray(data.items) ? data.items : [];
          setItems(list);
          setTotalCount(data.total ?? list.length);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setItems([]);
          setTotalCount(0);
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [listingId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatFuel = (fuel?: string | null) => {
    if (!fuel) return null;
    switch (fuel) {
      case 'PETROL':
      case 'BENZIN':
        return 'Benzin';
      case 'DIESEL':
      case 'DIZEL':
        return 'Dizel';
      case 'HYBRID':
      case 'HIBRIT':
        return 'Hibrit';
      case 'ELECTRIC':
      case 'ELEKTRIK':
        return 'Elektrik';
      case 'LPG':
        return 'LPG';
      default:
        return fuel;
    }
  };

  const formatTransmission = (trans?: string | null) => {
    if (!trans) return null;
    switch (trans) {
      case 'AUTOMATIC':
      case 'OTOMATIK':
        return 'Otomatik';
      case 'MANUAL':
      case 'MANUEL':
        return 'Manuel';
      case 'SEMI_AUTOMATIC':
      case 'YARI_OTOMATIK':
        return 'Yarı Otomatik';
      default:
        return trans;
    }
  };

  // Mini kutucukta en fazla 10 adet benzer ilan kaydırılabilir
  const miniListings = items.slice(0, 10);

  return (
    <div
      className={`glass rounded-2xl border border-white/10 flex flex-col shadow-xl transition-all duration-300 overflow-hidden font-sans ${className}`}
    >
      {/* 1. Header: Açılır / Kapanır Buton Barı */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/[0.02] transition select-none border-b border-white/5"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide truncate">
              BENZER İLANLAR
            </h3>
            {totalCount > 0 && (
              <span className="text-[10px] font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.2 rounded-md leading-none shrink-0">
                {totalCount}
              </span>
            )}
          </div>
        </div>

        {/* Açılır / Kapanır Ok Butonu */}
        <button
          type="button"
          aria-label={isOpen ? 'Kapat' : 'Aç'}
          className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer shrink-0"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Body: Açıkken Tam 5 İlan Görünür, 10 İlana Kadar Kutu İçi Kaydırılabilir */}
      {isOpen && (
        <div className="p-3.5 sm:p-4 flex flex-col gap-3 min-h-0 animate-in fade-in duration-200">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono animate-pulse">
              Benzer araçlar taranıyor...
            </div>
          ) : miniListings.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-white/5 p-4">
              Bu kritere uygun benzer araç ilanı bulunamadı.
            </div>
          ) : (
            /* Görünürde Tam 5 benzer ilan sınırı (max-h-[385px]), 10 ilana kadar iç kaydırma */
            <div className="max-h-[385px] overflow-y-auto pr-1 flex flex-col gap-2.5 custom-scrollbar overscroll-contain">
              {miniListings.map((item) => (
                <CompactListingCard key={item.id} listing={item} />
              ))}
            </div>
          )}

          {totalCount > 0 && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full py-2.5 bg-[#0f172a]/95 hover:bg-[#1e293b] border border-white/10 hover:border-orange-500/40 rounded-xl text-xs font-bold text-orange-400 hover:text-orange-300 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shrink-0 mt-1"
            >
              <span>Tüm Benzer İlanları Gör ({totalCount})</span>
              <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
            </button>
          )}
        </div>
      )}

      {mounted &&
        isModalOpen &&
        createPortal(
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-[#081120] border border-orange-500/30 rounded-[28px] p-5 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col my-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                      Tüm Benzer Araç İlanları
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        {totalCount} Sonuç
                      </span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                      Fiyat, marka, model, yıl, yakıt, vites ve motor hacmi kriterlerine göre sıralandı.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {items.map((car, idx) => (
                    <Link
                      key={car.id}
                      href={`/listings/${car.id}`}
                      className="p-3.5 rounded-2xl bg-[#0c162b] hover:bg-[#12203d] border border-white/10 hover:border-orange-500/40 transition flex gap-3.5 group cursor-pointer shadow-md relative"
                    >
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0 relative flex items-center justify-center">
                        {car.imageUrl ? (
                          <img
                            src={car.imageUrl}
                            alt={car.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-600">
                            <Car className="w-8 h-8 text-slate-500" />
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-sm text-white text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                          #{idx + 1}
                        </span>
                        {car.isUrgent && (
                          <span className="absolute top-1.5 right-1.5 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600/95 text-white font-extrabold text-[9px] tracking-wider uppercase shadow-md border border-red-400/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                            <span>ACİL</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1 justify-between py-0.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-orange-400 transition truncate leading-snug">
                              {car.title}
                            </h4>
                            {car.isShowcaseFeedActive && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[8px] uppercase tracking-wider shadow-xs border border-amber-300">
                                <span className="text-[8.5px]">⭐</span>
                                <span>VİTRİN</span>
                              </span>
                            )}
                          </div>

                          <div className="text-sm sm:text-base font-black text-orange-400 leading-tight">
                            {formatPrice(car.priceAmount)}
                          </div>

                          <div className="flex items-center gap-1 text-[10.5px] text-slate-400 font-mono truncate">
                            <MapPin className="w-3 h-3 text-orange-400/80 shrink-0" />
                            <span>
                              {car.city} {car.district ? `/ ${car.district}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Alt Özellik Hapları */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1.5 text-[9.5px] font-mono text-slate-300">
                          <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">
                            {car.modelYear}
                          </span>
                          <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">
                            {car.kilometers.toLocaleString('tr-TR')} km
                          </span>
                          {car.fuelType && (
                            <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">
                              {formatFuel(car.fuelType)}
                            </span>
                          )}
                          {car.transmission && (
                            <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">
                              {formatTransmission(car.transmission)}
                            </span>
                          )}
                          {car.enginePower && (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded">
                              {car.enginePower} HP
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Modal Alt Aksiyon Barı */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400 font-mono">
                  Toplam {totalCount} ilan bulundu
                </span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
