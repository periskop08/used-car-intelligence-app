"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import QuotaExhaustionModal from "@/components/QuotaExhaustionModal";

import { ComparisonModeNotice } from "./components/ComparisonModeNotice";
import { RecallComparison } from "./components/RecallComparison";
import { ContextualDataWarning } from "./components/ContextualDataWarning";
import { ComparisonVehicleCards } from "./components/ComparisonVehicleCards";
import { CriterionAssessmentMatrix } from "./components/CriterionAssessmentMatrix";
import { DecisionSummary } from "./components/DecisionSummary";
import ScenarioCards from "./components/ScenarioCards";
import PrePurchaseChecks from "./components/PrePurchaseChecks";
import TechnicalComparisonTable from "./components/TechnicalComparisonTable";
import QuotaBadge from "@/components/QuotaBadge";
import ComparisonChatbot from "./components/ComparisonChatbot";
import { adaptLegacyComparisonResult } from "@used-car-intelligence/shared";
import { VehicleSearchModeSelector, VehicleSearchMode } from "@/components/common/VehicleSearchModeSelector";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const SLOT_CATEGORIES: { key: VehicleSearchMode; label: string; icon: string }[] = [
  { key: 'AUTOMOBILE', label: 'Otomobil', icon: '🚗' },
  { key: 'SUV_PICKUP', label: 'Arazi & SUV', icon: '🚙' },
  { key: 'COMMERCIAL', label: 'Ticari', icon: '🚐' },
  { key: 'MOTORCYCLE', label: 'Motosiklet', icon: '🏍️' },
];

