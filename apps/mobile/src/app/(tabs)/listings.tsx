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
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CLOUDFLARE_VEHICLE_IMAGES } from '../../constants/vehicleImages';
import UrgentBadge from '../../components/UrgentBadge';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

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

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'km_asc';

export default function ListingsScreen() {
  const router = useRouter();

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // View Mode: 'LIST' (sahibinden.com compact row style) or 'CARD' (large card)
  const [viewMode, setViewMode] = useState<'LIST' | 'CARD'>('LIST');

  // Filter States
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [urgentOnly, setUrgentOnly] = useState(false);

  // Modals
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);

  useEffect(() => {
    fetchBrands();
    loadFavorites();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [selectedBrand, sortOption, urgentOnly]);

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
        setBrands(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching brands:', e);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/listings?limit=50&`;
      if (selectedBrand) {
        url += `brandId=${selectedBrand.id}&`;
      }
      if (search.trim()) {
        url += `keyword=${encodeURIComponent(search.trim())}&`;
      }
      if (urgentOnly) {
        url += `urgentOnly=true&`;
      }
      if (sortOption === 'price_asc') url += `sort=price_asc&`;
      else if (sortOption === 'price_desc') url += `sort=price_desc&`;
      else if (sortOption === 'km_asc') url += `sort=km_asc&`;
      else url += `sort=newest&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.listings)
          ? data.listings
          : [];
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

  // SAHIBINDEN.COM STYLE ROW RENDER
  const renderListRow = ({ item }: { item: ListingItem }) => {
    const brandName = item.vehicleVariant?.brand?.name || '';
    const modelName = item.vehicleVariant?.model?.name || '';
    const trimName = item.vehicleVariant?.trim?.name || '';
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
        {/* Left Thumbnail Image */}
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

        {/* Right Info Details */}
        <View style={styles.shInfoContainer}>
          {/* Title */}
          <Text style={styles.shListingTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Specs / Seller Tag */}
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

          {/* Bottom Row: Location Left, Price Right */}
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

  // CARD / VITRIN STYLE RENDER
  const renderCardItem = ({ item }: { item: ListingItem }) => {
    const brandName = item.vehicleVariant?.brand?.name || '';
    const modelName = item.vehicleVariant?.model?.name || '';
    const trimName = item.vehicleVariant?.trim?.name || '';
    const year = item.year || item.vehicleVariant?.year || '';
    const priceVal = item.priceAmount ?? item.price ?? 0;
    const kmVal = item.kilometers ?? item.mileage ?? 0;

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

  const getSortDisplayName = () => {
    switch (sortOption) {
      case 'price_asc':
        return 'Fiyat: Artan';
      case 'price_desc':
        return 'Fiyat: Azalan';
      case 'km_asc':
        return 'Km: En Düşük';
      default:
        return 'En Yeni';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* TOP APPBAR (WHITE THEME) */}
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

      {/* SAHIBINDEN STYLE 4-GRID FILTER SUB-BAR */}
      <View style={styles.subMenuBar}>
        {/* 1. Filtrele */}
        <TouchableOpacity
          style={[styles.subMenuBtn, selectedBrand && styles.subMenuBtnActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons
            name="funnel-outline"
            size={14}
            color={selectedBrand ? '#ea580c' : '#334155'}
          />
          <Text
            style={[styles.subMenuBtnText, selectedBrand && styles.subMenuBtnTextActive]}
            numberOfLines={1}
          >
            {selectedBrand ? selectedBrand.name : 'Filtrele'}
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

        {/* 3. Görünüm (Liste / Kart Toggle) */}
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

        {/* 4. Aramayı Kaydet */}
        <TouchableOpacity style={styles.subMenuBtn} onPress={handleSaveSearch}>
          <Ionicons name="bookmark-outline" size={14} color="#334155" />
          <Text style={styles.subMenuBtnText} numberOfLines={1}>
            Kaydet
          </Text>
        </TouchableOpacity>
      </View>

      {/* INLINE SEARCH BOX */}
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

      {/* ACTIVE FILTER NOTICE TAG */}
      {selectedBrand && (
        <View style={styles.activeFilterNotice}>
          <Text style={styles.activeFilterNoticeText}>
            Marka Filtresi: <Text style={{ fontWeight: '900' }}>{selectedBrand.name}</Text>
          </Text>
          <TouchableOpacity onPress={() => setSelectedBrand(null)}>
            <Ionicons name="close" size={16} color="#ea580c" />
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
          <TouchableOpacity
            style={styles.resetFiltersBtn}
            onPress={() => {
              setSelectedBrand(null);
              setSearch('');
              setUrgentOnly(false);
              setSortOption('newest');
            }}
          >
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

      {/* 1. FILTER MODAL (MARKA & KRİTERLER) */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>İlanları Filtrele</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setFilterModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.filterSectionHeader}>MARKA SEÇİMİ</Text>
              <TouchableOpacity
                style={[
                  styles.brandOptionItem,
                  !selectedBrand && styles.brandOptionSelected,
                ]}
                onPress={() => {
                  setSelectedBrand(null);
                  setFilterModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.brandOptionText,
                    !selectedBrand && styles.brandOptionTextSelected,
                  ]}
                >
                  Tüm Markalar
                </Text>
                {!selectedBrand && (
                  <Ionicons name="checkmark-circle" size={18} color="#0369a1" />
                )}
              </TouchableOpacity>

              {brands.map((b) => {
                const isSelected = selectedBrand?.id === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.brandOptionItem,
                      isSelected && styles.brandOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedBrand(b);
                      setFilterModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.brandOptionText,
                        isSelected && styles.brandOptionTextSelected,
                      ]}
                    >
                      {b.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#0369a1" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. SORT MODAL (SIRALAMA SEÇENEKLERİ) */}
      <Modal
        visible={sortModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>İlanları Sırala</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSortModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, gap: 10 }}>
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
                    style={[
                      styles.brandOptionItem,
                      isSelected && styles.brandOptionSelected,
                    ]}
                    onPress={() => {
                      setSortOption(opt.key as SortOption);
                      setSortModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.brandOptionText,
                        isSelected && styles.brandOptionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#0369a1" />
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
    backgroundColor: '#ffffff', // Clean white background
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
    color: '#0f172a', // Dark navy / slate title matching other tabs
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  activeFilterNoticeText: {
    fontSize: 12,
    color: '#9a3412',
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
  /* SAHIBINDEN ROW ITEM STYLES */
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
    color: '#ea580c', // Orange price text
  },
  /* CARD VIEW STYLES */
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
  /* MODAL STYLES */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
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
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  brandOptionItem: {
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
  brandOptionSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  brandOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  brandOptionTextSelected: {
    color: '#ea580c',
    fontWeight: '900',
  },
});
