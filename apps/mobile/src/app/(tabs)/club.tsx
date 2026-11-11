import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  Pressable,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { createEdgeSwipeDismissHandlers } from '../../utils/backGesture';
import TorkScoutLoader from '../../components/TorkScoutLoader';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('ImagePicker could not be loaded:', e);
}

const API_URL = 'https://used-car-api-hzmu.onrender.com';
const CLUB_HEADER_LOGO = require('../../../assets/images/torkscout-club-header-logo.png');
const { width: windowWidth } = Dimensions.get('window');
const CARD_MEDIA_WIDTH = windowWidth - 60;

function ScoutRgbWelcomeBanner() {
  const [boxSize, setBoxSize] = useState({ width: windowWidth - 28, height: 124 });
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const start = Date.now();
    let frameId: number;

    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const nextAngle = ((elapsed / 2.8) * Math.PI * 2) % (Math.PI * 2);
      setAngle(nextAngle);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const x1 = `${(50 + 50 * Math.cos(angle)).toFixed(1)}%`;
  const y1 = `${(50 + 50 * Math.sin(angle)).toFixed(1)}%`;
  const x2 = `${(50 - 50 * Math.cos(angle)).toFixed(1)}%`;
  const y2 = `${(50 - 50 * Math.sin(angle)).toFixed(1)}%`;

  const perimeter = Math.max(400, 2 * (boxSize.width + boxSize.height));
  const dashLength = Math.round(perimeter * 0.36);
  const gapLength = Math.round(perimeter - dashLength);
  const dashOffset = -Math.round((angle / (Math.PI * 2)) * perimeter);

  return (
    <View
      style={styles.welcomeBannerOuter}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setBoxSize({ width, height });
        }
      }}
    >
      <Svg
        width={boxSize.width}
        height={boxSize.height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="scout-rgb-orbit" x1={x1} y1={y1} x2={x2} y2={y2}>
            <Stop offset="0%" stopColor="#0052d4" />
            <Stop offset="25%" stopColor="#0284c7" />
            <Stop offset="50%" stopColor="#00d2ff" />
            <Stop offset="75%" stopColor="#14b8a6" />
            <Stop offset="100%" stopColor="#10b981" />
          </LinearGradient>
          <LinearGradient id="scout-rgb-comet" x1={x2} y1={y2} x2={x1} y2={y1}>
            <Stop offset="0%" stopColor="#00f2fe" />
            <Stop offset="50%" stopColor="#2dd4bf" />
            <Stop offset="100%" stopColor="#38bdf8" />
          </LinearGradient>
        </Defs>

        <Rect
          x={1.25}
          y={1.25}
          width={Math.max(10, boxSize.width - 2.5)}
          height={Math.max(10, boxSize.height - 2.5)}
          rx={19}
          ry={19}
          fill="#ffffff"
          stroke="url(#scout-rgb-orbit)"
          strokeWidth={2}
          opacity={0.75}
        />

        <Rect
          x={1.25}
          y={1.25}
          width={Math.max(10, boxSize.width - 2.5)}
          height={Math.max(10, boxSize.height - 2.5)}
          rx={19}
          ry={19}
          fill="none"
          stroke="url(#scout-rgb-comet)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${dashLength} ${gapLength}`}
          strokeDashoffset={dashOffset}
        />
      </Svg>

      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeTitle}>Kulübe Hoş Geldiniz!</Text>
          <Text style={styles.welcomeSub}>
            Araç sahipleriyle tecrübe paylaşın, anketlere katılın ve özel duyurulardan anında haberdar olun.
          </Text>
        </View>
      </View>
    </View>
  );
}

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
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
  isUserSubmission?: boolean;
  rejectionReason?: string | null;
  isPinned: boolean;
  publishedAt: string;
  createdAt?: string;
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
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [activeMediaIndices, setActiveMediaIndices] = useState<Record<string, number>>({});
  const [lightboxPostId, setLightboxPostId] = useState<string | null>(null);
  const [lightboxMediaIndex, setLightboxMediaIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'POLLS' | 'GARAGE'>('ALL');
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    id?: string;
    profilePhotoUrl?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  } | null>(null);

  // Garage State
  const [garageItems, setGarageItems] = useState<ClubPost[]>([]);
  const [loadingGarage, setLoadingGarage] = useState(false);
  const [garagePhotos, setGaragePhotos] = useState<string[]>([]);
  const [garageTitle, setGarageTitle] = useState('');
  const [garageCaption, setGarageCaption] = useState('');
  const [shareInClub, setShareInClub] = useState(true);
  const [submittingGarage, setSubmittingGarage] = useState(false);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);

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
        fetchMyGarage(storedToken);
        await fetchClubPosts(storedToken);
      } else {
        setUserProfile(null);
        setGarageItems([]);
        setLoading(false);
      }
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

  const fetchMyGarage = async (authToken?: string | null) => {
    const activeToken = authToken ?? token;
    if (!activeToken) return;
    setLoadingGarage(true);
    try {
      const res = await fetch(`${API_URL}/club/garage`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setGarageItems(items);
      }
    } catch (e) {
      console.warn('Error fetching garage:', e);
    } finally {
      setLoadingGarage(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClubPosts(token);
    if (token) {
      fetchMyGarage(token);
    }
  };

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPER_ADMIN';

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // GARAGE IMAGE PICKER & SUBMISSION
  const handlePickGaragePhotos = async () => {
    try {
      if (!ImagePicker) {
        Alert.alert('Hata', 'Fotoğraf seçici modülü yüklenemedi.');
        return;
      }
      if (garagePhotos.length >= 5) {
        Alert.alert('Limit Doldu', 'Garajınıza en fazla 5 adet araç görseli ekleyebilirsiniz.');
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Araç görsellerinizi yüklemek için galeri erişim izni vermelisiniz.');
        return;
      }

      const remainingSlots = 5 - garagePhotos.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.82,
      });

      if (!result.canceled && result.assets) {
        const pickedUris = result.assets.map((a: any) => a.uri).filter(Boolean);
        setGaragePhotos((prev) => [...prev, ...pickedUris].slice(0, 5));
      }
    } catch (e) {
      console.error('Garage photo pick error:', e);
      Alert.alert('Hata', 'Fotoğraflar seçilirken bir hata oluştu.');
    }
  };

  const handleRemoveGaragePhoto = (index: number) => {
    setGaragePhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const uploadSinglePhotoToClub = async (uri: string, authToken: string): Promise<string> => {
    if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
      return uri;
    }
    const formData = new FormData();
    const filename = uri.split('/').pop() || `garage-${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri,
      name: filename,
      type,
    } as any);

    const res = await fetch(`${API_URL}/club/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Görsel yüklenemedi.');
    }
    const data = await res.json();
    if (!data?.url) {
      throw new Error('Görsel bağlantısı alınamadı.');
    }
    return data.url;
  };

  const handleSubmitGarage = async () => {
    const currentToken =
      token ||
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('token'));

    if (!currentToken) {
      Alert.alert('Giriş Yapın', 'Garajınıza araç eklemek ve Club\'da paylaşmak için lütfen giriş yapın.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/(tabs)/profile' as any) },
      ]);
      return;
    }

    if (garagePhotos.length === 0) {
      Alert.alert('Görsel Seçin', 'Lütfen aracınıza ait en az 1 görsel (en fazla 5 görsel) seçin.');
      return;
    }

    if (shareInClub && !garageCaption.trim() && !garageTitle.trim()) {
      Alert.alert(
        'Açıklama Ekleyin',
        "Club'da paylaşmak için lütfen aracınız hakkında kısa bir açıklama veya model başlığı yazın."
      );
      return;
    }

    setSubmittingGarage(true);
    try {
      const uploadedUrls: string[] = [];
      for (const localUri of garagePhotos.slice(0, 5)) {
        const remoteUrl = await uploadSinglePhotoToClub(localUri, currentToken);
        uploadedUrls.push(remoteUrl);
      }

      const res = await fetch(`${API_URL}/club/garage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: garageTitle.trim() || undefined,
          content: garageCaption.trim(),
          mediaUrls: uploadedUrls,
          shareInClub,
        }),
      });

      if (res.ok) {
        setGaragePhotos([]);
        setGarageTitle('');
        setGarageCaption('');
        await fetchMyGarage(currentToken);
        if (shareInClub) {
          Alert.alert(
            'Onaya Gönderildi 🎉',
            'Aracınızın görselleri ve açıklaması yönetici onayına gönderildi. İlan kontrolünden geçtikten sonra TorkScout Club "Tümü" akışında yayınlanacaktır.'
          );
        } else {
          Alert.alert(
            'Garajınıza Kaydedildi 🚗',
            'Aracınızın görselleri Garajınıza eklendi. Dilediğiniz zaman "Club\'da Paylaş" butonuyla topluluk akışında paylaşabilirsiniz.'
          );
        }
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Bilgi', err.message || 'Gönderi kaydedilemedi.');
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Görseller yüklenirken bağlantı hatası oluştu.');
    } finally {
      setSubmittingGarage(false);
    }
  };

  const handleShareSavedGarageItem = async (item: ClubPost) => {
    const currentToken =
      token ||
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('token'));
    if (!currentToken) return;

    setSharingPostId(item.id);
    try {
      const res = await fetch(`${API_URL}/club/garage/${item.id}/share`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: item.title || undefined,
          content: item.content || '',
        }),
      });

      if (res.ok) {
        await fetchMyGarage(currentToken);
        Alert.alert(
          'Onaya Gönderildi 🎉',
          'Garajınızdaki araç paylaşımı yönetici onayına gönderildi. Onaylandığında "Tümü" sekmesinde yayınlanacaktır.'
        );
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Bilgi', err.message || 'Paylaşım onaya gönderilemedi.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Bağlantı hatası oluştu.');
    } finally {
      setSharingPostId(null);
    }
  };

  const handleDeleteGarageItem = (item: ClubPost) => {
    Alert.alert(
      'Garajdan Kaldır',
      'Bu araç paylaşımını garajınızdan ve kulüp akışından kaldırmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const currentToken =
              token ||
              (await AsyncStorage.getItem('accessToken')) ||
              (await AsyncStorage.getItem('token'));
            if (!currentToken) return;
            try {
              const res = await fetch(`${API_URL}/club/garage/${item.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${currentToken}` },
              });
              if (res.ok) {
                await fetchMyGarage(currentToken);
                await fetchClubPosts(currentToken);
              }
            } catch (e) {
              Alert.alert('Hata', 'Silme işlemi başarısız oldu.');
            }
          },
        },
      ]
    );
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
    const currentToken =
      token ||
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('token'));

    if (!currentToken) {
      Alert.alert('Giriş Yapın', 'Yorumları görüntülemek ve yorum yapmak için lütfen giriş yapın.', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Giriş Yap',
          onPress: () => {
            setLightboxPostId(null);
            router.push('/(tabs)/profile' as any);
          },
        },
      ]);
      return;
    }

    if (lightboxPostId) {
      setLightboxPostId(null);
    }

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
        body: JSON.stringify({ optionIds: [optionId], optionId }),
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
    const currentToken =
      token ||
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('token'));

    if (!currentToken) {
      Alert.alert('Giriş Yapın', 'Gönderileri paylaşmak için lütfen giriş yapın.', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Giriş Yap',
          onPress: () => {
            setLightboxPostId(null);
            router.push('/(tabs)/profile' as any);
          },
        },
      ]);
      return;
    }

    try {
      await Share.share({
        message: `${post.title ? post.title + '\n' : ''}${post.content}\n\nTorqueScout Club ile paylaşıldı: https://torquescout.com/club`,
      });
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  const activeLightboxPost =
    posts.find((p) => p.id === lightboxPostId) ||
    garageItems.find((g) => g.id === lightboxPostId) ||
    null;

  const filteredPosts = posts.filter((p) => {
    if (selectedCategory === 'POLLS') return !!p.poll;
    return true;
  });

  const renderMediaCarousel = (post: ClubPost, allowLightbox: boolean = true) => {
    const mediaList = Array.isArray(post.media) ? post.media : [];
    if (mediaList.length === 0) return null;

    const currentIdx = activeMediaIndices[post.id] || 0;

    if (mediaList.length === 1) {
      return (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => {
            if (allowLightbox) {
              setLightboxMediaIndex(0);
              setLightboxPostId(post.id);
            }
          }}
          style={styles.postMediaContainer}
        >
          <ExpoImage
            source={{ uri: resolvePostMediaUrl(mediaList[0].mediaUrl) }}
            style={styles.postMediaImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.carouselWrapper}>
        <View style={styles.postMediaContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const width = e.nativeEvent.layoutMeasurement.width || CARD_MEDIA_WIDTH;
              const nextIndex = Math.round(offsetX / width);
              setActiveMediaIndices((prev) => ({ ...prev, [post.id]: nextIndex }));
            }}
          >
            {mediaList.map((m, idx) => (
              <TouchableOpacity
                key={m.id || idx}
                activeOpacity={0.94}
                onPress={() => {
                  if (allowLightbox) {
                    setLightboxMediaIndex(idx);
                    setLightboxPostId(post.id);
                  }
                }}
                style={{ width: CARD_MEDIA_WIDTH, height: 235 }}
              >
                <ExpoImage
                  source={{ uri: resolvePostMediaUrl(m.mediaUrl) }}
                  style={styles.postMediaImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.carouselCounterPill}>
            <Ionicons name="images-outline" size={11} color="#ffffff" />
            <Text style={styles.carouselCounterText}>
              {Math.min(currentIdx + 1, mediaList.length)}/{mediaList.length}
            </Text>
          </View>
        </View>

        <View style={styles.carouselDotsRow}>
          {mediaList.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.carouselDot,
                idx === currentIdx && styles.carouselDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* TOP CLUB NAVBAR */}
      <View style={styles.topNavbar}>
        <View style={styles.navLeft}>
          <View style={{ alignItems: 'flex-start' }}>
            <Image
              source={CLUB_HEADER_LOGO}
              style={{ width: 185, height: 24, marginLeft: -2 }}
              resizeMode="contain"
            />
            <Text style={[styles.clubSubTitle, { marginTop: 3 }]}>Otomobil Tutkunları Topluluğu</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.navigate('/(tabs)/profile' as any)}
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

      {/* GUEST LANDING SCREEN WHEN NOT LOGGED IN */}
      {!loading && !token ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Üst Başlık (Hero Alanı) */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: '#fed7aa',
              alignItems: 'center',
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#fff7ed',
                borderWidth: 1,
                borderColor: '#fdba74',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons name="shield-checkmark" size={28} color="#ea580c" />
            </View>
            <Text
              style={{
                fontSize: 21,
                fontWeight: '900',
                color: '#0f172a',
                textAlign: 'center',
                letterSpacing: -0.4,
              }}
            >
              Tork Scout Club’a Katılın
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: '#475569',
                textAlign: 'center',
                lineHeight: 20,
                marginTop: 8,
                fontWeight: '500',
              }}
            >
              Otomobil ve motosiklet tutkunlarının bir araya geldiği, gerçek kullanıcı deneyimlerinin paylaşıldığı ve araç sahiplerinin nabzının tutulduğu özel kulüp alanı.
            </Text>
          </View>

          {/* 2. Club'da Sizi Neler Bekliyor? (4 Ana Fayda Kartı) */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '900',
                color: '#0f172a',
                paddingHorizontal: 4,
              }}
            >
              Club’da Sizi Neler Bekliyor?
            </Text>

            {[
              {
                emoji: '🚗',
                title: 'Garajım & Araç Vitrini',
                desc: 'Kendi aracınızın fotoğraflarını ve hikayesini kişisel garajınıza ekleyin, dilerseniz kulüp akışında paylaşarak diğer üyelerin beğenisine ve yorumlarına sunun.',
                bg: '#fff7ed',
                border: '#fed7aa',
              },
              {
                emoji: '📊',
                title: 'Topluluk Anketleri & Piyasa Nabzı',
                desc: 'Hangi model daha sorunsuz? Hangi motor/şanzıman kombinasyonu tercih edilmeli? Topluluk anketlerine oy verin, binlerce araç sahibinin gerçek tercihlerini anlık görün.',
                bg: '#eff6ff',
                border: '#bfdbfe',
              },
              {
                emoji: '💬',
                title: 'Gerçek Kullanıcı Deneyimleri & Yorumlar',
                desc: 'Kronik sorunlar, bakım maliyetleri, yakıt tüketimi ve ustalık tecrübeleri hakkında doğrudan araç sahipleriyle fikir alışverişi yapın, gönderilere yorum bırakın.',
                bg: '#f0fdf4',
                border: '#bbf7d0',
              },
              {
                emoji: '📌',
                title: 'Özel Duyurular, İncelemeler & Kulüp Gündemi',
                desc: 'Tork Scout ekibinin hazırladığı özel piyasa analizlerine, sabitlenmiş rehber içeriklere ve yeni özellik duyurularına ilk siz ulaşın.',
                bg: '#faf5ff',
                border: '#e9d5ff',
              },
            ].map((item, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 15,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: item.bg,
                    borderWidth: 1,
                    borderColor: item.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: '#0f172a',
                      marginBottom: 4,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      lineHeight: 18,
                    }}
                  >
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* 3. Alt Aksiyon Alanı (CTA Butonları) */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              gap: 10,
              marginTop: 4,
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: '#ea580c',
                borderRadius: 14,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#ea580c',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
              activeOpacity={0.85}
              onPress={() => router.push('/login' as any)}
            >
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '900' }}>
                Giriş Yap ve Kulübe Katıl
              </Text>
              <Ionicons name="arrow-forward" size={17} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#fff7ed',
                borderRadius: 14,
                paddingVertical: 13,
                borderWidth: 1,
                borderColor: '#fdba74',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.85}
              onPress={() => router.push('/register' as any)}
            >
              <Text style={{ color: '#ea580c', fontSize: 13.5, fontWeight: '800' }}>
                Ücretsiz Hesap Oluştur
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 11,
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 16,
                marginTop: 4,
              }}
            >
              Tork Scout Club üyeliği tamamen ücretsizdir. Hesabınızla giriş yaparak tüm paylaşımlara, anketlere ve Garajım özelliğine anında erişebilirsiniz.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <>
          {/* CATEGORY FILTER PILLS (LEFT: TÜMÜ & ANKETLER — RIGHT: GARAJIM) */}
          <View style={styles.filterScrollWrapper}>
            <View style={styles.filterBarRow}>
              <View style={styles.filterLeftGroup}>
                {[
                  { key: 'ALL', label: '🔥 Tümü' },
                  { key: 'POLLS', label: '📊 Anketler' },
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
              </View>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  styles.garagePill,
                  selectedCategory === 'GARAGE' && styles.filterPillActive,
                ]}
                onPress={() => {
                  setSelectedCategory('GARAGE');
                  if (token) {
                    fetchMyGarage(token);
                  }
                }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedCategory === 'GARAGE' && styles.filterPillTextActive,
                  ]}
                >
                  🚗 Garajım
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FEED OR GARAGE CONTENT */}
          {loading ? (
        <View style={styles.centerLoading}>
          <TorkScoutLoader />
          <Text style={styles.loadingText}>Kulüp akışı yükleniyor...</Text>
        </View>
      ) : selectedCategory === 'GARAGE' ? (
        <ScrollView
          contentContainerStyle={styles.feedScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        >
          {/* ANTI-LISTING WARNING BANNER */}
          <View style={styles.garageWarningCard}>
            <View style={styles.garageWarningHeader}>
              <Ionicons name="warning" size={18} color="#dc2626" />
              <Text style={styles.garageWarningTitle}>Önemli Topluluk & Paylaşım Kuralı</Text>
            </View>
            <Text style={styles.garageWarningText}>
              Yüklediğiniz araç görsellerini <Text style={{ fontWeight: '800' }}>satış ilanı olarak veya ilan gibi</Text> (fiyat, telefon numarası, satılık ibaresi vb. ekleyerek) paylaşmak kesinlikle yasaktır. İlan niteliği tespit edilen gönderiler yayınlanmaz ve bu durumun birkaç kez tespit edilmesi halinde hesabınız <Text style={{ fontWeight: '800' }}>TorkScout Club&apos;dan çıkarılır.</Text>
            </Text>
          </View>

          {!token ? (
            <View style={styles.garageAuthPromptCard}>
              <View style={styles.garageAuthIconCircle}>
                <Ionicons name="car-sport" size={28} color="#ea580c" />
              </View>
              <Text style={styles.garageAuthTitle}>Kendi Garajınızı Oluşturun</Text>
              <Text style={styles.garageAuthSub}>
                Aracınızın en güzel fotoğraflarını (en fazla 5 adet) yüklemek ve TorkScout Club akışında paylaşmak için lütfen giriş yapın.
              </Text>
              <TouchableOpacity
                style={styles.garageAuthBtn}
                onPress={() => router.push('/(tabs)/profile' as any)}
              >
                <Text style={styles.garageAuthBtnText}>Giriş Yap / Üye Ol</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* GARAGE UPLOAD & SHARE COMPOSER CARD */}
              <View style={styles.garageComposerCard}>
                <View style={styles.garageComposerHeader}>
                  <View style={styles.garageComposerIconBox}>
                    <Ionicons name="camera" size={18} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.garageComposerTitle}>Aracını Garajına Ekle & Paylaş</Text>
                    <Text style={styles.garageComposerSub}>
                      En fazla 5 adet fotoğraf seçip açıklamanızla birlikte Club akışında paylaşabilirsiniz.
                    </Text>
                  </View>
                </View>

                {/* Photo Slots (1..5) */}
                <View style={styles.garagePhotoSection}>
                  <View style={styles.garagePhotoHeaderRow}>
                    <Text style={styles.inputLabel}>ARAÇ GÖRSELLERİ ({garagePhotos.length}/5)</Text>
                    {garagePhotos.length < 5 && (
                      <TouchableOpacity onPress={handlePickGaragePhotos}>
                        <Text style={styles.garageAddPhotoLink}>+ Fotoğraf Seç</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.garagePhotoStrip}
                  >
                    {garagePhotos.map((uri, idx) => (
                      <View key={`${uri}-${idx}`} style={styles.garageThumbBox}>
                        <ExpoImage
                          source={{ uri }}
                          style={styles.garageThumbImage}
                          contentFit="cover"
                        />
                        <View style={styles.garageThumbBadge}>
                          <Text style={styles.garageThumbBadgeText}>{idx + 1}/5</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.garageThumbRemoveBtn}
                          onPress={() => handleRemoveGaragePhoto(idx)}
                        >
                          <Ionicons name="close" size={13} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {garagePhotos.length < 5 && (
                      <TouchableOpacity
                        style={styles.garageAddPhotoSlot}
                        onPress={handlePickGaragePhotos}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="images-outline" size={24} color="#ea580c" />
                        <Text style={styles.garageAddPhotoSlotTitle}>Görsel Yükle</Text>
                        <Text style={styles.garageAddPhotoSlotSub}>
                          {5 - garagePhotos.length} hak kaldı
                        </Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                </View>

                {/* Vehicle Model / Title */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ARAÇ / MODEL BAŞLIĞI (OPSİYONEL)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Örn: 2021 BMW 320i M Sport / Hafta Sonu Kurulumu"
                    placeholderTextColor="#94a3b8"
                    value={garageTitle}
                    onChangeText={setGarageTitle}
                  />
                </View>

                {/* Instagram Post Style Caption */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>GÖNDERİ AÇIKLAMASI *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    placeholder="Aracınızla ilgili hikayenizi, sürüş deneyiminizi veya yaptığınız dokunuşları paylaşın (İlan / fiyat bilgisi yazmayınız)..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    value={garageCaption}
                    onChangeText={setGarageCaption}
                  />
                </View>

                {/* Club'da Paylaş Toggle */}
                <View style={styles.garageShareSwitchBox}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.switchTitle}>Club&apos;da Paylaş 🌍</Text>
                    <Text style={styles.switchSub}>
                      Açık olduğunda gönderiniz yönetici onayından sonra &quot;Tümü&quot; sekmesi altında Instagram gönderisi gibi tüm kulüp üyeleriyle paylaşılır.
                    </Text>
                  </View>
                  <Switch
                    value={shareInClub}
                    onValueChange={setShareInClub}
                    trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                    thumbColor="#ffffff"
                    ios_backgroundColor="#cbd5e1"
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitPostBtn, submittingGarage && { opacity: 0.65 }]}
                  disabled={submittingGarage}
                  onPress={handleSubmitGarage}
                >
                  {submittingGarage ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons
                        name={shareInClub ? 'paper-plane' : 'bookmark'}
                        size={16}
                        color="#ffffff"
                      />
                      <Text style={styles.submitPostBtnText}>
                        {shareInClub ? "Garaja Ekle & Club'da Paylaş" : 'Sadece Garajıma Kaydet'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* MY GARAGE ITEMS LIST */}
              <View style={styles.myGarageSectionHeader}>
                <Text style={styles.myGarageSectionTitle}>Garajım & Paylaşımlarım ({garageItems.length})</Text>
              </View>

              {loadingGarage ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator color="#ea580c" />
                </View>
              ) : garageItems.length === 0 ? (
                <View style={styles.emptyFeed}>
                  <Ionicons name="car-sport-outline" size={44} color="#94a3b8" />
                  <Text style={styles.emptyFeedTitle}>Garajınızda henüz araç görseli yok</Text>
                  <Text style={styles.emptyFeedSub}>
                    Yukarıdaki alandan aracınızın fotoğraflarını yükleyip TorkScout Club&apos;da paylaşabilirsiniz.
                  </Text>
                </View>
              ) : (
                garageItems.map((item) => {
                  const isPublished = item.status === 'PUBLISHED';
                  const isPending = item.status === 'PENDING_REVIEW';
                  const isRejected = item.status === 'REJECTED';

                  return (
                    <View key={item.id} style={styles.postCard}>
                      <View style={styles.postTopBar}>
                        <View
                          style={[
                            styles.garageStatusBadge,
                            isPublished
                              ? styles.garageStatusPublished
                              : isPending
                              ? styles.garageStatusPending
                              : isRejected
                              ? styles.garageStatusRejected
                              : styles.garageStatusDraft,
                          ]}
                        >
                          <Text
                            style={[
                              styles.garageStatusBadgeText,
                              isPublished
                                ? { color: '#15803d' }
                                : isPending
                                ? { color: '#b45309' }
                                : isRejected
                                ? { color: '#b91c1c' }
                                : { color: '#475569' },
                            ]}
                          >
                            {isPublished
                              ? "✅ CLUB'DA YAYINDA"
                              : isPending
                              ? '⏳ YÖNETİCİ ONAYI BEKLİYOR'
                              : isRejected
                              ? '❌ REDDEDİLDİ'
                              : '🔒 SADECE GARAJIMDA'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.postAdminMenuBtn}
                          onPress={() => handleDeleteGarageItem(item)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>

                      {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}
                      {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}

                      {item.rejectionReason ? (
                        <View style={styles.rejectionReasonBox}>
                          <Text style={styles.rejectionReasonLabel}>Reddedilme Gerekçesi:</Text>
                          <Text style={styles.rejectionReasonText}>{item.rejectionReason}</Text>
                        </View>
                      ) : null}

                      {renderMediaCarousel(item, true)}

                      {(!isPublished && !isPending) && (
                        <TouchableOpacity
                          style={styles.shareToClubSecondaryBtn}
                          disabled={sharingPostId === item.id}
                          onPress={() => handleShareSavedGarageItem(item)}
                        >
                          {sharingPostId === item.id ? (
                            <ActivityIndicator size="small" color="#ea580c" />
                          ) : (
                            <>
                              <Ionicons name="paper-plane-outline" size={15} color="#ea580c" />
                              <Text style={styles.shareToClubSecondaryBtnText}>
                                Club&apos;da Paylaş (Onaya Gönder)
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
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
          <ScoutRgbWelcomeBanner />

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
                {/* Top Row: Pinned Tag / User Garage Tag & Admin Actions */}
                <View style={styles.postTopBar}>
                  {post.isPinned ? (
                    <View style={styles.pinnedRow}>
                      <Ionicons name="pin" size={13} color="#ea580c" />
                      <Text style={styles.pinnedText}>SABİTLENMİŞ DUYURU</Text>
                    </View>
                  ) : post.isUserSubmission ? (
                    <View style={styles.userGarageFeedBadge}>
                      <Ionicons name="car-sport" size={12} color="#0284c7" />
                      <Text style={styles.userGarageFeedBadgeText}>ÜYE GARAJI PAYLAŞIMI</Text>
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
                      {post.author?.role === 'ADMIN' || post.author?.role === 'SUPER_ADMIN' ? (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>YÖNETİCİ</Text>
                        </View>
                      ) : (
                        <View style={styles.proBadge}>
                          <Text style={styles.proBadgeText}>CLUB ÜYESİ</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postDate}>{formatTimeAgo(post.publishedAt || post.createdAt)}</Text>
                  </View>
                </View>

                {/* Title & Body */}
                {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
                {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}

                {/* Post Media (Single or Multi-Photo Instagram Carousel) */}
                {renderMediaCarousel(post, true)}

                {/* Interactive Poll Component */}
                {post.poll && (
                  <View style={styles.pollCardContainer}>
                    <View style={styles.pollHeader}>
                      <Ionicons name="bar-chart" size={16} color="#ea580c" />
                      <Text style={styles.pollQuestion}>{post.poll.question}</Text>
                    </View>

                    <View style={styles.pollOptionsList}>
                      {post.poll.options.map((opt, optIndex) => {
                        const optId = (opt as any).optionId || opt.id || `opt-${optIndex}`;
                        const isSelected =
                          (opt as any).selectedByCurrentUser || post.poll?.myVotedOptionId === optId;
                        const percentage =
                          typeof (opt as any).percentage === 'number'
                            ? (opt as any).percentage
                            : post.poll && post.poll.totalVotes > 0
                            ? Math.round(((opt.voteCount || 0) / post.poll.totalVotes) * 100)
                            : 0;

                        return (
                          <TouchableOpacity
                            key={optId}
                            style={[styles.pollOptionItem, isSelected && styles.pollOptionSelected]}
                            onPress={() =>
                              handleVotePoll(
                                (post.poll as any).pollId || post.poll!.id,
                                optId,
                                post.id
                              )
                            }
                            disabled={votingPollIds[(post.poll as any).pollId || post.poll!.id]}
                          >
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
                        👥 Toplam {(post.poll as any).participantCount ?? post.poll.totalVotes ?? 0} oy kullanıldı
                      </Text>
                      {(post.poll.myVotedOptionId || (post.poll as any).currentUserVote) && (
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
        </>
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
          {...createEdgeSwipeDismissHandlers(() => setCreatePostModalVisible(false))}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCreatePostModalVisible(false)}
          />
          <View
            style={[
              styles.createPostModalSheet,
              { paddingBottom: Math.max(insets.bottom + 14, 24) },
            ]}
          >
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
              style={{ maxHeight: '82%' }}
              contentContainerStyle={{
                padding: 18,
                paddingBottom: Math.max(insets.bottom + 24, 36),
                gap: 14,
              }}
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

              {/* Switch Controls with High-Contrast Off-State Track */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Sabitlenmiş Duyuru Yap 📌</Text>
                  <Text style={styles.switchSub}>Akışın en üstünde sabitlenmiş rozetle görünür.</Text>
                </View>
                <Switch
                  value={isPinned}
                  onValueChange={setIsPinned}
                  trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#cbd5e1"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Yorumlara İzin Ver 💬</Text>
                  <Text style={styles.switchSub}>Kullanıcılar bu gönderiye yorum yazabilir.</Text>
                </View>
                <Switch
                  value={commentsEnabled}
                  onValueChange={setCommentsEnabled}
                  trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#cbd5e1"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Anket Ekle 📊</Text>
                  <Text style={styles.switchSub}>Gönderiye interaktif oylama anketi bağlayın.</Text>
                </View>
                <Switch
                  value={hasPoll}
                  onValueChange={setHasPoll}
                  trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#cbd5e1"
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
          {...createEdgeSwipeDismissHandlers(() => setActivePostForComments(null))}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActivePostForComments(null)}
          />
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
                <TorkScoutLoader size="small" />
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
            <View
              style={[
                styles.commentInputBar,
                { paddingBottom: Math.max(insets.bottom + 8, 12) },
              ]}
            >
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

      {/* POST PHOTO LIGHTBOX BANNER MODAL WITH MULTI-PHOTO SWIPE & ACTIVE LIKE / COMMENT / SHARE BAR */}
      <Modal
        visible={!!activeLightboxPost}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLightboxPostId(null)}
      >
        <View
          style={[
            styles.lightboxBackdrop,
            { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 24) },
          ]}
          {...createEdgeSwipeDismissHandlers(() => setLightboxPostId(null))}
        >
          {/* Top Bar */}
          <View style={styles.lightboxTopBar}>
            <View style={styles.lightboxAuthorRow}>
              <View style={styles.authorAvatarWrap}>
                {activeLightboxPost?.author?.profilePhotoUrl ? (
                  <ExpoImage
                    source={{ uri: resolvePostMediaUrl(activeLightboxPost.author.profilePhotoUrl) }}
                    style={styles.authorAvatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {(
                        activeLightboxPost?.author?.firstName?.[0] ||
                        activeLightboxPost?.author?.username?.[0] ||
                        'T'
                      ).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lightboxAuthorName} numberOfLines={1}>
                  {activeLightboxPost?.author?.firstName
                    ? `${activeLightboxPost.author.firstName} ${activeLightboxPost.author.lastName || ''}`.trim()
                    : activeLightboxPost?.author?.username || 'TorqueScout Üyesi'}
                </Text>
                <Text style={styles.lightboxPostDate}>
                  {activeLightboxPost
                    ? formatTimeAgo(activeLightboxPost.publishedAt || activeLightboxPost.createdAt)
                    : ''}
                </Text>
              </View>
            </View>

            {activeLightboxPost && activeLightboxPost.media && activeLightboxPost.media.length > 1 && (
              <View style={[styles.carouselCounterPill, { position: 'relative', top: 0, right: 0, marginRight: 10 }]}>
                <Text style={styles.carouselCounterText}>
                  {Math.min(lightboxMediaIndex + 1, activeLightboxPost.media.length)}/{activeLightboxPost.media.length}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setLightboxPostId(null)}
            >
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Enlarged Uncropped Banner Image(s) */}
          <View style={styles.lightboxImageStage}>
            {activeLightboxPost?.media && activeLightboxPost.media.length > 1 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: lightboxMediaIndex * windowWidth, y: 0 }}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
                  setLightboxMediaIndex(idx);
                }}
              >
                {activeLightboxPost.media.map((m, idx) => (
                  <Pressable
                    key={m.id || idx}
                    style={{ width: windowWidth, height: '100%', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setLightboxPostId(null)}
                  >
                    <ExpoImage
                      source={{ uri: resolvePostMediaUrl(m.mediaUrl) }}
                      style={styles.lightboxFullImage}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Pressable
                style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                onPress={() => setLightboxPostId(null)}
              >
                {activeLightboxPost?.media?.[0]?.mediaUrl && (
                  <ExpoImage
                    source={{ uri: resolvePostMediaUrl(activeLightboxPost.media[0].mediaUrl) }}
                    style={styles.lightboxFullImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                )}
              </Pressable>
            )}
          </View>

          {/* Bottom Caption & Active Like / Comment / Share Buttons */}
          {activeLightboxPost && (
            <View
              style={[
                styles.lightboxFooterCard,
                { paddingBottom: Math.max(insets.bottom + 12, 20) },
              ]}
            >
              {activeLightboxPost.title ? (
                <Text style={styles.lightboxTitle} numberOfLines={2}>
                  {activeLightboxPost.title}
                </Text>
              ) : null}
              {activeLightboxPost.content ? (
                <Text style={styles.lightboxCaption} numberOfLines={3}>
                  {activeLightboxPost.content}
                </Text>
              ) : null}

              <View style={styles.lightboxActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.lightboxActionBtn,
                    activeLightboxPost.isLiked && styles.lightboxActionBtnLiked,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleLikeToggle(activeLightboxPost)}
                >
                  <Ionicons
                    name={activeLightboxPost.isLiked ? 'heart' : 'heart-outline'}
                    size={19}
                    color={activeLightboxPost.isLiked ? '#ef4444' : '#ffffff'}
                  />
                  <Text
                    style={[
                      styles.lightboxActionText,
                      activeLightboxPost.isLiked && styles.lightboxActionTextLiked,
                    ]}
                  >
                    {activeLightboxPost.likeCount || 0} Beğeni
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.lightboxActionBtn}
                  activeOpacity={0.85}
                  onPress={() => handleOpenComments(activeLightboxPost)}
                >
                  <Ionicons name="chatbubble-outline" size={18} color="#ffffff" />
                  <Text style={styles.lightboxActionText}>
                    {activeLightboxPost.commentCount || 0} Yorum
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.lightboxActionBtn}
                  activeOpacity={0.85}
                  onPress={() => handleShare(activeLightboxPost)}
                >
                  <Ionicons name="share-social-outline" size={18} color="#ffffff" />
                  <Text style={styles.lightboxActionText}>Paylaş</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
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
    paddingHorizontal: 16,
  },
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
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
  garagePill: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
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
  garageWarningCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    padding: 14,
    gap: 6,
  },
  garageWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  garageWarningTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#991b1b',
  },
  garageWarningText: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 17.5,
    fontWeight: '500',
  },
  garageAuthPromptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  garageAuthIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  garageAuthTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  garageAuthSub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  garageAuthBtn: {
    marginTop: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  garageAuthBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  garageComposerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  garageComposerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  garageComposerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  garageComposerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  garageComposerSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  garagePhotoSection: {
    gap: 8,
  },
  garagePhotoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  garageAddPhotoLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  garagePhotoStrip: {
    gap: 10,
    paddingVertical: 2,
  },
  garageThumbBox: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    position: 'relative',
  },
  garageThumbImage: {
    width: '100%',
    height: '100%',
  },
  garageThumbBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  garageThumbBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  garageThumbRemoveBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  garageAddPhotoSlot: {
    width: 96,
    height: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#fdba74',
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  garageAddPhotoSlotTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    marginTop: 2,
  },
  garageAddPhotoSlotSub: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#9a3412',
  },
  garageShareSwitchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  myGarageSectionHeader: {
    marginTop: 4,
    paddingHorizontal: 2,
  },
  myGarageSectionTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  garageStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  garageStatusPublished: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  garageStatusPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  garageStatusRejected: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  garageStatusDraft: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  garageStatusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  rejectionReasonBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    gap: 2,
  },
  rejectionReasonLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b91c1c',
  },
  rejectionReasonText: {
    fontSize: 11.5,
    color: '#7f1d1d',
    lineHeight: 16,
  },
  shareToClubSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  shareToClubSecondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  userGarageFeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  userGarageFeedBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0284c7',
    letterSpacing: 0.4,
  },
  carouselWrapper: {
    gap: 8,
  },
  carouselCounterPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carouselCounterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  carouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  carouselDotActive: {
    width: 18,
    backgroundColor: '#ea580c',
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
  welcomeBannerOuter: {
    position: 'relative',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeBanner: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 18,
  },
  welcomeContent: {
    gap: 6,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ea580c',
  },
  welcomeSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 18,
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
    paddingHorizontal: 20,
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
    height: 235,
    backgroundColor: '#f1f5f9',
    position: 'relative',
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
    maxHeight: '92%',
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
    minHeight: 84,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
    marginTop: 2,
    lineHeight: 15,
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
    paddingTop: 10,
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
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    justifyContent: 'space-between',
  },
  lightboxTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  lightboxAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  lightboxAuthorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  lightboxPostDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  lightboxCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImageStage: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxFullImage: {
    width: '100%',
    height: '100%',
  },
  lightboxFooterCard: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  lightboxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  lightboxCaption: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  lightboxActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  lightboxActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  lightboxActionBtnLiked: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  lightboxActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  lightboxActionTextLiked: {
    color: '#fca5a5',
  },
});