interface SlotData {
  id: number;
  category: VehicleSearchMode;
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

const createEmptySlot = (id: number, category: VehicleSearchMode = "AUTOMOBILE"): SlotData => ({
  id,
  category,
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

  // Brands cached per category (e.g. { AUTOMOBILE: ["Audi", "BMW"], SUV_PICKUP: ["Dacia", "Jeep"] })
  const [brandsByCategory, setBrandsByCategory] = useState<Record<string, string[]>>({});
  const fetchingBrandsRef = useRef<Record<string, boolean>>({});

  // User tier & limit
  const [userTier, setUserTier] = useState<string>("TANISMA");
  const [vehicleLimit, setVehicleLimit] = useState<number>(2);

  // Selected vehicle category (AUTOMOBILE, SUV_PICKUP, COMMERCIAL, MOTORCYCLE)
  const [searchMode, setSearchMode] = useState<VehicleSearchMode>("AUTOMOBILE");

  // Slots state (dynamically sized)
  const [slots, setSlots] = useState<SlotData[]>([createEmptySlot(1, "AUTOMOBILE"), createEmptySlot(2, "AUTOMOBILE")]);

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

  // Fetch and cache brands for a specific category
  const loadBrandsForCategory = async (mode: VehicleSearchMode) => {
    if (brandsByCategory[mode]?.length || fetchingBrandsRef.current[mode]) return;
    fetchingBrandsRef.current[mode] = true;

    try {
      const res = await fetch(`${API_URL}/vehicle-filters/brands?category=${mode}`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
        const brandNames = data.data.map((b: any) => b.value);
        setBrandsByCategory(prev => ({ ...prev, [mode]: brandNames }));
        fetchingBrandsRef.current[mode] = false;
        return;
      }
    } catch (e) {}

    try {
      const r = await fetch(`${API_URL}/vehicles/brands?category=${mode}`);
      const bData = await r.json();
      if (Array.isArray(bData)) {
        const brandNames = bData.map((b: any) => b.name);
        setBrandsByCategory(prev => ({ ...prev, [mode]: brandNames }));
      }
    } catch (e) {}
    fetchingBrandsRef.current[mode] = false;
  };

  const handleSearchModeChange = (newMode: VehicleSearchMode) => {
    if (newMode === searchMode) return;
    setSearchMode(newMode);
    loadBrandsForCategory(newMode);

    // Update empty slots to the newly selected category so the user can immediately select in this category
    // WITHOUT wiping any slot that is already filled or has a brand selected!
    setSlots(prev =>
      prev.map(s => {
        if (!s.selectedBrand) {
          return createEmptySlot(s.id, newMode);
        }
        return s;
      })
    );
  };

  const handleSlotCategoryChange = (index: number, newCategory: VehicleSearchMode) => {
    if (slots[index]?.category === newCategory) return;
    loadBrandsForCategory(newCategory);
    setSlots(prev => {
      const next = [...prev];
      next[index] = createEmptySlot(prev[index].id, newCategory);
      return next;
    });
  };

  useEffect(() => {
    loadBrandsForCategory(searchMode);
    loadBrandsForCategory("AUTOMOBILE");
    loadBrandsForCategory("SUV_PICKUP");
    loadBrandsForCategory("COMMERCIAL");
    loadBrandsForCategory("MOTORCYCLE");

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

    // Auto-restore saved draft on initial page load / refresh
    const savedDraftStr = typeof window !== "undefined" ? localStorage.getItem("torquescout_comparison_draft_v1") : null;
    if (savedDraftStr) {
      try {
        const draft = JSON.parse(savedDraftStr);
        if (draft.searchMode) {
          setSearchMode(draft.searchMode);
        }
        if (Array.isArray(draft.slots) && draft.slots.length >= 2) {
          const restoredSlots: SlotData[] = draft.slots.map((s: any, idx: number) => {
            const cat: VehicleSearchMode = s.category || draft.searchMode || "AUTOMOBILE";
            loadBrandsForCategory(cat);
            return {
              ...createEmptySlot(s.id || idx + 1, cat),
              ...s,
              category: cat,
            };
          });
          setSlots(restoredSlots);
        }
        if (draft.selectedPriority) {
          setSelectedPriority(draft.selectedPriority);
        }
        if (draft.comparisonResult) {
          setComparisonResult(draft.comparisonResult);
        }
      } catch (e) {
        console.warn("Draft restore failed:", e);
      }
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
        newSlots.push(prev[i - 1] || createEmptySlot(i, searchMode));
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

  const clearSingleSlot = (index: number) => {
    setSlots(prev => {
      const next = [...prev];
      next[index] = createEmptySlot(prev[index].id, prev[index].category);
      return next;
    });
  };

  // Slot cascade handlers using /vehicle-filters/ endpoints
  const handleBrandChange = (index: number, brandName: string) => {
    const slot = slots[index];
    const category = slot?.category || "AUTOMOBILE";

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

    fetch(`${API_URL}/vehicle-filters/models?brand=${encodeURIComponent(brandName)}&category=${category}`)
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
    if (!modelName || !slot.selectedBrand) return;
    const category = slot.category;

    if (category === 'MOTORCYCLE') {
      updateSlot(index, {
        selectedModel: modelName,
        selectedYear: "Tüm Üretim Yılları",
        selectedBodyType: "Tüm Tipler",
        selectedEngine: "Tüm Motor / Versiyonlar",
        selectedFuelType: "Tümü",
        selectedTransmission: "Tüm Motor Hacimleri",
        selectedTrim: "Tüm Vites Tipleri",
        years: ["Tüm Üretim Yılları"],
        bodyTypes: ["Tüm Tipler"],
        engines: ["Tüm Motor / Versiyonlar"],
        fuelTypes: ["Tümü"],
        transmissions: ["Tüm Motor Hacimleri"],
        trims: ["Tüm Vites Tipleri"],
        loadingYears: false,
        loadingBodyTypes: false,
        loadingEngines: false,
        loadingFuels: false,
        loadingTransmissions: false,
        loadingTrims: false,
      });

      const queryParams = new URLSearchParams({
        brand: slot.selectedBrand,
        model: modelName,
        category: "MOTORCYCLE",
      });

      fetch(`${API_URL}/vehicle-filters/match-variant?${queryParams.toString()}`)
        .then(res => res.json())
        .then(res => {
          if (res.success && res.variantId) {
            updateSlot(index, { matchedVariantId: res.variantId });
          }
        })
        .catch(() => {});
      return;
    }

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
      loadingYears: true,
    });

    fetch(`${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(modelName)}&category=${category}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const yearList = res.data.map((y: any) => String(y.value));
          updateSlot(index, { years: yearList, loadingYears: false });
          if (yearList.length === 1) {
            handleYearChange(index, yearList[0]);
          }
        } else {
          updateSlot(index, { loadingYears: false });
        }
      })
      .catch(() => updateSlot(index, { loadingYears: false }));
  };

  const handleYearChange = (index: number, yearVal: string) => {
    const slot = slots[index];
    const category = slot.category;

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
      loadingEngines: !!yearVal,
      loadingFuels: !!yearVal,
      loadingTransmissions: !!yearVal,
      loadingTrims: !!yearVal,
    });

    if (!yearVal || !slot.selectedBrand || !slot.selectedModel) return;

    const baseQuery = `brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(slot.selectedModel)}&year=${yearVal}&category=${category}`;

    fetch(`${API_URL}/vehicle-filters/body-types?${baseQuery}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { bodyTypes: res.data.map((b: any) => b.value), loadingBodyTypes: false });
        } else {
          updateSlot(index, { loadingBodyTypes: false });
        }
      })
      .catch(() => updateSlot(index, { loadingBodyTypes: false }));

