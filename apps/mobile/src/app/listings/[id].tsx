import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Dimensions,
  Linking,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import UrgentBadge from '../../components/UrgentBadge';

const { width } = Dimensions.get('window');
const API_URL = 'https://used-car-api-hzmu.onrender.com';

const FUEL_TYPE_LABELS: Record<string, string> = {
  PETROL: 'Benzin',
  DIESEL: 'Dizel',
  LPG: 'Benzin & LPG',
  HYBRID: 'Hibrit',
  ELECTRIC: 'Elektrik',
};

const TRANSMISSION_LABELS: Record<string, string> = {
  AUTOMATIC: 'Otomatik',
  MANUAL: 'Manuel',
  SEMI_AUTOMATIC: 'Yarı Otomatik',
};

const BODY_TYPE_LABELS: Record<string, string> = {
  SEDAN: 'Sedan',
  HATCHBACK: 'Hatchback',
  SUV: 'SUV',
  COUPE: 'Coupe',
  WAGON: 'Station Wagon',
  STATION_WAGON: 'Station Wagon',
  CABRIO: 'Cabrio',
};

const DRIVETRAIN_LABELS: Record<string, string> = {
  FWD: 'Önden Çekiş',
  RWD: 'Arkadan İtiş',
  AWD: 'Dört Çeker (AWD / 4x4)',
  '4WD': '4WD (Sürekli)',
};

