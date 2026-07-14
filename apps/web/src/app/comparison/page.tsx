"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const displayFuelType = (fuel: string) => {
  switch (fuel) {
    case "PETROL": return "Benzin";
    case "DIESEL": return "Dizel";
    case "LPG": return "LPG";
    case "HYBRID": return "Hibrit";
    case "PLUG_IN_HYBRID": return "Plug-in Hibrit";
    case "ELECTRIC": return "Elektrik";
    default: return fuel || "Diğer";
  }
};

const displayBodyType = (body: string) => {
  switch (body) {
    case "SEDAN": return "Sedan";
    case "HATCHBACK": return "Hatchback";
    case "CONVERTIBLE": return "Cabrio";
    case "COUPE": return "Coupe";
    case "SUV": return "SUV";
    case "WAGON": return "Station Wagon";
    case "PICKUP": return "Pickup";
    case "VAN": return "Van";
    case "MINIVAN": return "Minivan";
    default: return body || "Diğer";
  }
};

export default function ComparisonPage() {
  const router = useRouter();

  // Brands list (shared)
  const [brands, setBrands] = useState<any[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Result comparison state
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Vehicle 1 Selection states
  const [models1, setModels1] = useState<any[]>([]);
  const [years1, setYears1] = useState<number[]>([]);
  const [bodyTypes1, setBodyTypes1] = useState<string[]>([]);
  const [engines1, setEngines1] = useState<string[]>([]);
  const [fuelTypes1, setFuelTypes1] = useState<string[]>([]);
  const [transmissions1, setTransmissions1] = useState<string[]>([]);
  const [trims1, setTrims1] = useState<string[]>([]);

  const [selectedBrand1, setSelectedBrand1] = useState("");
  const [selectedModel1, setSelectedModel1] = useState("");
  const [selectedYear1, setSelectedYear1] = useState("");
  const [selectedBodyType1, setSelectedBodyType1] = useState("");
  const [selectedEngine1, setSelectedEngine1] = useState("");
  const [selectedFuelType1, setSelectedFuelType1] = useState("");
  const [selectedTransmission1, setSelectedTransmission1] = useState("");
  const [selectedTrim1, setSelectedTrim1] = useState("");
  const [matchedVariantId1, setMatchedVariantId1] = useState<string | null>(null);

  const [loadingModels1, setLoadingModels1] = useState(false);
  const [loadingYears1, setLoadingYears1] = useState(false);
  const [loadingBodyTypes1, setLoadingBodyTypes1] = useState(false);
  const [loadingEngines1, setLoadingEngines1] = useState(false);
  const [loadingFuels1, setLoadingFuels1] = useState(false);
  const [loadingTransmissions1, setLoadingTransmissions1] = useState(false);
  const [loadingTrims1, setLoadingTrims1] = useState(false);
  const [loadingMatch1, setLoadingMatch1] = useState(false);

  // Vehicle 2 Selection states
  const [models2, setModels2] = useState<any[]>([]);
  const [years2, setYears2] = useState<number[]>([]);
  const [bodyTypes2, setBodyTypes2] = useState<string[]>([]);
  const [engines2, setEngines2] = useState<string[]>([]);
  const [fuelTypes2, setFuelTypes2] = useState<string[]>([]);
  const [transmissions2, setTransmissions2] = useState<string[]>([]);
  const [trims2, setTrims2] = useState<string[]>([]);

  const [selectedBrand2, setSelectedBrand2] = useState("");
  const [selectedModel2, setSelectedModel2] = useState("");
  const [selectedYear2, setSelectedYear2] = useState("");
  const [selectedBodyType2, setSelectedBodyType2] = useState("");
  const [selectedEngine2, setSelectedEngine2] = useState("");
  const [selectedFuelType2, setSelectedFuelType2] = useState("");
  const [selectedTransmission2, setSelectedTransmission2] = useState("");
  const [selectedTrim2, setSelectedTrim2] = useState("");
  const [matchedVariantId2, setMatchedVariantId2] = useState<string | null>(null);

  const [loadingModels2, setLoadingModels2] = useState(false);
  const [loadingYears2, setLoadingYears2] = useState(false);
  const [loadingBodyTypes2, setLoadingBodyTypes2] = useState(false);
  const [loadingEngines2, setLoadingEngines2] = useState(false);
  const [loadingFuels2, setLoadingFuels2] = useState(false);
  const [loadingTransmissions2, setLoadingTransmissions2] = useState(false);
  const [loadingTrims2, setLoadingTrims2] = useState(false);
  const [loadingMatch2, setLoadingMatch2] = useState(false);

  // Fetch brands on load
  useEffect(() => {
    setLoadingBrands(true);
    fetch(`${API_URL}/vehicles/brands`)
      .then(res => res.json())
      .then(data => {
        setBrands(Array.isArray(data) ? data : []);
        setLoadingBrands(false);
      })
      .catch(() => setLoadingBrands(false));
  }, []);

  // --- VEHICLE 1 CASCADE EFFECTS ---

  const handleBrand1Change = (brandId: string) => {
    setSelectedBrand1(brandId);
    setSelectedModel1("");
    setSelectedYear1("");
    setSelectedBodyType1("");
    setSelectedEngine1("");
    setSelectedFuelType1("");
    setSelectedTransmission1("");
    setSelectedTrim1("");
    setModels1([]);
    setYears1([]);
    setBodyTypes1([]);
    setEngines1([]);
    setFuelTypes1([]);
    setTransmissions1([]);
    setTrims1([]);
    setMatchedVariantId1(null);

    if (!brandId) return;
    setLoadingModels1(true);
    fetch(`${API_URL}/vehicles/models?brandId=${brandId}`)
      .then(res => res.json())
      .then(data => {
        setModels1(Array.isArray(data) ? data : []);
        setLoadingModels1(false);
      })
      .catch(() => setLoadingModels1(false));
  };

  const handleModel1Change = (modelId: string) => {
    setSelectedModel1(modelId);
    setSelectedYear1("");
    setSelectedBodyType1("");
    setSelectedEngine1("");
    setSelectedFuelType1("");
    setSelectedTransmission1("");
    setSelectedTrim1("");
    setYears1([]);
    setBodyTypes1([]);
    setEngines1([]);
    setFuelTypes1([]);
    setTransmissions1([]);
    setTrims1([]);
    setMatchedVariantId1(null);

    if (!modelId) return;
    const brandName = brands.find(b => b.id === selectedBrand1)?.name;
    const modelName = models1.find(m => m.id === modelId)?.name;
    if (!brandName || !modelName) return;

    setLoadingYears1(true);
    fetch(`${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((item: any) => parseInt(item.value));
          setYears1(list);
          if (list.length === 1) {
            setSelectedYear1(list[0].toString());
          }
        }
        setLoadingYears1(false);
      })
      .catch(() => setLoadingYears1(false));
  };

  useEffect(() => {
    if (!selectedBrand1 || !selectedModel1 || !selectedYear1) return;
    const brandName = brands.find(b => b.id === selectedBrand1)?.name;
    const modelName = models1.find(m => m.id === selectedModel1)?.name;
    if (!brandName || !modelName) return;

    setLoadingBodyTypes1(true);
    fetch(`${API_URL}/vehicle-filters/body-types?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&year=${selectedYear1}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((item: any) => item.value.toUpperCase());
          setBodyTypes1(list);
          if (list.length === 1) {
            setSelectedBodyType1(list[0]);
          }
        }
        setLoadingBodyTypes1(false);
      })
      .catch(() => setLoadingBodyTypes1(false));
  }, [selectedYear1, selectedBrand1, selectedModel1, brands, models1]);

  useEffect(() => {
    if (!selectedBrand1 || !selectedModel1 || !selectedYear1 || !selectedBodyType1) return;
    const brandName = brands.find(b => b.id === selectedBrand1)?.name;
    const modelName = models1.find(m => m.id === selectedModel1)?.name;
    if (!brandName || !modelName) return;

    setLoadingEngines1(true);
    fetch(`${API_URL}/vehicle-filters/engines?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&bodyType=${encodeURIComponent(selectedBodyType1)}&year=${selectedYear1}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((item: any) => item.value);
          setEngines1(list);
          if (list.length === 1) {
            setSelectedEngine1(list[0]);
          }
        }
        setLoadingEngines1(false);
      })
      .catch(() => setLoadingEngines1(false));
  }, [selectedBodyType1, selectedBrand1, selectedModel1, selectedYear1, brands, models1]);

  useEffect(() => {
    if (!selectedBrand1 || !selectedModel1 || !selectedYear1 || !selectedBodyType1 || !selectedEngine1) return;
    const brandName = brands.find(b => b.id === selectedBrand1)?.name;
    const modelName = models1.find(m => m.id === selectedModel1)?.name;
    if (!brandName || !modelName) return;

    setLoadingFuels1(true);
    fetch(`${API_URL}/vehicle-filters/fuel-types?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&bodyType=${encodeURIComponent(selectedBodyType1)}&year=${selectedYear1}&engineVersion=${encodeURIComponent(selectedEngine1)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((item: any) => item.value);
          setFuelTypes1(list);
          if (list.length === 1) {
            setSelectedFuelType1(list[0]);
          }
        }
        setLoadingFuels1(false);
      })
      .catch(() => setLoadingFuels1(false));
  }, [selectedEngine1, selectedBrand1, selectedModel1, selectedYear1, selectedBodyType1, brands, models1]);

  useEffect(() => {
    if (!selectedBrand1 || !selectedModel1 || !selectedYear1 || !selectedBodyType1 || !selectedFuelType1 || !selectedEngine1) return;
    const brandName = brands.find(b => b.id === selectedBrand1)?.name;
    const modelName = models1.find(m => m.id === selectedModel1)?.name;
    if (!brandName || !modelName) return;

    setLoadingTransmissions1(true);
    fetch(`${API_URL}/vehicle-filters/transmissions?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&bodyType=${encodeURIComponent(selectedBodyType1)}&year=${selectedYear1}&engineVersion=${encodeURIComponent(selectedEngine1)}&fuelType=${encodeURIComponent(selectedFuelType1)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((item: any) => item.value);
          setTransmissions1(list);
          if (list.length === 1) {
            setSelectedTransmission1(list[0]);
          }
        }
        setLoadingTransmissions1(false);
      })
      .catch(() => setLoadingTransmissions1(false));
  }, [selectedFuelType1, selectedEngine1, selectedBrand1, selectedModel1, selectedYear1, selectedBodyType1, brands, models1]);

  useEffect(() => {
    if (!selectedBrand1 || !selectedModel1 || !selectedYear1 || !selectedBodyType1 || !selectedFuelType1 || !selectedEngine1 || !selectedTransmission1) return;
    const brandName = brands.find(b => b.id === selectedBrand1)?.name;
    const modelName = models1.find(m => m.id === selectedModel1)?.name;
    if (!brandName || !modelName) return;

    setLoadingTrims1(true);
    fetch(`${API_URL}/vehicle-filters/trims?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&bodyType=${encodeURIComponent(selectedBodyType1)}&year=${selectedYear1}&engineVersion=${encodeURIComponent(selectedEngine1)}&fuelType=${encodeURIComponent(selectedFuelType1)}&transmissionType=${encodeURIComponent(selectedTransmission1)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const raw = res.data.map((item: any) => item.value);
          const list = raw.filter((t: string) => t && !['bilmiyorum', 'yok', 'none', 'null'].includes(t.toLowerCase().trim()));
          setTrims1(list);
          if (list.length === 1) {
            setSelectedTrim1(list[0]);
          }
        }
        setLoadingTrims1(false);
      })
      .catch(() => setLoadingTrims1(false));
  }, [selectedTransmission1, selectedFuelType1, selectedEngine1, selectedBrand1, selectedModel1, selectedYear1, selectedBodyType1, brands, models1]);

  useEffect(() => {
    if (!selectedBrand1 || !selectedModel1 || !selectedYear1 || !selectedBodyType1 || !selectedFuelType1 || !selectedEngine1 || !selectedTransmission1 || !selectedTrim1) return;
    const brandName = brands.find(b => b.id === selectedBrand1)?.name;
    const modelName = models1.find(m => m.id === selectedModel1)?.name;
    if (!brandName || !modelName) return;

    setLoadingMatch1(true);
    fetch(`${API_URL}/vehicle-filters/match-variant?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&bodyType=${encodeURIComponent(selectedBodyType1)}&year=${selectedYear1}&engineVersion=${encodeURIComponent(selectedEngine1)}&fuelType=${encodeURIComponent(selectedFuelType1)}&trimPackage=${encodeURIComponent(selectedTrim1)}&transmissionType=${encodeURIComponent(selectedTransmission1)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.variantId) {
          setMatchedVariantId1(res.variantId);
        }
        setLoadingMatch1(false);
      })
      .catch(() => setLoadingMatch1(false));
  }, [selectedTrim1, selectedTransmission1, selectedFuelType1, selectedEngine1, selectedBrand1, selectedModel1, selectedYear1, selectedBodyType1, brands, models1]);


  // --- VEHICLE 2 CASCADE EFFECTS ---

  const handleBrand2Change = (brandId: string) => {
    setSelectedBrand2(brandId);
    setSelectedModel2("");
    setSelectedYear2("");
    setSelectedBodyType2("");
    setSelectedEngine2("");
    setSelectedFuelType2("");
    setSelectedTransmission2("");
    setSelectedTrim2("");
    setModels2([]);
    setYears2([]);
    setBodyTypes2([]);
    setEngines2([]);
    setFuelTypes2([]);
    setTransmissions2([]);
    setTrims2([]);
    setMatchedVariantId2(null);

    if (!brandId) return;
    setLoadingModels2(true);
    fetch(`${API_URL}/vehicles/models?brandId=${brandId}`)
      .then(res => res.json())
      .then(data => {
        setModels2(Array.isArray(data) ? data : []);
        setLoadingModels2(false);
      })
      .catch(() => setLoadingModels2(false));
  };

  const handleModel2Change = (modelId: string) => {
    setSelectedModel2(modelId);
    setSelectedYear2("");
    setSelectedBodyType2("");
    setSelectedEngine2("");
    setSelectedFuelType2("");
    setSelectedTransmission2("");
    setSelectedTrim2("");
    setYears2([]);
    setBodyTypes2([]);
    setEngines2([]);
    setFuelTypes2([]);
    setTransmissions2([]);
    setTrims2([]);
    setMatchedVariantId2(null);

    if (!modelId) return;
    const brandName = brands.find(b => b.id === selectedBrand2)?.name;
    const modelName = models2.find(m => m.id === modelId)?.name;
    if (!brandName || !modelName) return;

    setLoadingYears2(true);
    fetch(`${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((item: any) => parseInt(item.value));
          setYears2(list);
          if (list.length === 1) {
            setSelectedYear2(list[0].toString());
          }
        }
        setLoadingYears2(false);
      })
      .catch(() => setLoadingYears2(false));
  };

  useEffect(() => {
    if (!selectedBrand2 || !selectedModel2 || !selectedYear2) return;
    const brandName = brands.find(b => b.id === selectedBrand2)?.name;
    const modelName = models2.find(m => m.id === selectedModel2)?.name;
    if (!brandName || !modelName) return;

    setLoadingBodyTypes2(true);
    fetch(`${API_URL}/vehicle-filters/body-types?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&year=${selectedYear2}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((item: any) => item.value.toUpperCase());
          setBodyTypes2(list);
          if (list.length === 1) {
            setSelectedBodyType2(list[0]);
          }
        }
        setLoadingBodyTypes2(false);
      })
      .catch(() => setLoadingBodyTypes2(false));
  }, [selectedYear2, selectedBrand2, selectedModel2, brands, models2]);

  useEffect(() => {
    if (!selectedBrand2 || !selectedModel2 || !selectedYear2 || !selectedBodyType2) return;
    const brandName = brands.find(b => b.id === selectedBrand2)?.name;
    const modelName = models2.find(m => m.id === selectedModel2)?.name;
    if (!brandName || !modelName) return;

    setLoadingEngines2(true);
    fetch(`${API_URL}/vehicle-filters/engines?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&bodyType=${encodeURIComponent(selectedBodyType2)}&year=${selectedYear2}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((item: any) => item.value);
          setEngines2(list);
          if (list.length === 1) {
            setSelectedEngine2(list[0]);
          }
        }
        setLoadingEngines2(false);
      })
      .catch(() => setLoadingEngines2(false));
  }, [selectedBodyType2, selectedBrand2, selectedModel2, selectedYear2, brands, models2]);

  useEffect(() => {
    if (!selectedBrand2 || !selectedModel2 || !selectedYear2 || !selectedBodyType2 || !selectedEngine2) return;
    const brandName = brands.find(b => b.id === selectedBrand2)?.name;
    const modelName = models2.find(m => m.id === selectedModel2)?.name;
    if (!brandName || !modelName) return;

    setLoadingFuels2(true);
    fetch(`${API_URL}/vehicle-filters/fuel-types?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&bodyType=${encodeURIComponent(selectedBodyType2)}&year=${selectedYear2}&engineVersion=${encodeURIComponent(selectedEngine2)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((item: any) => item.value);
          setFuelTypes2(list);
          if (list.length === 1) {
            setSelectedFuelType2(list[0]);
          }
        }
        setLoadingFuels2(false);
      })
      .catch(() => setLoadingFuels2(false));
  }, [selectedEngine2, selectedBrand2, selectedModel2, selectedYear2, selectedBodyType2, brands, models2]);

  useEffect(() => {
    if (!selectedBrand2 || !selectedModel2 || !selectedYear2 || !selectedBodyType2 || !selectedFuelType2 || !selectedEngine2) return;
    const brandName = brands.find(b => b.id === selectedBrand2)?.name;
    const modelName = models2.find(m => m.id === selectedModel2)?.name;
    if (!brandName || !modelName) return;

    setLoadingTransmissions2(true);
    fetch(`${API_URL}/vehicle-filters/transmissions?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&bodyType=${encodeURIComponent(selectedBodyType2)}&year=${selectedYear2}&engineVersion=${encodeURIComponent(selectedEngine2)}&fuelType=${encodeURIComponent(selectedFuelType2)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const list = res.data.map((item: any) => item.value);
          setTransmissions2(list);
          if (list.length === 1) {
            setSelectedTransmission2(list[0]);
          }
        }
        setLoadingTransmissions2(false);
      })
      .catch(() => setLoadingTransmissions2(false));
  }, [selectedFuelType2, selectedEngine2, selectedBrand2, selectedModel2, selectedYear2, selectedBodyType2, brands, models2]);

  useEffect(() => {
    if (!selectedBrand2 || !selectedModel2 || !selectedYear2 || !selectedBodyType2 || !selectedFuelType2 || !selectedEngine2 || !selectedTransmission2) return;
    const brandName = brands.find(b => b.id === selectedBrand2)?.name;
    const modelName = models2.find(m => m.id === selectedModel2)?.name;
    if (!brandName || !modelName) return;

    setLoadingTrims2(true);
    fetch(`${API_URL}/vehicle-filters/trims?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&bodyType=${encodeURIComponent(selectedBodyType2)}&year=${selectedYear2}&engineVersion=${encodeURIComponent(selectedEngine2)}&fuelType=${encodeURIComponent(selectedFuelType2)}&transmissionType=${encodeURIComponent(selectedTransmission2)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const raw = res.data.map((item: any) => item.value);
          const list = raw.filter((t: string) => t && !['bilmiyorum', 'yok', 'none', 'null'].includes(t.toLowerCase().trim()));
          setTrims2(list);
          if (list.length === 1) {
            setSelectedTrim2(list[0]);
          }
        }
        setLoadingTrims2(false);
      })
      .catch(() => setLoadingTrims2(false));
  }, [selectedTransmission2, selectedFuelType2, selectedEngine2, selectedBrand2, selectedModel2, selectedYear2, selectedBodyType2, brands, models2]);

  useEffect(() => {
    if (!selectedBrand2 || !selectedModel2 || !selectedYear2 || !selectedBodyType2 || !selectedFuelType2 || !selectedEngine2 || !selectedTransmission2 || !selectedTrim2) return;
    const brandName = brands.find(b => b.id === selectedBrand2)?.name;
    const modelName = models2.find(m => m.id === selectedModel2)?.name;
    if (!brandName || !modelName) return;

    setLoadingMatch2(true);
    fetch(`${API_URL}/vehicle-filters/match-variant?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&bodyType=${encodeURIComponent(selectedBodyType2)}&year=${selectedYear2}&engineVersion=${encodeURIComponent(selectedEngine2)}&fuelType=${encodeURIComponent(selectedFuelType2)}&trimPackage=${encodeURIComponent(selectedTrim2)}&transmissionType=${encodeURIComponent(selectedTransmission2)}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.variantId) {
          setMatchedVariantId2(res.variantId);
        }
        setLoadingMatch2(false);
      })
      .catch(() => setLoadingMatch2(false));
  }, [selectedTrim2, selectedTransmission2, selectedFuelType2, selectedEngine2, selectedBrand2, selectedModel2, selectedYear2, selectedBodyType2, brands, models2]);


  // Submit Compare API
  const handleCompare = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!matchedVariantId1 || !matchedVariantId2) return;

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
        variant1Id: matchedVariantId1,
        variant2Id: matchedVariantId2,
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
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    <div className="max-w-6xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
          ⚖️ Araç Karşılaştırma
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          İki farklı aracı yan yana getirerek teknik özelliklerini ve karşılaştırmalı durum analizini inceleyin.
        </p>
      </div>

      {/* Selectors grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Vehicle 1 Selector */}
        <div className="glass p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-orange-500">1. Araç Seçimi</h2>
          <div className="flex flex-col gap-3">
            {/* Brand */}
            <select
              value={selectedBrand1}
              onChange={e => handleBrand1Change(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">Marka Seçiniz...</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Model */}
            <select
              value={selectedModel1}
              onChange={e => handleModel1Change(e.target.value)}
              disabled={!selectedBrand1 || loadingModels1}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">Model Ailesi Seçiniz...</option>
              {models1.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {/* Year */}
            <select
              value={selectedYear1}
              onChange={e => setSelectedYear1(e.target.value)}
              disabled={!selectedModel1 || loadingYears1 || years1.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingYears1 ? "Yükleniyor..." : "Yıl Seçiniz..."}</option>
              {years1.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Body Type */}
            <select
              value={selectedBodyType1}
              onChange={e => setSelectedBodyType1(e.target.value)}
              disabled={!selectedYear1 || loadingBodyTypes1 || bodyTypes1.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingBodyTypes1 ? "Yükleniyor..." : "Kasa Tipi Seçiniz..."}</option>
              {bodyTypes1.map(b => (
                <option key={b} value={b}>{displayBodyType(b)}</option>
              ))}
            </select>

            {/* Engine */}
            <select
              value={selectedEngine1}
              onChange={e => setSelectedEngine1(e.target.value)}
              disabled={!selectedBodyType1 || loadingEngines1 || engines1.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingEngines1 ? "Yükleniyor..." : "Motor / Versiyon Seçiniz..."}</option>
              {engines1.map(eng => (
                <option key={eng} value={eng}>{eng}</option>
              ))}
            </select>

            {/* Fuel Type */}
            <select
              value={selectedFuelType1}
              onChange={e => setSelectedFuelType1(e.target.value)}
              disabled={!selectedEngine1 || loadingFuels1 || fuelTypes1.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingFuels1 ? "Yükleniyor..." : "Yakıt Türü Seçiniz..."}</option>
              {fuelTypes1.map(fuel => (
                <option key={fuel} value={fuel}>{displayFuelType(fuel)}</option>
              ))}
            </select>

            {/* Transmission */}
            <select
              value={selectedTransmission1}
              onChange={e => setSelectedTransmission1(e.target.value)}
              disabled={!selectedFuelType1 || loadingTransmissions1 || transmissions1.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingTransmissions1 ? "Yükleniyor..." : "Şanzıman Tipi Seçiniz..."}</option>
              {transmissions1.map(trans => (
                <option key={trans} value={trans}>{trans}</option>
              ))}
            </select>

            {/* Trim */}
            <select
              value={selectedTrim1}
              onChange={e => setSelectedTrim1(e.target.value)}
              disabled={!selectedTransmission1 || loadingTrims1 || trims1.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingTrims1 ? "Yükleniyor..." : "Donanım Paketi Seçiniz..."}</option>
              {trims1.map(trim => (
                <option key={trim} value={trim}>{trim}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicle 2 Selector */}
        <div className="glass p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-orange-500">2. Araç Seçimi</h2>
          <div className="flex flex-col gap-3">
            {/* Brand */}
            <select
              value={selectedBrand2}
              onChange={e => handleBrand2Change(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">Marka Seçiniz...</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Model */}
            <select
              value={selectedModel2}
              onChange={e => handleModel2Change(e.target.value)}
              disabled={!selectedBrand2 || loadingModels2}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">Model Ailesi Seçiniz...</option>
              {models2.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {/* Year */}
            <select
              value={selectedYear2}
              onChange={e => setSelectedYear2(e.target.value)}
              disabled={!selectedModel2 || loadingYears2 || years2.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingYears2 ? "Yükleniyor..." : "Yıl Seçiniz..."}</option>
              {years2.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Body Type */}
            <select
              value={selectedBodyType2}
              onChange={e => setSelectedBodyType2(e.target.value)}
              disabled={!selectedYear2 || loadingBodyTypes2 || bodyTypes2.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingBodyTypes2 ? "Yükleniyor..." : "Kasa Tipi Seçiniz..."}</option>
              {bodyTypes2.map(b => (
                <option key={b} value={b}>{displayBodyType(b)}</option>
              ))}
            </select>

            {/* Engine */}
            <select
              value={selectedEngine2}
              onChange={e => setSelectedEngine2(e.target.value)}
              disabled={!selectedBodyType2 || loadingEngines2 || engines2.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingEngines2 ? "Yükleniyor..." : "Motor / Versiyon Seçiniz..."}</option>
              {engines2.map(eng => (
                <option key={eng} value={eng}>{eng}</option>
              ))}
            </select>

            {/* Fuel Type */}
            <select
              value={selectedFuelType2}
              onChange={e => setSelectedFuelType2(e.target.value)}
              disabled={!selectedEngine2 || loadingFuels2 || fuelTypes2.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingFuels2 ? "Yükleniyor..." : "Yakıt Türü Seçiniz..."}</option>
              {fuelTypes2.map(fuel => (
                <option key={fuel} value={fuel}>{displayFuelType(fuel)}</option>
              ))}
            </select>

            {/* Transmission */}
            <select
              value={selectedTransmission2}
              onChange={e => setSelectedTransmission2(e.target.value)}
              disabled={!selectedFuelType2 || loadingTransmissions2 || transmissions2.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingTransmissions2 ? "Yükleniyor..." : "Şanzıman Tipi Seçiniz..."}</option>
              {transmissions2.map(trans => (
                <option key={trans} value={trans}>{trans}</option>
              ))}
            </select>

            {/* Trim */}
            <select
              value={selectedTrim2}
              onChange={e => setSelectedTrim2(e.target.value)}
              disabled={!selectedTransmission2 || loadingTrims2 || trims2.length === 0}
              className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none"
            >
              <option value="">{loadingTrims2 ? "Yükleniyor..." : "Donanım Paketi Seçiniz..."}</option>
              {trims2.map(trim => (
                <option key={trim} value={trim}>{trim}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Compare action button */}
      <button
        onClick={handleCompare}
        disabled={!matchedVariantId1 || !matchedVariantId2 || loading}
        className="w-full bg-gradient-to-r from-orange-600 to-amber-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl transition text-center text-sm"
      >
        {loading ? "Karşılaştırılıyor..." : "Seçili Araçları Karşılaştır"}
      </button>

      {/* Error alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-2xl font-semibold text-center">
          ⚠️ {error}
        </div>
      )}

      {/* Side by side result display */}
      {comparisonResult && (
        <div className="glass p-8 rounded-3xl flex flex-col gap-6 shadow-2xl">
          <h2 className="text-xl font-extrabold text-slate-200 border-b border-white/5 pb-3">📊 Karşılaştırma Sonuçları</h2>
          
          <div className="grid grid-cols-3 gap-4 text-center items-center mt-2">
            
            {/* Header titles */}
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider text-left">Parametre</div>
            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl font-bold text-sm text-orange-400">
              {comparisonResult.vehicle1.name}
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl font-bold text-sm text-blue-400">
              {comparisonResult.vehicle2.name}
            </div>

            {/* Spec lines */}
            <div className="text-slate-400 text-xs font-semibold text-left">Motor Seçeneği</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle1.engine}</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle2.engine}</div>

            <div className="text-slate-400 text-xs font-semibold text-left">Şanzıman Tipi</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle1.transmission}</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle2.transmission}</div>

            <div className="text-slate-400 text-xs font-semibold text-left">Donanım Paketi</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle1.trim}</div>
            <div className="text-xs text-slate-300">{comparisonResult.vehicle2.trim}</div>

            {/* Specs compare */}
            {Object.keys(comparisonResult.specComparison).map((key) => {
              const spec = comparisonResult.specComparison[key];
              return (
                <React.Fragment key={key}>
                  <div className="text-slate-400 text-xs font-semibold text-left">{spec.label}</div>
                  <div className="text-xs text-slate-200 font-bold">{spec.v1}</div>
                  <div className="text-xs text-slate-200 font-bold">{spec.v2}</div>
                </React.Fragment>
              );
            })}

            {/* Problems compared */}
            <div className="text-slate-400 text-xs font-semibold text-left">Sık Karşılaşılan Durumlar</div>
            <div className="text-xs text-red-400 font-bold">{comparisonResult.vehicle1.problemsCount} Adet</div>
            <div className="text-xs text-red-400 font-bold">{comparisonResult.vehicle2.problemsCount} Adet</div>

          </div>
        </div>
      )}

    </div>
  );
}
