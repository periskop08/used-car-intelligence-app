import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

function getBrandLogoUrl(brandName?: string): string {
  if (!brandName) return 'https://img.icons8.com/color/96/car.png';
  const b = brandName.trim().toLowerCase();

  const logoMap: Record<string, string> = {
    audi: 'https://img.icons8.com/color/96/audi.png',
    bmw: 'https://img.icons8.com/color/96/bmw.png',
    volkswagen: 'https://img.icons8.com/color/96/volkswagen.png',
    vw: 'https://img.icons8.com/color/96/volkswagen.png',
    'mercedes-benz': 'https://img.icons8.com/color/96/mercedes-benz.png',
    mercedes: 'https://img.icons8.com/color/96/mercedes-benz.png',
    ford: 'https://img.icons8.com/color/96/ford.png',
    fiat: 'https://img.icons8.com/color/96/fiat.png',
    renault: 'https://img.icons8.com/color/96/renault.png',
    peugeot: 'https://img.icons8.com/color/96/peugeot.png',
    toyota: 'https://img.icons8.com/color/96/toyota.png',
    honda: 'https://img.icons8.com/color/96/honda.png',
    hyundai: 'https://img.icons8.com/color/96/hyundai.png',
    kia: 'https://img.icons8.com/color/96/kia.png',
    nissan: 'https://img.icons8.com/color/96/nissan.png',
    opel: 'https://img.icons8.com/color/96/opel.png',
    seat: 'https://img.icons8.com/color/96/seat.png',
    skoda: 'https://img.icons8.com/color/96/skoda.png',
    volvo: 'https://img.icons8.com/color/96/volvo.png',
    porsche: 'https://img.icons8.com/color/96/porsche.png',
    citroen: 'https://img.icons8.com/color/96/citroen.png',
    'alfa romeo': 'https://img.icons8.com/color/96/alfa-romeo.png',
    mini: 'https://img.icons8.com/color/96/mini.png',
    jeep: 'https://img.icons8.com/color/96/jeep.png',
    tesla: 'https://img.icons8.com/color/96/tesla.png',
    'land rover': 'https://img.icons8.com/color/96/land-rover.png',
  };

  return logoMap[b] || `https://img.icons8.com/color/96/${b}.png`;
}

function BrandLogo({ brandName }: { brandName?: string }) {
  const [hasError, setHasError] = useState(false);
  const logoUrl = getBrandLogoUrl(brandName);

  return (
    <View style={styles.brandLogoBox}>
      {!hasError ? (
        <Image
          source={{ uri: logoUrl }}
          style={styles.brandLogoImg}
          resizeMode="contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <Ionicons name="car-sport" size={24} color="#0f172a" />
      )}
    </View>
  );
}

function renderStars(stars: number | null, size: 'sm' | 'md' | 'lg' = 'md') {
  if (stars === null || stars === undefined) return null;

  const roundedStars = Math.max(0, Math.min(5, Math.round(stars * 2) / 2));
  const fullStars = Math.floor(roundedStars);
  const hasHalf = roundedStars % 1 >= 0.5;

  const fontSize = size === 'lg' ? 16 : size === 'sm' ? 11 : 13;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((index) => {
        if (index <= fullStars) {
          return <Ionicons key={index} name="star" size={fontSize} color="#f59e0b" />;
        } else if (index === fullStars + 1 && hasHalf) {
          return <Ionicons key={index} name="star-half" size={fontSize} color="#f59e0b" />;
        } else {
          return <Ionicons key={index} name="star-outline" size={fontSize} color="#cbd5e1" />;
        }
      })}
    </View>
  );
}

function getDifferentiatedStarsForRank(rankIndex: number): number {
  const scale = [4.5, 4.2, 4.0, 3.8, 3.5, 3.2, 3.0, 2.8, 2.5, 2.2];
  if (rankIndex < scale.length) {
    return scale[rankIndex];
  }
  return Math.max(1.0, 2.2 - (rankIndex - 9) * 0.2);
}

interface VehicleSlot {
  slotId: number;
  brand?: string;
  model?: string;
  year?: string;
  bodyType?: string;
  engineCode?: string;
  fuelType?: string;
  transmissionName?: string;
  trimName?: string;
  variantId?: string;
}

const CRITERIA_METADATA: Record<string, { title: string; weightStr: string; icon: string }> = {
  RELIABILITY: {
    title: 'Mekanik Güvenilirlik',
    weightStr: '%20 Ağırlık',
    icon: '🛡️',
  },
  FAILURE_SEVERITY: {
    title: 'Arıza Ciddiyeti ve Dayanıklılık',
    weightStr: '%15 Ağırlık',
    icon: '⚙️',
  },
  SEVERITY_DURABILITY: {
    title: 'Arıza Ciddiyeti ve Dayanıklılık',
    weightStr: '%15 Ağırlık',
    icon: '⚙️',
  },
  FUEL_EFFICIENCY: {
    title: 'Yakıt Tüketimi ve Verimlilik',
    weightStr: '%10 Ağırlık',
    icon: '⛽',
  },
  USAGE_SUITABILITY: {
    title: 'Kullanım Senaryosu ve Kullanıcı Uyumu',
    weightStr: '%15 Ağırlık',
    icon: '🎯',
  },
  PERFORMANCE: {
    title: 'Motor / Şanzıman Performansı',
    weightStr: '%10 Ağırlık',
    icon: '⚡',
  },
  COMFORT: {
    title: 'Konfor ve Sürüş Kalitesi',
    weightStr: '%10 Ağırlık',
    icon: '🛋️',
  },
  PRACTICALITY: {
    title: 'Kullanışlılık ve Yaşam Alanı',
    weightStr: '%10 Ağırlık',
    icon: '🧳',
  },
  EQUIPMENT_TECHNOLOGY: {
    title: 'Donanım ve Teknoloji Seviyesi',
    weightStr: '%10 Ağırlık',
    icon: '💎',
  },
  VALUE_FOR_MONEY: {
    title: 'Donanım ve Teknoloji Seviyesi',
    weightStr: '%10 Ağırlık',
    icon: '💎',
  },
};

const CRITERIA_KEYS = [
  'RELIABILITY',
  'FAILURE_SEVERITY',
  'FUEL_EFFICIENCY',
  'USAGE_SUITABILITY',
  'PERFORMANCE',
  'COMFORT',
  'PRACTICALITY',
  'EQUIPMENT_TECHNOLOGY',
];

const SPEC_SECTIONS = [
  {
    category: '⚡ Motor & Performans',
    items: [
      {
        key: 'hp',
        label: 'Motor Gücü',
        render: (v: any) => (v.horsepower ? `${v.horsepower} HP` : v.engineHp ? `${v.engineHp} HP` : '-'),
        valStyle: null,
      },
      {
        key: 'torque',
        label: 'Tork Değeri',
        render: (v: any) => (v.torqueNm ? `${v.torqueNm} Nm` : v.torque ? `${v.torque} Nm` : '-'),
        valStyle: null,
      },
      {
        key: 'accel',
        label: '0-100 Hızlanma',
        render: (v: any) => (v.zeroToHundred ? `${v.zeroToHundred} sn` : v.accel ? `${v.accel} sn` : '-'),
        valStyle: null,
      },
    ],
  },
  {
    category: '⛽ Yakıt & Aktarma',
    items: [
      {
        key: 'fuel',
        label: 'Ort. Tüketim',
        render: (v: any) => (v.combinedConsumption ? `${v.combinedConsumption} L/100km` : v.fuelCons ? `${v.fuelCons} L` : '-'),
        valStyle: null,
      },
      {
        key: 'fuel_type',
        label: 'Yakıt Türü',
        render: (v: any) => v.fuelType || '-',
        valStyle: null,
      },
      {
        key: 'transmission',
        label: 'Şanzıman',
        render: (v: any) => v.transmission || '-',
        valStyle: null,
      },
    ],
  },
  {
    category: '🚗 Gövde & Bagaj',
    items: [
      {
        key: 'trunk',
        label: 'Bagaj Hacmi',
        render: (v: any) => (v.trunkLitres ? `${v.trunkLitres} L` : v.trunk ? `${v.trunk} L` : '-'),
        valStyle: null,
      },
      {
        key: 'body_type',
        label: 'Kasa Tipi',
        render: (v: any) => v.bodyType || '-',
        valStyle: null,
      },
    ],
  },
  {
    category: '🛡️ Güvenilirlik & Risk',
    items: [
      {
        key: 'problems',
        label: 'Kronik Arıza',
        render: (v: any) => `${v.problemsCount ?? 0} Adet`,
        valStyle: (v: any) => ({
          color: (v.problemsCount ?? 0) > 0 ? '#dc2626' : '#16a34a',
          fontWeight: '900' as const,
        }),
      },
    ],
  },
];

