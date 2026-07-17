import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  subscriptionTier: 'FREE' | 'BASIC' | 'PRO';
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error(e);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {profile ? (
        <>
          {/* User Profile Summary Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.firstName ? profile.firstName[0].toUpperCase() : profile.email[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{profile.firstName} {profile.lastName}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>{profile.subscriptionTier} Üyelik</Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionHeader}>Menü</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/favorites')}>
              <Ionicons name="heart-outline" size={22} color="#cbd5e1" />
              <Text style={styles.menuItemText}>Favorilerim</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/comparison')}>
              <Ionicons name="git-compare-outline" size={22} color="#cbd5e1" />
              <Text style={styles.menuItemText}>Araç Karşılaştır</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/add-vehicle')}>
              <Ionicons name="add-circle-outline" size={22} color="#cbd5e1" />
              <Text style={styles.menuItemText}>Araç/Motor Önerisi Yap</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Admin Panel (Only visible to admin role) */}
          {profile.role === 'ADMIN' && (
            <View style={styles.menuSection}>
              <Text style={styles.sectionHeader}>Yönetim</Text>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/admin')}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#f97316" />
                <Text style={[styles.menuItemText, { color: '#f97316' }]}>Admin Onay Paneli</Text>
                <Ionicons name="chevron-forward" size={16} color="#f97316" />
              </TouchableOpacity>
            </View>
          )}

          {/* Logout Section */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.cardBox}>
          <Ionicons name="person-circle-outline" size={64} color="#64748b" />
          <Text style={styles.introTitle}>TorqueScout Profiliniz</Text>
          <Text style={styles.introDesc}>
            Giriş yaparak favorilerinize erişebilir, araç raporlarını kaydedebilir ve ilan verebilirsiniz.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/login')}>
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    marginTop: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  profileDetails: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  profileEmail: {
    color: '#64748b',
    fontSize: 12,
  },
  tierBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tierBadgeText: {
    color: '#f97316',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  menuSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  sectionHeader: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    padding: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  menuItemText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  cardBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
    marginTop: 40,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
    textAlign: 'center',
  },
  introDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
