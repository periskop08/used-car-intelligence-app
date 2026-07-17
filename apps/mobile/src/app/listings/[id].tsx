import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface ListingDetail {
  id: string;
  title: string;
  price: number;
  year: number;
  mileage: number;
  description: string;
  userId: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
  vehicleVariantId: string;
  vehicleVariant: {
    year: number;
    brand: { name: string };
    model: { name: string };
    engine: { code: string; displacement: number; horsepower: number };
    transmission: { name: string; type: string };
  };
}

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchListingDetail();
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          setCurrentUserId(profile.id);
        }
      }
    } catch (e) {
      console.error(e);
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

  const handleStartChat = async () => {
    if (!listing) return;
    
    // Check if user is seller
    if (currentUserId === listing.userId) {
      Alert.alert('Bilgi', 'Kendi ilanınız için mesaj başlatamazsınız.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Giriş Gerekli', 'Mesaj göndermek için lütfen giriş yapın.');
        router.push('/login');
        return;
      }

      // Check if chat room already exists or create new one
      const res = await fetch(`${API_URL}/messages/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: listing.id,
          recipientId: listing.userId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        router.push({
          pathname: '/messages/[id]',
          params: { id: data.id }
        });
      } else {
        Alert.alert('Hata', data.message || 'Sohbet odası oluşturulamadı.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Bağlantı Hatası', 'Mesaj odası açılırken bağlantı hatası oluştu.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {listing ? (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Title Block */}
            <View style={styles.card}>
              <Text style={styles.price}>{listing.price.toLocaleString('tr-TR')} TL</Text>
              <Text style={styles.title}>{listing.title}</Text>
              
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{listing.year} Model</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{listing.mileage.toLocaleString('tr-TR')} km</Text>
                </View>
              </View>
            </View>

            {/* Vehicle Specs details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 Araç Özellikleri</Text>
              
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Marka / Model</Text>
                <Text style={styles.specVal}>{listing.vehicleVariant?.brand.name} {listing.vehicleVariant?.model.name}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Motor Tipi</Text>
                <Text style={styles.specVal}>{listing.vehicleVariant?.engine.code} ({listing.vehicleVariant?.engine.horsepower} HP)</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Şanzıman</Text>
                <Text style={styles.specVal}>{listing.vehicleVariant?.transmission.name} ({listing.vehicleVariant?.transmission.type})</Text>
              </View>
            </View>

            {/* AI Report Fast Link */}
            <TouchableOpacity
              style={styles.aiReportCard}
              onPress={() => router.push({ pathname: '/vehicle-report', params: { variantId: listing.vehicleVariantId } })}
            >
              <View style={styles.aiIconBox}>
                <Ionicons name="sparkles" size={24} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiTitle}>Yapay Zeka Kronik Analizi</Text>
                <Text style={styles.aiDesc}>Bu modelin kronik arızalarını ve ekspertiz checklistini oku.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#f97316" />
            </TouchableOpacity>

            {/* Description */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📝 Açıklama</Text>
              <Text style={styles.descriptionText}>{listing.description}</Text>
            </View>

            {/* Seller info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>👤 Satıcı Bilgileri</Text>
              <View style={styles.sellerRow}>
                <Ionicons name="person-circle-outline" size={36} color="#64748b" />
                <View>
                  <Text style={styles.sellerName}>{listing.user.firstName} {listing.user.lastName}</Text>
                  <Text style={styles.sellerEmail}>{listing.user.email}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Start Chat Button */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.chatBtn} onPress={handleStartChat}>
              <Ionicons name="chatbubbles" size={20} color="#fff" />
              <Text style={styles.chatBtnText}>Satıcıya Mesaj Gönder</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.center}>
          <Text style={styles.errorText}>İlan bulunamadı.</Text>
        </View>
      )}
    </View>
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
    gap: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  price: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f97316',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  specLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  specVal: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  aiReportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  aiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  aiDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  descriptionText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  sellerEmail: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
  },
  chatBtn: {
    flexDirection: 'row',
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    color: '#64748b',
    fontSize: 13,
  },
});
