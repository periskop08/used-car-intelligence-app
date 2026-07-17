import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// AsyncStorage check or fallback
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface Listing {
  id: string;
  title: string;
  price: number;
  year: number;
  mileage: number;
  vehicleVariant: {
    year: number;
    brand: { name: string };
    model: { name: string };
  };
}

export default function MobileDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; firstName?: string; role?: string } | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);

  useEffect(() => {
    checkUserSession();
    fetchFeaturedListings();
  }, []);

  const checkUserSession = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          setUser(profile);
        } else {
          // Token expired
          await AsyncStorage.removeItem('accessToken');
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  };

  const fetchFeaturedListings = async () => {
    setLoadingListings(true);
    try {
      const res = await fetch(`${API_URL}/listings?limit=4`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || data);
      }
    } catch (err) {
      console.error('Fetch listings error:', err);
    } finally {
      setLoadingListings(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Profile Greeting */}
      <View style={styles.profileHeader}>
        {user ? (
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.firstName ? user.firstName[0].toUpperCase() : user.email[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
              <Text style={styles.userName}>{user.firstName || user.email}</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.loginBanner} onPress={() => router.push('/login')}>
            <Ionicons name="person-circle-outline" size={32} color="#f97316" />
            <View style={styles.loginBannerTextContainer}>
              <Text style={styles.loginBannerTitle}>Giriş Yap / Üye Ol</Text>
              <Text style={styles.loginBannerDesc}>Rapor kaydetmek ve ilan vermek için giriş yapın</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Feature Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ AI Araç Analizi</Text>
        
        <TouchableOpacity style={styles.featureCard} onPress={() => router.push('/vehicle-query')}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
            <Ionicons name="shield-checkmark" size={24} color="#f97316" />
          </View>
          <View style={styles.featureCardBody}>
            <Text style={styles.featureCardTitle}>Kronik Sorun Raporu</Text>
            <Text style={styles.featureCardDesc}>
              Almak istediğiniz aracın kronik arızalarını, geri çağırmalarını ve checklistini sorgulayın.
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#f97316" style={styles.cardArrow} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureCard} onPress={() => router.push('/comparison')}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <Ionicons name="git-compare" size={24} color="#3b82f6" />
          </View>
          <View style={styles.featureCardBody}>
            <Text style={styles.featureCardTitle}>Araç Karşılaştır</Text>
            <Text style={styles.featureCardDesc}>
              İki farklı modeli kronik sorunları ve alınabilirlik skorlarıyla kıyaslayın.
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#3b82f6" style={styles.cardArrow} />
        </TouchableOpacity>
      </View>

      {/* Explore Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Keşfet ve Rehber</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/aracini-bul')}>
            <Ionicons name="heart" size={28} color="#ef4444" />
            <Text style={styles.gridCardTitle}>Aracını Bul</Text>
            <Text style={styles.gridCardDesc}>Sağa sola kaydırıp tarzına uyan aracı keşfet.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/vehicle-guide')}>
            <Ionicons name="book" size={28} color="#10b981" />
            <Text style={styles.gridCardTitle}>Araç Rehberi</Text>
            <Text style={styles.gridCardDesc}>Popüler modellerin teknik ve kronik arşivleri.</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured Listings */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🚗 Öne Çıkan İlanlar</Text>
          <TouchableOpacity onPress={() => router.push('/listings')}>
            <Text style={styles.seeAllText}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>

        {loadingListings ? (
          <ActivityIndicator size="small" color="#f97316" style={{ marginVertical: 20 }} />
        ) : listings.length > 0 ? (
          <View style={styles.listingsContainer}>
            {listings.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listingCard}
                onPress={() => router.push({ pathname: '/listings/[id]', params: { id: item.id } })}
              >
                <View style={styles.listingInfo}>
                  <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.listingVehicle}>
                    {item.vehicleVariant?.brand.name} {item.vehicleVariant?.model.name} ({item.year})
                  </Text>
                  <Text style={styles.listingDetails}>
                    {item.mileage.toLocaleString('tr-TR')} km • {item.price.toLocaleString('tr-TR')} TL
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Henüz aktif ilan bulunamadı.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 24,
  },
  profileHeader: {
    marginTop: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  welcomeText: {
    color: '#64748b',
    fontSize: 12,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  loginBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  loginBannerTextContainer: {
    flex: 1,
  },
  loginBannerTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  loginBannerDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: 0.5,
  },
  seeAllText: {
    color: '#f97316',
    fontSize: 12,
    fontWeight: '700',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardBody: {
    flex: 1,
    gap: 4,
  },
  featureCardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  featureCardDesc: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 15,
  },
  cardArrow: {
    paddingLeft: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 20,
    gap: 8,
  },
  gridCardTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  gridCardDesc: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 14,
  },
  listingsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  listingInfo: {
    flex: 1,
    gap: 2,
  },
  listingTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  listingVehicle: {
    color: '#f97316',
    fontSize: 11,
    fontWeight: '600',
  },
  listingDetails: {
    color: '#64748b',
    fontSize: 10,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
  },
});
