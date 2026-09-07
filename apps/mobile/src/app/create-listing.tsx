import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('ImagePicker could not be loaded:', e);
}

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const formatNumberInput = (val: string | number): string => {
  if (val === '' || val === undefined || val === null) return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return parseInt(numStr, 10).toLocaleString('tr-TR');
};

const parseNumberInput = (val: string): string => {
  return val.replace(/\D/g, '');
};

const TURKISH_CITIES = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Bursa',
  'Antalya',
  'Adana',
  'Konya',
  'Gaziantep',
  'Kayseri',
  'Kocaeli',
  'Samsun',
  'Mersin',
  'Eskişehir',
  'Trabzon',
  'Diyarbakır',
  'Muğla',
  'Denizli',
  'Sakarya',
  'Tekirdağ',
  'Balıkesir',
  'Manisa',
  'Aydın',
  'Hatay',
];

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

const FUEL_TYPES = [
  { label: 'Benzin', val: 'PETROL' },
  { label: 'Dizel', val: 'DIESEL' },
  { label: 'Benzin & LPG', val: 'LPG' },
  { label: 'Hibrit', val: 'HYBRID' },
  { label: 'Elektrik', val: 'ELECTRIC' },
];

const TRANSMISSIONS = [
  { label: 'Otomatik', val: 'AUTOMATIC' },
  { label: 'Manuel', val: 'MANUAL' },
  { label: 'Yarı Otomatik', val: 'SEMI_AUTOMATIC' },
];

const BODY_TYPES = [
  { label: 'Sedan', val: 'SEDAN' },
  { label: 'Hatchback', val: 'HATCHBACK' },
  { label: 'SUV', val: 'SUV' },
  { label: 'Coupe', val: 'COUPE' },
  { label: 'Station Wagon', val: 'STATION_WAGON' },
  { label: 'Cabrio', val: 'CABRIO' },
];

