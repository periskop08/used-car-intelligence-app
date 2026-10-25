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
  Modal,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import UrgentBadge from '../../components/UrgentBadge';
import ShowcaseBadge from '../../components/ShowcaseBadge';

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

const formatPrice = (p: any): string => {
  return new Intl.NumberFormat('tr-TR').format(Number(p) || 0);
};

interface ListingItem {
  id: string;
  title: string;
  price: number;
  currency?: string;
  year?: number;
  mileage?: number;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'SOLD' | 'PASSIVE';
  urgentListing?: boolean;
  showcaseListing?: boolean;
  urgentExpiresAt?: string;
  showcaseExpiresAt?: string;
  publishedAt?: string;
  createdAt?: string;
  brand?: { name: string };
  model?: { name: string };
  media?: Array<{ mediaUrl: string }>;
  photos?: Array<{ photoUrl?: string; url?: string }>;
}

export default function MyListingsScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quota, setQuota] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'PASSIVE'>('ACTIVE');

  // Promotion Management State
  const [promotionListing, setPromotionListing] = useState<ListingItem | null>(null);
  const [promotionStatusData, setPromotionStatusData] = useState<any>(null);
  const [selectedSku, setSelectedSku] = useState<'URGENT_LISTING' | 'SHOWCASE_FEED' | 'URGENT_SHOWCASE_BUNDLE' | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submittingPromotion, setSubmittingPromotion] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchMyListings();
    }, [])
  );

  const fetchMyListings = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        Alert.alert('Giriş Yapın', 'İlanlarınızı görmek için lütfen giriş yapın.', [
          { text: 'Tamam', onPress: () => router.push('/login' as any) },
        ]);
        setLoading(false);
        return;
      }

      const [listRes, quotaRes] = await Promise.all([
        fetch(`${API_URL}/me/listings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/me/listing-quota`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        setListings(Array.isArray(data) ? data : data.items || []);
      }

      if (quotaRes.ok) {
        const qData = await quotaRes.json();
        setQuota(qData);
      }
    } catch (e) {
      console.error('Fetch my listings error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyListings();
  };

  const filteredListings = listings.filter((l) => {
    if (activeTab === 'ACTIVE') return l.status === 'ACTIVE';
    if (activeTab === 'PENDING') return l.status === 'PENDING_APPROVAL';
    return l.status === 'PASSIVE' || l.status === 'SOLD' || l.status === 'REJECTED';
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { text: 'YAYINDA', bg: '#dcfce7', color: '#16a34a' };
      case 'PENDING_APPROVAL':
        return { text: 'ONAY BEKLİYOR', bg: '#fef3c7', color: '#d97706' };
      case 'REJECTED':
        return { text: 'REDDEDİLDİ', bg: '#fee2e2', color: '#dc2626' };
      case 'SOLD':
        return { text: 'SATILDI', bg: '#f1f5f9', color: '#64748b' };
      default:
        return { text: 'PASİF', bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const handleOpenPromotion = async (item: ListingItem) => {
    setPromotionListing(item);
    setSelectedSku(null);
    setTermsAccepted(false);
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (token) {
        const res = await fetch(`${API_URL}/listing-promotions/status/${item.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const sData = await res.json();
          setPromotionStatusData(sData);
        }
      }
    } catch (e) {
      console.warn('Fetch promotion status error:', e);
    }
  };

  const handleCheckoutPromotion = async () => {
    if (!promotionListing || !selectedSku) return;
    if (!termsAccepted) {
      Alert.alert('Onay Gerekli', 'Lütfen ücretli ek hizmet koşullarını onaylayınız.');
      return;
    }

    setSubmittingPromotion(true);
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş, lütfen tekrar giriş yapın.');
        return;
      }

      // 1. Try test-checkout endpoint first
      const testRes = await fetch(`${API_URL}/listing-promotions/test-checkout/${promotionListing.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productSku: selectedSku,
        }),
      });

      if (testRes.ok) {
        Alert.alert(
          'Tebrikler! 🎉',
          'Promosyon paketi başarıyla aktifleştirildi. İlanınızın vitrin ve acil görünürlüğü güncellendi.',
          [{
            text: 'Harika',
            onPress: () => {
              setPromotionListing(null);
              fetchMyListings();
            },
          }]
        );
        return;
      }

      // 2. Fallback to quotes + checkout + webhook flow (matching web)
      const quoteRes = await fetch(`${API_URL}/listing-promotions/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: promotionListing.id,
          productSku: selectedSku,
        }),
      });

      const quoteData = await quoteRes.json();
      if (!quoteRes.ok) {
        throw new Error(quoteData.message || 'Teklif oluşturulamadı.');
      }

      const checkoutRes = await fetch(`${API_URL}/listing-promotions/checkout/${promotionListing.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quoteId: quoteData.quoteId,
          idempotencyKey: `chk_mob_${promotionListing.id}_${selectedSku}_${Date.now()}`,
          termsAccepted: true,
          termsVersion: quoteData.termsVersion || 'v1',
          entryPoint: 'MOBILE_MY_LISTINGS',
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.message || 'Ödeme başlatılamadı.');
      }

      // Mock webhook confirmation
      await fetch(`${API_URL}/listing-promotions/webhooks/mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'payment.success',
          purchaseId: checkoutData.purchaseId,
          paymentReferenceId: `PAY_MOB_${Date.now()}`,
        }),
      });

      Alert.alert(
        'Tebrikler! 🎉',
        'Promosyon paketi başarıyla aktifleştirildi. İlanınızın vitrin ve acil görünürlüğü güncellendi.',
        [{
          text: 'Harika',
          onPress: () => {
            setPromotionListing(null);
            fetchMyListings();
          },
        }]
      );
    } catch (e: any) {
      Alert.alert('İşlem Başarısız', e.message || 'Promosyon aktifleştirilirken bir sorun oluştu.');
    } finally {
      setSubmittingPromotion(false);
    }
  };

  const handleToggleStatus = async (item: ListingItem) => {
    const isCurrentlyActive = item.status === 'ACTIVE';
    const newStatus = isCurrentlyActive ? 'PASSIVE' : 'ACTIVE';
    const actionText = isCurrentlyActive ? 'Yayından Kaldır' : 'Yeniden Yayına Al';

    Alert.alert(
      actionText,
      `Bu ilanı ${isCurrentlyActive ? 'yayından kaldırmak' : 'tekrar yayına almak'} istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: actionText,
          onPress: async () => {
            try {
              const token =
                (await AsyncStorage.getItem('accessToken')) ||
                (await AsyncStorage.getItem('token'));
              if (!token) return;

              const res = await fetch(`${API_URL}/me/listings/${item.id}/status`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
              });

              if (res.ok) {
                Alert.alert('Bilgi', `İlanınız ${isCurrentlyActive ? 'yayından kaldırıldı' : 'yayına alındı'}.`);
                fetchMyListings();
              } else {
                const fbRes = await fetch(`${API_URL}/listings/${item.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ status: newStatus }),
                });
                if (fbRes.ok) {
                  Alert.alert('Bilgi', `İlanınız ${isCurrentlyActive ? 'yayından kaldırıldı' : 'yayına alındı'}.`);
                  fetchMyListings();
                } else {
                  Alert.alert('Hata', 'Durum güncellenemedi.');
                }
              }
            } catch (e) {
              Alert.alert('Hata', 'Bağlantı hatası oluştu.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteListing = (item: ListingItem) => {
    Alert.alert(
      'İlanı Sil',
      'Bu ilanı tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const token =
                (await AsyncStorage.getItem('accessToken')) ||
                (await AsyncStorage.getItem('token'));
              if (!token) return;

              const res = await fetch(`${API_URL}/me/listings/${item.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (res.ok) {
                Alert.alert('Silindi', 'İlanınız başarıyla silindi.');
                fetchMyListings();
              } else {
                Alert.alert('Hata', 'İlan silinemedi.');
              }
            } catch (e) {
              Alert.alert('Hata', 'Silme işlemi sırasında hata oluştu.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İlanlarım</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/create-listing' as any)}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Quota Summary Banner */}
      {quota && (
        <View style={styles.quotaBanner}>
          <View style={styles.quotaLeft}>
            <Ionicons name="car-sport" size={20} color="#ea580c" />
            <View>
              <Text style={styles.quotaTitle}>İlan Yayınlama Kotası</Text>
              <Text style={styles.quotaSub}>
                {quota.usedListings || 0} / {quota.maxListings || 1} İlan Kullanımda
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addListingChip}
            onPress={() => router.push('/create-listing' as any)}
          >
            <Text style={styles.addListingChipText}>+ Yeni İlan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[
          { key: 'ACTIVE', label: `Yayında (${listings.filter((l) => l.status === 'ACTIVE').length})` },
          { key: 'PENDING', label: `Onayda (${listings.filter((l) => l.status === 'PENDING_APPROVAL').length})` },
          { key: 'PASSIVE', label: `Geçmiş (${listings.filter((l) => l.status !== 'ACTIVE' && l.status !== 'PENDING_APPROVAL').length})` },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>İlanlarınız yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {filteredListings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="car-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Bu sekmede ilan bulunmuyor</Text>
              <Text style={styles.emptyDesc}>
                Aracınızı hemen satışa sunmak için yeni ilan ekleyebilirsiniz.
              </Text>
              <TouchableOpacity
                style={styles.createListingBtn}
                onPress={() => router.push('/create-listing' as any)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.createListingBtnText}>Hemen İlan Ver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredListings.map((item) => {
              const badge = getStatusBadge(item.status);
              const imgUrl =
                item.media?.[0]?.mediaUrl ||
                item.photos?.[0]?.photoUrl ||
                item.photos?.[0]?.url;

              return (
                <View key={item.id} style={styles.listingCardWrap}>
                  <TouchableOpacity
                    style={styles.listingCard}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/listings/${item.id}` as any)}
                  >
                    <View style={styles.cardImageWrap}>
                      {imgUrl ? (
                        <ExpoImage
                          source={{ uri: resolveMediaUrl(imgUrl) }}
                          style={styles.cardImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={styles.cardImageFallback}>
                          <Ionicons name="car-sport" size={28} color="#cbd5e1" />
                        </View>
                      )}
                      <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>

                      {(item.urgentListing || item.showcaseListing) && (
                        <View style={styles.cardPromoBadgesWrap}>
                          {item.urgentListing && <UrgentBadge size="xs" animated={false} />}
                          {item.showcaseListing && <ShowcaseBadge size="xs" />}
                        </View>
                      )}
                    </View>

                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {item.title || `${item.brand?.name || ''} ${item.model?.name || ''}`}
                      </Text>

                      <Text style={styles.cardPrice}>
                        {formatPrice(item.price)} TL
                      </Text>

                      <View style={styles.cardMetaRow}>
                        {item.year && <Text style={styles.cardMetaText}>{item.year} Yıl</Text>}
                        {item.mileage !== undefined && (
                          <Text style={styles.cardMetaText}>• {new Intl.NumberFormat('tr-TR').format(item.mileage)} KM</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* ACTION TOOLBAR: ÖNE ÇIKAR, DÜZENLE, YAYINDAN KALDIR / AL, SİL */}
                  <View style={styles.cardActionsBar}>
                    {item.status === 'ACTIVE' && (
                      <TouchableOpacity
                        style={[styles.cardActionBtn, styles.cardActionBtnPromote]}
                        activeOpacity={0.7}
                        onPress={() => handleOpenPromotion(item)}
                      >
                        <Ionicons name="flame" size={13} color="#ea580c" />
                        <Text style={[styles.cardActionBtnText, { color: '#ea580c', fontWeight: '800' }]} numberOfLines={1}>
                          Öne Çıkar
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      activeOpacity={0.7}
                      onPress={() => router.push(`/edit-listing?id=${item.id}` as any)}
                    >
                      <Ionicons name="pencil" size={13} color="#ea580c" />
                      <Text style={styles.cardActionBtnText} numberOfLines={1}>Düzenle</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      activeOpacity={0.7}
                      onPress={() => handleToggleStatus(item)}
                    >
                      <Ionicons
                        name={item.status === 'ACTIVE' ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={14}
                        color="#334155"
                      />
                      <Text style={[styles.cardActionBtnText, { color: '#334155' }]} numberOfLines={1}>
                        {item.status === 'ACTIVE' ? 'Yayından Kaldır' : 'Yayına Al'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cardActionBtn, styles.cardActionBtnDanger]}
                      activeOpacity={0.7}
                      onPress={() => handleDeleteListing(item)}
                    >
                      <Ionicons name="trash-outline" size={13} color="#dc2626" />
                      <Text style={[styles.cardActionBtnText, { color: '#dc2626' }]} numberOfLines={1}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* PROMOTION MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={!!promotionListing}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!submittingPromotion) {
            setPromotionListing(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.promoSheet}>
            {/* Header */}
            <View style={styles.promoHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.promoTitle}>🚀 İlanı Öne Çıkar</Text>
                <Text style={styles.promoSubtitle} numberOfLines={1} ellipsizeMode="tail">
                  {promotionListing?.title || 'Seçilen İlan'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                disabled={submittingPromotion}
                onPress={() => setPromotionListing(null)}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 460 }}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Existing active promotion notice */}
              {promotionStatusData &&
                (promotionStatusData.urgentPromotion || promotionStatusData.showcasePromotion) && (
                  <View style={styles.promoActiveNotice}>
                    <Text style={styles.promoActiveNoticeTitle}>
                      🟢 Bu İlanda Aktif Promosyon Bulunuyor
                    </Text>
                    {promotionStatusData.urgentPromotion && (
                      <Text style={styles.promoActiveNoticeText}>
                        🚨 Acil İlan: {promotionStatusData.urgentPromotion.expiresAt ? new Date(promotionStatusData.urgentPromotion.expiresAt).toLocaleDateString('tr-TR') : 'Yayında'}
                      </Text>
                    )}
                    {promotionStatusData.showcasePromotion && (
                      <Text style={styles.promoActiveNoticeText}>
                        ⭐ Vitrin + Akış: {promotionStatusData.showcasePromotion.expiresAt ? new Date(promotionStatusData.showcasePromotion.expiresAt).toLocaleDateString('tr-TR') : 'Yayında'}
                      </Text>
                    )}
                  </View>
                )}

              {/* Promo Option 1: Acil İlan */}
              <TouchableOpacity
                style={[
                  styles.promoOptionCard,
                  selectedSku === 'URGENT_LISTING' && styles.promoOptionCardActiveUrgent,
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  setSelectedSku(selectedSku === 'URGENT_LISTING' ? null : 'URGENT_LISTING')
                }
              >
                <View style={styles.promoOptionTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <UrgentBadge size="medium" animated={false} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoCardTitle} numberOfLines={1}>Acil İlan</Text>
                      <Text style={styles.promoCardSubtitle} numberOfLines={1}>Kırmızı ACİL rozeti & filtreler</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={selectedSku === 'URGENT_LISTING' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedSku === 'URGENT_LISTING' ? '#dc2626' : '#cbd5e1'}
                  />
                </View>
                <View style={styles.promoOptionBottom}>
                  <Text style={styles.promoFeatureNote} numberOfLines={1}>✓ Acil İlanlar Sekmesinde Gösterim</Text>
                  <Text style={styles.promoPriceUrgent}>99 ₺</Text>
                </View>
              </TouchableOpacity>

              {/* Promo Option 2: Vitrin + Akış */}
              <TouchableOpacity
                style={[
                  styles.promoOptionCard,
                  selectedSku === 'SHOWCASE_FEED' && styles.promoOptionCardActiveVitrin,
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  setSelectedSku(selectedSku === 'SHOWCASE_FEED' ? null : 'SHOWCASE_FEED')
                }
              >
                <View style={styles.promoOptionTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <ShowcaseBadge size="medium" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoCardTitle} numberOfLines={1}>Vitrin + Akış</Text>
                      <Text style={styles.promoCardSubtitle} numberOfLines={1}>Ana Sayfa Vitrin ve İlan Akışı</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={selectedSku === 'SHOWCASE_FEED' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedSku === 'SHOWCASE_FEED' ? '#f59e0b' : '#cbd5e1'}
                  />
                </View>
                <View style={styles.promoOptionBottom}>
                  <Text style={styles.promoFeatureNote} numberOfLines={1}>✓ Maksimum Ana Sayfa Görünürlüğü</Text>
                  <Text style={styles.promoPriceVitrin}>199 ₺</Text>
                </View>
              </TouchableOpacity>

              {/* Promo Option 3: Hızlı Satış Paketi (Bundle) */}
              <TouchableOpacity
                style={[
                  styles.promoOptionCard,
                  selectedSku === 'URGENT_SHOWCASE_BUNDLE' && styles.promoOptionCardActiveBundle,
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  setSelectedSku(selectedSku === 'URGENT_SHOWCASE_BUNDLE' ? null : 'URGENT_SHOWCASE_BUNDLE')
                }
              >
                <View style={styles.promoRibbon}>
                  <Text style={styles.promoRibbonText}>🔥 EN AVANTAJLI PAKET</Text>
                </View>
                <View style={styles.promoOptionTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <UrgentBadge size="small" animated={false} />
                    <ShowcaseBadge size="small" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoCardTitle} numberOfLines={1}>Hızlı Satış Paketi</Text>
                      <Text style={styles.promoCardSubtitle} numberOfLines={1}>Acil İlan + Vitrin Kombo</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={selectedSku === 'URGENT_SHOWCASE_BUNDLE' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedSku === 'URGENT_SHOWCASE_BUNDLE' ? '#ea580c' : '#cbd5e1'}
                  />
                </View>
                <View style={styles.promoOptionBottom}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.promoStrikethroughPrice}>298 ₺</Text>
                    <Text style={styles.promoSavingsBadge}>%16 İndirim</Text>
                  </View>
                  <Text style={styles.promoPriceBundle}>249 ₺</Text>
                </View>
              </TouchableOpacity>

              {/* Terms Checkbox */}
              {selectedSku && (
                <TouchableOpacity
                  style={styles.promoTermsBox}
                  activeOpacity={0.8}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                >
                  <Ionicons
                    name={termsAccepted ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={termsAccepted ? '#ea580c' : '#94a3b8'}
                  />
                  <Text style={styles.promoTermsText}>
                    Seçtiğim ilan promosyonunun abonelikten bağımsız, tek seferlik ek bir hizmet olduğunu kabul ediyorum.
                  </Text>
                </TouchableOpacity>
              )}

              {/* Submit Button */}
              {selectedSku && (
                <TouchableOpacity
                  style={[
                    styles.promoSubmitBtn,
                    (!termsAccepted || submittingPromotion) && styles.promoSubmitBtnDisabled,
                  ]}
                  disabled={!termsAccepted || submittingPromotion}
                  onPress={handleCheckoutPromotion}
                  activeOpacity={0.85}
                >
                  {submittingPromotion ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={16} color="#ffffff" />
                      <Text style={styles.promoSubmitBtnText} numberOfLines={1}>
                        Öde ve Promosyonu Aktifleştir
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quotaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  quotaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quotaTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  quotaSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  addListingChip: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addListingChipText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
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
  createListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  createListingBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  listingCardWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  listingCard: {
    flexDirection: 'row',
  },
  cardActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardActionBtnPromote: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  cardActionBtnDanger: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  cardActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  cardPromoBadgesWrap: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  cardImageWrap: {
    width: 120,
    height: 105,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgePill: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 18,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ea580c',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  promoSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '85%',
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  promoSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoActiveNotice: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  promoActiveNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  promoActiveNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  promoOptionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  promoOptionCardActiveUrgent: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  promoOptionCardActiveVitrin: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  promoOptionCardActiveBundle: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  promoOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  promoCardSubtitle: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  promoOptionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  promoFeatureNote: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '500',
    flexShrink: 1,
    paddingRight: 6,
  },
  promoPriceUrgent: {
    fontSize: 14,
    fontWeight: '900',
    color: '#dc2626',
  },
  promoPriceVitrin: {
    fontSize: 14,
    fontWeight: '900',
    color: '#d97706',
  },
  promoPriceBundle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ea580c',
  },
  promoRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
  },
  promoRibbonText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  promoStrikethroughPrice: {
    fontSize: 11,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  promoSavingsBadge: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ea580c',
    backgroundColor: '#fed7aa',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  promoTermsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  promoTermsText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    flex: 1,
  },
  promoSubmitBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 6,
    marginBottom: 16,
  },
  promoSubmitBtnDisabled: {
    opacity: 0.5,
  },
  promoSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
