import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface PendingVariant {
  id: string;
  year: number;
  brand: { name: string };
  model: { name: string };
  engine: { code: string; displacement: number; horsepower: number };
  transmission: { name: string; type: string };
  trim: { name: string };
}

export default function AdminScreen() {
  const [pending, setPending] = useState<PendingVariant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/vehicles/admin/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPending(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id: string, action: 'approve' | 'reject') => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/vehicles/admin/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setPending((prev) => prev.filter((item) => item.id !== id));
        Alert.alert('Başarılı', `Araç varyantı başarıyla ${action === 'approve' ? 'onaylandı' : 'reddedildi'}.`);
      } else {
        Alert.alert('Hata', 'İşlem tamamlanamadı.');
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
      ) : pending.length > 0 ? (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardVehicle}>
                  {item.brand.name} {item.model.name} ({item.year})
                </Text>
                <Text style={styles.cardSpecs}>
                  Motor: {item.engine.code} • Donanım: {item.trim.name}
                </Text>
                <Text style={styles.cardTransmission}>
                  Şanzıman: {item.transmission.name} ({item.transmission.type})
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.circleBtn, styles.approveBtn]} onPress={() => handleDecision(item.id, 'approve')}>
                  <Ionicons name="checkmark" size={20} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.circleBtn, styles.rejectBtn]} onPress={() => handleDecision(item.id, 'reject')}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.center}>
          <Ionicons name="shield-outline" size={48} color="#64748b" />
          <Text style={styles.emptyText}>Onay bekleyen araç varyant önerisi bulunmamaktadır.</Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  cardInfo: {
    gap: 4,
  },
  cardVehicle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  cardSpecs: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  cardTransmission: {
    color: '#64748b',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  rejectBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
});