    fetch(`${API_URL}/vehicle-filters/engines?${baseQuery}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { engines: res.data.map((e: any) => e.value), loadingEngines: false });
        } else {
          updateSlot(index, { loadingEngines: false });
        }
      })
      .catch(() => updateSlot(index, { loadingEngines: false }));

    fetch(`${API_URL}/vehicle-filters/fuel-types?${baseQuery}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { fuelTypes: res.data.map((f: any) => f.value), loadingFuels: false });
        } else {
          updateSlot(index, { loadingFuels: false });
        }
      })
      .catch(() => updateSlot(index, { loadingFuels: false }));

    fetch(`${API_URL}/vehicle-filters/transmissions?${baseQuery}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { transmissions: res.data.map((t: any) => t.value), loadingTransmissions: false });
        } else {
          updateSlot(index, { loadingTransmissions: false });
        }
      })
      .catch(() => updateSlot(index, { loadingTransmissions: false }));

    fetch(`${API_URL}/vehicle-filters/trims?${baseQuery}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          updateSlot(index, { trims: res.data.map((tr: any) => tr.value), loadingTrims: false, matchedVariantId: res.autoVariantId || null });
        } else {
          updateSlot(index, { loadingTrims: false });
        }
      })
      .catch(() => updateSlot(index, { loadingTrims: false }));

    fetch(`${API_URL}/vehicle-filters/match-variant?${baseQuery}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.variantId) {
          updateSlot(index, { matchedVariantId: res.variantId });
        }
      })
      .catch(() => {});
  };

  const handleBodyTypeChange = (index: number, bodyVal: string) => {
    const slot = slots[index];
    const category = slot.category;

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

    fetch(`${API_URL}/vehicle-filters/engines?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(slot.selectedModel)}&year=${slot.selectedYear}&bodyType=${encodeURIComponent(bodyVal)}&category=${category}`)
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
    const category = slot.category;

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

    fetch(`${API_URL}/vehicle-filters/fuel-types?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(slot.selectedModel)}&year=${slot.selectedYear}&bodyType=${encodeURIComponent(slot.selectedBodyType)}&engine=${encodeURIComponent(engineVal)}&category=${category}`)
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
    const category = slot.category;

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

    fetch(`${API_URL}/vehicle-filters/transmissions?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(slot.selectedModel)}&year=${slot.selectedYear}&bodyType=${encodeURIComponent(slot.selectedBodyType)}&engine=${encodeURIComponent(slot.selectedEngine)}&fuelType=${encodeURIComponent(fuelVal)}&category=${category}`)
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
    const category = slot.category;

    updateSlot(index, {
      selectedTransmission: transVal,
      selectedTrim: "",
      matchedVariantId: null,
      trims: [],
      loadingTrims: !!transVal,
    });

    if (!transVal || !slot.selectedBrand || !slot.selectedModel || !slot.selectedYear || !slot.selectedBodyType || !slot.selectedEngine || !slot.selectedFuelType) return;

    fetch(`${API_URL}/vehicle-filters/trims?brand=${encodeURIComponent(slot.selectedBrand)}&model=${encodeURIComponent(slot.selectedModel)}&year=${slot.selectedYear}&bodyType=${encodeURIComponent(slot.selectedBodyType)}&engine=${encodeURIComponent(slot.selectedEngine)}&fuelType=${encodeURIComponent(slot.selectedFuelType)}&transmissionType=${encodeURIComponent(transVal)}&transmission=${encodeURIComponent(transVal)}&category=${category}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const trimOptions = res.data.map((tr: any) => tr.value);
          updateSlot(index, {
            trims: trimOptions,
            loadingTrims: false,
            matchedVariantId: res.autoVariantId || null,
          });
        } else {
          updateSlot(index, { loadingTrims: false });
        }
      })
      .catch(() => updateSlot(index, { loadingTrims: false }));
  };

  const handleTrimChange = (index: number, trimVal: string) => {
    const slot = slots[index];
    const category = slot.category;

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
      category: category,
    });

    fetch(`${API_URL}/vehicle-filters/match-variant?${queryParams.toString()}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.variantId) {
          updateSlot(index, { matchedVariantId: res.variantId });
        }
      })
  };

  const [selectedPriority, setSelectedPriority] = useState<string>("BALANCED");

  // Auto-save draft to localStorage whenever slots, searchMode or selectedPriority change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasAnySelection = slots.some(s => s.selectedBrand);
    if (hasAnySelection) {
      const draft = {
        searchMode,
        slots,
        selectedPriority,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem("torquescout_comparison_draft_v1", JSON.stringify(draft));
      } catch (e) {}
    }
  }, [slots, searchMode, selectedPriority]);

  // Collect filled matched variant IDs
  const matchedVariantIds = slots.map(s => s.matchedVariantId).filter((id): id is string => !!id);

  const executeComparisonWithIds = (variantIds: string[], priority: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token || variantIds.length < 2) return;

    setLoading(true);
    setError("");

    const idempotencyKey = typeof window !== "undefined" && window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : `key_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    fetch(`${API_URL}/comparisons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        variantIds,
        idempotencyKey,
        selectedPriority: priority,
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
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  // Submit Compare API
  const handleCompare = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    if (matchedVariantIds.length < 2) return;
    executeComparisonWithIds(matchedVariantIds, selectedPriority);
  };

  // Clear / Reset selections
  const handleResetSelections = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("torquescout_comparison_draft_v1");
    }
    setComparisonResult(null);
    setError("");
    setSlots(prev => prev.map(s => createEmptySlot(s.id, s.category)));
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
        variantIds: matchedVariantIds,
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

      {/* Quota Banner */}
      <QuotaBadge feature="comparisons" />

      {/* Vehicle Category Selector (Otomobil, Arazi SUV & Pickup, Minivan & Panelvan, Motosiklet) */}
      <div className="w-full bg-slate-900/60 p-2 sm:p-2.5 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <span>⚡ Hızlı Kategori Seçimi:</span>
            <span className="text-slate-500 font-normal hidden sm:inline">(Her araç kutusundan da türü bağımsız olarak seçebilirsiniz)</span>
          </span>
        </div>
        <VehicleSearchModeSelector
          value={searchMode}
          onChange={handleSearchModeChange}
        />
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
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-500">
                    {slot.id}. ARAÇ SEÇİMİ
                  </span>
                  <div className="flex items-center gap-2">
                    {slot.matchedVariantId && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        ✓ Hazır
                      </span>
                    )}
                    {slot.selectedBrand && (
                      <button
                        type="button"
                        onClick={() => clearSingleSlot(index)}
                        className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1"
                        title="Bu aracın seçimini temizle"
                      >
                        ✕ Temizle
                      </button>
                    )}
                  </div>
                </div>

                {/* Per-Slot Category Switcher */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-xl border border-white/5 text-[11px]">
                  {SLOT_CATEGORIES.map(cat => {
                    const isCatActive = slot.category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => handleSlotCategoryChange(index, cat.key)}
                        className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg font-bold transition cursor-pointer text-center ${
                          isCatActive
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm font-extrabold"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                        }`}
                        title={cat.label}
                      >
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Responsive Dropdown Grid */}
              <div className={`grid ${isCompact10 ? "grid-cols-1 md:grid-cols-2 gap-2.5" : "grid-cols-1 gap-3"}`}>
                {/* Brand */}
                <select
                  value={slot.selectedBrand}
                  onChange={e => handleBrandChange(index, e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition"
                >
                  <option value="">
                    {!(brandsByCategory[slot.category]?.length) ? "Markalar Yükleniyor..." : "Marka Seçiniz..."}
                  </option>
                  {(brandsByCategory[slot.category] || []).map(b => (
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
                  disabled={slot.category === 'MOTORCYCLE' || !slot.selectedModel || slot.loadingYears || slot.years.length === 0}
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
                  disabled={slot.category === 'MOTORCYCLE' || !slot.selectedYear || slot.loadingBodyTypes || slot.bodyTypes.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingBodyTypes ? "Yükleniyor..." : (slot.category === 'MOTORCYCLE' ? "Tip / Kasa Tipi Seçiniz..." : "Kasa Tipi Seçiniz...")}</option>
                  {slot.bodyTypes.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                {/* Engine */}
                <select
                  value={slot.selectedEngine}
                  onChange={e => handleEngineChange(index, e.target.value)}
                  disabled={slot.category === 'MOTORCYCLE' || !slot.selectedBodyType || slot.loadingEngines || slot.engines.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingEngines ? "Yükleniyor..." : (slot.category === 'MOTORCYCLE' ? "Motor / Versiyon Seçiniz..." : "Motor / Versiyon Seçiniz...")}</option>
                  {slot.engines.map(eng => (
                    <option key={eng} value={eng}>{eng}</option>
                  ))}
                </select>

                {/* Fuel Type */}
                <select
                  value={slot.selectedFuelType}
                  onChange={e => handleFuelTypeChange(index, e.target.value)}
                  disabled={slot.category === 'MOTORCYCLE' || !slot.selectedEngine || slot.loadingFuels || slot.fuelTypes.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingFuels ? "Yükleniyor..." : (slot.category === 'MOTORCYCLE' ? "Yakıt / Güç Ünitesi Seçiniz..." : "Yakıt Türü Seçiniz...")}</option>
                  {slot.fuelTypes.map(fuel => (
                    <option key={fuel} value={fuel}>{fuel}</option>
                  ))}
                </select>

                {/* Transmission */}
                <select
                  value={slot.selectedTransmission}
                  onChange={e => handleTransmissionChange(index, e.target.value)}
                  disabled={slot.category === 'MOTORCYCLE' || !slot.selectedFuelType || slot.loadingTransmissions || slot.transmissions.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingTransmissions ? "Yükleniyor..." : (slot.category === 'MOTORCYCLE' ? "Motor Hacmi Seçiniz..." : "Şanzıman Tipi Seçiniz...")}</option>
                  {slot.transmissions.map(trans => (
                    <option key={trans} value={trans}>{trans}</option>
                  ))}
                </select>

                {/* Trim */}
                <select
                  value={slot.selectedTrim}
                  onChange={e => handleTrimChange(index, e.target.value)}
                  disabled={slot.category === 'MOTORCYCLE' || !slot.selectedTransmission || slot.loadingTrims || slot.trims.length === 0}
                  className="bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-orange-500/50 transition disabled:opacity-50"
                >
                  <option value="">{slot.loadingTrims ? "Yükleniyor..." : (slot.category === 'MOTORCYCLE' ? "Vites Tipi Seçiniz..." : "Donanım Paketi Seçiniz...")}</option>
                  {slot.trims.map(tr => (
                    <option key={tr} value={tr}>{tr}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compare Action Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={handleCompare}
          disabled={matchedVariantIds.length < 2 || loading}
          className="flex-1 w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl transition text-center text-sm cursor-pointer"
        >
          {loading ? "🤖 TorqueScout AI Derin Karşılaştırmayı Hazırlıyor..." : `Seçili ${matchedVariantIds.length} Aracı Karşılaştır`}
        </button>

        {slots.some(s => s.selectedBrand) && (
          <button
            onClick={handleResetSelections}
            className="w-full sm:w-auto px-5 py-4 bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0"
            title="Tüm araç seçimlerini sıfırla"
          >
            🔄 Seçimleri Temizle
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="glass p-8 rounded-3xl flex flex-col items-center justify-center gap-4 text-center border border-orange-500/20 bg-orange-950/10 shadow-2xl animate-pulse">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <h3 className="text-lg font-bold text-slate-100">🤖 Yapay Zekâ Raporları Çapraz Analiz Ediyor...</h3>
          <p className="text-xs text-slate-400 max-w-md">
            TorqueScout AI botu seçtiğin araçların teknik verilerini, motor karakterini ve onaylı kronik arıza durumlarını analiz ederek karar raporunu hazırlıyor.
          </p>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-2xl font-semibold text-center">
          ⚠️ {error}
        </div>
      )}

      {/* Streamlined Decision Result Screen */}
      {comparisonResult?.comparisonResult && (
        <div ref={reportStartRef} className="space-y-8 animate-fadeIn">
          {/* Fallback Notice (Only if generationMode is FALLBACK) */}
          {comparisonResult.comparisonResult.generationMode === "FALLBACK" && (
            <ComparisonModeNotice generationMode={comparisonResult.comparisonResult.generationMode} />
          )}

          {/* 8-Criteria Assessment Matrix & Star Rating System */}
          <CriterionAssessmentMatrix
            criterionResult={comparisonResult.comparisonResult.criterionResult}
            generationMode={comparisonResult.comparisonResult.generationMode}
            vehicles={comparisonResult.vehicles}
          />

          {/* Karar Özeti & Tercih Sıralaması (AI Decision Summary Card) */}
          <DecisionSummary
            comparisonResult={comparisonResult.comparisonResult}
            vehicles={comparisonResult.vehicles}
          />

          {/* Recalls (Rendered ONLY if recalls exist) */}
          {comparisonResult.comparisonResult.recallComparison &&
            comparisonResult.comparisonResult.recallComparison.length > 0 && (
              <RecallComparison recalls={comparisonResult.comparisonResult.recallComparison} />
            )}

          {/* Context-Aware Live AI Chatbot */}
          <ComparisonChatbot
            variantIds={matchedVariantIds}
            vehicleNames={(comparisonResult.vehicles || []).map((v: any) => v.name)}
            remainingMessages={remainingQuota !== null ? remainingQuota : undefined}
          />
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
