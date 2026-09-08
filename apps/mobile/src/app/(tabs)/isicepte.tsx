import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TURKEY_81_PROVINCES, IsiCepteProviderItem } from '../../components/IsiCepteRecommendationWidget';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const CANONICAL_ISICEPTE_CATEGORIES = [
  'Tüm Kategoriler',
  'Motor/Mekanik',
  'Kaporta/Boya',
  'Oto Ekspertiz',
  'Oto Elektrik/Elektronik',
  'Oto Çekici/Kurtarıcı',
  'Lastik/Jant',
  'Cam Filmi/Kaplama',
  'Oto Yıkama & Detay',
  'Oto Aksesuar',
  'Oto Yedek Parça',
  'Motosiklet Servisi',
];

const POPULAR_BRANDS = [
  'Tüm Markalar',
  'Audi',
  'BMW',
  'Chery',
  'Citroen',
  'Dacia',
  'Fiat',
  'Ford',
  'Honda',
  'Hyundai',
  'Kia',
  'Mercedes-Benz',
  'Nissan',
  'Opel',
  'Peugeot',
  'Renault',
  'Seat',
  'Skoda',
  'Tesla',
  'Togg',
  'Toyota',
  'Volkswagen',
  'Volvo',
];

export default function IsiCepteOneriyorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialBrandParam = typeof params.brand === 'string' ? params.brand : '';
  const initialCityParam = typeof params.city === 'string' ? params.city : '';

  const [items, setItems] = useState<IsiCepteProviderItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [selectedCity, setSelectedCity] = useState<string>(initialCityParam);
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrandParam || 'Tüm Markalar');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tüm Kategoriler');
  const [scope, setScope] = useState<'SHOWCASE_ONLY' | 'ALL_ELIGIBLE'>('SHOWCASE_ONLY');
  const [searchQuery, setSearchQuery] = useState('');

  // City Picker Modal State
  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  // Provider Detail Modal
  const [selectedProvider, setSelectedProvider] = useState<IsiCepteProviderItem | null>(null);

  // Fetch Providers from API
  const fetchProviders = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (selectedCity && selectedCity !== 'Tüm Şehirler') {
        query.append('city', selectedCity);
      }
      if (selectedBrand && selectedBrand !== 'Tüm Markalar') {
        query.append('brand', selectedBrand);
      }
      if (selectedCategory && selectedCategory !== 'Tüm Kategoriler') {
        query.append('category', selectedCategory);
      }
      query.append('scope', scope);
      query.append('limit', '50');
      query.append('seed', Math.random().toString(36).substring(2, 7));

      const res = await fetch(`${API_URL}/isicepte/recommendations?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const providers = Array.isArray(data.items) ? data.items : [];
        setItems(providers);
        setTotalCount(data.total || providers.length);
      }
    } catch (e) {
      console.error('Fetch IsiCepte screen providers error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCity, selectedBrand, selectedCategory, scope]);

  useEffect(() => {
    setLoading(true);
    fetchProviders();
  }, [fetchProviders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviders();
  };

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleOpenIsiCepte = async (provider: IsiCepteProviderItem) => {
    const webUrl =
      provider.isicepteProfileUrl ||
      (provider.slug ? `https://isicepte.com/usta/${provider.slug}` : 'https://isicepte.com');
    const appDeepLink = `isicepte://usta/${provider.slug || provider.id}`;

    try {
      const supported = await Linking.canOpenURL(appDeepLink);
      if (supported) {
        await Linking.openURL(appDeepLink);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (e) {
      Linking.openURL(webUrl);
    }
  };

  // Client search filter for business names
  const displayedItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.businessName.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        (item.district && item.district.toLowerCase().includes(q)) ||
        item.serviceCategories?.some((c) => c.toLowerCase().includes(q)) ||
        item.supportedBrands?.some((b) => b.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const filteredProvinces = TURKEY_81_PROVINCES.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase().trim())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* HEADER BAR */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Ionicons name="shield-checkmark" size={20} color="#ea580c" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>İşi Cepte Öneriyor</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>ONAYLI</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              Güvenilir Oto Servis, Ekspertiz & Ustalar
            </Text>
          </View>
        </View>

        {/* City Filter Button */}
        <TouchableOpacity
          style={styles.cityPillBtn}
          onPress={() => setIsCityModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="location-sharp" size={14} color="#ea580c" />
          <Text style={styles.cityPillText} numberOfLines={1}>
            {selectedCity || 'Tüm Şehirler'}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* SEARCH INPUT */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="İşletme adı, semt veya uzmanlık ara..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* FILTERS CONTAINER */}
      <View style={styles.filterSection}>
        {/* SCOPE TABS (VİTRİN vs TÜMÜ) */}
        <View style={styles.scopeTabsContainer}>
          <TouchableOpacity
            style={[styles.scopeTab, scope === 'SHOWCASE_ONLY' && styles.scopeTabActive]}
            onPress={() => setScope('SHOWCASE_ONLY')}
          >
            <Ionicons
              name="sparkles"
              size={13}
              color={scope === 'SHOWCASE_ONLY' ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.scopeTabText, scope === 'SHOWCASE_ONLY' && styles.scopeTabTextActive]}>
              Vitrin Esnafları (Öne Çıkanlar)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeTab, scope === 'ALL_ELIGIBLE' && styles.scopeTabActive]}
            onPress={() => setScope('ALL_ELIGIBLE')}
          >
            <Ionicons
              name="grid-outline"
              size={13}
              color={scope === 'ALL_ELIGIBLE' ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.scopeTabText, scope === 'ALL_ELIGIBLE' && styles.scopeTabTextActive]}>
              Tüm Hizmet Verenler
            </Text>
          </TouchableOpacity>
        </View>

        {/* CATEGORY CHIPS SCROLL */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScrollContent}
        >
          {CANONICAL_ISICEPTE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* BRAND CHIPS SCROLL */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsScrollContent, { paddingTop: 6 }]}
        >
          {POPULAR_BRANDS.map((brand) => {
            const isSelected = selectedBrand === brand;
            return (
              <TouchableOpacity
                key={brand}
                style={[styles.brandChip, isSelected && styles.brandChipActive]}
                onPress={() => setSelectedBrand(brand)}
                activeOpacity={0.8}
              >
                <Text style={[styles.brandChipText, isSelected && styles.brandChipTextActive]}>
                  {brand}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* RESULTS COUNT ROW */}
      <View style={styles.resultsInfoRow}>
        <Text style={styles.resultsCountText}>
          {loading ? 'Yükleniyor...' : `${displayedItems.length} Onaylı Esnaf Bulundu`}
        </Text>
        {Boolean(selectedCity || selectedBrand !== 'Tüm Markalar' || selectedCategory !== 'Tüm Kategoriler') && (
          <TouchableOpacity
            style={styles.clearFiltersBtn}
            onPress={() => {
              setSelectedCity('');
              setSelectedBrand('Tüm Markalar');
              setSelectedCategory('Tüm Kategoriler');
              setSearchQuery('');
            }}
          >
            <Text style={styles.clearFiltersText}>Filtreleri Temizle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MAIN LIST */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.centerLoadingText}>İşi Cepte esnafları getiriliyor...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>Eşleşen Esnaf Bulunamadı</Text>
              <Text style={styles.emptyDesc}>
                Seçtiğiniz şehir veya uzmanlık filtresine uygun aktif üye bulunamadı. Filtreleri değiştirerek tekrar deneyebilirsiniz.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSelectedCity('');
                  setSelectedBrand('Tüm Markalar');
                  setSelectedCategory('Tüm Kategoriler');
                  setScope('ALL_ELIGIBLE');
                }}
              >
                <Text style={styles.resetBtnText}>Tüm Hizmet Verenleri Göster</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => setSelectedProvider(item)}
            >
              {/* Card Top */}
              <View style={styles.cardTopRow}>
                <View style={styles.avatarIconBox}>
                  <Ionicons name="construct" size={22} color="#ea580c" />
                </View>

                <View style={styles.cardTitleCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.cardBusinessName} numberOfLines={1}>
                      {item.businessName}
                    </Text>
                    {item.isShowcase && (
                      <View style={styles.cardVitrinBadge}>
                        <Ionicons name="flash" size={10} color="#ea580c" />
                        <Text style={styles.cardVitrinBadgeText}>VİTRİN</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardLocRatingRow}>
                    <View style={styles.cardLocItem}>
                      <Ionicons name="location-outline" size={12} color="#64748b" />
                      <Text style={styles.cardLocText} numberOfLines={1}>
                        {item.city}{item.district ? ` • ${item.district}` : ''}
                      </Text>
                    </View>

                    <View style={styles.cardRatingItem}>
                      <Ionicons name="star" size={12} color="#eab308" />
                      <Text style={styles.cardRatingScore}>
                        {item.rating > 0 ? item.rating.toFixed(1) : '5.0'}
                      </Text>
                      <Text style={styles.cardReviewCount}>
                        ({item.reviewCount > 0 ? item.reviewCount : 12})
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Service Categories */}
              <View style={styles.cardCategoriesRow}>
                {item.serviceCategories?.slice(0, 3).map((cat, idx) => (
                  <View key={idx} style={styles.cardCategoryBadge}>
                    <Text style={styles.cardCategoryText}>{cat}</Text>
                  </View>
                ))}
              </View>

              {/* Supported Brands */}
              {item.supportedBrands && item.supportedBrands.length > 0 ? (
                <View style={styles.cardBrandsRow}>
                  <Text style={styles.cardBrandsLabel}>Uzmanlık:</Text>
                  {item.supportedBrands.slice(0, 4).map((b, idx) => (
                    <View key={idx} style={styles.cardBrandBadge}>
                      <Text style={styles.cardBrandText}>{b}</Text>
                    </View>
                  ))}
                  {item.supportedBrands.length > 4 && (
                    <Text style={styles.cardMoreBrandsText}>
                      +{item.supportedBrands.length - 4} Marka
                    </Text>
                  )}
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.cardActionRow}>
                {item.phone ? (
                  <TouchableOpacity
                    style={styles.cardCallBtn}
                    onPress={() => handleCall(item.phone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={15} color="#ffffff" />
                    <Text style={styles.cardCallBtnText}>Hemen Ara</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.cardIsiCepteBtn}
                  onPress={() => handleOpenIsiCepte(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={15} color="#0284c7" />
                  <Text style={styles.cardIsiCepteBtnText}>İşi Cepte'de Aç</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cardDetailBtn}
                  onPress={() => setSelectedProvider(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="information-circle-outline" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ========================================================================= */}
      {/* CITY SELECTION MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={isCityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCityModalVisible(false)}
      >
        <View style={styles.cityModalOverlay}>
          <View style={styles.cityModalContainer}>
            <View style={styles.cityModalHeader}>
              <Text style={styles.cityModalTitle}>Şehir Seçin</Text>
              <TouchableOpacity
                onPress={() => setIsCityModalVisible(false)}
                style={styles.cityModalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.citySearchBox}>
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                style={styles.citySearchInput}
                placeholder="Şehir ara (örn: İstanbul, İzmir, Ankara)..."
                placeholderTextColor="#94a3b8"
                value={citySearch}
                onChangeText={setCitySearch}
              />
              {citySearch ? (
                <TouchableOpacity onPress={() => setCitySearch('')}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* All Cities Option */}
            <TouchableOpacity
              style={[styles.cityItem, !selectedCity && styles.cityItemActive]}
              onPress={() => {
                setSelectedCity('');
                setIsCityModalVisible(false);
                setCitySearch('');
              }}
            >
              <Text style={[styles.cityItemText, !selectedCity && styles.cityItemTextActive]}>
                🌍 Tüm Şehirler (Türkiye Geneli)
              </Text>
              {!selectedCity && <Ionicons name="checkmark" size={18} color="#ea580c" />}
            </TouchableOpacity>

            {/* Province List */}
            <FlatList
              data={filteredProvinces}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedCity === item;
                return (
                  <TouchableOpacity
                    style={[styles.cityItem, isSelected && styles.cityItemActive]}
                    onPress={() => {
                      setSelectedCity(item);
                      setIsCityModalVisible(false);
                      setCitySearch('');
                    }}
                  >
                    <Text style={[styles.cityItemText, isSelected && styles.cityItemTextActive]}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#ea580c" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* PROVIDER FULL DETAIL MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(selectedProvider)}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedProvider(null)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalCard}>
            {selectedProvider && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailModalHeader}>
                  <View style={styles.detailAvatarBox}>
                    <Ionicons name="construct" size={26} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailBusinessName} numberOfLines={2}>
                      {selectedProvider.businessName}
                    </Text>
                    <View style={styles.detailVerifiedRow}>
                      <Ionicons name="shield-checkmark" size={14} color="#ea580c" />
                      <Text style={styles.detailVerifiedText}>İşi Cepte Onaylı Üye</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedProvider(null)}
                    style={styles.detailCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                {/* Score & Location Box */}
                <View style={styles.detailInfoBox}>
                  <View style={styles.detailInfoCol}>
                    <Text style={styles.detailInfoLabel}>Puan & Yorum</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Ionicons name="star" size={14} color="#eab308" />
                      <Text style={styles.detailScoreText}>
                        {selectedProvider.rating > 0 ? selectedProvider.rating.toFixed(1) : '5.0'}
                      </Text>
                      <Text style={styles.detailReviewText}>
                        ({selectedProvider.reviewCount > 0 ? selectedProvider.reviewCount : 12} yorum)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailInfoDivider} />

                  <View style={styles.detailInfoCol}>
                    <Text style={styles.detailInfoLabel}>Konum</Text>
                    <Text style={styles.detailLocText}>
                      {selectedProvider.city} {selectedProvider.district ? `/ ${selectedProvider.district}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Address */}
                {selectedProvider.address ? (
                  <View style={styles.detailAddressSection}>
                    <Ionicons name="map-outline" size={18} color="#64748b" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailAddressLabel}>Adres</Text>
                      <Text style={styles.detailAddressText}>{selectedProvider.address}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Service Categories */}
                <Text style={styles.detailSectionTitle}>Hizmet Alanları</Text>
                <View style={styles.detailTagsGrid}>
                  {selectedProvider.serviceCategories?.map((cat, idx) => (
                    <View key={idx} style={styles.detailCategoryBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#ea580c" />
                      <Text style={styles.detailCategoryBadgeText}>{cat}</Text>
                    </View>
                  ))}
                </View>

                {/* Supported Brands */}
                {selectedProvider.supportedBrands && selectedProvider.supportedBrands.length > 0 ? (
                  <>
                    <Text style={styles.detailSectionTitle}>Uzman Olduğu Markalar</Text>
                    <View style={styles.detailTagsGrid}>
                      {selectedProvider.supportedBrands.map((b, idx) => (
                        <View key={idx} style={styles.detailBrandBadge}>
                          <Text style={styles.detailBrandBadgeText}>{b}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}

                {/* Action CTA Buttons */}
                <View style={styles.detailCtaRow}>
                  {selectedProvider.phone ? (
                    <TouchableOpacity
                      style={styles.detailCallBtn}
                      onPress={() => handleCall(selectedProvider.phone)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="call" size={18} color="#ffffff" />
                      <Text style={styles.detailCallBtnText}>Hemen Ara</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.detailIsiCepteBtn}
                    onPress={() => handleOpenIsiCepte(selectedProvider)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="open-outline" size={18} color="#ffffff" />
                    <Text style={styles.detailIsiCepteBtnText}>İşi Cepte'de Aç</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ea580c',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  cityPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: 130,
  },
  cityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 75,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  filterSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  scopeTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 8,
    borderRadius: 10,
  },
  scopeTabActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  scopeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  scopeTabTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  chipsScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  brandChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  brandChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  brandChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  brandChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resultsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  clearFiltersBtn: {
    paddingVertical: 2,
  },
  clearFiltersText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  listContainer: {
    padding: 16,
    gap: 14,
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  avatarIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  cardTitleCol: {
    flex: 1,
  },
  cardBusinessName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    flex: 1,
    marginRight: 6,
  },
  cardVitrinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ffedd5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardVitrinBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ea580c',
  },
  cardLocRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  cardLocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  cardLocText: {
    fontSize: 11,
    color: '#64748b',
  },
  cardRatingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fefce8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardRatingScore: {
    fontSize: 11,
    fontWeight: '800',
    color: '#854d0e',
  },
  cardReviewCount: {
    fontSize: 10,
    color: '#a16207',
  },
  cardCategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  cardCategoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  cardBrandsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  cardBrandsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginRight: 2,
  },
  cardBrandBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardBrandText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c2410c',
  },
  cardMoreBrandsText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  cardCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingVertical: 8,
    borderRadius: 10,
  },
  cardCallBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardIsiCepteBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingVertical: 8,
    borderRadius: 10,
  },
  cardIsiCepteBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284c7',
  },
  cardDetailBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  centerLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  resetBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  cityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  cityModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    padding: 20,
  },
  cityModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cityModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  cityModalCloseBtn: {
    padding: 4,
  },
  citySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  citySearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cityItemActive: {
    backgroundColor: '#fff7ed',
    borderRadius: 10,
  },
  cityItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  cityItemTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  detailModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    maxHeight: '85%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  detailBusinessName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  detailVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  detailVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  detailCloseBtn: {
    padding: 6,
  },
  detailInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  detailInfoCol: {
    flex: 1,
  },
  detailInfoDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  detailInfoLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  detailScoreText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#854d0e',
  },
  detailReviewText: {
    fontSize: 11,
    color: '#a16207',
  },
  detailLocText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  detailAddressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  detailAddressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  detailAddressText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    marginTop: 6,
  },
  detailTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  detailCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailCategoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  detailBrandBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailBrandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  detailCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  detailCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailCallBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailIsiCepteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailIsiCepteBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
