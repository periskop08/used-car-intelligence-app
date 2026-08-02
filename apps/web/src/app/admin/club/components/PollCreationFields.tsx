"use client";

import React from "react";

export interface PollFormData {
  enabled: boolean;
  question: string;
  options: string[];
  selectionType: "SINGLE" | "MULTIPLE";
  maxSelections: number;
  resultVisibility: "ALWAYS" | "AFTER_VOTE" | "AFTER_END" | "ADMIN_ONLY";
  durationType: "UNLIMITED" | "1H" | "6H" | "12H" | "1D" | "3D" | "7D" | "CUSTOM";
  customEndsAt: string;
  notifyParticipantsOnClose: boolean;
}

interface PollCreationFieldsProps {
  value: PollFormData;
  onChange: (data: PollFormData) => void;
}

export default function PollCreationFields({ value, onChange }: PollCreationFieldsProps) {
  const updateField = (fields: Partial<PollFormData>) => {
    onChange({ ...value, ...fields });
  };

  const handleAddOption = () => {
    if (value.options.length >= 10) return;
    updateField({ options: [...value.options, ""] });
  };

  const handleRemoveOption = (index: number) => {
    if (value.options.length <= 2) return;
    const newOpts = value.options.filter((_, i) => i !== index);
    updateField({
      options: newOpts,
      maxSelections: Math.min(value.maxSelections, newOpts.length),
    });
  };

  const handleOptionChange = (index: number, val: string) => {
    const newOpts = [...value.options];
    newOpts[index] = val;
    updateField({ options: newOpts });
  };

  const handleMoveOption = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= value.options.length) return;
    const newOpts = [...value.options];
    const temp = newOpts[index];
    newOpts[index] = newOpts[targetIdx];
    newOpts[targetIdx] = temp;
    updateField({ options: newOpts });
  };

  const calculateEndsAtIso = (): string | undefined => {
    if (value.durationType === "UNLIMITED") return undefined;
    if (value.durationType === "CUSTOM") return value.customEndsAt || undefined;

    const now = new Date();
    switch (value.durationType) {
      case "1H":
        now.setHours(now.getHours() + 1);
        break;
      case "6H":
        now.setHours(now.getHours() + 6);
        break;
      case "12H":
        now.setHours(now.getHours() + 12);
        break;
      case "1D":
        now.setDate(now.getDate() + 1);
        break;
      case "3D":
        now.setDate(now.getDate() + 3);
        break;
      case "7D":
        now.setDate(now.getDate() + 7);
        break;
    }
    return now.toISOString();
  };

  return (
    <div className="pt-4 border-t border-white/10 space-y-4">
      {/* Checkbox Toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => updateField({ enabled: e.target.checked })}
            className="w-4 h-4 rounded border-white/20 bg-slate-950 text-orange-500 focus:ring-orange-500"
          />
          📊 Gönderiye Anket Ekle (Opsiyonel)
        </label>
        {value.enabled && (
          <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
            Anket Modülü Aktif
          </span>
        )}
      </div>

      {value.enabled && (
        <div className="p-4 rounded-xl bg-slate-950 border border-orange-500/30 space-y-5">
          {/* Question Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">Anket Sorusu (*Zorunlu):</label>
              <span
                className={`text-[10px] font-mono ${
                  value.question.length > 300 ? "text-rose-400" : "text-slate-400"
                }`}
              >
                {value.question.length}/300 Karakter
              </span>
            </div>
            <input
              type="text"
              value={value.question}
              onChange={(e) => updateField({ question: e.target.value })}
              placeholder="Örn: 2026 modellerinde en çok tercih edeceğiniz yakıt türü hangisi?"
              maxLength={300}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          {/* Options (2 - 10) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300">
                Anket Seçenekleri (En Az 2, En Fazla 10):
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {value.options.length}/10 Seçenek
              </span>
            </div>

            <div className="space-y-2">
              {value.options.map((optionText, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs font-mono text-slate-400">{idx + 1}.</span>
                  <input
                    type="text"
                    value={optionText}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Seçenek ${idx + 1} (Örn: Benzin / Hibrit)`}
                    maxLength={150}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOption(idx, "up")}
                      className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 text-[10px]"
                      title="Yukarı Taşı"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === value.options.length - 1}
                      onClick={() => handleMoveOption(idx, "down")}
                      className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 text-[10px]"
                      title="Aşağı Taşı"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      disabled={value.options.length <= 2}
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 rounded bg-slate-900 hover:bg-rose-500/20 text-rose-400 disabled:opacity-30 text-[10px]"
                      title="Sil"
                    >
                      ✖️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {value.options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-3 text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition"
              >
                ➕ Seçenek Ekle
              </button>
            )}
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/5">
            {/* Selection Type */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Seçim Türü:</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="selectionType"
                    checked={value.selectionType === "SINGLE"}
                    onChange={() => updateField({ selectionType: "SINGLE", maxSelections: 1 })}
                    className="text-orange-500 focus:ring-orange-500"
                  />
                  Tek Seçim (Radio)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="selectionType"
                    checked={value.selectionType === "MULTIPLE"}
                    onChange={() => updateField({ selectionType: "MULTIPLE", maxSelections: 2 })}
                    className="text-orange-500 focus:ring-orange-500"
                  />
                  Çoklu Seçim (Checkbox)
                </label>
              </div>

              {value.selectionType === "MULTIPLE" && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Max Seçim Sayısı:</span>
                  <select
                    value={value.maxSelections}
                    onChange={(e) => updateField({ maxSelections: parseInt(e.target.value, 10) })}
                    className="px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs text-white focus:outline-none"
                  >
                    {Array.from({ length: value.options.length - 1 }, (_, i) => i + 2).map((num) => (
                      <option key={num} value={num}>
                        En fazla {num} seçenek
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Result Visibility */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Sonuç Görünürlüğü:</label>
              <select
                value={value.resultVisibility}
                onChange={(e) => updateField({ resultVisibility: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="AFTER_VOTE">Oy Verdikten Sonra Göster (Önerilen)</option>
                <option value="ALWAYS">Her Zaman Göster (Canlı Sonuçlar)</option>
                <option value="AFTER_END">Anket Sona Erdikten Sonra Göster</option>
                <option value="ADMIN_ONLY">Yalnızca Yöneticilere Göster</option>
              </select>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Anket Süresi:</label>
              <select
                value={value.durationType}
                onChange={(e) => updateField({ durationType: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="UNLIMITED">Süresiz (Sürekli Açık)</option>
                <option value="1H">1 Saat</option>
                <option value="6H">6 Saat</option>
                <option value="12H">12 Saat</option>
                <option value="1D">1 Gün (24 Saat)</option>
                <option value="3D">3 Gün</option>
                <option value="7D">7 Gün</option>
                <option value="CUSTOM">Özel Bitiş Tarihi & Saat</option>
              </select>

              {value.durationType === "CUSTOM" && (
                <input
                  type="datetime-local"
                  value={value.customEndsAt}
                  onChange={(e) => updateField({ customEndsAt: e.target.value })}
                  className="mt-2 w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="pt-3 border-t border-white/10">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              👀 Canlı Anket Önizlemesi
            </h4>
            <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
              <p className="text-xs font-bold text-white">
                {value.question.trim() || "Anket sorusu burada görüntülenecektir..."}
              </p>
              <div className="space-y-2">
                {value.options.map((opt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-white/5 text-xs text-slate-300"
                  >
                    <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                      {value.selectionType === "SINGLE" ? "○" : "□"}
                    </span>
                    <span>{opt.trim() || `Seçenek ${i + 1}`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
