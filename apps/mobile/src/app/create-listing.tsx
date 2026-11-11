import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createEdgeSwipeDismissHandlers } from '../utils/backGesture';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TURKEY_81_PROVINCES,
  getDistrictsForCity,
  getCanonicalBrandLogoUrl,
  getBrandMonogram,
} from '@used-car-intelligence/shared';
import { getBrandLogoUrl as resolveBrandLogo } from '../constants/brandLogos';
import UrgentBadge from '../components/UrgentBadge';
import ShowcaseBadge from '../components/ShowcaseBadge';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('ImagePicker could not be loaded:', e);
}

const API_URL = 'https://used-car-api-hzmu.onrender.com';

function BrandLogo({
  brandName,
  vehicleType,
  size = 34,
}: {
  brandName?: string;
  vehicleType?: string;
  size?: number;
}) {
  const [hasError, setHasError] = useState(false);
  const logoUrl =
    resolveBrandLogo(brandName, vehicleType) ||
    getCanonicalBrandLogoUrl(brandName, vehicleType) ||
    '';
  const monogram = getBrandMonogram(brandName);

  useEffect(() => {
    setHasError(false);
  }, [brandName, vehicleType]);

  return (
    <View
      style={[
        styles.brandLogoBox,
        { width: size, height: size, borderRadius: Math.round(size * 0.28) },
      ]}
    >
      {!hasError && !!logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: Math.round(size * 0.74), height: Math.round(size * 0.74) }}
          resizeMode="contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <View
          style={[
            styles.monogramBadgeBox,
            {
              width: Math.round(size * 0.82),
              height: Math.round(size * 0.82),
              backgroundColor: monogram.bgColor,
              borderColor: monogram.borderColor,
            },
          ]}
        >
          <Text
            style={[styles.monogramBadgeText, { color: monogram.textColor }]}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {monogram.initials}
          </Text>
        </View>
      )}
    </View>
  );
}

type VehicleCategory = 'AUTOMOBILE' | 'SUV_PICKUP' | 'MOTORCYCLE' | 'MINIVAN_PANELVAN';

const VEHICLE_CATEGORIES: {
  key: VehicleCategory;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { key: 'AUTOMOBILE', label: 'Otomobil', icon: 'car-sports' },
  { key: 'SUV_PICKUP', label: 'SUV & Pickup', icon: 'car-lifted-pickup' },
  { key: 'MOTORCYCLE', label: 'Motosiklet', icon: 'motorbike' },
  { key: 'MINIVAN_PANELVAN', label: 'Minivan & Panelvan', icon: 'van-utility' },
];

const WIZARD_STEPS = [
  { step: 1, title: 'Araç Seçimi', shortLabel: 'Araç' },
  { step: 2, title: 'İlan & Teknik Detaylar', shortLabel: 'Detaylar' },
  { step: 3, title: 'İlan Açıklaması', shortLabel: 'Açıklama' },
  { step: 4, title: 'Boya, Değişen & Tramer', shortLabel: 'Ekspertiz' },
  { step: 5, title: 'Araç Fotoğrafları', shortLabel: 'Fotoğraf' },
  { step: 6, title: 'Öne Çıkar & Yayınla', shortLabel: 'Yayınla' },
];

const QUICK_DESCRIPTION_PHRASES = [
  'İlk sahibinden, özenle kullanılmıştır.',
  'Tüm periyodik bakımları zamanında yapılmıştır.',
  'İç kozmetiği sıfır ayarındadır, sigara içilmemiştir.',
  'Yedek anahtarı ve kitapçıkları mevcuttur.',
  'Muayenesi yenidir, masrafsızdır.',
  'Ekspertize açıktır.',
];

const formatNumberInput = (val: string | number): string => {
  if (val === '' || val === undefined || val === null) return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return parseInt(numStr, 10).toLocaleString('tr-TR');
};

const parseNumberInput = (val: string): string => {
  return val.replace(/\D/g, '');
};

const TURKISH_CITIES = TURKEY_81_PROVINCES;

const BODY_TYPE_LABELS: Record<string, string> = {
  SEDAN: 'Sedan',
  HATCHBACK: 'Hatchback',
  SUV: 'SUV',
  COUPE: 'Coupe',
  CABRIO: 'Cabrio / Convertible',
  CONVERTIBLE: 'Cabrio / Convertible',
  STATION_WAGON: 'Station Wagon',
  WAGON: 'Station Wagon',
  MINIVAN: 'Minivan / MPV',
  PICKUP: 'Pick-up',
  VAN: 'Panelvan / Minibüs',
};

const mapToBodyTypeEnum = (bt: string): string => {
  const clean = (bt || '').toLowerCase().trim();
  if (clean === 'sedan') return 'SEDAN';
  if (clean === 'hatchback') return 'HATCHBACK';
  if (clean === 'suv') return 'SUV';
  if (clean === 'coupe') return 'COUPE';
  if (clean === 'cabrio' || clean === 'cabriolet' || clean === 'convertible') return 'CABRIO';
  if (clean === 'station wagon' || clean === 'wagon') return 'STATION_WAGON';
  if (clean === 'minivan' || clean === 'mpv') return 'MINIVAN';
  if (clean === 'panelvan' || clean === 'van') return 'VAN';
  if (clean === 'pick-up' || clean === 'pickup') return 'PICKUP';
  return 'SEDAN';
};

const mapToFuelTypeEnum = (ft: string): string => {
  const clean = (ft || '').toLowerCase().trim();
  if (clean === 'benzin') return 'PETROL';
  if (clean === 'dizel') return 'DIESEL';
  if (clean === 'hibrit') return 'HYBRID';
  if (clean === 'elektrik') return 'ELECTRIC';
  if (clean === 'lpg' || clean.includes('lpg')) return 'LPG';
  return 'PETROL';
};

const mapToTransmissionEnum = (tr: string): string => {
  const clean = (tr || '').toLowerCase().trim();
  if (clean === 'manuel' || clean.includes('manuel') || clean.includes('düz')) return 'MANUAL';
  if (clean.includes('yarı') || clean.includes('semi')) return 'SEMI_AUTOMATIC';
  return 'AUTOMATIC';
};

const inferDrivetrain = (
  brand?: string,
  model?: string,
  engine?: string,
  trim?: string
): 'FWD' | 'RWD' | 'AWD' => {
  const fullContext = `${brand || ''} ${model || ''} ${engine || ''} ${trim || ''}`.toLowerCase();

  if (
    /xdrive|4matic|quattro|4motion|allgrip|awd|4x4|4wd|4-motion|e-four|syncro|symmetrical/i.test(
      fullContext
    )
  ) {
    return 'AWD';
  }

  const brandNorm = (brand || '').toLowerCase().trim();
  const modelNorm = (model || '').toLowerCase().trim();

  if (brandNorm === 'bmw') {
    const isFwdBmw = /1 serisi|active tourer|gran tourer|gran coupe/i.test(modelNorm);
    if (isFwdBmw) return 'FWD';
    return 'RWD';
  }

  if (brandNorm.includes('mercedes')) {
    const isFwdBenz = /a serisi|b serisi|cla|gla|glb/i.test(modelNorm);
    if (isFwdBenz) return 'FWD';
    return 'RWD';
  }

  if (brandNorm.includes('alfa') && /giulia|4c/i.test(modelNorm)) {
    return 'RWD';
  }

  if (brandNorm === 'ford' && /mustang/i.test(modelNorm)) {
    return 'RWD';
  }

  if (brandNorm === 'porsche') {
    if (/cayenne|macan/i.test(modelNorm)) return 'AWD';
    return 'RWD';
  }

  return 'FWD';
};

const DRIVETRAINS = [
  { label: 'Önden Çekiş', val: 'FWD' },
  { label: 'Arkadan İtiş', val: 'RWD' },
  { label: 'Dört Çeker (4x4)', val: 'AWD' },
];

const VEHICLE_STATUSES = [
  { label: 'İkinci El', val: 'USED' },
  { label: 'Sıfır', val: 'NEW' },
  { label: 'İthal Sıfır', val: 'IMPORTED_NEW' },
];

const SELLER_TYPES = [
  { label: 'Sahibinden', val: 'OWNER' },
  { label: 'Galeriden', val: 'DEALER' },
  { label: 'Yetkili Bayiden', val: 'AUTHORIZED_DEALER' },
];

const PLATE_TYPES = [
  { label: 'TR Plakalı', val: 'TR_PLATE' },
  { label: 'MA (Misafir) Plaka', val: 'MA_PLATE' },
  { label: 'Özel / Yabancı', val: 'SPECIAL_PLATE' },
];

const CAR_COLORS = [
  { label: 'Beyaz', hex: '#ffffff', border: '#cbd5e1' },
  { label: 'Siyah', hex: '#0f172a', border: '#0f172a' },
  { label: 'Gri', hex: '#64748b', border: '#64748b' },
  { label: 'Gümüş', hex: '#94a3b8', border: '#94a3b8' },
  { label: 'Kırmızı', hex: '#dc2626', border: '#dc2626' },
  { label: 'Mavi', hex: '#2563eb', border: '#2563eb' },
  { label: 'Lacivert', hex: '#1e3a8a', border: '#1e3a8a' },
  { label: 'Yeşil', hex: '#16a34a', border: '#16a34a' },
  { label: 'Sarı', hex: '#eab308', border: '#eab308' },
  { label: 'Turuncu', hex: '#ea580c', border: '#ea580c' },
  { label: 'Kahverengi', hex: '#78350f', border: '#78350f' },
  { label: 'Bej / Şampanya', hex: '#d6d3d1', border: '#a8a29e' },
];

const CAR_BODY_PARTS = [
  { key: 'FRONT_BUMPER', label: 'Ön Tampon' },
  { key: 'HOOD', label: 'Motor Kaputu' },
  { key: 'ROOF', label: 'Tavan' },
  { key: 'TRUNK', label: 'Bagaj Kapağı' },
  { key: 'REAR_BUMPER', label: 'Arka Tampon' },
  { key: 'LEFT_FRONT_FENDER', label: 'Sol Ön Çamurluk' },
  { key: 'LEFT_FRONT_DOOR', label: 'Sol Ön Kapı' },
  { key: 'LEFT_REAR_DOOR', label: 'Sol Arka Kapı' },
  { key: 'LEFT_REAR_FENDER', label: 'Sol Arka Çamurluk' },
  { key: 'RIGHT_FRONT_FENDER', label: 'Sağ Ön Çamurluk' },
  { key: 'RIGHT_FRONT_DOOR', label: 'Sağ Ön Kapı' },
  { key: 'RIGHT_REAR_DOOR', label: 'Sağ Arka Kapı' },
  { key: 'RIGHT_REAR_FENDER', label: 'Sağ Arka Çamurluk' },
];

interface TaxonomyOption {
  label: string;
  value: string;
}

