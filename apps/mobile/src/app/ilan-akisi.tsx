import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Linking,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

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
      <View style={styles.cardContainer}>
        {/* Top Header Actions */}
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circularBtn}>
            <Ionicons name="arrow-back" size={18} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.feedTitle}>🎞️ İLAN AKIŞI</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => handleShare(item)} style={styles.circularBtn}>
              <Ionicons name="share-social-outline" size={18} color="#f8fafc" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleFavoriteToggle(item.id, item)}
              style={[
                styles.circularBtn,
                isFav && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
              ]}
            >
              <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#ef4444' : '#f8fafc'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Swipe Carousel for Photos */}
        <View style={styles.photoContainer}>
          {item.photos.length > 0 ? (
            <>
              <Image source={{ uri: item.photos[activePhoto]?.url }} style={styles.photoImage} />
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

        {/* Glassmorphism Tab Bar */}
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

        {/* Tab Content Box - compact height */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'info' && (
            <ScrollView style={styles.scrollInfo} showsVerticalScrollIndicator={false}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fiyat</Text>
                <Text style={styles.infoValuePrice}>
                  {item.price.toLocaleString('tr-TR')} {item.currency}
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
                <Text style={styles.infoValue}>{item.vehicle.mileage.toLocaleString('tr-TR')} km</Text>
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
              <Text style={styles.descText} numberOfLines={4}>
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
    <SafeAreaView style={styles.container}>
      {loading && listings.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#f97316" />
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
          <Ionicons name="film-outline" size={48} color="#64748b" />
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
          snapToInterval={windowHeight}
          snapToAlignment="start"
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
    backgroundColor: '#060913',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 13,
  },
  errorText: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  subText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  retryBtn: {
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  feedList: {
    flex: 1,
  },
  cardContainer: {
    width: windowWidth,
    height: windowHeight,
    backgroundColor: '#0b0f19',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 24,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circularBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  photoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    position: 'relative',
    marginTop: 8,
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#cbd5e1',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    fontSize: 12,
    color: '#475569',
  },
  detailsContainer: {
    paddingVertical: 4,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#e2e8f0',
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  infoSubText: {
    fontSize: 10,
    color: '#64748b',
  },
  breadcrumbContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 10,
  },
  breadcrumbText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#60a5fa',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#60a5fa',
  },
  tabContentContainer: {
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
  },
  scrollInfo: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 11,
    color: '#e2e8f0',
  },
  infoValuePrice: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f97316',
  },
  descContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  descText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 15,
  },
  detailLink: {
    alignSelf: 'flex-end',
  },
  detailLinkText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f97316',
  },
  locBox: {
    gap: 2,
  },
  locTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  locText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  locLinkText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#60a5fa',
  },
  specsBox: {
    backgroundColor: '#141b2c',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 14,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specLabel: {
    fontSize: 8,
    color: '#475569',
  },
  specVal: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginTop: 2,
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  ctaBtnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#141b2c',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTextOutline: {
    fontSize: 12,
    fontWeight: '900',
    color: '#e2e8f0',
  },
  ctaBtnSolid: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTextSolid: {
    fontSize: 12,
    fontWeight: '900',
    color: 'white',
  },
});