const RECENT_VEHICLES_STORAGE_KEY = '@torquescout_comparison_recent_vehicles';

const DEFAULT_RECENT_VEHICLES: VehicleSlot[] = [
  {
    slotId: 101,
    brand: 'Audi',
    model: 'A3',
    year: '2020',
    bodyType: 'Sedan',
    engineCode: '35 TFSI (150 HP)',
    fuelType: 'Benzin',
    transmissionName: 'S-Tronic (Otomatik)',
    trimName: 'Design',
  },
  {
    slotId: 102,
    brand: 'BMW',
    model: '3 Serisi',
    year: '2020',
    bodyType: 'Sedan',
    engineCode: '320i (170 HP)',
    fuelType: 'Benzin',
    transmissionName: 'Otomatik',
    trimName: 'M Sport',
  },
  {
    slotId: 103,
    brand: 'Volkswagen',
    model: 'Golf',
    year: '2021',
    bodyType: 'Hatchback',
    engineCode: '1.5 eTSI (150 HP)',
    fuelType: 'Hibrit',
    transmissionName: 'DSG (Otomatik)',
    trimName: 'R-Line',
  },
  {
    slotId: 104,
    brand: 'Fiat',
    model: 'Egea',
    year: '2022',
    bodyType: 'Sedan',
    engineCode: '1.3 Multijet (95 HP)',
    fuelType: 'Dizel',
    transmissionName: 'Manuel',
    trimName: 'Easy',
  },
  {
    slotId: 105,
    brand: 'Renault',
    model: 'Megane',
    year: '2021',
    bodyType: 'Sedan',
    engineCode: '1.3 TCe (140 HP)',
    fuelType: 'Benzin',
    transmissionName: 'EDC (Otomatik)',
    trimName: 'Touch',
  },
];

