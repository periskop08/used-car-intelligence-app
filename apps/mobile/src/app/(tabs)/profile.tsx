import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const resolveAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
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

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePhotoUrl?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  subscriptionTier: 'FREE' | 'TANISMA' | 'BASIC' | 'YETKIN' | 'STANDARD' | 'PRO' | 'PROFESYONEL' | 'PREMIUM';
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

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
    if (profile.firstName) {
      return `${profile.firstName} ${profile.lastName ? profile.lastName[0] + '.' : ''}`.trim();
    }
    if (profile.username) return profile.username;
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
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Profiliniz yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Hesabım & Profil</Text>
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
                <View style={styles.avatarWrap}>
                  {profile.profilePhotoUrl ? (
                    <ExpoImage
                      source={{ uri: resolveAvatarUrl(profile.profilePhotoUrl) || '' }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>
                        {(profile.firstName?.[0] || profile.email?.[0] || 'U').toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

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

            {/* WEB-MATCHED MENU ITEMS CONTAINER */}
            <View style={styles.menuContainer}>
              {/* 🛠️ Admin Paneli (Only for Admins) */}
              {(profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') && (
                <TouchableOpacity
                  style={[styles.menuRowItem, styles.adminRowItem]}
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

              {/* 📊 Dashboard */}
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="grid-outline" size={18} color="#94a3b8" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Dashboard</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#64748b" />
              </TouchableOpacity>

              {/* 🚗 İlanlarım */}
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push('/listings' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="car-sport-outline" size={18} color="#94a3b8" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>İlanlarım</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#64748b" />
              </TouchableOpacity>

              {/* ❤️ Favori İlanlarım */}
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push('/profile/favorites' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="heart-outline" size={18} color="#94a3b8" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Favori İlanlarım</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#64748b" />
              </TouchableOpacity>

              {/* 📄 Favori Raporlarım */}
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push('/profile/favorites' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="document-text-outline" size={18} color="#94a3b8" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Favori Raporlarım</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#64748b" />
              </TouchableOpacity>

              {/* 💬 Mesajlarım */}
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push('/messages' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="chatbubbles-outline" size={18} color="#94a3b8" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Mesajlarım</Text>
                  {unreadMessagesCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadMessagesCount}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="arrow-forward" size={16} color="#64748b" />
              </TouchableOpacity>

              {/* 🎁 Paketim */}
              <TouchableOpacity
                style={styles.menuRowItem}
                activeOpacity={0.7}
                onPress={() => router.push('/messages' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="cube-outline" size={18} color="#94a3b8" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Paketim</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#64748b" />
              </TouchableOpacity>

              {/* 👤 Kişisel Bilgilerim */}
              <TouchableOpacity
                style={[styles.menuRowItem, styles.lastMenuItem]}
                activeOpacity={0.7}
                onPress={() => router.push('/profile/personal-info' as any)}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="person-outline" size={18} color="#94a3b8" style={styles.menuIcon} />
                  <Text style={styles.menuTitle}>Kişisel Bilgilerim</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#64748b" />
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
            <View style={styles.guestIconCircle}>
              <Ionicons name="person-circle-outline" size={54} color="#ea580c" />
            </View>

            <Text style={styles.guestTitle}>TorqueScout Hesabınız</Text>
            <Text style={styles.guestDesc}>
              Giriş yaparak favorilerinize erişebilir, araç sorgulama raporlarını kaydedebilir ve araçlarınızı ilan verebilirsiniz.
            </Text>

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
              <Text style={styles.secondaryRegisterText}>Hesabınız Yok mu? Kayıt Olun</Text>
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
    backgroundColor: '#0a0e1a', // Web Style Deep Navy Background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e1a',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  topHeaderTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#ea580c',
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e293b',
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
    color: '#64748b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  profileFullName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  profileEmailText: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  headerPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierPillText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  editProfileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  editProfileChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  menuContainer: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  menuRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  adminRowItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
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
    color: '#e2e8f0',
  },
  adminTitle: {
    color: '#f87171',
    fontWeight: '800',
  },
  unreadBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f87171',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
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
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  guestIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  guestDesc: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 19,
  },
  primaryLoginBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
  },
  primaryLoginText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryRegisterBtn: {
    paddingVertical: 8,
  },
  secondaryRegisterText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ea580c',
  },
});
