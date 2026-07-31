import React from "react";
import { ComparisonVehicleCard } from "@used-car-intelligence/shared";

interface Props {
  cards?: ComparisonVehicleCard[];
}

export const ComparisonVehicleCards: React.FC<Props> = ({ cards }) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <span className="text-2xl">🚗</span>
        <div>
          <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">
            Araçların Güçlü Yönleri ve Tavizleri
          </h3>
          <p className="text-xs text-slate-400">
            Her aracın öne çıkan yönlerini, dikkat noktalarını ve hangi kullanıcıya uygun olduğunu tek bakışta inceleyin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => {
          const hasRisks = card.criticalRisks && card.criticalRisks.length > 0;
          return (
            <div
              key={card.vehicleId}
              className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl hover:border-orange-500/30 transition flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Vehicle Header Identity */}
                <div className="border-b border-white/10 pb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-orange-400">{card.vehicleName}</h4>
                    {card.identity?.year && (
                      <span className="text-[10px] bg-slate-800 text-orange-300 font-mono px-2 py-0.5 rounded border border-orange-500/20 font-bold">
                        {card.identity.year}
                      </span>
                    )}
                  </div>
                  {(card.identity?.engine || card.identity?.transmission) && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      {[card.identity.engine, card.identity.transmission, card.identity.trim]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  )}
                </div>

                {/* Character Summary (if meaningful) */}
                {card.characterSummary && card.characterSummary.trim().length > 0 && (
                  <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-white/5 italic">
                    "{card.characterSummary}"
                  </p>
                )}

                {/* Strengths */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider block flex items-center gap-1">
                    <span>✓</span> Güçlü Yönleri
                  </span>
                  <ul className="space-y-1.5">
                    {card.strengths.map((s, idx) => (
                      <li key={idx} className="text-xs text-slate-200 flex items-start gap-2 leading-relaxed">
                        <span className="text-green-400 shrink-0 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cautions / Compromises */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                    <span>⚠️</span> Dikkat Edilmesi Gerekenler / Tavizler
                  </span>
                  <ul className="space-y-1.5">
                    {card.cautions.map((c, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                        <span className="text-amber-400 shrink-0 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Best For Profile */}
                {card.bestFor && card.bestFor.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                      🎯 Kimler İçin Uygun?
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {card.bestFor.map((item, idx) => (
                        <span key={idx} className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-lg">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Not Ideal For Profile */}
                {card.notIdealFor && card.notIdealFor.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                      ❌ Kimler İçin Uygun Değil?
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {card.notIdealFor.map((item, idx) => (
                        <span key={idx} className="text-[10px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded-lg">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Highlighted Critical Risk (Rendered ONLY if verified risk exists) */}
                {hasRisks && (
                  <div className="bg-red-950/30 border border-red-500/20 p-2.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                      🚨 Öne Çıkan Risk Kaydı
                    </span>
                    {card.criticalRisks!.map((risk, idx) => (
                      <div key={idx} className="text-xs text-red-200 flex items-center justify-between">
                        <span>{risk.title}</span>
                        <span className="text-[9px] bg-red-500/20 px-1.5 py-0.5 rounded font-mono">
                          {risk.severity} Risk
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pre-purchase Checks Preview */}
              {card.prePurchaseChecks && card.prePurchaseChecks.length > 0 && (
                <div className="pt-3 border-t border-white/5 space-y-1 text-[11px] text-slate-400">
                  <span className="font-bold text-slate-300 block text-[10px] uppercase tracking-wider">
                    🔍 Almadan Önce Öncelikli Kontrol Et:
                  </span>
                  <ul className="space-y-0.5">
                    {card.prePurchaseChecks.slice(0, 2).map((check, idx) => (
                      <li key={idx} className="truncate text-slate-300">
                        • {check}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComparisonVehicleCards;
