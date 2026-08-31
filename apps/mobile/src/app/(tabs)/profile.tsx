import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePhotoUrl?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  subscriptionTier: 'FREE' | 'BASIC' | 'PRO';
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
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
        setProfile(null);
      }
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
          setProfile(null);
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const getDisplayName = () => {
    if (!profile) return '';
    if (profile.firstName || profile.lastName) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }
    if (profile.username) return profile.username;
    return profile.email.split('@')[0];
  };

  const getAvatarChar = () => {
    const name = getDisplayName();
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {profile ? (
        <>
          {/* User Profile Summary Card */}
          <View style={styles.profileCard}>
            {profile.profilePhotoUrl ? (
              <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getAvatarChar()}</Text>
              </View>
            )}

            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{getDisplayName()}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>

              <View style={styles.tierBadge}>
                <Ionicons name="sparkles" size={12} color="#ea580c" style={{ marginRight: 4 }} />
                <Text style={styles.tierBadgeText}>{profile.subscriptionTier || 'FREE'} Üyelik</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats Banner */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statBox} onPress={() => router.push('/profile/favorites')}>
              <Ionicons name="heart" size={20} color="#ef4444" />
              <Text style={styles.statBoxTitle}>Favorilerim</Text>
              <Text style={styles.statBoxSub}>Kaydedilenler</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statBox} onPress={() => router.push('/comparison')}>
              <Ionicons name="scale" size={20} color="#0284c7" />
              <Text style={styles.statBoxTitle}>Karşılaştır</Text>
              <Text style={styles.statBoxSub}>Araç Analiz</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statBox} onPress={() => router.push('/messages')}>
              <Ionicons name="gift" size={20} color="#ea580c" />
              <Text style={styles.statBoxTitle}>Paketlerim</Text>
              <Text style={styles.statBoxSub}>Abonelik</Text>
            </TouchableOpacity>
          </View>

          {/* Menu Items Section */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionHeader}>Kullanıcı Dashboard</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/favorites')}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="heart-outline" size={18} color="#ef4444" />
              </View>
              <Text style={styles.menuItemText}>Favori Araçlar & Raporlar</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/comparison')}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#f0f9ff' }]}>
                <Ionicons name="git-compare-outline" size={18} color="#0284c7" />
              </View>
              <Text style={styles.menuItemText}>Araç Karşılaştırma Paneli</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/add-vehicle')}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="add-circle-outline" size={18} color="#ea580c" />
              </View>
              <Text style={styles.menuItemText}>İlan Ver / Araç Önerisi Yap</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          {/* Admin Panel Link */}
          {(profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') && (
            <View style={styles.menuSection}>
              <Text style={styles.sectionHeader}>Yönetim Paneli</Text>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/admin')}>
                <View style={[styles.menuIconCircle, { backgroundColor: '#fff7ed' }]}>
                  <Ionicons name="shield-checkmark" size={18} color="#ea580c" />
                </View>
                <Text style={[styles.menuItemText, { color: '#ea580c', fontWeight: '800' }]}>
                  Admin Onay & Moderasyon Paneli
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#ea580c" />
              </TouchableOpacity>
            </View>
          )}

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </>
      ) : (
        /* GUEST STATE WHEN NOT LOGGED IN */
        <View style={styles.cardBox}>
          <View style={styles.guestIconCircle}>
            <Ionicons name="person-circle-outline" size={60} color="#ea580c" />
          </View>

          <Text style={styles.introTitle}>TorqueScout Profiliniz</Text>
          <Text style={styles.introDesc}>
            Hesabınıza giriş yaparak favorilerinize erişebilir, araç raporlarını kaydedebilir ve araçlarınızı ilan verebilirsiniz.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => router.push('/login')}>
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={() => router.push('/register')}>
            <Text style={styles.secondaryBtnText}>Hesabınız Yok mu? Kayıt Olun</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafcff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafcff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 18,
    gap: 16,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#ea580c',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  profileDetails: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    color: '#0b192c',
    fontSize: 18,
    fontWeight: '900',
  },
  profileEmail: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderColor: '#ffedd5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tierBadgeText: {
    color: '#ea580c',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0b192c',
  },
  statBoxSub: {
    fontSize: 10,
    color: '#64748b',
  },
  menuSection: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  menuIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    color: '#0b192c',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '800',
  },
  cardBox: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    gap: 14,
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  guestIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0b192c',
    textAlign: 'center',
  },
  introDesc: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryBtn: {
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: '#ea580c',
    fontSize: 13,
    fontWeight: '700',
  },
});
