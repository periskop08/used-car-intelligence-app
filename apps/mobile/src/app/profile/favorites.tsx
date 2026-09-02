import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.includes('.r2.dev/') || url.includes('cloudflarestorage.com/')) {
    const parts = url.split('.r2.dev/');
    const storageKey = parts.length > 1 ? parts[1].split('?')[0] : '';
    if (storageKey) {
      return `${API_URL}/listings/media-proxy/${storageKey}`;
    }
  }
  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  }
  return url;
};

export default function FavoritesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'LISTINGS' | 'REPORTS'>(
    params.tab === 'reports' ? 'REPORTS' : 'LISTINGS'
  );

  const [favoriteListings, setFavoriteListings] = useState<any[]>([]);
  const [favoriteReports, setFavoriteReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.tab === 'reports') {
      setActiveTab('REPORTS');
    } else if (params.tab === 'listings') {
      setActiveTab('LISTINGS');
    }
  }, [params.tab]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        Alert.alert('Giriş Yapın', 'Favorilerinizi görmek için lütfen giriş yapın.');
        router.back();
        return;
      }

      const [listingsRes, reportsRes] = await Promise.all([
        fetch(`${API_URL}/me/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setFavoriteListings(Array.isArray(data) ? data : []);
      }

      if (reportsRes.ok) {
        const rData = await reportsRes.json();
        setFavoriteReports(Array.isArray(rData) ? rData : []);
      }
    } catch (e) {
      console.error('Fetch favorites error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRemoveFavoriteListing = async (listingId: string) => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (!token) return;

      const res = await fetch(`${API_URL}/listings/${listingId}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setFavoriteListings((prev) => prev.filter((item) => (item.id || item.listingId) !== listingId));
        Alert.alert('Bilgi', 'İlan favorilerinizden kaldırıldı.');
      }
    } catch (e) {
      console.error('Remove favorite listing error:', e);
    }
  };

  const handleRemoveFavoriteReport = async (variantId: string) => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (!token) return;

      const res = await fetch(`${API_URL}/favorites/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variantId }),
      });

      if (res.ok) {
        setFavoriteReports((prev) =>
          prev.filter((item) => (item.variantId || item.vehicleVariantId) !== variantId)
        );
        Alert.alert('Bilgi', 'Rapor favorilerinizden kaldırıldı.');
      }
    } catch (e) {
      console.error('Remove favorite report error:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorilerim</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'LISTINGS' && styles.tabButtonActive]}
          onPress={() => setActiveTab('LISTINGS')}
        >
          <Ionicons
            name="car-sport"
            size={16}
            color={activeTab === 'LISTINGS' ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'LISTINGS' && styles.tabTextActive]}>
            Favori İlanlarım ({favoriteListings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'REPORTS' && styles.tabButtonActive]}
          onPress={() => setActiveTab('REPORTS')}
        >
          <Ionicons
            name="document-text"
            size={16}
            color={activeTab === 'REPORTS' ? '#ea580c' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'REPORTS' && styles.tabTextActive]}>
            Favori Raporlarım ({favoriteReports.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Favoriler yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {activeTab === 'LISTINGS' ? (
            /* FAVORITE LISTINGS TAB */
            favoriteListings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="heart-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Henüz favori ilanınız yok</Text>
                <Text style={styles.emptyDesc}>
                  İlan akışını veya araç ilanlarını incelerken beğendiğiniz ilanları kalp ikonuna basarak buraya kaydedebilirsiniz.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => router.push('/ilan-akisi' as any)}
                >
                  <Text style={styles.browseBtnText}>İlanları İncele</Text>
                </TouchableOpacity>
              </View>
            ) : (
              favoriteListings.map((item) => {
                const listing = item.listing || item;
                const imgUrl =
                  listing.media?.[0]?.mediaUrl ||
                  listing.photos?.[0]?.photoUrl ||
                  listing.photos?.[0]?.url;

                return (
                  <TouchableOpacity
                    key={listing.id || item.id}
                    style={styles.cardItem}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/listings/${listing.id}` as any)}
                  >
                    <View style={styles.cardImgWrap}>
                      {imgUrl ? (
                        <ExpoImage
                          source={{ uri: resolveMediaUrl(imgUrl) }}
                          style={styles.cardImg}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.cardImgFallback}>
                          <Ionicons name="car-sport" size={26} color="#cbd5e1" />
                        </View>
                      )}
                    </View>

                    <View style={styles.cardDetails}>
                      <Text style={styles.cardItemTitle} numberOfLines={2}>
                        {listing.title || `${listing.brand?.name || ''} ${listing.model?.name || ''}`}
                      </Text>
                      <Text style={styles.cardItemPrice}>
                        {new Intl.NumberFormat('tr-TR').format(listing.price || 0)} TL
                      </Text>
                      <Text style={styles.cardItemMeta}>
                        {listing.year} Yıl • {listing.mileage ? `${new Intl.NumberFormat('tr-TR').format(listing.mileage)} KM` : '-'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.removeFavBtn}
                      onPress={() => handleRemoveFavoriteListing(listing.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )
          ) : (
            /* FAVORITE REPORTS TAB */
            favoriteReports.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Henüz favori raporunuz yok</Text>
                <Text style={styles.emptyDesc}>
                  Araç sorgulaması yaptıktan sonra kronik problem ve teknik analiz raporlarını favorilerinize ekleyebilirsiniz.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => router.push('/(tabs)' as any)}
                >
                  <Text style={styles.browseBtnText}>Araç Sorgula</Text>
                </TouchableOpacity>
              </View>
            ) : (
              favoriteReports.map((item) => {
                const variant = item.variant || item.vehicleVariant;
                const variantId = item.variantId || item.vehicleVariantId || variant?.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.cardItem}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/vehicle-report', params: { variantId } })}
                  >
                    <View style={styles.reportIconWrap}>
                      <Ionicons name="speedometer" size={26} color="#ea580c" />
                    </View>

                    <View style={styles.cardDetails}>
                      <Text style={styles.cardItemTitle} numberOfLines={1}>
                        {variant?.brand?.name} {variant?.model?.name} ({variant?.year})
                      </Text>
                      <Text style={styles.reportSubtitle}>
                        {variant?.trim?.name || variant?.engine?.code || 'Detaylı Araç Raporu'}
                      </Text>
                      <View style={styles.reportBadgeRow}>
                        <View style={styles.reportPill}>
                          <Text style={styles.reportPillText}>AI Kronik Risk Analizi</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.removeFavBtn}
                      onPress={() => handleRemoveFavoriteReport(variantId)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabButtonActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 32,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyDesc: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  browseBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  browseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardItem: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImgWrap: {
    width: 90,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  cardImgFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1,
    gap: 3,
  },
  cardItemTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardItemPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ea580c',
  },
  cardItemMeta: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  reportBadgeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  reportPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  reportPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563eb',
  },
  removeFavBtn: {
    padding: 8,
  },
});
