'use client';
import React from 'react';

interface ReportKpiCardProps {
  title: string;
  value: number | string;
  formattedValue?: string;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'neutral';
  alertLevel?: 'normal' | 'warning' | 'critical';
  drilldownKey?: string;
  drilldownParams?: Record<string, any>;
  onDrilldownClick?: (key: string, params?: any) => void;
}

export const ReportKpiCard: React.FC<ReportKpiCardProps> = ({
  title,
  value,
  formattedValue,
  changePercentage,
  trend = 'neutral',
  alertLevel = 'normal',
  drilldownKey,
  drilldownParams,
  onDrilldownClick,
}) => {
  const displayVal = formattedValue || (typeof value === 'number' ? value.toLocaleString('tr-TR') : value);

  const alertStyles = {
    normal: 'border-white/5 bg-slate-900/60',
    warning: 'border-amber-500/30 bg-amber-500/5',
    critical: 'border-red-500/30 bg-red-500/5',
  }[alertLevel];

  return (
    <div className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col justify-between gap-3 transition-all hover:border-white/20 ${alertStyles}`}>
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-slate-400 tracking-wide">{title}</span>
        {alertLevel !== 'normal' && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            alertLevel === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {alertLevel === 'critical' ? 'KRİTİK İKAZ' : 'DİKKAT'}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">{displayVal}</span>

        {changePercentage !== undefined && (
          <div className={`flex items-center text-xs font-bold font-mono ${
            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'
          }`}>
            <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'}</span>
            <span>{Math.abs(changePercentage)}%</span>
          </div>
        )}
      </div>

      {drilldownKey && (
        <button
          onClick={() => onDrilldownClick && onDrilldownClick(drilldownKey, drilldownParams)}
          className="text-left text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 mt-1 transition-all"
        >
          <span>Detay Kayıtlara Git (Drill-down)</span>
          <span>→</span>
        </button>
      )}
    </div>
  );
};