const inferDrivetrain = (brand?: string, model?: string, engine?: string, trim?: string): 'FWD' | 'RWD' | 'AWD' => {
  const fullContext = `${brand || ''} ${model || ''} ${engine || ''} ${trim || ''}`.toLowerCase();

  // 1. Explicit AWD / 4WD
  if (/xdrive|4matic|quattro|4motion|allgrip|awd|4x4|4wd|4-motion|e-four|syncro|symmetrical/i.test(fullContext)) {
    return 'AWD';
  }

  const brandNorm = (brand || '').toLowerCase().trim();
  const modelNorm = (model || '').toLowerCase().trim();

  // 2. BMW Architecture
  if (brandNorm === 'bmw') {
    const isFwdBmw = /1 serisi|active tourer|gran tourer|gran coupe/i.test(modelNorm);
    if (isFwdBmw) return 'FWD';
    return 'RWD';
  }

  // 3. Mercedes-Benz Architecture
  if (brandNorm.includes('mercedes')) {
    const isFwdBenz = /a serisi|b serisi|cla|gla|glb/i.test(modelNorm);
    if (isFwdBenz) return 'FWD';
    return 'RWD';
  }

  // 4. Alfa Romeo
  if (brandNorm.includes('alfa') && /giulia|4c/i.test(modelNorm)) {
    return 'RWD';
  }

  // 5. Ford Mustang
  if (brandNorm === 'ford' && /mustang/i.test(modelNorm)) {
    return 'RWD';
  }

  // 6. Porsche
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

const CAR_COLORS = [
  'Beyaz',
  'Siyah',
  'Gri',
  'Gümüş',
  'Kırmızı',
  'Mavi',
  'Sarı',
  'Yeşil',
  'Kahverengi',
  'Lacivert',
];

const CAR_BODY_PARTS = [
  { key: 'FRONT_BUMPER', label: 'Ön Tampon' },
  { key: 'REAR_BUMPER', label: 'Arka Tampon' },
  { key: 'HOOD', label: 'Motor Kaputu' },
  { key: 'ROOF', label: 'Tavan' },
  { key: 'TRUNK', label: 'Bagaj Kapağı' },
  { key: 'LEFT_FRONT_FENDER', label: 'Sol Ön Çamurluk' },
  { key: 'RIGHT_FRONT_FENDER', label: 'Sağ Ön Çamurluk' },
  { key: 'LEFT_FRONT_DOOR', label: 'Sol Ön Kapı' },
  { key: 'RIGHT_FRONT_DOOR', label: 'Sağ Ön Kapı' },
  { key: 'LEFT_REAR_DOOR', label: 'Sol Arka Kapı' },
  { key: 'RIGHT_REAR_DOOR', label: 'Sağ Arka Kapı' },
  { key: 'LEFT_REAR_FENDER', label: 'Sol Arka Çamurluk' },
  { key: 'RIGHT_REAR_FENDER', label: 'Sağ Arka Çamurluk' },
];

interface TaxonomyOption {
  label: string;
  value: string;
}

export default function CreateListingScreen() {
  const router = useRouter();

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
  const [paintedParts, setPaintedParts] = useState<string[]>([]);
  const [changedParts, setChangedParts] = useState<string[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState('');

  // Extended Details
  const [vehicleStatus, setVehicleStatus] = useState('USED');
  const [sellerType, setSellerType] = useState('OWNER');
  const [hasWarranty, setHasWarranty] = useState(false);
  const [heavyDamage, setHeavyDamage] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  // Promotional Package Sku
  const [selectedPromotionSku, setSelectedPromotionSku] = useState<
    'URGENT_LISTING' | 'SHOWCASE_FEED' | 'URGENT_SHOWCASE_BUNDLE' | null
  >(null);
  const [promotionTermsAccepted, setPromotionTermsAccepted] = useState(false);

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
    | null
  >(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial brands
  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const res = await fetch(`${API_URL}/vehicle-filters/brands`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBrands(json.data);
      }
    } catch (e) {
      console.error('Error fetching brands:', e);
    } finally {
      setLoadingBrands(false);
    }
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
      const res = await fetch(`${API_URL}/vehicle-filters/models?brand=${encodeURIComponent(brand)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setModels(json.data);
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
    setYears([]);
    setBodyTypes([]);
    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!model || !currentBrand) return;
    setLoadingYears(true);
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(currentBrand)}&modelFamily=${encodeURIComponent(model)}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setYears(json.data);
        if (json.data.length === 1) {
          handleYearChange(json.data[0].value, model, currentBrand);
        }
      }
    } catch (e) {
      console.error('Error fetching years:', e);
    } finally {
      setLoadingYears(false);
    }
  };

  const handleYearChange = async (year: string, currentModel = selectedModel, currentBrand = selectedBrand) => {
    setSelectedYear(year);
    setSelectedBodyType('');
    setSelectedEngine('');
    setSelectedFuelType('');
    setSelectedTransmission('');
    setSelectedTrim('');
    setSelectedVariantId('');
    setMatchedVariantDetail(null);
    setBodyTypes([]);
    setEngines([]);
    setFuelTypes([]);
    setTransmissions([]);
    setTrims([]);

    if (!year || !currentModel || !currentBrand) return;
    setLoadingBodyTypes(true);
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/body-types?brand=${encodeURIComponent(currentBrand)}&modelFamily=${encodeURIComponent(currentModel)}&year=${encodeURIComponent(year)}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBodyTypes(json.data);
        if (json.data.length === 1) {
          handleBodyTypeChange(json.data[0].value, year, currentModel, currentBrand);
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
      });
      const res = await fetch(`${API_URL}/vehicle-filters/engines?${query.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEngines(json.data);
        if (json.data.length === 1) {
          handleEngineChange(json.data[0].value, bodyTypeVal, currentYear, currentModel, currentBrand);
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
      });
      const res = await fetch(`${API_URL}/vehicle-filters/fuel-types?${query.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFuelTypes(json.data);
        if (json.data.length === 1) {
          handleFuelTypeChange(json.data[0].value, engineVal, currentBody, currentYear, currentModel, currentBrand);
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
    setTransmissions([]);
    setTrims([]);

    if (!fuelVal || !currentEngine || !currentBody || !currentYear || !currentModel || !currentBrand) return;
    setLoadingTransmissions(true);
    try {
      const query = new URLSearchParams({
        brand: currentBrand,
        modelFamily: currentModel,
        year: String(currentYear),
        bodyType: currentBody,
        engineVersion: currentEngine,
        fuelType: fuelVal,
      });
      const res = await fetch(`${API_URL}/vehicle-filters/transmissions?${query.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTransmissions(json.data);
        if (json.data.length === 1) {
          handleTransmissionChange(
            json.data[0].value,
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
    setTrims([]);

    if (!transVal || !currentFuel || !currentEngine || !currentBody || !currentYear || !currentModel || !currentBrand)
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
      });
      const res = await fetch(`${API_URL}/vehicle-filters/trims?${query.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTrims(json.data);
        if (json.data.length === 1) {
          handleTrimChange(
            json.data[0].value,
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
      });
      const res = await fetch(`${API_URL}/vehicle-filters/match-variant?${query.toString()}`);
      const json = await res.json();

      if (json.success && json.variantId) {
        setSelectedVariantId(json.variantId);
        setBodyType(mapToBodyTypeEnum(currentBody));
        setFuelType(mapToFuelTypeEnum(currentFuel));
        setTransmission(mapToTransmissionEnum(currentTrans));

        const initialDt = inferDrivetrain(currentBrand, currentModel, currentEngine, trimVal);
        setDrivetrain(initialDt);

        // Auto-fill engine cc and hp from variant details
        try {
          const token =
            (await AsyncStorage.getItem('accessToken')) || (await AsyncStorage.getItem('token'));
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const detailRes = await fetch(`${API_URL}/vehicles/variants/${json.variantId}`, { headers });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            setMatchedVariantDetail(detail);

            let hp =
              detail.powerEnrichment?.powerHp ||
              detail.specs?.specs?.enginePowerHp ||
              detail.specs?.specs?.powerHp ||
              detail.specs?.enginePowerHp ||
              detail.engine?.powerHp ||
              detail.engine?.horsepower;

            if (!hp) {
              try {
                const enrichRes = await fetch(`${API_URL}/vehicles/variants/${json.variantId}/power-enrichment`);
                if (enrichRes.ok) {
                  const enrichJson = await enrichRes.json();
                  if (enrichJson?.powerHp) {
                    hp = enrichJson.powerHp;
                  }
                }
              } catch (enrichErr) {}
            }

            if (hp) setEnginePower(String(hp));

            const cc =
              detail.specs?.specs?.engineDisplacementCc ||
              detail.specs?.engineDisplacementCc ||
              detail.engine?.displacementCc ||
              detail.engine?.displacement ||
              detail.specs?.engineDisplacement;
            if (cc) setEngineDisplacement(String(cc));

            if (detail.specs?.drivetrain) {
              setDrivetrain(detail.specs.drivetrain);
            }

            if (!title) {
              setTitle(`${currentBrand} ${currentModel} ${currentEngine} ${trimVal} (${currentYear})`.trim());
            }
          }
        } catch (e) {
          console.warn('Could not load variant detail:', e);
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
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((a: any) => a.uri);
        setSelectedImages((prev) => [...prev, ...newUris]);
      }
    } catch (e: any) {
      console.error('Gallery pick error:', e);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const togglePartState = (partKey: string, targetType: 'painted' | 'changed') => {
    if (targetType === 'painted') {
      if (paintedParts.includes(partKey)) {
        setPaintedParts((prev) => prev.filter((k) => k !== partKey));
      } else {
        setPaintedParts((prev) => [...prev, partKey]);
        setChangedParts((prev) => prev.filter((k) => k !== partKey));
      }
    } else if (targetType === 'changed') {
      if (changedParts.includes(partKey)) {
        setChangedParts((prev) => prev.filter((k) => k !== partKey));
      } else {
        setChangedParts((prev) => [...prev, partKey]);
        setPaintedParts((prev) => prev.filter((k) => k !== partKey));
      }
    }
  };

  const handleSubmit = async () => {
    const rawPrice = parseNumberInput(priceAmount);
    const rawKm = parseNumberInput(kilometers);

    if (!title.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilan başlığını yazın.');
      return;
    }
    if (!rawPrice || isNaN(Number(rawPrice)) || Number(rawPrice) <= 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen geçerli bir fiyat girin.');
      return;
    }
    if (!rawKm || isNaN(Number(rawKm))) {
      Alert.alert('Eksik Bilgi', 'Lütfen kilometre bilgisini girin.');
      return;
    }
    if (!useCustomVariant && !selectedBrand) {
      Alert.alert('Eksik Bilgi', 'Lütfen araç markasını seçin.');
      return;
    }
    if (!useCustomVariant && !selectedModel) {
      Alert.alert('Eksik Bilgi', 'Lütfen araç modelini seçin.');
      return;
    }
    if (useCustomVariant && (!customBrand.trim() || !customModel.trim())) {
      Alert.alert('Eksik Bilgi', 'Lütfen özel araç marka ve modelini girin.');
      return;
    }
    if (!city) {
      Alert.alert('Eksik Bilgi', 'Lütfen bulunduğunuz şehri seçin.');
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

      if (selectedPromotionSku && !promotionTermsAccepted) {
        Alert.alert(
          'Promosyon Koşulları',
          'Lütfen seçtiğiniz ilan promosyonuna ilişkin onay kutusunu işaretleyin.'
        );
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
        hasWarranty,
        heavyDamage,
        isUrgent: effectiveUrgent,
        engineDisplacement: rawDisplacement ? Number(rawDisplacement) : undefined,
        enginePower: rawPower ? Number(rawPower) : undefined,
        drivetrain,
        tramerAmount: rawTramer ? Number(rawTramer) : 0,
        damageRecord: damageRecord.trim() || undefined,
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
        'İlan Başarıyla Yayınlandı! 🎉',
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
      title = 'Kasa Tipi Seçin';
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
      title = 'Şanzıman Tipi Seçin';
      list = transmissions;
    } else if (activePicker === 'trim') {
      title = 'Donanım Paketi Seçin';
      list = trims;
    } else if (activePicker === 'city') {
      title = 'Şehir Seçin';
      list = TURKISH_CITIES.map((c) => ({ label: c, value: c }));
    }

    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase();
      list = list.filter((item) => item.label.toLowerCase().includes(q));
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* TOP NAVBAR */}
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
            <Text style={styles.backBtnText}>Geri</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>İlan Ver</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. ARAÇ SEÇİMİ CARD (8 KRİTER TAXONOMY ENGINE) */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="car-sport" size={20} color="#ea580c" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>🚗 Adım 1: Araç Seçimi</Text>
                <Text style={styles.cardSubDesc}>
                  Aracınızın doğru teknik katalog verisine ve yapay zeka analizine bağlanabilmesi için aracınızı seçiniz.
                </Text>
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
                Aracımı listede bulamadım (Özel detaylar gireceğim)
              </Text>
            </TouchableOpacity>

            {!useCustomVariant ? (
              <View style={{ gap: 12 }}>
                {/* 1. Marka */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Marka *</Text>
                  <TouchableOpacity
                    style={styles.selectorBtn}
                    onPress={() => {
                      setPickerSearch('');
                      setActivePicker('brand');
                    }}
                  >
                    <Text
                      style={[
                        styles.selectorBtnText,
                        !!selectedBrand && styles.selectorSelectedText,
                      ]}
                    >
                      {loadingBrands ? 'Yükleniyor...' : selectedBrand || 'Seçiniz...'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* 2. Model */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Model *</Text>
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
                      {loadingModels ? 'Yükleniyor...' : selectedModel || 'Seçiniz...'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* 3. Model Yılı */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Model Yılı *</Text>
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
                      {loadingYears ? 'Yükleniyor...' : selectedYear || 'Seçiniz...'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* 4. Kasa Tipi */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Kasa Tipi *</Text>
                  <TouchableOpacity
                    style={[
                      styles.selectorBtn,
                      (!selectedYear || loadingBodyTypes || bodyTypes.length === 0) && { opacity: 0.5 },
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
                        : (BODY_TYPE_LABELS[selectedBodyType] || selectedBodyType) || 'Seçiniz...'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* 5. Motor / Versiyon */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Motor / Versiyon *</Text>
                  <TouchableOpacity
                    style={[
                      styles.selectorBtn,
                      (!selectedBodyType || loadingEngines || engines.length === 0) && { opacity: 0.5 },
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
                      {loadingEngines ? 'Yükleniyor...' : selectedEngine || 'Seçiniz...'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* 6. Yakıt Türü */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Yakıt Türü *</Text>
                  <TouchableOpacity
                    style={[
                      styles.selectorBtn,
                      (!selectedEngine || loadingFuels || fuelTypes.length === 0) && { opacity: 0.5 },
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
                      {loadingFuels ? 'Yükleniyor...' : selectedFuelType || 'Seçiniz...'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* 7. Şanzıman Tipi */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Şanzıman Tipi *</Text>
                  <TouchableOpacity
                    style={[
                      styles.selectorBtn,
                      (!selectedFuelType || loadingTransmissions || transmissions.length === 0) && {
                        opacity: 0.5,
                      },
                    ]}
                    disabled={!selectedFuelType || loadingTransmissions || transmissions.length === 0}
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
                      {loadingTransmissions ? 'Yükleniyor...' : selectedTransmission || 'Seçiniz...'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* 8. Donanım Paketi */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Donanım Paketi *</Text>
                  <TouchableOpacity
                    style={[
                      styles.selectorBtn,
                      (!selectedTransmission || loadingTrims || trims.length === 0) && { opacity: 0.5 },
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
                      {loadingTrims ? 'Yükleniyor...' : selectedTrim || 'Seçiniz...'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* RESOLUTION STATUS BANNER */}
                {matchingVariant ? (
                  <View style={styles.bannerMatching}>
                    <ActivityIndicator size="small" color="#0284c7" />
                    <Text style={styles.bannerMatchingText}>
                      Varyant doğrulanıyor ve eşleştiriliyor...
                    </Text>
                  </View>
                ) : selectedVariantId ? (
                  <View style={styles.bannerSuccess}>
                    <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bannerSuccessTitle}>
                        ✅ Araç Veritabanı Eşleşmesi Başarılı
                      </Text>
                      <Text style={styles.bannerSuccessDesc}>
                        {selectedBrand} {selectedModel} ({selectedYear}) {selectedTrim}
                      </Text>
                      {(enginePower || engineDisplacement) && (
                        <Text style={styles.bannerAutoFilledBadge}>
                          ⚡ Otomatik Eşlenen:{' '}
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
                      ❌ Bu kombinasyon için net varyant eşleşmesi bulunamadı. Lütfen seçimlerinizi kontrol ediniz veya "Aracımı listede bulamadım" seçeneğini işaretleyiniz.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.bannerInfo}>
                    <Ionicons name="information-circle" size={18} color="#f59e0b" />
                    <Text style={styles.bannerInfoText}>
                      ℹ️ İlerlemeden önce lütfen aracın tüm özelliklerini (8 kriter) eksiksiz seçiniz.
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
                    placeholder="Örn: Porsche"
                    placeholderTextColor="#94a3b8"
                    value={customBrand}
                    onChangeText={setCustomBrand}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Model İsmi *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Örn: 911 Carrera"
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
          </View>

          {/* 2. TEMEL İLAN DETAYLARI CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={18} color="#ea580c" />
              <Text style={styles.cardTitle}>İlan Detayları</Text>
            </View>

            {/* Başlık */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>İlan Başlığı *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Örn: Hatasız Boyasız İlk Sahibinden A3"
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
                  placeholder="0"
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
                  placeholder="0"
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
                <Text style={styles.inputLabel}>Şehir *</Text>
                <TouchableOpacity
                  style={styles.selectorBtn}
                  onPress={() => {
                    setPickerSearch('');
                    setActivePicker('city');
                  }}
                >
                  <Text style={[styles.selectorBtnText, !!city && styles.selectorSelectedText]}>
                    {city || 'Şehir Seçin'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>İlçe (Opsiyonel)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Kadıköy"
                  placeholderTextColor="#94a3b8"
                  value={district}
                  onChangeText={setDistrict}
                />
              </View>
            </View>

            {/* Açıklama */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>İlan Açıklaması</Text>
              <TextInput
                style={[styles.textInput, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Aracınız hakkında detaylı bilgi yazın..."
                placeholderTextColor="#94a3b8"
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* 3. TEKNİK ÖZELLİKLER (MOTOR GÜCÜ & HACMİ) */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="hardware-chip" size={18} color="#ea580c" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Teknik Özellikler</Text>
                <Text style={styles.cardSubDesc}>
                  Varyant seçiminde otomatik doldurulur, dilerseniz manuel düzenleyebilirsiniz.
                </Text>
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
                      <Text style={styles.catalogBadgeText}>Katalogdan</Text>
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
                      <Text style={styles.catalogBadgeText}>Katalogdan</Text>
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

            {/* Çekiş Tipi */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Çekiş Tipi</Text>
              <View style={styles.pillGroup}>
                {DRIVETRAINS.map((dt) => (
                  <TouchableOpacity
                    key={dt.val}
                    style={[styles.pillBtn, drivetrain === dt.val && styles.pillBtnActive]}
                    onPress={() => setDrivetrain(dt.val)}
                  >
                    <Text style={[styles.pillBtnText, drivetrain === dt.val && styles.pillBtnTextActive]}>
                      {dt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Renk */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Araç Rengi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPills}>
                {CAR_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.pillBtn, color === c && styles.pillBtnActive]}
                    onPress={() => setColor(c)}
                  >
                    <Text style={[styles.pillBtnText, color === c && styles.pillBtnTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* 4. EKSPERTİZ, BOYA & TRAMER DURUMU */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#ea580c" />
              <Text style={styles.cardTitle}>Ekspertiz, Boya &amp; Tramer</Text>
            </View>

            {/* Tramer Tutarı */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tramer Hasar Kaydı Tutarı (TL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={formatNumberInput(tramerAmount)}
                onChangeText={(t) => setTramerAmount(parseNumberInput(t))}
              />
            </View>

            {/* Boyalı ve Değişen Parçalar */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Boya / Değişen Durumu</Text>
              <Text style={styles.helperText}>
                Her parça için durum seçimi yapabilirsiniz (B: Boyalı, D: Değişen).
              </Text>

              <View style={styles.partList}>
                {CAR_BODY_PARTS.map((part) => {
                  const isPainted = paintedParts.includes(part.key);
                  const isChanged = changedParts.includes(part.key);
                  return (
                    <View key={part.key} style={styles.partRow}>
                      <Text style={styles.partName}>{part.label}</Text>
                      <View style={styles.partActions}>
                        <TouchableOpacity
                          style={[styles.partBadge, isPainted && styles.partBadgePainted]}
                          onPress={() => togglePartState(part.key, 'painted')}
                        >
                          <Text style={[styles.partBadgeText, isPainted && styles.partBadgeTextActive]}>
                            Boyalı
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.partBadge, isChanged && styles.partBadgeChanged]}
                          onPress={() => togglePartState(part.key, 'changed')}
                        >
                          <Text style={[styles.partBadgeText, isChanged && styles.partBadgeTextActive]}>
                            Değişen
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 5. FOTOĞRAF YÜKLEME */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="images" size={18} color="#ea580c" />
              <Text style={styles.cardTitle}>Fotoğraflar</Text>
            </View>

            <TouchableOpacity style={styles.uploadArea} onPress={pickImagesFromGallery}>
              <Ionicons name="cloud-upload-outline" size={32} color="#ea580c" />
              <Text style={styles.uploadTitle}>Fotoğraf Ekle</Text>
              <Text style={styles.uploadSub}>Galerinizden ilan fotoğraflarını seçin.</Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && (
              <View style={styles.thumbGrid}>
                {selectedImages.map((uri, idx) => (
                  <View key={idx} style={styles.thumbWrap}>
                    <Image source={{ uri }} style={styles.thumbImg} />
                    <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeImage(idx)}>
                      <Ionicons name="close" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 6. PROMOSYON PAKETİ SEÇİMİ (VITRIN / ACIL / KOMBO) */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="rocket" size={18} color="#ea580c" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>İlan Promosyon Paketi</Text>
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
                      name={selectedPromotionSku === null ? 'radio-button-on' : 'radio-button-off'}
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
                  selectedPromotionSku === 'URGENT_LISTING' && styles.promoOptionCardActiveUrgent,
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  setSelectedPromotionSku(
                    selectedPromotionSku === 'URGENT_LISTING' ? null : 'URGENT_LISTING'
                  )
                }
              >
                <View style={styles.promoOptionHeader}>
                  <View style={styles.promoOptionIconWrapUrgent}>
                    <Ionicons name="flame" size={18} color="#dc2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promoOptionTitle}>Acil İlan</Text>
                    <Text style={styles.promoOptionDesc}>Kırmızı ACİL rozeti &amp; Acil listesi</Text>
                  </View>
                  <View style={styles.promoOptionRadio}>
                    <Ionicons
                      name={selectedPromotionSku === 'URGENT_LISTING' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selectedPromotionSku === 'URGENT_LISTING' ? '#dc2626' : '#cbd5e1'}
                    />
                  </View>
                </View>
                <View style={styles.promoOptionFooter}>
                  <Text style={styles.promoOptionFeatureNote}>✓ Acil İlanlar Sekmesinde Gösterim</Text>
                  <Text style={styles.promoOptionPriceUrgent}>99 ₺</Text>
                </View>
              </TouchableOpacity>

              {/* 3. Vitrin + Akış (199 TL) */}
              <TouchableOpacity
                style={[
                  styles.promoOptionCard,
                  selectedPromotionSku === 'SHOWCASE_FEED' && styles.promoOptionCardActiveVitrin,
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  setSelectedPromotionSku(
                    selectedPromotionSku === 'SHOWCASE_FEED' ? null : 'SHOWCASE_FEED'
                  )
                }
              >
                <View style={styles.promoOptionHeader}>
                  <View style={styles.promoOptionIconWrapVitrin}>
                    <Ionicons name="star" size={18} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promoOptionTitle}>Vitrin + Akış</Text>
                    <Text style={styles.promoOptionDesc}>Ana Sayfa Vitrin ve İlan Akışı</Text>
                  </View>
                  <View style={styles.promoOptionRadio}>
                    <Ionicons
                      name={selectedPromotionSku === 'SHOWCASE_FEED' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selectedPromotionSku === 'SHOWCASE_FEED' ? '#f59e0b' : '#cbd5e1'}
                    />
                  </View>
                </View>
                <View style={styles.promoOptionFooter}>
                  <Text style={styles.promoOptionFeatureNote}>✓ Maksimum Ana Sayfa Görünürlüğü</Text>
                  <Text style={styles.promoOptionPriceVitrin}>199 ₺</Text>
                </View>
              </TouchableOpacity>

              {/* 4. Hızlı Satış Paketi (Kombo 249 TL) */}
              <TouchableOpacity
                style={[
                  styles.promoOptionCard,
                  selectedPromotionSku === 'URGENT_SHOWCASE_BUNDLE' && styles.promoOptionCardActiveBundle,
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  setSelectedPromotionSku(
                    selectedPromotionSku === 'URGENT_SHOWCASE_BUNDLE' ? null : 'URGENT_SHOWCASE_BUNDLE'
                  )
                }
              >
                <View style={styles.promoRibbon}>
                  <Text style={styles.promoRibbonText}>🔥 EN AVANTAJLI PAKET</Text>
                </View>

                <View style={styles.promoOptionHeader}>
                  <View style={styles.promoOptionIconWrapBundle}>
                    <Ionicons name="flash" size={18} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promoOptionTitle}>Hızlı Satış Paketi</Text>
                    <Text style={styles.promoOptionDesc}>Acil İlan + Vitrin + İlan Akışı Kombo</Text>
                  </View>
                  <View style={styles.promoOptionRadio}>
                    <Ionicons
                      name={
                        selectedPromotionSku === 'URGENT_SHOWCASE_BUNDLE'
                          ? 'radio-button-on'
                          : 'radio-button-off'
                      }
                      size={20}
                      color={selectedPromotionSku === 'URGENT_SHOWCASE_BUNDLE' ? '#ea580c' : '#cbd5e1'}
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

            {/* Terms Checkbox */}
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
                  <Text style={{ fontWeight: '700', color: '#0f172a' }}>tek seferlik ek bir hizmet</Text>{' '}
                  olduğunu ve ilanın aktif yayın süresi boyunca geçerli olduğunu kabul ediyorum.
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            disabled={submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>İlanı Yayınla</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* INTERACTIVE UNIFIED MODAL PICKER WITH INSTANT SEARCH */}
        <Modal
          visible={activePicker !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setActivePicker(null);
            setPickerSearch('');
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{pickerData.title}</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => {
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
                  placeholder="Ara..."
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
                style={{ maxHeight: 420 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
                showsVerticalScrollIndicator={false}
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
                      (activePicker === 'city' && city === item.value);

                    return (
                      <TouchableOpacity
                        key={item.value}
                        style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                        onPress={() => handleSelectPickerOption(item.value)}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            isSelected && styles.pickerOptionTextActive,
                          ]}
                          numberOfLines={2}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
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
          </View>
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
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
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
    borderRadius: 16,
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
    alignItems: 'flex-start',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubDesc: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  customToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
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
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorBtnText: {
    fontSize: 13.5,
    color: '#94a3b8',
    flex: 1,
  },
  selectorSelectedText: {
    color: '#0f172a',
    fontWeight: '600',
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
  },
  bannerMatching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 12,
    borderRadius: 10,
  },
  bannerMatchingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  bannerSuccess: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 10,
  },
  bannerSuccessTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#16a34a',
  },
  bannerSuccessDesc: {
    fontSize: 12,
    color: '#15803d',
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
    borderRadius: 10,
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
    borderRadius: 10,
  },
  bannerInfoText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#b45309',
    flex: 1,
    lineHeight: 16,
  },
  partList: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 8,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  partName: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '500',
  },
  partActions: {
    flexDirection: 'row',
    gap: 6,
  },
  partBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  partBadgePainted: {
    backgroundColor: '#f59e0b',
  },
  partBadgeChanged: {
    backgroundColor: '#ef4444',
  },
  partBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  partBadgeTextActive: {
    color: '#ffffff',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadSub: {
    fontSize: 12,
    color: '#64748b',
  },
  thumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  thumbWrap: {
    width: 76,
    height: 76,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  removeImgBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  promoOptionIconWrapUrgent: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoOptionIconWrapVitrin: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoOptionIconWrapBundle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
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
    marginTop: 4,
  },
  promoTermsText: {
    fontSize: 11.5,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
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
    marginVertical: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerOptionActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  pickerOptionText: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  pickerOptionTextActive: {
    color: '#ea580c',
    fontWeight: '700',
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
