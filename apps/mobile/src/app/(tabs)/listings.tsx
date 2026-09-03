import React, { useState, useEffect, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CLOUDFLARE_VEHICLE_IMAGES } from '../../constants/vehicleImages';
import UrgentBadge from '../../components/UrgentBadge';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const TURKISH_CITIES = [
  'Tümü',
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
  { label: 'Station Wagon', val: 'WAGON' },
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
  const formatted = formatCloudflareImageUrl(url);
  if (formatted) return formatted;

  if (brand && modelFamily) {
    const key = `${brand.toLowerCase().trim()} ${modelFamily.toLowerCase().trim()}`;
    if (CLOUDFLARE_VEHICLE_IMAGES[key]) {
      return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[key]);
    }
    const modelKey = modelFamily.toLowerCase().trim();
    if (CLOUDFLARE_VEHICLE_IMAGES[modelKey]) {
      return formatCloudflareImageUrl(CLOUDFLARE_VEHICLE_IMAGES[modelKey]);
    }
  }
  return 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80';
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
  isUrgent?: boolean;
  isShowcaseFeedActive?: boolean;
  hasAiReport?: boolean;
  sellerType?: string;
  description?: string;
  createdAt?: string;
  media?: ListingMedia[];
  photos?: { url: string }[];
  vehicleVariant?: {
    year?: number;
    brand?: { id?: string; name: string };
    model?: { id?: string; name: string };
    trim?: { id?: string; name: string };
  };
}

interface Brand {
  id: string;
  name: string;
}

