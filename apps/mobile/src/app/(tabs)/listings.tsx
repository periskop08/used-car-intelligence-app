import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Alert,
  Share,
  Image,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goBackFromTab, setCustomTabBackHandler } from '../../utils/tabNavigation';
import TorkScoutLoader from '../../components/TorkScoutLoader';
import {
  TURKEY_81_PROVINCES,
  getDistrictsForCity,
  getCanonicalBrandLogoUrl,
  getBrandMonogram,
} from '@used-car-intelligence/shared';
import { getBrandLogoUrl as resolveBrandLogo } from '../../constants/brandLogos';
import { CLOUDFLARE_VEHICLE_IMAGES } from '../../constants/vehicleImages';
import UrgentBadge from '../../components/UrgentBadge';
import ShowcaseBadge from '../../components/ShowcaseBadge';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

function BrandLogo({ brandName, size = 30 }: { brandName?: string; size?: number }) {
  const [hasError, setHasError] = useState(false);
  const logoUrl = resolveBrandLogo(brandName) || getCanonicalBrandLogoUrl(brandName) || '';
  const monogram = getBrandMonogram(brandName);

  useEffect(() => {
    setHasError(false);
  }, [brandName]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
      }}
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
          style={{
            width: Math.round(size * 0.82),
            height: Math.round(size * 0.82),
            borderRadius: 6,
            borderWidth: 1,
            backgroundColor: monogram.bgColor,
            borderColor: monogram.borderColor,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{ fontSize: Math.max(9, Math.round(size * 0.34)), fontWeight: '900', color: monogram.textColor }}
            numberOfLines={1}
          >
            {monogram.initials}
          </Text>
        </View>
      )}
    </View>
  );
}

const TURKISH_CITIES = [
  'Tümü',
  ...TURKEY_81_PROVINCES,
];


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
];

const BODY_TYPES = [
  { label: 'Sedan', val: 'SEDAN' },
  { label: 'Hatchback', val: 'HATCHBACK' },
  { label: 'SUV', val: 'SUV' },
  { label: 'Coupe', val: 'COUPE' },
  { label: 'Cabrio', val: 'CABRIO' },
  { label: 'Station Wagon', val: 'WAGON' },
  { label: 'Pickup', val: 'PICKUP' },
  { label: 'Minivan / Panelvan', val: 'MINIVAN' },
];

const VEHICLE_STATUSES = [
  { label: 'İkinci El', val: 'USED' },
  { label: 'Sıfır', val: 'NEW' },
  { label: 'İthal Sıfır', val: 'IMPORTED_NEW' },
];

const SELLER_TYPES = [
  { label: 'Sahibinden', val: 'INDIVIDUAL' },
  { label: 'Galeriden', val: 'DEALER' },
];

const DRIVETRAINS = [
  { label: 'Önden Çekiş', val: 'FWD' },
  { label: 'Arkadan İtiş', val: 'RWD' },
  { label: '4WD (Sürekli)', val: '4WD' },
  { label: 'AWD (Elektronik)', val: 'AWD' },
];

const CAR_COLORS = [
  { label: 'Beyaz', code: '#ffffff', border: '#cbd5e1' },
  { label: 'Siyah', code: '#0f172a', border: '#0f172a' },
  { label: 'Gri', code: '#64748b', border: '#64748b' },
  { label: 'Gümüş', code: '#94a3b8', border: '#94a3b8' },
  { label: 'Kırmızı', code: '#dc2626', border: '#dc2626' },
  { label: 'Mavi', code: '#2563eb', border: '#2563eb' },
  { label: 'Sarı', code: '#eab308', border: '#eab308' },
  { label: 'Yeşil', code: '#16a34a', border: '#16a34a' },
];

const PLATE_TYPES = [
  { label: 'TR Plakalı', val: 'TR' },
  { label: 'Mavi Plakalı (MA)', val: 'MA' },
  { label: 'Özel Plaka', val: 'SPECIAL' },
];

const formatCloudflareImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  if (url.includes('r2.dev') || url.includes('cloudflarestorage.com')) {
    let storageKey = '';
    if (url.includes('.r2.dev/')) {
      const parts = url.split('.r2.dev/');
      if (parts.length > 1) storageKey = parts[1];
    } else {
      const parts = url.split('cloudflarestorage.com/');
      if (parts.length > 1) {
        const path = parts[1].replace(/^\//, '');
        const pathParts = path.split('/');
        if (pathParts[0] === 'torquescout-listings') {
          storageKey = pathParts.slice(1).join('/');
        } else {
          storageKey = path;
        }
      }
    }

    if (storageKey) {
      if (storageKey.startsWith('guide-cards/')) {
        return `${API_URL}/vehicle-guide/media-proxy/${storageKey}`;
      }
      return `${API_URL}/listings/media-proxy/${storageKey}`;
    }
  }

  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  }

  return url;
};

const resolveVehicleImageUrl = (
  url?: string | null,
  brand?: string,
  modelFamily?: string
): string => {
  if (url && !url.includes('test-similar')) {
    const formatted = formatCloudflareImageUrl(url);
    if (formatted) return formatted;
  }

  if (brand || modelFamily) {
    const b = (brand || '').toLowerCase().trim();
    const m = (modelFamily || '').toLowerCase().trim();
    const fullKey = `${b} ${m}`.trim();
    if (fullKey && CLOUDFLARE_VEHICLE_IMAGES[fullKey]) {
      return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[fullKey]);
    }
    if (m && CLOUDFLARE_VEHICLE_IMAGES[m]) {
      return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[m]);
    }
    if (b && CLOUDFLARE_VEHICLE_IMAGES[b]) {
      return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[b]);
    }
  }
  return 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80';
};

interface ListingMedia {
  id: string;
  url?: string;
  mediaUrl?: string;
}

interface ListingItem {
  id: string;
  title: string;
  priceAmount?: number;
  price?: number;
  currency?: string;
  kilometers?: number;
  mileage?: number;
  year?: number;
  city?: string;
  district?: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  isUrgent?: boolean;
  isShowcaseFeedActive?: boolean;
  hasAiReport?: boolean;
  sellerType?: string;
  drivetrain?: string;
  color?: string;
  enginePower?: number;
  engineDisplacement?: number;
  plateType?: string;
  hasWarranty?: boolean;
  heavyDamage?: boolean;
  description?: string;
  createdAt?: string;
  media?: ListingMedia[];
  photos?: { url: string }[];
  vehicleVariant?: {
    year?: number;
    vehicleType?: string;
    bodyType?: string;
    brand?: { id?: string; name: string };
    model?: { id?: string; name: string; vehicleType?: string };
    trim?: { id?: string; name: string };
  };
}

type ListingVehicleCategory = 'ALL' | 'AUTOMOBILE' | 'SUV_PICKUP' | 'MINIVAN_PANELVAN' | 'MOTORCYCLE';

const LISTING_CATEGORY_ITEMS: {
  id: Exclude<ListingVehicleCategory, 'ALL'>;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: 'AUTOMOBILE', name: 'Otomobil', icon: 'car-sports' },
  { id: 'SUV_PICKUP', name: 'Arazi, SUV & Pickup', icon: 'car-lifted-pickup' },
  { id: 'MINIVAN_PANELVAN', name: 'Minivan & Panelvan', icon: 'van-utility' },
  { id: 'MOTORCYCLE', name: 'Motosiklet', icon: 'motorbike' },
];

const getListingCategoryLabel = (cat: ListingVehicleCategory): string => {
  switch (cat) {
    case 'AUTOMOBILE':
      return 'Otomobil';
    case 'SUV_PICKUP':
      return 'Arazi, SUV & Pickup';
    case 'MINIVAN_PANELVAN':
      return 'Minivan & Panelvan';
    case 'MOTORCYCLE':
      return 'Motosiklet';
    case 'ALL':
    default:
      return 'Tüm Vasıta Türleri';
  }
};

const matchesListingCategory = (item: ListingItem, cat: ListingVehicleCategory): boolean => {
  if (!cat || cat === 'ALL') return true;
  const vType = (item.vehicleVariant?.vehicleType || item.vehicleVariant?.model?.vehicleType || '').toUpperCase();
  const bType = (item.bodyType || item.vehicleVariant?.bodyType || '').toUpperCase();

  if (cat === 'MOTORCYCLE') {
    return vType === 'MOTORCYCLE';
  }
  if (cat === 'MINIVAN_PANELVAN') {
    return vType === 'MINIVAN_PANELVAN' || bType === 'MINIVAN' || bType === 'VAN';
  }
  if (cat === 'SUV_PICKUP') {
    return vType === 'SUV_PICKUP' || bType === 'SUV' || bType === 'PICKUP';
  }
  if (cat === 'AUTOMOBILE') {
    if (vType === 'MOTORCYCLE' || vType === 'MINIVAN_PANELVAN' || vType === 'SUV_PICKUP') return false;
    if (bType === 'SUV' || bType === 'PICKUP' || bType === 'MINIVAN' || bType === 'VAN') return false;
    return true;
  }
  return true;
};

