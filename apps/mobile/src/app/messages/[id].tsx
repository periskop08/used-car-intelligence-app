import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
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

interface MessageItem {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt?: string | null;
}

interface ConversationDetail {
  id: string;
  listingId: string | null;
  buyerId: string;
  sellerId: string;
  listing?: {
    id: string;
    title: string;
    priceAmount?: number;
    city?: string;
  } | null;
  buyer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    email: string;
    profilePhotoUrl: string | null;
  };
  seller: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    email: string;
    profilePhotoUrl: string | null;
  };
  messages: MessageItem[];
}

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadProfileAndChat();
    const interval = setInterval(() => {
      fetchMessagesSilently();
    }, 4000);
    return () => clearInterval(interval);
  }, [id]);

  const loadProfileAndChat = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!token) {
        setLoading(false);
        return;
      }

      // 1. Current user
      const userRes = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        setCurrentUserId(u.id);
      }

      // 2. Fetch conversation detail
      const res = await fetch(`${API_URL}/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setConversation(data);
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('Chat load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessagesSilently = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (!token || !id) return;

      const res = await fetch(`${API_URL}/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {}
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || sending) return;

    const token =
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('token'));
    if (!token) return;

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/conversations/${id}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: content }),
      });

      if (res.ok) {
        const created = await res.json();
        setMessages((prev) => [...prev, created]);
        setInputText('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        Alert.alert('Hata', 'Mesaj gönderilemedi.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası oluştu.');
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = () => {
    if (!conversation) return 'Kullanıcı';
    const isBuyer = currentUserId === conversation.buyerId;
    const other = isBuyer ? conversation.seller : conversation.buyer;
    if (!other) return 'Kullanıcı';
    if (other.firstName || other.lastName) {
      return `${other.firstName || ''} ${other.lastName || ''}`.trim();
    }
    return other.username || other.email?.split('@')[0] || 'Kullanıcı';
  };

  const getOtherParticipantPhoto = () => {
    if (!conversation) return null;
    const isBuyer = currentUserId === conversation.buyerId;
    const other = isBuyer ? conversation.seller : conversation.buyer;
    return other?.profilePhotoUrl || null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerUserWrap}>
          <View style={styles.headerAvatar}>
            {getOtherParticipantPhoto() ? (
              <ExpoImage
                source={{ uri: resolveMediaUrl(getOtherParticipantPhoto()) || '' }}
                style={styles.headerAvatarImg}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.headerAvatarText}>
                {(getOtherParticipant()[0] || 'K').toUpperCase()}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.headerName}>{getOtherParticipant()}</Text>
            {conversation?.listing?.title && (
              <Text style={styles.headerListingTitle} numberOfLines={1}>
                {conversation.listing.title}
              </Text>
            )}
          </View>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* Messages Feed */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#ea580c" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMine = item.senderId === currentUserId;
              return (
                <View
                  style={[
                    styles.messageBubbleWrap,
                    isMine ? styles.myBubbleWrap : styles.theirBubbleWrap,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isMine ? styles.myMessageBubble : styles.theirMessageBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isMine ? styles.myMessageText : styles.theirMessageText,
                      ]}
                    >
                      {item.body}
                    </Text>
                    <Text
                      style={[
                        styles.messageTimeText,
                        isMine ? styles.myTimeText : styles.theirTimeText,
                      ]}
                    >
                      {new Date(item.createdAt).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.inputField}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUserWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginLeft: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerAvatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ea580c',
  },
  headerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerListingTitle: {
    fontSize: 11,
    color: '#64748b',
    maxWidth: 200,
  },
  messagesList: {
    padding: 16,
    gap: 8,
  },
  messageBubbleWrap: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  myBubbleWrap: {
    justifyContent: 'flex-end',
  },
  theirBubbleWrap: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 4,
  },
  myMessageBubble: {
    backgroundColor: '#ea580c',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  myMessageText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  theirMessageText: {
    color: '#0f172a',
    fontWeight: '500',
  },
  messageTimeText: {
    fontSize: 9.5,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  theirTimeText: {
    color: '#94a3b8',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inputField: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 90,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
