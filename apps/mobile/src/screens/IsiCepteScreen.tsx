import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Image,
  PanResponder,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  TURKEY_81_PROVINCES,
  IsiCepteProviderItem,
  openIsiCepteAppOrStore,
} from '../components/IsiCepteRecommendationWidget';
import { getBrandLogoUrl } from '../constants/brandLogos';

const API_URL = 'https://used-car-api-hzmu.onrender.com';
const ISICEPTE_LOGO = require('../../assets/images/isicepte-logo.png');

export type IsiCepteVehicleType = 'AUTOMOBILE' | 'MOTORCYCLE';

// Otomobil Servis Kategorileri
const AUTOMOBILE_CATEGORIES = [
  'Motor/Mekanik',
  'Kaporta/Boya',
  'Oto Ekspertiz',
  'Oto Elektrik/Elektronik',
  'Oto Çekici/Kurtarıcı',
  'Lastik/Jant',
  'Cam Filmi/Kaplama',
  'Oto Yıkama & Detay',
  'Oto Aksesuar',
  'Oto Yedek Parça',
] as const;

// Motosiklet Servis Kategorileri
const MOTORCYCLE_CATEGORIES = [
  'Motosiklet Servisi',
  'Motor/Mekanik',
  'Lastik/Jant',
  'Oto Elektrik/Elektronik',
  'Kaporta/Boya',
  'Cam Filmi/Kaplama',
  'Oto Çekici/Kurtarıcı',
  'Oto Yıkama & Detay',
  'Oto Ekspertiz',
] as const;

// Kapsam: Otomobil + Arazi, SUV & Pickup + Minivan & Panelvan markalarının tamamı
const INITIAL_AUTOMOBILE_BRANDS: string[] = [
  'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMC', 'BMW', 'BYD', 'Cadillac',
  'Chery', 'Chevrolet', 'Chrysler', 'Citroen', 'Cupra', 'Dacia', 'Daewoo', 'Daihatsu',
  'DFM', 'DFSK', 'Dodge', 'DS Automobiles', 'Ferrari', 'Fiat', 'Ford', 'Gaz', 'Geely',
  'GMC', 'Honda', 'Hummer', 'Hyundai', 'Infiniti', 'Isuzu', 'Iveco', 'Jaguar', 'Jeep',
  'Karsan', 'Kia', 'Lada', 'Lamborghini', 'Lancia', 'Land Rover', 'Lexus', 'Lincoln',
  'Lotus', 'MAN', 'Maserati', 'Maxus', 'Mazda', 'McLaren', 'Mercedes-Benz', 'MG', 'MINI',
  'Mitsubishi', 'Nissan', 'Opel', 'Otokar', 'Peugeot', 'Porsche', 'Proton', 'RAM',
  'Renault', 'Rolls-Royce', 'Rover', 'Saab', 'Seat', 'Skoda', 'Skywell', 'Smart',
  'SsangYong', 'Subaru', 'Suzuki', 'Tata', 'Tesla', 'Tofaş', 'Togg', 'Toyota',
  'Volkswagen', 'Volvo',
];

const INITIAL_MOTORCYCLE_BRANDS: string[] = [
  'Aprilia', 'Arora', 'Bajaj', 'Benelli', 'BMW', 'CFMoto', 'Ducati', 'Harley-Davidson',
  'Hero', 'Honda', 'Husqvarna', 'Indian', 'Kanuni', 'Kawasaki', 'KTM', 'Kuba', 'Kymco',
  'Mondial', 'Moto Guzzi', 'MV Agusta', 'Piaggio', 'QJMotor', 'RKS', 'Royal Alloy',
  'Royal Enfield', 'Suzuki', 'SYM', 'Triumph', 'TVS', 'Vespa', 'Voge', 'Yamaha',
  'Yuki', 'Zontes',
];

const MOTORCYCLE_BRAND_SET = new Set(
  INITIAL_MOTORCYCLE_BRANDS.map((b) => b.toLowerCase())
);