export default function CreateListingScreen() {
  const router = useRouter();
  const mainScrollRef = useRef<ScrollView>(null);

  // WIZARD STEP (1 to 6)
  const [step, setStep] = useState<number>(1);
  const [searchMode, setSearchMode] = useState<VehicleCategory>('AUTOMOBILE');

  // 1. CANONICAL 8-CRITERIA TAXONOMY STATE
  const [brands, setBrands] = useState<TaxonomyOption[]>([]);
  const [models, setModels] = useState<TaxonomyOption[]>([]);
  const [years, setYears] = useState<TaxonomyOption[]>([]);
  const [bodyTypes, setBodyTypes] = useState<TaxonomyOption[]>([]);
  const [engines, setEngines] = useState<TaxonomyOption[]>([]);
  const [fuelTypes, setFuelTypes] = useState<TaxonomyOption[]>([]);
  const [transmissions, setTransmissions] = useState<TaxonomyOption[]>([]);
  const [trims, setTrims] = useState<TaxonomyOption[]>([]);

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingBodyTypes, setLoadingBodyTypes] = useState(false);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [loadingFuels, setLoadingFuels] = useState(false);
  const [loadingTransmissions, setLoadingTransmissions] = useState(false);
  const [loadingTrims, setLoadingTrims] = useState(false);
  const [matchingVariant, setMatchingVariant] = useState(false);
  const [loadingTechSpecs, setLoadingTechSpecs] = useState(false);

  // Selected Dimensions (Canonical strings)
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBodyType, setSelectedBodyType] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('');
  const [selectedFuelType, setSelectedFuelType] = useState('');
  const [selectedTransmission, setSelectedTransmission] = useState('');
  const [selectedTrim, setSelectedTrim] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [matchedVariantDetail, setMatchedVariantDetail] = useState<any>(null);
  const [candidatePowers, setCandidatePowers] = useState<number[]>([]);

  // Custom details fallback if variant doesn't exist
  const [useCustomVariant, setUseCustomVariant] = useState(false);
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');

  // 2. BASIC LISTING DETAILS
  const [title, setTitle] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [fuelType, setFuelType] = useState('PETROL');
  const [transmission, setTransmission] = useState('AUTOMATIC');
  const [bodyType, setBodyType] = useState('SEDAN');
  const [color, setColor] = useState('Beyaz');
  const [description, setDescription] = useState('');

  // Technical Specs (Auto-filled by taxonomy, fully editable)
  const [engineDisplacement, setEngineDisplacement] = useState('');
  const [enginePower, setEnginePower] = useState('');
  const [drivetrain, setDrivetrain] = useState('FWD');

  // Condition, Paint & Tramer
  const [tramerAmount, setTramerAmount] = useState('0');
  const [damageRecord, setDamageRecord] = useState('');
  const [localPaintedParts, setLocalPaintedParts] = useState<string[]>([]);
  const [paintedParts, setPaintedParts] = useState<string[]>([]);
  const [changedParts, setChangedParts] = useState<string[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState('');

  // Extended Details
  const [vehicleStatus, setVehicleStatus] = useState('USED');
  const [sellerType, setSellerType] = useState('OWNER');
  const [plateType, setPlateType] = useState('TR_PLATE');
  const [hasWarranty, setHasWarranty] = useState(false);
  const [heavyDamage, setHeavyDamage] = useState(false);
  const [exchangeable, setExchangeable] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  // Promotional Package Sku & Responsibility
  const [selectedPromotionSku, setSelectedPromotionSku] = useState<
    'URGENT_LISTING' | 'SHOWCASE_FEED' | 'URGENT_SHOWCASE_BUNDLE' | null
  >(null);
  const [promotionTermsAccepted, setPromotionTermsAccepted] = useState(false);
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(true);

  // Photos
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Picker Modal State (Unified Interactive Sheet)
  const [activePicker, setActivePicker] = useState<
    | 'brand'
    | 'model'
    | 'year'
    | 'bodyType'
    | 'engine'
    | 'fuelType'
    | 'transmission'
    | 'trim'
    | 'city'
    | 'district'
    | null
  >(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quota, setQuota] = useState<{
    tier: string;
    activeCount: number;
    limit: number;
    remaining: number;
  } | null>(null);

  const fetchListingQuota = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) || (await AsyncStorage.getItem('token'));
      if (!token) return;
      const res = await fetch(`${API_URL}/me/listing-quota`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchListingQuota();
  }, []);

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    if (nextStep === 6) {
      fetchListingQuota();
    }
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 60);
  };

  // Fetch initial brands whenever searchMode changes
  useEffect(() => {
    fetchBrands(searchMode);
  }, [searchMode]);

  const fetchBrands = async (category: VehicleCategory = searchMode) => {
    setLoadingBrands(true);
    try {
      const res = await fetch(`${API_URL}/vehicle-filters/brands?category=${category}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const normalized = json.data.map((item: any) =>
          typeof item === 'string'
            ? { label: item, value: item }
            : { label: item.label || item.value || item.name, value: item.value || item.name }
        );
        setBrands(normalized);
      }
    } catch (e) {
      console.error('Error fetching brands:', e);
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleCategorySwitch = (newCategory: VehicleCategory) => {
    if (newCategory === searchMode) return;
    setSearchMode(newCategory);
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedYear('');
    setSelectedBodyType('');
    setSelectedEngine('');
    setSelectedFuelType('');
    setSelectedTransmission('');
    setSelectedTrim('');
    setSelectedVariantId('');
    setMatchedVariantDetail(null);
    setCandidatePowers([]);
    setModels([]);
    setYears([]);
    setBodyTypes([]);
    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);
  };

  // 8-Step Cascade Handlers
  const handleBrandChange = async (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel('');
    setSelectedYear('');
    setSelectedBodyType('');
    setSelectedEngine('');
    setSelectedFuelType('');
    setSelectedTransmission('');
    setSelectedTrim('');
    setSelectedVariantId('');
    setMatchedVariantDetail(null);
    setCandidatePowers([]);
    setModels([]);
    setYears([]);
    setBodyTypes([]);
    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!brand) return;
    setLoadingModels(true);
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/models?brand=${encodeURIComponent(brand)}&category=${searchMode}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const list = json.data.map((item: any) =>
          typeof item === 'string'
            ? { label: item, value: item }
            : { label: item.label || item.value, value: item.value }
        );
        setModels(list);
        if (list.length === 1) {
          handleModelChange(list[0].value, brand);
        }
      }
    } catch (e) {
      console.error('Error fetching models:', e);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleModelChange = async (model: string, currentBrand = selectedBrand) => {
    setSelectedModel(model);
    setSelectedYear('');
    setSelectedBodyType('');
    setSelectedEngine('');
    setSelectedFuelType('');
    setSelectedTransmission('');
    setSelectedTrim('');
    setSelectedVariantId('');
    setMatchedVariantDetail(null);
    setCandidatePowers([]);
    setYears([]);
    setBodyTypes([]);
    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!model || !currentBrand) return;
    setLoadingYears(true);
    const currentYearNum = new Date().getFullYear();
    const buildListingYearRange = (maxYr: number) =>
      Array.from({ length: maxYr - 1970 + 1 }, (_, i) => {
        const yr = String(maxYr - i);
        return { label: yr, value: yr };
      });
    try {
      if (searchMode === 'MOTORCYCLE') {
        setYears(buildListingYearRange(currentYearNum));
      } else {
        const res = await fetch(
          `${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(currentBrand)}&modelFamily=${encodeURIComponent(model)}&category=${searchMode}&forListing=true`
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const list = json.data.map((item: any) =>
            typeof item === 'string'
              ? { label: item, value: item }
              : { label: String(item.label || item.value), value: String(item.value) }
          );
          if (list.some((d: any) => Number(d.value) <= 1970)) {
            setYears(list);
          } else {
            const maxDbYear = list.reduce((acc: number, d: any) => {
              const n = Number(d.value);
              return !isNaN(n) && n > acc ? n : acc;
            }, currentYearNum);
            setYears(buildListingYearRange(Math.max(currentYearNum, maxDbYear)));
          }
        } else {
          setYears(buildListingYearRange(currentYearNum));
        }
      }
    } catch (e) {
      console.error('Error fetching years:', e);
      setYears(buildListingYearRange(currentYearNum));
    } finally {
      setLoadingYears(false);
    }
  };

  const handleYearChange = async (
    year: string,
    currentModel = selectedModel,
    currentBrand = selectedBrand
  ) => {
    setSelectedYear(year);
    setSelectedBodyType('');
    setSelectedEngine('');
    setSelectedFuelType('');
    setSelectedTransmission('');
    setSelectedTrim('');
    setSelectedVariantId('');
    setMatchedVariantDetail(null);
    setCandidatePowers([]);
    setBodyTypes([]);
    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!year || !currentModel || !currentBrand) return;
    setLoadingBodyTypes(true);
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/body-types?brand=${encodeURIComponent(currentBrand)}&modelFamily=${encodeURIComponent(currentModel)}&year=${encodeURIComponent(year)}&category=${searchMode}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const list = json.data.map((item: any) =>
          typeof item === 'string'
            ? { label: item, value: item }
            : { label: item.label || item.value, value: item.value }
        );
        setBodyTypes(list);
        if (list.length === 1) {
          handleBodyTypeChange(list[0].value, year, currentModel, currentBrand);
        }
      }
    } catch (e) {
      console.error('Error fetching body types:', e);
    } finally {
      setLoadingBodyTypes(false);
    }
  };

  const handleBodyTypeChange = async (
    bodyTypeVal: string,
    currentYear = selectedYear,
    currentModel = selectedModel,
    currentBrand = selectedBrand
  ) => {
    setSelectedBodyType(bodyTypeVal);
    setSelectedEngine('');
    setSelectedFuelType('');
    setSelectedTransmission('');
    setSelectedTrim('');
    setSelectedVariantId('');
    setMatchedVariantDetail(null);
    setCandidatePowers([]);
    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!bodyTypeVal || !currentYear || !currentModel || !currentBrand) return;
    setLoadingEngines(true);
    try {
      const query = new URLSearchParams({
        brand: currentBrand,
        modelFamily: currentModel,
        year: String(currentYear),
        bodyType: bodyTypeVal,
        category: searchMode,
      });
      const res = await fetch(`${API_URL}/vehicle-filters/engines?${query.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const list = json.data.map((item: any) =>
          typeof item === 'string'
            ? { label: item, value: item }
            : { label: item.label || item.value, value: item.value }
        );
        setEngines(list);
        if (list.length === 1) {
          handleEngineChange(list[0].value, bodyTypeVal, currentYear, currentModel, currentBrand);
        }
      }
    } catch (e) {
      console.error('Error fetching engines:', e);
    } finally {
      setLoadingEngines(false);
    }
  };

  const handleEngineChange = async (
    engineVal: string,
    currentBody = selectedBodyType,
    currentYear = selectedYear,
    currentModel = selectedModel,
    currentBrand = selectedBrand
  ) => {
    setSelectedEngine(engineVal);
    setSelectedFuelType('');
    setSelectedTransmission('');
    setSelectedTrim('');
    setSelectedVariantId('');
    setMatchedVariantDetail(null);
    setCandidatePowers([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!engineVal || !currentBody || !currentYear || !currentModel || !currentBrand) return;
    setLoadingFuels(true);
    try {
      const query = new URLSearchParams({
        brand: currentBrand,
        modelFamily: currentModel,
        year: String(currentYear),
        bodyType: currentBody,
        engineVersion: engineVal,
        category: searchMode,
      });
      const res = await fetch(`${API_URL}/vehicle-filters/fuel-types?${query.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const list = json.data.map((item: any) =>
          typeof item === 'string'
            ? { label: item, value: item }
            : { label: item.label || item.value, value: item.value }
        );
        setFuelTypes(list);
        if (list.length === 1) {
          handleFuelTypeChange(
            list[0].value,
            engineVal,
            currentBody,
            currentYear,
            currentModel,
            currentBrand
          );
        }
      }
    } catch (e) {
      console.error('Error fetching fuel types:', e);
    } finally {
      setLoadingFuels(false);
    }
  };

  const handleFuelTypeChange = async (
    fuelVal: string,
    currentEngine = selectedEngine,
    currentBody = selectedBodyType,
    currentYear = selectedYear,
    currentModel = selectedModel,
    currentBrand = selectedBrand
  ) => {
    setSelectedFuelType(fuelVal);
    setSelectedTransmission('');
    setSelectedTrim('');
    setSelectedVariantId('');
    setMatchedVariantDetail(null);
    setCandidatePowers([]);
    setTransmissions([]);
    setTrims([]);

    if (!fuelVal || !currentEngine || !currentBody || !currentYear || !currentModel || !currentBrand)
      return;
    setLoadingTransmissions(true);
    try {
      const query = new URLSearchParams({
        brand: currentBrand,
        modelFamily: currentModel,
        year: String(currentYear),
        bodyType: currentBody,
        engineVersion: currentEngine,
        fuelType: fuelVal,
        category: searchMode,
      });
      const res = await fetch(`${API_URL}/vehicle-filters/transmissions?${query.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const list = json.data.map((item: any) =>
          typeof item === 'string'
            ? { label: item, value: item }
            : { label: item.label || item.value, value: item.value }
        );
        setTransmissions(list);
        if (list.length === 1) {
          handleTransmissionChange(
            list[0].value,
            fuelVal,
            currentEngine,
            currentBody,
            currentYear,
            currentModel,
            currentBrand
          );
        }
      }
    } catch (e) {
      console.error('Error fetching transmissions:', e);
    } finally {
      setLoadingTransmissions(false);
    }
  };

  const handleTransmissionChange = async (
    transVal: string,
    currentFuel = selectedFuelType,
    currentEngine = selectedEngine,
    currentBody = selectedBodyType,
    currentYear = selectedYear,
    currentModel = selectedModel,
    currentBrand = selectedBrand
  ) => {
    setSelectedTransmission(transVal);
    setSelectedTrim('');
    setSelectedVariantId('');
    setMatchedVariantDetail(null);
    setCandidatePowers([]);
    setTrims([]);

    if (
      !transVal ||
      !currentFuel ||
      !currentEngine ||
      !currentBody ||
      !currentYear ||
      !currentModel ||
      !currentBrand
    )
      return;
    setLoadingTrims(true);
    try {
      const query = new URLSearchParams({
        brand: currentBrand,
        modelFamily: currentModel,
        year: String(currentYear),
        bodyType: currentBody,
        engineVersion: currentEngine,
        fuelType: currentFuel,
        transmissionType: transVal,
        category: searchMode,
      });
      const res = await fetch(`${API_URL}/vehicle-filters/trims?${query.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const list = json.data.map((item: any) =>
          typeof item === 'string'
            ? { label: item, value: item }
            : { label: item.label || item.value, value: item.value }
        );
        setTrims(list);
        if (list.length === 1) {
          handleTrimChange(
            list[0].value,
            transVal,
            currentFuel,
            currentEngine,
            currentBody,
            currentYear,
            currentModel,
            currentBrand
          );
        }
      }
    } catch (e) {
      console.error('Error fetching trims:', e);
    } finally {
      setLoadingTrims(false);
    }
  };

  const handleTrimChange = async (
    trimVal: string,
    currentTrans = selectedTransmission,
    currentFuel = selectedFuelType,
    currentEngine = selectedEngine,
    currentBody = selectedBodyType,
    currentYear = selectedYear,
    currentModel = selectedModel,
    currentBrand = selectedBrand
  ) => {
    setSelectedTrim(trimVal);
    setSelectedVariantId('');
    setMatchedVariantDetail(null);
    setCandidatePowers([]);

    if (
      !trimVal ||
      !currentTrans ||
      !currentFuel ||
      !currentEngine ||
      !currentBody ||
      !currentYear ||
      !currentModel ||
      !currentBrand
    )
      return;

    setMatchingVariant(true);
    try {
      const query = new URLSearchParams({
        brand: currentBrand,
        modelFamily: currentModel,
        year: String(currentYear),
        bodyType: currentBody,
        engineVersion: currentEngine,
        fuelType: currentFuel,
        transmissionType: currentTrans,
        trimPackage: trimVal,
        category: searchMode,
      });
      const res = await fetch(`${API_URL}/vehicle-filters/match-variant?${query.toString()}`);
      const json = await res.json();

      const matchedId = json.variantId || json.modelId;
      if (json.success && matchedId) {
        setSelectedVariantId(matchedId);
        setBodyType(mapToBodyTypeEnum(currentBody));
        setFuelType(mapToFuelTypeEnum(currentFuel));
        setTransmission(mapToTransmissionEnum(currentTrans));

        const initialDt = inferDrivetrain(currentBrand, currentModel, currentEngine, trimVal);
        setDrivetrain(initialDt);

        if (!title) {
          const cleanTrim =
            trimVal && !/tüm vites/i.test(trimVal) ? trimVal : '';
          setTitle(
            `${currentBrand} ${currentModel} ${currentEngine} ${cleanTrim} (${currentYear})`
              .replace(/\s+/g, ' ')
              .trim()
          );
        }

        // Resolve technical specs (cc & HP) from catalog
        setLoadingTechSpecs(true);
        try {
          const techRes = await fetch(
            `${API_URL}/vehicle-filters/variants/${matchedId}/technical-specs`
          );
          if (techRes.ok) {
            const techJson = await techRes.json();
            if (techJson?.displacementCc) {
              setEngineDisplacement(String(techJson.displacementCc));
            }
            if (Array.isArray(techJson?.candidatePowers) && techJson.candidatePowers.length > 1) {
              setCandidatePowers(techJson.candidatePowers);
            }
            if (techJson?.powerHp) {
              setEnginePower(String(techJson.powerHp));
            }
          }

          const token =
            (await AsyncStorage.getItem('accessToken')) || (await AsyncStorage.getItem('token'));
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const detailRes = await fetch(`${API_URL}/vehicles/variants/${matchedId}`, {
            headers,
          });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            setMatchedVariantDetail(detail);

            const hp =
              detail.powerEnrichment?.powerHp ||
              detail.specs?.specs?.enginePowerHp ||
              detail.specs?.specs?.powerHp ||
              detail.specs?.enginePowerHp ||
              detail.engine?.powerHp ||
              detail.engine?.horsepower;

            if (hp && !enginePower) {
              setEnginePower(String(hp));
            }

            const cc =
              detail.specs?.specs?.engineDisplacementCc ||
              detail.specs?.engineDisplacementCc ||
              detail.engine?.displacementCc ||
              detail.engine?.displacement ||
              detail.specs?.engineDisplacement;
            if (cc && !engineDisplacement) {
              setEngineDisplacement(String(cc));
            }

            if (detail.specs?.drivetrain) {
              setDrivetrain(detail.specs.drivetrain);
            }
          }
        } catch (e) {
          console.warn('Could not load variant technical detail:', e);
        } finally {
          setLoadingTechSpecs(false);
        }
      } else {
        setSelectedVariantId('');
      }
    } catch (e) {
      console.error('Error matching variant:', e);
      setSelectedVariantId('');
    } finally {
      setMatchingVariant(false);
    }
  };

  // Image Upload Handlers
  const pickImagesFromGallery = async () => {
    try {
      if (!ImagePicker) {
        Alert.alert('Hata', 'Fotoğraf seçici modülü yüklenemedi.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf yüklemek için galeri erişim izni vermelisiniz.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
        allowsMultipleSelection: true,
        quality: 0.82,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((a: any) => a.uri);
        setSelectedImages((prev) => [...prev, ...newUris].slice(0, 10));
      }
    } catch (e: any) {
      console.error('Gallery pick error:', e);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const setPartCondition = (
    partKey: string,
    targetType: 'original' | 'local' | 'painted' | 'changed'
  ) => {
    setLocalPaintedParts((prev) => prev.filter((k) => k !== partKey));
    setPaintedParts((prev) => prev.filter((k) => k !== partKey));
    setChangedParts((prev) => prev.filter((k) => k !== partKey));

    if (targetType === 'local') {
      setLocalPaintedParts((prev) => [...prev, partKey]);
    } else if (targetType === 'painted') {
      setPaintedParts((prev) => [...prev, partKey]);
    } else if (targetType === 'changed') {
      setChangedParts((prev) => [...prev, partKey]);
    }
  };

  // Step Transition Validators
  const handleNextFromStep1 = () => {
    if (useCustomVariant) {
      if (!customBrand.trim() || !customModel.trim() || !selectedYear.trim()) {
        Alert.alert('Eksik Bilgi', 'Lütfen marka, model ve model yılı alanlarını doldurun.');
        return;
      }
      if (!title.trim()) {
        setTitle(`${customBrand.trim()} ${customModel.trim()} (${selectedYear.trim()})`);
      }
      goToStep(2);
      return;
    }

    if (!selectedBrand || !selectedModel || !selectedYear) {
      Alert.alert('Eksik Seçim', 'Lütfen aracınızın marka, model ve yıl seçimlerini tamamlayın.');
      return;
    }

    if (matchingVariant || loadingTechSpecs) {
      Alert.alert('Lütfen Bekleyin', 'Araç katalog ve teknik bilgileri doğrulanıyor...');
      return;
    }

    if (!selectedVariantId && searchMode !== 'MOTORCYCLE') {
      Alert.alert(
        'Varyant Seçimi Eksik',
        'Lütfen aracınızın tüm özelliklerini (Kasa, Motor, Yakıt, Şanzıman ve Paket) seçin veya "Aracımı listede bulamadım" seçeneğini işaretleyin.'
      );
      return;
    }

    goToStep(2);
  };

  const handleNextFromStep2 = () => {
    const rawPrice = parseNumberInput(priceAmount);
    const rawKm = parseNumberInput(kilometers);

    if (!title.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilan başlığını yazın.');
      return;
    }
    if (!rawPrice || isNaN(Number(rawPrice)) || Number(rawPrice) <= 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen geçerli bir satış fiyatı (TL) girin.');
      return;
    }
    if (!rawKm || isNaN(Number(rawKm))) {
      Alert.alert('Eksik Bilgi', 'Lütfen aracın kilometre bilgisini girin.');
      return;
    }
    if (!city) {
      Alert.alert('Eksik Bilgi', 'Lütfen aracın bulunduğu şehri (İl) seçin.');
      return;
    }
    if (!color) {
      Alert.alert('Eksik Bilgi', 'Lütfen araç rengini seçin.');
      return;
    }

    goToStep(3);
  };

  const handleSubmit = async () => {
    const rawPrice = parseNumberInput(priceAmount);
    const rawKm = parseNumberInput(kilometers);

    if (!responsibilityAccepted) {
      Alert.alert(
        'Onay Gerekli',
        'Lütfen ilan bilgilerinin doğruluğuna ilişkin beyan kutusunu işaretleyin.'
      );
      return;
    }

    if (selectedPromotionSku && !promotionTermsAccepted) {
      Alert.alert(
        'Promosyon Koşulları',
        'Lütfen seçtiğiniz ilan promosyonuna ilişkin onay kutusunu işaretleyin.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) || (await AsyncStorage.getItem('token'));

      if (!token) {
        Alert.alert('Giriş Yapın', 'İlan yayınlamak için lütfen önce giriş yapın.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/login' as any) },
        ]);
        setSubmitting(false);
        return;
      }

      const yearNum = Number(parseNumberInput(selectedYear)) || 2020;
      const rawDisplacement = parseNumberInput(engineDisplacement);
      const rawPower = parseNumberInput(enginePower);
      const rawTramer = parseNumberInput(tramerAmount);
      const effectiveUrgent =
        isUrgent ||
        selectedPromotionSku === 'URGENT_LISTING' ||
        selectedPromotionSku === 'URGENT_SHOWCASE_BUNDLE';

      const payload: any = {
        title: title.trim(),
        description: description.trim() || 'Temiz ve bakımlı araç.',
        priceAmount: Number(rawPrice),
        kilometers: Number(rawKm),
        modelYear: yearNum,
        city: city.trim(),
        district: district.trim() || undefined,
        fuelType,
        transmission,
        bodyType,
        color,
        vehicleStatus,
        sellerType,
        plateType,
        hasWarranty,
        heavyDamage,
        exchangeable,
        isUrgent: effectiveUrgent,
        engineDisplacement: rawDisplacement ? Number(rawDisplacement) : undefined,
        enginePower: rawPower ? Number(rawPower) : undefined,
        drivetrain,
        tramerAmount: rawTramer ? Number(rawTramer) : 0,
        damageRecord: damageRecord.trim() || undefined,
        localPaintedParts,
        paintedParts,
        changedParts,
        maintenanceHistory: maintenanceHistory.trim() || undefined,
      };

      if (!useCustomVariant && selectedVariantId) {
        payload.vehicleVariantId = selectedVariantId;
      }

      // 1. Create Listing
      const createRes = await fetch(`${API_URL}/listings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.message || 'İlan oluşturulurken bir hata oluştu.');
      }

      const createdListing = await createRes.json();
      const listingId = createdListing.id;

      // 2. Upload Selected Images
      if (selectedImages.length > 0 && listingId) {
        for (const uri of selectedImages) {
          try {
            const formData = new FormData();
            const filename = uri.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('file', {
              uri,
              name: filename,
              type,
            } as any);

            await fetch(`${API_URL}/listings/${listingId}/media`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });
          } catch (imgErr) {
            console.warn('Image upload partial error:', imgErr);
          }
        }
      }

      // 3. Activate Selected Promotional Package (if chosen)
      if (selectedPromotionSku && listingId) {
        try {
          await fetch(`${API_URL}/listing-promotions/test-checkout/${listingId}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              productSku: selectedPromotionSku,
            }),
          });
        } catch (promoErr) {
          console.warn('Listing promotion activation warning:', promoErr);
        }
      }

      // 4. Submit for Moderation Review (PENDING_REVIEW)
      const statusRes = await fetch(`${API_URL}/listings/${listingId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'PENDING_REVIEW' }),
      });

      if (!statusRes.ok) {
        const errData = await statusRes.json().catch(() => ({}));
        console.warn('Status patch warning:', errData);
      }

      Alert.alert(
        'İlan Başarıyla Gönderildi! 🎉',
        selectedPromotionSku
          ? 'İlanınız ve seçtiğiniz promosyon paketi başarıyla onay kuyruğuna alındı.'
          : 'İlanınız başarıyla incelenmek üzere onaya gönderildi.',
        [
          {
            text: 'İlanlarıma Git',
            onPress: () => router.push('/(tabs)/listings' as any),
          },
        ]
      );
    } catch (e: any) {
      console.error('Submit listing error:', e);
      Alert.alert('Hata', e.message || 'İlan yayınlanırken bir sorun oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Compute options for active picker modal
  const pickerData = useMemo(() => {
    let list: { label: string; value: string }[] = [];
    let title = '';

    if (activePicker === 'brand') {
      title = 'Marka Seçin';
      list = brands;
    } else if (activePicker === 'model') {
      title = selectedBrand ? `${selectedBrand} Modelleri` : 'Model Seçin';
      list = models;
    } else if (activePicker === 'year') {
      title = 'Model Yılı Seçin';
      list = years;
    } else if (activePicker === 'bodyType') {
      title = searchMode === 'MOTORCYCLE' ? 'Motosiklet Tipi Seçin' : 'Kasa Tipi Seçin';
      list = bodyTypes.map((bt) => ({
        label: BODY_TYPE_LABELS[bt.value] || bt.label,
        value: bt.value,
      }));
    } else if (activePicker === 'engine') {
      title = 'Motor / Versiyon Seçin';
      list = engines;
    } else if (activePicker === 'fuelType') {
      title = 'Yakıt Türü Seçin';
      list = fuelTypes;
    } else if (activePicker === 'transmission') {
      title = searchMode === 'MOTORCYCLE' ? 'Motor Hacmi Seçin' : 'Şanzıman Tipi Seçin';
      list = transmissions;
    } else if (activePicker === 'trim') {
      title = searchMode === 'MOTORCYCLE' ? 'Vites Tipi Seçin' : 'Donanım Paketi Seçin';
      list = trims;
    } else if (activePicker === 'city') {
      title = 'Şehir Seçin (81 İl)';
      list = TURKISH_CITIES.map((c) => ({ label: c, value: c }));
    } else if (activePicker === 'district') {
      title = city ? `${city} İlçeleri` : 'İlçe Seçin';
      const districts = getDistrictsForCity(city);
      list = districts.map((d) => ({ label: d, value: d }));
    }

    if (pickerSearch.trim()) {
      const q = pickerSearch.trim().toLocaleLowerCase('tr-TR');
      list = list.filter((item) => item.label.toLocaleLowerCase('tr-TR').includes(q));
    }

    return { title, list };
  }, [
    activePicker,
    pickerSearch,
    brands,
    models,
    years,
    bodyTypes,
    engines,
    fuelTypes,
    transmissions,
    trims,
    selectedBrand,
    city,
    searchMode,
  ]);

  const handleSelectPickerOption = (val: string) => {
    const currentPicker = activePicker;
    setActivePicker(null);
    setPickerSearch('');

    if (currentPicker === 'brand') {
      handleBrandChange(val);
    } else if (currentPicker === 'model') {
      handleModelChange(val);
    } else if (currentPicker === 'year') {
      handleYearChange(val);
    } else if (currentPicker === 'bodyType') {
      handleBodyTypeChange(val);
    } else if (currentPicker === 'engine') {
      handleEngineChange(val);
    } else if (currentPicker === 'fuelType') {
      handleFuelTypeChange(val);
    } else if (currentPicker === 'transmission') {
      handleTransmissionChange(val);
    } else if (currentPicker === 'trim') {
      handleTrimChange(val);
    } else if (currentPicker === 'city') {
      setCity(val);
      setDistrict('');
    } else if (currentPicker === 'district') {
      setDistrict(val);
    }
  };

  const is8CriteriaComplete =
    !!selectedBrand &&
    !!selectedModel &&
    !!selectedYear &&
    !!selectedBodyType &&
    !!selectedEngine &&
    !!selectedFuelType &&
    !!selectedTransmission &&
    !!selectedTrim;

  const currentStepInfo = WIZARD_STEPS.find((s) => s.step === step) || WIZARD_STEPS[0];
  const displayBrandName = useCustomVariant ? customBrand : selectedBrand;
  const displayModelName = useCustomVariant ? customModel : selectedModel;

  const handleStepOrPageBack = () => {
    if (activePicker !== null) {
      Keyboard.dismiss();
      setActivePicker(null);
      setPickerSearch('');
      return;
    }
    if (step > 1) {
      goToStep(step - 1);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const handleStepOrPageBackRef = useRef(handleStepOrPageBack);
  handleStepOrPageBackRef.current = handleStepOrPageBack;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleStepOrPageBackRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const screenSwipeHandlers = useMemo(
    () => createEdgeSwipeDismissHandlers(() => handleStepOrPageBackRef.current()),
    []
  );

  const pickerSwipeHandlers = useMemo(
    () =>
      createEdgeSwipeDismissHandlers(() => {
        Keyboard.dismiss();
        setActivePicker(null);
        setPickerSearch('');
      }),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']} {...screenSwipeHandlers}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* TOP NAVBAR */}
        <View style={styles.navbar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (step > 1) {
                goToStep(step - 1);
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
            <Text style={styles.backBtnText}>{step > 1 ? 'Önceki' : 'Çıkış'}</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={styles.navTitle}>Yeni İlan Oluştur</Text>
            <Text style={styles.navStepSubtitle}>
              Adım {step}/6 • {currentStepInfo.title}
            </Text>
          </View>

          <View style={styles.stepPillBadge}>
            <Text style={styles.stepPillBadgeText}>{step}/6</Text>
          </View>
        </View>

        {/* 6-STEP PROGRESS HEADER BAR (MATCHING WEB) */}
        <View style={styles.wizardHeaderContainer}>
          <View style={styles.wizardTrackRow}>
            {WIZARD_STEPS.map((item) => {
              const isCompleted = item.step < step;
              const isCurrent = item.step === step;
              return (
                <TouchableOpacity
                  key={item.step}
                  style={styles.wizardStepCol}
                  activeOpacity={item.step < step ? 0.7 : 1}
                  onPress={() => {
                    if (item.step < step) {
                      goToStep(item.step);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.wizardBarSegment,
                      isCompleted && styles.wizardBarSegmentCompleted,
                      isCurrent && styles.wizardBarSegmentCurrent,
                    ]}
                  />
                  <Text
                    style={[
                      styles.wizardStepLabel,
                      isCompleted && styles.wizardStepLabelCompleted,
                      isCurrent && styles.wizardStepLabelCurrent,
                    ]}
                    numberOfLines={1}
                  >
                    {item.step}. {item.shortLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView
          ref={mainScrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* =================================================================== */}
          {/* STEP 1: ARAÇ SEÇİMİ (VASITA TÜRÜ + 8 KRİTER + MARKA LOGOLARI)       */}
          {/* =================================================================== */}
          {step === 1 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.stepIconCircle}>
                  <Ionicons name="car-sport" size={20} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Adım 1: Araç Seçimi</Text>
                  <Text style={styles.cardSubDesc}>
                    Aracınızın fabrika teknik verilerine ve AI analizine bağlanması için vasıta türünü ve aracınızı seçin.
                  </Text>
                </View>
              </View>

              {/* VEHICLE CATEGORY TABS (Otomobil, SUV & Pickup, Motosiklet, Minivan & Panelvan) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vasıta Kategorisi</Text>
                <View style={styles.categoryGrid}>
                  {VEHICLE_CATEGORIES.map((cat) => {
                    const isActive = searchMode === cat.key && !useCustomVariant;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[
                          styles.categoryTabBtn,
                          isActive && styles.categoryTabBtnActive,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => {
                          setUseCustomVariant(false);
                          handleCategorySwitch(cat.key);
                        }}
                      >
                        <MaterialCommunityIcons
                          name={cat.icon}
                          size={19}
                          color={isActive ? '#ffffff' : '#64748b'}
                        />
                        <Text
                          style={[
                            styles.categoryTabText,
                            isActive && styles.categoryTabTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Custom Details Fallback Checkbox */}
              <TouchableOpacity
                style={styles.customToggleBox}
                activeOpacity={0.8}
                onPress={() => {
                  setUseCustomVariant(!useCustomVariant);
                  if (!useCustomVariant) {
                    setSelectedVariantId('');
                    setMatchedVariantDetail(null);
                  }
                }}
              >
                <Ionicons
                  name={useCustomVariant ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={useCustomVariant ? '#ea580c' : '#94a3b8'}
                />
                <Text style={styles.customToggleText}>
                  Aracımı listede bulamadım (Manuel marka/model gireceğim)
                </Text>
              </TouchableOpacity>

              {!useCustomVariant ? (
                <View style={{ gap: 12 }}>
                  {/* 1. Marka (WITH BRAND LOGO!) */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>1. Marka *</Text>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        !!selectedBrand && styles.selectorBtnSelectedBrand,
                      ]}
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('brand');
                      }}
                    >
                      <View style={styles.selectorLeftRow}>
                        {selectedBrand ? (
                          <BrandLogo
                            brandName={selectedBrand}
                            vehicleType={searchMode === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR'}
                            size={32}
                          />
                        ) : (
                          <View style={styles.placeholderIconBox}>
                            <Ionicons name="shield-outline" size={16} color="#94a3b8" />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.selectorBtnText,
                            !!selectedBrand && styles.selectorSelectedText,
                          ]}
                        >
                          {loadingBrands ? 'Markalar Yükleniyor...' : selectedBrand || 'Marka Seçiniz...'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {/* 2. Model */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>2. Model Ailesi *</Text>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        (!selectedBrand || loadingModels) && { opacity: 0.5 },
                      ]}
                      disabled={!selectedBrand || loadingModels}
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('model');
                      }}
                    >
                      <Text
                        style={[
                          styles.selectorBtnText,
                          !!selectedModel && styles.selectorSelectedText,
                        ]}
                      >
                        {loadingModels ? 'Yükleniyor...' : selectedModel || 'Model Seçiniz...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* 3. Model Yılı */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>3. Model Yılı *</Text>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        (!selectedModel || loadingYears || years.length === 0) && { opacity: 0.5 },
                      ]}
                      disabled={!selectedModel || loadingYears || years.length === 0}
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('year');
                      }}
                    >
                      <Text
                        style={[
                          styles.selectorBtnText,
                          !!selectedYear && styles.selectorSelectedText,
                        ]}
                      >
                        {loadingYears ? 'Yükleniyor...' : selectedYear || 'Yıl Seçiniz...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* 4. Kasa Tipi */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      4. {searchMode === 'MOTORCYCLE' ? 'Tip / Kasa Tipi *' : 'Kasa Tipi *'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        (!selectedYear || loadingBodyTypes || bodyTypes.length === 0) && {
                          opacity: 0.5,
                        },
                      ]}
                      disabled={!selectedYear || loadingBodyTypes || bodyTypes.length === 0}
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('bodyType');
                      }}
                    >
                      <Text
                        style={[
                          styles.selectorBtnText,
                          !!selectedBodyType && styles.selectorSelectedText,
                        ]}
                      >
                        {loadingBodyTypes
                          ? 'Yükleniyor...'
                          : BODY_TYPE_LABELS[selectedBodyType] ||
                            selectedBodyType ||
                            'Kasa Tipi Seçiniz...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* 5. Motor / Versiyon */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>5. Motor / Versiyon *</Text>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        (!selectedBodyType || loadingEngines || engines.length === 0) && {
                          opacity: 0.5,
                        },
                      ]}
                      disabled={!selectedBodyType || loadingEngines || engines.length === 0}
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('engine');
                      }}
                    >
                      <Text
                        style={[
                          styles.selectorBtnText,
                          !!selectedEngine && styles.selectorSelectedText,
                        ]}
                        numberOfLines={1}
                      >
                        {loadingEngines ? 'Yükleniyor...' : selectedEngine || 'Motor Seçiniz...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* 6. Yakıt Türü */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      6. {searchMode === 'MOTORCYCLE' ? 'Yakıt / Güç Ünitesi *' : 'Yakıt Türü *'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        (!selectedEngine || loadingFuels || fuelTypes.length === 0) && {
                          opacity: 0.5,
                        },
                      ]}
                      disabled={!selectedEngine || loadingFuels || fuelTypes.length === 0}
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('fuelType');
                      }}
                    >
                      <Text
                        style={[
                          styles.selectorBtnText,
                          !!selectedFuelType && styles.selectorSelectedText,
                        ]}
                      >
                        {loadingFuels ? 'Yükleniyor...' : selectedFuelType || 'Yakıt Seçiniz...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* 7. Şanzıman Tipi / Motor Hacmi */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      7. {searchMode === 'MOTORCYCLE' ? 'Motor Hacmi *' : 'Şanzıman Tipi *'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        (!selectedFuelType ||
                          loadingTransmissions ||
                          transmissions.length === 0) && {
                          opacity: 0.5,
                        },
                      ]}
                      disabled={
                        !selectedFuelType || loadingTransmissions || transmissions.length === 0
                      }
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('transmission');
                      }}
                    >
                      <Text
                        style={[
                          styles.selectorBtnText,
                          !!selectedTransmission && styles.selectorSelectedText,
                        ]}
                      >
                        {loadingTransmissions
                          ? 'Yükleniyor...'
                          : selectedTransmission || 'Seçiniz...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* 8. Donanım Paketi / Vites Tipi */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      8. {searchMode === 'MOTORCYCLE' ? 'Vites Tipi *' : 'Donanım Paketi *'}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.selectorBtn,
                        (!selectedTransmission || loadingTrims || trims.length === 0) && {
                          opacity: 0.5,
                        },
                      ]}
                      disabled={!selectedTransmission || loadingTrims || trims.length === 0}
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('trim');
                      }}
                    >
                      <Text
                        style={[
                          styles.selectorBtnText,
                          !!selectedTrim && styles.selectorSelectedText,
                        ]}
                        numberOfLines={1}
                      >
                        {loadingTrims ? 'Yükleniyor...' : selectedTrim || 'Paket Seçiniz...'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  {/* RESOLUTION STATUS BANNER */}
                  {matchingVariant || loadingTechSpecs ? (
                    <View style={styles.bannerMatching}>
                      <ActivityIndicator size="small" color="#0284c7" />
                      <Text style={styles.bannerMatchingText}>
                        {matchingVariant
                          ? 'Varyant doğrulanıyor ve eşleştiriliyor...'
                          : 'Katalog motor teknik verileri (cc / HP) çekiliyor...'}
                      </Text>
                    </View>
                  ) : selectedVariantId ? (
                    <View style={styles.bannerSuccess}>
                      <BrandLogo
                        brandName={selectedBrand}
                        vehicleType={searchMode === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR'}
                        size={40}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bannerSuccessTitle}>
                          ✓ TorqueScout Katalog Eşleşmesi Doğrulandı
                        </Text>
                        <Text style={styles.bannerSuccessDesc}>
                          {selectedBrand} {selectedModel} ({selectedYear}) • {selectedTrim}
                        </Text>
                        {(enginePower || engineDisplacement) && (
                          <Text style={styles.bannerAutoFilledBadge}>
                            ⚡ Katalog Verisi:{' '}
                            {enginePower ? `${enginePower} HP` : ''}
                            {enginePower && engineDisplacement ? ' • ' : ''}
                            {engineDisplacement ? `${engineDisplacement} cc` : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : is8CriteriaComplete ? (
                    <View style={styles.bannerWarning}>
                      <Ionicons name="warning" size={20} color="#e11d48" />
                      <Text style={styles.bannerWarningText}>
                        Bu kombinasyon için net varyant eşleşmesi bulunamadı. Seçimlerinizi kontrol edebilir veya &quot;Aracımı listede bulamadım&quot; seçeneğini işaretleyebilirsiniz.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.bannerInfo}>
                      <Ionicons name="information-circle" size={18} color="#f59e0b" />
                      <Text style={styles.bannerInfoText}>
                        Devam etmek için yukarıdaki adımları sırasıyla seçiniz. Tek seçenekli filtreler otomatik doldurulur.
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                /* Custom Vehicle Entry */
                <View style={{ gap: 12 }}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Marka İsmi *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Örn: Fiat, BMW, Honda"
                      placeholderTextColor="#94a3b8"
                      value={customBrand}
                      onChangeText={setCustomBrand}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Model İsmi *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Örn: Egea, 3 Serisi"
                      placeholderTextColor="#94a3b8"
                      value={customModel}
                      onChangeText={setCustomModel}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Model Yılı *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Örn: 2021"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={selectedYear}
                      onChangeText={(t) => setSelectedYear(parseNumberInput(t))}
                      maxLength={4}
                    />
                  </View>
                </View>
              )}

              {/* STEP 1 NEXT BUTTON */}
              <TouchableOpacity
                style={[
                  styles.primaryStepBtn,
                  (matchingVariant || loadingTechSpecs) && { opacity: 0.6 },
                ]}
                onPress={handleNextFromStep1}
                disabled={matchingVariant || loadingTechSpecs}
              >
                <Text style={styles.primaryStepBtnText}>Devam Et (İlan Detayları)</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {/* =================================================================== */}
          {/* STEP 2: İLAN & TEKNİK DETAYLAR                                      */}
          {/* =================================================================== */}
          {step === 2 && (
            <View style={{ gap: 16 }}>
              {/* SELECTED VEHICLE IDENTITY SUMMARY BANNER WITH BRAND LOGO */}
              <View style={styles.selectedVehicleBanner}>
                <BrandLogo
                  brandName={displayBrandName}
                  vehicleType={searchMode === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR'}
                  size={44}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedVehicleTag}>
                    {useCustomVariant ? 'MANUEL ARAÇ GİRİŞİ' : 'SEÇİLEN DOĞRULANMIŞ ARAÇ'}
                  </Text>
                  <Text style={styles.selectedVehicleTitle} numberOfLines={1}>
                    {displayBrandName} {displayModelName} ({selectedYear})
                  </Text>
                  {!useCustomVariant && (
                    <Text style={styles.selectedVehicleSub} numberOfLines={1}>
                      {[selectedBodyType, selectedEngine, selectedFuelType, selectedTrim]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.changeVehicleMiniBtn}
                  onPress={() => goToStep(1)}
                >
                  <Text style={styles.changeVehicleMiniBtnText}>Değiştir</Text>
                </TouchableOpacity>
              </View>

              {/* BASIC DETAILS CARD */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.stepIconCircle}>
                    <Ionicons name="pricetag" size={18} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Adım 2: İlan &amp; Teknik Bilgiler</Text>
                    <Text style={styles.cardSubDesc}>
                      İlan başlığı, fiyat, kilometre, konum ve araç özelliklerini girin.
                    </Text>
                  </View>
                </View>

                {/* Başlık */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>İlan Başlığı *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Örn: Hatasız Boyasız İlk Sahibinden"
                    placeholderTextColor="#94a3b8"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Fiyat & KM */}
                <View style={styles.rowTwoCols}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Fiyat (TL) *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Örn: 1.250.000"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={formatNumberInput(priceAmount)}
                      onChangeText={(t) => setPriceAmount(parseNumberInput(t))}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Kilometre (KM) *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Örn: 85.000"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={formatNumberInput(kilometers)}
                      onChangeText={(t) => setKilometers(parseNumberInput(t))}
                    />
                  </View>
                </View>

                {/* Şehir & İlçe */}
                <View style={styles.rowTwoCols}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Şehir (81 İl) *</Text>
                    <TouchableOpacity
                      style={styles.selectorBtn}
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('city');
                      }}
                    >
                      <Text
                        style={[styles.selectorBtnText, !!city && styles.selectorSelectedText]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {city || 'Şehir Seçin'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>İlçe</Text>
                    <TouchableOpacity
                      style={[styles.selectorBtn, !city && { opacity: 0.6 }]}
                      disabled={!city}
                      onPress={() => {
                        setPickerSearch('');
                        setActivePicker('district');
                      }}
                    >
                      <Text
                        style={[styles.selectorBtnText, !!district && styles.selectorSelectedText]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {district || (city ? 'İlçe Seçin' : 'Önce İl Seçin')}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Motor Hacmi (cc) & Motor Gücü (HP) */}
                <View style={styles.rowTwoCols}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <View style={styles.labelWithBadgeRow}>
                      <Text style={styles.inputLabel}>Motor Hacmi (cc)</Text>
                      {!!selectedVariantId && !!engineDisplacement && (
                        <View style={styles.catalogBadge}>
                          <Ionicons name="checkmark" size={10} color="#16a34a" />
                          <Text style={styles.catalogBadgeText}>Katalog</Text>
                        </View>
                      )}
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Örn: 1498"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={engineDisplacement}
                      onChangeText={setEngineDisplacement}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <View style={styles.labelWithBadgeRow}>
                      <Text style={styles.inputLabel}>Motor Gücü (HP)</Text>
                      {!!selectedVariantId && !!enginePower && (
                        <View style={styles.catalogBadge}>
                          <Ionicons name="checkmark" size={10} color="#16a34a" />
                          <Text style={styles.catalogBadgeText}>Katalog</Text>
                        </View>
                      )}
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Örn: 150"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={enginePower}
                      onChangeText={setEnginePower}
                    />
                  </View>
                </View>

                {candidatePowers.length > 1 && (
                  <View style={styles.candidateHpBox}>
                    <Text style={styles.candidateHpTitle}>
                      ⚡ Fabrika Güç Seçenekleri (Ruhsatınıza göre seçin):
                    </Text>
                    <View style={styles.pillGroup}>
                      {candidatePowers.map((hp) => (
                        <TouchableOpacity
                          key={hp}
                          style={[
                            styles.pillBtn,
                            enginePower === String(hp) && styles.pillBtnActive,
                          ]}
                          onPress={() => setEnginePower(String(hp))}
                        >
                          <Text
                            style={[
                              styles.pillBtnText,
                              enginePower === String(hp) && styles.pillBtnTextActive,
                            ]}
                          >
                            {hp} HP
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Çekiş Tipi */}
                {searchMode !== 'MOTORCYCLE' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Çekiş Tipi</Text>
                    <View style={styles.pillGroup}>
                      {DRIVETRAINS.map((dt) => (
                        <TouchableOpacity
                          key={dt.val}
                          style={[styles.pillBtn, drivetrain === dt.val && styles.pillBtnActive]}
                          onPress={() => setDrivetrain(dt.val)}
                        >
                          <Text
                            style={[
                              styles.pillBtnText,
                              drivetrain === dt.val && styles.pillBtnTextActive,
                            ]}
                          >
                            {dt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Renk */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Araç Rengi *</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.colorPills}
                  >
                    {CAR_COLORS.map((c) => {
                      const isSelected = color === c.label;
                      return (
                        <TouchableOpacity
                          key={c.label}
                          style={[styles.colorPillBtn, isSelected && styles.pillBtnActive]}
                          onPress={() => setColor(c.label)}
                        >
                          <View
                            style={[
                              styles.colorDotSwatch,
                              { backgroundColor: c.hex, borderColor: c.border },
                            ]}
                          />
                          <Text
                            style={[styles.pillBtnText, isSelected && styles.pillBtnTextActive]}
                          >
                            {c.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Araç Durumu & Kimden */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Araç Durumu</Text>
                  <View style={styles.pillGroup}>
                    {VEHICLE_STATUSES.map((vs) => (
                      <TouchableOpacity
                        key={vs.val}
                        style={[
                          styles.pillBtn,
                          vehicleStatus === vs.val && styles.pillBtnActive,
                        ]}
                        onPress={() => setVehicleStatus(vs.val)}
                      >
                        <Text
                          style={[
                            styles.pillBtnText,
                            vehicleStatus === vs.val && styles.pillBtnTextActive,
                          ]}
                        >
                          {vs.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Kimden</Text>
                  <View style={styles.pillGroup}>
                    {SELLER_TYPES.map((st) => (
                      <TouchableOpacity
                        key={st.val}
                        style={[styles.pillBtn, sellerType === st.val && styles.pillBtnActive]}
                        onPress={() => setSellerType(st.val)}
                      >
                        <Text
                          style={[
                            styles.pillBtnText,
                            sellerType === st.val && styles.pillBtnTextActive,
                          ]}
                        >
                          {st.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Plaka Uyruğu</Text>
                  <View style={styles.pillGroup}>
                    {PLATE_TYPES.map((pt) => (
                      <TouchableOpacity
                        key={pt.val}
                        style={[styles.pillBtn, plateType === pt.val && styles.pillBtnActive]}
                        onPress={() => setPlateType(pt.val)}
                      >
                        <Text
                          style={[
                            styles.pillBtnText,
                            plateType === pt.val && styles.pillBtnTextActive,
                          ]}
                        >
                          {pt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Checkboxes: Garanti, Ağır Hasar, Takas */}
                <View style={{ gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={styles.customToggleBox}
                    onPress={() => setHasWarranty(!hasWarranty)}
                  >
                    <Ionicons
                      name={hasWarranty ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={hasWarranty ? '#16a34a' : '#94a3b8'}
                    />
                    <Text style={styles.customToggleText}>Garanti Kapsamında</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.customToggleBox}
                    onPress={() => setExchangeable(!exchangeable)}
                  >
                    <Ionicons
                      name={exchangeable ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={exchangeable ? '#ea580c' : '#94a3b8'}
                    />
                    <Text style={styles.customToggleText}>Takasa Uygun</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.customToggleBox,
                      heavyDamage && { borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
                    ]}
                    onPress={() => setHeavyDamage(!heavyDamage)}
                  >
                    <Ionicons
                      name={heavyDamage ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={heavyDamage ? '#e11d48' : '#94a3b8'}
                    />
                    <Text
                      style={[
                        styles.customToggleText,
                        heavyDamage && { color: '#be123c', fontWeight: '700' },
                      ]}
                    >
                      Ağır Hasar Kaydı Var
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* STEP 2 NAVIGATION */}
                <View style={styles.wizardFooterRow}>
                  <TouchableOpacity
                    style={styles.secondaryStepBtn}
                    onPress={() => goToStep(1)}
                  >
                    <Ionicons name="arrow-back" size={16} color="#334155" />
                    <Text style={styles.secondaryStepBtnText}>Geri</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryStepBtn, { flex: 2, marginTop: 0 }]}
                    onPress={handleNextFromStep2}
                  >
                    <Text style={styles.primaryStepBtnText}>Devam Et (Açıklama)</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* =================================================================== */}
          {/* STEP 3: İLAN AÇIKLAMASI                                             */}
          {/* =================================================================== */}
          {step === 3 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.stepIconCircle}>
                  <Ionicons name="document-text" size={18} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Adım 3: İlan Açıklaması</Text>
                  <Text style={styles.cardSubDesc}>
                    Aracınızın genel durumunu, donanım ekstralarını ve kullanım geçmişini alıcılar için açıklayın.
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hızlı Cümle Ekle (Dokunarak Ekleyin)</Text>
                <View style={styles.pillGroup}>
                  {QUICK_DESCRIPTION_PHRASES.map((phrase, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.quickPhrasePill}
                      onPress={() => {
                        setDescription((prev) =>
                          prev.trim() ? `${prev.trim()}\n• ${phrase}` : `• ${phrase}`
                        );
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={14} color="#ea580c" />
                      <Text style={styles.quickPhraseText}>{phrase}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Detaylı Açıklama</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { height: 150, textAlignVertical: 'top', paddingTop: 12, lineHeight: 20 },
                  ]}
                  placeholder="Aracınız hakkında alıcıların bilmesini istediğiniz tüm detayları yazabilirsiniz..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <View style={styles.wizardFooterRow}>
                <TouchableOpacity
                  style={styles.secondaryStepBtn}
                  onPress={() => goToStep(2)}
                >
                  <Ionicons name="arrow-back" size={16} color="#334155" />
                  <Text style={styles.secondaryStepBtnText}>Geri</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryStepBtn, { flex: 2, marginTop: 0 }]}
                  onPress={() => goToStep(4)}
                >
                  <Text style={styles.primaryStepBtnText}>Devam Et (Boya &amp; Tramer)</Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* =================================================================== */}
          {/* STEP 4: BOYA, DEĞİŞEN VE TRAMER BİLGİSİ                             */}
          {/* =================================================================== */}
          {step === 4 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.stepIconCircle}>
                  <Ionicons name="shield-checkmark" size={18} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Adım 4: Boya, Değişen &amp; Tramer</Text>
                  <Text style={styles.cardSubDesc}>
                    Aracınızın tramer kaydını ve kaporta ekspertiz durumunu şeffafça işaretleyin.
                  </Text>
                </View>
              </View>

              {/* Tramer Tutarı & Açıklaması */}
              <View style={styles.rowTwoCols}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Tramer Tutarı (TL)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={formatNumberInput(tramerAmount)}
                    onChangeText={(t) => setTramerAmount(parseNumberInput(t))}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Hasar Notu</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Örn: Hasarsız / Ayna değişimi"
                    placeholderTextColor="#94a3b8"
                    value={damageRecord}
                    onChangeText={setDamageRecord}
                  />
                </View>
              </View>

              {/* Boyalı ve Değişen Parçalar */}
              {searchMode !== 'MOTORCYCLE' && (
                <View style={styles.inputGroup}>
                  <View style={styles.labelWithBadgeRow}>
                    <Text style={styles.inputLabel}>Kaporta Ekspertiz Durumu</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setLocalPaintedParts([]);
                        setPaintedParts([]);
                        setChangedParts([]);
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>
                        Tümünü Orijinal Yap
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>
                    Orijinal olmayan parçaları seçin (LB: Lokal Boya, B: Boyalı, D: Değişen).
                  </Text>

                  <View style={styles.partList}>
                    {CAR_BODY_PARTS.map((part) => {
                      const isLocal = localPaintedParts.includes(part.key);
                      const isPainted = paintedParts.includes(part.key);
                      const isChanged = changedParts.includes(part.key);
                      const isOriginal = !isLocal && !isPainted && !isChanged;

                      return (
                        <View key={part.key} style={styles.partRow}>
                          <Text style={styles.partName}>{part.label}</Text>
                          <View style={styles.partActions}>
                            <TouchableOpacity
                              style={[styles.partBadge, isOriginal && styles.partBadgeOriginal]}
                              onPress={() => setPartCondition(part.key, 'original')}
                            >
                              <Text
                                style={[
                                  styles.partBadgeText,
                                  isOriginal && styles.partBadgeTextActive,
                                ]}
                              >
                                Orijinal
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.partBadge, isLocal && styles.partBadgeLocal]}
                              onPress={() => setPartCondition(part.key, 'local')}
                            >
                              <Text
                                style={[
                                  styles.partBadgeText,
                                  isLocal && styles.partBadgeTextActive,
                                ]}
                              >
                                Lokal
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.partBadge, isPainted && styles.partBadgePainted]}
                              onPress={() => setPartCondition(part.key, 'painted')}
                            >
                              <Text
                                style={[
                                  styles.partBadgeText,
                                  isPainted && styles.partBadgeTextActive,
                                ]}
                              >
                                Boyalı
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.partBadge, isChanged && styles.partBadgeChanged]}
                              onPress={() => setPartCondition(part.key, 'changed')}
                            >
                              <Text
                                style={[
                                  styles.partBadgeText,
                                  isChanged && styles.partBadgeTextActive,
                                ]}
                              >
                                Değişen
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Bakım Geçmişi */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bakım Geçmişi &amp; Ekspertiz Notları</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { height: 80, textAlignVertical: 'top', paddingTop: 10 },
                  ]}
                  placeholder="Son yağ bakımı, triger değişimi, lastik durumu vb. notlar..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  value={maintenanceHistory}
                  onChangeText={setMaintenanceHistory}
                />
              </View>

              <View style={styles.wizardFooterRow}>
                <TouchableOpacity
                  style={styles.secondaryStepBtn}
                  onPress={() => goToStep(3)}
                >
                  <Ionicons name="arrow-back" size={16} color="#334155" />
                  <Text style={styles.secondaryStepBtnText}>Geri</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryStepBtn, { flex: 2, marginTop: 0 }]}
                  onPress={() => goToStep(5)}
                >
                  <Text style={styles.primaryStepBtnText}>Devam Et (Fotoğraflar)</Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* =================================================================== */}
          {/* STEP 5: ARAÇ FOTOĞRAFLARI                                           */}
          {/* =================================================================== */}
          {step === 5 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.stepIconCircle}>
                  <Ionicons name="images" size={18} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Adım 5: Araç Fotoğrafları</Text>
                  <Text style={styles.cardSubDesc}>
                    İlanınız için galerinizden en fazla 10 fotoğraf seçebilirsiniz ({selectedImages.length}/10).
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.uploadArea} onPress={pickImagesFromGallery}>
                <Ionicons name="cloud-upload-outline" size={36} color="#ea580c" />
                <Text style={styles.uploadTitle}>Galeriden Fotoğraf Seç</Text>
                <Text style={styles.uploadSub}>
                  Birden fazla fotoğraf seçerek ilan vitrininizi güçlendirin.
                </Text>
              </TouchableOpacity>

              {selectedImages.length > 0 && (
                <View style={styles.thumbGrid}>
                  {selectedImages.map((uri, idx) => (
                    <View key={idx} style={styles.thumbWrap}>
                      <Image source={{ uri }} style={styles.thumbImg} />
                      {idx === 0 && (
                        <View style={styles.coverPhotoBadge}>
                          <Text style={styles.coverPhotoBadgeText}>Kapak</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeImgBtn}
                        onPress={() => removeImage(idx)}
                      >
                        <Ionicons name="close" size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.wizardFooterRow}>
                <TouchableOpacity
                  style={styles.secondaryStepBtn}
                  onPress={() => goToStep(4)}
                >
                  <Ionicons name="arrow-back" size={16} color="#334155" />
                  <Text style={styles.secondaryStepBtnText}>Geri</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryStepBtn, { flex: 2, marginTop: 0 }]}
                  onPress={() => goToStep(6)}
                >
                  <Text style={styles.primaryStepBtnText}>Devam Et (Özet &amp; Yayınla)</Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* =================================================================== */}
          {/* STEP 6: PROMOSYON PAKETİ, ÖZET & YAYINLA                            */}
          {/* =================================================================== */}
          {step === 6 && (
            <View style={{ gap: 16 }}>
              {/* QUOTA INFO CARD */}
              {quota && (
                <View
                  style={{
                    backgroundColor: '#f8fafc',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    borderRadius: 16,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                      Mevcut Paketiniz:{' '}
                      <Text style={{ color: '#ea580c', fontWeight: '900' }}>
                        {quota.tier === 'UNLIMITED_DEALER'
                          ? 'Sınırsız Kurumsal (Galeri)'
                          : quota.tier === 'DEALER'
                          ? 'Kurumsal (Galeri)'
                          : quota.tier === 'PRO'
                          ? 'Bireysel Pro'
                          : quota.tier === 'BASIC'
                          ? 'Bireysel Başlangıç'
                          : 'Ücretsiz Bireysel'}
                      </Text>
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 4 }}>
                      Aktif İlan Kullanımınız:{' '}
                      <Text style={{ color: '#0f172a', fontWeight: '900' }}>
                        {quota.activeCount} / {quota.limit >= 999999 ? 'Sınırsız' : quota.limit}
                      </Text>
                    </Text>
                  </View>

                  {quota.remaining <= 0 && quota.limit < 999999 && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#ea580c',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                      }}
                      onPress={() => router.push('/(tabs)/packages' as any)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>
                        Paket Yükselt
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* FINAL SUMMARY CARD WITH BRAND LOGO */}
              <View style={styles.summaryReviewCard}>
                <View style={styles.summaryReviewHeader}>
                  <BrandLogo
                    brandName={displayBrandName}
                    vehicleType={searchMode === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR'}
                    size={46}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryReviewTag}>İLAN ÖZETİ</Text>
                    <Text style={styles.summaryReviewTitle} numberOfLines={2}>
                      {title || `${displayBrandName} ${displayModelName} (${selectedYear})`}
                    </Text>
                    <Text style={styles.summaryReviewSub}>
                      {displayBrandName} {displayModelName} • {selectedYear} •{' '}
                      {formatNumberInput(kilometers)} km • {city}
                      {district ? ` / ${district}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryPriceStrip}>
                  <Text style={styles.summaryPriceLabel}>Satış Fiyatı</Text>
                  <Text style={styles.summaryPriceValue}>
                    {formatNumberInput(priceAmount)} TL
                  </Text>
                </View>
              </View>

              {/* PROMOTION PACKAGE SELECTION */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.stepIconCircle}>
                    <Ionicons name="rocket" size={18} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Adım 6: İlanı Öne Çıkar &amp; Yayınla</Text>
                    <Text style={styles.cardSubDesc}>
                      İlanınızı öne çıkararak binlerce potansiyel alıcıya çok daha hızlı ulaşın.
                    </Text>
                  </View>
                </View>

                <View style={styles.promoOptionsContainer}>
                  {/* 1. Standart Paket (Ücretsiz) */}
                  <TouchableOpacity
                    style={[
                      styles.promoOptionCard,
                      selectedPromotionSku === null && styles.promoOptionCardActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedPromotionSku(null)}
                  >
                    <View style={styles.promoOptionHeader}>
                      <View style={styles.promoOptionIconWrap}>
                        <Ionicons name="car-outline" size={18} color="#64748b" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.promoOptionTitle}>Standart İlan</Text>
                        <Text style={styles.promoOptionDesc}>Standart liste sıralaması</Text>
                      </View>
                      <View style={styles.promoOptionRadio}>
                        <Ionicons
                          name={
                            selectedPromotionSku === null ? 'radio-button-on' : 'radio-button-off'
                          }
                          size={20}
                          color={selectedPromotionSku === null ? '#ea580c' : '#cbd5e1'}
                        />
                      </View>
                    </View>
                    <View style={styles.promoOptionFooter}>
                      <Text style={styles.promoOptionFeatureNote}>✓ Standart Liste Gösterimi</Text>
                      <Text style={styles.promoOptionPriceFree}>Ücretsiz</Text>
                    </View>
                  </TouchableOpacity>

                  {/* 2. Acil İlan (99 TL) */}
                  <TouchableOpacity
                    style={[
                      styles.promoOptionCard,
                      selectedPromotionSku === 'URGENT_LISTING' &&
                        styles.promoOptionCardActiveUrgent,
                    ]}
                    activeOpacity={0.85}
                    onPress={() =>
                      setSelectedPromotionSku(
                        selectedPromotionSku === 'URGENT_LISTING' ? null : 'URGENT_LISTING'
                      )
                    }
                  >
                    <View style={styles.promoOptionHeader}>
                      <UrgentBadge size="medium" animated={false} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.promoOptionTitle}>Acil İlan</Text>
                        <Text style={styles.promoOptionDesc}>
                          Kırmızı ACİL rozeti &amp; Acil listesi
                        </Text>
                      </View>
                      <View style={styles.promoOptionRadio}>
                        <Ionicons
                          name={
                            selectedPromotionSku === 'URGENT_LISTING'
                              ? 'radio-button-on'
                              : 'radio-button-off'
                          }
                          size={20}
                          color={selectedPromotionSku === 'URGENT_LISTING' ? '#dc2626' : '#cbd5e1'}
                        />
                      </View>
                    </View>
                    <View style={styles.promoOptionFooter}>
                      <Text style={styles.promoOptionFeatureNote}>
                        ✓ Acil İlanlar Sekmesinde Gösterim
                      </Text>
                      <Text style={styles.promoOptionPriceUrgent}>99 ₺</Text>
                    </View>
                  </TouchableOpacity>

                  {/* 3. Vitrin + Akış (199 TL) */}
                  <TouchableOpacity
                    style={[
                      styles.promoOptionCard,
                      selectedPromotionSku === 'SHOWCASE_FEED' &&
                        styles.promoOptionCardActiveVitrin,
                    ]}
                    activeOpacity={0.85}
                    onPress={() =>
                      setSelectedPromotionSku(
                        selectedPromotionSku === 'SHOWCASE_FEED' ? null : 'SHOWCASE_FEED'
                      )
                    }
                  >
                    <View style={styles.promoOptionHeader}>
                      <ShowcaseBadge size="medium" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.promoOptionTitle}>Vitrin + Akış</Text>
                        <Text style={styles.promoOptionDesc}>
                          Ana Sayfa Vitrin ve İlan Akışı
                        </Text>
                      </View>
                      <View style={styles.promoOptionRadio}>
                        <Ionicons
                          name={
                            selectedPromotionSku === 'SHOWCASE_FEED'
                              ? 'radio-button-on'
                              : 'radio-button-off'
                          }
                          size={20}
                          color={selectedPromotionSku === 'SHOWCASE_FEED' ? '#f59e0b' : '#cbd5e1'}
                        />
                      </View>
                    </View>
                    <View style={styles.promoOptionFooter}>
                      <Text style={styles.promoOptionFeatureNote}>
                        ✓ Maksimum Ana Sayfa Görünürlüğü
                      </Text>
                      <Text style={styles.promoOptionPriceVitrin}>199 ₺</Text>
                    </View>
                  </TouchableOpacity>

                  {/* 4. Hızlı Satış Paketi (Kombo 249 TL) */}
                  <TouchableOpacity
                    style={[
                      styles.promoOptionCard,
                      selectedPromotionSku === 'URGENT_SHOWCASE_BUNDLE' &&
                        styles.promoOptionCardActiveBundle,
                    ]}
                    activeOpacity={0.85}
                    onPress={() =>
                      setSelectedPromotionSku(
                        selectedPromotionSku === 'URGENT_SHOWCASE_BUNDLE'
                          ? null
                          : 'URGENT_SHOWCASE_BUNDLE'
                      )
                    }
                  >
                    <View style={styles.promoRibbon}>
                      <Text style={styles.promoRibbonText}>🔥 EN AVANTAJLI PAKET</Text>
                    </View>

                    <View style={styles.promoOptionHeader}>
                      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                        <UrgentBadge size="small" animated={false} />
                        <ShowcaseBadge size="small" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.promoOptionTitle}>Hızlı Satış Paketi</Text>
                        <Text style={styles.promoOptionDesc}>
                          Acil İlan + Vitrin + İlan Akışı Kombo
                        </Text>
                      </View>
                      <View style={styles.promoOptionRadio}>
                        <Ionicons
                          name={
                            selectedPromotionSku === 'URGENT_SHOWCASE_BUNDLE'
                              ? 'radio-button-on'
                              : 'radio-button-off'
                          }
                          size={20}
                          color={
                            selectedPromotionSku === 'URGENT_SHOWCASE_BUNDLE'
                              ? '#ea580c'
                              : '#cbd5e1'
                          }
                        />
                      </View>
                    </View>
                    <View style={styles.promoOptionFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.promoStrikethroughPrice}>298 ₺</Text>
                        <Text style={styles.promoOptionSavingsBadge}>%16 İndirim</Text>
                      </View>
                      <Text style={styles.promoOptionPriceBundle}>249 ₺</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Promotion Terms Checkbox */}
                {selectedPromotionSku !== null && (
                  <TouchableOpacity
                    style={styles.promoTermsBox}
                    activeOpacity={0.8}
                    onPress={() => setPromotionTermsAccepted(!promotionTermsAccepted)}
                  >
                    <Ionicons
                      name={promotionTermsAccepted ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={promotionTermsAccepted ? '#ea580c' : '#94a3b8'}
                    />
                    <Text style={styles.promoTermsText}>
                      Seçtiğim ilan promosyonunun abonelik paketimden bağımsız,{' '}
                      <Text style={{ fontWeight: '700', color: '#0f172a' }}>
                        tek seferlik ek bir hizmet
                      </Text>{' '}
                      olduğunu ve ilanın aktif yayın süresi boyunca geçerli olduğunu kabul ediyorum.
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Responsibility Checkbox */}
                <TouchableOpacity
                  style={styles.promoTermsBox}
                  activeOpacity={0.8}
                  onPress={() => setResponsibilityAccepted(!responsibilityAccepted)}
                >
                  <Ionicons
                    name={responsibilityAccepted ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={responsibilityAccepted ? '#16a34a' : '#94a3b8'}
                  />
                  <Text style={styles.promoTermsText}>
                    İlan verdiğim aracın ruhsat sahibi/yetkili satıcısı olduğumu ve doğru bilgi verdiğimi beyan ederim.
                  </Text>
                </TouchableOpacity>

                {/* FINAL SUBMIT & BACK BUTTONS */}
                <View style={styles.wizardFooterRow}>
                  <TouchableOpacity
                    style={styles.secondaryStepBtn}
                    onPress={() => goToStep(5)}
                    disabled={submitting}
                  >
                    <Ionicons name="arrow-back" size={16} color="#334155" />
                    <Text style={styles.secondaryStepBtnText}>Geri</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      { flex: 2 },
                      submitting && { opacity: 0.7 },
                    ]}
                    disabled={submitting}
                    onPress={handleSubmit}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                        <Text style={styles.submitBtnText}>İlanı Yayınla</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* INTERACTIVE UNIFIED MODAL PICKER WITH INSTANT SEARCH & BRAND LOGOS */}
        <Modal
          visible={activePicker !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            Keyboard.dismiss();
            setActivePicker(null);
            setPickerSearch('');
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalBackdrop}
            {...pickerSwipeHandlers}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                Keyboard.dismiss();
                setActivePicker(null);
                setPickerSearch('');
              }}
            />
            <View style={styles.modalSheet}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  {activePicker !== 'brand' &&
                    activePicker !== 'city' &&
                    activePicker !== 'district' &&
                    !!selectedBrand && (
                      <BrandLogo
                        brandName={selectedBrand}
                        vehicleType={searchMode === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR'}
                        size={30}
                      />
                    )}
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {pickerData.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    Keyboard.dismiss();
                    setActivePicker(null);
                    setPickerSearch('');
                  }}
                >
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.modalSearchBox}>
                <Ionicons name="search" size={16} color="#94a3b8" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder={`${pickerData.title} içinde ara...`}
                  placeholderTextColor="#94a3b8"
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  autoCorrect={false}
                />
                {pickerSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPickerSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Option List */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {pickerData.list.length > 0 ? (
                  pickerData.list.map((item) => {
                    const isSelected =
                      (activePicker === 'brand' && selectedBrand === item.value) ||
                      (activePicker === 'model' && selectedModel === item.value) ||
                      (activePicker === 'year' && selectedYear === item.value) ||
                      (activePicker === 'bodyType' && selectedBodyType === item.value) ||
                      (activePicker === 'engine' && selectedEngine === item.value) ||
                      (activePicker === 'fuelType' && selectedFuelType === item.value) ||
                      (activePicker === 'transmission' && selectedTransmission === item.value) ||
                      (activePicker === 'trim' && selectedTrim === item.value) ||
                      (activePicker === 'city' && city === item.value) ||
                      (activePicker === 'district' && district === item.value);

                    return (
                      <TouchableOpacity
                        key={item.value}
                        style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                        onPress={() => handleSelectPickerOption(item.value)}
                      >
                        <View style={styles.pickerOptionLeft}>
                          {activePicker === 'brand' && (
                            <BrandLogo
                              brandName={item.label}
                              vehicleType={searchMode === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR'}
                              size={34}
                            />
                          )}
                          <Text
                            style={[
                              styles.pickerOptionText,
                              isSelected && styles.pickerOptionTextActive,
                            ]}
                            numberOfLines={2}
                          >
                            {item.label}
                          </Text>
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={20} color="#ea580c" />
                        ) : (
                          <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#94a3b8' }}>Sonuç bulunamadı.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 68,
  },
  backBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  navTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  navStepSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
    marginTop: 1,
  },
  stepPillBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 46,
    alignItems: 'center',
  },
  stepPillBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  wizardHeaderContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  wizardTrackRow: {
    flexDirection: 'row',
    gap: 6,
  },
  wizardStepCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  wizardBarSegment: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
  },
  wizardBarSegmentCompleted: {
    backgroundColor: '#fb923c',
  },
  wizardBarSegmentCurrent: {
    backgroundColor: '#ea580c',
  },
  wizardStepLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94a3b8',
  },
  wizardStepLabelCompleted: {
    color: '#475569',
    fontWeight: '700',
  },
  wizardStepLabelCurrent: {
    color: '#ea580c',
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  stepIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubDesc: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTabBtn: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryTabBtnActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  categoryTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  brandLogoBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monogramBadgeBox: {
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monogramBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  placeholderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  helperText: {
    fontSize: 11.5,
    color: '#64748b',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  selectorBtnSelectedBrand: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  selectorLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectorBtnText: {
    fontSize: 13.5,
    color: '#94a3b8',
    flex: 1,
  },
  selectorSelectedText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorPills: {
    gap: 8,
    paddingVertical: 2,
  },
  colorPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colorDotSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  pillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillBtnActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  pillBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  pillBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  candidateHpBox: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  candidateHpTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#c2410c',
  },
  bannerMatching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 12,
    borderRadius: 12,
  },
  bannerMatchingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
    flex: 1,
  },
  bannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 12,
  },
  bannerSuccessTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#16a34a',
  },
  bannerSuccessDesc: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
    marginTop: 2,
  },
  bannerAutoFilledBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    marginTop: 4,
  },
  bannerWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: 12,
    borderRadius: 12,
  },
  bannerWarningText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#be123c',
    flex: 1,
    lineHeight: 16,
  },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    borderRadius: 12,
  },
  bannerInfoText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#b45309',
    flex: 1,
    lineHeight: 16,
  },
  selectedVehicleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 16,
    padding: 14,
  },
  selectedVehicleTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.4,
  },
  selectedVehicleTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  selectedVehicleSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  changeVehicleMiniBtn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeVehicleMiniBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  quickPhrasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  quickPhraseText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#9a3412',
  },
  partList: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 8,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  partName: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  partActions: {
    flexDirection: 'row',
    gap: 4,
  },
  partBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  partBadgeOriginal: {
    backgroundColor: '#16a34a',
  },
  partBadgeLocal: {
    backgroundColor: '#eab308',
  },
  partBadgePainted: {
    backgroundColor: '#f97316',
  },
  partBadgeChanged: {
    backgroundColor: '#ef4444',
  },
  partBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
  },
  partBadgeTextActive: {
    color: '#ffffff',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#fdba74',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 26,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
  },
  uploadTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  uploadSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  thumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  coverPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#ea580c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverPhotoBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  removeImgBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryReviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    padding: 16,
    gap: 12,
  },
  summaryReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryReviewTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.4,
  },
  summaryReviewTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  summaryReviewSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  summaryPriceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  summaryPriceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9a3412',
  },
  summaryPriceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ea580c',
  },
  promoOptionsContainer: {
    gap: 12,
  },
  promoOptionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  promoOptionCardActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  promoOptionCardActiveUrgent: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  promoOptionCardActiveVitrin: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  promoOptionCardActiveBundle: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
    borderWidth: 2,
  },
  promoRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
  },
  promoRibbonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  promoOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoOptionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  promoOptionDesc: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  promoOptionRadio: {
    paddingLeft: 4,
  },
  promoOptionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
  },
  promoOptionFeatureNote: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  promoOptionPriceFree: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16a34a',
  },
  promoOptionPriceUrgent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
  },
  promoOptionPriceVitrin: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b45309',
  },
  promoOptionPriceBundle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ea580c',
  },
  promoStrikethroughPrice: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  promoOptionSavingsBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  promoTermsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 2,
  },
  promoTermsText: {
    fontSize: 11.5,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  wizardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  primaryStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 4,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryStepBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryStepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  secondaryStepBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '72%',
    maxHeight: '86%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    padding: 0,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerOptionActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  pickerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
  },
  pickerOptionTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  catalogBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  catalogBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#15803d',
  },
});
