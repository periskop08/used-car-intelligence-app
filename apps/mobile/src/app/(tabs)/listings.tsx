import React, { useState, useEffect, useCallback, useRef } from 'react';
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

export default function ListingsScreen() {
  const router = useRouter();

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Filters
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState<'newest' | 'price_asc' | 'price_desc' | 'km_asc'>('newest');
  const [urgentOnly, setUrgentOnly] = useState(false);

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

  const renderListingCard = ({ item }: { item: ListingItem }) => {
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
        {/* Card Image Container */}
        <View style={styles.imageContainer}>
          <ExpoImage
            source={{ uri: resolvedImageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />

          {/* Badges on Top of Image */}
          <View style={styles.imageBadgesRow}>
            {item.isUrgent && <UrgentBadge size="small" />}

            {item.isShowcaseFeedActive && (
              <View style={styles.showcaseBadge}>
                <Ionicons name="star" size={11} color="#ffffff" />
                <Text style={styles.showcaseBadgeText}>VİTRİN</Text>
              </View>
            )}
          </View>

          {/* Favorite Heart Button */}
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

          {/* Price Tag Overlay Bottom Left */}
          <View style={styles.priceOverlay}>
            <Text style={styles.priceAmountText}>
              {new Intl.NumberFormat('tr-TR').format(priceVal)} TL
            </Text>
          </View>
        </View>

        {/* Card Content Info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.vehicleSpecText} numberOfLines={1}>
            {brandName} {modelName} {trimName ? `• ${trimName}` : ''}
          </Text>

          {/* Key Specs Pills */}
          <View style={styles.specsRow}>
            {!!year && (
              <View style={styles.specPill}>
                <Ionicons name="calendar-outline" size={12} color="#64748b" />
                <Text style={styles.specPillText}>{year}</Text>
              </View>
            )}
            <View style={styles.specPill}>
              <Ionicons name="speedometer-outline" size={12} color="#64748b" />
              <Text style={styles.specPillText}>
                {new Intl.NumberFormat('tr-TR').format(kmVal)} km
              </Text>
            </View>
            {!!item.fuelType && (
              <View style={styles.specPill}>
                <Text style={styles.specPillText}>{item.fuelType}</Text>
              </View>
            )}
            {!!item.transmission && (
              <View style={styles.specPill}>
                <Text style={styles.specPillText}>{item.transmission}</Text>
              </View>
            )}
          </View>

          {/* Location & Arrow */}
          <View style={styles.cardFooterRow}>
            <View style={styles.locationGroup}>
              <Ionicons name="location-outline" size={13} color="#94a3b8" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.city ? `${item.city}${item.district ? ` / ${item.district}` : ''}` : 'Türkiye'}
              </Text>
            </View>

            <View style={styles.viewDetailRow}>
              <Text style={styles.viewDetailText}>İlanı İncele</Text>
              <Ionicons name="chevron-forward" size={14} color="#ea580c" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navbar */}
      <View style={styles.headerBar}>
        <View style={styles.headerTitleGroup}>
          <Ionicons name="car-sport" size={22} color="#ea580c" />
          <Text style={styles.headerTitle}>Araç İlanları</Text>
        </View>

        <TouchableOpacity
          style={styles.createListingBtn}
          onPress={() => router.push('/listings/create' as any)}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.createListingBtnText}>İlan Ver</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Marka, model veya kelime ara..."
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
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Horizontal Chips */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Brand Filter */}
          <TouchableOpacity
            style={[styles.filterChip, selectedBrand && styles.filterChipActive]}
            onPress={() => setBrandModalVisible(true)}
          >
            <Ionicons
              name="car-outline"
              size={15}
              color={selectedBrand ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.filterChipText, selectedBrand && styles.filterChipTextActive]}>
              {selectedBrand ? selectedBrand.name : 'Tüm Markalar'}
            </Text>
            {selectedBrand ? (
              <TouchableOpacity
                onPress={() => setSelectedBrand(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={14} color="#ea580c" />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={13} color="#94a3b8" />
            )}
          </TouchableOpacity>

          {/* Urgent Filter */}
          <TouchableOpacity
            style={[styles.filterChip, urgentOnly && styles.filterChipUrgentActive]}
            onPress={() => setUrgentOnly(!urgentOnly)}
          >
            <Ionicons
              name="flame"
              size={15}
              color={urgentOnly ? '#ef4444' : '#64748b'}
            />
            <Text style={[styles.filterChipText, urgentOnly && { color: '#ef4444', fontWeight: '800' }]}>
              Acil Satış
            </Text>
          </TouchableOpacity>

          {/* Sort: Newest */}
          <TouchableOpacity
            style={[styles.filterChip, sortOption === 'newest' && styles.filterChipActive]}
            onPress={() => setSortOption('newest')}
          >
            <Text style={[styles.filterChipText, sortOption === 'newest' && styles.filterChipTextActive]}>
              En Yeni
            </Text>
          </TouchableOpacity>

          {/* Sort: Price Asc */}
          <TouchableOpacity
            style={[styles.filterChip, sortOption === 'price_asc' && styles.filterChipActive]}
            onPress={() => setSortOption('price_asc')}
          >
            <Text style={[styles.filterChipText, sortOption === 'price_asc' && styles.filterChipTextActive]}>
              Fiyat: Artan
            </Text>
          </TouchableOpacity>

          {/* Sort: Price Desc */}
          <TouchableOpacity
            style={[styles.filterChip, sortOption === 'price_desc' && styles.filterChipActive]}
            onPress={() => setSortOption('price_desc')}
          >
            <Text style={[styles.filterChipText, sortOption === 'price_desc' && styles.filterChipTextActive]}>
              Fiyat: Azalan
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content Feed */}
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
          renderItem={renderListingCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ea580c"
            />
          }
        />
      )}

      {/* BRAND SELECT MODAL */}
      <Modal
        visible={brandModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBrandModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Marka Seçin</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setBrandModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ padding: 14, gap: 8 }}
            >
              <TouchableOpacity
                style={[
                  styles.brandOptionItem,
                  !selectedBrand && styles.brandOptionSelected,
                ]}
                onPress={() => {
                  setSelectedBrand(null);
                  setBrandModalVisible(false);
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
                  <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
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
                      setBrandModalVisible(false);
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
                      <Ionicons name="checkmark-circle" size={18} color="#ea580c" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  createListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  createListingBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  filterBarWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  filterChipUrgentActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ea580c',
    fontWeight: '800',
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
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetFiltersBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  listContent: {
    padding: 14,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
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
    height: 190,
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
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
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
    letterSpacing: 0.5,
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
    color: '#ffffff',
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  vehicleSpecText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 2,
  },
  locationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  viewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
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
  brandOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  brandOptionSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  brandOptionText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  brandOptionTextSelected: {
    color: '#ea580c',
    fontWeight: '900',
  },
});
