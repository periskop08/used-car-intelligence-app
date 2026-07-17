import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface ChatRoom {
  id: string;
  listingId: string;
  listing: {
    title: string;
  };
  buyerId: string;
  sellerId: string;
  buyer: { firstName: string; lastName: string; email: string };
  seller: { firstName: string; lastName: string; email: string };
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
}

export default function MessageInboxScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchChatRooms();
  }, []);

  const fetchChatRooms = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // First get profile for current user ID
      const profileRes = await fetch(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setCurrentUserId(profile.id);
      }

      const res = await fetch(`${API_URL}/messages/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (room: ChatRoom) => {
    if (currentUserId === room.buyerId) {
      return `${room.seller.firstName} ${room.seller.lastName}`;
    }
    return `${room.buyer.firstName} ${room.buyer.lastName}`;
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : rooms.length > 0 ? (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/messages/[id]', params: { id: item.id } })}
            >
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color="#64748b" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.participantName}>{getOtherParticipant(item)}</Text>
                <Text style={styles.listingTitle} numberOfLines={1}>{item.listing?.title}</Text>
                {item.messages.length > 0 && (
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.messages[item.messages.length - 1].content}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.center}>
          <Ionicons name="chatbox-ellipses-outline" size={48} color="#64748b" />
          <Text style={styles.emptyText}>Henüz aktif bir mesajlaşma bulunmuyor.</Text>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  participantName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  listingTitle: {
    color: '#f97316',
    fontSize: 11,
    fontWeight: '600',
  },
  lastMessage: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
});
