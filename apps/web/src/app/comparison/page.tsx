"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import QuotaExhaustionModal from "@/components/QuotaExhaustionModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface SlotData {
  id: number;
  selectedBrand: string;
  selectedModel: string;
  selectedYear: string;
  selectedBodyType: string;
  selectedEngine: string;
  selectedFuelType: string;
  selectedTransmission: string;
  selectedTrim: string;
  matchedVariantId: string | null;

  models: string[];
  years: string[];
  bodyTypes: string[];
  engines: string[];
  fuelTypes: string[];
  transmissions: string[];
  trims: string[];

  loadingModels: boolean;
  loadingYears: boolean;
  loadingBodyTypes: boolean;
  loadingEngines: boolean;
  loadingFuels: boolean;
  loadingTransmissions: boolean;
  loadingTrims: boolean;
}

const createEmptySlot = (id: number): SlotData => ({
  id,
  selectedBrand: "",
  selectedModel: "",
  selectedYear: "",
  selectedBodyType: "",
  selectedEngine: "",
  selectedFuelType: "",
  selectedTransmission: "",
  selectedTrim: "",
  matchedVariantId: null,

  models: [],
  years: [],
  bodyTypes: [],
  engines: [],
  fuelTypes: [],
  transmissions: [],
  trims: [],

  loadingModels: false,
  loadingYears: false,
  loadingBodyTypes: false,
  loadingEngines: false,
  loadingFuels: false,
  loadingTransmissions: false,
  loadingTrims: false,
});

