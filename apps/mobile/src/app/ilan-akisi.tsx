import React, { useState, useEffect, useRef } from 'react';
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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUDFLARE_VEHICLE_IMAGES } from '../constants/vehicleImages';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

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

interface ListingFeedItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  listingDate: string;
  listingNo: string;
  location: { city: string; district: string };
  seller: Seller;
  vehicle: Vehicle;
  photos: Photo[];
  technicalSummary: TechnicalSummary;
  breadcrumb: string[];
  isFavorite: boolean;
  detailUrl: string;
}

export default function ListingFeedScreen() {
  const router = useRouter();
  const [feedHeight, setFeedHeight] = useState<number>(windowHeight - 90);

  const [listings, setListings] = useState<ListingFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [seed, setSeed] = useState<string>('');

  // States per listing id
  const [activeTabs, setActiveTabs] = useState<Record<string, 'info' | 'desc' | 'loc'>>({});
  const [activePhotoIndices, setActivePhotoIndices] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const [seenIds, setSeenIds] = useState<string[]>([]);
  const loadingMoreRef = useRef(false);
  const viewedLogged = useRef<Record<string, boolean>>({});

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
        `${API_URL}/listings/feed?limit=10&seed=${activeSeed}&excludeIds=${excludeIdsParam}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('İlan akışı yüklenirken bir sorun oluştu.');
      }

      const data = await response.json();
      const newItems: ListingFeedItem[] = data.items || [];

      if (replace) {
        setListings(newItems);
        const tabs: Record<string, 'info' | 'desc' | 'loc'> = {};
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

  const handleCall = (item: ListingFeedItem) => {
    logAnalyticsEvent('listing_feed_call_clicked', { listingId: item.id });
    alert('Satıcı telefon detayları için ilan detay sayfasına yönlendiriliyorsunuz.');
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
        const item = viewable.item;
        if (!viewedLogged.current[item.id]) {
          viewedLogged.current[item.id] = true;
          logAnalyticsEvent('listing_feed_item_viewed', {
            listingId: item.id,
            sellerId: item.seller.id,
            brand: item.vehicle.brand,
            modelFamily: item.vehicle.modelFamily,
            year: item.vehicle.year,
            position: viewable.index,
          });

          setSeenIds((prev) => {
            if (prev.includes(item.id)) return prev;
            return [...prev, item.id];
          });
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
    const activeTab = activeTabs[item.id] || 'info';
    const activePhoto = activePhotoIndices[item.id] || 0;
    const isFav = favorites[item.id] || false;

    const rawPhotoUrl = item.photos[activePhoto]?.url;
    const resolvedPhotoUrl = resolveVehicleImageUrl(
      rawPhotoUrl,
      item.vehicle.brand,
      item.vehicle.modelFamily
    );

    return (
      <View style={[styles.cardContainer, { height: feedHeight }]}>
        {/* Top Header Actions */}
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circularBtn}>
            <Ionicons name="arrow-back" size={18} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.feedTitle}>🎞️ İLAN AKIŞI</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => handleShare(item)} style={styles.circularBtn}>
              <Ionicons name="share-social-outline" size={18} color="#0f172a" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleFavoriteToggle(item.id, item)}
              style={[
                styles.circularBtn,
                isFav && { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
              ]}
            >
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#ef4444' : '#0f172a'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* DISTINCT FRAMED CARD CONTAINER */}
        <View style={styles.cardFrame}>
          {/* Right Floating Vertical Swipe Guide Indicator on the card frame */}
          <View style={styles.scrollGuidePill} pointerEvents="none">
            <Ionicons name="chevron-up" size={10} color="#94a3b8" />
            <Ionicons name="swap-vertical" size={12} color="#ea580c" />
            <Ionicons name="chevron-down" size={10} color="#94a3b8" />
          </View>

          {/* TOP SECTION: Photo, Title, Breadcrumb, Tabs, Table */}
          <View style={styles.cardContentTop}>
            {/* 1. Photo Carousel */}
            <View style={styles.photoContainer}>
              <ExpoImage
                source={{ uri: resolvedPhotoUrl }}
                style={styles.photoImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              {item.photos.length > 1 && (
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountText}>
                    {activePhoto + 1} / {item.photos.length}
                  </Text>
                </View>
              )}

              {item.photos.length > 1 && (
                <View style={styles.carouselBtns}>
                  <TouchableOpacity
                    onPress={() =>
                      setActivePhotoIndices((prev) => ({
                        ...prev,
                        [item.id]: Math.max(0, activePhoto - 1),
                      }))
                    }
                    style={styles.carouselArrow}
                  >
                    <Ionicons name="chevron-back" size={14} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      setActivePhotoIndices((prev) => ({
                        ...prev,
                        [item.id]: Math.min(item.photos.length - 1, activePhoto + 1),
                      }))
                    }
                    style={styles.carouselArrow}
                  >
                    <Ionicons name="chevron-forward" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 2. Title & Seller Info */}
            <View style={styles.detailsContainer}>
              <Text style={styles.titleText} numberOfLines={1}>
                {item.title.toUpperCase()}
              </Text>
              <View style={styles.infoLine}>
                <Text style={styles.infoSubText}>
                  👤 {item.seller.displayName} ({item.seller.memberSince})
                </Text>
                <Text style={styles.infoSubText}>
                  📍 {item.location.city}, {item.location.district || 'Merkez'}
                </Text>
              </View>
            </View>

            {/* 3. Breadcrumb */}
            <View style={styles.breadcrumbContainer}>
              <Text style={styles.breadcrumbText} numberOfLines={1}>
                {item.breadcrumb.join(' > ')}
              </Text>
            </View>

            {/* 4. Tab Bar */}
            <View style={styles.tabBar}>
              {(['info', 'desc', 'loc'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                  onPress={() => setActiveTabs((prev) => ({ ...prev, [item.id]: tab }))}
                >
                  <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                    {tab === 'info' ? 'Özellikler' : tab === 'desc' ? 'Açıklama' : 'Konum'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 5. Tab Content Box (Directly below Tabs) */}
            <View style={styles.tabContentContainer}>
              {activeTab === 'info' && (
                <View style={styles.scrollInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Fiyat</Text>
                    <Text style={styles.infoValuePrice}>
                      {(item.price ?? 0).toLocaleString('tr-TR')} {item.currency}
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
                    <Text style={styles.infoValue}>{item.vehicle.fuelType} • {item.vehicle.transmissionType}</Text>
                  </View>
                </View>
              )}

              {activeTab === 'desc' && (
                <View style={styles.descContainer}>
                  <Text style={styles.descText} numberOfLines={2}>
                    Bu araç TorqueScout yapay zeka analizinden geçmiştir. Hasar kayıtları ve kronik sorunları denetlenmiştir.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push(`/listings/${item.id}` as any)}
                    style={styles.detailLink}
                  >
                    <Text style={styles.detailLinkText}>İlan Detayına Git ➔</Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeTab === 'loc' && (
                <View style={styles.descContainer}>
                  <View style={styles.locBox}>
                    <Text style={styles.locTitle}>📍 İlan Konumu</Text>
                    <Text style={styles.locText}>Şehir: {item.location.city} • İlçe: {item.location.district || 'Merkez'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push(`/listings/${item.id}` as any)}
                    style={styles.detailLink}
                  >
                    <Text style={styles.locLinkText}>Haritada Göster ➔</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* BOTTOM SECTION: 4-Stat Specs & CTA Buttons */}
          <View style={styles.cardContentBottom}>
            {/* 6. Specs Box */}
            <View style={styles.specsBox}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Güç</Text>
                <Text style={styles.specVal}>{item.technicalSummary.maxPower || '-'}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Hız</Text>
                <Text style={styles.specVal}>{item.technicalSummary.topSpeed || '-'}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>0-100</Text>
                <Text style={styles.specVal}>{item.technicalSummary.acceleration0100 || '-'}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Tüketim</Text>
                <Text style={styles.specVal}>{item.technicalSummary.fuelConsumption || '-'}</Text>
              </View>
            </View>

            {/* 7. CTA Action Buttons */}
            <View style={styles.ctaContainer}>
              <TouchableOpacity onPress={() => handleCall(item)} style={styles.ctaBtnOutline}>
                <Text style={styles.ctaTextOutline}>📞 Arama Başlat</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleMessage(item)} style={styles.ctaBtnSolid}>
                <Text style={styles.ctaTextSolid}>💬 Mesaj Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 100 && Math.abs(h - feedHeight) > 2) {
          setFeedHeight(h);
        }
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f1f5f9" />
      {loading && listings.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ea580c" />
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
      ) : listings.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="film-outline" size={48} color="#94a3b8" />
          <Text style={styles.errorText}>Gösterilecek aktif ilan bulunmuyor.</Text>
          <Text style={styles.subText}>Yeni ilanlar yayınlandığında burada listelenecektir.</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
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
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          style={styles.feedList}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f1f5f9',
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
  },
  retryBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  retryText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  feedList: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  cardContainer: {
    width: windowWidth,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  circularBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  feedTitle: {
    fontSize: 13,
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
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
  },
  cardContentTop: {
    gap: 7,
  },
  cardContentBottom: {
    gap: 8,
  },
  scrollGuidePill: {
    position: 'absolute',
    right: 8,
    top: '42%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 30,
  },
  photoContainer: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  photoCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  carouselBtns: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginTop: -13,
  },
  carouselArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  noPhotoText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  detailsContainer: {
    paddingVertical: 1,
    gap: 2,
  },
  titleText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoSubText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
  },
  breadcrumbContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 6,
  },
  breadcrumbText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  tabButtonText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#ea580c',
  },
  tabContentContainer: {
    height: 84,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
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
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 10.5,
    color: '#0f172a',
    fontWeight: '700',
  },
  infoValuePrice: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#ea580c',
  },
  descContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  descText: {
    fontSize: 10.5,
    color: '#334155',
    lineHeight: 14,
  },
  detailLink: {
    alignSelf: 'flex-end',
  },
  detailLinkText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  locBox: {
    gap: 2,
  },
  locTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  locText: {
    fontSize: 10.5,
    color: '#475569',
  },
  locLinkText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563eb',
  },
  specsBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specLabel: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#64748b',
  },
  specVal: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  ctaBtnOutline: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTextOutline: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  ctaBtnSolid: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  ctaTextSolid: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#ffffff',
  },
});
