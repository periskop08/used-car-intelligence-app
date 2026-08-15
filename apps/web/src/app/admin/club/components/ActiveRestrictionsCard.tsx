'use client';

import React from 'react';
import Link from 'next/link';

interface RestrictionItem {
  id: string;
  type: 'MUTE' | 'BAN';
  reason: string;
  expiresAt?: string;
  userFormatted: string;
  createdByFormatted?: string;
}

interface ActiveRestrictionsCardProps {
  restrictions: RestrictionItem[];
  onRestrictionClick?: (res: any) => void;
}

export default function ActiveRestrictionsCard({
  restrictions,
  onRestrictionClick,
}: ActiveRestrictionsCardProps) {
  if (!restrictions || restrictions.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 text-center font-mono text-xs">
        <span className="text-2xl mb-1 block">🛡️</span>
        <h4 className="text-xs font-bold text-slate-300 font-sans">Aktif Kısıtlama Yok</h4>
        <p className="text-[11px] text-slate-500 mt-1">Geçici susturulmuş veya engellenmiş üye bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden font-mono text-xs">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚫</span>
          <h3 className="text-sm font-black text-white font-sans">Aktif Kısıtlamalar</h3>
        </div>
        <Link
          href="/admin/club/restrictions"
          className="text-xs font-bold text-orange-400 hover:text-orange-300 transition"
        >
          Yönet ➡️
        </Link>
      </div>

      <div className="divide-y divide-white/5">
        {restrictions.map((item) => (
          <div
            key={item.id}
            onClick={() => onRestrictionClick && onRestrictionClick(item)}
            className="p-4 hover:bg-white/[0.04] transition flex items-center justify-between gap-4 cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    item.type === 'BAN'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {item.type === 'BAN' ? 'YASAKLI (BAN)' : 'SUSTURULDU (MUTE)'}
                </span>
                <span className="text-xs font-bold text-slate-200 font-sans">{item.userFormatted}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">Neden: {item.reason}</p>
            </div>

            {item.expiresAt && (
              <div className="text-right whitespace-nowrap">
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                  Bitiş: {new Date(item.expiresAt).toLocaleDateString('tr-TR')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
