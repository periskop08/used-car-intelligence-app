import React from 'react';
import { RecallComparisonItem } from '@used-car-intelligence/shared';

interface RecallComparisonProps {
  recalls?: RecallComparisonItem[];
}

export const RecallComparison: React.FC<RecallComparisonProps> = ({ recalls }) => {
  if (!recalls || recalls.length === 0) return null;

  return (
    <div className="glass p-6 rounded-3xl space-y-4 border border-red-500/20 bg-red-950/10 shadow-xl">
      <div className="flex items-center gap-3">
        <span className="text-xl">🛑</span>
        <div>
          <h3 className="text-base font-bold text-red-300">Geri Çağırmalar ve Üretici Kampanyaları</h3>
          <p className="text-xs text-slate-400">Üreticiler tarafından yayınlanan resmi güvenlik veya düzeltme kampanyaları</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recalls.map((recall, i) => (
          <div key={i} className="bg-slate-900/80 border border-red-500/20 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-red-400">
              <span>{recall.vehicleName}</span>
              {recall.safetyImpact && <span className="bg-red-500/20 px-2 py-0.5 rounded-md">{recall.safetyImpact}</span>}
            </div>
            <h4 className="text-sm font-semibold text-slate-100">{recall.title}</h4>
            <p className="text-xs text-slate-300">{recall.description}</p>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-[11px] text-amber-300 font-medium flex items-start gap-2">
              <span>⚠️</span>
              <span>{recall.verificationInstruction || 'Bu kampanyanın aracınıza uygulanıp uygulanmadığını şasi numarası üzerinden yetkili servisten doğrulayın.'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
