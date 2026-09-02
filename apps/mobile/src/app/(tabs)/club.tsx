import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';
const { width: windowWidth } = Dimensions.get('window');

interface PostMedia {
  id: string;
  mediaUrl: string;
  thumbnailUrl?: string;
}

interface PostAuthor {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profilePhotoUrl?: string;
  role?: string;
}

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  votePercentage?: number;
}

interface PollData {
  id: string;
  question: string;
  totalVotes: number;
  myVotedOptionId?: string | null;
  isClosed?: boolean;
  options: PollOption[];
}

interface ClubPost {
  id: string;
  title?: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  author: PostAuthor;
  media: PostMedia[];
  commentCount: number;
  likeCount: number;
  isLiked?: boolean;
  commentsEnabled: boolean;
  poll?: PollData;
}

interface ClubComment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    profilePhotoUrl?: string;
    role?: string;
  };
}

export default function TorqueScoutClubScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'ANNOUNCEMENTS' | 'POLLS' | 'DISCUSSIONS'>('ALL');
  const [token, setToken] = useState<string | null>(null);

  // Comment Modal State
  const [activePostForComments, setActivePostForComments] = useState<ClubPost | null>(null);
  const [comments, setComments] = useState<ClubComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Voting State Tracking
  const [votingPollIds, setVotingPollIds] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      loadTokenAndFeed();
    }, [])
  );

  const loadTokenAndFeed = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('accessToken');
      setToken(storedToken);
      await fetchClubPosts(storedToken);
    } catch (e) {
      console.error('Error loading club:', e);
      setLoading(false);
    }
  };

  const fetchClubPosts = async (authToken?: string | null) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${API_URL}/club/posts?limit=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        const rawPosts = Array.isArray(data) ? data : data.items || [];
        setPosts(rawPosts);
      } else {
        // Fallback sample posts if API is empty or in cold start
        setPosts(getSampleClubPosts());
      }
    } catch (e) {
      console.error('Failed to fetch club posts:', e);
      setPosts(getSampleClubPosts());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClubPosts(token);
  };

  const handleLikeToggle = async (post: ClubPost) => {
    if (!token) {
      Alert.alert('Giriş Yapın', 'Paylaşımları beğenmek için lütfen giriş yapın.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/(tabs)/profile' as any) },
      ]);
      return;
    }

    // Optimistic UI update
    const currentlyLiked = !!post.isLiked;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              isLiked: !currentlyLiked,
              likeCount: currentlyLiked ? Math.max(0, p.likeCount - 1) : p.likeCount + 1,
            }
          : p
      )
    );

    try {
      await fetch(`${API_URL}/club/posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (e) {
      console.error('Like toggle error:', e);
    }
  };

  const handleOpenComments = async (post: ClubPost) => {
    setActivePostForComments(post);
    setLoadingComments(true);
    setComments([]);

    try {
      const res = await fetch(`${API_URL}/club/posts/${post.id}/comments?limit=50`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.items || [];
        setComments(list);
      } else {
        setComments([
          {
            id: 'c-sample-1',
            postId: post.id,
            content: 'Çok faydalı bir paylaşım olmuş, teşekkürler!',
            createdAt: new Date().toISOString(),
            author: { id: 'u1', displayName: 'Ahmet Yılmaz', role: 'PRO' },
          },
        ]);
      }
    } catch (e) {
      console.error('Fetch comments error:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!newCommentText.trim() || !activePostForComments) return;

    if (!token) {
      Alert.alert('Giriş Yapın', 'Yorum yapmak için lütfen giriş yapın.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/(tabs)/profile' as any) },
      ]);
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/club/posts/${activePostForComments.id}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newCommentText.trim() }),
      });

      if (res.ok) {
        const created = await res.json();
        setComments((prev) => [created, ...prev]);
        setNewCommentText('');
        // Update comment count on post
        setPosts((prev) =>
          prev.map((p) =>
            p.id === activePostForComments.id ? { ...p, commentCount: p.commentCount + 1 } : p
          )
        );
      } else {
        Alert.alert('Hata', 'Yorum gönderilemedi, lütfen tekrar deneyin.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası oluştu.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string, postId: string) => {
    if (!token) {
      Alert.alert('Giriş Yapın', 'Ankete oy vermek için lütfen giriş yapın.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/(tabs)/profile' as any) },
      ]);
      return;
    }

    setVotingPollIds((prev) => ({ ...prev, [pollId]: true }));
    try {
      const res = await fetch(`${API_URL}/club/polls/${pollId}/my-vote`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optionId }),
      });

      if (res.ok) {
        await fetchClubPosts(token);
      } else {
        Alert.alert('Bilgi', 'Oyunuz kaydedilemedi veya anket süresi doldu.');
      }
    } catch (e) {
      console.error('Vote error:', e);
    } finally {
      setVotingPollIds((prev) => ({ ...prev, [pollId]: false }));
    }
  };

  const handleShare = async (post: ClubPost) => {
    try {
      await Share.share({
        message: `${post.title ? post.title + '\n' : ''}${post.content}\n\nTorqueScout Club ile paylaşıldı: https://torquescout.com/club`,
      });
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (selectedCategory === 'POLLS') return !!p.poll;
    if (selectedCategory === 'ANNOUNCEMENTS') return p.isPinned || p.author.role === 'ADMIN';
    if (selectedCategory === 'DISCUSSIONS') return !p.poll && !p.isPinned;
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* TOP CLUB NAVBAR */}
      <View style={styles.topNavbar}>
        <View style={styles.navLeft}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.clubMainTitle}>TorqueScout <Text style={styles.clubAccentTitle}>Club</Text></Text>
            <Text style={styles.clubSubTitle}>Otomobil Tutkunları Topluluğu</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/(tabs)/profile' as any)}
        >
          <Ionicons name="person-circle-outline" size={26} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* CATEGORY FILTER PILLS */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {[
            { key: 'ALL', label: '🔥 Tümü', count: posts.length },
            { key: 'ANNOUNCEMENTS', label: '📢 Duyurular' },
            { key: 'POLLS', label: '📊 Anketler' },
            { key: 'DISCUSSIONS', label: '💬 Sohbet & Deneyim' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setSelectedCategory(cat.key as any)}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* FEED CONTENT */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.loadingText}>Kulüp akışı yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.feedScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {/* COMMUNITY WELCOME CARD */}
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeContent}>
              <View style={styles.welcomeBadge}>
                <Ionicons name="sparkles" size={12} color="#ea580c" />
                <Text style={styles.welcomeBadgeText}>VIP TOPLULUK</Text>
              </View>
              <Text style={styles.welcomeTitle}>Kulübe Hoş Geldiniz!</Text>
              <Text style={styles.welcomeSub}>
                Araç sahipleriyle tecrübe paylaşın, anketlere katılın ve özel duyurulardan anında haberdar olun.
              </Text>
            </View>
          </View>

          {/* POSTS LIST */}
          {filteredPosts.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Ionicons name="chatbubbles-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyFeedTitle}>Bu kategoride henüz paylaşım yok</Text>
              <Text style={styles.emptyFeedSub}>Farklı bir kategori seçebilir veya ilk yorumu yapabilirsiniz.</Text>
            </View>
          ) : (
            filteredPosts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                {/* Pinned Tag */}
                {post.isPinned && (
                  <View style={styles.pinnedRow}>
                    <Ionicons name="pin" size={13} color="#ea580c" />
                    <Text style={styles.pinnedText}>SABİTLENMİŞ DUYURU</Text>
                  </View>
                )}

                {/* Author Info */}
                <View style={styles.authorRow}>
                  <View style={styles.authorAvatarWrap}>
                    {post.author.profilePhotoUrl ? (
                      <ExpoImage
                        source={{ uri: post.author.profilePhotoUrl }}
                        style={styles.authorAvatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>
                          {(post.author.firstName?.[0] || post.author.username?.[0] || 'T').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.authorMeta}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName}>
                        {post.author.firstName
                          ? `${post.author.firstName} ${post.author.lastName || ''}`.trim()
                          : post.author.username || 'TorqueScout Üyesi'}
                      </Text>
                      {post.author.role === 'ADMIN' ? (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>YÖNETİCİ</Text>
                        </View>
                      ) : (
                        <View style={styles.proBadge}>
                          <Text style={styles.proBadgeText}>PRO ÜYE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postDate}>{formatTimeAgo(post.publishedAt)}</Text>
                  </View>
                </View>

                {/* Title & Body */}
                {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
                <Text style={styles.postContent}>{post.content}</Text>

                {/* Post Media (Images) */}
                {post.media && post.media.length > 0 && (
                  <View style={styles.postMediaContainer}>
                    <ExpoImage
                      source={{ uri: post.media[0].mediaUrl }}
                      style={styles.postMediaImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </View>
                )}

                {/* Interactive Poll Component */}
                {post.poll && (
                  <View style={styles.pollCardContainer}>
                    <View style={styles.pollHeader}>
                      <Ionicons name="bar-chart" size={16} color="#ea580c" />
                      <Text style={styles.pollQuestion}>{post.poll.question}</Text>
                    </View>

                    <View style={styles.pollOptionsList}>
                      {post.poll.options.map((opt) => {
                        const isSelected = post.poll?.myVotedOptionId === opt.id;
                        const percentage =
                          post.poll && post.poll.totalVotes > 0
                            ? Math.round((opt.voteCount / post.poll.totalVotes) * 100)
                            : 0;

                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.pollOptionItem, isSelected && styles.pollOptionSelected]}
                            onPress={() => handleVotePoll(post.poll!.id, opt.id, post.id)}
                            disabled={votingPollIds[post.poll!.id]}
                          >
                            {/* Percentage fill bar */}
                            <View style={[styles.pollPercentageBar, { width: `${percentage}%` }]} />

                            <View style={styles.pollOptionContentRow}>
                              <View style={styles.pollRadioRow}>
                                <Ionicons
                                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                                  size={16}
                                  color={isSelected ? '#ea580c' : '#94a3b8'}
                                />
                                <Text
                                  style={[
                                    styles.pollOptionText,
                                    isSelected && styles.pollOptionTextSelected,
                                  ]}
                                >
                                  {opt.text}
                                </Text>
                              </View>
                              <Text style={styles.pollPercentText}>%{percentage}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.pollFooterRow}>
                      <Text style={styles.pollTotalVotesText}>
                        👥 Toplam {post.poll.totalVotes} oy kullanıldı
                      </Text>
                      {post.poll.myVotedOptionId && (
                        <Text style={styles.pollVotedBadge}>✓ Oyunuz Kaydedildi</Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Interaction Footer (Likes, Comments, Share) */}
                <View style={styles.postActionsBar}>
                  <TouchableOpacity
                    style={[styles.actionBtn, post.isLiked && styles.actionBtnActive]}
                    onPress={() => handleLikeToggle(post)}
                  >
                    <Ionicons
                      name={post.isLiked ? 'heart' : 'heart-outline'}
                      size={18}
                      color={post.isLiked ? '#ef4444' : '#64748b'}
                    />
                    <Text style={[styles.actionBtnText, post.isLiked && styles.actionBtnTextActive]}>
                      {post.likeCount || 0} Beğeni
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleOpenComments(post)}
                  >
                    <Ionicons name="chatbubble-outline" size={17} color="#64748b" />
                    <Text style={styles.actionBtnText}>{post.commentCount || 0} Yorum</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(post)}>
                    <Ionicons name="share-social-outline" size={17} color="#64748b" />
                    <Text style={styles.actionBtnText}>Paylaş</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* COMMENTS BOTTOM MODAL */}
      <Modal
        visible={!!activePostForComments}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActivePostForComments(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.commentModalSheet}>
            {/* Modal Header */}
            <View style={styles.commentModalHeader}>
              <View style={styles.modalDragHandle} />
              <View style={styles.commentHeaderRow}>
                <Text style={styles.commentModalTitle}>
                  💬 Yorumlar ({activePostForComments?.commentCount || 0})
                </Text>
                <TouchableOpacity
                  onPress={() => setActivePostForComments(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Comment List */}
            {loadingComments ? (
              <View style={styles.centerCommentsLoading}>
                <ActivityIndicator size="small" color="#ea580c" />
                <Text style={styles.loadingCommentsText}>Yorumlar yükleniyor...</Text>
              </View>
            ) : (
              <ScrollView style={styles.commentsScrollView} showsVerticalScrollIndicator={false}>
                {comments.length === 0 ? (
                  <View style={styles.emptyComments}>
                    <Text style={styles.emptyCommentsText}>
                      Henüz yorum yapılmamış. İlk yorumu sen yap! 🚀
                    </Text>
                  </View>
                ) : (
                  comments.map((c) => (
                    <View key={c.id} style={styles.commentBubble}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>
                          {(c.author.displayName?.[0] || 'U').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.commentBody}>
                        <View style={styles.commentAuthorRow}>
                          <Text style={styles.commentAuthorName}>{c.author.displayName}</Text>
                          <Text style={styles.commentTime}>{formatTimeAgo(c.createdAt)}</Text>
                        </View>
                        <Text style={styles.commentTextContent}>{c.content}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* Comment Input Bar */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Kulübe bir yorum bırak..."
                placeholderTextColor="#94a3b8"
                value={newCommentText}
                onChangeText={setNewCommentText}
                multiline
                maxLength={400}
              />
              <TouchableOpacity
                style={[
                  styles.commentSubmitBtn,
                  (!newCommentText.trim() || submittingComment) && styles.commentSubmitBtnDisabled,
                ]}
                onPress={handleSendComment}
                disabled={!newCommentText.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="send" size={16} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Helpers
function formatTimeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Az önce';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} dk önce`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} sa önce`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} gün önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR');
  } catch {
    return 'Bugün';
  }
}

// High Quality Sample Club Posts
function getSampleClubPosts(): ClubPost[] {
  return [
    {
      id: 'sample-p1',
      title: '🏎️ 2026 Otomobil Piyasası & Kronik Risk Raporları Yayınlandı',
      content:
        'TorqueScout Yapay Zeka Laboratuvarı olarak Türkiye pazarında en çok alınıp satılan C ve D segment araçların kronik DSG, AdBlue ve triger değişim döngülerini raporladık. Detaylı analizleri araç sorgulama ve karşılaştırma sayfalarından inceleyebilirsiniz.',
      isPinned: true,
      publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      author: {
        id: 'admin-1',
        firstName: 'TorqueScout',
        lastName: 'Ekibi',
        role: 'ADMIN',
      },
      media: [
        {
          id: 'm1',
          mediaUrl:
            'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80',
        },
      ],
      commentCount: 8,
      likeCount: 24,
      isLiked: true,
      commentsEnabled: true,
    },
    {
      id: 'sample-p2',
      title: '📊 Haftanın Anketi: Dizel mi, Hibrit mi?',
      content:
        'Şehir içi ve uzun yol karma tüketimde yıllık 20.000 KM yapan bir kullanıcı için sizce hangi motor kombinasyonu 2026 yılında daha mantıklı?',
      isPinned: false,
      publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      author: {
        id: 'u-burhan',
        firstName: 'Burhan',
        lastName: 'Seçkin',
        role: 'PRO',
      },
      media: [],
      commentCount: 14,
      likeCount: 38,
      isLiked: false,
      commentsEnabled: true,
      poll: {
        id: 'poll-1',
        question: '2026 yılında günlük kullanım için tercihiniz:',
        totalVotes: 64,
        myVotedOptionId: 'opt-2',
        options: [
          { id: 'opt-1', text: 'Tam Hibrit (HEV / e-Power)', voteCount: 32 },
          { id: 'opt-2', text: 'Plug-in Hibrit (PHEV)', voteCount: 18 },
          { id: 'opt-3', text: 'Modern Euro 6.4 Dizel (TDI / BlueHDi)', voteCount: 14 },
        ],
      },
    },
    {
      id: 'sample-p3',
      title: '🛠️ DSG Kavrama ve Mekatronik Ömrünü Uzatmanın 5 Püf Noktası',
      content:
        'Trafikte beklerken N konumuna almak, yokuş kalkışlarında el freni desteği kullanmak ve 60.000 km periyodik yağ değişimlerini aksatmamak çift kavramalı şanzımanların ömrünü iki katına çıkarıyor.',
      isPinned: false,
      publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      author: {
        id: 'u-mehmet',
        firstName: 'Mehmet Efe',
        lastName: 'Güven',
        role: 'PRO',
      },
      media: [
        {
          id: 'm2',
          mediaUrl:
            'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
        },
      ],
      commentCount: 5,
      likeCount: 19,
      isLiked: false,
      commentsEnabled: true,
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shieldBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  clubMainTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  clubAccentTitle: {
    color: '#ea580c',
  },
  clubSubTitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScrollWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  feedScrollContent: {
    padding: 14,
    gap: 14,
    paddingBottom: 40,
  },
  welcomeBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeContent: {
    gap: 6,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  welcomeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
  welcomeSub: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
  emptyFeed: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyFeedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyFeedSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  authorAvatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563eb',
  },
  authorMeta: {
    flex: 1,
    gap: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  adminBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ef4444',
  },
  proBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ea580c',
  },
  postDate: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  postTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 20,
  },
  postContent: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  postMediaContainer: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  postMediaImage: {
    width: '100%',
    height: '100%',
  },
  pollCardContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 10,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollQuestion: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  pollOptionsList: {
    gap: 8,
  },
  pollOptionItem: {
    position: 'relative',
    height: 38,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  pollOptionSelected: {
    borderColor: '#ea580c',
    borderWidth: 1.5,
  },
  pollPercentageBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#fff7ed',
  },
  pollOptionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    zIndex: 2,
  },
  pollRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pollOptionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  pollOptionTextSelected: {
    color: '#ea580c',
    fontWeight: '800',
  },
  pollPercentText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#64748b',
  },
  pollFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollTotalVotesText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
  pollVotedBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#16a34a',
  },
  postActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionBtnActive: {
    backgroundColor: '#fef2f2',
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  actionBtnTextActive: {
    color: '#ef4444',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  commentModalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  commentModalHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 8,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  commentModalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 4,
  },
  centerCommentsLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingCommentsText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  commentsScrollView: {
    padding: 16,
  },
  emptyComments: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  commentBubble: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ea580c',
  },
  commentBody: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentAuthorName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  commentTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  commentTextContent: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12.5,
    color: '#0f172a',
    maxHeight: 80,
  },
  commentSubmitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSubmitBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