export default function ComparisonScreen() {
  const router = useRouter();

  // Multi-vehicle slot state
  const [vehicleLimit, setVehicleLimit] = useState<number>(10);
  const [userTier, setUserTier] = useState<string>('PREMIUM');
  const [slots, setSlots] = useState<VehicleSlot[]>([
    { slotId: 1 },
    { slotId: 2 },
  ]);

  const [activeSlotId, setActiveSlotId] = useState<number | null>(null);

  // Slots horizontal scroll ref
  const slotsScrollRef = useRef<ScrollView>(null);

  // Recent vehicles state
  const [recentVehicles, setRecentVehicles] = useState<VehicleSlot[]>([]);

  // Selector Step State
  const [step, setStep] = useState<number>(1);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [options, setOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active section tab in result view ('matrix' | 'decision' | 'specs')
  const [activeResultTab, setActiveResultTab] = useState<string>('matrix');

  // Specs Table Auto-scroll state
  const specsTableScrollRef = useRef<ScrollView>(null);
  const [specsScrollIdx, setSpecsScrollIdx] = useState<number>(0);
  const [isSpecsAutoScrollPaused, setIsSpecsAutoScrollPaused] = useState<boolean>(false);
  const specsPauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Criterion Detail Modal State
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedDetail, setSelectedDetail] = useState<{
    vehicleName: string;
    critKey: string;
    assessment: any;
    vehicleInfo?: any;
  } | null>(null);

  // Comparison execution states
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false);
  const [comparisonResponse, setComparisonResponse] = useState<any>(null);

  const [cachedBrands, setCachedBrands] = useState<string[]>([]);

  useEffect(() => {
    fetchQuota();
    loadAllBrandsFromDb();
    loadRecentVehicles();
  }, []);

  const loadRecentVehicles = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_VEHICLES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentVehicles(parsed);
          return;
        }
      }
      setRecentVehicles(DEFAULT_RECENT_VEHICLES);
      await AsyncStorage.setItem(RECENT_VEHICLES_STORAGE_KEY, JSON.stringify(DEFAULT_RECENT_VEHICLES));
    } catch (e) {
      setRecentVehicles(DEFAULT_RECENT_VEHICLES);
    }
  };

  const saveRecentVehicle = async (vehicle: VehicleSlot) => {
    try {
      setRecentVehicles((prev) => {
        const filtered = prev.filter(
          (v) =>
            !(
              v.brand === vehicle.brand &&
              v.model === vehicle.model &&
              v.year === vehicle.year &&
              v.trimName === vehicle.trimName &&
              v.engineCode === vehicle.engineCode
            )
        );
        const updated = [{ ...vehicle, slotId: Date.now() }, ...filtered].slice(0, 8);
        AsyncStorage.setItem(RECENT_VEHICLES_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const isVehicleAlreadySelectedInOtherSlot = (rv: VehicleSlot) => {
    if (!rv.brand || !rv.model) return false;
    const rvBrand = rv.brand.trim().toLowerCase();
    const rvModel = rv.model.trim().toLowerCase();
    return slots.some(
      (s) =>
        s.slotId !== activeSlotId &&
        s.brand &&
        s.brand.trim().toLowerCase() === rvBrand &&
        s.model &&
        s.model.trim().toLowerCase() === rvModel &&
        (!rv.year || !s.year || String(s.year) === String(rv.year)) &&
        (!rv.trimName || !s.trimName || s.trimName.toLowerCase() === (rv.trimName || '').toLowerCase())
    );
  };

  const handleSelectRecentVehicle = async (recentV: VehicleSlot) => {
    if (!activeSlotId) return;

    if (isVehicleAlreadySelectedInOtherSlot(recentV)) {
      Alert.alert('Araç Zaten Seçili', 'Bu araç zaten karşılaştırma slotlarınızdan birinde ekli.');
      return;
    }

    const currentSlot = slots.find((s) => s.slotId === activeSlotId) || { slotId: activeSlotId };
    const updatedSlot: VehicleSlot = {
      ...currentSlot,
      brand: recentV.brand,
      model: recentV.model,
      year: recentV.year,
      bodyType: recentV.bodyType,
      engineCode: recentV.engineCode,
      fuelType: recentV.fuelType,
      transmissionName: recentV.transmissionName,
      trimName: recentV.trimName,
      variantId: recentV.variantId,
    };

    const newSlots = slots.map((s) => (s.slotId === activeSlotId ? updatedSlot : s));
    setSlots(newSlots);
    setModalVisible(false);
    saveRecentVehicle(updatedSlot);
    resolveSlotVariant(updatedSlot);

    // Auto-advance to next empty slot if available
    const currentSlotIndex = slots.findIndex((s) => s.slotId === activeSlotId);
    const nextEmptySlot = newSlots.find((s, idx) => idx > currentSlotIndex && (!s.brand || !s.model));

    if (nextEmptySlot) {
      setTimeout(() => {
        openSlotWizard(nextEmptySlot.slotId);
      }, 350);
    }
  };

  const loadAllBrandsFromDb = async () => {
    try {
      const res = await fetch(`${API_URL}/vehicle-filters/brands`);
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json;
        if (Array.isArray(items) && items.length > 0) {
          const list = items.map((i: any) => (typeof i === 'string' ? i : i.value || i.name || String(i)));
          setCachedBrands(list);
          return;
        }
      }
      const res2 = await fetch(`${API_URL}/vehicles/brands`);
      if (res2.ok) {
        const bData = await res2.json();
        if (Array.isArray(bData)) {
          const list = bData.map((b: any) => b.name || String(b)).filter(Boolean).sort();
          setCachedBrands(list);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQuota = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const res = await fetch(`${API_URL}/comparisons/quota`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.limit) {
            setVehicleLimit(data.limit);
          }
          if (data.tier) {
            setUserTier(data.tier);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addSlot = () => {
    if (slots.length >= vehicleLimit) {
      Alert.alert(
        'Limit Doldu',
        `Paketiniz kapsamında en fazla ${vehicleLimit} araç karşılaştırabilirsiniz.`
      );
      return;
    }
    const newSlotId = Date.now();
    setSlots((prev) => [...prev, { slotId: newSlotId }]);
    setTimeout(() => {
      slotsScrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const removeSlot = (slotId: number) => {
    if (slots.length <= 2) {
      Alert.alert('Bilgi', 'Karşılaştırma için en az 2 araç slotu bulunmalıdır.');
      return;
    }
    setSlots((prev) => prev.filter((s) => s.slotId !== slotId));
    setComparisonResponse(null);
  };

  const openSlotWizard = (slotId: number) => {
    setActiveSlotId(slotId);
    setStep(1);
    setSearchQuery('');
    setModalVisible(true);
    fetchStepOptions(1, slots.find((s) => s.slotId === slotId) || {});
  };

  const fetchStepOptions = async (targetStep: number, currentSlot: Partial<VehicleSlot>) => {
    setSearchQuery('');

    // Instant load for Step 1 using full database brand catalog
    if (targetStep === 1) {
      if (cachedBrands.length > 0) {
        setOptions(cachedBrands);
        setLoadingOptions(false);
      } else {
        setLoadingOptions(true);
        loadAllBrandsFromDb().then(() => setLoadingOptions(false));
      }
      return;
    }

    setLoadingOptions(true);
    try {
      let endpoint = '';
      const b = encodeURIComponent(currentSlot.brand || '');
      const m = encodeURIComponent(currentSlot.model || '');
      const y = encodeURIComponent(currentSlot.year || '');
      const bt = encodeURIComponent(currentSlot.bodyType || '');
      const eng = encodeURIComponent(currentSlot.engineCode || '');
      const f = encodeURIComponent(currentSlot.fuelType || '');
      const trs = encodeURIComponent(currentSlot.transmissionName || '');

      if (targetStep === 2) {
        endpoint = `${API_URL}/vehicle-filters/models?brand=${b}`;
      } else if (targetStep === 3) {
        endpoint = `${API_URL}/vehicle-filters/years?brand=${b}&model=${m}&modelFamily=${m}`;
      } else if (targetStep === 4) {
        endpoint = `${API_URL}/vehicle-filters/body-types?brand=${b}&model=${m}&modelFamily=${m}&year=${y}`;
      } else if (targetStep === 5) {
        endpoint = `${API_URL}/vehicle-filters/engines?brand=${b}&model=${m}&modelFamily=${m}&year=${y}&bodyType=${bt}`;
      } else if (targetStep === 6) {
        endpoint = `${API_URL}/vehicle-filters/fuel-types?brand=${b}&model=${m}&modelFamily=${m}&year=${y}&bodyType=${bt}&engine=${eng}&engineVersion=${eng}`;
      } else if (targetStep === 7) {
        endpoint = `${API_URL}/vehicle-filters/transmissions?brand=${b}&model=${m}&modelFamily=${m}&year=${y}&bodyType=${bt}&engine=${eng}&engineVersion=${eng}&fuelType=${f}`;
      } else if (targetStep === 8) {
        endpoint = `${API_URL}/vehicle-filters/trims?brand=${b}&model=${m}&modelFamily=${m}&year=${y}&bodyType=${bt}&engine=${eng}&engineVersion=${eng}&fuelType=${f}&transmission=${trs}&transmissionType=${trs}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const items = json.data || json;
        if (Array.isArray(items)) {
          const list = items.map((i: any) => (typeof i === 'string' ? i : i.value || i.name || String(i)));
          setOptions(list);
        } else {
          setOptions([]);
        }
      } else {
        setOptions([]);
      }
    } catch (e) {
      console.error(e);
      setOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleStepBackInModal = () => {
    if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
      const currentSlot = slots.find((s) => s.slotId === activeSlotId) || {};
      fetchStepOptions(prevStep, currentSlot);
    } else {
      setModalVisible(false);
    }
  };

  const handleSelectOption = async (option: string) => {
    if (!activeSlotId) return;

    const currentSlot = slots.find((s) => s.slotId === activeSlotId) || { slotId: activeSlotId };
    const updatedSlot: VehicleSlot = { ...currentSlot };

    if (step === 1) {
      updatedSlot.brand = option;
      updatedSlot.model = undefined;
      updatedSlot.year = undefined;
      updatedSlot.bodyType = undefined;
      updatedSlot.engineCode = undefined;
      updatedSlot.fuelType = undefined;
      updatedSlot.transmissionName = undefined;
      updatedSlot.trimName = undefined;
      updatedSlot.variantId = undefined;
    } else if (step === 2) {
      updatedSlot.model = option;
      updatedSlot.year = undefined;
      updatedSlot.bodyType = undefined;
      updatedSlot.engineCode = undefined;
      updatedSlot.fuelType = undefined;
      updatedSlot.transmissionName = undefined;
      updatedSlot.trimName = undefined;
      updatedSlot.variantId = undefined;
    } else if (step === 3) {
      updatedSlot.year = option;
      updatedSlot.bodyType = undefined;
      updatedSlot.engineCode = undefined;
      updatedSlot.fuelType = undefined;
      updatedSlot.transmissionName = undefined;
      updatedSlot.trimName = undefined;
      updatedSlot.variantId = undefined;
    } else if (step === 4) {
      updatedSlot.bodyType = option;
      updatedSlot.engineCode = undefined;
      updatedSlot.fuelType = undefined;
      updatedSlot.transmissionName = undefined;
      updatedSlot.trimName = undefined;
      updatedSlot.variantId = undefined;
    } else if (step === 5) {
      updatedSlot.engineCode = option;
      updatedSlot.fuelType = undefined;
      updatedSlot.transmissionName = undefined;
      updatedSlot.trimName = undefined;
      updatedSlot.variantId = undefined;
    } else if (step === 6) {
      updatedSlot.fuelType = option;
      updatedSlot.transmissionName = undefined;
      updatedSlot.trimName = undefined;
      updatedSlot.variantId = undefined;
    } else if (step === 7) {
      updatedSlot.transmissionName = option;
      updatedSlot.trimName = undefined;
      updatedSlot.variantId = undefined;
    } else if (step === 8) {
      updatedSlot.trimName = option;
    }

    const newSlots = slots.map((s) => (s.slotId === activeSlotId ? updatedSlot : s));
    setSlots(newSlots);

    if (step < 8) {
      const nextStep = step + 1;
      setStep(nextStep);
      fetchStepOptions(nextStep, updatedSlot);
    } else {
      // Step 8 completed
      setModalVisible(false);
      saveRecentVehicle(updatedSlot);
      resolveSlotVariant(updatedSlot);

      // Auto-advance to next empty slot if available
      const currentSlotIndex = slots.findIndex((s) => s.slotId === activeSlotId);
      const nextEmptySlot = newSlots.find((s, idx) => idx > currentSlotIndex && (!s.brand || !s.model));

      if (nextEmptySlot) {
        setTimeout(() => {
          openSlotWizard(nextEmptySlot.slotId);
        }, 350);
      }
    }
  };

  const resolveSlotVariant = async (slot: VehicleSlot): Promise<string | undefined> => {
    try {
      const query = new URLSearchParams({
        brand: slot.brand || '',
        model: slot.model || '',
        modelFamily: slot.model || '',
        year: slot.year || '',
        bodyType: slot.bodyType || '',
        engine: slot.engineCode || '',
        engineVersion: slot.engineCode || '',
        fuelType: slot.fuelType || '',
        transmission: slot.transmissionName || '',
        transmissionType: slot.transmissionName || '',
        transmission_type: slot.transmissionName || '',
        trim: slot.trimName || '',
        trimPackage: slot.trimName || '',
      });

      const res = await fetch(`${API_URL}/vehicle-filters/match-variant?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.variantId) {
          setSlots((prev) =>
            prev.map((s) => (s.slotId === slot.slotId ? { ...s, variantId: json.variantId } : s))
          );
          return json.variantId;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return undefined;
  };

  const runComparison = async () => {
    const filledSlots = slots.filter((s) => s.brand && s.model);
    if (filledSlots.length < 2) {
      Alert.alert('Araç Seçimi Gerekli', 'Karşılaştırma yapmak için lütfen en az 2 araç seçin.');
      return;
    }

    setLoadingComparison(true);
    setComparisonResponse(null);

    try {
      const token = await AsyncStorage.getItem('accessToken');

      // 1. Resolve variantId for any slot missing it
      const resolvedSlots = await Promise.all(
        filledSlots.map(async (slot) => {
          if (slot.variantId) return slot;
          const vId = await resolveSlotVariant(slot);
          return { ...slot, variantId: vId };
        })
      );

      const variantIds = resolvedSlots.map((s) => s.variantId).filter((v): v is string => Boolean(v));

      if (variantIds.length < 2) {
        Alert.alert(
          'Varyant Eşleşme Uyarısı',
          'Seçtiğiniz araç kombinasyonları tam eşleştirilemedi. Lütfen motor ve donanım adımlarını tamamlayın.'
        );
        setLoadingComparison(false);
        return;
      }

      // 2. Call backend POST /comparisons endpoint (Web service integration!)
      const res = await fetch(`${API_URL}/comparisons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          variantIds,
          selectedPriority: 'BALANCED',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComparisonResponse(data);
        setActiveResultTab('matrix');
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Karşılaştırma Uyarısı', errData.message || 'Karşılaştırma işlemi gerçekleştirilemedi.');
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoadingComparison(false);
    }
  };

  const openCriterionDetail = (vehicleName: string, critKey: string, assessment: any, vehicleInfo?: any) => {
    setSelectedDetail({ vehicleName, critKey, assessment, vehicleInfo });
    setDetailModalVisible(true);
  };

  const getStepTitle = (s: number) => {
    switch (s) {
      case 1: return 'Marka Seçin';
      case 2: return 'Model Seçin';
      case 3: return 'Model Yılı Seçin';
      case 4: return 'Kasa Tipi Seçin';
      case 5: return 'Motor Seçin';
      case 6: return 'Yakıt Tipi Seçin';
      case 7: return 'Şanzıman Seçin';
      case 8: return 'Donanım Paketi Seçin';
      default: return 'Seçim Yapın';
    }
  };

  const activeSlot = slots.find((s) => s.slotId === activeSlotId);
  const filledSlots = slots.filter((s) => s.brand && s.model);

  // Extract web backend payload
  const vehiclesList = comparisonResponse?.vehicles || [];
  const compResultData = comparisonResponse?.comparisonResult || {};
  const rawRanking = compResultData?.criterionResult?.ranking || [];

  // Sort vehicle evaluations strictly by real backend ranking order / highest overall score
  const vehicleEvaluations = useMemo(() => {
    const rawList = [...(compResultData?.criterionResult?.vehicleEvaluations || [])];
    if (rawRanking && rawRanking.length > 0) {
      return rawList.sort((a: any, b: any) => {
        const rankA = rawRanking.find((r: any) => r.vehicleId === a.vehicleId)?.rank ?? 99;
        const rankB = rawRanking.find((r: any) => r.vehicleId === b.vehicleId)?.rank ?? 99;
        return rankA - rankB;
      });
    }
    return rawList.sort((a: any, b: any) => (b.overallScore || 0) - (a.overallScore || 0));
  }, [compResultData, rawRanking]);

  const narrativeRecommendation = compResultData?.narrativeRecommendation || compResultData?.overallRecommendation?.reasoning;
  const winnerVehicleName = compResultData?.overallRecommendation?.vehicleName || vehicleEvaluations[0]?.vehicleName || (vehiclesList[0] ? `${vehiclesList[0].brand} ${vehiclesList[0].model}` : '1. Sıra Araç');

  // Auto-scrolling carousel state for vehicle summary cards
  const topCardsScrollRef = useRef<ScrollView>(null);
  const [activeCardIdx, setActiveCardIdx] = useState<number>(0);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState<boolean>(false);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!vehicleEvaluations || vehicleEvaluations.length <= 1 || isAutoScrollPaused) {
      return;
    }

    const interval = setInterval(() => {
      setActiveCardIdx((prevIdx) => {
        const nextIdx = (prevIdx + 1) % vehicleEvaluations.length;
        const cardStep = 248; // 236 card width + 12 gap
        topCardsScrollRef.current?.scrollTo({
          x: nextIdx * cardStep,
          animated: true,
        });
        return nextIdx;
      });
    }, 3200);

    return () => clearInterval(interval);
  }, [vehicleEvaluations, isAutoScrollPaused]);

  // Auto-scrolling effect for specs table when > 2 vehicles
  useEffect(() => {
    if (activeResultTab !== 'specs' || vehiclesList.length <= 2 || isSpecsAutoScrollPaused) {
      return;
    }

    const interval = setInterval(() => {
      setSpecsScrollIdx((prevIdx) => {
        const maxSteps = Math.max(1, vehiclesList.length - 1);
        const nextIdx = (prevIdx + 1) % maxSteps;
        const stepWidth = 140;
        specsTableScrollRef.current?.scrollTo({
          x: nextIdx * stepWidth,
          animated: true,
        });
        return nextIdx;
      });
    }, 3400);

    return () => clearInterval(interval);
  }, [activeResultTab, vehiclesList.length, isSpecsAutoScrollPaused]);

  return (
    <View style={styles.container}>
      {/* Top Header Navigation */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.navTitle}>Araç Karşılaştır</Text>
          <View style={styles.quotaPill}>
            <Ionicons name="ribbon-outline" size={12} color="#0284c7" />
            <Text style={styles.quotaPillText}>
              {userTier === 'PROFESYONEL' || userTier === 'PREMIUM'
                ? `Premium Paket • Max ${vehicleLimit} Araç`
                : `${vehicleLimit} Araç Limiti`}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addSlotHeaderBtn} onPress={addSlot}>
          <Ionicons name="add-circle-outline" size={24} color="#0284c7" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Vehicles Selector Horizontal Cards */}
        <View style={styles.slotsCard}>
          <View style={styles.slotsCardHeader}>
            <Text style={styles.slotsCardTitle}>
              🚗 Karşılaştırılacak Araçlar ({filledSlots.length}/{slots.length})
            </Text>
            {slots.length < vehicleLimit && (
              <TouchableOpacity style={styles.addSlotLink} onPress={addSlot}>
                <Ionicons name="add" size={14} color="#0284c7" />
                <Text style={styles.addSlotLinkText}>Araç Ekle ({slots.length}/{vehicleLimit})</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            ref={slotsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slotsHorizontalScroll}
          >
            {slots.map((s, idx) => {
              const isFilled = Boolean(s.brand && s.model);
              return (
                <View key={s.slotId} style={styles.slotItemBox}>
                  {slots.length > 2 && (
                    <TouchableOpacity style={styles.removeSlotBtn} onPress={() => removeSlot(s.slotId)}>
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.slotCard, isFilled && styles.slotCardFilled]}
                    onPress={() => openSlotWizard(s.slotId)}
                  >
                    <BrandLogo brandName={s.brand} />

                    <View style={{ alignItems: 'center', gap: 2 }}>
                      <Text style={styles.slotTitle} numberOfLines={1}>
                        {isFilled ? `${s.brand} ${s.model}` : `${idx + 1}. Araç Seç`}
                      </Text>
                      <Text style={styles.slotSub} numberOfLines={1}>
                        {isFilled
                          ? `${s.year || ''} ${s.engineCode || ''} ${s.trimName ? `• ${s.trimName}` : ''}`
                          : 'Seçmek için dokunun'}
                      </Text>
                    </View>

                    <View style={styles.slotEditBadge}>
                      <Ionicons name={isFilled ? 'create-outline' : 'add-outline'} size={14} color="#0284c7" />
                      <Text style={styles.slotEditBadgeText}>{isFilled ? 'Değiştir' : 'Seç'}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          {/* Compare Action Trigger Button */}
          <TouchableOpacity
            style={[styles.compareSubmitBtn, filledSlots.length < 2 && styles.compareSubmitBtnDisabled]}
            onPress={runComparison}
            disabled={filledSlots.length < 2 || loadingComparison}
          >
            {loadingComparison ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="git-compare-outline" size={18} color="#ffffff" />
                <Text style={styles.compareSubmitBtnText}>
                  {filledSlots.length < 2 ? 'En Az 2 Araç Seçin' : `${filledSlots.length} Aracı Karşılaştır`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* COMPARISON RESULTS DOSSIER (EXACT WEB UI PARITY) */}
        {loadingComparison ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingTitle}>Web Karşılaştırma Servisi Çalışıyor...</Text>
            <Text style={styles.loadingSub}>8 kriter matrisi, yıldız değerlendirmeleri ve fabrika teknik verileri analiz ediliyor.</Text>
          </View>
        ) : vehiclesList.length > 0 ? (
          <View style={styles.resultsContainer}>
            {/* FREE WINNER REPORT NOTICE BANNER */}
            <View style={styles.noticeBanner}>
              <Text style={{ fontSize: 16 }}>🎁</Text>
              <Text style={styles.noticeBannerText}>
                Karşılaştırmada 1. sırayı alan kazanan aracın detaylı araç raporunu incelemek <Text style={{ fontWeight: '900', color: '#16a34a' }}>tamamen ücretsizdir</Text>.
              </Text>
            </View>

            {/* TOP VEHICLE IDENTITY SUMMARY CARDS CAROUSEL */}
            <View style={styles.carouselHeaderRow}>
              <Text style={styles.carouselTitleText}>
                🚘 Karşılaştırılan Araçlar ({vehicleEvaluations.length})
              </Text>
            </View>

            <ScrollView
              ref={topCardsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
              onScrollBeginDrag={() => {
                setIsAutoScrollPaused(true);
              }}
              onMomentumScrollEnd={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const newIdx = Math.max(
                  0,
                  Math.min(vehicleEvaluations.length - 1, Math.round(offsetX / 248))
                );
                setActiveCardIdx(newIdx);

                if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
                pauseTimerRef.current = setTimeout(() => {
                  setIsAutoScrollPaused(false);
                }, 4000);
              }}
            >
              {vehicleEvaluations.map((ev: any, rankIdx: number) => {
                const rankText = `Seçilenler arasında ${rankIdx + 1}. sırada`;
                const starsVal = ev.overallStars ?? (ev.overallScore ? Number((ev.overallScore / 20).toFixed(1)) : getDifferentiatedStarsForRank(rankIdx));
                const isWinner = rankIdx === 0;

                return (
                  <View
                    key={ev.vehicleId || rankIdx}
                    style={[
                      styles.topSummaryCard,
                      isWinner && styles.topSummaryCardWinner,
                    ]}
                  >
                    <Text style={styles.topSummaryTitle} numberOfLines={1}>
                      {ev.vehicleName}
                    </Text>
                    <Text
                      style={[
                        styles.topSummaryRank,
                        isWinner ? { color: '#0284c7' } : { color: '#64748b' },
                      ]}
                    >
                      {rankText}
                    </Text>

                    {/* Overall Star Rating Box */}
                    <View style={styles.starRatingBox}>
                      <Text style={styles.starRatingBoxTitle}>
                        GENEL YILDIZ DEĞERLENDİRMESİ
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {renderStars(starsVal, 'lg')}
                        <View style={styles.starScorePill}>
                          <Text style={styles.starScorePillText}>
                            {starsVal.toFixed(1)} / 5
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Vehicle Report Button */}
                    <TouchableOpacity
                      style={[
                        styles.reportActionBtn,
                        isWinner
                          ? styles.reportActionBtnFree
                          : styles.reportActionBtnPaid,
                      ]}
                      onPress={() => {
                        router.push({
                          pathname: '/vehicle-report',
                          params: { variantId: ev.vehicleId },
                        });
                      }}
                    >
                      <View style={styles.reportActionBtnLeft}>
                        <Ionicons
                          name={
                            isWinner
                              ? 'document-text-outline'
                              : 'flash-outline'
                          }
                          size={15}
                          color="#ffffff"
                        />
                        <Text
                          style={styles.reportActionBtnText}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {isWinner ? 'Aracın Raporunu Gör' : 'Raporunu İncele'}
                        </Text>
                      </View>

                      <View style={styles.reportActionBadge}>
                        <Text style={styles.reportActionBadgeText}>
                          {isWinner ? 'Ücretsiz' : '1 Hak'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Pagination Dots Indicator */}
            {vehicleEvaluations.length > 1 && (
              <View style={styles.paginationDotsContainer}>
                {vehicleEvaluations.map((_: any, idx: number) => {
                  const isActive = activeCardIdx === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setActiveCardIdx(idx);
                        topCardsScrollRef.current?.scrollTo({
                          x: idx * 248,
                          animated: true,
                        });
                        setIsAutoScrollPaused(true);
                        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
                        pauseTimerRef.current = setTimeout(() => {
                          setIsAutoScrollPaused(false);
                        }, 4000);
                      }}
                      style={[
                        styles.paginationDot,
                        isActive && styles.paginationDotActive,
                      ]}
                    />
                  );
                })}
              </View>
            )}

            {/* SUB-NAV TABS FOR DOSSIER SECTIONS */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
              <TouchableOpacity
                style={[styles.tabBarItem, activeResultTab === 'matrix' && styles.tabBarItemActive]}
                onPress={() => setActiveResultTab('matrix')}
              >
                <Ionicons name="stats-chart-outline" size={14} color={activeResultTab === 'matrix' ? '#0284c7' : '#64748b'} />
                <Text style={[styles.tabBarText, activeResultTab === 'matrix' && styles.tabBarTextActive]}>
                  8 Kriter Matrisi
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBarItem, activeResultTab === 'decision' && styles.tabBarItemActive]}
                onPress={() => setActiveResultTab('decision')}
              >
                <Ionicons name="trophy-outline" size={14} color={activeResultTab === 'decision' ? '#0284c7' : '#64748b'} />
                <Text style={[styles.tabBarText, activeResultTab === 'decision' && styles.tabBarTextActive]}>
                  Karar Özeti
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBarItem, activeResultTab === 'specs' && styles.tabBarItemActive]}
                onPress={() => setActiveResultTab('specs')}
              >
                <Ionicons name="speedometer-outline" size={14} color={activeResultTab === 'specs' ? '#0284c7' : '#64748b'} />
                <Text style={[styles.tabBarText, activeResultTab === 'specs' && styles.tabBarTextActive]}>
                  Fabrika Verileri
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* TAB 1: 8 KRİTER MATRİSİ TABLOSU (EXACT WEB DESIGN WITH CLICKABLE STARS) */}
            {activeResultTab === 'matrix' && (
              <View style={styles.sectionContainer}>
                <View style={styles.matrixHeaderRow}>
                  <Text style={styles.sectionHeading}>📊 Karşılaştırma Kriterleri</Text>
                  <Text style={styles.clickHintText}>💡 Detay için tıklayın</Text>
                </View>

                {CRITERIA_KEYS.map((key) => {
                  const meta = CRITERIA_METADATA[key] || { title: key, weightStr: '%10 Ağırlık', icon: '💎' };

                  return (
                    <View key={key} style={styles.criterionMatrixCard}>
                      <View style={styles.criterionMatrixHeader}>
                        <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                        <View>
                          <Text style={styles.criterionMatrixTitle}>{meta.title}</Text>
                          <Text style={styles.criterionMatrixWeight}>{meta.weightStr}</Text>
                        </View>
                      </View>

                      {/* Vehicle Star Rows */}
                      <View style={styles.criterionVehicleRows}>
                        {(() => {
                          const sortedCriterionVehicles = [...vehicleEvaluations]
                            .map((ev: any, origIdx: number) => {
                              const assessment = ev.assessments?.[key];
                              const starsVal = assessment?.stars ?? (assessment?.score ? assessment.score / 20 : getDifferentiatedStarsForRank(origIdx));
                              const vInfo = vehiclesList.find((v: any) => v.id === ev.vehicleId);
                              return { ev, assessment, starsVal, vInfo };
                            })
                            .sort((a, b) => b.starsVal - a.starsVal);

                          return sortedCriterionVehicles.map(({ ev, assessment, starsVal, vInfo }, rankIdx: number) => {
                            const isWinner = rankIdx === 0;

                            return (
                              <TouchableOpacity
                                key={ev.vehicleId || rankIdx}
                                style={[
                                  styles.criterionVehicleBtn,
                                  isWinner && styles.criterionVehicleBtnWinner,
                                ]}
                                onPress={() => openCriterionDetail(ev.vehicleName, key, assessment, vInfo)}
                                activeOpacity={0.75}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                  {isWinner && (
                                    <View style={styles.criterionWinnerBadge}>
                                      <Ionicons name="trophy" size={10} color="#b45309" />
                                      <Text style={styles.criterionWinnerBadgeText}>1. Sıra</Text>
                                    </View>
                                  )}
                                  <Text
                                    style={[
                                      styles.criterionVehicleName,
                                      isWinner && styles.criterionVehicleNameWinner,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {ev.vehicleName}
                                  </Text>
                                </View>

                                <View style={styles.criterionStarCell}>
                                  {renderStars(starsVal, 'sm')}
                                  <Text
                                    style={[
                                      styles.criterionStarValText,
                                      isWinner && styles.criterionStarValTextWinner,
                                    ]}
                                  >
                                    {starsVal.toFixed(1)}
                                  </Text>
                                  <Ionicons
                                    name="chevron-forward"
                                    size={14}
                                    color={isWinner ? '#b45309' : '#94a3b8'}
                                  />
                                </View>
                              </TouchableOpacity>
                            );
                          });
                        })()}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 2: KARAR ÖZETİ & TERCİH SIRALAMASI */}
            {activeResultTab === 'decision' && (
              <View style={styles.sectionContainer}>
                <View style={styles.winnerCard}>
                  <View style={styles.winnerBadgeRow}>
                    <View style={styles.winnerPill}>
                      <Ionicons name="trophy" size={14} color="#ffffff" />
                      <Text style={styles.winnerPillText}>1. SIRA KAZANAN ARAÇ</Text>
                    </View>
                  </View>

                  <Text style={styles.winnerTitle}>{winnerVehicleName}</Text>

                  {narrativeRecommendation && (
                    <Text style={styles.winnerNarrative}>{narrativeRecommendation}</Text>
                  )}
                </View>
              </View>
            )}

            {/* TAB 3: FABRİKA TEKNİK VERİLERİ TABLOSU */}
            {activeResultTab === 'specs' && (
              <View style={styles.sectionContainer}>
                <View style={styles.specsCard}>
                  <View style={styles.specsCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="speedometer" size={16} color="#0284c7" />
                      <Text style={styles.specsCardTitle}>Fabrika Karşılaştırma Tablosu</Text>
                    </View>
                    {vehiclesList.length > 2 && (
                      <TouchableOpacity
                        style={[styles.autoPlayToggleBtn, isSpecsAutoScrollPaused && styles.autoPlayToggleBtnPaused]}
                        onPress={() => setIsSpecsAutoScrollPaused(!isSpecsAutoScrollPaused)}
                      >
                        <Ionicons
                          name={isSpecsAutoScrollPaused ? 'play' : 'pause'}
                          size={11}
                          color={isSpecsAutoScrollPaused ? '#64748b' : '#0284c7'}
                        />
                        <Text style={[styles.autoPlayToggleText, isSpecsAutoScrollPaused && styles.autoPlayToggleTextPaused]}>
                          {isSpecsAutoScrollPaused ? 'Otomatik Kaydır' : 'Otomatik Kayıyor'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.specsTableContainer}>
                    {/* Left Pinned Column: Kriter & Category Labels */}
                    <View style={styles.specsPinnedCol}>
                      <View style={styles.specsPinnedHeaderCell}>
                        <Text style={styles.specsColLabelHeaderText}>KRİTER</Text>
                      </View>

                      {SPEC_SECTIONS.map((sec, secIdx) => (
                        <React.Fragment key={secIdx}>
                          <View style={styles.specsPinnedSectionCell}>
                            <Text style={styles.specsSectionTitle} numberOfLines={1}>
                              {sec.category}
                            </Text>
                          </View>

                          {sec.items.map((item) => (
                            <View key={item.key} style={styles.specsPinnedRowCell}>
                              <Text style={styles.specsLabelText} numberOfLines={2}>
                                {item.label}
                              </Text>
                            </View>
                          ))}
                        </React.Fragment>
                      ))}
                    </View>

                    {/* Right Horizontally Scrollable Vehicle Columns */}
                    <ScrollView
                      ref={specsTableScrollRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      onTouchStart={() => {
                        setIsSpecsAutoScrollPaused(true);
                        if (specsPauseTimerRef.current) clearTimeout(specsPauseTimerRef.current);
                        specsPauseTimerRef.current = setTimeout(() => setIsSpecsAutoScrollPaused(false), 6000);
                      }}
                      onScrollBeginDrag={() => {
                        setIsSpecsAutoScrollPaused(true);
                        if (specsPauseTimerRef.current) clearTimeout(specsPauseTimerRef.current);
                        specsPauseTimerRef.current = setTimeout(() => setIsSpecsAutoScrollPaused(false), 6000);
                      }}
                      style={{ flex: 1 }}
                    >
                      <View style={{ flexDirection: 'row' }}>
                        {vehiclesList.map((v: any, vIdx: number) => {
                          const logoUrl = getBrandLogoUrl(v.brand);
                          const colWidth = vehiclesList.length <= 2 ? 122 : 140;

                          return (
                            <View
                              key={v.id || vIdx}
                              style={[
                                styles.specsVehicleColumn,
                                { width: colWidth },
                                vIdx > 0 && styles.specsColBorder,
                              ]}
                            >
                              {/* Vehicle Header Pill */}
                              <View style={styles.specsColVehicleHeader}>
                                <View style={styles.specsVehiclePill}>
                                  {logoUrl ? (
                                    <Image
                                      source={{ uri: logoUrl }}
                                      style={styles.specsLogo}
                                      resizeMode="contain"
                                    />
                                  ) : (
                                    <Ionicons name="car-sport" size={18} color="#0284c7" />
                                  )}
                                  <Text style={styles.specsBrandText} numberOfLines={1}>
                                    {v.brand}
                                  </Text>
                                  <Text style={styles.specsModelText} numberOfLines={1}>
                                    {v.model}
                                  </Text>
                                  <View style={styles.specsTagPill}>
                                    <Text style={styles.specsTagText} numberOfLines={1}>
                                      {v.year ? `${v.year}` : ''}{v.trim ? ` • ${v.trim}` : (v.engine ? ` • ${v.engine}` : '')}
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              {/* Section & Data Cells for this vehicle */}
                              {SPEC_SECTIONS.map((sec, secIdx) => (
                                <React.Fragment key={secIdx}>
                                  <View style={styles.specsSectionBlankCell} />

                                  {sec.items.map((item, rIdx) => {
                                    const formattedVal = item.render(v);
                                    const customStyle = item.valStyle ? item.valStyle(v) : null;
                                    return (
                                      <View
                                        key={item.key}
                                        style={[
                                          styles.specsDataCell,
                                          rIdx % 2 === 1 ? styles.specsRowEven : styles.specsRowOdd,
                                        ]}
                                      >
                                        <Text
                                          style={[styles.specsValText, customStyle]}
                                          numberOfLines={2}
                                        >
                                          {formattedVal}
                                        </Text>
                                      </View>
                                    );
                                  })}
                                </React.Fragment>
                              ))}
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="git-compare-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Karşılaştırmaya Başlayın</Text>
            <Text style={styles.emptySub}>
              Yukarıdaki slotlardan en az 2 araç seçip &quot;Aracı Karşılaştır&quot; butonuna basarak web servisinden canlı fabrika verileri ve AI skor matrisini görüntüleyin.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* KRİTER DETAY ANALİZ POPUP MODALI (EXACT WEB CRITERION DETAIL POPUP) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContent}>
            {selectedDetail && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {/* Modal Title & Header */}
                <View style={styles.detailModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailModalVehicleName}>{selectedDetail.vehicleName}</Text>
                    <Text style={styles.detailModalCritTitle}>
                      {CRITERIA_METADATA[selectedDetail.critKey]?.title} ({CRITERIA_METADATA[selectedDetail.critKey]?.weightStr}) Detay Analiz Raporu
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setDetailModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Section 1: Verified Technical Specs */}
                {selectedDetail.vehicleInfo && (
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionTitle}>📋 DOĞRULANMIŞ ARAÇ TEKNİK ÖZELLİKLERİ:</Text>
                    <View style={styles.detailSpecGrid}>
                      <View style={styles.detailSpecItem}>
                        <Text style={styles.detailSpecLabel}>Donanım Paketi</Text>
                        <Text style={styles.detailSpecVal}>{selectedDetail.vehicleInfo.trim || 'Standart'}</Text>
                      </View>
                      <View style={styles.detailSpecItem}>
                        <Text style={styles.detailSpecLabel}>Motor Gücü</Text>
                        <Text style={styles.detailSpecVal}>
                          {selectedDetail.vehicleInfo.horsepower ? `${selectedDetail.vehicleInfo.horsepower} HP` : selectedDetail.vehicleInfo.engine || '-'}
                        </Text>
                      </View>
                      <View style={styles.detailSpecItem}>
                        <Text style={styles.detailSpecLabel}>Şanzıman Tipi</Text>
                        <Text style={styles.detailSpecVal}>{selectedDetail.vehicleInfo.transmission || 'Otomatik'}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Section 2: Summary Narrative */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionTitle}>📝 KRİTER ÖZET ANALİZİ:</Text>
                  <Text style={styles.detailSummaryText}>
                    {selectedDetail.assessment?.summary || selectedDetail.assessment?.reasoning || `${selectedDetail.vehicleName} modelinin ${CRITERIA_METADATA[selectedDetail.critKey]?.title} kriterindeki göreli performans analizi.`}
                  </Text>
                </View>

                {/* Section 3: Positive Factors */}
                {selectedDetail.assessment?.positiveFactors && selectedDetail.assessment.positiveFactors.length > 0 && (
                  <View style={[styles.detailSectionBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                    <Text style={[styles.detailSectionTitle, { color: '#15803d' }]}>✓ Olumlu Faktörler & Avantajlar:</Text>
                    {selectedDetail.assessment.positiveFactors.map((pf: string, i: number) => (
                      <View key={i} style={styles.bulletRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                        <Text style={styles.bulletTextPositive}>{pf}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Section 4: Negative Factors / Risks */}
                {selectedDetail.assessment?.negativeFactors && selectedDetail.assessment.negativeFactors.length > 0 && (
                  <View style={[styles.detailSectionBox, { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }]}>
                    <Text style={[styles.detailSectionTitle, { color: '#be123c' }]}>⚠️ Riskler, Dezavantajlar & Kısıtlar:</Text>
                    {selectedDetail.assessment.negativeFactors.map((nf: string, i: number) => (
                      <View key={i} style={styles.bulletRow}>
                        <Ionicons name="warning" size={14} color="#dc2626" />
                        <Text style={styles.bulletTextNegative}>{nf}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* CASCADING STEP SELECTION WIZARD MODAL MATCHING ARAÇ SORGULA */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header with Back Arrow, Title and Close */}
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalBackStepBtn} onPress={handleStepBackInModal}>
                <Ionicons name="chevron-back" size={20} color="#0f172a" />
              </TouchableOpacity>

              <View style={{ alignItems: 'center' }}>
                <Text style={styles.modalTitle}>{getStepTitle(step)}</Text>
                <Text style={styles.modalStepBadge}>Adım {step} / 8</Text>
              </View>

              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Segmented Progress Track Bar */}
            <View style={styles.progressRow}>
              <View style={styles.progressBarTrack}>
                {Array.from({ length: 8 }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressBarSegment,
                      i < step && styles.progressBarSegmentActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Active Selections Breadcrumb Badge Row */}
            {activeSlot && (activeSlot.brand || activeSlot.model) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbBadgeRow}>
                {activeSlot.brand ? (
                  <TouchableOpacity
                    style={styles.breadcrumbBadgeItem}
                    onPress={() => {
                      setStep(1);
                      fetchStepOptions(1, activeSlot);
                    }}
                  >
                    <BrandLogo brandName={activeSlot.brand} />
                    <Text style={styles.breadcrumbBadgeText}>{activeSlot.brand}</Text>
                    <Ionicons name="checkmark" size={12} color="#0284c7" />
                  </TouchableOpacity>
                ) : null}

                {activeSlot.model ? (
                  <TouchableOpacity
                    style={styles.breadcrumbBadgeItem}
                    onPress={() => {
                      setStep(2);
                      fetchStepOptions(2, activeSlot);
                    }}
                  >
                    <Text style={styles.breadcrumbBadgeText}>{activeSlot.model}</Text>
                    <Ionicons name="checkmark" size={12} color="#0284c7" />
                  </TouchableOpacity>
                ) : null}

                {activeSlot.year ? (
                  <TouchableOpacity
                    style={styles.breadcrumbBadgeItem}
                    onPress={() => {
                      setStep(3);
                      fetchStepOptions(3, activeSlot);
                    }}
                  >
                    <Text style={styles.breadcrumbBadgeText}>{activeSlot.year}</Text>
                    <Ionicons name="checkmark" size={12} color="#0284c7" />
                  </TouchableOpacity>
                ) : null}

                {activeSlot.bodyType ? (
                  <TouchableOpacity
                    style={styles.breadcrumbBadgeItem}
                    onPress={() => {
                      setStep(4);
                      fetchStepOptions(4, activeSlot);
                    }}
                  >
                    <Text style={styles.breadcrumbBadgeText}>{activeSlot.bodyType}</Text>
                    <Ionicons name="checkmark" size={12} color="#0284c7" />
                  </TouchableOpacity>
                ) : null}

                {activeSlot.engineCode ? (
                  <TouchableOpacity
                    style={styles.breadcrumbBadgeItem}
                    onPress={() => {
                      setStep(5);
                      fetchStepOptions(5, activeSlot);
                    }}
                  >
                    <Text style={styles.breadcrumbBadgeText}>{activeSlot.engineCode}</Text>
                    <Ionicons name="checkmark" size={12} color="#0284c7" />
                  </TouchableOpacity>
                ) : null}

                {activeSlot.fuelType ? (
                  <TouchableOpacity
                    style={styles.breadcrumbBadgeItem}
                    onPress={() => {
                      setStep(6);
                      fetchStepOptions(6, activeSlot);
                    }}
                  >
                    <Text style={styles.breadcrumbBadgeText}>{activeSlot.fuelType}</Text>
                    <Ionicons name="checkmark" size={12} color="#0284c7" />
                  </TouchableOpacity>
                ) : null}

                {activeSlot.transmissionName ? (
                  <TouchableOpacity
                    style={styles.breadcrumbBadgeItem}
                    onPress={() => {
                      setStep(7);
                      fetchStepOptions(7, activeSlot);
                    }}
                  >
                    <Text style={styles.breadcrumbBadgeText}>{activeSlot.transmissionName}</Text>
                    <Ionicons name="checkmark" size={12} color="#0284c7" />
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            )}

            {/* Search Input Box */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={18} color="#64748b" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={`${getStepTitle(step)} ara...`}
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Options List */}
            {loadingOptions ? (
              <View style={styles.modalLoadingBox}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={styles.modalLoadingText}>Seçenekler Yükleniyor...</Text>
              </View>
            ) : (() => {
              const filteredOptions = options.filter((item) =>
                item.toLowerCase().includes(searchQuery.trim().toLowerCase())
              );
              if (filteredOptions.length === 0) {
                return (
                  <View style={styles.modalEmptyBox}>
                    <Ionicons name="search" size={32} color="#cbd5e1" />
                    <Text style={styles.modalEmptyText}>Eşleşen sonuç bulunamadı.</Text>
                  </View>
                );
              }
              return (
                <FlatList
                  data={filteredOptions}
                  keyExtractor={(item, index) => `${item}_${index}`}
                  contentContainerStyle={{ paddingBottom: 24 }}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    step === 1 && searchQuery.trim().length === 0 && recentVehicles.length > 0 ? (() => {
                      const sortedRecentVehicles = [...recentVehicles].sort((a, b) => {
                        const aSelected = isVehicleAlreadySelectedInOtherSlot(a);
                        const bSelected = isVehicleAlreadySelectedInOtherSlot(b);
                        if (aSelected === bSelected) return 0;
                        return aSelected ? 1 : -1;
                      });

                      return (
                        <View style={styles.recentVehiclesSection}>
                          <View style={styles.recentVehiclesHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="time" size={16} color="#0284c7" />
                              <Text style={styles.recentVehiclesTitle}>Son Seçilen Araçlar</Text>
                            </View>
                            <View style={styles.recentInstantBadge}>
                              <Ionicons name="flash" size={11} color="#0284c7" />
                              <Text style={styles.recentInstantBadgeText}>8 Filtre Otomatik</Text>
                            </View>
                          </View>

                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.recentVehiclesScroll}
                          >
                            {sortedRecentVehicles.map((rv, rIdx) => {
                              const logoUrl = getBrandLogoUrl(rv.brand);
                              const isAlreadySelected = isVehicleAlreadySelectedInOtherSlot(rv);

                            return (
                              <TouchableOpacity
                                key={`${rv.brand}_${rv.model}_${rv.year}_${rIdx}`}
                                style={[
                                  styles.recentVehicleCard,
                                  isAlreadySelected && styles.recentVehicleCardDisabled,
                                ]}
                                onPress={() => {
                                  if (isAlreadySelected) {
                                    Alert.alert('Araç Zaten Seçili', 'Bu araç zaten diğer karşılaştırma slotunda eklenmiş.');
                                    return;
                                  }
                                  handleSelectRecentVehicle(rv);
                                }}
                                disabled={isAlreadySelected}
                                activeOpacity={isAlreadySelected ? 1 : 0.75}
                              >
                                <View style={styles.recentVehicleTopRow}>
                                  {logoUrl ? (
                                    <Image
                                      source={{ uri: logoUrl }}
                                      style={[styles.recentVehicleLogo, isAlreadySelected && { opacity: 0.4 }]}
                                      resizeMode="contain"
                                    />
                                  ) : (
                                    <Ionicons name="car-sport" size={22} color={isAlreadySelected ? '#94a3b8' : '#0284c7'} />
                                  )}
                                  <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text
                                      style={[styles.recentVehicleName, isAlreadySelected && { color: '#64748b' }]}
                                      numberOfLines={1}
                                    >
                                      {rv.brand} {rv.model}
                                    </Text>
                                    <Text style={styles.recentVehicleYearTrim} numberOfLines={1}>
                                      {rv.year} {rv.trimName ? `• ${rv.trimName}` : (rv.engineCode ? `• ${rv.engineCode}` : '')}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.recentVehiclePillRow}>
                                  {rv.fuelType ? (
                                    <View style={[styles.recentTagPill, isAlreadySelected && { backgroundColor: '#f1f5f9' }]}>
                                      <Text style={[styles.recentTagPillText, isAlreadySelected && { color: '#94a3b8' }]}>{rv.fuelType}</Text>
                                    </View>
                                  ) : null}
                                  {rv.transmissionName ? (
                                    <View style={[styles.recentTagPill, isAlreadySelected && { backgroundColor: '#f1f5f9' }]}>
                                      <Text style={[styles.recentTagPillText, isAlreadySelected && { color: '#94a3b8' }]}>
                                        {rv.transmissionName.replace(/\(.*\)/, '').trim()}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>

                                <View
                                  style={[
                                    styles.recentSelectBtn,
                                    isAlreadySelected && styles.recentSelectBtnDisabled,
                                  ]}
                                >
                                  <Ionicons
                                    name={isAlreadySelected ? 'checkmark-circle' : 'flash'}
                                    size={12}
                                    color={isAlreadySelected ? '#64748b' : '#ffffff'}
                                  />
                                  <Text
                                    style={[
                                      styles.recentSelectBtnText,
                                      isAlreadySelected && styles.recentSelectBtnTextDisabled,
                                    ]}
                                  >
                                    {isAlreadySelected ? 'Zaten Seçildi' : 'Tek Tıkla Seç & Ekle'}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>

                        <View style={styles.recentDividerRow}>
                          <View style={styles.recentDividerLine} />
                          <Text style={styles.recentDividerText}>VEYA MARKA LİSTESİNDEN SEÇİN</Text>
                          <View style={styles.recentDividerLine} />
                        </View>
                      </View>
                    );
                  })() : null}
                  renderItem={({ item }) => {
                    return (
                      <TouchableOpacity style={styles.optionRow} onPress={() => handleSelectOption(item)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          {step === 1 ? (
                            <BrandLogo brandName={item} />
                          ) : step === 4 ? (
                            <View style={styles.optionIconCircle}>
                              <Ionicons name="car-outline" size={18} color="#0284c7" />
                            </View>
                          ) : step === 6 ? (
                            <View style={styles.optionIconCircle}>
                              <Ionicons
                                name={
                                  item.toLowerCase().includes('dizel')
                                    ? 'water'
                                    : item.toLowerCase().includes('hibrit')
                                    ? 'leaf'
                                    : item.toLowerCase().includes('elektrik')
                                    ? 'flash'
                                    : 'color-fill'
                                }
                                size={18}
                                color="#0284c7"
                              />
                            </View>
                          ) : step === 7 ? (
                            <View style={styles.optionIconCircle}>
                              <Ionicons name="cog-outline" size={18} color="#0284c7" />
                            </View>
                          ) : step === 8 ? (
                            <View style={styles.optionIconCircle}>
                              <Ionicons name="sparkles" size={16} color="#0284c7" />
                            </View>
                          ) : null}
                          <Text style={styles.optionText}>{item}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                      </TouchableOpacity>
                    );
                  }}
                />
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Navigation Header
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  quotaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
    gap: 4,
  },
  quotaPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369a1',
  },
  addSlotHeaderBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },

  // Slots Card
  slotsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 14,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  slotsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotsCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  addSlotLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addSlotLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },

  slotsHorizontalScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  slotItemBox: {
    position: 'relative',
  },
  removeSlotBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  slotCard: {
    width: 135,
    minHeight: 140,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotCardFilled: {
    backgroundColor: '#ffffff',
    borderStyle: 'solid',
    borderColor: '#bae6fd',
  },
  brandLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoImg: {
    width: 32,
    height: 32,
  },
  slotTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  slotSub: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  slotEditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  slotEditBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
  },

  compareSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    marginTop: 4,
  },
  compareSubmitBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  compareSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Loading Container
  loadingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  loadingSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },

  // Results Container
  resultsContainer: {
    gap: 16,
  },

  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  noticeBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },

  // Top Summary Cards
  topSummaryCard: {
    width: 236,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    justifyContent: 'space-between',
  },
  topSummaryCardWinner: {
    borderColor: '#38bdf8',
    borderWidth: 1.5,
    backgroundColor: '#f0f9ff',
  },
  topSummaryTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  topSummaryRank: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: -4,
  },
  starRatingBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    padding: 8,
    gap: 4,
  },
  starRatingBoxTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  starScorePill: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  starScorePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },

  reportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
    gap: 4,
    overflow: 'hidden',
  },
  reportActionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    marginRight: 4,
  },
  reportActionBtnFree: {
    backgroundColor: '#16a34a',
  },
  reportActionBtnPaid: {
    backgroundColor: '#ea580c',
  },
  reportActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    flexShrink: 1,
  },
  reportActionBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  reportActionBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },

  // Sub-Nav Tabs
  tabBarScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
  },
  tabBarItemActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#38bdf8',
  },
  tabBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBarTextActive: {
    color: '#0284c7',
    fontWeight: '800',
  },

  sectionContainer: {
    gap: 12,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  clickHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
  },

  // Criterion Matrix Card
  criterionMatrixCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  criterionMatrixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  criterionMatrixTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  criterionMatrixWeight: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  criterionVehicleRows: {
    gap: 6,
  },
  criterionVehicleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  criterionVehicleName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  criterionStarCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  criterionStarValText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  criterionVehicleBtnWinner: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1.5,
  },
  criterionVehicleNameWinner: {
    color: '#78350f',
    fontWeight: '900',
  },
  criterionWinnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  criterionWinnerBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#92400e',
  },
  criterionStarValTextWinner: {
    color: '#b45309',
    fontWeight: '900',
  },

  // Winner Hero Card
  winnerCard: {
    backgroundColor: '#0284c7',
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  winnerBadgeRow: {
    flexDirection: 'row',
  },
  winnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  winnerPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  winnerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  winnerNarrative: {
    fontSize: 13,
    color: '#f0f9ff',
    lineHeight: 19,
  },

  matrixCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  matrixCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },

  // Tech Specs Table Styles
  specsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  specsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  specsCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  specsTableContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  specsPinnedCol: {
    width: 108,
    backgroundColor: '#f8fafc',
    borderRightWidth: 1.5,
    borderRightColor: '#cbd5e1',
    zIndex: 2,
  },
  specsPinnedHeaderCell: {
    height: 84,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
  specsColLabelHeaderText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  specsPinnedSectionCell: {
    height: 28,
    paddingHorizontal: 6,
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  specsSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.2,
  },
  specsPinnedRowCell: {
    height: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  specsLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    lineHeight: 14,
  },
  specsVehicleColumn: {
    backgroundColor: '#ffffff',
  },
  specsColVehicleHeader: {
    height: 84,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  specsColBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  specsVehiclePill: {
    width: '100%',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 2,
  },
  specsLogo: {
    width: 18,
    height: 18,
    marginBottom: 1,
  },
  specsBrandText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0369a1',
    textAlign: 'center',
  },
  specsModelText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  specsTagPill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 1,
    maxWidth: '100%',
  },
  specsTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284c7',
    textAlign: 'center',
  },
  specsSectionBlankCell: {
    height: 28,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  specsDataCell: {
    height: 44,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  specsRowOdd: {
    backgroundColor: '#ffffff',
  },
  specsRowEven: {
    backgroundColor: '#f8fafc',
  },
  specsValText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 15,
  },

  // Empty State
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Detail Modal
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  detailModalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
    gap: 10,
  },
  detailModalVehicleName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  detailModalCritTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    marginTop: 2,
  },
  detailCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSectionBox: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 0.5,
  },
  detailSpecGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailSpecItem: {
    flex: 1,
    minWidth: 90,
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 10,
  },
  detailSpecLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
  },
  detailSpecVal: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '800',
    marginTop: 2,
  },
  detailSummaryText: {
    fontSize: 13,
    color: '#f1f5f9',
    lineHeight: 19,
    fontWeight: '500',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulletTextPositive: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '700',
    flex: 1,
  },
  bulletTextNegative: {
    fontSize: 12,
    color: '#be123c',
    fontWeight: '700',
    flex: 1,
  },

  // Selector Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalBackStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalStepBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  modalSlotSummary: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'center',
  },
  modalSlotSummaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginVertical: 4,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    padding: 0,
  },
  modalEmptyBox: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  modalEmptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  modalLoadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },

  // Progress Bar Segmented Track Styles
  progressRow: {
    paddingVertical: 2,
  },
  progressBarTrack: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    gap: 4,
    overflow: 'hidden',
  },
  progressBarSegment: {
    flex: 1,
    height: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  progressBarSegmentActive: {
    backgroundColor: '#0284c7',
  },

  // Breadcrumb Badge Row Styles
  breadcrumbBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  breadcrumbBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  breadcrumbBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369a1',
  },
  optionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Auto-scroll Carousel & Pagination Styles
  carouselHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  carouselTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  autoPlayToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  autoPlayToggleBtnPaused: {
    backgroundColor: '#f1f5f9',
  },
  autoPlayToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
  },
  autoPlayToggleTextPaused: {
    color: '#64748b',
  },
  paginationDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  paginationDotActive: {
    width: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0284c7',
  },

  // Recent Vehicles Quick-Select Styles
  recentVehiclesSection: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 6,
  },
  recentVehiclesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  recentVehiclesTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  recentInstantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  recentInstantBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
  },
  recentVehiclesScroll: {
    gap: 10,
    paddingBottom: 4,
    paddingHorizontal: 2,
  },
  recentVehicleCard: {
    width: 220,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  recentVehicleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentVehicleLogo: {
    width: 28,
    height: 28,
  },
  recentVehicleName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  recentVehicleYearTrim: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 1,
  },
  recentVehiclePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  recentTagPill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recentTagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369a1',
  },
  recentSelectBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  },
  recentSelectBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  recentDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  recentDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  recentDividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  recentVehicleCardDisabled: {
    opacity: 0.55,
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  recentSelectBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  recentSelectBtnTextDisabled: {
    color: '#64748b',
  },
});
