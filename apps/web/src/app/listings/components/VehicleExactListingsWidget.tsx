'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  Car,
  ArrowRight,
} from 'lucide-react';
import CompactListingCard from '@/components/listings/CompactListingCard';

export interface VehicleExactListingItem {
  id: string;
  listingNo: string;
  title: string;
  modelYear: number;
  kilometers: number;
  priceAmount: number;
  currency: string;
  city: string;
  district?: string | null;
  imageUrl?: string | null;
  isShowcaseFeedActive?: boolean;
  isUrgent?: boolean;
}

export interface VehicleListingFilterContext {
  brandId: string;
  brandName: string;
  modelId: string;
  modelName: string;
  year: number;
  bodyType?: string | null;
  engineId?: string | null;
  fuelType?: string | null;
  transmissionId?: string | null;
  transmissionType?: string | null;
  trimId?: string | null;
  trimName?: string | null;
  vehicleVariantId?: string | null;
}

interface VehicleExactListingsWidgetProps {
  variantId: string;
  className?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://used-car-api-hzmu.onrender.com';

export default function VehicleExactListingsWidget({
  variantId,
  className = '',
}: VehicleExactListingsWidgetProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [items, setItems] = useState<VehicleExactListingItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filterContext, setFilterContext] = useState<VehicleListingFilterContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!variantId) return;

    let isSubscribed = true;
    setLoading(true);

    fetch(`${API_BASE_URL}/listings/by-vehicle/${variantId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Bu aracın ilanları alınamadı');
        return res.json();
      })
      .then((data) => {
        if (isSubscribed) {
          const list = Array.isArray(data.items) ? data.items : [];
          setItems(list);
          setTotalCount(typeof data.total === 'number' ? data.total : list.length);
          if (data.filterContext) {
            setFilterContext(data.filterContext);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setItems([]);
          setTotalCount(0);
          setFilterContext(null);
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [variantId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const buildHandoffUrl = (ctx: VehicleListingFilterContext | null) => {
    if (!ctx) return '/listings';
    const params = new URLSearchParams();
    if (ctx.brandId) params.set('brandId', ctx.brandId);
    if (ctx.modelId) params.set('modelId', ctx.modelId);
    if (ctx.year) {
      params.set('minYear', String(ctx.year));
      params.set('maxYear', String(ctx.year));
    }
    if (ctx.bodyType) params.set('bodyType', ctx.bodyType);
    if (ctx.fuelType) params.set('fuelType', ctx.fuelType);
    if (ctx.transmissionType) params.set('transmission', ctx.transmissionType);
    if (ctx.engineId) params.set('engineId', ctx.engineId);
    if (ctx.trimId) params.set('trimId', ctx.trimId);
    if (ctx.transmissionId) params.set('transmissionId', ctx.transmissionId);
    return `/listings?${params.toString()}`;
  };

  return (
    <div
      className={`glass rounded-2xl border border-white/10 flex flex-col shadow-xl transition-all duration-300 overflow-hidden font-sans h-[440px] ${className}`}
    >
      {/* 1. Header: Başlık ve Aç/Kapa Buton Barı */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/[0.02] transition select-none border-b border-white/5 shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide truncate">
              BU ARACIN İLANLARI
            </h3>
            {!loading && (
              <span className="text-[10px] font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.2 rounded-md leading-none shrink-0">
                {totalCount}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label={isOpen ? 'Kapat' : 'Aç'}
          className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer shrink-0"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Body: Sabit dış boyutta bağımsız iç liste alanı ve altta sabitlenmiş CTA */}
      {isOpen && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* İç Liste Kaydırma Alanı */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2.5 custom-scrollbar overscroll-contain">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono animate-pulse">
                Bu aracın ilanları taranıyor...
              </div>
            ) : items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-white/5 p-4 gap-2">
                <span className="text-2xl">🚗</span>
                <span className="font-medium text-slate-300">Bu araç için şu anda aktif ilan bulunmuyor.</span>
                <span className="text-[11px] text-slate-500">
                  Farklı modelleri incelemek için ilanlar sayfasına göz atabilirsiniz.
                </span>
              </div>
            ) : (
              items.map((item) => (
                <CompactListingCard key={item.id} listing={item} />
              ))
            )}
          </div>

          {/* 3. Alt CTA Barı: Liste kaydırma alanının dışında her zaman sabit */}
          <div className="p-3 sm:p-3.5 border-t border-white/5 bg-[#081120]/80 shrink-0">
            {totalCount > 0 ? (
              <Link
                href={buildHandoffUrl(filterContext)}
                className="w-full py-2.5 bg-[#0f172a]/95 hover:bg-[#1e293b] border border-white/10 hover:border-orange-500/40 rounded-xl text-xs font-bold text-orange-400 hover:text-orange-300 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Bu Aracın Tüm İlanlarını Gör ({totalCount})</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
              </Link>
            ) : (
              <Link
                href="/listings"
                className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Tüm İlanlara Git</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
