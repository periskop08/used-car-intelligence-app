import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface Listing {
  id: string;
  title: string;
  price: number;
  year: number;
  mileage: number;
  description: string;
  vehicleVariant: {
    year: number;
    brand: { name: string };
    model: { name: string };
  };
}

interface Brand {
  id: string;
  name: string;
}

export default function ListingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortByProfile, setSortByProfile] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Filter dropdown data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchBrands();
    loadProfileId();
  }, []);

  // Fetch listings when filters change
  useEffect(() => {
    fetchListings();
  }, [selectedBrand, sortByProfile, params]);

  const loadProfileId = async () => {
    try {
      const savedSessionId = await AsyncStorage.getItem('discoverySessionId');
      if (savedSessionId) {
        const token = await AsyncStorage.getItem('accessToken');
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/vehicle-discovery/profile/${savedSessionId}`, { headers });
        if (res.ok) {
          const profileData = await res.json();
          setProfileId(profileData.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await fetch(`${API_URL}/vehicles/brands`);
      if (res.ok) {
        const data = await res.json();
        setBrands(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/listings?`;
      if (selectedBrand) {
        url += `brandId=${selectedBrand.id}&`;
      }
      if (sortByProfile && (profileId || params.preferenceProfileId)) {
        url += `preferenceProfileId=${profileId || params.preferenceProfileId}&`;
      }
      if (search.trim()) {
        url += `search=${encodeURIComponent(search)}&`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search and Action Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="İlan ara (Örn: Golf, Astra)..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchListings}
          />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/listings/create')}>
          <Ionicons name="add-circle" size={32} color="#f97316" />
        </TouchableOpacity>
      </View>

      {/* Filter Row Buttons */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterBtn, selectedBrand && styles.activeFilterBtn]} onPress={() => setModalVisible(true)}>
          <Ionicons name="funnel-outline" size={16} color={selectedBrand ? '#fff' : '#94a3b8'} />
          <Text style={[styles.filterBtnText, selectedBrand && styles.activeFilterBtnText]}>
            {selectedBrand ? selectedBrand.name : 'Marka Filtrele'}
          </Text>
        </TouchableOpacity>

        {profileId && (
          <TouchableOpacity
            style={[styles.filterBtn, sortByProfile && styles.activeFilterBtn]}
            onPress={() => setSortByProfile(!sortByProfile)}
          >
            <Ionicons name="sparkles-outline" size={16} color={sortByProfile ? '#fff' : '#94a3b8'} />
            <Text style={[styles.filterBtnText, sortByProfile && styles.activeFilterBtnText]}>
              Profilime Göre Sırala
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Listings List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : listings.length > 0 ? (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/listings/[id]', params: { id: item.id } })}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardVehicle}>
                  {item.vehicleVariant?.brand.name} {item.vehicleVariant?.model.name} ({item.year})
                </Text>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsText}>{item.mileage.toLocaleString('tr-TR')} km</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.priceText}>{item.price.toLocaleString('tr-TR')} TL</Text>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" style={styles.cardArrow} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Aradığınız kriterlerde aktif ilan bulunamadı.</Text>
        </View>
      )}

      {/* Brand Select Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Marka Seçin</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#f8fafc" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.clearRow} onPress={() => { setSelectedBrand(null); setModalVisible(false); }}>
              <Text style={styles.clearText}>Tüm Markalar (Filtreyi Kaldır)</Text>
            </TouchableOpacity>

            <FlatList
              data={brands}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setSelectedBrand(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
  },
  addBtn: {
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  activeFilterBtn: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.25)',
  },
  filterBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterBtnText: {
    color: '#f97316',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  cardVehicle: {
    color: '#f97316',
    fontSize: 11,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  dot: {
    color: '#64748b',
    fontSize: 12,
  },
  priceText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
  },
  cardDesc: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  cardArrow: {
    paddingLeft: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  clearRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  clearText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  optionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionText: {
    color: '#cbd5e1',
    fontSize: 15,
  },
});