export default function ComparisonPage() {
  const router = useRouter();

  // Brands list (string values e.g. "Audi", "BMW")
  const [brands, setBrands] = useState<string[]>([]);

  // User tier & limit
  const [userTier, setUserTier] = useState<string>("TANISMA");
  const [vehicleLimit, setVehicleLimit] = useState<number>(2);

  // Slots state (dynamically sized)
  const [slots, setSlots] = useState<SlotData[]>([createEmptySlot(1), createEmptySlot(2)]);

  // Result comparison state
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Chatbot & Quota states
  const reportStartRef = useRef<HTMLDivElement>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "assistant"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  // Fetch initial brands and user quota/tier
  useEffect(() => {
    const loadBrands = () => {
      fetch(`${API_URL}/vehicle-filters/brands`)
        .then(res => res.json())
        .then(res => {
          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            setBrands(res.data.map((b: any) => b.value));
          } else {
            fetch(`${API_URL}/vehicles/brands`)
              .then(r => r.json())
              .then(bData => {
                if (Array.isArray(bData)) setBrands(bData.map((b: any) => b.name));
              })
              .catch(() => null);
          }
        })
        .catch(() => {
          fetch(`${API_URL}/vehicles/brands`)
            .then(r => r.json())
            .then(bData => {
              if (Array.isArray(bData)) setBrands(bData.map((b: any) => b.name));
            })
            .catch(() => null);
        });
    };
    loadBrands();

    // Immediately check localStorage user state for instant 10/5 slots render
    const storedUserStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (storedUserStr) {
      try {
        const u = JSON.parse(storedUserStr);
        if (u.role === "ADMIN" || u.subscriptionTier === "PROFESYONEL") {
          setLimitAndInitSlots(10, "PROFESYONEL");
        } else if (u.subscriptionTier === "YETKIN") {
          setLimitAndInitSlots(5, "YETKIN");
        }
      } catch (e) {}
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      fetch(`${API_URL}/comparisons/quota`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (typeof data.remainingChatbotMessages === "number") {
            setRemainingQuota(data.remainingChatbotMessages);
          }
          if (data.userLimit && data.userTier) {
            setLimitAndInitSlots(data.userLimit, data.userTier);
          }
        })
        .catch(() => null);
    }
  }, []);

  // Update slots when user limit changes
  const setLimitAndInitSlots = (limit: number, tierName: string) => {
    setVehicleLimit(limit);
    setUserTier(tierName);
    setSlots(prev => {
      if (prev.length === limit) return prev;
      const newSlots: SlotData[] = [];
      for (let i = 1; i <= limit; i++) {
        newSlots.push(prev[i - 1] || createEmptySlot(i));
      }
      return newSlots;
    });
  };

  // Helper to update single slot state
  const updateSlot = (index: number, patch: Partial<SlotData>) => {
    setSlots(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  // Slot cascade handlers using /vehicle-filters/ endpoints
  const handleBrandChange = (index: number, brandName: string) => {
    updateSlot(index, {
      selectedBrand: brandName,
      selectedModel: "",
      selectedYear: "",
      selectedBodyType: "",
      selectedEngine: "",
      selectedFuelType: "",
      selectedTransmission: "",
      selectedTrim: "",
      matchedVariantId: null,
      models: [],
      years: [],
      bodyTypes: [],
      engines: [],
      fuelTypes: [],
      transmissions: [],
      trims: [],
      loadingModels: !!brandName,
    });

    if (!brandName) return;

    fetch(`${API_URL}/vehicle-filters/models?brand=${encodeURIComponent(brandName)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { models: res.data.map((m: any) => m.value), loadingModels: false });
        } else {
          updateSlot(index, { loadingModels: false });
        }
      })
      .catch(() => updateSlot(index, { loadingModels: false }));
  };

  const handleModelChange = (index: number, modelName: string) => {
    const slot = slots[index];
    updateSlot(index, {
      selectedModel: modelName,
      selectedYear: "",
      selectedBodyType: "",
      selectedEngine: "",
      selectedFuelType: "",
      selectedTransmission: "",
      selectedTrim: "",
      matchedVariantId: null,
      years: [],
      bodyTypes: [],
      engines: [],
      fuelTypes: [],
      transmissions: [],
      trims: [],
      loadingYears: !!modelName,
    });

    if (!modelName || !slot.selectedBrand) return;

    fetch(`${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(modelName)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { years: res.data.map((y: any) => y.value), loadingYears: false });
        } else {
          updateSlot(index, { loadingYears: false });
        }
      })
      .catch(() => updateSlot(index, { loadingYears: false }));
  };

  const handleYearChange = (index: number, yearVal: string) => {
    const slot = slots[index];
    updateSlot(index, {
      selectedYear: yearVal,
      selectedBodyType: "",
      selectedEngine: "",
      selectedFuelType: "",
      selectedTransmission: "",
      selectedTrim: "",
      matchedVariantId: null,
      bodyTypes: [],
      engines: [],
      fuelTypes: [],
      transmissions: [],
      trims: [],
      loadingBodyTypes: !!yearVal,
    });

    if (!yearVal || !slot.selectedBrand || !slot.selectedModel) return;

    fetch(`${API_URL}/vehicle-filters/body-types?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(slot.selectedModel)}&year=${yearVal}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { bodyTypes: res.data.map((b: any) => b.value), loadingBodyTypes: false });
        } else {
          updateSlot(index, { loadingBodyTypes: false });
        }
      })
      .catch(() => updateSlot(index, { loadingBodyTypes: false }));
  };

  const handleBodyTypeChange = (index: number, bodyVal: string) => {
    const slot = slots[index];
    updateSlot(index, {
      selectedBodyType: bodyVal,
      selectedEngine: "",
      selectedFuelType: "",
      selectedTransmission: "",
      selectedTrim: "",
      matchedVariantId: null,
      engines: [],
      fuelTypes: [],
      transmissions: [],
      trims: [],
      loadingEngines: !!bodyVal,
    });

    if (!bodyVal || !slot.selectedBrand || !slot.selectedModel || !slot.selectedYear) return;

    fetch(`${API_URL}/vehicle-filters/engines?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(slot.selectedModel)}&year=${slot.selectedYear}&bodyType=${encodeURIComponent(bodyVal)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { engines: res.data.map((e: any) => e.value), loadingEngines: false });
        } else {
          updateSlot(index, { loadingEngines: false });
        }
      })
      .catch(() => updateSlot(index, { loadingEngines: false }));
  };

  const handleEngineChange = (index: number, engineVal: string) => {
    const slot = slots[index];
    updateSlot(index, {
      selectedEngine: engineVal,
      selectedFuelType: "",
      selectedTransmission: "",
      selectedTrim: "",
      matchedVariantId: null,
      fuelTypes: [],
      transmissions: [],
      trims: [],
      loadingFuels: !!engineVal,
    });

    if (!engineVal || !slot.selectedBrand || !slot.selectedModel || !slot.selectedYear || !slot.selectedBodyType) return;

    fetch(`${API_URL}/vehicle-filters/fuel-types?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(slot.selectedModel)}&year=${slot.selectedYear}&bodyType=${encodeURIComponent(slot.selectedBodyType)}&engine=${encodeURIComponent(engineVal)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { fuelTypes: res.data.map((f: any) => f.value), loadingFuels: false });
        } else {
          updateSlot(index, { loadingFuels: false });
        }
      })
      .catch(() => updateSlot(index, { loadingFuels: false }));
  };

  const handleFuelTypeChange = (index: number, fuelVal: string) => {
    const slot = slots[index];
    updateSlot(index, {
      selectedFuelType: fuelVal,
      selectedTransmission: "",
      selectedTrim: "",
      matchedVariantId: null,
      transmissions: [],
      trims: [],
      loadingTransmissions: !!fuelVal,
    });

    if (!fuelVal || !slot.selectedBrand || !slot.selectedModel || !slot.selectedYear || !slot.selectedBodyType || !slot.selectedEngine) return;

    fetch(`${API_URL}/vehicle-filters/transmissions?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(slot.selectedModel)}&year=${slot.selectedYear}&bodyType=${encodeURIComponent(slot.selectedBodyType)}&engine=${encodeURIComponent(slot.selectedEngine)}&fuelType=${encodeURIComponent(fuelVal)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { transmissions: res.data.map((t: any) => t.value), loadingTransmissions: false });
        } else {
          updateSlot(index, { loadingTransmissions: false });
        }
      })
      .catch(() => updateSlot(index, { loadingTransmissions: false }));
  };

  const handleTransmissionChange = (index: number, transVal: string) => {
    const slot = slots[index];
    updateSlot(index, {
      selectedTransmission: transVal,
      selectedTrim: "",
      matchedVariantId: null,
      trims: [],
      loadingTrims: !!transVal,
    });

    if (!transVal || !slot.selectedBrand || !slot.selectedModel || !slot.selectedYear || !slot.selectedBodyType || !slot.selectedEngine || !slot.selectedFuelType) return;

    fetch(`${API_URL}/vehicle-filters/trims?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(slot.selectedModel)}&year=${slot.selectedYear}&bodyType=${encodeURIComponent(slot.selectedBodyType)}&engine=${encodeURIComponent(slot.selectedEngine)}&fuelType=${encodeURIComponent(slot.selectedFuelType)}&transmission=${encodeURIComponent(transVal)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { trims: res.data.map((tr: any) => tr.value), loadingTrims: false });
        } else {
          updateSlot(index, { loadingTrims: false });
        }
      })
      .catch(() => updateSlot(index, { loadingTrims: false }));
  };

  const handleTrimChange = (index: number, trimVal: string) => {
    const slot = slots[index];
    updateSlot(index, {
      selectedTrim: trimVal,
      matchedVariantId: null,
    });

    if (!trimVal || !slot.selectedBrand || !slot.selectedModel || !slot.selectedYear || !slot.selectedBodyType || !slot.selectedEngine || !slot.selectedFuelType || !slot.selectedTransmission) return;

    const queryParams = new URLSearchParams({
      brand: slot.selectedBrand,
      model: slot.selectedModel,
      year: slot.selectedYear,
      bodyType: slot.selectedBodyType,
      engine: slot.selectedEngine,
      fuelType: slot.selectedFuelType,
      transmission: slot.selectedTransmission,
      trim: trimVal,
    });

    fetch(`${API_URL}/vehicle-filters/match-variant?${queryParams.toString()}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.variantId) {
          updateSlot(index, { matchedVariantId: res.variantId });
        }
      })
      .catch(() => null);
  };

  // Collect filled matched variant IDs
  const matchedVariantIds = slots.map(s => s.matchedVariantId).filter((id): id is string => !!id);

  // Submit Compare API
  const handleCompare = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    if (matchedVariantIds.length < 2) return;

    setLoading(true);
    setError("");
    setComparisonResult(null);

    fetch(`${API_URL}/comparisons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        variantIds: matchedVariantIds,
      }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Karşılaştırma başarısız.");
          });
        }
        return res.json();
      })
      .then(data => {
        setComparisonResult(data);
        if (typeof data.remainingChatbotMessages === "number") {
          setRemainingQuota(data.remainingChatbotMessages);
        }
        if (data.userLimit && data.userTier) {
          setLimitAndInitSlots(data.userLimit, data.userTier);
        }
        if (data.aiAnalysis?.conversationalAdvice) {
          setChatMessages([{ sender: "assistant", text: data.aiAnalysis.conversationalAdvice }]);
        }
        setLoading(false);

        // Auto-scroll to report start
        setTimeout(() => {
          reportStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  // Send Chat Message Handler
  const handleSendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    if (remainingQuota !== null && remainingQuota <= 0) {
      setShowQuotaModal(true);
      return;
    }

    const userQuestion = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { sender: "user", text: userQuestion }]);
    setChatLoading(true);

    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/comparisons/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        variant1Id: matchedVariantIds[0] || slots[0]?.matchedVariantId,
        variant2Id: matchedVariantIds[1] || slots[1]?.matchedVariantId,
        question: userQuestion,
      }),
    })
      .then(res => {
        if (!res.ok) {
          if (res.status === 429) {
            setShowQuotaModal(true);
            throw new Error("Chatbot mesaj kotanız doldu.");
          }
          return res.json().then(err => {
            throw new Error(err.message || "Mesaj gönderilemedi.");
          });
        }
        return res.json();
      })
      .then(data => {
        setChatMessages(prev => [...prev, { sender: "assistant", text: data.response }]);
        if (typeof data.remainingChatbotMessages === "number") {
          setRemainingQuota(data.remainingChatbotMessages);
        }
        setChatLoading(false);
      })
      .catch(err => {
        if (err.message !== "Chatbot mesaj kotanız doldu.") {
          setChatMessages(prev => [...prev, { sender: "assistant", text: `⚠️ ${err.message}` }]);
        }
        setChatLoading(false);
      });
  };

  // Grid styling for slots container based on vehicleLimit
  const getSlotColumnClass = (slotIndex: number) => {
    if (vehicleLimit === 2) {
      return "col-span-1";
    }

    if (vehicleLimit === 5) {
      // Yetkin Layout (3 top + 2 bottom centered)
      if (slotIndex === 1) return "md:col-span-2";
      if (slotIndex === 2) return "md:col-span-2";
      if (slotIndex === 3) return "md:col-span-2";
      if (slotIndex === 4) return "md:col-span-2 md:col-start-2";
      if (slotIndex === 5) return "md:col-span-2 md:col-start-4";
    }

    if (vehicleLimit === 10) {
      // Profesyonel Layout (3 + 3 + 3 + 1 centered)
      if (slotIndex >= 1 && slotIndex <= 9) {
        return "md:col-span-2";
      }
      if (slotIndex === 10) {
        return "md:col-span-2 md:col-start-3"; // Center 10th slot
      }
    }

    return "col-span-1";
  };

  return (
    <div className="max-w-6xl w-full mx-auto px-4 md:px-6 py-10 flex flex-col gap-8">
      
      {/* Title & Subscription Tier Badge */}
      <div className="text-center space-y-3">
        {vehicleLimit > 2 && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-xs font-mono font-bold text-orange-400">
            <span>{userTier === "PROFESYONEL" ? "⭐ Profesyonel Paket" : "Yetkin Paket"}</span>
            <span>•</span>
            <span>{vehicleLimit} araç karşılaştırma</span>
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-black text-slate-100 canvas-title flex items-center justify-center gap-3">
          ⚖️ Araç Karşılaştırma
        </h1>
        <p className="text-xs md:text-sm text-slate-400 canvas-subtitle max-w-xl mx-auto">
          Araçları yan yana getirerek teknik özelliklerini ve yapay zekâ destekli durum analizini inceleyin.
        </p>
      </div>

      {/* Dynamic Selectors Grid */}
      <div className={`grid grid-cols-1 ${
        vehicleLimit === 2 ? "md:grid-cols-2 gap-6 md:gap-8" : "md:grid-cols-6 gap-4 md:gap-5"
      }`}>
        {slots.map((slot, index) => {
          const isCompact10 = vehicleLimit === 10;
          return (
            <div
              key={slot.id}
              className={`glass p-4 md:p-5 rounded-2xl flex flex-col gap-3.5 border border-white/10 ${getSlotColumnClass(
                slot.id
              )}`}
            >
              <h2 className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center justify-between">
                <span>{slot.id}. ARAÇ SEÇİMİ</span>
                {slot.matchedVariantId && (
                  <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded font-mono">
                    ✓ Hazır
                  </span>
                )}
              </h2>

              {/* Responsive Dropdown Grid */}
              <div className={`grid ${isCompact10 ? "grid-cols-1 md:grid-cols-2 gap-2.5" : "grid-cols-1 gap-3"}`}>
                {/* Brand */}
                <select
                  value={slot.selectedBrand}
                  onChange={e => handleBrandChange(index, e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition"
                >
                  <option value="">Marka Seçiniz...</option>
                  {brands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                {/* Model */}
                <select
                  value={slot.selectedModel}
                  onChange={e => handleModelChange(index, e.target.value)}
                  disabled={!slot.selectedBrand || slot.loadingModels}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingModels ? "Yükleniyor..." : "Model Ailesi Seçiniz..."}</option>
                  {slot.models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {/* Year */}
                <select
                  value={slot.selectedYear}
                  onChange={e => handleYearChange(index, e.target.value)}
                  disabled={!slot.selectedModel || slot.loadingYears || slot.years.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingYears ? "Yükleniyor..." : "Yıl Seçiniz..."}</option>
                  {slot.years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                {/* Body Type */}
                <select
                  value={slot.selectedBodyType}
                  onChange={e => handleBodyTypeChange(index, e.target.value)}
                  disabled={!slot.selectedYear || slot.loadingBodyTypes || slot.bodyTypes.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingBodyTypes ? "Yükleniyor..." : "Kasa Tipi Seçiniz..."}</option>
                  {slot.bodyTypes.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                {/* Engine */}
                <select
                  value={slot.selectedEngine}
                  onChange={e => handleEngineChange(index, e.target.value)}
                  disabled={!slot.selectedBodyType || slot.loadingEngines || slot.engines.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingEngines ? "Yükleniyor..." : "Motor / Versiyon Seçiniz..."}</option>
                  {slot.engines.map(eng => (
                    <option key={eng} value={eng}>{eng}</option>
                  ))}
                </select>

                {/* Fuel Type */}
                <select
                  value={slot.selectedFuelType}
                  onChange={e => handleFuelTypeChange(index, e.target.value)}
                  disabled={!slot.selectedEngine || slot.loadingFuels || slot.fuelTypes.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingFuels ? "Yükleniyor..." : "Yakıt Türü Seçiniz..."}</option>
                  {slot.fuelTypes.map(fuel => (
                    <option key={fuel} value={fuel}>{fuel}</option>
                  ))}
                </select>

                {/* Transmission */}
                <select
                  value={slot.selectedTransmission}
                  onChange={e => handleTransmissionChange(index, e.target.value)}
                  disabled={!slot.selectedFuelType || slot.loadingTransmissions || slot.transmissions.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingTransmissions ? "Yükleniyor..." : "Şanzıman Tipi Seçiniz..."}</option>
                  {slot.transmissions.map(trans => (
                    <option key={trans} value={trans}>{trans}</option>
                  ))}
                </select>

                {/* Trim */}
                <select
                  value={slot.selectedTrim}
                  onChange={e => handleTrimChange(index, e.target.value)}
                  disabled={!slot.selectedTransmission || slot.loadingTrims || slot.trims.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingTrims ? "Yükleniyor..." : "Donanım Paketi Seçiniz..."}</option>
                  {slot.trims.map(trim => (
                    <option key={trim} value={trim}>{trim}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compare action button */}
      <button
        onClick={handleCompare}
        disabled={matchedVariantIds.length < 2 || loading}
        className="w-full bg-gradient-to-r from-orange-600 to-amber-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl transition text-center text-sm cursor-pointer"
      >
        {loading ? "🤖 Yapay Zekâ Araçları Kıyaslıyor..." : "Seçili Araçları Karşılaştır"}
      </button>

      {/* Loading state */}
      {loading && (
        <div className="glass p-8 rounded-3xl flex flex-col items-center justify-center gap-4 text-center border border-orange-500/20 bg-orange-950/10 shadow-2xl animate-pulse">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <h3 className="text-lg font-bold text-slate-100">🤖 Yapay Zekâ Araçları Kıyaslıyor...</h3>
          <p className="text-xs text-slate-400 max-w-md">
            TorqueScout AI botu seçtiğin araçların teknik verilerini, motor karakterini ve kronik durumlarını analiz ederek tavsiye raporunu hazırlıyor.
          </p>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-2xl font-semibold text-center">
          ⚠️ {error}
        </div>
      )}

      {/* AI Comparison Chatbot Verdict Card */}
      {comparisonResult && comparisonResult.aiAnalysis && (
        <div ref={reportStartRef} className="glass p-6 md:p-8 rounded-3xl border border-orange-500/30 bg-[#090d1a]/95 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl">
                🤖
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-100">Yapay Zekâ Karşılaştırma & Tavsiye Raporu</h2>
                <p className="text-xs text-slate-400">TorqueScout Chatbot Analiz Sonucu</p>
              </div>
            </div>

            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${
              comparisonResult.isCached
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
            }`}>
              {comparisonResult.isCached ? "⚡ Hazır Önbellek Yanıtı (0.01s)" : "✨ Canlı AI Analizi"}
            </span>
          </div>

          {/* Verdict Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-950/40 to-slate-900 border border-orange-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black text-orange-400 uppercase tracking-widest">🏆 Özet Karar & Tavsiye Edilen Araç</span>
              {comparisonResult.aiAnalysis.recommendedVehicle && (
                <span className="text-xs font-bold text-white bg-orange-600 px-3 py-1 rounded-full shadow">
                  {comparisonResult.aiAnalysis.recommendedVehicle}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-100 leading-relaxed">
              {comparisonResult.aiAnalysis.verdict}
            </p>
          </div>

          {/* Advantages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {comparisonResult.vehicles?.map((v: any, i: number) => (
              <div key={v.id || i} className="p-5 rounded-2xl bg-slate-900/60 border border-orange-500/20 space-y-3">
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  {v.name} Öne Çıkan Avantajları
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {(comparisonResult.aiAnalysis[`advantagesV${i + 1}`] || comparisonResult.aiAnalysis.advantages?.[String(i + 1)])?.map((adv: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Analysis Breakdown Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <span className="text-sm">⚡</span>
              <h4 className="text-xs font-bold text-slate-200">Motor & Performans</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{comparisonResult.aiAnalysis.performanceAnalysis}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <span className="text-sm">🛠️</span>
              <h4 className="text-xs font-bold text-slate-200">Güvenilirlik & Kronik Risk</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{comparisonResult.aiAnalysis.reliabilityAnalysis}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <span className="text-sm">💰</span>
              <h4 className="text-xs font-bold text-slate-200">İkinci El & Değer Koruma</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{comparisonResult.aiAnalysis.resaleAnalysis}</p>
            </div>
          </div>

          {/* Scenario Recommendations */}
          {comparisonResult.aiAnalysis.recommendations && (
            <div className="border-t border-white/10 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Şehir İçi & Kullanım Ekonomisi</span>
                <p className="text-slate-300">{comparisonResult.aiAnalysis.recommendations.cityAndEconomy}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aile & Uzun Yol Konforu</span>
                <p className="text-slate-300">{comparisonResult.aiAnalysis.recommendations.familyAndComfort}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive AI Chatbot Conversation & Message Input */}
      {comparisonResult && comparisonResult.aiAnalysis && (
        <div className="glass p-6 md:p-8 rounded-3xl border border-orange-500/40 bg-gradient-to-br from-[#0c1222] via-[#090d1a] to-[#05070f] shadow-2xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20">
                  💬
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#090d1a] rounded-full"></span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-100">
                  TorqueScout AI Asistanı
                </h3>
                <p className="text-xs text-slate-400">Seçtiğin araçlar hakkında aklına takılan tüm soruları canlı olarak sorabilirsin.</p>
              </div>
            </div>

            {/* Dynamic Chatbot Message Quota Counter Badge */}
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-3.5 py-1.5 rounded-xl text-xs font-mono">
              <span className="text-orange-400 font-bold">💬 Kalan Chatbot Hakkı:</span>
              <span className="text-white font-black">
                {remainingQuota === 999
                  ? "Sınırsız (Admin)"
                  : remainingQuota !== null
                  ? `${remainingQuota} Mesaj`
                  : "..."}
              </span>
            </div>
          </div>

          {/* Chat Messages History Stream */}
          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs md:text-sm ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-orange-600/30 border border-orange-500/40 flex items-center justify-center text-base shrink-0">
                    🤖
                  </div>
                )}
                <div
                  className={`p-4 rounded-2xl max-w-xl leading-relaxed whitespace-pre-wrap ${
                    msg.sender === "user"
                      ? "bg-orange-600 text-white rounded-br-none shadow-lg shadow-orange-500/10"
                      : "bg-slate-900/90 border border-white/10 text-slate-200 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.sender === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-xs shrink-0 font-bold text-slate-300">
                    Sen
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center gap-3 text-xs text-orange-400 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-orange-600/30 border border-orange-500/40 flex items-center justify-center text-base shrink-0">
                  🤖
                </div>
                <div className="bg-slate-900/90 border border-white/10 p-3 rounded-2xl rounded-bl-none text-slate-300">
                  TorqueScout AI düşünce ve yanıtı hazırlıyor...
                </div>
              </div>
            )}
          </div>

          {/* Interactive Chat Message Input Form */}
          <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-2 border-t border-white/10">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Bu araçlar hakkında aklına takılan soruyu sor... (Örn: Hangisinin yedek parçası ve bakımı daha ucuz?)"
              disabled={chatLoading}
              className="flex-1 bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-slate-100 outline-none focus:border-orange-500/50 transition placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold px-6 py-3.5 rounded-2xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20 shrink-0"
            >
              {chatLoading ? "Yanıtlanıyor..." : "Gönder ➔"}
            </button>
          </form>
        </div>
      )}

      {/* Side by Side / Multi-Vehicle Technical Spec Result Display */}
      {comparisonResult && comparisonResult.vehicles && (
        <div className="glass p-6 md:p-8 rounded-3xl flex flex-col gap-6 shadow-2xl overflow-hidden">
          <h2 className="text-xl font-extrabold text-slate-200 border-b border-white/5 pb-3">📊 Detaylı Teknik Özellik Karşılaştırması</h2>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-center border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-3 text-slate-500 text-xs font-bold uppercase tracking-wider text-left sticky left-0 bg-[#0b0f19]/90 backdrop-blur w-44">
                    Parametre
                  </th>
                  {comparisonResult.vehicles.map((v: any, idx: number) => (
                    <th key={v.id || idx} className="p-3">
                      <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl font-bold text-xs md:text-sm text-orange-400">
                        {v.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {/* Engine */}
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-[#0b0f19]/90 backdrop-blur">Motor Seçeneği</td>
                  {comparisonResult.vehicles.map((v: any) => (
                    <td key={v.id} className="p-3">{v.engine}</td>
                  ))}
                </tr>

                {/* Transmission */}
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-[#0b0f19]/90 backdrop-blur">Şanzıman Tipi</td>
                  {comparisonResult.vehicles.map((v: any) => (
                    <td key={v.id} className="p-3">{v.transmission}</td>
                  ))}
                </tr>

                {/* Fuel Type */}
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-[#0b0f19]/90 backdrop-blur">Yakıt Türü</td>
                  {comparisonResult.vehicles.map((v: any) => (
                    <td key={v.id} className="p-3">{v.fuelType}</td>
                  ))}
                </tr>

                {/* Trim */}
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-[#0b0f19]/90 backdrop-blur">Donanım Paketi</td>
                  {comparisonResult.vehicles.map((v: any) => (
                    <td key={v.id} className="p-3">{v.trim}</td>
                  ))}
                </tr>

                {/* Dynamic Specs */}
                {Object.keys(comparisonResult.specComparison || {}).map((key) => {
                  const specObj = comparisonResult.specComparison[key];
                  return (
                    <tr key={key}>
                      <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-[#0b0f19]/90 backdrop-blur">
                        {specObj.label}
                      </td>
                      {comparisonResult.vehicles.map((v: any, idx: number) => {
                        const val = Array.isArray(specObj.values) ? specObj.values[idx] : (idx === 0 ? specObj.v1 : specObj.v2);
                        return (
                          <td key={v.id || idx} className="p-3 font-bold text-slate-200">
                            {val || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Problems count */}
                <tr>
                  <td className="p-3 font-semibold text-slate-400 text-left sticky left-0 bg-[#0b0f19]/90 backdrop-blur">
                    Sık Karşılaşılan Durumlar
                  </td>
                  {comparisonResult.vehicles.map((v: any) => (
                    <td key={v.id} className="p-3 font-bold text-red-400">
                      {v.problemsCount} Adet
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quota Exhaustion Modal */}
      <QuotaExhaustionModal
        isOpen={showQuotaModal}
        onClose={() => setShowQuotaModal(false)}
      />

    </div>
  );
}
