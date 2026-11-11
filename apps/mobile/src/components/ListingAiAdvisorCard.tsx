import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://used-car-api-hzmu.onrender.com';

export interface ListingAiAdvisorCardProps {
  listingId: string;
  vehicleVariantId?: string;
  brandName?: string;
  modelFamilyName?: string;
  yearVal?: string | number;
  engineName?: string;
  fuelType?: string;
  transmission?: string;
  trimName?: string;
}

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  messageType: string;
  content: string;
  createdAt: string;
  feedback?: 'UP' | 'DOWN' | null;
}

interface QuotaDetail {
  limit?: number;
  used?: number;
  remaining?: number;
}

interface QuotaInfo {
  unlimited: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  reportQuota?: QuotaDetail;
  chatbotQuota?: QuotaDetail;
}

const QUICK_QUESTIONS = [
  'Bu ilandaki en büyük riskler neler?',
  'Satıcıya hangi soruları sormalıyım?',
  'Ekspertizde özellikle nereyi kontrol ettirmeliyim?',
  'Kilometre ve yaş dengesi nasıl?',
  'İlan açıklamasında çelişki var mı?',
  'Bu araç şehir içi kullanım için uygun mu?',
];

export default function ListingAiAdvisorCard({
  listingId,
  vehicleVariantId,
  brandName,
  modelFamilyName,
  yearVal,
  engineName,
  fuelType,
  transmission,
  trimName,
}: ListingAiAdvisorCardProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Record<string, 'UP' | 'DOWN'>>({});
  const chatScrollRef = useRef<ScrollView>(null);

  const getToken = async (): Promise<string | null> => {
    return (
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('token'))
    );
  };

  const fetchQuota = async () => {
    try {
      const token = await getToken();
      if (!token || !listingId) return;

      const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-chat/quota`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
      }
    } catch (e) {
      // ignore quota fetch error silently
    }
  };

  const fetchConversation = async () => {
    try {
      const token = await getToken();
      if (!token || !listingId) {
        fetchQuota();
        return;
      }

      const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-conversation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const msgList: ChatMessage[] = data.messages || [];
        setMessages(msgList);
        if (data.quota) setQuota(data.quota);
        if (msgList.length > 0) {
          setShowQuickQuestions(false);
        }
      }
    } catch (e) {
      // ignore conversation fetch error silently
    } finally {
      fetchQuota();
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchConversation();
    }
  }, [listingId]);

  const chatMessages = messages.filter(
    (m) =>
      (m.role === 'USER' || m.role === 'ASSISTANT') &&
      m.messageType !== 'INITIAL_ANALYSIS' &&
      m.messageType !== 'VEHICLE_REPORT'
  );

  const reportRemaining = quota?.reportQuota?.remaining ?? (quota?.unlimited ? '∞' : 3);
  const chatbotRemaining = quota?.chatbotQuota?.remaining ?? (quota?.unlimited ? '∞' : 3);
  const isChatbotQuotaExhausted =
    quota !== null &&
    !quota.unlimited &&
    typeof chatbotRemaining === 'number' &&
    chatbotRemaining <= 0;

  const handleNavigateToReport = () => {
    router.push({
      pathname: '/vehicle-report',
      params: {
        variantId: vehicleVariantId || undefined,
        brand: brandName,
        model: modelFamilyName,
        year: yearVal ? String(yearVal) : undefined,
        engine: engineName || undefined,
        fuelType: fuelType || undefined,
        transmission: transmission || undefined,
        trim: trimName || undefined,
        listingId: listingId || undefined,
      },
    } as any);
  };

  const handleSendMessage = async (presetText?: string) => {
    const messageText = (presetText || inputMessage).trim();
    if (!messageText || loading) return;

    const token = await getToken();
    if (!token) {
      Alert.alert(
        'Giriş Gerekli',
        'Tork Scout AI Chatbot danışmanını kullanabilmek için lütfen giriş yapın.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Giriş Yap',
            onPress: () => router.push('/login' as any),
          },
        ]
      );
      return;
    }

    if (!presetText) setInputMessage('');
    setLoading(true);
    setIsOpen(true);
    setShowQuickQuestions(false);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      messageType: 'USER_MESSAGE',
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const idempotencyKey = `msg-${listingId}-${Date.now()}`;
      const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          idempotencyKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: data.assistantMessageId || `assistant-${Date.now()}`,
          role: 'ASSISTANT',
          messageType: data.messageType || 'ASSISTANT_RESPONSE',
          content: data.answer,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (data.quota) setQuota(data.quota);
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Bilgi', errData.message || 'Mesaj gönderilemedi, lütfen tekrar deneyin.');
      }
    } catch (e) {
      Alert.alert('Bağlantı Hatası', 'AI Danışmanına bağlanırken bir hata oluştu.');
    } finally {
      setLoading(false);
      fetchQuota();
    }
  };

  const handleClearConversation = async () => {
    const token = await getToken();
    if (!token) {
      setMessages([]);
      setShowQuickQuestions(true);
      return;
    }

    Alert.alert(
      'Sohbeti Temizle',
      'Chatbot sohbet geçmişiniz temizlenecektir. Onaylıyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/listings/${listingId}/ai-conversation`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                setMessages([]);
                setShowQuickQuestions(true);
                fetchQuota();
              }
            } catch {
              setMessages([]);
              setShowQuickQuestions(true);
            }
          },
        },
      ]
    );
  };

  const renderFormattedMarkdown = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    return (
      <View style={{ gap: 4 }}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          if (trimmed.startsWith('### ')) {
            return (
              <Text key={idx} style={styles.mdHeading}>
                {trimmed.replace('### ', '')}
              </Text>
            );
          }

          const isBullet =
            trimmed.startsWith('- ') ||
            trimmed.startsWith('* ') ||
            trimmed.startsWith('• ');
          const cleanLine = isBullet ? trimmed.substring(2) : trimmed;
          const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

          return (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {isBullet && <Text style={styles.mdBullet}>• </Text>}
              <Text style={styles.mdParagraph}>
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <Text key={pIdx} style={styles.mdBold}>
                        {part.slice(2, -2)}
                      </Text>
                    );
                  }
                  return part;
                })}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.cardContainer}>
      {/* Centered Header Section (No Sparkles Icon) */}
      <View style={styles.headerSection}>
        <View style={styles.headerCenteredBlock}>
          <Text style={styles.cardTitle}>Tork Scout İlan Zekası</Text>
          <Text style={styles.cardSubtitle}>
            İlan teknik analizi, ekspertiz çelişkileri ve yapay zeka danışmanı.
          </Text>
        </View>

        {/* Quota Indicators Row */}
        <View style={styles.quotaBadgesRow}>
          <View style={[styles.quotaBadgeBox, styles.quotaBadgeReport]}>
            <Ionicons name="document-text-outline" size={14} color="#d97706" />
            <View>
              <Text style={styles.quotaBadgeLabel}>ARAÇ RAPORU HAKKI</Text>
              <Text style={styles.quotaBadgeValueAmber}>
                {quota === null || quota.unlimited ? 'Sınırsız' : `Kalan: ${reportRemaining}`}
              </Text>
            </View>
          </View>

          <View style={[styles.quotaBadgeBox, styles.quotaBadgeChat]}>
            <Ionicons name="chatbox-outline" size={14} color="#ea580c" />
            <View>
              <Text style={styles.quotaBadgeLabel}>AI CHATBOT HAKKI</Text>
              <Text style={styles.quotaBadgeValueOrange}>
                {quota === null || quota.unlimited ? 'Sınırsız' : `Kalan: ${chatbotRemaining}`}
              </Text>
            </View>
          </View>

          {isOpen && (
            <TouchableOpacity
              style={styles.collapseBtn}
              onPress={() => setIsOpen(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-up" size={15} color="#ea580c" />
              <Text style={styles.collapseBtnText}>Daralt</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={styles.reportPrimaryBtn}
          onPress={handleNavigateToReport}
          activeOpacity={0.85}
        >
          <Ionicons name="document-text-outline" size={16} color="#ffffff" />
          <Text
            style={styles.reportPrimaryBtnText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Aracı İncele & AI Raporu Al
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.chatbotSecondaryBtn,
            isOpen && styles.chatbotSecondaryBtnActive,
          ]}
          onPress={() => setIsOpen((prev) => !prev)}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbox-outline" size={16} color="#ea580c" />
          <Text
            style={styles.chatbotSecondaryBtnText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Chatbot ile Konuş{chatMessages.length > 0 ? ` (${chatMessages.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expandable Interactive Chatbot Section */}
      {isOpen && (
        <View style={styles.chatPanelWrap}>
          {/* Top Bar inside Chat Panel */}
          <View style={styles.chatPanelTopRow}>
            <TouchableOpacity
              style={styles.quickQuestionsToggleBtn}
              onPress={() => setShowQuickQuestions((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={15} color="#ea580c" />
              <Text style={styles.quickQuestionsToggleText}>
                💡 ÖNERİLEN HIZLI SORULAR ({QUICK_QUESTIONS.length})
              </Text>
              <Ionicons
                name={showQuickQuestions ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#64748b"
              />
            </TouchableOpacity>

            {chatMessages.length > 0 && (
              <TouchableOpacity
                style={styles.clearChatBtn}
                onPress={handleClearConversation}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={13} color="#dc2626" />
                <Text style={styles.clearChatBtnText}>Temizle</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Questions Chips */}
          {showQuickQuestions && (
            <View style={styles.quickQuestionsGrid}>
              {QUICK_QUESTIONS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickQuestionChip}
                  disabled={loading || isChatbotQuotaExhausted}
                  onPress={() => handleSendMessage(q)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickQuestionChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Chat Messages Stream */}
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatStreamBox}
            contentContainerStyle={styles.chatStreamContent}
            nestedScrollEnabled
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {chatMessages.length === 0 && !loading && (
              <View style={styles.emptyChatState}>
                <Ionicons name="chatbox-ellipses-outline" size={26} color="#ea580c" />
                <Text style={styles.emptyChatTitle}>AI Chatbot Danışmanına Hoş Geldiniz</Text>
                <Text style={styles.emptyChatSub}>
                  İlan hakkındaki merak ettiğiniz tüm soruları aşağıya yazabilir veya önerilen hızlı sorulardan seçebilirsiniz.
                </Text>
              </View>
            )}

            {chatMessages.map((msg) => {
              const isUser = msg.role === 'USER';
              const timeStr = new Date(msg.createdAt).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageItemWrap,
                    isUser ? styles.messageItemUser : styles.messageItemAssistant,
                  ]}
                >
                  <View style={styles.messageMetaRow}>
                    <Text style={styles.messageMetaText}>
                      {isUser ? 'Siz' : '🤖 Tork Scout İlan Danışmanı'} • {timeStr}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant,
                    ]}
                  >
                    {isUser ? (
                      <Text style={styles.userMessageText}>{msg.content}</Text>
                    ) : (
                      renderFormattedMarkdown(msg.content)
                    )}

                    {!isUser && (
                      <View style={styles.feedbackRow}>
                        <Text style={styles.feedbackLabel}>Bu değerlendirme faydalı oldu mu?</Text>
                        <View style={styles.feedbackActions}>
                          <TouchableOpacity
                            onPress={() =>
                              setFeedbacks((prev) => ({ ...prev, [msg.id]: 'UP' }))
                            }
                            style={styles.feedbackIconBtn}
                          >
                            <Ionicons
                              name={feedbacks[msg.id] === 'UP' ? 'thumbs-up' : 'thumbs-up-outline'}
                              size={14}
                              color={feedbacks[msg.id] === 'UP' ? '#10b981' : '#94a3b8'}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setFeedbacks((prev) => ({ ...prev, [msg.id]: 'DOWN' }))
                            }
                            style={styles.feedbackIconBtn}
                          >
                            <Ionicons
                              name={
                                feedbacks[msg.id] === 'DOWN' ? 'thumbs-down' : 'thumbs-down-outline'
                              }
                              size={14}
                              color={feedbacks[msg.id] === 'DOWN' ? '#ef4444' : '#94a3b8'}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#ea580c" />
                <Text style={styles.loadingRowText}>Danışman yanıt hazırlıyor...</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Bar or Quota Exhausted Notice */}
          {isChatbotQuotaExhausted ? (
            <View style={styles.quotaExhaustedBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="lock-closed-outline" size={16} color="#dc2626" />
                <Text style={styles.quotaExhaustedText}>
                  AI Chatbot mesaj hakkınız dolmuştur. Devam etmek için paketinizi yükseltebilirsiniz.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.upgradePackageBtn}
                onPress={() => router.push('/(tabs)/packages' as any)}
              >
                <Text style={styles.upgradePackageBtnText}>Paketler</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputBarRow}>
              <TextInput
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Bu ilan hakkında bir soru sorun..."
                placeholderTextColor="#94a3b8"
                style={styles.chatInput}
                editable={!loading}
                returnKeyType="send"
                onSubmitEditing={() => handleSendMessage()}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!inputMessage.trim() || loading) && styles.sendBtnDisabled,
                ]}
                disabled={!inputMessage.trim() || loading}
                onPress={() => handleSendMessage()}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={14} color="#ffffff" />
                <Text style={styles.sendBtnText}>Gönder</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f97316',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerSection: {
    alignItems: 'center',
    gap: 12,
  },
  headerCenteredBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  versionPill: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  versionPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 16,
    textAlign: 'center',
  },
  quotaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  quotaBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    borderWidth: 1,
  },
  quotaBadgeReport: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  quotaBadgeChat: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  quotaBadgeLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.4,
  },
  quotaBadgeValueAmber: {
    fontSize: 11,
    fontWeight: '900',
    color: '#d97706',
    marginTop: 1,
  },
  quotaBadgeValueOrange: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ea580c',
    marginTop: 1,
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  collapseBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportPrimaryBtn: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 14,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  reportPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  chatbotSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fb923c',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  chatbotSecondaryBtnActive: {
    backgroundColor: '#ffedd5',
    borderColor: '#ea580c',
  },
  chatbotSecondaryBtnText: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '900',
  },
  /* Expandable Chat Panel */
  chatPanelWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  chatPanelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickQuestionsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quickQuestionsToggleText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  clearChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearChatBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#dc2626',
  },
  quickQuestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickQuestionChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  quickQuestionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  chatStreamBox: {
    maxHeight: 320,
    minHeight: 150,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chatStreamContent: {
    padding: 12,
    gap: 12,
  },
  emptyChatState: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyChatTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptyChatSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
  messageItemWrap: {
    gap: 4,
  },
  messageItemUser: {
    alignItems: 'flex-end',
  },
  messageItemAssistant: {
    alignItems: 'flex-start',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageMetaText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
  },
  messageBubble: {
    maxWidth: '90%',
    padding: 12,
    borderRadius: 14,
  },
  messageBubbleUser: {
    backgroundColor: '#ea580c',
    borderBottomRightRadius: 2,
  },
  messageBubbleAssistant: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 2,
  },
  userMessageText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  mdHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
    marginTop: 4,
    marginBottom: 2,
  },
  mdBullet: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '800',
  },
  mdParagraph: {
    color: '#1e293b',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  mdBold: {
    fontWeight: '800',
    color: '#0f172a',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
    paddingTop: 6,
    gap: 8,
  },
  feedbackLabel: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#64748b',
  },
  feedbackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackIconBtn: {
    padding: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  loadingRowText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  inputBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 12.5,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f97316',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  quotaExhaustedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 12,
  },
  quotaExhaustedText: {
    fontSize: 11,
    color: '#991b1b',
    flex: 1,
  },
  upgradePackageBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  upgradePackageBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