interface VehicleModel {
  id: string;
  name: string;
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'km_asc';

export default function ListingsScreen() {
  const router = useRouter();

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // View Mode: 'LIST' or 'CARD'
  const [viewMode, setViewMode] = useState<'LIST' | 'CARD'>('LIST');

  // Filter States
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);

  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [minKm, setMinKm] = useState('');
  const [maxKm, setMaxKm] = useState('');
  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([]);
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSellerTypes, setSelectedSellerTypes] = useState<string[]>([]);
  const [urgentOnly, setUrgentOnly] = useState(false);

  // Sorting
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Modals
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [brandPickerVisible, setBrandPickerVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);

  useEffect(() => {
    fetchBrands();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand.id);
    } else {
      setModels([]);
      setSelectedModel(null);
    }
  }, [selectedBrand]);

  useEffect(() => {
    fetchListings();
  }, [
    selectedBrand,
    selectedModel,
    city,
    district,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    minKm,
    maxKm,
    selectedFuels,
    selectedTransmissions,
    selectedBodyTypes,
    selectedStatuses,
    selectedSellerTypes,
    urgentOnly,
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

  const fetchBrands = async () => {
    try {
      const res = await fetch(`${API_URL}/vehicles/brands`);
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

  const fetchModels = async (brandId: string) => {
    try {
      const res = await fetch(`${API_URL}/vehicles/models?brandId=${brandId}`);
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

  const fetchListings = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/listings?limit=50&`;
      if (selectedBrand) url += `brandId=${selectedBrand.id}&`;
      if (selectedModel) url += `modelId=${selectedModel.id}&`;
      if (search.trim()) url += `keyword=${encodeURIComponent(search.trim())}&`;
      if (city.trim() && city !== 'Tümü') url += `city=${encodeURIComponent(city.trim())}&`;
      if (district.trim()) url += `district=${encodeURIComponent(district.trim())}&`;
      if (minPrice.trim()) url += `minPrice=${minPrice.trim()}&`;
      if (maxPrice.trim()) url += `maxPrice=${maxPrice.trim()}&`;
      if (minYear.trim()) url += `minYear=${minYear.trim()}&`;
      if (maxYear.trim()) url += `maxYear=${maxYear.trim()}&`;
      if (minKm.trim()) url += `minKm=${minKm.trim()}&`;
      if (maxKm.trim()) url += `maxKm=${maxKm.trim()}&`;
      if (urgentOnly) url += `urgentOnly=true&`;

      if (selectedFuels.length === 1) url += `fuelType=${selectedFuels[0]}&`;
      if (selectedTransmissions.length === 1) url += `transmission=${selectedTransmissions[0]}&`;
      if (selectedBodyTypes.length === 1) url += `bodyType=${selectedBodyTypes[0]}&`;
      if (selectedStatuses.length === 1) url += `vehicleStatus=${selectedStatuses[0]}&`;
      if (selectedSellerTypes.length === 1) url += `sellerType=${selectedSellerTypes[0]}&`;

      if (sortOption === 'price_asc') url += `sort=price_asc&`;
      else if (sortOption === 'price_desc') url += `sort=price_desc&`;
      else if (sortOption === 'km_asc') url += `sort=km_asc&`;
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
    setSelectedBrand(null);
    setSelectedModel(null);
    setCity('');
    setDistrict('');
    setMinPrice('');
    setMaxPrice('');
    setMinYear('');
    setMaxYear('');
    setMinKm('');
    setMaxKm('');
    setSelectedFuels([]);
    setSelectedTransmissions([]);
    setSelectedBodyTypes([]);
    setSelectedStatuses([]);
    setSelectedSellerTypes([]);
    setUrgentOnly(false);
    setSearch('');
  };

  const countActiveFilters = () => {
    let count = 0;
    if (selectedBrand) count++;
    if (selectedModel) count++;
    if (city && city !== 'Tümü') count++;
    if (district) count++;
    if (minPrice || maxPrice) count++;
    if (minYear || maxYear) count++;
    if (minKm || maxKm) count++;
    if (selectedFuels.length > 0) count++;
    if (selectedTransmissions.length > 0) count++;
    if (selectedBodyTypes.length > 0) count++;
    if (selectedStatuses.length > 0) count++;
    if (selectedSellerTypes.length > 0) count++;
    if (urgentOnly) count++;
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
          {item.isUrgent && (
            <View style={styles.shUrgentPillWrap}>
              <UrgentBadge size="small" />
            </View>
          )}
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
            {item.isShowcaseFeedActive && (
              <View style={styles.showcaseBadge}>
                <Ionicons name="star" size={11} color="#ffffff" />
                <Text style={styles.showcaseBadgeText}>VİTRİN</Text>
              </View>
            )}
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
          <Text style={styles.vehicleSpecText} numberOfLines={1}>
            {brandName} {modelName} {trimName ? `• ${trimName}` : ''}
          </Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* TOP APPBAR */}
      <View style={styles.topAppBar}>
        <TouchableOpacity
          style={styles.appBarIconBtn}
          onPress={() => router.push('/(tabs)/index' as any)}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.appBarCenter}>
          <Text style={styles.appBarTitle}>Araç İlanları</Text>
          <Text style={styles.appBarSubTitle}>
            {loading ? 'Yükleniyor...' : `${listings.length} ilan`}
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
            {selectedBrand && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => setSelectedBrand(null)}
              >
                <Text style={styles.filterTagPillText}>{selectedBrand.name}</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {selectedModel && (
              <TouchableOpacity
                style={styles.filterTagPill}
                onPress={() => setSelectedModel(null)}
              >
                <Text style={styles.filterTagPillText}>{selectedModel.name}</Text>
                <Ionicons name="close" size={12} color="#ea580c" />
              </TouchableOpacity>
            )}
            {city && city !== 'Tümü' && (
              <TouchableOpacity style={styles.filterTagPill} onPress={() => setCity('')}>
                <Text style={styles.filterTagPillText}>{city}</Text>
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
            {urgentOnly && (
              <TouchableOpacity style={styles.filterTagPill} onPress={() => setUrgentOnly(false)}>
                <Text style={styles.filterTagPillText}>Acil İlanlar</Text>
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
          <ActivityIndicator size="large" color="#ea580c" />
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
      {/* 🌟 WEB-MATCHED DETAILED FILTER MODAL 🌟 */}
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
            {/* 1. ADRES (İL / İLÇE) */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>📍 ADRES (İL / İLÇE)</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setCityPickerVisible(true)}
              >
                <Text style={[styles.dropdownSelectorText, !!city && styles.dropdownSelectedText]}>
                  {city || 'İl Seçin'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TextInput
                style={styles.filterTextInput}
                placeholder="İlçe girin (Örn: Kadıköy)..."
                placeholderTextColor="#94a3b8"
                value={district}
                onChangeText={setDistrict}
              />
            </View>

            {/* 2. MARKA & MODEL */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🚗 MARKA & MODEL</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setBrandPickerVisible(true)}
              >
                <Text
                  style={[
                    styles.dropdownSelectorText,
                    !!selectedBrand && styles.dropdownSelectedText,
                  ]}
                >
                  {selectedBrand ? selectedBrand.name : 'Marka Seçin'}
                </Text>
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

            {/* 6. ARAÇ DURUMU */}
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

            {/* 7. YAKIT TİPİ */}
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

            {/* 8. VİTES TİPİ */}
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

            {/* 9. KASA TİPİ */}
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

            {/* 10. KİMDEN / SATICI TÜRÜ */}
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

            {/* 11. ACİL SATIŞ TOGGLE */}
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
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* BRAND SELECTION SHEET */}
      {/* ========================================================================= */}
      <Modal
        visible={brandPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBrandPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Marka Seçin</Text>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setBrandPickerVisible(false)}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ padding: 14, gap: 8 }}
            >
              <TouchableOpacity
                style={[styles.pickerItem, !selectedBrand && styles.pickerItemSelected]}
                onPress={() => {
                  setSelectedBrand(null);
                  setSelectedModel(null);
                  setBrandPickerVisible(false);
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
              {brands.map((b) => {
                const isSelected = selectedBrand?.id === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setSelectedBrand(b);
                      setSelectedModel(null);
                      setBrandPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        isSelected && styles.pickerItemTextSelected,
                      ]}
                    >
                      {b.name}
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
      </Modal>

      {/* ========================================================================= */}
      {/* MODEL SELECTION SHEET */}
      {/* ========================================================================= */}
      <Modal
        visible={modelPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModelPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedBrand ? `${selectedBrand.name} Modelleri` : 'Model Seçin'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setModelPickerVisible(false)}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ padding: 14, gap: 8 }}
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
      </Modal>

      {/* ========================================================================= */}
      {/* CITY SELECTION SHEET */}
      {/* ========================================================================= */}
      <Modal
        visible={cityPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCityPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>İl Seçin</Text>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setCityPickerVisible(false)}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ padding: 14, gap: 8 }}
            >
              {TURKISH_CITIES.map((c) => {
                const isSelected = city === c || (!city && c === 'Tümü');
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setCity(c === 'Tümü' ? '' : c);
                      setCityPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        isSelected && styles.pickerItemTextSelected,
                      ]}
                    >
                      {c}
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
