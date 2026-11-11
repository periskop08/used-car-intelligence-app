import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Linking,
  ScrollView,
  StatusBar,
  Modal,
  Pressable,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G } from 'react-native-svg';
import { TURKEY_81_PROVINCES } from '@used-car-intelligence/shared';
import { CLOUDFLARE_VEHICLE_IMAGES } from '../constants/vehicleImages';
import UrgentBadge from '../components/UrgentBadge';
import TorkScoutLoader from '../components/TorkScoutLoader';
import ShowcaseBadge from '../components/ShowcaseBadge';
import VehicleConditionVisualizer, { PART_LABELS, CompactMobileVehicleBodySvg } from '../components/VehicleConditionVisualizer';

function SwipeUpHandCoachmark() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [78, -42],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.82, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={styles.swipeCoachOverlay} pointerEvents="none">
      <View style={styles.swipeCoachBox}>
        {/* Vertical Gradient Bar (Matches 2nd Reference Image) */}
        <Svg width={150} height={240} viewBox="0 0 150 240">
          <Defs>
            <LinearGradient id="swipeTrackGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#818cf8" stopOpacity="0.82" />
              <Stop offset="55%" stopColor="#93a3f8" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#93a3f8" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="32" y="12" width="24" height="205" rx="12" fill="url(#swipeTrackGrad)" />
        </Svg>

        {/* Animated Tilted Pointing Hand Gliding Bottom -> Top */}
        <Animated.View
          style={[
            styles.swipeHandAnimatedWrap,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Svg width={125} height={125} viewBox="0 0 130 130">
            <G transform="rotate(-45 55 55)">
              <Path
                d="M 38 66 L 38 18 A 9.5 9.5 0 0 1 57 18 L 57 44 A 8.5 8.5 0 0 1 74 42 L 74 48 A 8.5 8.5 0 0 1 91 48 L 91 55 A 8 8 0 0 1 107 56 L 107 82 C 107 104 90 116 68 116 L 45 116 L 16 87 A 10 10 0 0 1 30 73 L 38 81 Z"
                fill="rgba(139, 152, 246, 0.84)"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </G>
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const TURKISH_CITIES = ['Tümü', ...TURKEY_81_PROVINCES];

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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://used-car-api-hzmu.onrender.com';

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

const FUEL_TYPE_LABELS: Record<string, string> = {
  PETROL: 'Benzin',
  DIESEL: 'Dizel',
  LPG: 'Benzin & LPG',
  HYBRID: 'Hibrit',
  ELECTRIC: 'Elektrik',
  BENZIN: 'Benzin',
  DIZEL: 'Dizel',
  HIBRIT: 'Hibrit',
  ELEKTRIK: 'Elektrik',
};

const TRANSMISSION_LABELS: Record<string, string> = {
  AUTOMATIC: 'Otomatik',
  MANUAL: 'Manuel',
  SEMI_AUTOMATIC: 'Yarı Otomatik',
  DCT: 'Otomatik (DCT / DSG)',
  CVT: 'Otomatik (CVT)',
  OTOMATIK: 'Otomatik',
  MANUEL: 'Manuel',
  YARI_OTOMATIK: 'Yarı Otomatik',
};

const formatFuelType = (fuel?: string | null): string => {
  if (!fuel) return '-';
  const upper = fuel.toUpperCase();
  return FUEL_TYPE_LABELS[upper] || fuel;
};

const formatTransmission = (trans?: string | null): string => {
  if (!trans) return '-';
  const upper = trans.toUpperCase();
  return TRANSMISSION_LABELS[upper] || trans;
};

interface Photo {
  id: string;
  url: string;
  order: number;
}

interface Seller {
  id: string;
  displayName: string;
  memberSince: string;
  avatarUrl: string | null;
}

interface Vehicle {
  brand: string;
  modelFamily: string;
  modelName: string;
  vehicleType?: string;
  year: number;
  fuelType: string;
  transmissionType: string;
  condition: string;
  mileage: number;
  bodyType: string;
  enginePower: string;
  engineCapacity: string;
  drivetrain: string;
  color: string;
  warranty: boolean;
  heavyDamage: boolean;
  plateOrigin: string;
  sellerType: string;
  exchange: boolean;
  trimPackage: string | null;
  engineVersion: string | null;
}

interface TechnicalSummary {
  maxPower: string | null;
  topSpeed: string | null;
  acceleration0100: string | null;
  fuelConsumption: string | null;
}

interface IsiCepteProviderPostData {
  id: string;
  businessName: string;
  cityName: string;
  districtName?: string | null;
  profileImageUrl?: string | null;
  postTitle: string;
  postDescription: string;
  postImageUrl?: string | null;
  rating?: number | null;
  phone?: string | null;
  address?: string | null;
  profileUrl?: string | null;
  isShowcaseActive?: boolean;
  supportedBrands?: string[];
  serviceCategories?: string[];
}

interface ListingFeedItem {
  id: string;
  itemType?: 'VEHICLE_LISTING' | 'ISICEPTE_PROVIDER_POST';
  providerPost?: IsiCepteProviderPostData;
  title: string;
  price: number;
  currency: string;
  listingDate: string;
  listingNo: string;
  description?: string;
  location: { city: string; district: string };
  seller: Seller;
  vehicle: Vehicle;
  photos: Photo[];
  technicalSummary: TechnicalSummary;
  breadcrumb: string[];
  isFavorite: boolean;
  isUrgent?: boolean;
  isShowcaseFeedActive?: boolean;
  detailUrl: string;
  localPaintedParts?: string[];
  paintedParts?: string[];
  changedParts?: string[];
  damageRecord?: string | null;
  tramerAmount?: number;
}

const matchesFeedCategory = (item: ListingFeedItem, cat: ListingVehicleCategory): boolean => {
  if (!cat || cat === 'ALL') return true;
  if (item.itemType === 'ISICEPTE_PROVIDER_POST') return false;
  const vType = (item.vehicle?.vehicleType || '').toUpperCase();
  const bType = (item.vehicle?.bodyType || '').toUpperCase();

  if (cat === 'MOTORCYCLE') {
    return vType === 'MOTORCYCLE' || bType === 'MOTORCYCLE';
  }
  if (cat === 'MINIVAN_PANELVAN') {
    return (
      vType === 'MINIVAN_PANELVAN' ||
      bType === 'MINIVAN' ||
      bType === 'VAN' ||
      bType === 'PANELVAN'
    );
  }
  if (cat === 'SUV_PICKUP') {
    return vType === 'SUV_PICKUP' || bType === 'SUV' || bType === 'PICKUP';
  }
  if (cat === 'AUTOMOBILE') {
    if (vType === 'MOTORCYCLE' || vType === 'MINIVAN_PANELVAN' || vType === 'SUV_PICKUP') return false;
    if (
      bType === 'SUV' ||
      bType === 'PICKUP' ||
      bType === 'MINIVAN' ||
      bType === 'VAN' ||
      bType === 'PANELVAN' ||
      bType === 'MOTORCYCLE'
    ) {
      return false;
    }
    return true;
  }
  return true;
};

const matchesFeedCity = (item: ListingFeedItem, cityFilter: string): boolean => {
  if (!cityFilter || cityFilter === 'Tümü') return true;
  const itemCity = (item.location?.city || '').trim();
  return itemCity.toLocaleLowerCase('tr-TR') === cityFilter.trim().toLocaleLowerCase('tr-TR');
};

export default function ListingFeedScreen() {
  const router = useRouter();
  const [feedHeight, setFeedHeight] = useState<number>(windowHeight - 90);
  const [photoBoxWidth, setPhotoBoxWidth] = useState<number>(windowWidth - 48);
  const [descBodyLines, setDescBodyLines] = useState<number>(8);

  const [listings, setListings] = useState<ListingFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [seed, setSeed] = useState<string>('');

  // Filter States (Sadece Vasıta Türü ve İl)
  const [selectedCategory, setSelectedCategory] = useState<ListingVehicleCategory>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [cityPickerVisible, setCityPickerVisible] = useState<boolean>(false);
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');

  const activeFilterCount = (selectedCategory !== 'ALL' ? 1 : 0) + (selectedCity ? 1 : 0);

  const filteredCities = useMemo(() => {
    const q = citySearchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return TURKISH_CITIES;
    return TURKISH_CITIES.filter((c) => c.toLocaleLowerCase('tr-TR').includes(q));
  }, [citySearchQuery]);

  const filteredListings = useMemo(() => {
    return listings.filter(
      (item) => matchesFeedCategory(item, selectedCategory) && matchesFeedCity(item, selectedCity)
    );
  }, [listings, selectedCategory, selectedCity]);

  const handleClearFilters = () => {
    setSelectedCategory('ALL');
    setSelectedCity('');
  };

  // States per listing id
  const [activeTabs, setActiveTabs] = useState<Record<string, 'info' | 'expertise'>>({});
  const [activePhotoIndices, setActivePhotoIndices] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [selectedExpertiseItem, setSelectedExpertiseItem] = useState<ListingFeedItem | null>(null);
  const [selectedDescriptionItem, setSelectedDescriptionItem] = useState<ListingFeedItem | null>(null);
  const [selectedProviderPost, setSelectedProviderPost] = useState<IsiCepteProviderPostData | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(true);

  const [seenIds, setSeenIds] = useState<string[]>([]);
  const loadingMoreRef = useRef(false);
  const viewedLogged = useRef<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      setShowSwipeHint(true);
    }, [])
  );

  useEffect(() => {
    const initialSeed = Math.random().toString(36).substring(2, 15);
    setSeed(initialSeed);
    fetchFeed(initialSeed, true, []);
    logAnalyticsEvent('listing_feed_opened', {});
  }, []);

  const getHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchFeed = async (activeSeed: string, replace: boolean, currentSeen: string[]) => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    if (replace) setLoading(true);

    try {
      const excludeIdsParam = currentSeen.slice(-100).join(',');
      const headers = await getHeaders();
      const response = await fetch(
        `${API_URL}/listings/feed?limit=50&seed=${activeSeed}&excludeIds=${excludeIdsParam}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('İlan akışı yüklenirken bir sorun oluştu.');
      }

      const data = await response.json();
      const rawItems = data.items || [];
      const newItems: ListingFeedItem[] = rawItems.map((item: any) => {
        if (item.type === 'ISICEPTE_PROVIDER_POST') {
          const pData = item.data || item;
          return {
            id: item.id || pData.id || String(Math.random()),
            itemType: 'ISICEPTE_PROVIDER_POST',
            providerPost: pData,
            title: pData.postTitle || pData.businessName || 'İşiCepte Usta Paylaşımı',
            price: 0,
            currency: 'TRY',
            listingDate: '',
            listingNo: '',
            location: { city: pData.cityName || '', district: pData.districtName || '' },
            seller: { id: '', displayName: pData.businessName || '', memberSince: '', avatarUrl: pData.profileImageUrl || null },
            vehicle: {} as any,
            photos: [],
            technicalSummary: {} as any,
            breadcrumb: [],
            isFavorite: false,
            detailUrl: '',
          };
        }
        const vData = item.data || item;
        return {
          ...vData,
          id: item.id || vData.id,
          itemType: 'VEHICLE_LISTING',
          localPaintedParts: vData.localPaintedParts || [],
          paintedParts: vData.paintedParts || [],
          changedParts: vData.changedParts || [],
        };
      });

      if (replace) {
        setListings(newItems);
        const tabs: Record<string, 'info' | 'expertise'> = {};
        const photos: Record<string, number> = {};
        const favs: Record<string, boolean> = {};

        newItems.forEach((x) => {
          tabs[x.id] = 'info';
          photos[x.id] = 0;
          favs[x.id] = x.isFavorite;
        });

        setActiveTabs(tabs);
        setActivePhotoIndices(photos);
        setFavorites(favs);
      } else {
        setListings((prev) => {
          const filtered = newItems.filter((item) => !prev.some((p) => p.id === item.id));
          return [...prev, ...filtered];
        });

        setActiveTabs((prev) => {
          const updated = { ...prev };
          newItems.forEach((x) => {
            if (!updated[x.id]) updated[x.id] = 'info';
          });
          return updated;
        });

        setActivePhotoIndices((prev) => {
          const updated = { ...prev };
          newItems.forEach((x) => {
            if (updated[x.id] === undefined) updated[x.id] = 0;
          });
          return updated;
        });

        setFavorites((prev) => {
          const updated = { ...prev };
          newItems.forEach((x) => {
            if (updated[x.id] === undefined) updated[x.id] = x.isFavorite;
          });
          return updated;
        });
      }

      setHasMore(data.hasMore);
      if (data.nextSeed) setSeed(data.nextSeed);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Hata oluştu.');
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  };

  const logAnalyticsEvent = async (eventName: string, params: Record<string, any>) => {
    console.log(`[Mobile Analytics] ${eventName}:`, {
      ...params,
      source: 'listing_feed',
      timestamp: new Date().toISOString(),
    });
    const headers = await getHeaders();
    fetch(`${API_URL}/audit-logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: eventName, details: params }),
    }).catch(() => {});
  };

  const handleFavoriteToggle = async (id: string, item: ListingFeedItem) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      alert('Devam etmek için ücretsiz giriş yapmalısın.');
      router.push('/login');
      return;
    }

    const currentFav = favorites[id];
    setFavorites((prev) => ({ ...prev, [id]: !currentFav }));

    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/listings/${id}/favorite`, {
        method: 'POST',
        headers,
      });
      if (!response.ok) throw new Error();
      logAnalyticsEvent('listing_feed_favorite_clicked', { listingId: id, sellerId: item.seller.id });
    } catch {
      setFavorites((prev) => ({ ...prev, [id]: currentFav }));
      alert('Favorilere eklenirken bir hata oluştu.');
    }
  };

  const handleShare = async (item: ListingFeedItem) => {
    const shareUrl = `https://torquescout.com/listings/${item.id}`;
    logAnalyticsEvent('listing_feed_share_clicked', { listingId: item.id });
    try {
      await Share.share({
        message: `${item.title}\n${shareUrl}`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoToListing = (item: ListingFeedItem) => {
    logAnalyticsEvent('listing_feed_go_to_listing_clicked', { listingId: item.id });
    router.push(`/listings/${item.id}` as any);
  };

  const handleMessage = async (item: ListingFeedItem) => {
    logAnalyticsEvent('listing_feed_message_clicked', { listingId: item.id });
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      alert('Devam etmek için ücretsiz giriş yapmalısın.');
      router.push('/login');
      return;
    }
    router.push(`/messages/${item.id}` as any);
  };

  // Visibility Config for 70% visible / 500ms duration
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 500,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    viewableItems.forEach((viewable: any) => {
      if (viewable.isViewable && viewable.item) {
        const item: ListingFeedItem = viewable.item;
        if (!viewedLogged.current[item.id]) {
          viewedLogged.current[item.id] = true;
          if (item.itemType !== 'ISICEPTE_PROVIDER_POST') {
            logAnalyticsEvent('listing_feed_item_viewed', {
              listingId: item.id,
              sellerId: item.seller?.id,
              brand: item.vehicle?.brand,
              modelFamily: item.vehicle?.modelFamily,
              year: item.vehicle?.year,
              position: viewable.index,
            });
          }

          setSeenIds((prev) => {
            if (prev.includes(item.id)) return prev;
            return [...prev, item.id];
          });

          if (item.itemType !== 'ISICEPTE_PROVIDER_POST') {
            // Live Condition Synchronizer: Guarantees 1:1 match with real vehicle listing
            fetch(`${API_URL}/listings/${item.id}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((detail) => {
                if (detail) {
                  setListings((prev) =>
                    prev.map((l) =>
                      l.id === item.id
                        ? {
                            ...l,
                            localPaintedParts: detail.localPaintedParts || [],
                            paintedParts: detail.paintedParts || [],
                            changedParts: detail.changedParts || [],
                            damageRecord: detail.damageRecord || null,
                            tramerAmount: detail.tramerAmount || 0,
                          }
                        : l
                    )
                  );
                }
              })
              .catch(() => {});
          }
        }

        // Prefetch next page
        if (viewable.index >= listings.length - 3 && hasMore) {
          const nextSeen = [...seenIds, ...listings.map((x) => x.id)];
          fetchFeed(seed, false, nextSeen);
        }
      }
    });
  }).current;

  const renderFeedItem = ({ item, index }: { item: ListingFeedItem; index: number }) => {
    if (item.itemType === 'ISICEPTE_PROVIDER_POST' && item.providerPost) {
      const post = item.providerPost;
      return (
        <View style={[styles.cardContainer, { height: feedHeight }]}>
          {/* Top Header Actions */}
          <View style={styles.topActions}>
            <TouchableOpacity
              onPress={() => setFilterModalVisible(true)}
              style={[styles.filterTopBtn, activeFilterCount > 0 && styles.filterTopBtnActive]}
              activeOpacity={0.85}
            >
              <Ionicons
                name="options-outline"
                size={17}
                color={activeFilterCount > 0 ? '#ffffff' : '#0f172a'}
              />
              <Text
                style={[
                  styles.filterTopBtnText,
                  activeFilterCount > 0 && styles.filterTopBtnTextActive,
                ]}
              >
                Filtre{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
            </TouchableOpacity>

            <Text style={styles.feedTitle}>🔧 İŞİCEPTE USTA</Text>

            <View style={styles.row}>
              <TouchableOpacity
                onPress={() => router.push('/isicepte' as any)}
                style={styles.darkCircularBtn}
              >
                <Ionicons name="compass-outline" size={19} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.cardFrame, styles.providerCardFrame]}
            activeOpacity={0.92}
            onPress={() => setSelectedProviderPost(post)}
          >
            {/* Provider Header */}
            <View style={styles.providerHeaderRow}>
              <View style={styles.providerAvatarBox}>
                {post.profileImageUrl ? (
                  <ExpoImage
                    source={{ uri: formatCloudflareImageUrl(post.profileImageUrl) }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.providerAvatarInitials}>
                    {(post.businessName || 'İS').slice(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.providerBusinessName} numberOfLines={1}>
                    {post.businessName}
                  </Text>
                  {post.isShowcaseActive && (
                    <View style={styles.providerShowcaseBadge}>
                      <Text style={styles.providerShowcaseBadgeText}>ÖNE ÇIKAN</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.providerLocationText} numberOfLines={1}>
                  📍 {post.cityName}
                  {post.districtName ? ` • ${post.districtName}` : ''}
                </Text>
              </View>

              <View style={styles.providerTypeBadge}>
                <Text style={styles.providerTypeBadgeText}>İŞİCEPTE USTA</Text>
              </View>
            </View>

            {/* Post Image */}
            <View style={styles.providerMediaContainer}>
              {post.postImageUrl ? (
                <ExpoImage
                  source={{ uri: formatCloudflareImageUrl(post.postImageUrl) }}
                  style={styles.photoImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.providerMediaPlaceholder}>
                  <Ionicons name="construct-outline" size={44} color="#64748b" />
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                    Servis ve Bakım Paylaşımı
                  </Text>
                </View>
              )}

              <View style={styles.providerMediaOverlayBottom}>
                <View style={styles.providerMediaPill}>
                  <Text style={styles.providerMediaPillText}>🔧 Gerçek Servis Kaydı</Text>
                </View>
                {post.rating ? (
                  <View style={styles.providerMediaPill}>
                    <Text style={[styles.providerMediaPillText, { color: '#fbbf24' }]}>
                      ⭐ {Number(post.rating).toFixed(1)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Post Title & Description */}
            <View style={styles.providerBodyBox}>
              <Text style={styles.providerPostTitle} numberOfLines={2}>
                {post.postTitle}
              </Text>
              <Text style={styles.providerPostDesc} numberOfLines={4}>
                {post.postDescription}
              </Text>

              {post.serviceCategories && post.serviceCategories.length > 0 && (
                <View style={styles.providerTagsWrap}>
                  {post.serviceCategories.slice(0, 4).map((cat, idx) => (
                    <View key={idx} style={styles.providerTagChip}>
                      <Text style={styles.providerTagChipText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Bottom CTAs */}
            <View style={styles.cardContentBottom}>
              <View style={styles.ctaContainer}>
                <TouchableOpacity
                  onPress={() => router.push('/isicepte' as any)}
                  style={styles.ctaBtnOutline}
                  activeOpacity={0.8}
                >
                  <Ionicons name="shield-checkmark-outline" size={17} color="#0f172a" style={{ marginRight: 6 }} />
                  <Text style={styles.ctaTextOutline}>Tüm Servisler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedProviderPost(post)}
                  style={styles.ctaBtnSolid}
                  activeOpacity={0.85}
                >
                  <Ionicons name="eye-outline" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.ctaTextSolid}>Detayları İncele ➔</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    const activeTab = activeTabs[item.id] || 'info';
    const activePhoto = activePhotoIndices[item.id] || 0;
    const isFav = favorites[item.id] || false;

    const rawPhotoUrl = item.photos?.[activePhoto]?.url;
    const resolvedPhotoUrl = resolveVehicleImageUrl(
      rawPhotoUrl,
      item.vehicle?.brand,
      item.vehicle?.modelFamily
    );

    return (
      <View style={[styles.cardContainer, { height: feedHeight }]}>
        {/* Top Header Actions */}
        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={[styles.filterTopBtn, activeFilterCount > 0 && styles.filterTopBtnActive]}
            activeOpacity={0.85}
          >
            <Ionicons
              name="options-outline"
              size={17}
              color={activeFilterCount > 0 ? '#ffffff' : '#0f172a'}
            />
            <Text
              style={[
                styles.filterTopBtnText,
                activeFilterCount > 0 && styles.filterTopBtnTextActive,
              ]}
            >
              Filtre{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>

          <Text style={styles.feedTitle}>📦 İLAN AKIŞI</Text>

          <View style={styles.row}>
            <TouchableOpacity onPress={() => handleShare(item)} style={styles.darkCircularBtn}>
              <Ionicons name="share-social-outline" size={19} color="#0f172a" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleFavoriteToggle(item.id, item)}
              style={[
                styles.darkCircularBtn,
                isFav && { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
              ]}
            >
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={19} color={isFav ? '#ef4444' : '#0f172a'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* DISTINCT FRAMED CARD CONTAINER */}
        <View style={styles.cardFrame}>
          {/* TOP SECTION: Photo, Title, Breadcrumb, Tabs, Table, Expanding Description */}
          <View style={styles.cardContentTop}>
            {/* 1. Photo Carousel (Swipeable Left/Right Only on Photo Container, No Arrows) */}
            <View
              style={styles.photoContainer}
              onLayout={(e) => {
                const w = Math.round(e.nativeEvent.layout.width);
                if (w > 50 && Math.abs(w - photoBoxWidth) > 1) {
                  setPhotoBoxWidth(w);
                }
              }}
            >
              {item.photos && item.photos.length > 1 ? (
                <ScrollView
                  horizontal
                  pagingEnabled
                  nestedScrollEnabled
                  directionalLockEnabled
                  showsHorizontalScrollIndicator={false}
                  bounces={false}
                  decelerationRate="fast"
                  scrollEventThrottle={16}
                  onScroll={(e) => {
                    const offsetX = e.nativeEvent.contentOffset.x;
                    if (photoBoxWidth > 0) {
                      const idx = Math.round(offsetX / photoBoxWidth);
                      const clamped = Math.max(0, Math.min(item.photos.length - 1, idx));
                      if (clamped !== activePhoto) {
                        setActivePhotoIndices((prev) => ({
                          ...prev,
                          [item.id]: clamped,
                        }));
                      }
                    }
                  }}
                  style={{ width: photoBoxWidth, height: '100%' }}
                >
                  {item.photos.map((photo, pIdx) => {
                    const pUrl = resolveVehicleImageUrl(
                      photo?.url,
                      item.vehicle?.brand,
                      item.vehicle?.modelFamily
                    );
                    return (
                      <View
                        key={photo.id || String(pIdx)}
                        style={{ width: photoBoxWidth, height: '100%' }}
                      >
                        <ExpoImage
                          source={{ uri: pUrl }}
                          style={styles.photoImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <ExpoImage
                  source={{ uri: resolvedPhotoUrl }}
                  style={styles.photoImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}

              {/* Promotional Badges: Urgent & Showcase */}
              {(item.isUrgent || item.isShowcaseFeedActive) && (
                <View style={styles.promoBadgesWrap} pointerEvents="none">
                  {item.isUrgent && <UrgentBadge size="small" />}
                  {item.isShowcaseFeedActive && <ShowcaseBadge size="small" />}
                </View>
              )}

              {item.photos && item.photos.length > 1 && (
                <View style={styles.photoCountBadge} pointerEvents="none">
                  <Text style={styles.photoCountText}>
                    {activePhoto + 1} / {item.photos.length}
                  </Text>
                </View>
              )}
            </View>

            {/* 2. Title & Seller Info */}
            <View style={styles.detailsContainer}>
              <Text style={styles.titleText} numberOfLines={1}>
                {item.title.toUpperCase()}
              </Text>
              <View style={styles.infoLine}>
                <View style={styles.metaItem}>
                  <Ionicons name="person" size={13} color="#64748b" style={{ marginRight: 4 }} />
                  <Text style={styles.infoSubText} numberOfLines={1}>
                    {item.seller.displayName} ({item.seller.memberSince})
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="location-sharp" size={13} color="#ef4444" style={{ marginRight: 2 }} />
                  <Text style={styles.infoSubText} numberOfLines={1}>
                    {item.location.city}, {item.location.district || 'Merkez'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. Breadcrumb */}
            <View style={styles.breadcrumbContainer}>
              <Text style={styles.breadcrumbText} numberOfLines={1}>
                {item.breadcrumb && item.breadcrumb.length > 0
                  ? item.breadcrumb.join(' > ')
                  : `Vasıta > Otomobil > ${item.vehicle.brand} > ${item.vehicle.modelFamily}`}
              </Text>
            </View>

            {/* 4. Tab Bar (Özellikler & Ekspertiz Durumu) */}
            <View style={styles.tabBar}>
              {(['info', 'expertise'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                  onPress={() => setActiveTabs((prev) => ({ ...prev, [item.id]: tab }))}
                >
                  <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                    {tab === 'info' ? '📋 Özellikler' : '🛡️ Ekspertiz Durumu'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 5. Tab Content Box (Özellikler or Ekspertiz Durumu) */}
            <View style={styles.tabContentContainer}>
              {activeTab === 'info' ? (
                <View style={styles.scrollInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Fiyat</Text>
                    <Text style={styles.infoValuePrice}>
                      {(item.price ?? 0).toLocaleString('tr-TR')} {item.currency || 'TL'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>İlan No</Text>
                    <Text style={styles.infoValue}>{item.listingNo}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Yıl / KM</Text>
                    <Text style={styles.infoValue}>{item.vehicle.year} • {(item.vehicle.mileage ?? 0).toLocaleString('tr-TR')} km</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Yakıt / Vites</Text>
                    <Text style={styles.infoValue}>
                      {formatFuelType(item.vehicle.fuelType)} • {formatTransmission(item.vehicle.transmissionType)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.expertiseContainer}>
                  {/* Left: Interactive Compact Vehicle Body SVG */}
                  <TouchableOpacity
                    onPress={() => setSelectedExpertiseItem(item)}
                    style={styles.compactSvgBox}
                    activeOpacity={0.8}
                  >
                    <CompactMobileVehicleBodySvg
                      localPaintedParts={item.localPaintedParts}
                      paintedParts={item.paintedParts}
                      changedParts={item.changedParts}
                      width={38}
                      height={76}
                    />
                  </TouchableOpacity>

                  {/* Right: Damage Status Breakdown */}
                  <View style={styles.expertiseInfoBox}>
                    {(() => {
                      const localList = item.localPaintedParts || [];
                      const paintedList = item.paintedParts || [];
                      const changedList = item.changedParts || [];
                      const hasIssues = localList.length > 0 || paintedList.length > 0 || changedList.length > 0;

                      if (!hasIssues) {
                        return (
                          <View style={{ justifyContent: 'center', height: '100%', gap: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="shield-checkmark" size={13} color="#10b981" />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#10b981' }}>
                                Hatasız & Orijinal
                              </Text>
                            </View>
                            <Text style={{ fontSize: 9.5, color: '#64748b' }} numberOfLines={1}>
                              Boya veya değişen parçası yoktur.
                            </Text>
                            <TouchableOpacity
                              onPress={() => setSelectedExpertiseItem(item)}
                              style={{ alignSelf: 'flex-start', marginTop: 2 }}
                            >
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#ea580c' }}>
                                Detaylı Şemayı Gör ➔
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      }

                      return (
                        <View style={{ justifyContent: 'space-evenly', height: '100%' }}>
                          {localList.length > 0 && (
                            <View style={styles.infoRowCompact}>
                              <Text style={[styles.infoLabelCompact, { color: '#d97706' }]}>Lokal ({localList.length})</Text>
                              <Text style={[styles.infoValCompact, { color: '#b45309' }]} numberOfLines={1}>
                                {localList.map((p) => PART_LABELS[p] || p).join(', ')}
                              </Text>
                            </View>
                          )}
                          {paintedList.length > 0 && (
                            <View style={styles.infoRowCompact}>
                              <Text style={[styles.infoLabelCompact, { color: '#2563eb' }]}>Boyalı ({paintedList.length})</Text>
                              <Text style={[styles.infoValCompact, { color: '#1d4ed8' }]} numberOfLines={1}>
                                {paintedList.map((p) => PART_LABELS[p] || p).join(', ')}
                              </Text>
                            </View>
                          )}
                          {changedList.length > 0 && (
                            <View style={styles.infoRowCompact}>
                              <Text style={[styles.infoLabelCompact, { color: '#dc2626' }]}>Değişen ({changedList.length})</Text>
                              <Text style={[styles.infoValCompact, { color: '#b91c1c' }]} numberOfLines={1}>
                                {changedList.map((p) => PART_LABELS[p] || p).join(', ')}
                              </Text>
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => setSelectedExpertiseItem(item)}
                            style={{ alignSelf: 'flex-end', marginTop: 1 }}
                          >
                            <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#ea580c' }}>
                              Detaylı Şemayı Gör ➔
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })()}
                  </View>
                </View>
              )}
            </View>

            {/* 6. Dedicated Açıklamalar Kartı (Alt Butonlara Kadar Tam Boyutlu) */}
            <TouchableOpacity
              style={styles.descriptionCard}
              activeOpacity={0.85}
              onPress={() => setSelectedDescriptionItem(item)}
            >
              <View style={styles.descriptionCardHeader}>
                <Text style={styles.descriptionCardTitle}>📝 İlan Açıklaması</Text>
                <TouchableOpacity onPress={() => setSelectedDescriptionItem(item)}>
                  <Text style={styles.descriptionDetailLink}>Devamını Oku ➔</Text>
                </TouchableOpacity>
              </View>
              <View
                style={styles.descriptionBodyContainer}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 20) {
                    const computedLines = Math.max(3, Math.floor(h / 16.5));
                    if (computedLines !== descBodyLines) {
                      setDescBodyLines(computedLines);
                    }
                  }
                }}
              >
                <Text
                  style={styles.descriptionCardBody}
                  numberOfLines={descBodyLines}
                  ellipsizeMode="tail"
                >
                  {item.description
                    ? item.description.replace(/\n{3,}/g, '\n\n').trim()
                    : 'Bu araç TorqueScout yapay zeka analizinden geçmiştir. Ekspertiz, hasar ve kronik sorun kayıtları denetlenmiştir.'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* BOTTOM SECTION: CTA Action Buttons */}
          <View style={styles.cardContentBottom}>
            <View style={styles.ctaContainer}>
              <TouchableOpacity
                onPress={() => handleGoToListing(item)}
                style={styles.ctaBtnOutline}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={17} color="#0f172a" style={{ marginRight: 6 }} />
                <Text style={styles.ctaTextOutline}>İlana Git</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMessage(item)}
                style={styles.ctaBtnSolid}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.ctaTextSolid}>Mesaj Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f9" />
      {loading && listings.length === 0 ? (
        <View style={styles.centered}>
          <TorkScoutLoader />
          <Text style={styles.loadingText}>Akış hazırlanıyor...</Text>
        </View>
      ) : error && listings.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchFeed(seed || 'retry', true, [])}
          >
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : filteredListings.length === 0 ? (
        <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 6 }}>
          <View style={styles.topActions}>
            <TouchableOpacity
              onPress={() => setFilterModalVisible(true)}
              style={[styles.filterTopBtn, activeFilterCount > 0 && styles.filterTopBtnActive]}
              activeOpacity={0.85}
            >
              <Ionicons
                name="options-outline"
                size={17}
                color={activeFilterCount > 0 ? '#ffffff' : '#0f172a'}
              />
              <Text
                style={[
                  styles.filterTopBtnText,
                  activeFilterCount > 0 && styles.filterTopBtnTextActive,
                ]}
              >
                Filtre{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
            </TouchableOpacity>

            <Text style={styles.feedTitle}>📦 İLAN AKIŞI</Text>

            <View style={{ width: 38 }} />
          </View>
          <View style={styles.centered}>
            <Ionicons name="film-outline" size={48} color="#64748b" />
            <Text style={styles.errorText}>
              {activeFilterCount > 0
                ? 'Seçtiğiniz filtreye uygun akış ilanı bulunamadı.'
                : 'Gösterilecek vitrin ve acil ilan bulunmuyor.'}
            </Text>
            <Text style={styles.subText}>
              {activeFilterCount > 0
                ? 'Vasıta türü veya il filtresini değiştirerek diğer akış ilanlarını inceleyebilirsiniz.'
                : 'Yeni vitrin ve acil paketli ilanlar yayınlandığında burada listelenecektir.'}
            </Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity style={styles.retryBtn} onPress={handleClearFilters}>
                <Text style={styles.retryText}>Filtreleri Temizle</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View
          style={styles.feedWrapper}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 100 && Math.abs(h - feedHeight) > 1) {
              setFeedHeight(h);
            }
          }}
        >
          <FlatList
            data={filteredListings}
            renderItem={renderFeedItem}
            keyExtractor={(item) => item.id}
            pagingEnabled={true}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            snapToInterval={feedHeight}
            snapToAlignment="start"
            getItemLayout={(_, index) => ({
              length: feedHeight,
              offset: feedHeight * index,
              index,
            })}
            scrollEventThrottle={16}
            onScroll={(e) => {
              if (showSwipeHint && e.nativeEvent.contentOffset.y > 15) {
                setShowSwipeHint(false);
              }
            }}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            style={styles.feedList}
          />
          {showSwipeHint && <SwipeUpHandCoachmark />}
        </View>
      )}

      {/* ========================================================================= */}
      {/* İLAN AKIŞI FİLTRE MODALI (SADECE VASITA TÜRÜ VE İL) */}
      {/* ========================================================================= */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <SafeAreaView style={styles.filterModalContainer}>
          {/* Modal Header */}
          <View style={styles.filterModalHeader}>
            <TouchableOpacity onPress={handleClearFilters}>
              <Text style={styles.filterModalResetText}>Temizle</Text>
            </TouchableOpacity>
            <Text style={styles.filterModalTitle}>Akış Filtreleme</Text>
            <TouchableOpacity
              style={styles.modalCloseCircle}
              onPress={() => setFilterModalVisible(false)}
            >
              <Ionicons name="close" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.filterModalScroll}
            contentContainerStyle={styles.filterModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. VASITA TÜRÜ */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>🚘 VASITA TÜRÜ</Text>
              <View style={{ gap: 8 }}>
                {[
                  {
                    id: 'ALL' as ListingVehicleCategory,
                    name: 'Tüm Vasıta Türleri (Karışık)',
                    icon: 'view-grid-outline' as keyof typeof MaterialCommunityIcons.glyphMap,
                  },
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
                      onPress={() => setSelectedCategory(cat.id)}
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

            {/* 2. İL SEÇİMİ */}
            <View style={styles.filterCard}>
              <Text style={styles.filterCardTitle}>📍 İL SEÇİMİ</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => {
                  setCitySearchQuery('');
                  setCityPickerVisible(true);
                }}
              >
                <Text
                  style={[
                    styles.dropdownSelectorText,
                    !!selectedCity && styles.dropdownSelectedText,
                    { flexShrink: 1 },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selectedCity || 'İl Seçin (81 İl)'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
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
                Filtreleri Uygula ({filteredListings.length} İlan)
              </Text>
            </TouchableOpacity>
          </View>

          {/* IN-MODAL CITY SELECTION OVERLAY (81 İL + INSTANT SEARCH) */}
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
                    placeholder="İl ara... (Örn: İstanbul, Ankara, İzmir)"
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
                    const isSelected = selectedCity === c || (!selectedCity && c === 'Tümü');
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          const nextCity = c === 'Tümü' ? '' : c;
                          setSelectedCity(nextCity);
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
        </SafeAreaView>
      </Modal>

      {/* Full Expertise / Condition Modal */}
      {selectedExpertiseItem && (
        <Modal
          visible={!!selectedExpertiseItem}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedExpertiseItem(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedExpertiseItem(null)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="shield-checkmark" size={20} color="#ea580c" />
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    Ekspertiz ve Boya/Değişen Durumu
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedExpertiseItem(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: windowHeight * 0.72 }} showsVerticalScrollIndicator={false}>
                <VehicleConditionVisualizer
                  paintedParts={selectedExpertiseItem.paintedParts}
                  changedParts={selectedExpertiseItem.changedParts}
                  localPaintedParts={selectedExpertiseItem.localPaintedParts}
                  damageRecord={selectedExpertiseItem.damageRecord || undefined}
                  tramerAmount={selectedExpertiseItem.tramerAmount || 0}
                />
              </ScrollView>

              <TouchableOpacity
                onPress={() => setSelectedExpertiseItem(null)}
                style={styles.modalDoneBtn}
              >
                <Text style={styles.modalDoneText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Full Listing Description Modal (Same as Web Devamını Oku Modal) */}
      {selectedDescriptionItem && (
        <Modal
          visible={!!selectedDescriptionItem}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSelectedDescriptionItem(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedDescriptionItem(null)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name="document-text" size={20} color="#ea580c" />
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    İlan Açıklaması
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedDescriptionItem(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.descModalMetaRow}>
                <Text style={styles.descModalVehicleTitle} numberOfLines={2}>
                  {selectedDescriptionItem.title}
                </Text>
                {selectedDescriptionItem.listingNo ? (
                  <Text style={styles.descModalListingNo}>
                    İlan No: {selectedDescriptionItem.listingNo}
                  </Text>
                ) : null}
              </View>

              <ScrollView
                style={{ maxHeight: windowHeight * 0.55 }}
                contentContainerStyle={{ paddingVertical: 8 }}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.descModalBodyText}>
                  {selectedDescriptionItem.description && selectedDescriptionItem.description.trim()
                    ? selectedDescriptionItem.description.trim()
                    : 'Bu araç TorqueScout yapay zeka analizinden geçmiştir. Ekspertiz, hasar ve kronik sorun kayıtları denetlenmiştir.'}
                </Text>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => setSelectedDescriptionItem(null)}
                  style={[styles.modalDoneBtn, { flex: 1, marginTop: 0, backgroundColor: '#f1f5f9' }]}
                >
                  <Text style={[styles.modalDoneText, { color: '#334155' }]}>Kapat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const item = selectedDescriptionItem;
                    setSelectedDescriptionItem(null);
                    handleGoToListing(item);
                  }}
                  style={[styles.modalDoneBtn, { flex: 1, marginTop: 0 }]}
                >
                  <Text style={styles.modalDoneText}>İlana Git ➔</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* İşiCepte Provider Post Detail Modal (Same as Web IsiCeptePostDetailModal) */}
      {selectedProviderPost && (
        <Modal
          visible={!!selectedProviderPost}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedProviderPost(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedProviderPost(null)}
            />
            <View style={[styles.modalCard, { maxWidth: 400 }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={styles.providerAvatarBox}>
                    {selectedProviderPost.profileImageUrl ? (
                      <ExpoImage
                        source={{ uri: formatCloudflareImageUrl(selectedProviderPost.profileImageUrl) }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={styles.providerAvatarInitials}>
                        {(selectedProviderPost.businessName || 'İS').slice(0, 2).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle} numberOfLines={1}>
                      {selectedProviderPost.businessName}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>
                      📍 {selectedProviderPost.cityName}
                      {selectedProviderPost.districtName ? ` • ${selectedProviderPost.districtName}` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedProviderPost(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ maxHeight: windowHeight * 0.65 }}
                contentContainerStyle={{ paddingVertical: 12, gap: 12 }}
                showsVerticalScrollIndicator={false}
              >
                {selectedProviderPost.postImageUrl ? (
                  <View style={styles.providerModalImageWrap}>
                    <ExpoImage
                      source={{ uri: formatCloudflareImageUrl(selectedProviderPost.postImageUrl) }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                ) : null}

                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>
                    {selectedProviderPost.postTitle}
                  </Text>
                  <Text style={{ fontSize: 13, lineHeight: 20, color: '#334155' }}>
                    {selectedProviderPost.postDescription}
                  </Text>
                </View>

                <View style={styles.providerModalInfoCard}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b' }}>
                    SERVİS & USTA BİLGİLERİ
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {selectedProviderPost.rating ? (
                      <View style={styles.providerModalMetricBox}>
                        <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700' }}>Müşteri Puanı</Text>
                        <Text style={{ fontSize: 13, color: '#d97706', fontWeight: '900', marginTop: 2 }}>
                          ⭐ {Number(selectedProviderPost.rating).toFixed(1)} / 5.0
                        </Text>
                      </View>
                    ) : null}

                    {selectedProviderPost.phone ? (
                      <TouchableOpacity
                        style={styles.providerModalMetricBox}
                        onPress={() => Linking.openURL(`tel:${selectedProviderPost.phone}`)}
                      >
                        <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700' }}>İletişim Hattı</Text>
                        <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '900', marginTop: 2 }}>
                          📞 {selectedProviderPost.phone}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {selectedProviderPost.address ? (
                    <Text style={{ fontSize: 12, color: '#475569', lineHeight: 17 }}>
                      📍 {selectedProviderPost.address}
                    </Text>
                  ) : null}

                  {selectedProviderPost.supportedBrands && selectedProviderPost.supportedBrands.length > 0 ? (
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
                        Hizmet Verilen Markalar:
                      </Text>
                      <View style={styles.providerTagsWrap}>
                        {selectedProviderPost.supportedBrands.map((b, i) => (
                          <View key={i} style={styles.providerTagChip}>
                            <Text style={styles.providerTagChipText}>{b}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {selectedProviderPost.serviceCategories && selectedProviderPost.serviceCategories.length > 0 ? (
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
                        Uzmanlık & Hizmet Alanları:
                      </Text>
                      <View style={styles.providerTagsWrap}>
                        {selectedProviderPost.serviceCategories.map((c, i) => (
                          <View key={i} style={styles.providerTagChip}>
                            <Text style={styles.providerTagChipText}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => setSelectedProviderPost(null)}
                  style={[styles.modalDoneBtn, { flex: 1, marginTop: 0, backgroundColor: '#f1f5f9' }]}
                >
                  <Text style={[styles.modalDoneText, { color: '#334155' }]}>Kapat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const post = selectedProviderPost;
                    setSelectedProviderPost(null);
                    if (post.profileUrl) {
                      Linking.openURL(post.profileUrl).catch(() => {});
                    } else {
                      router.push('/isicepte' as any);
                    }
                  }}
                  style={[styles.modalDoneBtn, { flex: 1.4, marginTop: 0 }]}
                >
                  <Text style={styles.modalDoneText}>
                    {selectedProviderPost.profileUrl ? "İşiCepte'de Profili Aç ➔" : 'Tüm Servisleri Gör ➔'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f0f4f9',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  subText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  retryBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  feedWrapper: {
    flex: 1,
    backgroundColor: '#f0f4f9',
  },
  feedList: {
    flex: 1,
    backgroundColor: '#f0f4f9',
  },
  cardContainer: {
    width: windowWidth,
    backgroundColor: '#f0f4f9',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  filterTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  filterTopBtnActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
    shadowColor: '#ea580c',
    shadowOpacity: 0.3,
  },
  filterTopBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  filterTopBtnTextActive: {
    color: '#ffffff',
  },
  darkCircularBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  feedTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cardFrame: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    justifyContent: 'space-between',
    position: 'relative',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardContentTop: {
    flex: 1,
    gap: 7,
    marginBottom: 6,
  },
  cardContentBottom: {
    gap: 6,
  },
  swipeCoachOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 60,
  },
  swipeCoachBox: {
    width: 150,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  swipeHandAnimatedWrap: {
    position: 'absolute',
    left: 22,
    top: 42,
  },
  photoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  promoBadgesWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  urgentPillBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  urgentDot: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  urgentFire: {
    fontSize: 11,
  },
  urgentPillText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  showcasePillBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  showcaseStar: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: 'bold',
  },
  showcasePillText: {
    color: '#0f172a',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  photoCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  detailsContainer: {
    marginTop: 4,
    gap: 2,
  },
  titleText: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoSubText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  breadcrumbContainer: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
  },
  breadcrumbText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  tabBar: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ea580c',
    borderWidth: 1.5,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  tabContentContainer: {
    marginTop: 4,
    height: 94,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: 'center',
    position: 'relative',
  },
  scrollInfo: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 1.5,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '700',
  },
  infoValuePrice: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#ea580c',
  },
  descriptionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    gap: 4,
    overflow: 'hidden',
  },
  descriptionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  descriptionCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  descriptionDetailLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  descriptionBodyContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  descriptionCardBody: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16.5,
  },
  locBox: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingRight: 28,
  },
  detailLink: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  locLinkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  ctaBtnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTextOutline: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  ctaBtnSolid: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  ctaTextSolid: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  expertiseContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactSvgBox: {
    width: 44,
    height: 82,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  expertiseInfoBox: {
    flex: 1,
    height: '100%',
    justifyContent: 'space-evenly',
  },
  infoRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 1,
  },
  infoLabelCompact: {
    fontSize: 10,
    fontWeight: '700',
  },
  infoValCompact: {
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 140,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0f172a',
    maxWidth: 260,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDoneBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  modalDoneText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  descModalMetaRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 4,
  },
  descModalVehicleTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  descModalListingNo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  descModalBodyText: {
    fontSize: 13.5,
    lineHeight: 22,
    color: '#334155',
    fontWeight: '400',
  },
  providerCardFrame: {
    padding: 14,
    justifyContent: 'space-between',
  },
  providerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  providerAvatarBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  providerAvatarInitials: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563eb',
  },
  providerBusinessName: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  providerShowcaseBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  providerShowcaseBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#b45309',
  },
  providerLocationText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  providerTypeBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  providerTypeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  providerMediaContainer: {
    width: '100%',
    height: Math.min(windowHeight * 0.34, 260),
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  providerMediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  providerMediaOverlayBottom: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerMediaPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  providerMediaPillText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  providerBodyBox: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  providerPostTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  providerPostDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
  },
  providerTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  providerTagChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  providerTagChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  providerModalImageWrap: {
    width: '100%',
    height: 210,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  providerModalInfoCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  providerModalMetricBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
  },
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
    borderBottomColor: '#e2e8f0',
  },
  filterModalResetText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  filterModalTitle: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalScroll: {
    flex: 1,
  },
  filterModalScrollContent: {
    padding: 16,
    gap: 14,
  },
  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownSelectorText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748b',
  },
  dropdownSelectedText: {
    color: '#0f172a',
    fontWeight: '800',
  },
  filterModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  applyFilterBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyFilterBtnText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 4,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerItemSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  pickerItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  pickerItemTextSelected: {
    fontWeight: '800',
    color: '#c2410c',
  },
});
