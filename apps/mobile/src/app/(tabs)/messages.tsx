import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';

const resolveMediaUrl = (url?: string | null): string | null => {
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
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
}

interface ConversationItem {
  id: string;
  listingId: string | null;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  listing?: {
    id: string;
    title: string;
    priceAmount?: number;
    city?: string;
  } | null;
  buyer: UserProfile;
  seller: UserProfile;
  messages: Array<{
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
    readAt: string | null;
  }>;
}

export default function MessageInboxScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const fetchConversations = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        setConversations([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch current profile for current user ID
      const profileRes = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setCurrentUserId(profile.id);
      }

      // Fetch live conversations from API
      const res = await fetch(`${API_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching conversations:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const getOtherParticipant = (conv: ConversationItem) => {
    const isCurrentUserBuyer = currentUserId === conv.buyerId;
    const otherUser = isCurrentUserBuyer ? conv.seller : conv.buyer;

    if (!otherUser) return 'Kullanıcı';
    if (otherUser.firstName || otherUser.lastName) {
      return `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim();
    }
    if (otherUser.username) return otherUser.username;
    return otherUser.email ? otherUser.email.split('@')[0] : 'Kullanıcı';
  };

  const getOtherParticipantPhoto = (conv: ConversationItem) => {
    const isCurrentUserBuyer = currentUserId === conv.buyerId;
    const otherUser = isCurrentUserBuyer ? conv.seller : conv.buyer;
    return otherUser?.profilePhotoUrl || null;
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Az önce';
      if (diffMin < 60) return `${diffMin} dk`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} sa`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay} gün`;
      return d.toLocaleDateString('tr-TR');
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navbar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <Ionicons name="chatbubbles" size={20} color="#ea580c" />
            <Text style={styles.headerTitle}>Mesajlarım</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="reload-outline" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Sohbetleriniz yükleniyor...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          <View style={styles.emptyIconCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>Henüz mesajınız bulunmuyor</Text>
          <Text style={styles.emptySubtitle}>
            İlan akışındaki araç satıcılarına mesaj göndererek veya ilanlarınıza gelen sorulara yanıt vererek sohbet başlatabilirsiniz.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.push('/ilan-akisi' as any)}
          >
            <Ionicons name="car-sport-outline" size={18} color="#ffffff" />
            <Text style={styles.exploreBtnText}>Araç İlanlarını İncele</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
          renderItem={({ item }) => {
            const lastMsg = item.messages && item.messages.length > 0 ? item.messages[item.messages.length - 1] : null;
            const otherName = getOtherParticipant(item);
            const otherPhoto = getOtherParticipantPhoto(item);
            const isUnread = lastMsg && lastMsg.senderId !== currentUserId && !lastMsg.readAt;

            return (
              <TouchableOpacity
                style={[styles.chatCard, isUnread && styles.chatCardUnread]}
                activeOpacity={0.75}
                onPress={() => router.push({ pathname: '/messages/[id]', params: { id: item.id } })}
              >
                {/* Avatar */}
                <View style={styles.avatarWrap}>
                  {otherPhoto ? (
                    <ExpoImage
                      source={{ uri: resolveMediaUrl(otherPhoto) || '' }}
                      style={styles.avatarImg}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>
                        {(otherName[0] || 'K').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {isUnread && <View style={styles.unreadDot} />}
                </View>

                {/* Details */}
                <View style={styles.cardDetails}>
                  <View style={styles.topRow}>
                    <Text style={[styles.participantName, isUnread && styles.participantNameUnread]}>
                      {otherName}
                    </Text>
                    <Text style={styles.timeText}>
                      {formatTime(item.lastMessageAt || lastMsg?.createdAt)}
                    </Text>
                  </View>

                  {item.listing?.title && (
                    <View style={styles.listingPill}>
                      <Ionicons name="car" size={12} color="#ea580c" />
                      <Text style={styles.listingPillText} numberOfLines={1}>
                        {item.listing.title}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={[styles.lastMessageText, isUnread && styles.lastMessageTextUnread]}
                    numberOfLines={1}
                  >
                    {lastMsg ? lastMsg.body : 'Sohbet başlatıldı'}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>
            );
          }}
        />
      )}
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
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 14,
    gap: 10,
    paddingBottom: 40,
  },
  chatCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  chatCardUnread: {
    borderColor: '#ea580c',
    backgroundColor: '#fffcf9',
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#fff7ed',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ea580c',
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ea580c',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  cardDetails: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  participantNameUnread: {
    fontWeight: '900',
    color: '#0f172a',
  },
  timeText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  listingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 1,
    marginBottom: 2,
    maxWidth: '85%',
  },
  listingPillText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  lastMessageText: {
    fontSize: 12.5,
    color: '#64748b',
  },
  lastMessageTextUnread: {
    color: '#0f172a',
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  exploreBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});
