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

const formatMessageTime = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
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
  buyer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    email: string;
    profilePhotoUrl: string | null;
  };
  seller?: {
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
  const { id, initialDraft } = useLocalSearchParams<{ id: string; initialDraft?: string }>();

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState(initialDraft || '');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (initialDraft) {
      setInputText(initialDraft);
    }
  }, [initialDraft]);

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
        setCurrentUserId(u?.id || null);
      }

      // 2. Fetch conversation detail
      const res = await fetch(`${API_URL}/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setConversation(data);
        const uniqueMessages: MessageItem[] = [];
        const seenIds = new Set<string>();
        if (Array.isArray(data?.messages)) {
          for (const m of data.messages) {
            if (m?.id && !seenIds.has(m.id)) {
              seenIds.add(m.id);
              uniqueMessages.push(m);
            }
          }
        }
        setMessages(uniqueMessages);
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
        setConversation(data);
        const uniqueMessages: MessageItem[] = [];
        const seenIds = new Set<string>();
        if (Array.isArray(data?.messages)) {
          for (const m of data.messages) {
            if (m?.id && !seenIds.has(m.id)) {
              seenIds.add(m.id);
              uniqueMessages.push(m);
            }
          }
        }
        setMessages(uniqueMessages);
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
        setMessages((prev) => {
          if (!created?.id) return prev;
          if (prev.some((m) => m.id === created.id)) return prev;
          return [...prev, created];
        });
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

  const getOtherParticipant = (): string => {
    if (!conversation) return 'Kullanıcı';
    const isBuyer = currentUserId === conversation.buyerId;
    const other = isBuyer ? conversation.seller : conversation.buyer;
    if (!other) return 'Kullanıcı';
    const fullName = `${other.firstName || ''} ${other.lastName || ''}`.trim();
    if (fullName) return fullName;
    if (other.username) return other.username;
    if (other.email) return other.email.split('@')[0];
    return 'Kullanıcı';
  };

  const getOtherParticipantPhoto = (): string | null => {
    if (!conversation) return null;
    const isBuyer = currentUserId === conversation.buyerId;
    const other = isBuyer ? conversation.seller : conversation.buyer;
    return other?.profilePhotoUrl || null;
  };

  const otherName = getOtherParticipant();
  const avatarLetter = (otherName && otherName.length > 0 ? otherName[0] : 'K').toUpperCase();
  const otherPhoto = getOtherParticipantPhoto();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerUserWrap}>
          <View style={styles.headerAvatar}>
            {otherPhoto ? (
              <ExpoImage
                source={{ uri: resolveMediaUrl(otherPhoto) || '' }}
                style={styles.headerAvatarImg}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.headerAvatarText}>{avatarLetter}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherName}
            </Text>
            {!!conversation?.listing?.title && (
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
            keyExtractor={(item, index) => (item?.id ? `${item.id}-${index}` : `msg-${index}`)}
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
                      {formatMessageTime(item.createdAt)}
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
            activeOpacity={0.8}
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
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUserWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  headerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerListingTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  messageBubbleWrap: {
    flexDirection: 'row',
    width: '100%',
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
    borderRadius: 16,
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
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#ffffff',
  },
  theirMessageText: {
    color: '#0f172a',
  },
  messageTimeText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  theirTimeText: {
    color: '#94a3b8',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  inputField: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
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
