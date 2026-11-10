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
  Switch,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import TorkScoutLoader from '../../components/TorkScoutLoader';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.includes('/listings/media-proxy/') || url.includes('/vehicle-guide/media-proxy/')) {
    return url.startsWith('http') ? url : `${API_URL}${url}`;
  }
  if (url.startsWith('/profile-photos/') || url.startsWith('profile-photos/')) {
    return `${API_URL}/listings/media-proxy/${url.replace(/^\//, '')}`;
  }
  if (url.includes('r2.dev') || url.includes('cloudflarestorage.com')) {
    let storageKey = '';
    if (url.includes('.r2.dev/')) {
      const parts = url.split('.r2.dev/');
      if (parts.length > 1) storageKey = parts[1].split('?')[0];
    } else {
      const parts = url.split('cloudflarestorage.com/');
      if (parts.length > 1) {
        const path = parts[1].split('?')[0].replace(/^\//, '');
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

const formatSellerName = (u: any) => {
  if (!u) return 'Kullanıcı';
  if (u.displayNamePreference === 'USERNAME' && u.username) return `@${u.username}`;
  if (u.displayNamePreference === 'SHORT_NAME' && u.firstName) {
    return `${u.firstName} ${u.lastName ? u.lastName[0] + '.' : ''}`.trim();
  }
  if (u.firstName || u.lastName) {
    return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  }
  return u.email ? u.email.split('@')[0] : 'Kullanıcı';
};

type FavoriteTab = 'LISTINGS' | 'REPORTS' | 'SELLERS' | 'SEARCHES';

export default function FavoritesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const resolveInitialTab = (t?: string | string[]): FavoriteTab => {
    const val = Array.isArray(t) ? t[0] : t;
    if (val === 'reports') return 'REPORTS';
    if (val === 'sellers') return 'SELLERS';
    if (val === 'searches') return 'SEARCHES';
    return 'LISTINGS';
  };

  const [activeTab, setActiveTab] = useState<FavoriteTab>(() => resolveInitialTab(params.tab));

  const [favoriteListings, setFavoriteListings] = useState<any[]>([]);
  const [favoriteReports, setFavoriteReports] = useState<any[]>([]);
  const [favoriteSellers, setFavoriteSellers] = useState<any[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setActiveTab(resolveInitialTab(params.tab));
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

      const [listingsRes, reportsRes, sellersRes, searchesRes] = await Promise.all([
        fetch(`${API_URL}/me/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${API_URL}/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${API_URL}/favorites/sellers`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${API_URL}/saved-searches`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (listingsRes && listingsRes.ok) {
        const data = await listingsRes.json();
        setFavoriteListings(Array.isArray(data) ? data : []);
      }

      if (reportsRes && reportsRes.ok) {
        const rData = await reportsRes.json();
        setFavoriteReports(Array.isArray(rData) ? rData : []);
      }

      if (sellersRes && sellersRes.ok) {
        const sData = await sellersRes.json();
        setFavoriteSellers(Array.isArray(sData) ? sData : []);
      }

      if (searchesRes && searchesRes.ok) {
        const qData = await searchesRes.json();
        setSavedSearches(Array.isArray(qData) ? qData : []);
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
        setFavoriteListings((prev) =>
          prev.filter((item) => (item.id || item.listingId || item.listing?.id) !== listingId)
        );
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

  const handleRemoveFavoriteSeller = async (sellerId: string) => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (!token) return;

      const res = await fetch(`${API_URL}/favorites/sellers/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sellerId }),
      });

      if (res.ok) {
        setFavoriteSellers((prev) => prev.filter((s) => s.sellerId !== sellerId));
        Alert.alert('Bilgi', 'Satıcı takipten çıkarıldı.');
      }
    } catch (e) {
      console.error('Remove favorite seller error:', e);
    }
  };

  const handleToggleSavedSearchAlert = async (
    searchId: string,
    emailVal: boolean,
    pushVal: boolean
  ) => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (!token) return;

      setSavedSearches((prev) =>
        prev.map((s) =>
          s.id === searchId
            ? { ...s, isEmailAlertActive: emailVal, isPushAlertActive: pushVal }
            : s
        )
      );

      await fetch(`${API_URL}/saved-searches/${searchId}/alert`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEmailAlertActive: emailVal,
          isPushAlertActive: pushVal,
        }),
      });
    } catch (e) {
      console.error('Toggle search alert error:', e);
    }
  };

  const handleDeleteSavedSearch = (searchId: string) => {
    Alert.alert('Aramayı Sil', 'Bu kayıtlı aramayı silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const token =
              (await AsyncStorage.getItem('accessToken')) ||
              (await AsyncStorage.getItem('token'));
            if (!token) return;

            const res = await fetch(`${API_URL}/saved-searches/${searchId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              setSavedSearches((prev) => prev.filter((s) => s.id !== searchId));
            }
          } catch (e) {
            console.error('Delete saved search error:', e);
          }
        },
      },
    ]);
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

      {/* 4 Tabs Row: İlanlar | Raporlar | Satıcılar | Aramalar */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'LISTINGS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('LISTINGS')}
          >
            <Ionicons
              name="car-sport"
              size={14}
              color={activeTab === 'LISTINGS' ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === 'LISTINGS' && styles.tabTextActive]}>
              İlanlarım ({favoriteListings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'REPORTS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('REPORTS')}
          >
            <Ionicons
              name="document-text"
              size={14}
              color={activeTab === 'REPORTS' ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === 'REPORTS' && styles.tabTextActive]}>
              Raporlarım ({favoriteReports.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'SELLERS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('SELLERS')}
          >
            <Ionicons
              name="people"
              size={14}
              color={activeTab === 'SELLERS' ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === 'SELLERS' && styles.tabTextActive]}>
              Satıcılarım ({favoriteSellers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'SEARCHES' && styles.tabButtonActive]}
            onPress={() => setActiveTab('SEARCHES')}
          >
            <Ionicons
              name="search"
              size={14}
              color={activeTab === 'SEARCHES' ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === 'SEARCHES' && styles.tabTextActive]}>
              Aramalarım ({savedSearches.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <TorkScoutLoader />
          <Text style={styles.loadingText}>Favoriler yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />
          }
        >
          {activeTab === 'LISTINGS' &&
            (favoriteListings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="heart-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Henüz favori ilanınız yok</Text>
                <Text style={styles.emptyDesc}>
                  İlan akışını veya araç ilanlarını incelerken beğendiğiniz ilanları kalp ikonuna basarak buraya kaydedebilirsiniz.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => router.push({ pathname: '/listings-browser', params: { category: 'ALL' } } as any)}
                >
                  <Text style={styles.browseBtnText}>İlanları İncele</Text>
                </TouchableOpacity>
              </View>
            ) : (
              favoriteListings.map((item) => {
                const listing = item.listing || item;
                const imgUrl =
                  listing.media?.[0]?.mediaUrl ||
                  listing.media?.[0]?.url ||
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
                        {new Intl.NumberFormat('tr-TR').format(
                          listing.price || listing.priceAmount || 0
                        )}{' '}
                        TL
                      </Text>
                      <Text style={styles.cardItemMeta}>
                        {listing.year || listing.modelYear} Yıl •{' '}
                        {listing.mileage || listing.kilometers
                          ? `${new Intl.NumberFormat('tr-TR').format(
                              listing.mileage || listing.kilometers
                            )} KM`
                          : '-'}
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
            ))}

          {activeTab === 'REPORTS' &&
            (favoriteReports.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Henüz favori raporunuz yok</Text>
                <Text style={styles.emptyDesc}>
                  Araç sorgulaması yaptıktan sonra kronik problem ve teknik analiz raporlarını favorilerinize ekleyebilirsiniz.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => router.push('/vehicle-query' as any)}
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
                        {variant?.brand?.name || variant?.model?.brand?.name}{' '}
                        {variant?.model?.name} ({variant?.year || variant?.modelYear})
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
            ))}

          {activeTab === 'SELLERS' &&
            (favoriteSellers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Favori Satıcınız Bulunmuyor</Text>
                <Text style={styles.emptyDesc}>
                  İlan sahiplerini takip ederek güvenilir satıcıları favorilerinize ekleyebilirsiniz.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => router.push({ pathname: '/listings-browser', params: { category: 'ALL' } } as any)}
                >
                  <Text style={styles.browseBtnText}>İlanları İncele</Text>
                </TouchableOpacity>
              </View>
            ) : (
              favoriteSellers.map((item) => {
                const seller = item.seller || {};
                const avatarUri = resolveMediaUrl(seller.profilePhotoUrl);
                return (
                  <View key={item.id} style={styles.sellerCard}>
                    <View style={styles.sellerTopRow}>
                      <View style={styles.sellerAvatarWrap}>
                        {avatarUri ? (
                          <ExpoImage
                            source={{ uri: avatarUri }}
                            style={styles.sellerAvatarImg}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.sellerAvatarFallback}>
                            <Text style={styles.sellerAvatarInitial}>
                              {(seller.firstName?.[0] || seller.email?.[0] || 'T').toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.sellerNameText}>{formatSellerName(seller)}</Text>
                        <Text style={styles.sellerEmailText}>{seller.email}</Text>
                      </View>
                    </View>

                    <View style={styles.sellerActionsRow}>
                      <TouchableOpacity
                        style={styles.sellerViewBtn}
                        onPress={() =>
                          router.push({
                            pathname: '/listings-browser',
                            params: { sellerId: item.sellerId, category: 'ALL' },
                          } as any)
                        }
                      >
                        <Text style={styles.sellerViewBtnText}>Satıcının İlanlarını Gör</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.sellerUnfollowBtn}
                        onPress={() => handleRemoveFavoriteSeller(item.sellerId)}
                      >
                        <Text style={styles.sellerUnfollowBtnText}>Takipten Çık</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ))}

          {activeTab === 'SEARCHES' &&
            (savedSearches.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="search-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Henüz Kayıtlı Aramanız Yok</Text>
                <Text style={styles.emptyDesc}>
                  İlanlar sayfasında yaptığınız filtre aramalarını favorilere kaydederek yeni ilanlardan anında haberdar olabilirsiniz.
                </Text>
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => router.push({ pathname: '/listings-browser', params: { category: 'ALL' } } as any)}
                >
                  <Text style={styles.browseBtnText}>İlanları İncele</Text>
                </TouchableOpacity>
              </View>
            ) : (
              savedSearches.map((search) => {
                const filterKeys = Object.keys(search.filters || {}).filter(
                  (k) =>
                    search.filters[k] !== null &&
                    search.filters[k] !== undefined &&
                    search.filters[k] !== ''
                );

                return (
                  <View key={search.id} style={styles.searchCard}>
                    <View style={styles.searchTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchTitle}>{search.title}</Text>
                        <Text style={styles.searchDate}>
                          Kayıt:{' '}
                          {search.createdAt
                            ? new Date(search.createdAt).toLocaleDateString('tr-TR')
                            : '-'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteSearchBtn}
                        onPress={() => handleDeleteSavedSearch(search.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        <Text style={styles.deleteSearchBtnText}>Sil</Text>
                      </TouchableOpacity>
                    </View>

                    {filterKeys.length > 0 && (
                      <View style={styles.filterTagsWrap}>
                        {filterKeys.map((k) => (
                          <View key={k} style={styles.filterTagPill}>
                            <Text style={styles.filterTagText}>
                              {k}: {String(search.filters[k])}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.searchAlertsRow}>
                      <View style={styles.alertSwitchItem}>
                        <Text style={styles.alertSwitchLabel}>E-posta Alarmı</Text>
                        <Switch
                          value={Boolean(search.isEmailAlertActive)}
                          onValueChange={(val) =>
                            handleToggleSavedSearchAlert(
                              search.id,
                              val,
                              Boolean(search.isPushAlertActive)
                            )
                          }
                          trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                        />
                      </View>

                      <View style={styles.alertSwitchItem}>
                        <Text style={styles.alertSwitchLabel}>Push Alarmı</Text>
                        <Switch
                          value={Boolean(search.isPushAlertActive)}
                          onValueChange={(val) =>
                            handleToggleSavedSearchAlert(
                              search.id,
                              Boolean(search.isEmailAlertActive),
                              val
                            )
                          }
                          trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.reopenSearchBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/listings-browser',
                          params: { category: 'ALL', ...(search.filters || {}) },
                        } as any)
                      }
                    >
                      <Text style={styles.reopenSearchBtnText}>Aramayı Tekrar Aç</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            ))}
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
  tabsWrapper: {
    paddingTop: 12,
  },
  tabsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
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
  sellerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sellerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  sellerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  sellerAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarInitial: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  sellerNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sellerEmailText: {
    fontSize: 11.5,
    color: '#64748b',
  },
  sellerActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sellerViewBtn: {
    flex: 1,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  sellerViewBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  sellerUnfollowBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  sellerUnfollowBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ef4444',
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  searchTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  searchDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  deleteSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  deleteSearchBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
  },
  filterTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterTagPill: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  filterTagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },
  searchAlertsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  alertSwitchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertSwitchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  reopenSearchBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  reopenSearchBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});