export default function IsiCepteOneriyorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialBrandParam = typeof params.brand === 'string' && params.brand ? params.brand : 'Tüm Markalar';
  const initialCityParam = typeof params.city === 'string' && params.city ? params.city : 'Tüm Şehirler';
  const initialCategoryParam = typeof params.category === 'string' && params.category ? params.category : 'Tüm Kategoriler';
  const initialVehicleTypeParam: IsiCepteVehicleType =
    params.vehicleType === 'MOTORCYCLE' || params.category === 'Motosiklet Servisi'
      ? 'MOTORCYCLE'
      : 'AUTOMOBILE';

  const [selectedVehicleType, setSelectedVehicleType] = useState<IsiCepteVehicleType>(initialVehicleTypeParam);
  const [items, setItems] = useState<IsiCepteProviderItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalShowcase, setTotalShowcase] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [scope, setScope] = useState<'SHOWCASE_ONLY' | 'ALL_ELIGIBLE'>('SHOWCASE_ONLY');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Available filter options scoped by Vehicle Type
  const [availableCities, setAvailableCities] = useState<string[]>(['Tüm Şehirler', ...TURKEY_81_PROVINCES]);
  const [autoBrands, setAutoBrands] = useState<string[]>(['Tüm Markalar', ...INITIAL_AUTOMOBILE_BRANDS]);
  const [motoBrands, setMotoBrands] = useState<string[]>(['Tüm Markalar', ...INITIAL_MOTORCYCLE_BRANDS]);

  const availableBrands = selectedVehicleType === 'MOTORCYCLE' ? motoBrands : autoBrands;
  const availableCategories = useMemo(
    () =>
      selectedVehicleType === 'MOTORCYCLE'
        ? ['Tüm Kategoriler', ...MOTORCYCLE_CATEGORIES]
        : ['Tüm Kategoriler', ...AUTOMOBILE_CATEGORIES],
    [selectedVehicleType]
  );

  // Active filter states
  const [selectedCity, setSelectedCity] = useState<string>(initialCityParam);
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrandParam);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryParam);
  const [searchQuery, setSearchQuery] = useState('');

  // Picker Modal States ('city' | 'brand' | 'category' | null)
  const [activeFilterModal, setActiveFilterModal] = useState<'city' | 'brand' | 'category' | null>(null);
  const [filterSearchText, setFilterSearchText] = useState('');

  // Selected Provider Detail Modal
  const [detailModalProvider, setDetailModalProvider] = useState<IsiCepteProviderItem | null>(null);

  // Interactive finger-following pan values for modals
  const filterModalPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const detailModalPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    if (activeFilterModal !== null) {
      filterModalPan.setValue({ x: 0, y: 0 });
    }
  }, [activeFilterModal, filterModalPan]);

  useEffect(() => {
    if (detailModalProvider !== null) {
      detailModalPan.setValue({ x: 0, y: 0 });
    }
  }, [detailModalProvider, detailModalPan]);

  // Interactive finger-following + cancellable swipe-to-close for Filter Modal
  const filterModalSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 10 || (g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx)),
        onPanResponderMove: (_, g) => {
          const isHorizontal = Math.abs(g.dx) > Math.abs(g.dy);
          filterModalPan.setValue({
            x: isHorizontal ? g.dx : g.dx * 0.25,
            y: !isHorizontal ? Math.max(0, g.dy) : Math.max(0, g.dy * 0.25),
          });
        },
        onPanResponderRelease: (_, g) => {
          const isHorizontal = Math.abs(g.dx) > Math.abs(g.dy);
          // Check if user reversed finger direction to cancel
          const cancelledHorizontally =
            (g.dx > 0 && g.vx < -0.15) || (g.dx < 0 && g.vx > 0.15);
          const cancelledVertically = g.dy > 0 && g.vy < -0.15;

          const shouldDismissHorizontal =
            isHorizontal &&
            !cancelledHorizontally &&
            (Math.abs(g.dx) > SCREEN_WIDTH * 0.32 || Math.abs(g.vx) > 0.65);

          const shouldDismissVertical =
            !isHorizontal &&
            !cancelledVertically &&
            (g.dy > 110 || g.vy > 0.65);

          if (shouldDismissHorizontal) {
            Animated.timing(filterModalPan, {
              toValue: { x: g.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH, y: 0 },
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              setActiveFilterModal(null);
              filterModalPan.setValue({ x: 0, y: 0 });
            });
          } else if (shouldDismissVertical) {
            Animated.timing(filterModalPan, {
              toValue: { x: 0, y: SCREEN_HEIGHT },
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              setActiveFilterModal(null);
              filterModalPan.setValue({ x: 0, y: 0 });
            });
          } else {
            // Cancelled: spring smoothly back to original position
            Animated.spring(filterModalPan, {
              toValue: { x: 0, y: 0 },
              bounciness: 5,
              speed: 18,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(filterModalPan, {
            toValue: { x: 0, y: 0 },
            bounciness: 5,
            speed: 18,
            useNativeDriver: true,
          }).start();
        },
      }),
    [filterModalPan]
  );

  // Interactive finger-following + cancellable swipe-to-close for Detail Modal
  const detailModalSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 10 || (g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx)),
        onPanResponderMove: (_, g) => {
          const isHorizontal = Math.abs(g.dx) > Math.abs(g.dy);
          detailModalPan.setValue({
            x: isHorizontal ? g.dx : g.dx * 0.25,
            y: !isHorizontal ? Math.max(0, g.dy) : Math.max(0, g.dy * 0.25),
          });
        },
        onPanResponderRelease: (_, g) => {
          const isHorizontal = Math.abs(g.dx) > Math.abs(g.dy);
          const cancelledHorizontally =
            (g.dx > 0 && g.vx < -0.15) || (g.dx < 0 && g.vx > 0.15);
          const cancelledVertically = g.dy > 0 && g.vy < -0.15;

          const shouldDismissHorizontal =
            isHorizontal &&
            !cancelledHorizontally &&
            (Math.abs(g.dx) > SCREEN_WIDTH * 0.32 || Math.abs(g.vx) > 0.65);

          const shouldDismissVertical =
            !isHorizontal &&
            !cancelledVertically &&
            (g.dy > 110 || g.vy > 0.65);

          if (shouldDismissHorizontal) {
            Animated.timing(detailModalPan, {
              toValue: { x: g.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH, y: 0 },
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              setDetailModalProvider(null);
              detailModalPan.setValue({ x: 0, y: 0 });
            });
          } else if (shouldDismissVertical) {
            Animated.timing(detailModalPan, {
              toValue: { x: 0, y: SCREEN_HEIGHT },
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              setDetailModalProvider(null);
              detailModalPan.setValue({ x: 0, y: 0 });
            });
          } else {
            // Cancelled: spring smoothly back to original position
            Animated.spring(detailModalPan, {
              toValue: { x: 0, y: 0 },
              bounciness: 5,
              speed: 18,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(detailModalPan, {
            toValue: { x: 0, y: 0 },
            bounciness: 5,
            speed: 18,
            useNativeDriver: true,
          }).start();
        },
      }),
    [detailModalPan]
  );

  // Session seed for stable randomization per view
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(2, 9));

  // Fetch canonical Otomobil (Otomobil + Arazi, SUV & Pickup + Minivan & Panelvan) & Motosiklet brand lists from backend
  useEffect(() => {
    const extractBrandNames = (json: any): string[] => {
      if (!json || !json.success || !Array.isArray(json.data)) return [];
      return json.data
        .map((b: any) => (typeof b === 'string' ? b : b.label || b.name || b.value))
        .filter(Boolean);
    };

    const loadBrandsByType = async () => {
      try {
        const [autoRes, suvRes, vanRes, motoRes] = await Promise.all([
          fetch(`${API_URL}/vehicle-filters/brands?category=AUTOMOBILE`).catch(() => null),
          fetch(`${API_URL}/vehicle-filters/brands?category=SUV_PICKUP`).catch(() => null),
          fetch(`${API_URL}/vehicle-filters/brands?category=MINIVAN_PANELVAN`).catch(() => null),
          fetch(`${API_URL}/vehicle-filters/brands?category=MOTORCYCLE`).catch(() => null),
        ]);

        const combinedAutoNames = new Set<string>(INITIAL_AUTOMOBILE_BRANDS);
        for (const res of [autoRes, suvRes, vanRes]) {
          if (res && res.ok) {
            const json = await res.json();
            for (const name of extractBrandNames(json)) {
              combinedAutoNames.add(name);
            }
          }
        }
        const sortedAuto = Array.from(combinedAutoNames).sort((a, b) => a.localeCompare(b, 'tr'));
        setAutoBrands(['Tüm Markalar', ...sortedAuto]);

        if (motoRes && motoRes.ok) {
          const motoJson = await motoRes.json();
          const combinedMotoNames = new Set<string>([
            ...INITIAL_MOTORCYCLE_BRANDS,
            ...extractBrandNames(motoJson),
          ]);
          const sortedMoto = Array.from(combinedMotoNames).sort((a, b) => a.localeCompare(b, 'tr'));
          setMotoBrands(['Tüm Markalar', ...sortedMoto]);
        }
      } catch {
        // Fallback lists already initialized
      }
    };
    loadBrandsByType();
  }, []);

  // Sync params if navigated with brand/city params
  useEffect(() => {
    if (typeof params.brand === 'string' && params.brand) {
      setSelectedBrand(params.brand);
      setPage(1);
    }
    if (typeof params.city === 'string' && params.city) {
      setSelectedCity(params.city);
      setPage(1);
    }
  }, [params.brand, params.city]);

  // Handle Vasıta Türü switch (Otomobil <-> Motosiklet)
  const handleVehicleTypeChange = (nextType: IsiCepteVehicleType) => {
    if (nextType === selectedVehicleType) return;
    setSelectedVehicleType(nextType);
    setSelectedBrand('Tüm Markalar');
    setSelectedCategory('Tüm Kategoriler');
    setPage(1);
  };

  // Fetch recommendations from API
  const fetchRecommendations = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const query = new URLSearchParams();
        if (selectedCity && selectedCity !== 'Tüm Şehirler') {
          query.append('city', selectedCity);
        }
        if (selectedBrand && selectedBrand !== 'Tüm Markalar') {
          query.append('brand', selectedBrand);
        }
        if (selectedCategory && selectedCategory !== 'Tüm Kategoriler') {
          query.append('category', selectedCategory);
        } else if (selectedVehicleType === 'MOTORCYCLE' && selectedBrand === 'Tüm Markalar') {
          // When Motorcycle is selected with "Tüm Kategoriler", prioritize Motosiklet Servisi on API query
          query.append('category', 'Motosiklet Servisi');
        }
        query.append('scope', scope);
        query.append('page', page.toString());
        query.append('limit', scope === 'SHOWCASE_ONLY' ? '50' : '24');
        query.append('seed', sessionSeed);

        const res = await fetch(`${API_URL}/isicepte/recommendations?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const fetchedItems: IsiCepteProviderItem[] = Array.isArray(data.items) ? data.items : [];

          setItems(fetchedItems);
          setTotalCount(data.total || 0);
          setTotalShowcase(data.totalShowcase || 0);
          setTotalAll(data.totalAll || 0);
          setTotalPages(data.totalPages || 1);

          if (Array.isArray(data.availableCities) && data.availableCities.length > 0) {
            setAvailableCities(
              data.availableCities.includes('Tüm Şehirler')
                ? data.availableCities
                : ['Tüm Şehirler', ...data.availableCities]
            );
          }

          if (Array.isArray(data.availableBrands) && data.availableBrands.length > 0) {
            const dualBrands = new Set(['bmw', 'honda', 'suzuki', 'peugeot']);
            const extraAutoBrands = data.availableBrands.filter((b: string) => {
              if (!b || b === 'Tüm Markalar') return false;
              const lower = b.toLowerCase().trim();
              if (MOTORCYCLE_BRAND_SET.has(lower) && !dualBrands.has(lower)) return false;
              return true;
            });
            if (extraAutoBrands.length > 0) {
              setAutoBrands((prev) => {
                const merged = new Set(prev.filter((x) => x !== 'Tüm Markalar'));
                for (const b of extraAutoBrands) merged.add(b);
                const sorted = Array.from(merged).sort((a, b) => a.localeCompare(b, 'tr'));
                return ['Tüm Markalar', ...sorted];
              });
            }
          }

          // Record impression event for Vitrin analytics if items exist
          if (fetchedItems.length > 0) {
            fetch(`${API_URL}/isicepte/events`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventType: 'ISICEPTE_SHOWCASE_IMPRESSION',
                city: selectedCity !== 'Tüm Şehirler' ? selectedCity : undefined,
                brand: selectedBrand !== 'Tüm Markalar' ? selectedBrand : undefined,
                metadata: {
                  vehicleType: selectedVehicleType,
                  category: selectedCategory !== 'Tüm Kategoriler' ? selectedCategory : undefined,
                  scope,
                },
              }),
            }).catch(() => {});
          }
        } else {
          setItems([]);
          setTotalCount(0);
          setTotalShowcase(0);
          setTotalAll(0);
        }
      } catch (e) {
        console.error('Failed to load IsiCepte providers:', e);
        setItems([]);
        setTotalCount(0);
        setTotalShowcase(0);
        setTotalAll(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedVehicleType, selectedCity, selectedBrand, selectedCategory, scope, page, sessionSeed]
  );

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecommendations(true);
  };

  const handleOpenDetailModal = (provider: IsiCepteProviderItem) => {
    setDetailModalProvider(provider);
    fetch(`${API_URL}/isicepte/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'ISICEPTE_PROFILE_CLICK',
        providerId: provider.id,
        city: provider.city,
      }),
    }).catch(() => {});
  };

  // Opens İşi Cepte app directly if installed, otherwise redirects to App Store / Google Play Store
  const handleOutboundClick = async (provider: IsiCepteProviderItem) => {
    fetch(`${API_URL}/isicepte/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'ISICEPTE_OUTBOUND_CLICK',
        providerId: provider.id,
        city: provider.city,
      }),
    }).catch(() => {});

    await openIsiCepteAppOrStore(provider);
  };

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleClearAllFilters = () => {
    setSelectedCity('Tüm Şehirler');
    setSelectedBrand('Tüm Markalar');
    setSelectedCategory('Tüm Kategoriler');
    setSearchQuery('');
    setPage(1);
  };

  const isFiltered =
    selectedCity !== 'Tüm Şehirler' ||
    selectedBrand !== 'Tüm Markalar' ||
    selectedCategory !== 'Tüm Kategoriler';

  // Contextual summary title
  const getContextualSummaryTitle = () => {
    const vehicleLabel = selectedVehicleType === 'MOTORCYCLE' ? 'Motosiklet' : 'Otomobil';
    const hasCity = selectedCity !== 'Tüm Şehirler';
    const hasBrand = selectedBrand !== 'Tüm Markalar';
    const hasCat = selectedCategory !== 'Tüm Kategoriler';

    let descriptor = '';
    if (hasCity && hasBrand && hasCat) {
      descriptor = `${selectedCity} • ${selectedBrand} (${selectedCategory})`;
    } else if (hasCity && hasBrand) {
      descriptor = `${selectedCity} • ${selectedBrand} uzmanı`;
    } else if (hasCity && hasCat) {
      descriptor = `${selectedCity} • ${selectedCategory}`;
    } else if (hasBrand && hasCat) {
      descriptor = `${selectedBrand} • ${selectedCategory}`;
    } else if (hasCity) {
      descriptor = `${selectedCity} (${vehicleLabel})`;
    } else if (hasBrand) {
      descriptor = `${selectedBrand} uzmanı`;
    } else if (hasCat) {
      descriptor = `${selectedCategory} (${vehicleLabel})`;
    } else {
      descriptor = `${vehicleLabel}`;
    }

    if (scope === 'SHOWCASE_ONLY') {
      return `${descriptor} vitrin üyeleri`;
    } else {
      return `${descriptor} tüm ustalar ve servisler`;
    }
  };

  // Client search filter for business names + vehicle type isolation
  const displayedItems = useMemo(() => {
    let list = items;

    // When Otomobil is selected and category is "Tüm Kategoriler", exclude motorcycle-only shops if they only do Motosiklet Servisi
    if (
      selectedVehicleType === 'AUTOMOBILE' &&
      selectedCategory === 'Tüm Kategoriler' &&
      selectedBrand === 'Tüm Markalar'
    ) {
      list = list.filter((item) => {
        const cats = item.serviceCategories || [];
        if (cats.length === 1 && cats[0] === 'Motosiklet Servisi') {
          return false;
        }
        return true;
      });
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.businessName.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        (item.district && item.district.toLowerCase().includes(q)) ||
        item.serviceCategories?.some((c) => c.toLowerCase().includes(q)) ||
        item.supportedBrands?.some((b) => b.toLowerCase().includes(q))
    );
  }, [items, searchQuery, selectedVehicleType, selectedCategory, selectedBrand]);

  // Modal list items based on activeFilterModal
  const modalOptions = useMemo(() => {
    let sourceList: string[] = [];
    if (activeFilterModal === 'city') sourceList = availableCities;
    else if (activeFilterModal === 'brand') sourceList = availableBrands;
    else if (activeFilterModal === 'category') sourceList = availableCategories;

    if (!filterSearchText.trim()) return sourceList;
    const q = filterSearchText.toLowerCase().trim();
    return sourceList.filter((opt) => opt.toLowerCase().includes(q));
  }, [activeFilterModal, availableCities, availableBrands, availableCategories, filterSearchText]);

  const openFilterModal = (type: 'city' | 'brand' | 'category') => {
    setFilterSearchText('');
    setActiveFilterModal(type);
  };

  const handleSelectModalOption = (val: string) => {
    if (activeFilterModal === 'city') setSelectedCity(val);
    else if (activeFilterModal === 'brand') setSelectedBrand(val);
    else if (activeFilterModal === 'category') setSelectedCategory(val);
    setPage(1);
    setActiveFilterModal(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* TOP HEADER BAR */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerLeft}>
          <Image source={ISICEPTE_LOGO} style={styles.headerLogoImg} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>İşi Cepte Öneriyor</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>ONAYLI</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {scope === 'SHOWCASE_ONLY'
                ? 'Öne çıkan vitrin otomotiv ustaları ve servisleri'
                : 'TorqueScout onaylı tüm aktif İşi Cepte servisleri'}
            </Text>
          </View>
        </View>
      </View>

      {/* FILTER SECTION */}
      <View style={styles.filterSection}>
        {/* STEP 1: VASITA TÜRÜ SEÇİMİ (SADECE OTOMOBİL VE MOTOSİKLET) */}
        <View style={styles.vehicleTypeRow}>
          <TouchableOpacity
            style={[
              styles.vehicleTypeBtn,
              selectedVehicleType === 'AUTOMOBILE' && styles.vehicleTypeBtnActive,
            ]}
            onPress={() => handleVehicleTypeChange('AUTOMOBILE')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="car-sport"
              size={16}
              color={selectedVehicleType === 'AUTOMOBILE' ? '#ffffff' : '#475569'}
            />
            <Text
              style={[
                styles.vehicleTypeBtnText,
                selectedVehicleType === 'AUTOMOBILE' && styles.vehicleTypeBtnTextActive,
              ]}
            >
              Otomobil
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.vehicleTypeBtn,
              selectedVehicleType === 'MOTORCYCLE' && styles.vehicleTypeBtnActive,
            ]}
            onPress={() => handleVehicleTypeChange('MOTORCYCLE')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="bicycle"
              size={16}
              color={selectedVehicleType === 'MOTORCYCLE' ? '#ffffff' : '#475569'}
            />
            <Text
              style={[
                styles.vehicleTypeBtnText,
                selectedVehicleType === 'MOTORCYCLE' && styles.vehicleTypeBtnTextActive,
              ]}
            >
              Motosiklet
            </Text>
          </TouchableOpacity>
        </View>

        {/* STEP 2: 3-FILTER BAR: ŞEHİR | MARKA | KATEGORİ */}
        <View style={styles.threeFilterRow}>
          {/* 1. Şehir */}
          <TouchableOpacity
            style={[
              styles.filterDropdownBtn,
              selectedCity !== 'Tüm Şehirler' && styles.filterDropdownBtnActive,
            ]}
            onPress={() => openFilterModal('city')}
            activeOpacity={0.8}
          >
            <Text style={styles.filterDropdownLabel}>ŞEHİR</Text>
            <View style={styles.filterDropdownValueRow}>
              <Text
                style={[
                  styles.filterDropdownValue,
                  selectedCity !== 'Tüm Şehirler' && styles.filterDropdownValueActive,
                ]}
                numberOfLines={1}
              >
                {selectedCity}
              </Text>
              <Ionicons name="chevron-down" size={13} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* 2. Marka */}
          <TouchableOpacity
            style={[
              styles.filterDropdownBtn,
              selectedBrand !== 'Tüm Markalar' && styles.filterDropdownBtnActive,
            ]}
            onPress={() => openFilterModal('brand')}
            activeOpacity={0.8}
          >
            <Text style={styles.filterDropdownLabel}>
              {selectedVehicleType === 'MOTORCYCLE' ? 'MOTO MARKA' : 'MARKA'}
            </Text>
            <View style={styles.filterDropdownValueRow}>
              <Text
                style={[
                  styles.filterDropdownValue,
                  selectedBrand !== 'Tüm Markalar' && styles.filterDropdownValueActive,
                ]}
                numberOfLines={1}
              >
                {selectedBrand}
              </Text>
              <Ionicons name="chevron-down" size={13} color="#64748b" />
            </View>
          </TouchableOpacity>

          {/* 3. Kategori */}
          <TouchableOpacity
            style={[
              styles.filterDropdownBtn,
              selectedCategory !== 'Tüm Kategoriler' && styles.filterDropdownBtnActive,
            ]}
            onPress={() => openFilterModal('category')}
            activeOpacity={0.8}
          >
            <Text style={styles.filterDropdownLabel}>KATEGORİ</Text>
            <View style={styles.filterDropdownValueRow}>
              <Text
                style={[
                  styles.filterDropdownValue,
                  selectedCategory !== 'Tüm Kategoriler' && styles.filterDropdownValueActive,
                ]}
                numberOfLines={1}
              >
                {selectedCategory}
              </Text>
              <Ionicons name="chevron-down" size={13} color="#64748b" />
            </View>
          </TouchableOpacity>
        </View>

        {/* SEARCH INPUT */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="İşletme adı, ilçe veya uzmanlık ara..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={17} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* SCOPE TABS (VİTRİN ÜYELERİ vs TÜM USTALAR) */}
        <View style={styles.scopeTabsContainer}>
          <TouchableOpacity
            style={[styles.scopeTab, scope === 'SHOWCASE_ONLY' && styles.scopeTabActive]}
            onPress={() => {
              setScope('SHOWCASE_ONLY');
              setPage(1);
            }}
          >
            <Ionicons
              name="star"
              size={13}
              color={scope === 'SHOWCASE_ONLY' ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.scopeTabText, scope === 'SHOWCASE_ONLY' && styles.scopeTabTextActive]}>
              Vitrin Üyeleri {totalShowcase > 0 ? `(${totalShowcase})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeTab, scope === 'ALL_ELIGIBLE' && styles.scopeTabActive]}
            onPress={() => {
              setScope('ALL_ELIGIBLE');
              setPage(1);
            }}
          >
            <Ionicons
              name="grid-outline"
              size={13}
              color={scope === 'ALL_ELIGIBLE' ? '#ea580c' : '#64748b'}
            />
            <Text style={[styles.scopeTabText, scope === 'ALL_ELIGIBLE' && styles.scopeTabTextActive]}>
              Tüm Ustalar & Servisler {totalAll > 0 ? `(${totalAll})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTERED MODE CONTEXT BAR & REMOVABLE CHIPS */}
      {(isFiltered || scope === 'ALL_ELIGIBLE') && (
        <View style={styles.contextSummaryBar}>
          <View style={styles.contextTitleRow}>
            <Text style={styles.contextTitleText} numberOfLines={2}>
              {getContextualSummaryTitle()}
            </Text>
            <View style={styles.contextCountBadge}>
              <Text style={styles.contextCountBadgeText}>
                {scope === 'SHOWCASE_ONLY'
                  ? `${displayedItems.length} vitrin üyesi`
                  : `${totalCount || displayedItems.length} toplam işletme`}
              </Text>
            </View>
          </View>

          {isFiltered && (
            <View style={styles.activeChipsWrap}>
              {selectedCity !== 'Tüm Şehirler' && (
                <TouchableOpacity
                  style={styles.activeFilterChipBlue}
                  onPress={() => {
                    setSelectedCity('Tüm Şehirler');
                    setPage(1);
                  }}
                >
                  <Text style={styles.activeFilterChipBlueText}>{selectedCity}</Text>
                  <Ionicons name="close" size={12} color="#1d4ed8" />
                </TouchableOpacity>
              )}

              {selectedBrand !== 'Tüm Markalar' && (
                <TouchableOpacity
                  style={styles.activeFilterChipBlue}
                  onPress={() => {
                    setSelectedBrand('Tüm Markalar');
                    setPage(1);
                  }}
                >
                  <Text style={styles.activeFilterChipBlueText}>{selectedBrand}</Text>
                  <Ionicons name="close" size={12} color="#1d4ed8" />
                </TouchableOpacity>
              )}

              {selectedCategory !== 'Tüm Kategoriler' && (
                <TouchableOpacity
                  style={styles.activeFilterChipOrange}
                  onPress={() => {
                    setSelectedCategory('Tüm Kategoriler');
                    setPage(1);
                  }}
                >
                  <Text style={styles.activeFilterChipOrangeText}>{selectedCategory}</Text>
                  <Ionicons name="close" size={12} color="#c2410c" />
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={handleClearAllFilters} style={styles.clearAllLinkBtn}>
                <Text style={styles.clearAllLinkText}>Filtreleri Temizle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* MAIN CONTENT LIST */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.centerLoadingText}>
            {scope === 'SHOWCASE_ONLY'
              ? 'Vitrin üyeleri yükleniyor...'
              : 'Tüm ustalar ve servisler yükleniyor...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name={selectedVehicleType === 'MOTORCYCLE' ? 'bicycle' : 'search'}
                  size={28}
                  color="#ea580c"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {scope === 'SHOWCASE_ONLY'
                  ? `Seçili kriterlere uygun aktif ${
                      selectedVehicleType === 'MOTORCYCLE' ? 'Motosiklet' : 'Otomobil'
                    } Vitrin üyesi bulunmuyor.`
                  : isFiltered
                  ? 'Seçtiğiniz şehir, marka ve kategoriye uygun işletme bulunamadı.'
                  : 'Şu anda bu bölümde aktif işletme bulunmuyor.'}
              </Text>
              <Text style={styles.emptyDesc}>
                {scope === 'SHOWCASE_ONLY' && totalAll > 0
                  ? `Bu filtrelerle eşleşen ${totalAll} standart usta ve servis bulunuyor. "Tüm Ustaları Gör" butonuna tıklayarak erişebilirsiniz.`
                  : isFiltered
                  ? 'Filtreleri değiştirerek veya temizleyerek diğer servisleri görebilirsiniz.'
                  : 'Yeni üye servisler eklendikçe burada listelenecektir.'}
              </Text>

              <View style={styles.emptyActionsRow}>
                {scope === 'SHOWCASE_ONLY' && totalAll > 0 && (
                  <TouchableOpacity
                    style={styles.seeAllEligibleBtn}
                    onPress={() => {
                      setScope('ALL_ELIGIBLE');
                      setPage(1);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.seeAllEligibleBtnText}>
                      Tüm Ustaları Gör ({totalAll} İşletme) ➔
                    </Text>
                  </TouchableOpacity>
                )}

                {isFiltered && (
                  <TouchableOpacity
                    style={styles.resetFiltersBtn}
                    onPress={handleClearAllFilters}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.resetFiltersBtnText}>Filtreleri Temizle</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
          ListFooterComponent={
            <>
              {/* Under Vitrin Section CTA: "TÜM USTALARI GÖR" Button in Showcase View */}
              {scope === 'SHOWCASE_ONLY' && displayedItems.length > 0 && totalAll > 0 && (
                <View style={styles.allEligibleBannerCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.allEligibleBannerTitle}>
                      Tüm Ustaları ve Servisleri Görün
                    </Text>
                    <Text style={styles.allEligibleBannerSub}>
                      Aynı filtre kriterlerine uyan toplam {totalAll} adet kayıtlı işletme bulunmaktadır.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.allEligibleBannerBtn}
                    onPress={() => {
                      setScope('ALL_ELIGIBLE');
                      setPage(1);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.allEligibleBannerBtnText}>
                      Tüm Ustaları Gör ({totalAll}) ➔
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                    disabled={page <= 1}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <Text style={styles.pageBtnText}>Önceki</Text>
                  </TouchableOpacity>

                  <Text style={styles.pageIndicatorText}>
                    Sayfa {page} / {totalPages}
                  </Text>

                  <TouchableOpacity
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                    disabled={page >= totalPages}
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <Text style={styles.pageBtnText}>Sonraki</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Card Top: Cover Image Area & High-Contrast Showcase Badge */}
              <TouchableOpacity
                style={styles.cardCoverArea}
                activeOpacity={0.9}
                onPress={() => handleOpenDetailModal(item)}
              >
                {item.coverImageUrl ? (
                  <Image
                    source={{ uri: item.coverImageUrl }}
                    style={styles.cardCoverImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.cardCoverFallback}>
                    <Image
                      source={ISICEPTE_LOGO}
                      style={{ width: 44, height: 44, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                    <Text style={styles.cardCoverFallbackText}>İşiCepte Otomotiv Servisi</Text>
                  </View>
                )}

                {/* High-Contrast Vitrin Üyesi Badge */}
                {item.isShowcase && (
                  <View style={styles.cardVitrinOverlayBadge}>
                    <Ionicons name="star" size={11} color="#fbbf24" />
                    <Text style={styles.cardVitrinOverlayBadgeText}>VİTRİN ÜYESİ</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Card Body */}
              <View style={styles.cardBody}>
                {/* Header: Name and Real Rating */}
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardBusinessName} numberOfLines={1}>
                    {item.businessName}
                  </Text>

                  {item.rating > 0 && (
                    <View style={styles.cardRatingCol}>
                      <View style={styles.cardRatingTop}>
                        <Ionicons name="star" size={13} color="#f97316" />
                        <Text style={styles.cardRatingScore}>{item.rating.toFixed(1)}</Text>
                      </View>
                      {item.reviewCount > 0 && (
                        <Text style={styles.cardReviewCount}>
                          {item.reviewCount} değerlendirme
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Location */}
                <View style={styles.cardLocRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.cardLocText} numberOfLines={1}>
                    {item.city} {item.district ? `/ ${item.district}` : ''}
                  </Text>
                </View>

                {/* Supported Brands with Official Brand Logos */}
                {item.supportedBrands && item.supportedBrands.length > 0 ? (
                  <View style={styles.cardBrandPillsRow}>
                    {item.supportedBrands.slice(0, 5).map((brandName, idx) => {
                      const logoUri = getBrandLogoUrl(
                        brandName,
                        MOTORCYCLE_BRAND_SET.has(brandName.toLowerCase())
                          ? 'MOTORCYCLE'
                          : selectedVehicleType
                      );
                      return (
                        <View key={idx} style={styles.cardBrandPillWithLogo}>
                          {logoUri ? (
                            <Image
                              source={{ uri: logoUri }}
                              style={styles.cardBrandMiniLogo}
                              resizeMode="contain"
                            />
                          ) : null}
                          <Text style={styles.cardBrandPillText}>{brandName}</Text>
                        </View>
                      );
                    })}
                    {item.supportedBrands.length > 5 && (
                      <Text style={styles.cardMoreBrandsText}>
                        +{item.supportedBrands.length - 5}
                      </Text>
                    )}
                  </View>
                ) : null}

                {/* Canonical Service Categories Chips */}
                {item.serviceCategories && item.serviceCategories.length > 0 ? (
                  <View style={styles.cardCategoriesRow}>
                    {item.serviceCategories.map((cat, idx) => (
                      <View key={idx} style={styles.cardCategoryBadge}>
                        <Text style={styles.cardCategoryText}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Card Actions: Profili Gör & İşiCepte'de Aç (App/Store) & Ara */}
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    style={styles.cardProfileBtn}
                    onPress={() => handleOpenDetailModal(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.cardProfileBtnText}>Profili Gör</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardOutboundBtn}
                    onPress={() => handleOutboundClick(item)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={ISICEPTE_LOGO}
                      style={{ width: 16, height: 16, borderRadius: 4 }}
                      resizeMode="contain"
                    />
                    <Text style={styles.cardOutboundBtnText}>İşiCepte'de Aç</Text>
                  </TouchableOpacity>

                  {item.phone ? (
                    <TouchableOpacity
                      style={styles.cardCallIconBtn}
                      onPress={() => handleCall(item.phone)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="call" size={14} color="#ea580c" />
                      <Text style={styles.cardCallBtnLabel}>Ara</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* ========================================================================= */}
      {/* FILTER SELECTION MODAL (ŞEHİR / MARKA / KATEGORİ) */}
      {/* ========================================================================= */}
      <Modal
        visible={activeFilterModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveFilterModal(null)}
      >
        <View style={styles.cityModalOverlay}>
          {/* Tap outside backdrop to close */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActiveFilterModal(null)}
          />
          {/* Left & Right Edge Swipe Zones inside Modal */}
          <View
            style={styles.modalEdgeSwipeZoneLeft}
            {...filterModalSwipeResponder.panHandlers}
          />
          <View
            style={styles.modalEdgeSwipeZoneRight}
            {...filterModalSwipeResponder.panHandlers}
          />

          <Animated.View
            style={[
              styles.cityModalContainer,
              { transform: filterModalPan.getTranslateTransform() },
            ]}
          >
            {/* Drag Handle & Header (Swipe Down or Edge Swipe to Close) */}
            <View {...filterModalSwipeResponder.panHandlers}>
              <View style={styles.modalDragHandleWrap}>
                <View style={styles.modalDragHandleBar} />
              </View>
              <View style={styles.cityModalHeader}>
                <Text style={styles.cityModalTitle}>
                  {activeFilterModal === 'city'
                    ? 'Şehir Seçin'
                    : activeFilterModal === 'brand'
                    ? selectedVehicleType === 'MOTORCYCLE'
                      ? 'Motosiklet Markası Seçin'
                      : 'Otomobil Markası Seçin'
                    : 'Hizmet Kategorisi Seçin'}
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveFilterModal(null)}
                  style={styles.cityModalCloseBtn}
                >
                  <Ionicons name="close" size={22} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Input */}
            <View style={styles.citySearchBox}>
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                style={styles.citySearchInput}
                placeholder={
                  activeFilterModal === 'city'
                    ? 'Şehir ara (örn: İstanbul, İzmir, Ankara)...'
                    : activeFilterModal === 'brand'
                    ? selectedVehicleType === 'MOTORCYCLE'
                      ? 'Motosiklet markası ara (örn: Honda, Yamaha)...'
                      : 'Otomobil markası ara (örn: BMW, Renault, Fiat)...'
                    : 'Kategori ara...'
                }
                placeholderTextColor="#94a3b8"
                value={filterSearchText}
                onChangeText={setFilterSearchText}
              />
              {filterSearchText ? (
                <TouchableOpacity onPress={() => setFilterSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Options List */}
            <FlatList
              data={modalOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected =
                  (activeFilterModal === 'city' && selectedCity === item) ||
                  (activeFilterModal === 'brand' && selectedBrand === item) ||
                  (activeFilterModal === 'category' && selectedCategory === item);

                const brandLogoUri =
                  activeFilterModal === 'brand' && item !== 'Tüm Markalar'
                    ? getBrandLogoUrl(item, selectedVehicleType)
                    : null;

                return (
                  <TouchableOpacity
                    style={[styles.cityItem, isSelected && styles.cityItemActive]}
                    onPress={() => handleSelectModalOption(item)}
                  >
                    <View style={styles.modalOptionLeft}>
                      {activeFilterModal === 'brand' && (
                        <View style={styles.modalBrandLogoBox}>
                          {brandLogoUri ? (
                            <Image
                              source={{ uri: brandLogoUri }}
                              style={styles.modalBrandLogoImg}
                              resizeMode="contain"
                            />
                          ) : (
                            <Ionicons
                              name={selectedVehicleType === 'MOTORCYCLE' ? 'bicycle' : 'car-sport'}
                              size={16}
                              color="#64748b"
                            />
                          )}
                        </View>
                      )}
                      <Text style={[styles.cityItemText, isSelected && styles.cityItemTextActive]}>
                        {item}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#ea580c" />}
                  </TouchableOpacity>
                );
              }}
            />
          </Animated.View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* PROVIDER DETAIL MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(detailModalProvider)}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDetailModalProvider(null)}
      >
        <View style={styles.detailModalOverlay}>
          {/* Tap outside backdrop to close */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDetailModalProvider(null)}
          />
          {/* Left & Right Edge Swipe Zones inside Modal */}
          <View
            style={styles.modalEdgeSwipeZoneLeft}
            {...detailModalSwipeResponder.panHandlers}
          />
          <View
            style={styles.modalEdgeSwipeZoneRight}
            {...detailModalSwipeResponder.panHandlers}
          />

          <Animated.View
            style={[
              styles.detailModalCard,
              { transform: detailModalPan.getTranslateTransform() },
            ]}
          >
            {/* Drag Handle Bar (Swipe Down or Edge Swipe to Close) */}
            <View
              style={styles.modalDragHandleWrap}
              {...detailModalSwipeResponder.panHandlers}
            >
              <View style={styles.modalDragHandleBar} />
            </View>

            {detailModalProvider && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header (Swipeable to Close) */}
                <View
                  style={styles.detailModalHeader}
                  {...detailModalSwipeResponder.panHandlers}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    {detailModalProvider.isShowcase ? (
                      <View style={styles.detailShowcaseTag}>
                        <Ionicons name="star" size={11} color="#ea580c" />
                        <Text style={styles.detailShowcaseTagText}>İŞİCEPTE VİTRİN ÜYESİ</Text>
                      </View>
                    ) : (
                      <View style={styles.detailVerifiedTag}>
                        <Image
                          source={ISICEPTE_LOGO}
                          style={{ width: 14, height: 14, borderRadius: 3 }}
                          resizeMode="contain"
                        />
                        <Text style={styles.detailVerifiedTagText}>İŞİCEPTE ONAYLI SERVİS</Text>
                      </View>
                    )}
                    <Text style={styles.detailBusinessName}>
                      {detailModalProvider.businessName}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setDetailModalProvider(null)}
                    style={styles.detailCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                {/* Modal Cover Image */}
                <View style={styles.detailCoverBox}>
                  {detailModalProvider.coverImageUrl ? (
                    <Image
                      source={{ uri: detailModalProvider.coverImageUrl }}
                      style={styles.detailCoverImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.detailCoverFallback}>
                      <Image
                        source={ISICEPTE_LOGO}
                        style={{ width: 48, height: 48, borderRadius: 12 }}
                        resizeMode="contain"
                      />
                      <Text style={styles.detailCoverFallbackText}>İşletme Görseli</Text>
                    </View>
                  )}
                </View>

                {/* Rating & Reviews */}
                {detailModalProvider.rating > 0 && (
                  <View style={styles.detailRatingBox}>
                    <View>
                      <Text style={styles.detailFieldLabel}>MÜŞTERİ DEĞERLENDİRMESİ</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <Ionicons name="star" size={16} color="#f97316" />
                        <Text style={styles.detailScoreText}>
                          {detailModalProvider.rating.toFixed(1)} / 5.0
                        </Text>
                      </View>
                    </View>
                    {detailModalProvider.reviewCount > 0 && (
                      <Text style={styles.detailReviewText}>
                        {detailModalProvider.reviewCount} gerçek değerlendirme
                      </Text>
                    )}
                  </View>
                )}

                {/* Location & Address */}
                <View style={styles.detailFieldBlock}>
                  <Text style={styles.detailFieldLabel}>ADRES & KONUM</Text>
                  <Text style={styles.detailFieldValue}>
                    {detailModalProvider.address ||
                      `${detailModalProvider.city} ${
                        detailModalProvider.district ? `/ ${detailModalProvider.district}` : ''
                      }`}
                  </Text>
                </View>

                {/* Supported Brands with Logos */}
                {detailModalProvider.supportedBrands && detailModalProvider.supportedBrands.length > 0 ? (
                  <View style={styles.detailFieldBlock}>
                    <Text style={styles.detailFieldLabel}>HİZMET VERİLEN ARAÇ MARKALARI</Text>
                    <View style={styles.detailTagsGrid}>
                      {detailModalProvider.supportedBrands.map((b, idx) => {
                        const logoUri = getBrandLogoUrl(
                          b,
                          MOTORCYCLE_BRAND_SET.has(b.toLowerCase())
                            ? 'MOTORCYCLE'
                            : selectedVehicleType
                        );
                        return (
                          <View key={idx} style={styles.detailBrandBadge}>
                            {logoUri ? (
                              <Image
                                source={{ uri: logoUri }}
                                style={{ width: 15, height: 15 }}
                                resizeMode="contain"
                              />
                            ) : null}
                            <Text style={styles.detailBrandBadgeText}>{b}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* Service Categories */}
                {detailModalProvider.serviceCategories && detailModalProvider.serviceCategories.length > 0 ? (
                  <View style={styles.detailFieldBlock}>
                    <Text style={styles.detailFieldLabel}>HİZMET UZMANLIKLARI</Text>
                    <View style={styles.detailTagsGrid}>
                      {detailModalProvider.serviceCategories.map((cat, idx) => (
                        <View key={idx} style={styles.detailCategoryBadge}>
                          <Text style={styles.detailCategoryBadgeText}>{cat}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Phone / Contact */}
                {detailModalProvider.phone ? (
                  <TouchableOpacity
                    style={styles.detailPhoneBox}
                    onPress={() => handleCall(detailModalProvider.phone)}
                    activeOpacity={0.8}
                  >
                    <View>
                      <Text style={styles.detailFieldLabel}>İLETİŞİM TELEFONU</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <Ionicons name="call" size={15} color="#ea580c" />
                        <Text style={styles.detailPhoneText}>{detailModalProvider.phone}</Text>
                      </View>
                    </View>
                    <View style={styles.detailPhoneCallPill}>
                      <Text style={styles.detailPhoneCallPillText}>Hemen Ara</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* Modal Actions: Kapat & İşiCepte'de Aç (App or Store) */}
                <View style={styles.detailCtaRow}>
                  <TouchableOpacity
                    style={styles.detailCloseActionBtn}
                    onPress={() => setDetailModalProvider(null)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.detailCloseActionBtnText}>Kapat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailIsiCepteBtn}
                    onPress={() => handleOutboundClick(detailModalProvider)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={ISICEPTE_LOGO}
                      style={{ width: 18, height: 18, borderRadius: 4 }}
                      resizeMode="contain"
                    />
                    <Text style={styles.detailIsiCepteBtnText}>İşiCepte'de Aç</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 4 : 10,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerLogoImg: {
    width: 40,
    height: 40,
    borderRadius: 11,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ea580c',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  filterSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: 10,
    paddingBottom: 10,
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 8,
  },
  vehicleTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 8.5,
    borderRadius: 12,
  },
  vehicleTypeBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  vehicleTypeBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#475569',
  },
  vehicleTypeBtnTextActive: {
    color: '#ffffff',
  },
  threeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 8,
  },
  filterDropdownBtn: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterDropdownBtnActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  filterDropdownLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  filterDropdownValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  filterDropdownValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  filterDropdownValueActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  searchContainer: {
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
    paddingVertical: 0,
  },
  scopeTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 8,
    borderRadius: 10,
  },
  scopeTabActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fb923c',
  },
  scopeTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  scopeTabTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  contextSummaryBar: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  contextTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  contextTitleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  contextCountBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  contextCountBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#334155',
  },
  activeChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterChipBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  activeFilterChipBlueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  activeFilterChipOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffedd5',
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  activeFilterChipOrangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  clearAllLinkBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  clearAllLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    textDecorationLine: 'underline',
  },
  listContainer: {
    padding: 14,
    gap: 16,
    backgroundColor: '#f8fafc',
    paddingBottom: 36,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardCoverArea: {
    height: 150,
    width: '100%',
    backgroundColor: '#0b101e',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCoverImg: {
    width: '100%',
    height: '100%',
  },
  cardCoverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0b101e',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cardCoverFallbackText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94a3b8',
  },
  cardVitrinOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  cardVitrinOverlayBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  cardBody: {
    padding: 16,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardBusinessName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    flex: 1,
  },
  cardRatingCol: {
    alignItems: 'flex-end',
  },
  cardRatingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardRatingScore: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  cardReviewCount: {
    fontSize: 10,
    color: '#64748b',
  },
  cardLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardLocText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  cardBrandPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  cardBrandPillWithLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  cardBrandMiniLogo: {
    width: 14,
    height: 14,
  },
  cardBrandPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9a3412',
  },
  cardMoreBrandsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  cardCategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardCategoryBadge: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cardProfileBtn: {
    flex: 1,
    backgroundColor: '#ea580c',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardProfileBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardOutboundBtn: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingVertical: 11,
    borderRadius: 12,
  },
  cardOutboundBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardCallIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  cardCallBtnLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  allEligibleBannerCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
    gap: 12,
  },
  allEligibleBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  allEligibleBannerSub: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
  allEligibleBannerBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allEligibleBannerBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  pageBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  pageIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  centerLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyActionsRow: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  seeAllEligibleBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  seeAllEligibleBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  resetFiltersBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetFiltersBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
  },
  cityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  cityModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    padding: 20,
  },
  cityModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cityModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  cityModalCloseBtn: {
    padding: 4,
  },
  citySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  citySearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cityItemActive: {
    backgroundColor: '#fff7ed',
    borderRadius: 10,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalBrandLogoBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBrandLogoImg: {
    width: 20,
    height: 20,
  },
  cityItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  cityItemTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    padding: 18,
  },
  detailModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '88%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 14,
  },
  detailShowcaseTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  detailShowcaseTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ea580c',
  },
  detailVerifiedTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  detailVerifiedTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1d4ed8',
  },
  detailBusinessName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  detailCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCoverBox: {
    height: 160,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#0b101e',
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailCoverImg: {
    width: '100%',
    height: '100%',
  },
  detailCoverFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  detailCoverFallbackText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  detailRatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  detailFieldBlock: {
    marginBottom: 14,
  },
  detailFieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  detailFieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
  },
  detailScoreText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  detailReviewText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  detailTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailBrandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  detailCategoryBadge: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailCategoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  detailPhoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  detailPhoneText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailPhoneCallPill: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailPhoneCallPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  detailCloseActionBtn: {
    flex: 0.8,
    backgroundColor: '#f1f5f9',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  detailIsiCepteBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingVertical: 13,
    borderRadius: 12,
  },
  detailIsiCepteBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalEdgeSwipeZoneLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 26,
    zIndex: 50,
  },
  modalEdgeSwipeZoneRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 26,
    zIndex: 50,
  },
  modalDragHandleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  modalDragHandleBar: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
});
