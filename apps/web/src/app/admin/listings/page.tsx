'use client';

import React from 'react';
import { SellerBasedListingModeration } from '../components/SellerBasedListingModeration';

export default function AdminListingsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">İlan Moderasyon Merkezi</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Satıcı bazlı ilan moderasyonu, kalite kontrol, onay, detaylı inceleme ve reddetme aksiyonları.
        </p>
      </div>

      <SellerBasedListingModeration />
    </div>
  );
}
