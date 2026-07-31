import React from "react";
import { VehicleHighlight } from "@used-car-intelligence/shared";

interface Props {
  highlights?: VehicleHighlight[];
}

export const VehicleHighlights: React.FC<Props> = ({ highlights }) => {
  if (!highlights || highlights.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <span className="text-xl">🌟</span>
        <div>
          <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">
            Araçlar Nerede Öne Çıkıyor?
          </h3>
          <p className="text-xs text-slate-400">
            Karşılaştırmadaki her aracın güçlü yönleri ve dikkat gerektiren noktaları
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {highlights.map((h) => (
          <div
            key={h.vehicleId}
            className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-orange-500/30 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                <h4 className="text-sm font-black text-orange-400">{h.vehicleName}</h4>
                <span className="text-[9px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-white/5">
                  {h.confidence === "HIGH" ? "Doğrulanmış" : "Tahmini"}
                </span>
              </div>

              {/* Strengths */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider block">
                  ✓ Güçlü Yönleri
                </span>
                <ul className="space-y-1">
                  {h.strengths.map((s, idx) => (
                    <li key={idx} className="text-xs text-slate-200 flex items-start gap-1.5 leading-snug">
                      <span className="text-green-400 shrink-0">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cautions */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  ⚠️ Dikkat Edilmesi Gerekenler
                </span>
                <ul className="space-y-1">
                  {h.cautions.map((c, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5 leading-snug">
                      <span className="text-amber-400 shrink-0">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Supporting Facts */}
            {h.supportingFacts && h.supportingFacts.length > 0 && (
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 flex flex-wrap gap-2 text-[10px] text-slate-400">
                {h.supportingFacts.map((fact, idx) => (
                  <span key={idx} className="bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                    {fact}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VehicleHighlights;
