import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import TorkScoutLoader from '../../components/TorkScoutLoader';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const ARAC_REHBERI_ICON = require('../../../assets/images/arac-rehberi-icon.png');
const ARACINI_BUL_ICON = require('../../../assets/images/aracini-bul-icon.png');
const ISICEPTE_LOGO = require('../../../assets/images/isicepte-logo.png');
const AKIS_ICON = require('../../../assets/images/akis-icon.png');
const CLUB_TAB_ICON = require('../../../assets/images/club-tab-icon.png');

const resolveAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
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

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phone2?: string;
  phone3?: string;
  displayNamePreference?: 'FULL_NAME' | 'SHORT_NAME' | 'USERNAME';
  profilePhotoUrl?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  subscriptionTier: 'FREE' | 'TANISMA' | 'BASIC' | 'YETKIN' | 'STANDARD' | 'PRO' | 'PROFESYONEL' | 'PREMIUM';
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [whyExpanded, setWhyExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else if (res.status === 401) {
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('token');
        setProfile(null);
      }

      // Fetch unread count
      fetch(`${API_URL}/conversations/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && typeof d.unreadCount === 'number') {
            setUnreadMessagesCount(d.unreadCount);
          }
        })
        .catch(() => {});
    } catch (e) {
      console.error('Fetch profile error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('token');
          setProfile(null);
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const getDisplayName = () => {
    if (!profile) return '';
    const pref = profile.displayNamePreference || 'FULL_NAME';
    if (pref === 'USERNAME' && profile.username) {
      return `@${profile.username}`;
    }
    if (pref === 'SHORT_NAME' && profile.firstName) {
      return `${profile.firstName} ${profile.lastName ? profile.lastName[0] + '.' : ''}`.trim();
    }
    if (profile.firstName || profile.lastName) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }
    if (profile.username) return `@${profile.username}`;
    return profile.email.split('@')[0];
  };

  const getTierBadgeText = () => {
    const tier = profile?.subscriptionTier || 'FREE';
    if (tier === 'PROFESYONEL' || tier === 'PRO' || tier === 'PREMIUM') return 'PROFESYONEL';
    if (tier === 'YETKIN' || tier === 'STANDARD' || tier === 'BASIC') return 'YETKİN';
    return 'TANIŞMA';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <TorkScoutLoader />
        <Text style={styles.loadingText}>Profiliniz yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Profilim & Hesabım</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {profile ? (
          <>
            {/* VIP PROFILE HEADER CARD (Web Style Dark/Sleek Container) */}
            <View style={styles.profileHeaderCard}>
              <View style={styles.profileTopRow}>
                <TouchableOpacity
                  style={styles.avatarOuterWrap}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/profile/personal-info', params: { section: 'photo' } } as any)}
                >
                  <View style={styles.avatarWrap}>
                    {profile.profilePhotoUrl && resolveAvatarUrl(profile.profilePhotoUrl) ? (
                      <ExpoImage
                        source={{ uri: resolveAvatarUrl(profile.profilePhotoUrl) || '' }}
                        style={styles.avatarImage}
                        contentFit="cover"
                        cachePolicy="memory"
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>
                          {(profile.firstName?.[0] || profile.email?.[0] || 'U').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.avatarCameraBadge}>
                    <Ionicons name="camera" size={11} color="#ffffff" />
                  </View>
                </TouchableOpacity>

                <View style={styles.profileMetaInfo}>
                  <Text style={styles.welcomeGreeting}>HOŞ GELDİNİZ</Text>
                  <Text style={styles.profileFullName}>{getDisplayName()}</Text>
                  <Text style={styles.profileEmailText} numberOfLines={1}>
                    {profile.email}
                  </Text>
                </View>
              </View>

              <View style={styles.headerPillRow}>
                <View style={styles.tierPill}>
                  <Ionicons name="sparkles" size={11} color="#f59e0b" style={{ marginRight: 4 }} />
                  <Text style={styles.tierPillText}>{getTierBadgeText()}</Text>
                </View>

                <TouchableOpacity
                  style={styles.editProfileChip}
                  onPress={() => router.push('/profile/personal-info' as any)}
                >
                  <Ionicons name="pencil-outline" size={12} color="#94a3b8" />
                  <Text style={styles.editProfileChipText}>Profili Düzenle</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 🛠️ Admin Paneli (Only for Admins) */}
            {(profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') && (
              <TouchableOpacity
                style={[styles.menuContainer, styles.adminRowItem, { marginBottom: 12, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                activeOpacity={0.7}
                onPress={() => router.push('/profile/admin' as any)}
              >
                <View style={styles.menuLeft}>
                  <Text style={styles.menuEmoji}>🛠️</Text>
                  <Text style={[styles.menuTitle, styles.adminTitle]}>Admin Paneli</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}

            {/* 📊 DASHBOARD GENERAL STATS */}
            <TouchableOpacity
              style={[styles.menuContainer, { marginBottom: 14, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/dashboard' as any)}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="grid-outline" size={18} color="#ea580c" style={styles.menuIcon} />
                <Text style={[styles.menuTitle, { fontWeight: '800' }]}>Dashboard (Kontrol Merkezi)</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* SECTION: İLAN YÖNETİMİ */}
            <Text style={styles.groupSectionHeader}>İLAN YÖNETİMİ</Text>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/my-listings', params: { tab: 'ACTIVE' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="car-sport-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>İlanlarım</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/my-listings', params: { tab: 'PASSIVE' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="time-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Geçmiş İlanlarım</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuRowItem, styles.lastMenuItem]}
                activeOpacity={0.7}
                onPress={() => router.push('/create-listing' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="add-circle-outline" size={18} color="#ea580c" style={styles.menuIcon} />
                  <Text style={[styles.menuTitle, { color: '#ea580c', fontWeight: '800' }]}>+ İlan Ekle</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#ea580c" />
              </TouchableOpacity>
            </View>

            {/* SECTION: FAVORİLERİM */}
            <Text style={styles.groupSectionHeader}>FAVORİLERİM</Text>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/favorites', params: { tab: 'listings' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="heart-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Favori İlanlarım</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/favorites', params: { tab: 'reports' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="document-text-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Favori Raporlarım</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/favorites', params: { tab: 'sellers' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="people-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Favori Satıcılarım</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuRowItem, styles.lastMenuItem]}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/favorites', params: { tab: 'searches' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="search-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Favori Aramalarım</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* SECTION: MESAJLAR */}
            <Text style={styles.groupSectionHeader}>MESAJLAR</Text>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={[styles.menuRowItem, styles.lastMenuItem]}
                activeOpacity={0.7}
                onPress={() => router.navigate('/(tabs)/messages' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="chatbubbles-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Mesajlarım</Text>
                  {unreadMessagesCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadMessagesCount}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* SECTION: ABONELİK */}
            <Text style={styles.groupSectionHeader}>ABONELİK</Text>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push('/profile/subscription' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="cube-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Paketim</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuRowItem, styles.lastMenuItem]}
                activeOpacity={0.7}
                onPress={() => router.push('/profile/package-rights' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="sparkles-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Paket Haklarım</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* SECTION: HESAP */}
            <Text style={styles.groupSectionHeader}>HESAP</Text>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/personal-info', params: { section: 'info' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="person-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Kişisel Bilgilerim</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/personal-info', params: { section: 'email' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>E-posta Adresi</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/personal-info', params: { section: 'phone' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="call-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Telefon Numarası</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/personal-info', params: { section: 'password' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="key-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Şifre Değiştir</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/settings', params: { section: 'notifications' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="notifications-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Bildirim Ayarları</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/settings', params: { section: 'security' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Hesap Güvenliği</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuRowItem, styles.lastMenuItem]}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/settings', params: { section: 'cancel' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" style={styles.menuIcon} />
                  <Text style={[styles.menuTitle, { color: '#ef4444' }]}>Hesap İptali</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* SECTION: DESTEK */}
            <Text style={styles.groupSectionHeader}>DESTEK</Text>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/support', params: { tab: 'help' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="help-buoy-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Yardım Merkezi</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuRowItem, styles.lastMenuItem]}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile/support', params: { tab: 'feedback' } } as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#64748b" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Geri Bildirim Gönder</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* LOGOUT BUTTON (Red) */}
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.8}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* GUEST STATE WHEN NOT LOGGED IN */
          <View style={styles.guestCard}>
            <View style={styles.guestLogoWrap}>
              <Image
                source={require('../../../assets/images/torkscout-header-logo.png')}
                style={styles.guestLogoImg}
                resizeMode="contain"
              />
            </View>

            <View style={styles.guestSloganPill}>
              <Ionicons name="shield-checkmark" size={12} color="#ea580c" />
              <Text style={styles.guestSloganPillText}>İKİNCİ ELDE AKILLI KARAR PLATFORMU</Text>
            </View>

            <Text style={styles.guestTitle}>Aracı Tanı, Riski Gör,{'\n'}Doğru Kararı Ver</Text>
            <Text style={styles.guestDesc}>
              TorkScout; almayı düşündüğünüz veya satacağınız aracın kronik sorunlarını, fabrika verilerini ve piyasa analizini saniyeler içinde sunan dijital araç danışmanınızdır.
            </Text>

            <View style={styles.guestWhyBox}>
              <TouchableOpacity
                style={styles.guestWhyToggleBar}
                activeOpacity={0.8}
                onPress={() => setWhyExpanded((prev) => !prev)}
              >
                <View style={styles.guestWhyToggleLeft}>
                  <View style={styles.guestWhySparkleBox}>
                    <Ionicons name="sparkles" size={15} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guestWhyHeader}>NEDEN ÜCRETSİZ ÜYE OLMALISINIZ?</Text>
                    <Text style={styles.guestWhySubHint}>
                      {whyExpanded
                        ? 'Uygulamadaki tüm modülleri gizlemek için dokunun'
                        : 'TorkScout’ta sizi bekleyen tüm özellikleri görmek için dokunun'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.guestWhyChevronCircle, whyExpanded && styles.guestWhyChevronCircleActive]}>
                  <Ionicons
                    name={whyExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={whyExpanded ? '#ffffff' : '#ea580c'}
                  />
                </View>
              </TouchableOpacity>

              {whyExpanded && (
                <View style={styles.guestWhyExpandedList}>
                  <Text style={styles.guestSectionGroupLabel}>ANA ANALİZ & TOPLULUK MODÜLLERİ</Text>

                  {/* 1. Araç Sorgula */}
                  <View style={[styles.guestModuleCard, { borderColor: '#ea580c25' }]}>
                    <View style={[styles.guestModuleIconBox, { backgroundColor: '#fff7ed' }]}>
                      <Ionicons name="search" size={24} color="#ea580c" />
                    </View>
                    <View style={styles.guestModuleTextCol}>
                      <Text style={[styles.guestModuleTitle, { color: '#ea580c' }]}>Araç Sorgula</Text>
                      <Text style={styles.guestModuleDesc}>
                        Otomobil, SUV/Pickup, Minivan/Panelvan ve Motosiklet kategorilerinde aracın fabrika teknik verilerini, kronik sorunlarını, ekspertizde bakılması gereken kritik noktaları, satıcıya sorulacak soruları ve 100 üzerinden satın alma puanını öğrenin; raporlarınızı hesabınıza kaydedin.
                      </Text>
                    </View>
                  </View>

                  {/* 2. Araç Karşılaştır */}
                  <View style={[styles.guestModuleCard, { borderColor: '#0284c725' }]}>
                    <View style={[styles.guestModuleIconBox, { backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="scale-outline" size={24} color="#0284c7" />
                    </View>
                    <View style={styles.guestModuleTextCol}>
                      <Text style={[styles.guestModuleTitle, { color: '#0284c7' }]}>Araç Karşılaştır</Text>
                      <Text style={styles.guestModuleDesc}>
                        Arasında kaldığınız araçları performans, yakıt ekonomisi, kronik arıza riski, bakım maliyeti, ikinci el piyasası ve donanım dahil 8 farklı kriterde kafa kafaya kıyaslayın; 1. sırayı alan kazanan aracın detaylı raporunu tamamen ücretsiz açın.
                      </Text>
                    </View>
                  </View>

                  {/* 3. TorkScout Club */}
                  <View style={[styles.guestModuleCard, { borderColor: '#0f172a22' }]}>
                    <View style={[styles.guestModuleIconBox, { backgroundColor: '#f1f5f9' }]}>
                      <Image source={CLUB_TAB_ICON} style={styles.guestModuleCustomImg} resizeMode="contain" />
                    </View>
                    <View style={styles.guestModuleTextCol}>
                      <Text style={[styles.guestModuleTitle, { color: '#0f172a' }]}>TorkScout Club</Text>
                      <Text style={styles.guestModuleDesc}>
                        Otomobil Tutkunları Topluluğu’nda araç sahipleriyle gerçek kullanıcı tecrübelerini paylaşın, anketlere oy verin, gönderileri beğenin, yorum yapın ve özel duyurulardan anında haberdar olun.
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.guestSectionGroupLabel, { marginTop: 4 }]}>KEŞFET MODÜLLERİ</Text>

                  {/* 4. Araç Rehberi (Exact Keşfet Card) */}
                  <View style={[styles.guestModuleCard, { borderColor: '#0284c722' }]}>
                    <View style={styles.guestModuleLogoWrap}>
                      <Image source={ARAC_REHBERI_ICON} style={styles.guestModuleCustomImg} resizeMode="contain" />
                    </View>
                    <View style={styles.guestModuleTextCol}>
                      <Text style={[styles.guestModuleTitle, { color: '#0284c7' }]}>Araç Rehberi</Text>
                      <Text style={styles.guestModuleDesc}>
                        Araçların teknik özelliklerini, kronik sorunlarını ve önemli detaylarını keşfedin.
                      </Text>
                    </View>
                  </View>

                  {/* 5. Aracını Bul (Exact Keşfet Card) */}
                  <View style={[styles.guestModuleCard, { borderColor: '#ea580c22' }]}>
                    <View style={styles.guestModuleLogoWrap}>
                      <Image source={ARACINI_BUL_ICON} style={styles.guestModuleCustomImg} resizeMode="contain" />
                    </View>
                    <View style={styles.guestModuleTextCol}>
                      <Text style={[styles.guestModuleTitle, { color: '#ea580c' }]}>Aracını Bul</Text>
                      <Text style={styles.guestModuleDesc}>
                        Araçları kaydırarak değerlendir, tercihlerine göre sana en uygun modelleri keşfet.
                      </Text>
                    </View>
                  </View>

                  {/* 6. Akış (Exact Keşfet Card) */}
                  <View style={[styles.guestModuleCard, { borderColor: '#16a34a22' }]}>
                    <View style={styles.guestModuleLogoWrap}>
                      <Image source={AKIS_ICON} style={styles.guestModuleCustomImg} resizeMode="contain" />
                    </View>
                    <View style={styles.guestModuleTextCol}>
                      <Text style={[styles.guestModuleTitle, { color: '#16a34a' }]}>Akış</Text>
                      <Text style={styles.guestModuleDesc}>
                        İlanları kart kart kaydırarak yeni araçları hızlı ve keyifli şekilde keşfedin.
                      </Text>
                    </View>
                  </View>

                  {/* 7. İşi Cepte Öneriyor (Exact Keşfet Card) */}
                  <View style={[styles.guestModuleCard, { borderColor: '#131b2e22' }]}>
                    <View style={styles.guestModuleLogoWrap}>
                      <Image source={ISICEPTE_LOGO} style={styles.guestModuleCustomImg} resizeMode="contain" />
                    </View>
                    <View style={styles.guestModuleTextCol}>
                      <Text style={[styles.guestModuleTitle, { color: '#131b2e' }]}>İşi Cepte Öneriyor</Text>
                      <Text style={styles.guestModuleDesc}>
                        Bölgenizdeki onaylı oto servisleri, yetkili ve özel mekanik ustaları, oto ekspertiz noktalarını keşfedin.
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.primaryLoginBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/login' as any)}
            >
              <Text style={styles.primaryLoginText}>Giriş Yap</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryRegisterBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/register' as any)}
            >
              <Text style={styles.secondaryRegisterText}>Hesabınız Yok mu? Ücretsiz Kayıt Olun</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topHeaderTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarOuterWrap: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: '#ea580c',
    overflow: 'hidden',
    backgroundColor: '#fff7ed',
  },
  avatarCameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea580c',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ea580c',
  },
  profileMetaInfo: {
    flex: 1,
    gap: 2,
  },
  welcomeGreeting: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  profileFullName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  profileEmailText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
  },
  headerPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierPillText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  editProfileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editProfileChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  groupSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 2,
    marginLeft: 4,
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  adminRowItem: {
    backgroundColor: '#fef2f2',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 22,
  },
  menuEmoji: {
    fontSize: 16,
    width: 22,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  adminTitle: {
    color: '#ef4444',
    fontWeight: '800',
  },
  unreadBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ef4444',
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ef4444',
  },
  guestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 22,
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  guestLogoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  guestLogoImg: {
    width: 195,
    height: 36,
  },
  guestSloganPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  guestSloganPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  guestTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 27,
  },
  guestDesc: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
  },
  guestWhyBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 4,
  },
  guestWhyToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#fff7ed',
    gap: 10,
  },
  guestWhyToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  guestWhySparkleBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestWhyHeader: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.4,
  },
  guestWhySubHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
    marginTop: 2,
  },
  guestWhyChevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestWhyChevronCircleActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  guestWhyExpandedList: {
    padding: 12,
    gap: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#fed7aa',
  },
  guestSectionGroupLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.7,
    paddingHorizontal: 2,
  },
  guestModuleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  guestModuleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestModuleLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  guestModuleCustomImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  guestModuleTextCol: {
    flex: 1,
    gap: 3,
  },
  guestModuleTitle: {
    fontSize: 14.5,
    fontWeight: '900',
  },
  guestModuleDesc: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16.5,
  },
  primaryLoginBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryLoginText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryRegisterBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryRegisterText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ea580c',
  },
});
