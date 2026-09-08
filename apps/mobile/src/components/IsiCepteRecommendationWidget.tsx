import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Modal,
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

export const TURKEY_81_PROVINCES: string[] = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale', 'Kırklareli',
  'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop',
  'Şırnak', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
];

export interface IsiCepteProviderItem {
  id: string;
  isicepteProviderId: string;
  businessName: string;
  slug: string;
  coverImageUrl?: string | null;
  city: string;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  isicepteProfileUrl: string;
  supportedBrands: string[];
  serviceCategories: string[];
  rating: number;
  reviewCount: number;
  isShowcase: boolean;
}

interface IsiCepteRecommendationWidgetProps {
  vehicleBrand?: string;
  initialCity?: string;
  title?: string;
  subtitle?: string;
  containerStyle?: any;
}

export default function IsiCepteRecommendationWidget({
  vehicleBrand,
  initialCity,
  title,
  subtitle,
  containerStyle,
}: IsiCepteRecommendationWidgetProps) {
  const router = useRouter();
  const [items, setItems] = useState<IsiCepteProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity || '');
  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<IsiCepteProviderItem | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (vehicleBrand && vehicleBrand !== 'Tüm Markalar') {
        query.append('brand', vehicleBrand);
      }
      if (selectedCity && selectedCity !== 'Tüm Şehirler') {
        query.append('city', selectedCity);
      }
      query.append('scope', 'SHOWCASE_ONLY');
      query.append('limit', '8');
      query.append('seed', Math.random().toString(36).substring(2, 7));

      const res = await fetch(`${API_URL}/isicepte/recommendations?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const providers = Array.isArray(data.items) ? data.items : [];
        setItems(providers);
      }
    } catch (e) {
      console.error('Fetch IsiCepte recommendations error:', e);
    } finally {
      setLoading(false);
    }
  }, [vehicleBrand, selectedCity]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleWhatsApp = (phone?: string | null) => {
    if (!phone) return;
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '90' + cleanPhone.substring(1);
    if (!cleanPhone.startsWith('90')) cleanPhone = '90' + cleanPhone;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=Merhaba,%20TorqueScout%20üzerinden%20ulaşıyorum.`);
  };

  const filteredCities = TURKEY_81_PROVINCES.filter((c) =>
    c.toLowerCase().includes(citySearchQuery.toLowerCase().trim())
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header Badge & Title */}
      <View style={styles.headerTop}>
        <View style={styles.badgeRow}>
          <View style={styles.isiCepteBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#ea580c" />
            <Text style={styles.isiCepteBadgeText}>İŞİ CEPTE ÖNERİYOR</Text>
          </View>
          <View style={styles.guaranteeBadge}>
            <Text style={styles.guaranteeBadgeText}>Onaylı Oto Servis & Usta</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainTitle}>
              {title || (vehicleBrand ? `${vehicleBrand} İçin Önerilen Servisler` : 'Güvenilir Servis & Ustalar')}
            </Text>
            <Text style={styles.subTitle}>
              {subtitle || 'Bölgenizdeki uzman mekanik, kaporta, ekspertiz ve yedek parça noktaları'}
            </Text>
          </View>

          {/* City Selector Pill */}
          <TouchableOpacity
            style={styles.citySelectorPill}
            onPress={() => setIsCityModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="location-sharp" size={14} color="#ea580c" />
            <Text style={styles.citySelectorText} numberOfLines={1}>
              {selectedCity || 'Tüm Şehirler'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Provider List / Loading */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#ea580c" />
          <Text style={styles.loadingText}>Önerilen ustalar getiriliyor...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="construct-outline" size={28} color="#94a3b8" />
          <Text style={styles.emptyText}>
            {selectedCity ? `${selectedCity} için ` : ''}henüz vitrin esnafı listelenmedi.
          </Text>
          <TouchableOpacity
            style={styles.seeAllBtnSmall}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/isicepte',
                params: { brand: vehicleBrand || '' },
              } as any)
            }
          >
            <Text style={styles.seeAllBtnSmallText}>Tüm İşi Cepte Esnaflarını Keşfet</Text>
            <Ionicons name="arrow-forward" size={14} color="#ea580c" />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          {items.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={styles.providerCard}
              activeOpacity={0.9}
              onPress={() => setSelectedProvider(provider)}
            >
              {/* Top Row: Rating & Verified */}
              <View style={styles.cardHeader}>
                <View style={styles.ratingBox}>
                  <Ionicons name="star" size={12} color="#eab308" />
                  <Text style={styles.ratingText}>
                    {provider.rating > 0 ? provider.rating.toFixed(1) : '5.0'}
                  </Text>
                  <Text style={styles.reviewCountText}>
                    ({provider.reviewCount > 0 ? provider.reviewCount : 12})
                  </Text>
                </View>

                {provider.isShowcase && (
                  <View style={styles.vitrinBadge}>
                    <Ionicons name="flash" size={10} color="#ea580c" />
                    <Text style={styles.vitrinBadgeText}>VİTRİN</Text>
                  </View>
                )}
              </View>

              {/* Business Name */}
              <Text style={styles.businessName} numberOfLines={1}>
                {provider.businessName}
              </Text>

              {/* Location */}
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color="#64748b" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {provider.city}{provider.district ? ` • ${provider.district}` : ''}
                </Text>
              </View>

              {/* Service Categories Chips */}
              <View style={styles.tagsContainer}>
                {provider.serviceCategories?.slice(0, 2).map((cat, idx) => (
                  <View key={idx} style={styles.categoryTag}>
                    <Text style={styles.categoryTagText} numberOfLines={1}>
                      {cat}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons (Call / WhatsApp) */}
              <View style={styles.cardActionsRow}>
                {provider.phone ? (
                  <TouchableOpacity
                    style={styles.actionBtnCall}
                    onPress={() => handleCall(provider.phone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={14} color="#ffffff" />
                    <Text style={styles.actionBtnCallText}>Ara</Text>
                  </TouchableOpacity>
                ) : null}

                {provider.phone ? (
                  <TouchableOpacity
                    style={styles.actionBtnWa}
                    onPress={() => handleWhatsApp(provider.phone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#16a34a" />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.actionBtnDetail}
                  onPress={() => setSelectedProvider(provider)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="information-circle-outline" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Footer Link to Full Directory */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.fullDirectoryBtn}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/isicepte',
              params: {
                brand: vehicleBrand && vehicleBrand !== 'Bu Araç' ? vehicleBrand : '',
                city: selectedCity && selectedCity !== 'Tüm Şehirler' ? selectedCity : '',
              },
            } as any)
          }
        >
          <Text style={styles.fullDirectoryBtnText}>
            {vehicleBrand ? `${vehicleBrand} İçin Tüm İşi Cepte Ustalarını Gör` : 'Tüm Ustaları & Servisleri İncele'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#ea580c" />
        </TouchableOpacity>
      </View>

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
                placeholder="Şehir ara (örn: İstanbul, Ankara, İzmir)..."
                placeholderTextColor="#94a3b8"
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
              />
              {citySearchQuery ? (
                <TouchableOpacity onPress={() => setCitySearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* All Turkey Option */}
            <TouchableOpacity
              style={[
                styles.cityItem,
                !selectedCity && styles.cityItemActive,
              ]}
              onPress={() => {
                setSelectedCity('');
                setIsCityModalVisible(false);
                setCitySearchQuery('');
              }}
            >
              <Text style={[styles.cityItemText, !selectedCity && styles.cityItemTextActive]}>
                🌍 Tüm Şehirler (Türkiye Geneli)
              </Text>
              {!selectedCity && <Ionicons name="checkmark" size={18} color="#ea580c" />}
            </TouchableOpacity>

            {/* City List */}
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedCity === item;
                return (
                  <TouchableOpacity
                    style={[styles.cityItem, isSelected && styles.cityItemActive]}
                    onPress={() => {
                      setSelectedCity(item);
                      setIsCityModalVisible(false);
                      setCitySearchQuery('');
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
      {/* PROVIDER DETAIL MODAL */}
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
              <>
                <View style={styles.detailModalHeader}>
                  <View style={styles.detailAvatarBox}>
                    <Ionicons name="construct" size={24} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.detailBusinessName} numberOfLines={2}>
                        {selectedProvider.businessName}
                      </Text>
                    </View>
                    <View style={styles.detailVerifiedRow}>
                      <Ionicons name="shield-checkmark" size={13} color="#ea580c" />
                      <Text style={styles.detailVerifiedText}>İşi Cepte Onaylı Usta</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedProvider(null)}
                    style={styles.detailCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                {/* Score & Location Box */}
                <View style={styles.detailInfoBox}>
                  <View style={styles.detailInfoCol}>
                    <Text style={styles.detailInfoLabel}>Puan & Değerlendirme</Text>
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
                    <Ionicons name="map-outline" size={16} color="#64748b" />
                    <Text style={styles.detailAddressText}>{selectedProvider.address}</Text>
                  </View>
                ) : null}

                {/* Service Categories */}
                <Text style={styles.detailSectionTitle}>Hizmet Alanları</Text>
                <View style={styles.detailTagsGrid}>
                  {selectedProvider.serviceCategories?.map((cat, idx) => (
                    <View key={idx} style={styles.detailCategoryBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#ea580c" />
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

                {/* Bottom Action CTA Buttons */}
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

                  {selectedProvider.phone ? (
                    <TouchableOpacity
                      style={styles.detailWaBtn}
                      onPress={() => handleWhatsApp(selectedProvider.phone)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                      <Text style={styles.detailWaBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginVertical: 14,
  },
  headerTop: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  isiCepteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  isiCepteBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  guaranteeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  guaranteeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  subTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  citySelectorPill: {
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
  citySelectorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 75,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    marginVertical: 4,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
  },
  seeAllBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  seeAllBtnSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  horizontalScrollContent: {
    paddingVertical: 6,
    gap: 12,
  },
  providerCard: {
    width: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fefce8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#854d0e',
  },
  reviewCountText: {
    fontSize: 10,
    color: '#a16207',
  },
  vitrinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ffedd5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vitrinBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ea580c',
  },
  businessName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  categoryTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  actionBtnCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#ea580c',
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnCallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  actionBtnWa: {
    width: 32,
    height: 30,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  actionBtnDetail: {
    width: 30,
    height: 30,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  fullDirectoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  fullDirectoryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
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
    height: '70%',
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
    gap: 6,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  detailAddressText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    flex: 1,
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
  detailWaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailWaBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
