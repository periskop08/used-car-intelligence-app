import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface Favorite {
  id: string;
  vehicleVariantId: string;
  vehicleVariant: {
    year: number;
    brand: { name: string };
    model: { name: string };
    engine: { code: string };
    transmission: { name: string };
  };
}

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (variantId: string) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/favorites/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ variantId }),
      });

      if (res.ok) {
        // Filter out
        setFavorites((prev) => prev.filter((fav) => fav.vehicleVariantId !== variantId));
        Alert.alert('Bilgi', 'Favorilerden kaldırıldı.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/vehicle-report', params: { variantId: item.vehicleVariantId } })}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.cardVehicle}>
                  {item.vehicleVariant?.brand.name} {item.vehicleVariant?.model.name} ({item.vehicleVariant?.year})
                </Text>
                <Text style={styles.cardSpecs}>
                  {item.vehicleVariant?.engine.code} • {item.vehicleVariant?.transmission.name}
                </Text>
              </View>
              
              <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveFavorite(item.vehicleVariantId)}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.center}>
          <Ionicons name="heart-dislike-outline" size={48} color="#64748b" />
          <Text style={styles.emptyText}>Favorilere eklenmiş araç raporu bulunmuyor.</Text>
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
    padding: 24,
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
    gap: 12,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardVehicle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  cardSpecs: {
    color: '#64748b',
    fontSize: 11,
  },
  removeBtn: {
    padding: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
});
