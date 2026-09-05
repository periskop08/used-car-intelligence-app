import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  PanResponder,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CLOUDFLARE_VEHICLE_IMAGES } from '../../constants/vehicleImages';
import UrgentBadge from '../../components/UrgentBadge';
import VehicleConditionVisualizer from '../../components/VehicleConditionVisualizer';

const { width, height } = Dimensions.get('window');
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
  }

  return 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80';
};

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
  DCT: 'Otomatik (DCT / DSG)',
  CVT: 'Otomatik (CVT)',
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
  AWD_ELECTRONIC: 'Elektronik 4 Çeker (AWD)',
};

type ActiveTabType = 'SPECS' | 'DESCRIPTION' | 'LOCATION';

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTabType>('SPECS');
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const heroScrollRef = useRef<ScrollView>(null);
  const lightboxScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (id === 'create') {
      router.replace('/create-listing');
      return;
    }
    if (id) {
      fetchListingDetail();
      loadUser();
      checkFavoriteStatus();
    }
  }, [id]);

  // PanResponder to dismiss full-screen lightbox on vertical swipe down/up
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 25 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50 || gestureState.dy < -50) {
          setIsLightboxOpen(false);
        }
      },
    })
  ).current;

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

  const checkFavoriteStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token || !id) return;
      const res = await fetch(`${API_URL}/me/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const favs = await res.json();
        const found = Array.isArray(favs) && favs.some((f: any) => f.listingId === id || f.id === id);
        setIsFavorite(found);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchListingDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/listings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setListing(data);
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

  const toggleFavorite = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      Alert.alert('Giriş Gerekli', 'İlanı favorilerinize eklemek için lütfen giriş yapın.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/login' as any) },
      ]);
      return;
    }

    const nextState = !isFavorite;
    setIsFavorite(nextState);

    try {
      if (nextState) {
        await fetch(`${API_URL}/me/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ listingId: id }),
        });
      } else {
        await fetch(`${API_URL}/me/favorites/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.error('Favorite toggle failed:', e);
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

      const res = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: listing.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        router.push({
          pathname: '/messages/[id]',
          params: {
            id: data.id,
            initialDraft: 'Merhaba, ilanınız hakkında bilgi alabilir miyim?',
          },
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

  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const [lightboxTranslateY, setLightboxTranslateY] = useState<number>(0);

  const handleLightboxTouchStart = (e: any) => {
    touchStartY.current = e.nativeEvent.pageY;
    touchStartX.current = e.nativeEvent.pageX;
  };

  const handleLightboxTouchMove = (e: any) => {
    const currentY = e.nativeEvent.pageY;
    const diffY = currentY - touchStartY.current;
    const diffX = Math.abs(e.nativeEvent.pageX - touchStartX.current);

    if (diffY > 10 && diffY > diffX) {
      setLightboxTranslateY(diffY);
    }
  };

  const handleLightboxTouchEnd = (e: any) => {
    const diffY = e.nativeEvent.pageY - touchStartY.current;
    const diffX = Math.abs(e.nativeEvent.pageX - touchStartX.current);

    if (diffY > 50 && diffY > diffX * 0.7) {
      setIsLightboxOpen(false);
      setLightboxTranslateY(0);
    } else {
      setLightboxTranslateY(0);
    }
  };

  const openLightboxAt = (index: number) => {
    setActivePhotoIndex(index);
    setLightboxTranslateY(0);
    setIsLightboxOpen(true);
    setTimeout(() => {
      lightboxScrollRef.current?.scrollTo({ x: index * width, animated: false });
    }, 50);
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

  const brandName = listing.vehicleVariant?.model?.brand?.name || listing.vehicleVariant?.brand?.name || listing.customBrand || '';
  const modelFamilyName = listing.vehicleVariant?.model?.name || listing.customModel || '';
  const trimName = listing.vehicleVariant?.trim?.name || '';
  const priceVal = listing.priceAmount ?? listing.price ?? 0;
  const kmVal = listing.kilometers ?? listing.mileage ?? 0;
  const yearVal = listing.modelYear ?? listing.year ?? '-';
  const cityVal = listing.city || 'Belirtilmedi';
  const districtVal = listing.district ? `, ${listing.district}` : '';
  const sellerObj = listing.seller || listing.user || {};
  const sellerFullName = `${sellerObj.firstName || ''} ${sellerObj.lastName || ''}`.trim() || sellerObj.username || 'Satıcı';

  const rawPhotos = Array.isArray(listing.media) && listing.media.length > 0
    ? listing.media.map((m: any) => formatCloudflareImageUrl(m.url)).filter(Boolean)
    : [];

  const displayPhotos = rawPhotos.length > 0
    ? rawPhotos
    : [resolveVehicleImageUrl(null, brandName, modelFamilyName)];

  const formattedDate = listing.createdAt
    ? new Date(listing.createdAt).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '05.09.2026';

  const listingNumber =
    listing.listingNo ||
    (listing.id ? listing.id.substring(0, 8).toUpperCase() : '-');

  const sellerTypeLabel =
    listing.sellerType === 'DEALER'
      ? 'Galeriden'
      : listing.sellerType === 'AUTHORIZED_DEALER'
      ? 'Yetkili Bayiden'
      : 'Sahibinden';

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER (White Background with Dark Icons) */}
      <View style={[styles.topHeaderBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          İlan Detayı
        </Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color="#0f172a" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIconButton} onPress={toggleFavorite} activeOpacity={0.7}>
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={23}
              color={isFavorite ? '#ea580c' : '#0f172a'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. LISTING TITLE BANNER */}
        <View style={styles.titleBanner}>
          <Text style={styles.titleBannerText}>
            {listing.title?.toUpperCase() || `${brandName} ${modelFamilyName} ${trimName}`.trim()}
          </Text>
        </View>

        {/* 3. HERO IMAGE GALLERY (Tap to open Fullscreen Lightbox) */}
        <View style={styles.galleryWrap}>
          <ScrollView
            ref={heroScrollRef}
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
              <TouchableOpacity
                key={idx}
                style={styles.gallerySlide}
                activeOpacity={0.95}
                onPress={() => openLightboxAt(idx)}
              >
                <ExpoImage
                  source={{ uri }}
                  style={styles.galleryImage}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Photo Pagination Badge */}
          <TouchableOpacity
            style={styles.photoIndexBadge}
            onPress={() => openLightboxAt(activePhotoIndex)}
            activeOpacity={0.8}
          >
            <Text style={styles.photoIndexText}>
              {activePhotoIndex + 1} / {displayPhotos.length}
            </Text>
          </TouchableOpacity>

          {/* Urgent Badge */}
          {listing.isUrgent && (
            <View style={styles.urgentBadgeWrap}>
              <UrgentBadge size="medium" />
            </View>
          )}
        </View>

        {/* 4. SELLER INFO & BREADCRUMB CATEGORY & LOCATION STRIP */}
        <View style={styles.sellerBreadcrumbStrip}>
          <View style={styles.sellerHeaderRow}>
            <Text style={styles.sellerHighlightName}>{sellerFullName}</Text>
          </View>

          <Text style={styles.breadcrumbText} numberOfLines={1}>
            Vasıta &gt; Otomobil &gt; {brandName || 'Audi'} &gt; {modelFamilyName || 'A3'}
            {trimName ? ` &gt; ${trimName}` : ''}
          </Text>

          <Text style={styles.locationSubText}>
            {cityVal}{districtVal}
          </Text>
        </View>

        {/* 5. SEGMENTED TABS BAR */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'SPECS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('SPECS')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'SPECS' && styles.tabBtnTextActive]}>
              İlan Bilgileri
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'DESCRIPTION' && styles.tabBtnActive]}
            onPress={() => setActiveTab('DESCRIPTION')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'DESCRIPTION' && styles.tabBtnTextActive]}>
              Açıklama
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'LOCATION' && styles.tabBtnActive]}
            onPress={() => setActiveTab('LOCATION')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'LOCATION' && styles.tabBtnTextActive]}>
              Konumu
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: İLAN BİLGİLERİ */}
        {activeTab === 'SPECS' && (
          <View style={styles.tabContentContainer}>
            {/* Specs Table */}
            <View style={styles.tableContainer}>
              <View style={[styles.tableRow, styles.priceRow]}>
                <Text style={styles.tableLabel}>Fiyat</Text>
                <View style={styles.priceValWrap}>
                  <Text style={styles.priceHighlight}>
                    {Number(priceVal).toLocaleString('tr-TR')} {listing.currency || 'TRY'}
                  </Text>
                  <Ionicons name="time-outline" size={16} color="#ea580c" />
                </View>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>İlan Tarihi</Text>
                <Text style={styles.tableValue}>{formattedDate}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>İlan No</Text>
                <Text style={[styles.tableValue, { color: '#dc2626', fontWeight: '800' }]}>
                  {listingNumber}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Marka</Text>
                <Text style={styles.tableValue}>{brandName || '-'}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Seri</Text>
                <Text style={styles.tableValue}>{modelFamilyName || '-'}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Model</Text>
                <Text style={styles.tableValue}>{trimName || `${brandName} ${modelFamilyName}`}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Yıl</Text>
                <Text style={styles.tableValue}>{yearVal}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Yakıt / Motor Tipi</Text>
                <Text style={styles.tableValue}>
                  {FUEL_TYPE_LABELS[listing.fuelType] || listing.fuelType || 'Benzin'}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Vites</Text>
                <Text style={styles.tableValue}>
                  {TRANSMISSION_LABELS[listing.transmission] || listing.transmission || 'Otomatik'}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Araç Durumu</Text>
                <Text style={styles.tableValue}>
                  {listing.vehicleStatus === 'NEW' ? 'Sıfır' : 'İkinci El'}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Kilometre</Text>
                <Text style={styles.tableValue}>{Number(kmVal).toLocaleString('tr-TR')} km</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Kasa Tipi</Text>
                <Text style={styles.tableValue}>
                  {BODY_TYPE_LABELS[listing.bodyType] || listing.bodyType || 'Sedan'}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Motor Gücü</Text>
                <Text style={styles.tableValue}>
                  {listing.enginePower ? `${listing.enginePower} HP` : 'Belirtilmedi'}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Motor Hacmi</Text>
                <Text style={styles.tableValue}>
                  {listing.engineDisplacement ? `${listing.engineDisplacement} cc` : 'Belirtilmedi'}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Çekiş</Text>
                <Text style={styles.tableValue}>
                  {DRIVETRAIN_LABELS[listing.drivetrain] || listing.drivetrain || 'Önden Çekiş'}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Renk</Text>
                <Text style={styles.tableValue}>{listing.color || 'Beyaz'}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Garanti</Text>
                <Text style={[styles.tableValue, listing.hasWarranty && { color: '#16a34a', fontWeight: '800' }]}>
                  {listing.hasWarranty ? 'Var' : 'Yok'}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Ağır Hasar Kayıtlı</Text>
                <Text style={[styles.tableValue, listing.heavyDamage ? { color: '#dc2626', fontWeight: '800' } : { color: '#16a34a' }]}>
                  {listing.heavyDamage ? 'Evet' : 'Hayır'}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Plaka / Uyruk</Text>
                <Text style={styles.tableValue}>Türkiye (TR) Plakalı</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Kimden</Text>
                <Text style={styles.tableValue}>{sellerTypeLabel}</Text>
              </View>

              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.tableLabel}>Takasa Uygun</Text>
                <Text style={styles.tableValue}>{listing.exchangeable ? 'Evet' : 'Hayır'}</Text>
              </View>
            </View>

            {/* TorqueScout AI Kronik Arıza & Risk Raporu Banner */}
            {listing.vehicleVariantId && (
              <TouchableOpacity
                style={styles.aiReportCard}
                onPress={() =>
                  router.push({
                    pathname: '/vehicle-report',
                    params: { variantId: listing.vehicleVariantId },
                  } as any)
                }
                activeOpacity={0.85}
              >
                <View style={styles.aiIconBox}>
                  <Ionicons name="sparkles" size={24} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.aiBadgeRow}>
                    <Text style={styles.aiTitle}>AI Kronik Arıza &amp; Risk Analizi</Text>
                    <View style={styles.aiProBadge}>
                      <Text style={styles.aiProBadgeText}>AI PRO</Text>
                    </View>
                  </View>
                  <Text style={styles.aiDesc}>
                    Bu modelin fabrika kronikleri, geri çağırmaları ve ekspertiz kontrol listesini inceleyin.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ea580c" />
              </TouchableOpacity>
            )}

            {/* 2D Ekspertiz, Boya & Değişen Şeması */}
            <VehicleConditionVisualizer
              paintedParts={listing.paintedParts}
              changedParts={listing.changedParts}
              localPaintedParts={listing.localPaintedParts}
              damageRecord={listing.damageRecord}
              tramerAmount={listing.tramerAmount}
              maintenanceHistory={listing.maintenanceHistory}
            />
          </View>
        )}

        {/* TAB 2: AÇIKLAMA */}
        {activeTab === 'DESCRIPTION' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <Ionicons name="document-text-outline" size={18} color="#ea580c" />
                <Text style={styles.sectionCardTitle}>İlan Açıklaması</Text>
              </View>
              <Text style={styles.descriptionText}>
                {listing.description || 'Satıcı tarafından detaylı bir açıklama belirtilmemiş.'}
              </Text>
            </View>
          </View>
        )}

        {/* TAB 3: KONUMU & SATICI */}
        {activeTab === 'LOCATION' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <Ionicons name="location-outline" size={18} color="#ea580c" />
                <Text style={styles.sectionCardTitle}>İlan Konumu</Text>
              </View>
              <View style={styles.locationDetailRow}>
                <View style={styles.locationPinIconBox}>
                  <Ionicons name="navigate-circle" size={28} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationDetailTitle}>{cityVal}{districtVal}</Text>
                  <Text style={styles.locationDetailSub}>Türkiye</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <Ionicons name="person-outline" size={18} color="#ea580c" />
                <Text style={styles.sectionCardTitle}>Satıcı Profili</Text>
              </View>
              <View style={styles.sellerProfileRow}>
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerAvatarText}>
                    {sellerFullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sellerName}>{sellerFullName}</Text>
                  <Text style={styles.sellerSub}>
                    {sellerTypeLabel} • {cityVal}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 6. BOTTOM STICKY ACTION BAR */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCallSeller} activeOpacity={0.85}>
          <Ionicons name="call" size={18} color="#ffffff" />
          <Text style={styles.callBtnText}>Ara</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatBtn} onPress={handleStartChat} activeOpacity={0.85}>
          <Ionicons name="chatbubbles" size={18} color="#ffffff" />
          <Text style={styles.chatBtnText}>Mesaj Gönder</Text>
        </TouchableOpacity>
      </View>

      {/* 7. FULLSCREEN LIGHTBOX MODAL GALLERY */}
      <Modal
        visible={isLightboxOpen}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsLightboxOpen(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.lightboxContainer}>
          {/* Lightbox Top Controls */}
          <View style={[styles.lightboxHeader, { paddingTop: Math.max(insets.top, 16) }]}>
            <Text style={styles.lightboxCounter}>
              {activePhotoIndex + 1} / {displayPhotos.length}
            </Text>

            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => {
                setIsLightboxOpen(false);
                setLightboxTranslateY(0);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.lightboxCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          {/* Fullscreen Horizontal Swipe Gallery */}
          <ScrollView
            ref={lightboxScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const offset = e.nativeEvent.contentOffset.x;
              const idx = Math.round(offset / width);
              setActivePhotoIndex(idx);
            }}
            scrollEventThrottle={16}
            style={styles.lightboxScroll}
          >
            {displayPhotos.map((uri: string, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.lightboxSlide,
                  lightboxTranslateY > 0 ? { transform: [{ translateY: lightboxTranslateY }] } : null,
                ]}
                onTouchStart={handleLightboxTouchStart}
                onTouchMove={handleLightboxTouchMove}
                onTouchEnd={handleLightboxTouchEnd}
                onTouchCancel={() => setLightboxTranslateY(0)}
              >
                <ExpoImage
                  source={{ uri }}
                  style={styles.lightboxImage}
                  contentFit="contain"
                  transition={150}
                />
              </View>
            ))}
          </ScrollView>

          {/* Pull to dismiss hint */}
          <View style={[styles.lightboxFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.lightboxFooterHint}>
              Kapatmak için aşağı kaydırın veya Kapat'a dokunun
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#ffffff',
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
  /* Top Bar */
  topHeaderBar: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  /* Title Banner */
  titleBanner: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titleBannerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 18,
    textAlign: 'center',
  },
  /* Gallery */
  galleryWrap: {
    width,
    height: 270,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  gallerySlide: {
    width,
    height: 270,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoIndexText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  urgentBadgeWrap: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  /* Seller & Breadcrumb Strip */
  sellerBreadcrumbStrip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    gap: 4,
  },
  sellerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerHighlightName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  breadcrumbText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ea580c',
    textAlign: 'center',
  },
  locationSubText: {
    fontSize: 11.5,
    color: '#64748b',
    textAlign: 'center',
  },
  /* Tabs Bar */
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtnActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  /* Tab Content */
  tabContentContainer: {
    paddingVertical: 10,
    gap: 12,
  },
  /* Table */
  tableContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  priceRow: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
  },
  tableLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  tableValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
  },
  priceValWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceHighlight: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: -0.2,
  },
  /* AI Banner */
  aiReportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff7ed',
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#ea580c',
  },
  aiIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ea580c',
  },
  aiProBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiProBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  aiDesc: {
    fontSize: 11,
    color: '#9a3412',
    marginTop: 3,
    lineHeight: 15,
  },
  /* Generic Section Card */
  sectionCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  sectionCardTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  /* Location & Seller */
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
  },
  locationPinIconBox: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDetailTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  locationDetailSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sellerProfileRow: {
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
  /* Bottom Action Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 8,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingVertical: 12,
  },
  callBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingVertical: 12,
  },
  chatBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  /* Fullscreen Lightbox Styles */
  lightboxContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  lightboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 20,
  },
  lightboxCounter: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  lightboxCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
  },
  lightboxCloseText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  lightboxScroll: {
    flex: 1,
  },
  lightboxSlide: {
    width,
    height: height * 0.78,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxFooter: {
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  lightboxFooterHint: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