const CAR_BODY_PARTS: Record<string, string> = {
  FRONT_BUMPER: 'Ön Tampon',
  REAR_BUMPER: 'Arka Tampon',
  HOOD: 'Motor Kaputu',
  ROOF: 'Tavan',
  TRUNK: 'Bagaj Kapağı',
  LEFT_FRONT_FENDER: 'Sol Ön Çamurluk',
  RIGHT_FRONT_FENDER: 'Sağ Ön Çamurluk',
  LEFT_FRONT_DOOR: 'Sol Ön Kapı',
  RIGHT_FRONT_DOOR: 'Sağ Ön Kapı',
  LEFT_REAR_DOOR: 'Sol Arka Kapı',
  RIGHT_REAR_DOOR: 'Sağ Arka Kapı',
  LEFT_REAR_FENDER: 'Sol Arka Çamurluk',
  RIGHT_REAR_FENDER: 'Sağ Arka Çamurluk',
};

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (id === 'create') {
      router.replace('/create-listing');
      return;
    }
    if (id) {
      fetchListingDetail();
      loadUser();
    }
  }, [id]);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          setCurrentUserId(profile?.id || null);
        }
      }
    } catch (e) {
      console.error('Error loading user profile:', e);
    }
  };

  const fetchListingDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/listings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setListing(data);
        setIsFavorited(!!data.isFavorited);
      } else {
        Alert.alert('Hata', 'İlan detayları yüklenemedi.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Bağlantı Hatası', 'İlan verileri çekilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        title: listing.title || 'TorqueScout İlanı',
        message: `${listing.title || 'Araç İlanı'}\nFiyat: ${(listing.priceAmount ?? listing.price ?? 0).toLocaleString('tr-TR')} TL\nhttps://used-car-intelligence.vercel.app/listings/${listing.id}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartChat = async () => {
    if (!listing) return;
    const sellerId = listing.sellerId || listing.seller?.id || listing.userId;

    if (currentUserId && currentUserId === sellerId) {
      Alert.alert('Bilgi', 'Kendi ilanınız için mesaj başlatamazsınız.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Giriş Gerekli', 'Mesaj göndermek için lütfen giriş yapın.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/login' as any) },
        ]);
        return;
      }

      const res = await fetch(`${API_URL}/messages/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: listing.id,
          recipientId: sellerId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        router.push({
          pathname: '/messages/[id]',
          params: { id: data.id },
        } as any);
      } else {
        Alert.alert('Bilgi', data.message || 'Sohbet odası oluşturulamadı.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Bağlantı Hatası', 'Mesaj odası açılırken bağlantı hatası oluştu.');
    }
  };

  const handleCallSeller = () => {
    const phone = listing?.seller?.phone;
    if (!phone) {
      Alert.alert('Bilgi', 'Satıcı telefon numarası belirtmemiş. Lütfen mesaj ile iletişime geçin.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>İlan detayları yükleniyor...</Text>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
        <Text style={styles.errorText}>İlan bulunamadı veya yayından kaldırılmış.</Text>
        <TouchableOpacity style={styles.backButtonPrimary} onPress={() => router.back()}>
          <Text style={styles.backButtonPrimaryText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photos = Array.isArray(listing.media) && listing.media.length > 0
    ? listing.media.map((m: any) => m.url).filter(Boolean)
    : [];

  const defaultImage = 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80';
  const displayPhotos = photos.length > 0 ? photos : [defaultImage];

  const brandName = listing.vehicleVariant?.model?.brand?.name || listing.vehicleVariant?.brand?.name || listing.customBrand || '';
  const modelName = listing.vehicleVariant?.model?.name || listing.customModel || '';
  const trimName = listing.vehicleVariant?.trim?.name || '';
  const priceVal = listing.priceAmount ?? listing.price ?? 0;
  const kmVal = listing.kilometers ?? listing.mileage ?? 0;
  const yearVal = listing.modelYear ?? listing.year ?? '-';
  const cityVal = listing.city || 'Belirtilmedi';
  const districtVal = listing.district ? ` / ${listing.district}` : '';
  const sellerObj = listing.seller || listing.user || {};
  const sellerFullName = `${sellerObj.firstName || ''} ${sellerObj.lastName || ''}`.trim() || sellerObj.username || 'Satıcı';

  const painted = Array.isArray(listing.paintedParts) ? listing.paintedParts : [];
  const changed = Array.isArray(listing.changedParts) ? listing.changedParts : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {listing.title || `${brandName} ${modelName}`}
        </Text>
        <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Photo Carousel */}
        <View style={styles.galleryWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const offset = e.nativeEvent.contentOffset.x;
              const idx = Math.round(offset / width);
              setActivePhotoIndex(idx);
            }}
            scrollEventThrottle={16}
          >
            {displayPhotos.map((uri: string, idx: number) => (
              <View key={idx} style={styles.gallerySlide}>
                <ExpoImage
                  source={{ uri }}
                  style={styles.galleryImage}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            ))}
          </ScrollView>

          {/* Photo Pagination Indicator */}
          {displayPhotos.length > 1 && (
            <View style={styles.photoIndexBadge}>
              <Text style={styles.photoIndexText}>
                {activePhotoIndex + 1} / {displayPhotos.length}
              </Text>
            </View>
          )}

          {/* Urgent Badge Overlay */}
          {listing.isUrgent && (
            <View style={styles.urgentBadgeWrap}>
              <UrgentBadge size="medium" />
            </View>
          )}
        </View>

        {/* Price & Title Card */}
        <View style={styles.card}>
          <Text style={styles.priceText}>
            {Number(priceVal).toLocaleString('tr-TR')} {listing.currency || 'TL'}
          </Text>
          <Text style={styles.titleText}>{listing.title}</Text>

          <View style={styles.quickInfoRow}>
            <View style={styles.quickInfoItem}>
              <Ionicons name="calendar-outline" size={15} color="#64748b" />
              <Text style={styles.quickInfoText}>{yearVal}</Text>
            </View>
            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Ionicons name="speedometer-outline" size={15} color="#64748b" />
              <Text style={styles.quickInfoText}>{Number(kmVal).toLocaleString('tr-TR')} km</Text>
            </View>
            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Ionicons name="location-outline" size={15} color="#64748b" />
              <Text style={styles.quickInfoText}>{cityVal}{districtVal}</Text>
            </View>
          </View>
        </View>

        {/* AI Report Fast Link Card */}
        {listing.vehicleVariantId && (
          <TouchableOpacity
            style={styles.aiReportCard}
            onPress={() =>
              router.push({
                pathname: '/vehicle-report',
                params: { variantId: listing.vehicleVariantId },
              } as any)
            }
          >
            <View style={styles.aiIconBox}>
              <Ionicons name="sparkles" size={22} color="#ea580c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>AI Kronik Arıza & Risk Analizi</Text>
              <Text style={styles.aiDesc}>
                Bu modelin fabrika kronikleri, geri çağırmaları ve ekspertiz kontrol listesini inceleyin.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ea580c" />
          </TouchableOpacity>
        )}

        {/* Vehicle Specs Table Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="car-outline" size={18} color="#ea580c" />
            <Text style={styles.cardTitle}>Araç Bilgileri</Text>
          </View>

          <View style={styles.specTable}>
            {!!brandName && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Marka</Text>
                <Text style={styles.specValue}>{brandName}</Text>
              </View>
            )}
            {!!modelName && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Model</Text>
                <Text style={styles.specValue}>{modelName}</Text>
              </View>
            )}
            {!!trimName && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Paket / Donanım</Text>
                <Text style={styles.specValue}>{trimName}</Text>
              </View>
            )}
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Model Yılı</Text>
              <Text style={styles.specValue}>{yearVal}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Kilometre</Text>
              <Text style={styles.specValue}>{Number(kmVal).toLocaleString('tr-TR')} km</Text>
            </View>
            {!!listing.fuelType && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Yakıt Tipi</Text>
                <Text style={styles.specValue}>
                  {FUEL_TYPE_LABELS[listing.fuelType] || listing.fuelType}
                </Text>
              </View>
            )}
            {!!listing.transmission && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Vites Tipi</Text>
                <Text style={styles.specValue}>
                  {TRANSMISSION_LABELS[listing.transmission] || listing.transmission}
                </Text>
              </View>
            )}
            {!!listing.bodyType && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Kasa Tipi</Text>
                <Text style={styles.specValue}>
                  {BODY_TYPE_LABELS[listing.bodyType] || listing.bodyType}
                </Text>
              </View>
            )}
            {!!listing.engineDisplacement && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Motor Hacmi</Text>
                <Text style={styles.specValue}>{listing.engineDisplacement} cc</Text>
              </View>
            )}
            {!!listing.enginePower && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Motor Gücü</Text>
                <Text style={styles.specValue}>{listing.enginePower} HP</Text>
              </View>
            )}
            {!!listing.drivetrain && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Çekiş</Text>
                <Text style={styles.specValue}>
                  {DRIVETRAIN_LABELS[listing.drivetrain] || listing.drivetrain}
                </Text>
              </View>
            )}
            {!!listing.color && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Renk</Text>
                <Text style={styles.specValue}>{listing.color}</Text>
              </View>
            )}
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Garanti Durumu</Text>
              <Text style={[styles.specValue, listing.hasWarranty && { color: '#16a34a', fontWeight: '800' }]}>
                {listing.hasWarranty ? 'Garantisi Var' : 'Garantisi Yok'}
              </Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Ağır Hasar Kaydı</Text>
              <Text style={[styles.specValue, listing.heavyDamage ? { color: '#dc2626', fontWeight: '800' } : { color: '#16a34a' }]}>
                {listing.heavyDamage ? 'Var (Ağır Hasarlı)' : 'Yok'}
              </Text>
            </View>
          </View>
        </View>

        {/* Ekspertiz, Boya & Değişen Bilgisi Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#ea580c" />
            <Text style={styles.cardTitle}>Ekspertiz ve Boya / Değişen</Text>
          </View>

          {/* Tramer Row */}
          <View style={styles.tramerRow}>
            <View>
              <Text style={styles.tramerLabel}>Tramer Hasar Tutarı</Text>
              <Text style={styles.tramerVal}>
                {listing.tramerAmount ? `${Number(listing.tramerAmount).toLocaleString('tr-TR')} TL` : '0 TL (Kayıt Yok)'}
              </Text>
            </View>
            {listing.tramerAmount > 0 && (
              <View style={styles.tramerBadge}>
                <Text style={styles.tramerBadgeText}>Hasar Kayıtlı</Text>
              </View>
            )}
          </View>

          {!!listing.damageRecord && (
            <View style={styles.damageRecordBox}>
              <Text style={styles.damageRecordTitle}>Hasar Kaydı Açıklaması:</Text>
              <Text style={styles.damageRecordText}>{listing.damageRecord}</Text>
            </View>
          )}

          {/* Body Parts Checklist */}
          {(painted.length > 0 || changed.length > 0) ? (
            <View style={styles.partsWrap}>
              <Text style={styles.partsSubtitle}>Boyalı veya Değişen Parçalar:</Text>
              <View style={styles.partsList}>
                {changed.map((k: string) => (
                  <View key={k} style={[styles.partItemPill, styles.partItemChanged]}>
                    <Ionicons name="close-circle" size={14} color="#dc2626" />
                    <Text style={[styles.partItemText, { color: '#dc2626' }]}>
                      {CAR_BODY_PARTS[k] || k} (Değişen)
                    </Text>
                  </View>
                ))}
                {painted.map((k: string) => (
                  <View key={k} style={[styles.partItemPill, styles.partItemPainted]}>
                    <Ionicons name="alert-circle" size={14} color="#d97706" />
                    <Text style={[styles.partItemText, { color: '#d97706' }]}>
                      {CAR_BODY_PARTS[k] || k} (Boyalı)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.hatasizBox}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={styles.hatasizText}>Hatasız / Boyasız / Değişensiz</Text>
            </View>
          )}

          {!!listing.maintenanceHistory && (
            <View style={styles.maintenanceBox}>
              <Text style={styles.maintenanceTitle}>Bakım Geçmişi & Notlar:</Text>
              <Text style={styles.maintenanceText}>{listing.maintenanceHistory}</Text>
            </View>
          )}
        </View>

        {/* Description Card */}
        {!!listing.description && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={18} color="#ea580c" />
              <Text style={styles.cardTitle}>İlan Açıklaması</Text>
            </View>
            <Text style={styles.descriptionText}>{listing.description}</Text>
          </View>
        )}

        {/* Seller Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={18} color="#ea580c" />
            <Text style={styles.cardTitle}>Satıcı Bilgileri</Text>
          </View>
          <View style={styles.sellerRow}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>
                {sellerFullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{sellerFullName}</Text>
              <Text style={styles.sellerSub}>
                {listing.sellerType === 'DEALER' ? 'Galeriden' : listing.sellerType === 'AUTHORIZED_DEALER' ? 'Yetkili Bayiden' : 'Sahibinden'} • {cityVal}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {!!sellerObj.phone && (
          <TouchableOpacity style={styles.callBtn} onPress={handleCallSeller}>
            <Ionicons name="call" size={18} color="#ea580c" />
            <Text style={styles.callBtnText}>Ara</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.chatBtn} onPress={handleStartChat}>
          <Ionicons name="chatbubbles" size={18} color="#ffffff" />
          <Text style={styles.chatBtnText}>Satıcıya Mesaj Gönder</Text>
        </TouchableOpacity>
      </View>
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
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  backButtonPrimary: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  backButtonPrimaryText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 110,
    gap: 14,
  },
  galleryWrap: {
    width,
    height: 250,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  gallerySlide: {
    width,
    height: 250,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoIndexText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  urgentBadgeWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: -0.3,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
  },
  quickInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quickInfoDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#cbd5e1',
  },
  quickInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  aiReportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff7ed',
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#ea580c',
  },
  aiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ea580c',
  },
  aiDesc: {
    fontSize: 11,
    color: '#9a3412',
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  specTable: {
    gap: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  specLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
  },
  specValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  tramerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tramerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tramerVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  tramerBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tramerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  damageRecordBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 4,
  },
  damageRecordTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  damageRecordText: {
    fontSize: 12,
    color: '#0f172a',
    lineHeight: 17,
  },
  partsWrap: {
    gap: 8,
  },
  partsSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  partsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  partItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  partItemPainted: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  partItemChanged: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  partItemText: {
    fontSize: 11,
    fontWeight: '800',
  },
  hatasizBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 12,
  },
  hatasizText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#15803d',
  },
  maintenanceBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 4,
  },
  maintenanceTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  maintenanceText: {
    fontSize: 12,
    color: '#0f172a',
    lineHeight: 17,
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  sellerSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#ea580c',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  callBtnText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#ea580c',
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  chatBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
});
