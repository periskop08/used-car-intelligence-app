import React, { useState } from 'react';

interface ComparisonModeNoticeProps {
  generationMode?: 'AI' | 'FALLBACK';
}

export const ComparisonModeNotice: React.FC<ComparisonModeNoticeProps> = ({ generationMode }) => {
  const [dismissed, setDismissed] = useState(false);

  if (generationMode !== 'FALLBACK' || dismissed) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-amber-300 shadow-md">
      <div className="flex items-center gap-3">
        <span className="text-lg">ℹ️</span>
        <div>
          <span className="font-bold">Doğrulanmış Teknik Analiz Modu:</span> Bu değerlendirme veritabanındaki onaylı teknik veriler ve kayıtlı riskler üzerinden hazırlanmıştır. Gelişmiş AI yorumu geçici olarak devrededir.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-slate-400 hover:text-amber-200 transition font-bold px-2 py-1 cursor-pointer shrink-0"
        title="Kapat"
      >
        ✕
      </button>
    </div>
  );
};