interface Brand {
  id: string;
  name: string;
}

interface VehicleModel {
  id: string;
  name: string;
}

interface VehicleEngine {
  id: string;
  code?: string;
  displayName?: string;
}

interface VehicleTrim {
  id: string;
  name: string;
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'km_asc' | 'featured';

export default function ListingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    urgentOnly?: string;
    showcaseOnly?: string;
    promptCategory?: string;
    category?: string;
    sellerId?: string;
    sellerName?: string;
    brand?: string;
  }>();

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Vasıta Türü Seçim Ekranı (Gate) & Seçili Vasıta Türü
  const [selectedCategory, setSelectedCategory] = useState<ListingVehicleCategory>(
    (params.category as ListingVehicleCategory) || 'ALL'
  );
  const hasDirectFilterEntry =
    params.urgentOnly === 'true' ||
    params.showcaseOnly === 'true' ||
    Boolean(params.category) ||
    Boolean(params.sellerId) ||
    Boolean(params.brand);

  const [categoryGateVisible, setCategoryGateVisible] = useState<boolean>(!hasDirectFilterEntry);
  const enteredViaCategoryGateRef = useRef<boolean>(!hasDirectFilterEntry);

  // View Mode: 'LIST' or 'CARD'
  const [viewMode, setViewMode] = useState<'LIST' | 'CARD'>('LIST');

  // Filter States
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [engines, setEngines] = useState<VehicleEngine[]>([]);
  const [trims, setTrims] = useState<VehicleTrim[]>([]);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [loadingTrims, setLoadingTrims] = useState(false);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<VehicleEngine | null>(null);
  const [selectedTrim, setSelectedTrim] = useState<VehicleTrim | null>(null);

  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [minKm, setMinKm] = useState('');
  const [maxKm, setMaxKm] = useState('');

  // Extended filters
  const [minHp, setMinHp] = useState('');
  const [maxHp, setMaxHp] = useState('');
  const [minCc, setMinCc] = useState('');
  const [maxCc, setMaxCc] = useState('');

  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([]);
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSellerTypes, setSelectedSellerTypes] = useState<string[]>([]);
  const [selectedDrivetrains, setSelectedDrivetrains] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPlateTypes, setSelectedPlateTypes] = useState<string[]>([]);

  const [hasWarranty, setHasWarranty] = useState(false);
  const [noHeavyDamage, setNoHeavyDamage] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [showcaseOnly, setShowcaseOnly] = useState(false);
  const [exchangeable, setExchangeable] = useState(false);
  const [isAiReady, setIsAiReady] = useState(false);
  const [includeDescription, setIncludeDescription] = useState(false);
  const [sellerIdFilter, setSellerIdFilter] = useState<string>(params.sellerId || '');
  const [sellerNameFilter, setSellerNameFilter] = useState<string>(params.sellerName || '');

  useEffect(() => {
    if (params.urgentOnly === 'true') {
      setUrgentOnly(true);
      enteredViaCategoryGateRef.current = false;
      setCategoryGateVisible(false);
    } else if (params.urgentOnly === 'false') {
      setUrgentOnly(false);
    }
  }, [params.urgentOnly]);

  useEffect(() => {
    if (params.showcaseOnly === 'true') {
      setShowcaseOnly(true);
      enteredViaCategoryGateRef.current = false;
      setCategoryGateVisible(false);
    } else if (params.showcaseOnly === 'false') {
      setShowcaseOnly(false);
    }
  }, [params.showcaseOnly]);

  useEffect(() => {
    if (params.sellerId) {
      setSellerIdFilter(params.sellerId);
      setSellerNameFilter(params.sellerName || '');
      enteredViaCategoryGateRef.current = false;
      setCategoryGateVisible(false);
    }
  }, [params.sellerId, params.sellerName]);

  useEffect(() => {
    if (params.promptCategory) {
      enteredViaCategoryGateRef.current = true;
      setCategoryGateVisible(true);
    }
  }, [params.promptCategory]);

  useFocusEffect(
    useCallback(() => {
      setCustomTabBackHandler(() => {
        if (!categoryGateVisible && enteredViaCategoryGateRef.current) {
          setCategoryGateVisible(true);
          return true;
        }
        return false;
      });
      return () => {
        setCustomTabBackHandler(null);
      };
    }, [categoryGateVisible])
  );

  // Sorting
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Modals
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [brandPickerVisible, setBrandPickerVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [enginePickerVisible, setEnginePickerVisible] = useState(false);
  const [trimPickerVisible, setTrimPickerVisible] = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [districtPickerVisible, setDistrictPickerVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [districtSearchQuery, setDistrictSearchQuery] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');

  const filteredBrands = useMemo(() => {
    const q = brandSearchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return brands;
    return brands.filter((b) => b.name.toLocaleLowerCase('tr-TR').includes(q));
  }, [brands, brandSearchQuery]);

  const filteredCities = useMemo(() => {
    const q = citySearchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return TURKISH_CITIES;
    return TURKISH_CITIES.filter((c) =>
      c.toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [citySearchQuery]);

  const availableDistricts = useMemo(() => {
    if (!city || city === 'Tümü') return [];
    return ['Tümü', ...getDistrictsForCity(city)];
  }, [city]);

  const filteredDistricts = useMemo(() => {
    const q = districtSearchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return availableDistricts;
    return availableDistricts.filter((d) =>
      d.toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [availableDistricts, districtSearchQuery]);

  useEffect(() => {
    fetchBrands(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand.id, selectedCategory);
    } else {
      setModels([]);
      setSelectedModel(null);
      setEngines([]);
      setSelectedEngine(null);
      setTrims([]);
      setSelectedTrim(null);
    }
  }, [selectedBrand, selectedCategory]);

  useEffect(() => {
    if (selectedModel) {
      fetchEngines(selectedModel.id);
    } else {
      setEngines([]);
      setSelectedEngine(null);
      setTrims([]);
      setSelectedTrim(null);
    }
  }, [selectedModel, minYear, maxYear]);

  useEffect(() => {
    if (selectedModel) {
      fetchTrims(selectedModel.id, selectedEngine?.id);
    } else {
      setTrims([]);
      setSelectedTrim(null);
    }
  }, [selectedModel, selectedEngine, minYear, maxYear]);

  useEffect(() => {
    fetchListings();
  }, [
    selectedCategory,
    selectedBrand,
    selectedModel,
    selectedEngine,
    selectedTrim,
    city,
    district,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    minKm,
    maxKm,
    minHp,
    maxHp,
    minCc,
    maxCc,
    selectedFuels,
    selectedTransmissions,
    selectedBodyTypes,
    selectedStatuses,
    selectedSellerTypes,
    selectedDrivetrains,
    selectedColors,
    selectedPlateTypes,
    hasWarranty,
    noHeavyDamage,
    urgentOnly,
    showcaseOnly,
    exchangeable,
    isAiReady,
    includeDescription,
    sellerIdFilter,
    sortOption,
  ]);

  const loadFavorites = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (!token) return;

      const res = await fetch(`${API_URL}/me/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const favs = await res.json();
        const ids = new Set<string>((favs || []).map((f: any) => f.listingId || f.id));
        setFavoriteIds(ids);
      }
    } catch (e) {
      console.error('Load favorites error:', e);
    }
  };

  const fetchBrands = async (cat: ListingVehicleCategory = selectedCategory) => {
    try {
      const query = cat && cat !== 'ALL' ? `?category=${cat}` : `?category=ALL`;
      const res = await fetch(`${API_URL}/vehicles/brands${query}`);
      if (res.ok) {
        const data = await res.json();
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          : [];
        setBrands(sorted);
      }
    } catch (e) {
      console.error('Error fetching brands:', e);
    }
  };

  const fetchModels = async (brandId: string, cat: ListingVehicleCategory = selectedCategory) => {
    try {
      const catQuery = cat && cat !== 'ALL' ? `&category=${cat}` : `&category=ALL`;
      const res = await fetch(`${API_URL}/vehicles/models?brandId=${brandId}${catQuery}`);
      if (res.ok) {
        const data = await res.json();
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
          : [];
        setModels(sorted);
      }
    } catch (e) {
      console.error('Error fetching models:', e);
    }
  };

  const fetchEngines = async (modelId: string) => {
    setLoadingEngines(true);
    try {
      let url = `${API_URL}/vehicles/engines?modelId=${modelId}`;
      if (minYear.trim()) url += `&minYear=${encodeURIComponent(minYear.trim())}`;
      if (maxYear.trim()) url += `&maxYear=${encodeURIComponent(maxYear.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEngines(Array.isArray(data) ? data : []);
      } else {
        setEngines([]);
      }
    } catch (e) {
      console.error('Error fetching engines:', e);
      setEngines([]);
    } finally {
      setLoadingEngines(false);
    }
  };

  const fetchTrims = async (modelId: string, engineId?: string) => {
    setLoadingTrims(true);
    try {
      let url = `${API_URL}/vehicles/trims?modelId=${modelId}`;
      if (engineId) url += `&engineId=${engineId}`;
      if (minYear.trim()) url += `&minYear=${encodeURIComponent(minYear.trim())}`;
      if (maxYear.trim()) url += `&maxYear=${encodeURIComponent(maxYear.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTrims(Array.isArray(data) ? data : []);
      } else {
        setTrims([]);
      }
    } catch (e) {
      console.error('Error fetching trims:', e);
      setTrims([]);
    } finally {
      setLoadingTrims(false);
    }
  };

  const handleSelectCategory = (cat: ListingVehicleCategory) => {
    if (cat !== selectedCategory) {
      setSelectedBrand(null);
      setSelectedModel(null);
      setSelectedEngine(null);
      setSelectedTrim(null);
    }
    setSelectedCategory(cat);
    enteredViaCategoryGateRef.current = true;
    setCategoryGateVisible(false);
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/listings?limit=50&`;
      if (selectedCategory && selectedCategory !== 'ALL') {
        url += `category=${selectedCategory}&`;
      }
      if (selectedBrand) url += `brandId=${selectedBrand.id}&`;
      if (selectedModel) url += `modelId=${selectedModel.id}&`;
      if (selectedEngine) url += `engineId=${selectedEngine.id}&`;
      if (selectedTrim) url += `trimId=${selectedTrim.id}&`;
      if (sellerIdFilter.trim()) url += `sellerId=${encodeURIComponent(sellerIdFilter.trim())}&`;
      if (search.trim()) url += `keyword=${encodeURIComponent(search.trim())}&`;
      if (includeDescription) url += `includeDescription=true&`;
      if (city.trim() && city !== 'Tümü') url += `city=${encodeURIComponent(city.trim())}&`;
      if (district.trim()) url += `district=${encodeURIComponent(district.trim())}&`;
      if (minPrice.trim()) url += `minPrice=${minPrice.trim()}&`;
      if (maxPrice.trim()) url += `maxPrice=${maxPrice.trim()}&`;
      if (minYear.trim()) url += `minYear=${minYear.trim()}&`;
      if (maxYear.trim()) url += `maxYear=${maxYear.trim()}&`;
      if (minKm.trim()) url += `minKm=${minKm.trim()}&`;
      if (maxKm.trim()) url += `maxKm=${maxKm.trim()}&`;

      if (minHp.trim()) url += `minEnginePower=${minHp.trim()}&`;
      if (maxHp.trim()) url += `maxEnginePower=${maxHp.trim()}&`;
      if (minCc.trim()) url += `minEngineDisplacement=${minCc.trim()}&`;
      if (maxCc.trim()) url += `maxEngineDisplacement=${maxCc.trim()}&`;

      if (urgentOnly) url += `urgentOnly=true&`;
      if (showcaseOnly) url += `showcaseOnly=true&`;
      if (exchangeable) url += `exchangeable=true&`;
      if (isAiReady) url += `isAiReady=true&`;
      if (hasWarranty) url += `hasWarranty=true&`;
      if (noHeavyDamage) url += `heavyDamage=false&`;

      if (selectedFuels.length === 1) url += `fuelType=${selectedFuels[0]}&`;
      if (selectedTransmissions.length === 1) url += `transmission=${selectedTransmissions[0]}&`;
      if (selectedBodyTypes.length === 1) url += `bodyType=${selectedBodyTypes[0]}&`;
      if (selectedStatuses.length === 1) url += `vehicleStatus=${selectedStatuses[0]}&`;
      if (selectedSellerTypes.length === 1) url += `sellerType=${selectedSellerTypes[0]}&`;
      if (selectedDrivetrains.length === 1) url += `drivetrain=${selectedDrivetrains[0]}&`;
      if (selectedColors.length === 1) url += `color=${encodeURIComponent(selectedColors[0])}&`;
      if (selectedPlateTypes.length === 1) url += `plateType=${selectedPlateTypes[0]}&`;

      if (sortOption === 'price_asc') url += `sort=price_asc&`;
      else if (sortOption === 'price_desc') url += `sort=price_desc&`;
      else if (sortOption === 'km_asc') url += `sort=km_asc&`;
      else if (sortOption === 'featured') url += `sort=featured&`;
      else url += `sort=newest&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        let items: ListingItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.listings)
          ? data.listings
          : [];

        // Client-side multi-filter fallback
        if (selectedFuels.length > 1) {
          items = items.filter((i) => i.fuelType && selectedFuels.includes(i.fuelType));
        }
        if (selectedTransmissions.length > 1) {
          items = items.filter(
            (i) => i.transmission && selectedTransmissions.includes(i.transmission)
          );
        }
        if (selectedDrivetrains.length > 1) {
          items = items.filter(
            (i) => i.drivetrain && selectedDrivetrains.includes(i.drivetrain)
          );
        }
        if (selectedColors.length > 1) {
          items = items.filter((i) => i.color && selectedColors.includes(i.color));
        }
        if (selectedCategory && selectedCategory !== 'ALL') {
          items = items.filter((i) => matchesListingCategory(i, selectedCategory));
        }

        setListings(items);
      } else {
        console.warn('Listings fetch non-ok status:', res.status);
      }
    } catch (e) {
      console.error('Fetch listings error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
    loadFavorites();
  };

  const handleClearFilters = () => {
    setSelectedCategory('ALL');
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedEngine(null);
    setSelectedTrim(null);
    setCity('');
    setDistrict('');
    setMinPrice('');
    setMaxPrice('');
    setMinYear('');
    setMaxYear('');
    setMinKm('');
    setMaxKm('');
    setMinHp('');
    setMaxHp('');
    setMinCc('');
    setMaxCc('');
    setSelectedFuels([]);
    setSelectedTransmissions([]);
    setSelectedBodyTypes([]);
    setSelectedStatuses([]);
    setSelectedSellerTypes([]);
    setSelectedDrivetrains([]);
    setSelectedColors([]);
    setSelectedPlateTypes([]);
    setHasWarranty(false);
    setNoHeavyDamage(false);
    setUrgentOnly(false);
    setShowcaseOnly(false);
    setExchangeable(false);
    setIsAiReady(false);
    setIncludeDescription(false);
    setSellerIdFilter('');
    setSellerNameFilter('');
    setSearch('');
  };

  const countActiveFilters = () => {
    let count = 0;
    if (selectedCategory && selectedCategory !== 'ALL') count++;
    if (selectedBrand) count++;
    if (selectedModel) count++;
    if (selectedEngine) count++;
    if (selectedTrim) count++;
    if (sellerIdFilter) count++;
    if (city && city !== 'Tümü') count++;
    if (district) count++;
    if (minPrice || maxPrice) count++;
    if (minYear || maxYear) count++;
    if (minKm || maxKm) count++;
    if (minHp || maxHp) count++;
    if (minCc || maxCc) count++;
    if (selectedFuels.length > 0) count++;
    if (selectedTransmissions.length > 0) count++;
    if (selectedBodyTypes.length > 0) count++;
    if (selectedStatuses.length > 0) count++;
    if (selectedSellerTypes.length > 0) count++;
    if (selectedDrivetrains.length > 0) count++;
    if (selectedColors.length > 0) count++;
    if (selectedPlateTypes.length > 0) count++;
    if (hasWarranty) count++;
    if (noHeavyDamage) count++;
    if (urgentOnly) count++;
    if (showcaseOnly) count++;
    if (exchangeable) count++;
    if (isAiReady) count++;
    if (includeDescription) count++;
    return count;
  };

  const toggleArrayFilter = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    val: string
  ) => {
    if (list.includes(val)) {
      setList(list.filter((x) => x !== val));
    } else {
      setList([...list, val]);
    }
  };

  const handleShareSearch = async () => {
    try {
      await Share.share({
        message: `TorqueScout Araç İlanları: https://torquescout.com/listings`,
      });
    } catch (e) {}
  };

  const handleSaveSearch = async () => {
    Alert.alert(
      'Aramayı Kaydet',
      'Bu arama kriterlerini bildirim almak üzere favori aramalarınıza kaydetmek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: () => Alert.alert('Başarılı', 'Arama kriteriniz başarıyla kaydedildi.'),
        },
      ]
    );
  };

  const toggleFavorite = async (listingId: string) => {
    const token =
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('token'));

    if (!token) {
      Alert.alert('Giriş Yapın', 'İlanları favoriye eklemek için giriş yapmalısınız.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/login' as any) },
      ]);
      return;
    }

    const isFav = favoriteIds.has(listingId);
    const updated = new Set(favoriteIds);
    if (isFav) {
      updated.delete(listingId);
    } else {
      updated.add(listingId);
    }
    setFavoriteIds(updated);

    try {
      if (isFav) {
        await fetch(`${API_URL}/me/favorites/${listingId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API_URL}/me/favorites`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ listingId }),
        });
      }
    } catch (e) {
      console.error('Toggle favorite error:', e);
    }
  };

  // SAHIBINDEN ROW RENDER
  const renderListRow = ({ item }: { item: ListingItem }) => {
    const brandName = item.vehicleVariant?.brand?.name || '';
    const modelName = item.vehicleVariant?.model?.name || '';
    const year = item.year || item.vehicleVariant?.year || '';
    const priceVal = item.priceAmount ?? item.price ?? 0;
    const kmVal = item.kilometers ?? item.mileage ?? 0;
    const isFav = favoriteIds.has(item.id);

    const firstImage =
      item.media?.[0]?.url ||
      item.media?.[0]?.mediaUrl ||
      item.photos?.[0]?.url ||
      null;

    const resolvedImageUrl = resolveVehicleImageUrl(firstImage, brandName, modelName);

    return (
      <TouchableOpacity
        style={styles.shRowCard}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/listings/[id]', params: { id: item.id } } as any)}
      >
        <View style={styles.shThumbnailWrap}>
          <ExpoImage
            source={{ uri: resolvedImageUrl }}
            style={styles.shThumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {(item.isUrgent || item.isShowcaseFeedActive) && (
            <View style={[styles.shUrgentPillWrap, { flexDirection: 'row', gap: 3 }]}>
              {item.isUrgent && <UrgentBadge size="small" />}
              {item.isShowcaseFeedActive && <ShowcaseBadge size="small" />}
            </View>
          )}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 5,
            }}
            onPress={() => toggleFavorite(item.id)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={14}
              color={isFav ? '#ef4444' : '#ffffff'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.shInfoContainer}>
          <Text style={styles.shListingTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.shSpecsRow}>
            {!!year && <Text style={styles.shSpecText}>{year}</Text>}
            {!!year && <Text style={styles.shDot}>•</Text>}
            <Text style={styles.shSpecText}>
              {new Intl.NumberFormat('tr-TR').format(kmVal)} km
            </Text>
            {item.sellerType && (
              <View style={styles.shSellerBadge}>
                <Text style={styles.shSellerBadgeText}>
                  {item.sellerType === 'DEALER' ? 'Galeri' : 'Sahibinden'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.shBottomRow}>
            <View style={styles.shLocationGroup}>
              <Ionicons name="location-sharp" size={12} color="#94a3b8" />
              <Text style={styles.shLocationText} numberOfLines={1}>
                {item.city ? `${item.city}${item.district ? `, ${item.district}` : ''}` : 'Türkiye'}
              </Text>
            </View>

            <Text style={styles.shPriceText}>
              {new Intl.NumberFormat('tr-TR').format(priceVal)} TL
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // CARD RENDER
  const renderCardItem = ({ item }: { item: ListingItem }) => {
    const brandName = item.vehicleVariant?.brand?.name || '';
    const modelName = item.vehicleVariant?.model?.name || '';
    const trimName = item.vehicleVariant?.trim?.name || '';
    const priceVal = item.priceAmount ?? item.price ?? 0;

    const firstImage =
      item.media?.[0]?.url ||
      item.media?.[0]?.mediaUrl ||
      item.photos?.[0]?.url ||
      null;

    const resolvedImageUrl = resolveVehicleImageUrl(firstImage, brandName, modelName);
    const isFav = favoriteIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => router.push({ pathname: '/listings/[id]', params: { id: item.id } } as any)}
      >
        <View style={styles.imageContainer}>
          <ExpoImage
            source={{ uri: resolvedImageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />

          <View style={styles.imageBadgesRow}>
            {item.isUrgent && <UrgentBadge size="small" />}
            {item.isShowcaseFeedActive && <ShowcaseBadge size="small" />}
          </View>

          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => toggleFavorite(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={20}
              color={isFav ? '#ef4444' : '#ffffff'}
            />
          </TouchableOpacity>

          <View style={styles.priceOverlay}>
            <Text style={styles.priceAmountText}>
              {new Intl.NumberFormat('tr-TR').format(priceVal)} TL
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {!!brandName && <BrandLogo brandName={brandName} size={22} />}
            <Text style={[styles.vehicleSpecText, { flex: 1 }]} numberOfLines={1}>
              {brandName} {modelName} {trimName ? `• ${trimName}` : ''}
            </Text>
          </View>
          <View style={styles.cardFooterRow}>
            <Text style={styles.locationText}>
              {item.city ? `${item.city}${item.district ? ` / ${item.district}` : ''}` : 'Türkiye'}
            </Text>
            <Text style={styles.viewDetailText}>İlanı İncele →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const activeFilterCount = countActiveFilters();

  if (categoryGateVisible) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#fafcff' }]} edges={['top']}>
        {/* Header matching Görsel 2 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <TouchableOpacity
            style={{ padding: 4 }}
            onPress={() => {
              goBackFromTab(router);
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#0b192c' }}>
            Vasıta Türü Seç
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <Text
          style={{
            fontSize: 13.5,
            color: '#64748b',
            paddingHorizontal: 20,
            marginBottom: 14,
          }}
        >
          Sorgulamak istediğiniz vasıta türünü seçerek devam edin.
        </Text>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {LISTING_CATEGORY_ITEMS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: isSelected ? '#fff7ed' : '#ffffff',
                  borderWidth: 1.5,
                  borderColor: isSelected ? '#ea580c' : '#e2e8f0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                }}
                activeOpacity={0.8}
                onPress={() => handleSelectCategory(cat.id)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: isSelected ? '#ffedd5' : '#f1f5f9',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon}
                      size={24}
                      color={isSelected ? '#ea580c' : '#0f172a'}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: isSelected ? '#c2410c' : '#0f172a',
                    }}
                  >
                    {cat.name}
                  </Text>
                </View>

                <View style={{ marginLeft: 8 }}>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={24} color="#ea580c" />
                  ) : (
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: '#cbd5e1',
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#fff7ed',
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
              marginTop: 4,
              borderWidth: 1,
              borderColor: '#ffedd5',
            }}
          >
            <Ionicons name="information-circle-outline" size={18} color="#ea580c" />
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                color: '#c2410c',
                fontWeight: '600',
                lineHeight: 17,
              }}
            >
              Seçtiğiniz vasıta türüne göre ilgili marka, model ve teknik varyant kriterleri listelenecektir.
            </Text>
          </View>

          {/* EN ALT BUTON: TÜM İLANLARI GÖRÜNTÜLE */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#ea580c',
              paddingVertical: 16,
              paddingHorizontal: 20,
              borderRadius: 16,
              marginTop: 10,
              shadowColor: '#ea580c',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.85}
            onPress={() => handleSelectCategory('ALL')}
          >
            <Ionicons name="grid-outline" size={18} color="#ffffff" />
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#ffffff' }}>
              Tüm İlanları Görüntüle
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* TOP APPBAR */}
      <View style={styles.topAppBar}>
        <TouchableOpacity
          style={styles.appBarIconBtn}
          onPress={() => {
            if (enteredViaCategoryGateRef.current) {
              setCategoryGateVisible(true);
            } else {
              goBackFromTab(router);
            }
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.appBarCenter}>
          <Text style={styles.appBarTitle}>Araç İlanları</Text>
          <Text style={styles.appBarSubTitle}>
            {loading
              ? 'Yükleniyor...'
              : `${getListingCategoryLabel(selectedCategory)} • ${listings.length} ilan`}
          </Text>
        </View>

        <View style={styles.appBarRightGroup}>
          <TouchableOpacity style={styles.appBarIconBtn} onPress={handleShareSearch}>
            <Ionicons name="share-outline" size={20} color="#334155" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.appBarIconBtn} onPress={handleSaveSearch}>
            <Ionicons name="star-outline" size={20} color="#334155" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4-GRID SUB-BAR */}
      <View style={styles.subMenuBar}>
        {/* 1. Filtrele */}
        <TouchableOpacity
          style={[styles.subMenuBtn, activeFilterCount > 0 && styles.subMenuBtnActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons
            name="funnel-outline"
            size={14}
            color={activeFilterCount > 0 ? '#ea580c' : '#334155'}
          />
          <Text
            style={[styles.subMenuBtnText, activeFilterCount > 0 && styles.subMenuBtnTextActive]}
            numberOfLines={1}
          >
            Filtrele {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>

        <View style={styles.subMenuDivider} />

        {/* 2. Sırala */}
        <TouchableOpacity
          style={styles.subMenuBtn}
          onPress={() => setSortModalVisible(true)}
        >
          <Ionicons name="swap-vertical" size={14} color="#334155" />
          <Text style={styles.subMenuBtnText} numberOfLines={1}>
            Sırala
          </Text>
        </TouchableOpacity>

        <View style={styles.subMenuDivider} />

        {/* 3. Görünüm (Toggle) */}
        <TouchableOpacity
          style={styles.subMenuBtn}
          onPress={() => setViewMode(viewMode === 'LIST' ? 'CARD' : 'LIST')}
        >
          <Ionicons
            name={viewMode === 'LIST' ? 'grid-outline' : 'list-outline'}
            size={14}
            color="#334155"
          />
          <Text style={styles.subMenuBtnText}>Görünüm</Text>
        </TouchableOpacity>

        <View style={styles.subMenuDivider} />

        {/* 4. Kaydet */}
        <TouchableOpacity style={styles.subMenuBtn} onPress={handleSaveSearch}>
          <Ionicons name="bookmark-outline" size={14} color="#334155" />
          <Text style={styles.subMenuBtnText} numberOfLines={1}>
            Kaydet
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH BOX & QUICK CHIP */}
      <View style={styles.searchWrap}>
        <View style={styles.searchInner}>
          <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="İlanlar içinde ara (Örn: Cam tavan, hatasız)..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchListings}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                fetchListings();
              }}
            >
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.urgentQuickChip, urgentOnly && styles.urgentQuickChipActive]}
          onPress={() => setUrgentOnly(!urgentOnly)}
        >
          <Ionicons name="flame" size={14} color={urgentOnly ? '#ffffff' : '#ef4444'} />
          <Text style={[styles.urgentQuickChipText, urgentOnly && styles.urgentQuickChipTextActive]}>
            Acil
          </Text>
        </TouchableOpacity>
      </View>

      {/* ACTIVE FILTERS SUMMARY CHIPS */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFilterNotice}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {selectedCategory && selectedCategory !== 'ALL' && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => handleSelectCategory('ALL')}
              >
                <Ionicons name="car-sport-outline" size={13} color="#ea580c" />
                <Text style={styles.filterTagPillText}>{getListingCategoryLabel(selectedCategory)}</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {selectedBrand && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => setSelectedBrand(null)}
              >
                <BrandLogo brandName={selectedBrand.name} size={18} />
                <Text style={styles.filterTagPillText}>{selectedBrand.name}</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {selectedModel && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => {
                  setSelectedModel(null);
                  setSelectedEngine(null);
                  setSelectedTrim(null);
                }}
              >
                <Text style={styles.filterTagPillText}>{selectedModel.name}</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {selectedEngine && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => {
                  setSelectedEngine(null);
                  setSelectedTrim(null);
                }}
              >
                <Text style={styles.filterTagPillText}>{selectedEngine.displayName || selectedEngine.code}</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {selectedTrim && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => setSelectedTrim(null)}
              >
                <Text style={styles.filterTagPillText}>{selectedTrim.name}</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {!!sellerIdFilter && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => {
                  setSellerIdFilter('');
                  setSellerNameFilter('');
                }}
              >
                <Ionicons name="person-outline" size={12} color="#ea580c" />
                <Text style={styles.filterTagPillText}>{sellerNameFilter || 'Seçili Satıcı'}</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {city && city !== 'Tümü' && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => {
                  setCity('');
                  setDistrict('');
                }}
              >
                <Text style={styles.filterTagPillText} numberOfLines={1} ellipsizeMode="tail">{city}</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {district && district !== 'Tümü' && (
              <TouchableOpacity style={styles.filterTagPill} onPress={() => setDistrict('')}>
                <Text style={styles.filterTagPillText} numberOfLines={1} ellipsizeMode="tail">{district}</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {(minPrice || maxPrice) && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => {
                  setMinPrice('');
                  setMaxPrice('');
                }}
              >
                <Text style={styles.filterTagPillText}>
                  {minPrice ? `${minPrice} TL` : '0'} - {maxPrice ? `${maxPrice} TL` : 'Max'}
                </Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {(minHp || maxHp) && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => {
                  setMinHp('');
                  setMaxHp('');
                }}
              >
                <Text style={styles.filterTagPillText}>
                  {minHp || '0'} - {maxHp || 'Max'} HP
                </Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {hasWarranty && (
              <TouchableOpacity style={styles.filterTagPill} onPress={() => setHasWarranty(false)}>
                <Text style={styles.filterTagPillText}>Garantili</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {noHeavyDamage && (
              <TouchableOpacity style={styles.filterTagPill} onPress={() => setNoHeavyDamage(false)}>
                <Text style={styles.filterTagPillText}>Ağır Hasarsız</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {urgentOnly && (
              <TouchableOpacity style={styles.filterTagPill} onPress={() => setUrgentOnly(false)}>
                <Text style={styles.filterTagPillText}>Acil İlanlar</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {showcaseOnly && (
              <TouchableOpacity style={styles.filterTagPill} onPress={() => setShowcaseOnly(false)}>
                <Text style={styles.filterTagPillText}>Vitrin İlanlar</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {exchangeable && (
              <TouchableOpacity style={styles.filterTagPill} onPress={() => setExchangeable(false)}>
                <Text style={styles.filterTagPillText}>Takaslı</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
          </ScrollView>
          <TouchableOpacity onPress={handleClearFilters} style={{ marginLeft: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#ea580c' }}>Temizle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MAIN LISTINGS FEED */}
      {loading ? (
        <View style={styles.centerLoading}>
          <TorkScoutLoader />
          <Text style={styles.loadingText}>İlanlar yükleniyor...</Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-sport-outline" size={54} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Aradığınız kriterde ilan bulunamadı</Text>
          <Text style={styles.emptySub}>
            Filtreleri sıfırlayarak veya arama terimini değiştirerek tekrar deneyebilirsiniz.
          </Text>
          <TouchableOpacity style={styles.resetFiltersBtn} onPress={handleClearFilters}>
            <Text style={styles.resetFiltersBtnText}>Filtreleri Sıfırla</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={viewMode === 'LIST' ? renderListRow : renderCardItem}
          contentContainerStyle={viewMode === 'LIST' ? styles.listRowContent : styles.cardContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={
            viewMode === 'LIST' ? () => <View style={styles.rowSeparator} /> : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ea580c"
            />
          }
        />
      )}

      {/* ========================================================================= */}
      {/* 🌟 WEB-MATCHED FULL DETAILED FILTER MODAL 🌟 */}
      {/* ========================================================================= */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <SafeAreaView style={styles.filterModalContainer} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={styles.filterModalHeader}>
            <TouchableOpacity onPress={handleClearFilters}>
              <Text style={styles.filterModalResetText}>Temizle</Text>
            </TouchableOpacity>
            <Text style={styles.filterModalTitle}>Detaylı Filtreleme</Text>
            <TouchableOpacity
              style={styles.modalCloseCircle}
              onPress={() => setFilterModalVisible(false)}
            >
              <Ionicons name="close" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {/* Filter Body Scroll */}
          <ScrollView
            style={styles.filterModalScroll}
            contentContainerStyle={styles.filterModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 0. VASITA TÜRÜ (EN ÜSTTE) */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🚘 VASITA TÜRÜ</Text>
              <View style={{ gap: 8 }}>
                {[
                  { id: 'ALL' as ListingVehicleCategory, name: 'Tüm Vasıta Türleri (Karışık)', icon: 'view-grid-outline' as keyof typeof MaterialCommunityIcons.glyphMap },
                  ...LISTING_CATEGORY_ITEMS,
                ].map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 11,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: isSelected ? '#fff7ed' : '#f8fafc',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#ea580c' : '#e2e8f0',
                      }}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (cat.id !== selectedCategory) {
                          setSelectedBrand(null);
                          setSelectedModel(null);
                        }
                        setSelectedCategory(cat.id);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <MaterialCommunityIcons
                          name={cat.icon}
                          size={20}
                          color={isSelected ? '#ea580c' : '#475569'}
                        />
                        <Text
                          style={{
                            fontSize: 13.5,
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? '#c2410c' : '#0f172a',
                          }}
                        >
                          {cat.name}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color="#ea580c" />
                      ) : (
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            borderWidth: 1.5,
                            borderColor: '#cbd5e1',
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 1. ADRES (İL / İLÇE) */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>📍 ADRES (İL / İLÇE)</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => {
                  setCitySearchQuery('');
                  setCityPickerVisible(true);
                }}
              >
                <Text
                  style={[styles.dropdownSelectorText, !!city && styles.dropdownSelectedText, { flexShrink: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {city || 'İl Seçin (81 İl)'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownSelector, (!city || city === 'Tümü') && { opacity: 0.5 }]}
                disabled={!city || city === 'Tümü'}
                onPress={() => {
                  setDistrictSearchQuery('');
                  setDistrictPickerVisible(true);
                }}
              >
                <Text
                  style={[styles.dropdownSelectorText, !!district && styles.dropdownSelectedText, { flexShrink: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {district || (city && city !== 'Tümü' ? `${city} İlçesi Seçin` : 'Önce İl Seçin')}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* 2. MARKA & MODEL */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🚗 MARKA & MODEL</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => {
                  setBrandSearchQuery('');
                  setBrandPickerVisible(true);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  {selectedBrand ? (
                    <BrandLogo brandName={selectedBrand.name} size={28} />
                  ) : null}
                  <Text
                    style={[
                      styles.dropdownSelectorText,
                      !!selectedBrand && styles.dropdownSelectedText,
                    ]}
                  >
                    {selectedBrand ? selectedBrand.name : 'Marka Seçin'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownSelector, !selectedBrand && { opacity: 0.5 }]}
                disabled={!selectedBrand}
                onPress={() => setModelPickerVisible(true)}
              >
                <Text
                  style={[
                    styles.dropdownSelectorText,
                    !!selectedModel && styles.dropdownSelectedText,
                  ]}
                >
                  {selectedModel ? selectedModel.name : 'Model Seçin'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownSelector, !selectedModel && { opacity: 0.5 }]}
                disabled={!selectedModel}
                onPress={() => setEnginePickerVisible(true)}
              >
                <Text
                  style={[
                    styles.dropdownSelectorText,
                    !!selectedEngine && styles.dropdownSelectedText,
                  ]}
                >
                  {selectedEngine ? selectedEngine.name : 'Motor / Versiyon Seçin'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdownSelector, !selectedModel && { opacity: 0.5 }]}
                disabled={!selectedModel}
                onPress={() => setTrimPickerVisible(true)}
              >
                <Text
                  style={[
                    styles.dropdownSelectorText,
                    !!selectedTrim && styles.dropdownSelectedText,
                  ]}
                >
                  {selectedTrim ? selectedTrim.name : 'Donanım Paketi Seçin'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* 3. FİYAT ARALIĞI */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>💰 FİYAT ARALIĞI (TL)</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Min TL"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <Text style={styles.rangeDash}>-</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Max TL"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>
            </View>

            {/* 4. MODEL YILI */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>📅 MODEL YILI</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Min Yıl (2015)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={minYear}
                  onChangeText={setMinYear}
                />
                <Text style={styles.rangeDash}>-</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Max Yıl (2024)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={maxYear}
                  onChangeText={setMaxYear}
                />
              </View>
            </View>

            {/* 5. KİLOMETRE */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🛣️ KİLOMETRE</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Min KM"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={minKm}
                  onChangeText={setMinKm}
                />
                <Text style={styles.rangeDash}>-</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Max KM"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={maxKm}
                  onChangeText={setMaxKm}
                />
              </View>
            </View>

            {/* 6. MOTOR GÜCÜ (HP) */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>⚡ MOTOR GÜCÜ (HP)</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Min HP (Örn: 90)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={minHp}
                  onChangeText={setMinHp}
                />
                <Text style={styles.rangeDash}>-</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Max HP (Örn: 250)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={maxHp}
                  onChangeText={setMaxHp}
                />
              </View>
            </View>

            {/* 7. MOTOR HACMİ (CC) */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🔧 MOTOR HACMİ (CC)</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Min CC (Örn: 1200)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={minCc}
                  onChangeText={setMinCc}
                />
                <Text style={styles.rangeDash}>-</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Max CC (Örn: 2000)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={maxCc}
                  onChangeText={setMaxCc}
                />
              </View>
            </View>

            {/* 8. ÇEKİŞ */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>⚙️ ÇEKİŞ</Text>
              <View style={styles.chipsWrap}>
                {DRIVETRAINS.map((d) => {
                  const isSelected = selectedDrivetrains.includes(d.val);
                  return (
                    <TouchableOpacity
                      key={d.val}
                      style={[styles.chipPill, isSelected && styles.chipPillActive]}
                      onPress={() =>
                        toggleArrayFilter(
                          selectedDrivetrains,
                          setSelectedDrivetrains,
                          d.val
                        )
                      }
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={14}
                        color={isSelected ? '#ea580c' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.chipPillText,
                          isSelected && styles.chipPillTextActive,
                        ]}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 9. RENK */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🎨 RENK</Text>
              <View style={styles.chipsWrap}>
                {CAR_COLORS.map((c) => {
                  const isSelected = selectedColors.includes(c.label);
                  return (
                    <TouchableOpacity
                      key={c.label}
                      style={[
                        styles.colorChipPill,
                        isSelected && styles.colorChipPillActive,
                      ]}
                      onPress={() =>
                        toggleArrayFilter(selectedColors, setSelectedColors, c.label)
                      }
                    >
                      <View
                        style={[
                          styles.colorDot,
                          {
                            backgroundColor: c.code,
                            borderColor: c.border,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.chipPillText,
                          isSelected && styles.chipPillTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 10. GARANTİ & HASAR */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🛡️ GARANTİ & HASAR</Text>
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  style={[styles.checkboxRow, hasWarranty && styles.checkboxRowActive]}
                  onPress={() => setHasWarranty(!hasWarranty)}
                >
                  <Ionicons
                    name={hasWarranty ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={hasWarranty ? '#ea580c' : '#94a3b8'}
                  />
                  <Text style={[styles.checkboxLabel, hasWarranty && styles.checkboxLabelActive]}>
                    Garantili Araçlar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkboxRow, noHeavyDamage && styles.checkboxRowActive]}
                  onPress={() => setNoHeavyDamage(!noHeavyDamage)}
                >
                  <Ionicons
                    name={noHeavyDamage ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={noHeavyDamage ? '#ea580c' : '#94a3b8'}
                  />
                  <Text style={[styles.checkboxLabel, noHeavyDamage && styles.checkboxLabelActive]}>
                    Ağır Hasar Kayıtlı Değil
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 11. PLAKA / UYRUK */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🇹🇷 PLAKA / UYRUK</Text>
              <View style={styles.chipsWrap}>
                {PLATE_TYPES.map((p) => {
                  const isSelected = selectedPlateTypes.includes(p.val);
                  return (
                    <TouchableOpacity
                      key={p.val}
                      style={[styles.chipPill, isSelected && styles.chipPillActive]}
                      onPress={() =>
                        toggleArrayFilter(
                          selectedPlateTypes,
                          setSelectedPlateTypes,
                          p.val
                        )
                      }
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={14}
                        color={isSelected ? '#ea580c' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.chipPillText,
                          isSelected && styles.chipPillTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 12. ARAÇ DURUMU */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>⚡ ARAÇ DURUMU</Text>
              <View style={styles.chipsWrap}>
                {VEHICLE_STATUSES.map((s) => {
                  const isSelected = selectedStatuses.includes(s.val);
                  return (
                    <TouchableOpacity
                      key={s.val}
                      style={[styles.chipPill, isSelected && styles.chipPillActive]}
                      onPress={() =>
                        toggleArrayFilter(selectedStatuses, setSelectedStatuses, s.val)
                      }
                    >
                      <Text
                        style={[
                          styles.chipPillText,
                          isSelected && styles.chipPillTextActive,
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 13. YAKIT TİPİ */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>⛽ YAKIT TİPİ</Text>
              <View style={styles.chipsWrap}>
                {FUEL_TYPES.map((f) => {
                  const isSelected = selectedFuels.includes(f.val);
                  return (
                    <TouchableOpacity
                      key={f.val}
                      style={[styles.chipPill, isSelected && styles.chipPillActive]}
                      onPress={() =>
                        toggleArrayFilter(selectedFuels, setSelectedFuels, f.val)
                      }
                    >
                      <Text
                        style={[
                          styles.chipPillText,
                          isSelected && styles.chipPillTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 14. VİTES TİPİ */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🕹️ VİTES</Text>
              <View style={styles.chipsWrap}>
                {TRANSMISSIONS.map((t) => {
                  const isSelected = selectedTransmissions.includes(t.val);
                  return (
                    <TouchableOpacity
                      key={t.val}
                      style={[styles.chipPill, isSelected && styles.chipPillActive]}
                      onPress={() =>
                        toggleArrayFilter(
                          selectedTransmissions,
                          setSelectedTransmissions,
                          t.val
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.chipPillText,
                          isSelected && styles.chipPillTextActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 15. KASA TİPİ */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🚘 KASA TİPİ</Text>
              <View style={styles.chipsWrap}>
                {BODY_TYPES.map((b) => {
                  const isSelected = selectedBodyTypes.includes(b.val);
                  return (
                    <TouchableOpacity
                      key={b.val}
                      style={[styles.chipPill, isSelected && styles.chipPillActive]}
                      onPress={() =>
                        toggleArrayFilter(selectedBodyTypes, setSelectedBodyTypes, b.val)
                      }
                    >
                      <Text
                        style={[
                          styles.chipPillText,
                          isSelected && styles.chipPillTextActive,
                        ]}
                      >
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 16. KİMDEN / SATICI TÜRÜ */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>👤 KİMDEN</Text>
              <View style={styles.chipsWrap}>
                {SELLER_TYPES.map((st) => {
                  const isSelected = selectedSellerTypes.includes(st.val);
                  return (
                    <TouchableOpacity
                      key={st.val}
                      style={[styles.chipPill, isSelected && styles.chipPillActive]}
                      onPress={() =>
                        toggleArrayFilter(
                          selectedSellerTypes,
                          setSelectedSellerTypes,
                          st.val
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.chipPillText,
                          isSelected && styles.chipPillTextActive,
                        ]}
                      >
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 17. ÖZEL İLAN FİLTRELERİ (ACİL, VİTRİN, TAKASLI, AI ANALİZLİ, AÇIKLAMA) */}
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={[styles.urgentToggleRow, urgentOnly && styles.urgentToggleRowActive]}
                onPress={() => setUrgentOnly(!urgentOnly)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name="flame"
                    size={20}
                    color={urgentOnly ? '#ef4444' : '#64748b'}
                  />
                  <View>
                    <Text
                      style={[
                        styles.urgentToggleTitle,
                        urgentOnly && { color: '#ef4444' },
                      ]}
                    >
                      Sadece Acil İlanları Göster
                    </Text>
                    <Text style={styles.urgentToggleSub}>
                      Fiyatı düşen acil satışlı araçlar
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={urgentOnly ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={urgentOnly ? '#ef4444' : '#94a3b8'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.urgentToggleRow,
                  showcaseOnly && { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
                ]}
                onPress={() => setShowcaseOnly(!showcaseOnly)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name="star"
                    size={20}
                    color={showcaseOnly ? '#d97706' : '#64748b'}
                  />
                  <View>
                    <Text
                      style={[
                        styles.urgentToggleTitle,
                        showcaseOnly && { color: '#b45309' },
                      ]}
                    >
                      ⭐ Yalnızca Vitrin İlanları
                    </Text>
                    <Text style={styles.urgentToggleSub}>
                      Öne çıkarılmış vitrin araçlarını listele
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={showcaseOnly ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={showcaseOnly ? '#d97706' : '#94a3b8'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.urgentToggleRow,
                  exchangeable && { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
                ]}
                onPress={() => setExchangeable(!exchangeable)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name="swap-horizontal"
                    size={20}
                    color={exchangeable ? '#2563eb' : '#64748b'}
                  />
                  <View>
                    <Text
                      style={[
                        styles.urgentToggleTitle,
                        exchangeable && { color: '#1d4ed8' },
                      ]}
                    >
                      🔄 Takaslı İlanlar
                    </Text>
                    <Text style={styles.urgentToggleSub}>
                      Takasa uygun araç ilanlarını göster
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={exchangeable ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={exchangeable ? '#2563eb' : '#94a3b8'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.urgentToggleRow,
                  includeDescription && { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' },
                ]}
                onPress={() => setIncludeDescription(!includeDescription)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={includeDescription ? '#0f172a' : '#64748b'}
                  />
                  <View>
                    <Text
                      style={[
                        styles.urgentToggleTitle,
                        includeDescription && { color: '#0f172a' },
                      ]}
                    >
                      Açıklamaları Dahil Et
                    </Text>
                    <Text style={styles.urgentToggleSub}>
                      Kelime aramasında ilan açıklamalarını da tara
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={includeDescription ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={includeDescription ? '#ea580c' : '#94a3b8'}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Sticky Bottom Apply Button */}
          <View style={styles.filterModalFooter}>
            <TouchableOpacity
              style={styles.applyFilterBtn}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyFilterBtnText}>
                Filtreleri Uygula ({listings.length} İlan)
              </Text>
            </TouchableOpacity>
          </View>

          {/* ========================================================================= */}
          {/* IN-MODAL BRAND SELECTION OVERLAY (Avoids iOS Nested Modal Conflict) */}
          {/* ========================================================================= */}
          {brandPickerVisible && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={[StyleSheet.absoluteFill, styles.modalBackdrop, { zIndex: 999 }]}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  Keyboard.dismiss();
                  setBrandPickerVisible(false);
                  setBrandSearchQuery('');
                }}
              />
              <View style={[styles.pickerSheet, { height: '72%', maxHeight: '85%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Marka Seçin</Text>
                  <TouchableOpacity
                    style={styles.modalCloseCircle}
                    onPress={() => {
                      Keyboard.dismiss();
                      setBrandPickerVisible(false);
                      setBrandSearchQuery('');
                    }}
                  >
                    <Ionicons name="close" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f1f5f9',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginHorizontal: 14,
                    marginTop: 6,
                    marginBottom: 4,
                    gap: 8,
                  }}
                >
                  <Ionicons name="search" size={16} color="#94a3b8" />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: '#0f172a',
                      paddingVertical: 0,
                    }}
                    placeholder="Marka ara... (Örn: BMW, Toyota, Honda)"
                    placeholderTextColor="#94a3b8"
                    value={brandSearchQuery}
                    onChangeText={setBrandSearchQuery}
                    autoCorrect={false}
                  />
                  {brandSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setBrandSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 14, gap: 8 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {!brandSearchQuery.trim() && (
                    <TouchableOpacity
                      style={[styles.pickerItem, !selectedBrand && styles.pickerItemSelected]}
                      onPress={() => {
                        setSelectedBrand(null);
                        setSelectedModel(null);
                        setBrandPickerVisible(false);
                        setBrandSearchQuery('');
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          !selectedBrand && styles.pickerItemTextSelected,
                        ]}
                      >
                        Tüm Markalar
                      </Text>
                      {!selectedBrand && (
                        <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                      )}
                    </TouchableOpacity>
                  )}
                  {filteredBrands.map((b) => {
                    const isSelected = selectedBrand?.id === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setSelectedBrand(b);
                          setSelectedModel(null);
                          setBrandPickerVisible(false);
                          setBrandSearchQuery('');
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <BrandLogo brandName={b.name} size={32} />
                          <Text
                            style={[
                              styles.pickerItemText,
                              isSelected && styles.pickerItemTextSelected,
                              { flex: 1 },
                            ]}
                          >
                            {b.name}
                          </Text>
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                        ) : (
                          <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {filteredBrands.length === 0 && (
                    <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>Eşleşen marka bulunamadı.</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          )}

          {/* ========================================================================= */}
          {/* IN-MODAL MODEL SELECTION OVERLAY */}
          {/* ========================================================================= */}
          {modelPickerVisible && (
            <View style={[StyleSheet.absoluteFill, styles.modalBackdrop, { zIndex: 999 }]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setModelPickerVisible(false)}
              />
              <View style={[styles.pickerSheet, { height: '72%', maxHeight: '85%' }]}>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    {selectedBrand && <BrandLogo brandName={selectedBrand.name} size={28} />}
                    <Text style={styles.modalTitle} numberOfLines={1}>
                      {selectedBrand ? `${selectedBrand.name} Modelleri` : 'Model Seçin'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseCircle}
                    onPress={() => setModelPickerVisible(false)}
                  >
                    <Ionicons name="close" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 14, gap: 8 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <TouchableOpacity
                    style={[styles.pickerItem, !selectedModel && styles.pickerItemSelected]}
                    onPress={() => {
                      setSelectedModel(null);
                      setModelPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        !selectedModel && styles.pickerItemTextSelected,
                      ]}
                    >
                      Tüm Modeller
                    </Text>
                    {!selectedModel && (
                      <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                    )}
                  </TouchableOpacity>
                  {models.map((m) => {
                    const isSelected = selectedModel?.id === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setSelectedModel(m);
                          setModelPickerVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            isSelected && styles.pickerItemTextSelected,
                          ]}
                        >
                          {m.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* IN-MODAL ENGINE / VERSION SELECTION OVERLAY */}
          {/* ========================================================================= */}
          {enginePickerVisible && (
            <View style={[StyleSheet.absoluteFill, styles.modalBackdrop, { zIndex: 999 }]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setEnginePickerVisible(false)}
              />
              <View style={[styles.pickerSheet, { height: '65%', maxHeight: '80%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selectedModel ? `${selectedModel.name} Motor / Versiyon` : 'Motor / Versiyon Seçin'}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalCloseCircle}
                    onPress={() => setEnginePickerVisible(false)}
                  >
                    <Ionicons name="close" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 14, gap: 8 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <TouchableOpacity
                    style={[styles.pickerItem, !selectedEngine && styles.pickerItemSelected]}
                    onPress={() => {
                      setSelectedEngine(null);
                      setEnginePickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        !selectedEngine && styles.pickerItemTextSelected,
                      ]}
                    >
                      Tüm Motor / Versiyonlar
                    </Text>
                    {!selectedEngine && (
                      <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                    )}
                  </TouchableOpacity>
                  {engines.map((eng) => {
                    const isSelected = selectedEngine?.id === eng.id;
                    return (
                      <TouchableOpacity
                        key={eng.id}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setSelectedEngine(eng);
                          setEnginePickerVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            isSelected && styles.pickerItemTextSelected,
                          ]}
                        >
                          {eng.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {engines.length === 0 && (
                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>Bu model için kayıtlı motor/versiyon bulunamadı.</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* IN-MODAL TRIM / PACKAGE SELECTION OVERLAY */}
          {/* ========================================================================= */}
          {trimPickerVisible && (
            <View style={[StyleSheet.absoluteFill, styles.modalBackdrop, { zIndex: 999 }]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setTrimPickerVisible(false)}
              />
              <View style={[styles.pickerSheet, { height: '65%', maxHeight: '80%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selectedModel ? `${selectedModel.name} Donanım Paketi` : 'Donanım Paketi Seçin'}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalCloseCircle}
                    onPress={() => setTrimPickerVisible(false)}
                  >
                    <Ionicons name="close" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 14, gap: 8 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <TouchableOpacity
                    style={[styles.pickerItem, !selectedTrim && styles.pickerItemSelected]}
                    onPress={() => {
                      setSelectedTrim(null);
                      setTrimPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        !selectedTrim && styles.pickerItemTextSelected,
                      ]}
                    >
                      Tüm Donanım Paketleri
                    </Text>
                    {!selectedTrim && (
                      <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                    )}
                  </TouchableOpacity>
                  {trims.map((tr) => {
                    const isSelected = selectedTrim?.id === tr.id;
                    return (
                      <TouchableOpacity
                        key={tr.id}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setSelectedTrim(tr);
                          setTrimPickerVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            isSelected && styles.pickerItemTextSelected,
                          ]}
                        >
                          {tr.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {trims.length === 0 && (
                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>Bu model için kayıtlı donanım paketi bulunamadı.</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* IN-MODAL CITY SELECTION OVERLAY (81 İL + INSTANT SEARCH) */}
          {/* ========================================================================= */}
          {cityPickerVisible && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={[StyleSheet.absoluteFill, styles.modalBackdrop, { zIndex: 999 }]}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  Keyboard.dismiss();
                  setCityPickerVisible(false);
                  setCitySearchQuery('');
                }}
              />
              <View style={[styles.pickerSheet, { height: '72%', maxHeight: '85%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>İl Seçin ({TURKEY_81_PROVINCES.length} İl)</Text>
                  <TouchableOpacity
                    style={styles.modalCloseCircle}
                    onPress={() => {
                      Keyboard.dismiss();
                      setCityPickerVisible(false);
                      setCitySearchQuery('');
                    }}
                  >
                    <Ionicons name="close" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f1f5f9',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginHorizontal: 14,
                  marginTop: 6,
                  marginBottom: 4,
                  gap: 8,
                }}>
                  <Ionicons name="search" size={16} color="#94a3b8" />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: '#0f172a',
                      paddingVertical: 0,
                    }}
                    placeholder="İl ara... (Örn: Adana, Bursa)"
                    placeholderTextColor="#94a3b8"
                    value={citySearchQuery}
                    onChangeText={setCitySearchQuery}
                    autoCorrect={false}
                  />
                  {citySearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setCitySearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 14, gap: 8 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredCities.map((c) => {
                    const isSelected = city === c || (!city && c === 'Tümü');
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          const nextCity = c === 'Tümü' ? '' : c;
                          if (nextCity !== city) {
                            setDistrict('');
                          }
                          setCity(nextCity);
                          setCityPickerVisible(false);
                          setCitySearchQuery('');
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            isSelected && styles.pickerItemTextSelected,
                            { flexShrink: 1 },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {c}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {filteredCities.length === 0 && (
                    <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>Eşleşen il bulunamadı.</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          )}

          {/* ========================================================================= */}
          {/* IN-MODAL DISTRICT SELECTION OVERLAY (CASCADED BY CITY + INSTANT SEARCH) */}
          {/* ========================================================================= */}
          {districtPickerVisible && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={[StyleSheet.absoluteFill, styles.modalBackdrop, { zIndex: 999 }]}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  Keyboard.dismiss();
                  setDistrictPickerVisible(false);
                  setDistrictSearchQuery('');
                }}
              />
              <View style={[styles.pickerSheet, { height: '72%', maxHeight: '85%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {city ? `${city} İlçeleri` : 'İlçe Seçin'}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalCloseCircle}
                    onPress={() => {
                      Keyboard.dismiss();
                      setDistrictPickerVisible(false);
                      setDistrictSearchQuery('');
                    }}
                  >
                    <Ionicons name="close" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f1f5f9',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginHorizontal: 14,
                  marginTop: 6,
                  marginBottom: 4,
                  gap: 8,
                }}>
                  <Ionicons name="search" size={16} color="#94a3b8" />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: '#0f172a',
                      paddingVertical: 0,
                    }}
                    placeholder="İlçe ara... (Örn: Kadıköy, Çankaya)"
                    placeholderTextColor="#94a3b8"
                    value={districtSearchQuery}
                    onChangeText={setDistrictSearchQuery}
                    autoCorrect={false}
                  />
                  {districtSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setDistrictSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 14, gap: 8 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredDistricts.map((d) => {
                    const isSelected = district === d || (!district && d === 'Tümü');
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setDistrict(d === 'Tümü' ? '' : d);
                          setDistrictPickerVisible(false);
                          setDistrictSearchQuery('');
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            isSelected && styles.pickerItemTextSelected,
                            { flexShrink: 1 },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {d}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {filteredDistricts.length === 0 && (
                    <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>Eşleşen ilçe bulunamadı.</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* SORT OPTIONS SHEET */}
      {/* ========================================================================= */}
      <Modal
        visible={sortModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSortModalVisible(false)}
          />
          <View style={styles.pickerSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>İlanları Sırala</Text>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setSortModalVisible(false)}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 14, gap: 8 }}>
              {[
                { key: 'newest', label: 'Tarihe Göre (Önce en yeni)' },
                { key: 'featured', label: 'Öne Çıkanlar (Vitrin & Acil)' },
                { key: 'price_asc', label: 'Fiyata Göre (Önce en düşük)' },
                { key: 'price_desc', label: 'Fiyata Göre (Önce en yüksek)' },
                { key: 'km_asc', label: 'Kilometreye Göre (Önce en düşük)' },
              ].map((opt) => {
                const isSelected = sortOption === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setSortOption(opt.key as SortOption);
                      setSortModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        isSelected && styles.pickerItemTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  appBarIconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBarCenter: {
    alignItems: 'center',
    flex: 1,
  },
  appBarTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  appBarSubTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  appBarRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subMenuBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subMenuBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 11,
  },
  subMenuBtnActive: {
    backgroundColor: '#fff7ed',
  },
  subMenuBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  subMenuBtnTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  subMenuDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#e2e8f0',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  searchInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
    padding: 0,
  },
  urgentQuickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  urgentQuickChipActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  urgentQuickChipText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ef4444',
  },
  urgentQuickChipTextActive: {
    color: '#ffffff',
  },
  activeFilterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  filterTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  filterTagPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
    maxWidth: 140,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  resetFiltersBtn: {
    marginTop: 8,
    backgroundColor: '#ea580c',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetFiltersBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  listRowContent: {
    paddingBottom: 40,
    backgroundColor: '#ffffff',
  },
  rowSeparator: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  shRowCard: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  shThumbnailWrap: {
    width: 108,
    height: 80,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  shThumbnail: {
    width: '100%',
    height: '100%',
  },
  shUrgentPillWrap: {
    position: 'absolute',
    top: 4,
    left: 4,
    transform: [{ scale: 0.85 }],
  },
  shInfoContainer: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'space-between',
    minHeight: 80,
  },
  shListingTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
  },
  shSpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  shSpecText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  shDot: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  shSellerBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  shSellerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  shBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  shLocationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  shLocationText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  shPriceText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#ea580c',
  },
  cardContent: {
    padding: 14,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageBadgesRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  showcaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  showcaseBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  priceAmountText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fb923c',
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  vehicleSpecText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 4,
  },
  locationText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  /* DETAILED FILTER MODAL STYLES */
  filterModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  filterModalResetText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalScroll: {
    flex: 1,
  },
  filterModalScrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  filterCardTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dropdownSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  dropdownSelectedText: {
    color: '#0f172a',
    fontWeight: '800',
  },
  filterTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    textAlign: 'center',
  },
  rangeDash: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipPillActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  chipPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chipPillTextActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
  colorChipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colorChipPillActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkboxRowActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  checkboxLabelActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
  urgentToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  urgentToggleRowActive: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  urgentToggleTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
  },
  urgentToggleSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  filterModalFooter: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  applyFilterBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  applyFilterBtnText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  /* PICKER BOTTOM SHEETS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerItemSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  pickerItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  pickerItemTextSelected: {
    color: '#ea580c',
    fontWeight: '900',
  },
});
