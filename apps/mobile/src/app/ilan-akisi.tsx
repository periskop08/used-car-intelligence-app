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

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://used-car-api-hzmu.onrender.com';

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
  const [listings, setListings] = useState<ListingFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [seed, setSeed] = useState<string>('');
  const [feedHeight, setFeedHeight] = useState<number>(windowHeight);

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

    return (
      <View style={[styles.cardContainer, { height: feedHeight }]}>
        {/* Right Floating Vertical Swipe Guide Indicator */}
        <View style={styles.scrollGuidePill} pointerEvents="none">
          <Ionicons name="chevron-up" size={10} color="#94a3b8" />
          <Ionicons name="swap-vertical" size={13} color="#ea580c" />
          <Ionicons name="chevron-down" size={10} color="#94a3b8" />
        </View>

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

        {/* Swipe Carousel for Photos */}
        <View style={styles.photoContainer}>
          {item.photos.length > 0 ? (
            <>
              <ExpoImage
                source={{ uri: item.photos[activePhoto]?.url }}
                style={styles.photoImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <View style={styles.photoCountBadge}>
                <Text style={styles.photoCountText}>
                  {activePhoto + 1} / {item.photos.length}
                </Text>
              </View>

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
                    <Ionicons name="chevron-back" size={16} color="white" />
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
                    <Ionicons name="chevron-forward" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noPhoto}>
              <Ionicons name="car-outline" size={36} color="#94a3b8" />
              <Text style={styles.noPhotoText}>Görsel Bulunmuyor</Text>
            </View>
          )}
        </View>

        {/* Title, Seller Info & Location */}
        <View style={styles.detailsContainer}>
          <Text style={styles.titleText} numberOfLines={1}>
            {item.title.toUpperCase()}
          </Text>
          <View style={styles.infoLine}>
            <Text style={styles.infoSubText}>
              👤 {item.seller.displayName} ({item.seller.memberSince})
            </Text>
            <Text style={styles.infoSubText}>
              📍 {item.location.city}, {item.location.district}
            </Text>
          </View>
        </View>

        {/* Breadcrumb */}
        <View style={styles.breadcrumbContainer}>
          <Text style={styles.breadcrumbText} numberOfLines={1}>
            {item.breadcrumb.join(' > ')}
          </Text>
        </View>

        {/* Tab Bar */}
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

        {/* Tab Content Box */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'info' && (
            <ScrollView style={styles.scrollInfo} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.infoLabel}>Yıl</Text>
                <Text style={styles.infoValue}>{item.vehicle.year}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>KM</Text>
                <Text style={styles.infoValue}>{(item.vehicle.mileage ?? 0).toLocaleString('tr-TR')} km</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Yakıt</Text>
                <Text style={styles.infoValue}>{item.vehicle.fuelType}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Vites</Text>
                <Text style={styles.infoValue}>{item.vehicle.transmissionType}</Text>
              </View>
            </ScrollView>
          )}

          {activeTab === 'desc' && (
            <View style={styles.descContainer}>
              <Text style={styles.descText} numberOfLines={3}>
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
                <Text style={styles.locText}>Şehir: {item.location.city}</Text>
                <Text style={styles.locText}>İlçe: {item.location.district || 'Belirtilmemiş'}</Text>
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

        {/* Specs Box */}
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

        {/* CTA Action Buttons */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity onPress={() => handleCall(item)} style={styles.ctaBtnOutline}>
            <Text style={styles.ctaTextOutline}>📞 Arama Başlat</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleMessage(item)} style={styles.ctaBtnSolid}>
            <Text style={styles.ctaTextSolid}>💬 Mesaj Gönder</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 100 && Math.abs(h - feedHeight) > 1) {
          setFeedHeight(h);
        }
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
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
    backgroundColor: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
  },
  cardContainer: {
    width: windowWidth,
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    position: 'relative',
  },
  scrollGuidePill: {
    position: 'absolute',
    right: 8,
    top: '45%',
    transform: [{ translateY: -24 }],
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 20,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circularBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
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
  photoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
    position: 'relative',
    marginTop: 4,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  carouselBtns: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: -14,
  },
  carouselArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  noPhotoText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  detailsContainer: {
    paddingVertical: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  infoSubText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  breadcrumbContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
  },
  breadcrumbText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
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
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#ea580c',
  },
  tabContentContainer: {
    height: 105,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
  },
  scrollInfo: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '700',
  },
  infoValuePrice: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ea580c',
  },
  descContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  descText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
  },
  detailLink: {
    alignSelf: 'flex-end',
  },
  detailLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  locBox: {
    gap: 2,
  },
  locTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  locText: {
    fontSize: 11,
    color: '#475569',
  },
  locLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  specsBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
  },
  specVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 8,
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
    fontSize: 12,
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
    shadowRadius: 4,
    elevation: 2,
  },
  ctaTextSolid: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
});
