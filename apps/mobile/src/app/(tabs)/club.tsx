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
  Switch,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://used-car-api-hzmu.onrender.com';
const { width: windowWidth } = Dimensions.get('window');

const resolvePostMediaUrl = (url?: string | null): string => {
  if (!url) return '';
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
}

interface PostPoll {
  id: string;
  question: string;
  selectionType: string;
  totalVotes: number;
  options: PollOption[];
  myVotedOptionId?: string;
}

interface ClubPost {
  id: string;
  title?: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  author: PostAuthor;
  media: PostMedia[];
  poll?: PostPoll;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  commentsEnabled: boolean;
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
  const [userProfile, setUserProfile] = useState<{
    profilePhotoUrl?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  } | null>(null);

  // Admin Create Post Modal State
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [submittingPost, setSubmittingPost] = useState(false);

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
      const storedToken =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      setToken(storedToken);

      if (storedToken) {
        fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${storedToken}` } })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d && setUserProfile(d))
          .catch(() => {});
      }

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
        const rawPosts = data.posts || (Array.isArray(data) ? data : data.items || []);
        setPosts(rawPosts);
      } else {
        console.warn('Club posts fetch non-ok:', res.status);
      }
    } catch (e) {
      console.error('Error fetching club posts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClubPosts(token);
  };

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPER_ADMIN';

  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // ADMIN ACTIONS
  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleUpdatePollOption = (idx: number, val: string) => {
    const next = [...pollOptions];
    next[idx] = val;
    setPollOptions(next);
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handlePublishPost = async () => {
    if (!postContent.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen gönderi içeriğini yazın.');
      return;
    }

    if (hasPoll && (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2)) {
      Alert.alert('Eksik Anket Bilgisi', 'Lütfen anket sorusunu ve en az 2 seçeneği doldurun.');
      return;
    }

    setSubmittingPost(true);
    try {
      const currentToken =
        token ||
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      const payload: any = {
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
        mediaUrls: postMediaUrl.trim() ? [postMediaUrl.trim()] : [],
        isPinned,
        commentsEnabled,
        publishImmediately: true,
      };

      if (hasPoll) {
        payload.poll = {
          question: pollQuestion.trim(),
          options: pollOptions.filter((o) => o.trim()),
          selectionType: 'SINGLE',
        };
      }

      const res = await fetch(`${API_URL}/admin/club/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert('Başarılı', 'Club gönderiniz başarıyla yayınlandı!');
        setCreatePostModalVisible(false);
        setPostTitle('');
        setPostContent('');
        setPostMediaUrl('');
        setIsPinned(false);
        setCommentsEnabled(true);
        setHasPoll(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        await fetchClubPosts(currentToken);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Hata', err.message || 'Gönderi yayınlanamadı.');
      }
    } catch (e) {
      console.error('Create post error:', e);
      Alert.alert('Hata', 'Bağlantı hatası oluştu.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleAdminPostAction = (post: ClubPost) => {
    Alert.alert(
      '⚙️ Yönetici İşlemleri',
      `"${post.title || post.content.substring(0, 30)}..." için işlem seçin:`,
      [
        {
          text: post.isPinned ? 'Sabitlemeyi Kaldır' : 'Duyuruyu Sabitle 📌',
          onPress: async () => {
            const currentToken = token || (await AsyncStorage.getItem('accessToken'));
            await fetch(`${API_URL}/admin/club/posts/${post.id}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${currentToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ isPinned: !post.isPinned }),
            });
            fetchClubPosts(currentToken);
          },
        },
        {
          text: 'Gönderiyi Arşivle / Kaldır 🗑️',
          style: 'destructive',
          onPress: async () => {
            const currentToken = token || (await AsyncStorage.getItem('accessToken'));
            await fetch(`${API_URL}/admin/club/posts/${post.id}/archive`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${currentToken}` },
            });
            fetchClubPosts(currentToken);
          },
        },
        { text: 'Vazgeç', style: 'cancel' },
      ]
    );
  };

  const handleLikeToggle = async (post: ClubPost) => {
    const currentToken =
      token ||
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('token'));

    if (!currentToken) {
      Alert.alert('Giriş Yapın', 'Gönderileri beğenmek için lütfen giriş yapın.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/(tabs)/profile' as any) },
      ]);
      return;
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              isLiked: !p.isLiked,
              likeCount: p.isLiked ? Math.max(0, p.likeCount - 1) : p.likeCount + 1,
            }
          : p
      )
    );

    try {
      await fetch(`${API_URL}/club/posts/${post.id}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
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
        const rawComments = Array.isArray(data) ? data : data.items || data.comments || [];
        setComments(rawComments);
      }
    } catch (e) {
      console.error('Error fetching comments:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!newCommentText.trim() || !activePostForComments) return;
    const currentToken =
      token ||
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('token'));

    if (!currentToken) {
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
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newCommentText.trim() }),
      });

      if (res.ok) {
        const created = await res.json();
        setComments((prev) => [created, ...prev]);
        setNewCommentText('');
        setPosts((prev) =>
          prev.map((p) =>
            p.id === activePostForComments.id ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
          )
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Bilgi', errData.message || 'Yorum gönderilemedi, lütfen tekrar deneyin.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası oluştu.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string, postId: string) => {
    const currentToken =
      token ||
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('token'));

    if (!currentToken) {
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
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optionId }),
      });

      if (res.ok) {
        await fetchClubPosts(currentToken);
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
    if (selectedCategory === 'ANNOUNCEMENTS') return p.isPinned || p.author?.role === 'ADMIN';
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
          {userProfile?.profilePhotoUrl ? (
            <ExpoImage
              source={{ uri: resolvePostMediaUrl(userProfile.profilePhotoUrl) }}
              style={styles.navProfileAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Ionicons name="person-circle-outline" size={26} color="#0f172a" />
          )}
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
          {/* ADMIN MANAGEMENT HERO BAR (MATCHING WEB ⚙️ Club Yönetim Paneli) */}
          {isAdmin && (
            <View style={styles.adminHeroCard}>
              <View style={styles.adminHeroTop}>
                <View style={styles.adminGearCircle}>
                  <Ionicons name="settings" size={18} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.adminRoleRow}>
                    <Text style={styles.adminHeroTitle}>Club Yönetim Paneli</Text>
                    <View style={styles.adminTagBadge}>
                      <Text style={styles.adminTagBadgeText}>YÖNETİCİ</Text>
                    </View>
                  </View>
                  <Text style={styles.adminHeroSub}>
                    Duyuru, anket ve içerik yayınlama yetkisine sahipsiniz.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.adminHeroBtn}
                activeOpacity={0.8}
                onPress={() => setCreatePostModalVisible(true)}
              >
                <Ionicons name="add-circle" size={18} color="#ffffff" />
                <Text style={styles.adminHeroBtnText}>Yeni Gönderi & Duyuru Paylaş</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* COMMUNITY WELCOME CARD */}
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeContent}>
              <View style={styles.welcomeBadge}>
                <Ionicons name="sparkles" size={12} color="#ea580c" />
                <Text style={styles.welcomeBadgeText}>TOPLULUK</Text>
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
            filteredPosts.map((post, postIndex) => (
              <View key={post.id || `post-${postIndex}`} style={styles.postCard}>
                {/* Top Row: Pinned Tag & Admin Actions */}
                <View style={styles.postTopBar}>
                  {post.isPinned ? (
                    <View style={styles.pinnedRow}>
                      <Ionicons name="pin" size={13} color="#ea580c" />
                      <Text style={styles.pinnedText}>SABİTLENMİŞ DUYURU</Text>
                    </View>
                  ) : (
                    <View />
                  )}

                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.postAdminMenuBtn}
                      onPress={() => handleAdminPostAction(post)}
                    >
                      <Ionicons name="ellipsis-horizontal" size={18} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Author Info */}
                <View style={styles.authorRow}>
                  <View style={styles.authorAvatarWrap}>
                    {post.author?.profilePhotoUrl ? (
                      <ExpoImage
                        source={{ uri: resolvePostMediaUrl(post.author.profilePhotoUrl) }}
                        style={styles.authorAvatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>
                          {(post.author?.firstName?.[0] || post.author?.username?.[0] || 'T').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.authorMeta}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName}>
                        {post.author?.firstName
                          ? `${post.author.firstName} ${post.author.lastName || ''}`.trim()
                          : post.author?.username || 'TorqueScout Üyesi'}
                      </Text>
                      {post.author?.role === 'ADMIN' ? (
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
                      source={{ uri: resolvePostMediaUrl(post.media[0].mediaUrl) }}
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
                      {post.poll.options.map((opt, optIndex) => {
                        const optId = opt.id || `opt-${optIndex}`;
                        const isSelected = post.poll?.myVotedOptionId === opt.id;
                        const percentage =
                          post.poll && post.poll.totalVotes > 0
                            ? Math.round(((opt.voteCount || 0) / post.poll.totalVotes) * 100)
                            : 0;

                        return (
                          <TouchableOpacity
                            key={optId}
                            style={[styles.pollOptionItem, isSelected && styles.pollOptionSelected]}
                            onPress={() => handleVotePoll(post.poll!.id, opt.id || String(optIndex), post.id)}
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
                        👥 Toplam {post.poll.totalVotes || 0} oy kullanıldı
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

      {/* ADMIN CREATE POST MODAL */}
      <Modal
        visible={createPostModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreatePostModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.createPostModalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeaderBar}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="megaphone" size={20} color="#ea580c" />
                <Text style={styles.modalHeaderTitle}>Club Gönderisi & Duyuru Yayınla</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCreatePostModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: '80%' }}
              contentContainerStyle={{ padding: 18, gap: 14 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Post Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>BAŞLIK (OPSİYONEL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Yeni Topluluk Güncellemesi ve Etkinlikler"
                  placeholderTextColor="#94a3b8"
                  value={postTitle}
                  onChangeText={setPostTitle}
                />
              </View>

              {/* Post Content */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GÖNDERİ İÇERİĞİ *</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="Kulüp üyeleriyle paylaşmak istediğiniz duyuru, haber veya analiz içeriğini buraya yazın..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  value={postContent}
                  onChangeText={setPostContent}
                />
              </View>

              {/* Media URL */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GÖRSEL URL (OPSİYONEL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://... görsel bağlantısı"
                  placeholderTextColor="#94a3b8"
                  value={postMediaUrl}
                  onChangeText={setPostMediaUrl}
                />
              </View>

              {/* Switch Controls */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Sabitlenmiş Duyuru Yap 📌</Text>
                  <Text style={styles.switchSub}>Akışın en üstünde sabitlenmiş rozetle görünür.</Text>
                </View>
                <Switch
                  value={isPinned}
                  onValueChange={setIsPinned}
                  trackColor={{ false: '#e2e8f0', true: '#ea580c' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Yorumlara İzin Ver 💬</Text>
                  <Text style={styles.switchSub}>Kullanıcılar bu gönderiye yorum yazabilir.</Text>
                </View>
                <Switch
                  value={commentsEnabled}
                  onValueChange={setCommentsEnabled}
                  trackColor={{ false: '#e2e8f0', true: '#ea580c' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Anket Ekle 📊</Text>
                  <Text style={styles.switchSub}>Gönderiye interaktif oylama anketi bağlayın.</Text>
                </View>
                <Switch
                  value={hasPoll}
                  onValueChange={setHasPoll}
                  trackColor={{ false: '#e2e8f0', true: '#ea580c' }}
                />
              </View>

              {/* Poll Builder If Enabled */}
              {hasPoll && (
                <View style={styles.pollBuilderBox}>
                  <Text style={styles.pollBuilderHeading}>Anket Detayları</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Anket sorusu (Örn: Bir sonraki inceleme hangi segment olsun?)"
                    placeholderTextColor="#94a3b8"
                    value={pollQuestion}
                    onChangeText={setPollQuestion}
                  />

                  <Text style={[styles.inputLabel, { marginTop: 6 }]}>SEÇENEKLER</Text>
                  {pollOptions.map((opt, idx) => (
                    <View key={idx} style={styles.pollOptionInputRow}>
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder={`Seçenek ${idx + 1}`}
                        placeholderTextColor="#94a3b8"
                        value={opt}
                        onChangeText={(val) => handleUpdatePollOption(idx, val)}
                      />
                      {pollOptions.length > 2 && (
                        <TouchableOpacity
                          style={styles.removeOptionBtn}
                          onPress={() => handleRemovePollOption(idx)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {pollOptions.length < 6 && (
                    <TouchableOpacity style={styles.addOptionBtn} onPress={handleAddPollOption}>
                      <Ionicons name="add" size={16} color="#ea580c" />
                      <Text style={styles.addOptionBtnText}>+ Seçenek Ekle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitPostBtn, submittingPost && { opacity: 0.6 }]}
                disabled={submittingPost}
                onPress={handlePublishPost}
              >
                {submittingPost ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#ffffff" />
                    <Text style={styles.submitPostBtnText}>Gönderiyi Hemen Yayınla</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
            <View style={styles.modalHeaderBar}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="chatbubbles" size={18} color="#ea580c" />
                <Text style={styles.modalHeaderTitle}>
                  Yorumlar ({comments.length})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setActivePostForComments(null)}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {loadingComments ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color="#ea580c" />
                <Text style={styles.loadingText}>Yorumlar yükleniyor...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.commentsListScroll}
                contentContainerStyle={styles.commentsListContent}
                showsVerticalScrollIndicator={false}
              >
                {comments.length === 0 ? (
                  <View style={styles.emptyComments}>
                    <Text style={styles.emptyCommentsText}>İlk yorumu siz yazın!</Text>
                  </View>
                ) : (
                  comments.map((c, idx) => (
                    <View key={c.id || `c-${idx}`} style={styles.commentItem}>
                      <View style={styles.commentAvatarWrap}>
                        {c.author?.profilePhotoUrl ? (
                          <ExpoImage
                            source={{ uri: resolvePostMediaUrl(c.author.profilePhotoUrl) }}
                            style={styles.commentAvatar}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <View style={styles.commentAvatarPlaceholder}>
                            <Text style={styles.commentAvatarInitial}>
                              {(c.author?.displayName?.[0] || 'U').toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.commentBubble}>
                        <View style={styles.commentAuthorRow}>
                          <Text style={styles.commentAuthorName}>{c.author?.displayName || 'Üye'}</Text>
                          {c.author?.role === 'ADMIN' && (
                            <View style={styles.commentAdminBadge}>
                              <Text style={styles.commentAdminBadgeText}>YÖNETİCİ</Text>
                            </View>
                          )}
                          <Text style={styles.commentDate}>{formatTimeAgo(c.createdAt)}</Text>
                        </View>
                        <Text style={styles.commentText}>{c.content}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* Comment Input Bar */}
            <View style={styles.commentInputBar}>
              <TextInput
                style={styles.commentInput}
                placeholder="Fikrinizi veya tecrübenizi paylaşın..."
                placeholderTextColor="#94a3b8"
                value={newCommentText}
                onChangeText={setNewCommentText}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendCommentBtn,
                  !newCommentText.trim() && styles.sendCommentBtnDisabled,
                ]}
                disabled={!newCommentText.trim() || submittingComment}
                onPress={handleSendComment}
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
    paddingVertical: 12,
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
    width: 36,
    height: 36,
    borderRadius: 12,
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
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  clubAccentTitle: {
    color: '#ea580c',
  },
  clubSubTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  navProfileAvatar: {
    width: '100%',
    height: '100%',
  },
  filterScrollWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
  },
  filterContainer: {
    paddingHorizontal: 16,
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
    color: '#64748b',
    fontWeight: '600',
  },
  feedScrollContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 40,
  },
  adminHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    padding: 16,
    gap: 12,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  adminHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminGearCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminHeroTitle: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  adminTagBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminTagBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  adminHeroSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  adminHeroBtn: {
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  adminHeroBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  welcomeBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  welcomeContent: {
    gap: 6,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.3)',
  },
  welcomeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#fb923c',
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  welcomeSub: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 17,
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyFeedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
  },
  emptyFeedSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  postTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  pinnedText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  postAdminMenuBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  authorAvatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  authorMeta: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  adminBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  proBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#475569',
  },
  postDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  postContent: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
  },
  postMediaContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    height: 200,
    backgroundColor: '#f1f5f9',
  },
  postMediaImage: {
    width: '100%',
    height: '100%',
  },
  pollCardContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollQuestion: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  pollOptionsList: {
    gap: 6,
  },
  pollOptionItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pollOptionSelected: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  pollPercentageBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
  },
  pollOptionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  pollRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pollOptionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  pollOptionTextSelected: {
    color: '#ea580c',
    fontWeight: '800',
  },
  pollPercentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  pollFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  pollTotalVotesText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  pollVotedBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16a34a',
  },
  postActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
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
  createPostModalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  textAreaInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  pollBuilderBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
  },
  pollBuilderHeading: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  pollOptionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeOptionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  addOptionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  submitPostBtn: {
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitPostBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  commentModalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  commentsListScroll: {
    flex: 1,
  },
  commentsListContent: {
    padding: 16,
    gap: 12,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyCommentsText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
  },
  commentAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  commentAvatar: {
    width: '100%',
    height: '100%',
  },
  commentAvatarPlaceholder: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarInitial: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthorName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  commentAdminBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  commentAdminBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  commentDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginLeft: 'auto',
  },
  commentText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    maxHeight: 80,
  },
  sendCommentBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendCommentBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
