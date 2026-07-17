import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: windowWidth } = Dimensions.get('window');
const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface Brand {
  id: string;
  name: string;
}

interface Model {
  id: string;
  name: string;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  year: number;
  mileage: number;
  city: string;
  district?: string;
  media?: Array<{ url: string }>;
  vehicleVariant: {
    year: number;
    brand: { name: string };
    model: { name: string };
  };
}

export default function MobileDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; firstName?: string; role?: string } | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);

  // Floating Popover Menu state
  const [menuOpen, setMenuOpen] = useState(false);

  // Dropdown States
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);
  const [engines, setEngines] = useState<string[]>([]);
  const [fuelTypes, setFuelTypes] = useState<string[]>([]);
  const [transmissions, setTransmissions] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedBodyType, setSelectedBodyType] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>('');
  const [selectedFuelType, setSelectedFuelType] = useState<string>('');
  const [selectedTransmission, setSelectedTransmission] = useState<string>('');
  const [selectedTrim, setSelectedTrim] = useState<string>('');

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [activeStep, setActiveStep] = useState<
    'brand' | 'model' | 'year' | 'bodyType' | 'engine' | 'fuelType' | 'transmission' | 'trim'
  >('brand');
  const [searchText, setSearchText] = useState('');
  const [matchingVariant, setMatchingVariant] = useState(false);

  // Favorites Local State
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkUserSession();
    fetchFeaturedListings();
    fetchBrands();
  }, []);

  // Cascading Fetches
  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand.id);
    } else {
      setModels([]);
      setSelectedModel(null);
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand && selectedModel) {
      fetchYears();
    } else {
      setYears([]);
      setSelectedYear('');
    }
  }, [selectedBrand, selectedModel]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear) {
      fetchBodyTypes();
    } else {
      setBodyTypes([]);
      setSelectedBodyType('');
    }
  }, [selectedBrand, selectedModel, selectedYear]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear && selectedBodyType) {
      fetchEngines();
    } else {
      setEngines([]);
      setSelectedEngine('');
    }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear && selectedBodyType && selectedEngine) {
      fetchFuelTypes();
    } else {
      setFuelTypes([]);
      setSelectedFuelType('');
    }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType, selectedEngine]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear && selectedBodyType && selectedEngine && selectedFuelType) {
      fetchTransmissions();
    } else {
      setTransmissions([]);
      setSelectedTransmission('');
    }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType, selectedEngine, selectedFuelType]);

  useEffect(() => {
    if (
      selectedBrand &&
      selectedModel &&
      selectedYear &&
      selectedBodyType &&
      selectedEngine &&
      selectedFuelType &&
      selectedTransmission
    ) {
      fetchTrims();
    } else {
      setTrims([]);
      setSelectedTrim('');
    }
  }, [
    selectedBrand,
    selectedModel,
    selectedYear,
    selectedBodyType,
    selectedEngine,
    selectedFuelType,
    selectedTransmission,
  ]);

  const checkUserSession = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          setUser(profile);
        } else {
          await AsyncStorage.removeItem('accessToken');
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  };

  const fetchFeaturedListings = async () => {
    setLoadingListings(true);
    try {
      const res = await fetch(`${API_URL}/listings?limit=6`);
      if (res.ok) {
        const data = await res.json();
        const items = data.listings || data || [];
        setListings(items);

        const favs: Record<string, boolean> = {};
        items.forEach((x: any) => {
          favs[x.id] = x.isFavorite || false;
        });
        setFavorites(favs);
      }
    } catch (err) {
      console.error('Fetch listings error:', err);
    } finally {
      setLoadingListings(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await fetch(`${API_URL}/vehicles/brands`);
      if (res.ok) {
        const data = await res.json();
        setBrands(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchModels = async (brandId: string) => {
    try {
      const res = await fetch(`${API_URL}/vehicles/models?brandId=${brandId}`);
      if (res.ok) {
        const data = await res.json();
        setModels(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchYears = async () => {
    if (!selectedBrand || !selectedModel) return;
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(
          selectedBrand.name
        )}&modelFamily=${encodeURIComponent(selectedModel.name)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) setYears(data.data.map((y: any) => y.value.toString()));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBodyTypes = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear) return;
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/body-types?brand=${encodeURIComponent(
          selectedBrand.name
        )}&modelFamily=${encodeURIComponent(selectedModel.name)}&year=${selectedYear}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) setBodyTypes(data.data.map((b: any) => b.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEngines = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear || !selectedBodyType) return;
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/engines?brand=${encodeURIComponent(
          selectedBrand.name
        )}&modelFamily=${encodeURIComponent(
          selectedModel.name
        )}&year=${selectedYear}&bodyType=${selectedBodyType}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) setEngines(data.data.map((b: any) => b.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFuelTypes = async () => {
    if (!selectedBrand || !selectedModel || !selectedYear || !selectedBodyType || !selectedEngine) return;
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/fuel-types?brand=${encodeURIComponent(
          selectedBrand.name
        )}&modelFamily=${encodeURIComponent(
          selectedModel.name
        )}&year=${selectedYear}&bodyType=${selectedBodyType}&engine=${encodeURIComponent(
          selectedEngine
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) setFuelTypes(data.data.map((b: any) => b.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransmissions = async () => {
    if (
      !selectedBrand ||
      !selectedModel ||
      !selectedYear ||
      !selectedBodyType ||
      !selectedEngine ||
      !selectedFuelType
    )
      return;
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/transmissions?brand=${encodeURIComponent(
          selectedBrand.name
        )}&modelFamily=${encodeURIComponent(
          selectedModel.name
        )}&year=${selectedYear}&bodyType=${selectedBodyType}&engine=${encodeURIComponent(
          selectedEngine
        )}&fuelType=${selectedFuelType}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) setTransmissions(data.data.map((b: any) => b.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTrims = async () => {
    if (
      !selectedBrand ||
      !selectedModel ||
      !selectedYear ||
      !selectedBodyType ||
      !selectedEngine ||
      !selectedFuelType ||
      !selectedTransmission
    )
      return;
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/trims?brand=${encodeURIComponent(
          selectedBrand.name
        )}&modelFamily=${encodeURIComponent(
          selectedModel.name
        )}&year=${selectedYear}&bodyType=${selectedBodyType}&engine=${encodeURIComponent(
          selectedEngine
        )}&fuelType=${selectedFuelType}&transmission=${selectedTransmission}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) setTrims(data.data.map((b: any) => b.value));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openSelector = (
    step: 'brand' | 'model' | 'year' | 'bodyType' | 'engine' | 'fuelType' | 'transmission' | 'trim'
  ) => {
    if (step === 'model' && !selectedBrand) {
      alert('Lütfen önce marka seçiniz.');
      return;
    }
    if (step === 'year' && !selectedModel) {
      alert('Lütfen önce model seçiniz.');
      return;
    }
    if (step === 'bodyType' && !selectedYear) {
      alert('Lütfen önce model yılı seçiniz.');
      return;
    }
    if (step === 'engine' && !selectedBodyType) {
      alert('Lütfen önce kasa tipi seçiniz.');
      return;
    }
    if (step === 'fuelType' && !selectedEngine) {
      alert('Lütfen önce motor seçiniz.');
      return;
    }
    if (step === 'transmission' && !selectedFuelType) {
      alert('Lütfen önce yakıt türü seçiniz.');
      return;
    }
    if (step === 'trim' && !selectedTransmission) {
      alert('Lütfen önce şanzıman seçiniz.');
      return;
    }
    setActiveStep(step);
    setSearchText('');
    setModalVisible(true);
  };

  const selectOption = (item: any) => {
    if (activeStep === 'brand') {
      setSelectedBrand(item);
      setSelectedModel(null);
      setSelectedYear('');
      setSelectedBodyType('');
      setSelectedEngine('');
      setSelectedFuelType('');
      setSelectedTransmission('');
      setSelectedTrim('');
    } else if (activeStep === 'model') {
      setSelectedModel(item);
      setSelectedYear('');
      setSelectedBodyType('');
      setSelectedEngine('');
      setSelectedFuelType('');
      setSelectedTransmission('');
      setSelectedTrim('');
    } else if (activeStep === 'year') {
      setSelectedYear(item.name);
      setSelectedBodyType('');
      setSelectedEngine('');
      setSelectedFuelType('');
      setSelectedTransmission('');
      setSelectedTrim('');
    } else if (activeStep === 'bodyType') {
      setSelectedBodyType(item.name);
      setSelectedEngine('');
      setSelectedFuelType('');
      setSelectedTransmission('');
      setSelectedTrim('');
    } else if (activeStep === 'engine') {
      setSelectedEngine(item.name);
      setSelectedFuelType('');
      setSelectedTransmission('');
      setSelectedTrim('');
    } else if (activeStep === 'fuelType') {
      setSelectedFuelType(item.name);
      setSelectedTransmission('');
      setSelectedTrim('');
    } else if (activeStep === 'transmission') {
      setSelectedTransmission(item.name);
      setSelectedTrim('');
    } else if (activeStep === 'trim') {
      setSelectedTrim(item.name);
    }
    setModalVisible(false);
  };

  const handleFavoriteToggle = async (id: string) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      alert('Devam etmek için giriş yapmalısınız.');
      router.push('/login');
      return;
    }
    const currentFav = favorites[id];
    setFavorites((prev) => ({ ...prev, [id]: !currentFav }));
    try {
      const response = await fetch(`${API_URL}/listings/${id}/favorite`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error();
    } catch {
      setFavorites((prev) => ({ ...prev, [id]: currentFav }));
      alert('Favori işlemi başarısız oldu.');
    }
  };

  const handleAnalyze = async () => {
    if (
      !selectedBrand ||
      !selectedModel ||
      !selectedYear ||
      !selectedBodyType ||
      !selectedEngine ||
      !selectedFuelType ||
      !selectedTransmission ||
      !selectedTrim
    ) {
      alert('Lütfen tüm 8 filtre seçimini tamamlayınız.');
      return;
    }

    setMatchingVariant(true);
    try {
      const url = `${API_URL}/vehicle-filters/match-variant?brand=${encodeURIComponent(
        selectedBrand.name
      )}&modelFamily=${encodeURIComponent(
        selectedModel.name
      )}&year=${selectedYear}&bodyType=${selectedBodyType}&engine=${encodeURIComponent(
        selectedEngine
      )}&fuelType=${selectedFuelType}&transmission=${selectedTransmission}&trim=${encodeURIComponent(
        selectedTrim
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success && data.variantId) {
        router.push({
          pathname: '/vehicle-report',
          params: { variantId: data.variantId },
        });
      } else {
        alert('Seçtiğiniz kriterlerde doğrulanmış bir araç varyantı bulunamadı.');
      }
    } catch (e) {
      console.error(e);
      alert('Sunucuyla bağlantı kurulurken bir hata oluştu.');
    } finally {
      setMatchingVariant(false);
    }
  };

  const getFilteredOptions = () => {
    let list: any[] = [];
    if (activeStep === 'brand') {
      list = brands;
    } else if (activeStep === 'model') {
      list = models;
    } else if (activeStep === 'year') {
      list = years.map((x) => ({ id: x, name: x }));
    } else if (activeStep === 'bodyType') {
      list = bodyTypes.map((x) => ({ id: x, name: x }));
    } else if (activeStep === 'engine') {
      list = engines.map((x) => ({ id: x, name: x }));
    } else if (activeStep === 'fuelType') {
      list = fuelTypes.map((x) => ({ id: x, name: x }));
    } else if (activeStep === 'transmission') {
      list = transmissions.map((x) => ({ id: x, name: x }));
    } else if (activeStep === 'trim') {
      list = trims.map((x) => ({ id: x, name: x }));
    }

    if (!searchText) return list;
    return list.filter((item) =>
      item.name.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  return (
    <View style={styles.outerContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Speed Lines Header & Menu */}
        <View style={styles.topHeader}>
          <View style={styles.logoRow}>
            <View style={styles.speedLogo}>
              <View style={styles.speedBar1} />
              <View style={styles.speedBar2} />
              <View style={styles.speedBar3} />
            </View>
            <Text style={styles.logoTextMain}>
              Torque<Text style={styles.logoTextSub}>Scout</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.headerMenuBtn}>
            <Ionicons name="menu-outline" size={24} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        <Text style={styles.topSubtitle}>İlanı gör, aracı anla, doğru kararı ver.</Text>

        {/* User Greeting / Login Banner */}
        <View style={styles.greetingContainer}>
          {user ? (
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.firstName ? user.firstName[0].toUpperCase() : user.email[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
                <Text style={styles.userName}>{user.firstName || user.email.split('@')[0]}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.loginBanner} onPress={() => router.push('/login')}>
              <Ionicons name="person-circle-outline" size={32} color="#f97316" />
              <View style={styles.loginBannerTextContainer}>
                <Text style={styles.loginBannerTitle}>Giriş Yap / Üye Ol</Text>
                <Text style={styles.loginBannerDesc}>Rapor kaydetmek ve ilan vermek için giriş yapın</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Hızlı Araç Sorgulama Form Card - Detailed with 8 cascade filters */}
        <View style={styles.queryCard}>
          <Text style={styles.queryCardTitle}>🔍 Hızlı Araç Sorgulama</Text>

          {/* 1. Brand Row */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Marka</Text>
            <TouchableOpacity style={styles.dropdownTrigger} onPress={() => openSelector('brand')}>
              <Text style={[styles.dropdownValue, !selectedBrand && styles.dropdownPlaceholder]}>
                {selectedBrand ? selectedBrand.name : 'Seçiniz...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* 2. Model Row */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Model</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, !selectedBrand && styles.dropdownDisabled]}
              onPress={() => openSelector('model')}
              disabled={!selectedBrand}
            >
              <Text style={[styles.dropdownValue, !selectedModel && styles.dropdownPlaceholder]}>
                {selectedModel ? selectedModel.name : 'Seçiniz...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* 3. Model Yılı Row */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Model Yılı</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, !selectedModel && styles.dropdownDisabled]}
              onPress={() => openSelector('year')}
              disabled={!selectedModel}
            >
              <Text style={[styles.dropdownValue, !selectedYear && styles.dropdownPlaceholder]}>
                {selectedYear ? selectedYear : 'Seçiniz...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Show the remaining 5 filters only if Model Yılı is selected */}
          {!!selectedYear && (
            <View style={{ gap: 14 }}>
              {/* 4. Kasa Tipi Row */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kasa Tipi</Text>
                <TouchableOpacity
                  style={[styles.dropdownTrigger, !selectedYear && styles.dropdownDisabled]}
                  onPress={() => openSelector('bodyType')}
                  disabled={!selectedYear}
                >
                  <Text style={[styles.dropdownValue, !selectedBodyType && styles.dropdownPlaceholder]}>
                    {selectedBodyType ? selectedBodyType : 'Seçiniz...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* 5. Motor Row */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Motor</Text>
                <TouchableOpacity
                  style={[styles.dropdownTrigger, !selectedBodyType && styles.dropdownDisabled]}
                  onPress={() => openSelector('engine')}
                  disabled={!selectedBodyType}
                >
                  <Text style={[styles.dropdownValue, !selectedEngine && styles.dropdownPlaceholder]}>
                    {selectedEngine ? selectedEngine : 'Seçiniz...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* 6. Yakıt Türü Row */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Yakıt Türü</Text>
                <TouchableOpacity
                  style={[styles.dropdownTrigger, !selectedEngine && styles.dropdownDisabled]}
                  onPress={() => openSelector('fuelType')}
                  disabled={!selectedEngine}
                >
                  <Text style={[styles.dropdownValue, !selectedFuelType && styles.dropdownPlaceholder]}>
                    {selectedFuelType ? selectedFuelType : 'Seçiniz...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* 7. Şanzıman Row */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Şanzıman</Text>
                <TouchableOpacity
                  style={[styles.dropdownTrigger, !selectedFuelType && styles.dropdownDisabled]}
                  onPress={() => openSelector('transmission')}
                  disabled={!selectedFuelType}
                >
                  <Text style={[styles.dropdownValue, !selectedTransmission && styles.dropdownPlaceholder]}>
                    {selectedTransmission ? selectedTransmission : 'Seçiniz...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* 8. Paket Row */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Paket / Trim</Text>
                <TouchableOpacity
                  style={[styles.dropdownTrigger, !selectedTransmission && styles.dropdownDisabled]}
                  onPress={() => openSelector('trim')}
                  disabled={!selectedTransmission}
                >
                  <Text style={[styles.dropdownValue, !selectedTrim && styles.dropdownPlaceholder]}>
                    {selectedTrim ? selectedTrim : 'Seçiniz...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Submit Action */}
          <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} activeOpacity={0.8} disabled={matchingVariant}>
            {matchingVariant ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.analyzeBtnText}>Aracı İncele & AI Raporu Al</Text>
            )}
          </TouchableOpacity>

          {/* Register Prompt */}
          {!user && (
            <TouchableOpacity style={styles.registerPromptBtn} onPress={() => router.push('/register')} activeOpacity={0.8}>
              <Text style={styles.registerPromptText}>
                İlanları incelemek ve rapor almak için ücretsiz kayıt olun
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Featured Listings Carousel */}
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Öne Çıkan İlanlar</Text>
            <TouchableOpacity onPress={() => router.push('/listings')}>
              <Text style={styles.seeAllText}>Tümünü Gör ➔</Text>
            </TouchableOpacity>
          </View>

          {loadingListings ? (
            <ActivityIndicator size="small" color="#f97316" style={{ marginVertical: 30 }} />
          ) : listings.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
              {listings.map((item) => {
                const coverImage =
                  item.media?.[0]?.url ||
                  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600&auto=format&fit=crop';
                const isFavorite = favorites[item.id] || false;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.featuredCard}
                    onPress={() => router.push({ pathname: '/listings/[id]', params: { id: item.id } })}
                  >
                    <View style={styles.cardImageContainer}>
                      <Image source={{ uri: coverImage }} style={styles.cardImage} />
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>🤖 AI Analizi İlan</Text>
                      </View>
                      <TouchableOpacity style={styles.heartBtn} onPress={() => handleFavoriteToggle(item.id)}>
                        <Ionicons
                          name={isFavorite ? 'heart' : 'heart-outline'}
                          size={16}
                          color={isFavorite ? '#ef4444' : '#fff'}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardBrandModel} numberOfLines={1}>
                        {item.vehicleVariant?.brand.name} {item.vehicleVariant?.model.name}
                      </Text>
                      <Text style={styles.cardEngine} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.cardDetails}>
                        {item.year} • {item.mileage.toLocaleString('tr-TR')} km
                      </Text>
                      <View style={styles.cardBottom}>
                        <Text style={styles.cardLocation}>📍 {item.city}</Text>
                        <Text style={styles.cardPrice}>₺{item.price.toLocaleString('tr-TR')}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>Gösterilecek ilan bulunamadı.</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Popover Action Menu Button (Keşfet Popover) */}
      {menuOpen && <View style={styles.backdrop} onTouchStart={() => setMenuOpen(false)} />}
      
      <View style={styles.floatingContainer}>
        {menuOpen && (
          <View style={styles.floatingMenu}>
            <TouchableOpacity
              style={[styles.menuOption, { backgroundColor: '#f97316' }]}
              onPress={() => {
                setMenuOpen(false);
                router.push('/ilan-akisi');
              }}
            >
              <Ionicons name="film-outline" size={18} color="white" />
              <Text style={styles.menuOptionText}>İlan Akışı</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { backgroundColor: '#3b82f6' }]}
              onPress={() => {
                setMenuOpen(false);
                router.push('/(tabs)/vehicle-guide');
              }}
            >
              <Ionicons name="book-outline" size={18} color="white" />
              <Text style={styles.menuOptionText}>Araç Rehberi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { backgroundColor: '#ec4899' }]}
              onPress={() => {
                setMenuOpen(false);
                router.push('/(tabs)/aracini-bul');
              }}
            >
              <Ionicons name="car-sport-outline" size={18} color="white" />
              <Text style={styles.menuOptionText}>Aracını Bul</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.floatingActionBtn, menuOpen && styles.floatingActionBtnActive]}
          onPress={() => setMenuOpen(!menuOpen)}
          activeOpacity={0.8}
        >
          <Ionicons name={menuOpen ? 'close' : 'compass'} size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Options Selection Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeStep === 'brand'
                  ? 'Marka Seçin'
                  : activeStep === 'model'
                  ? 'Model Seçin'
                  : activeStep === 'year'
                  ? 'Model Yılı Seçin'
                  : activeStep === 'bodyType'
                  ? 'Kasa Tipi Seçin'
                  : activeStep === 'engine'
                  ? 'Motor Seçin'
                  : activeStep === 'fuelType'
                  ? 'Yakıt Türü Seçin'
                  : activeStep === 'transmission'
                  ? 'Şanzıman Seçin'
                  : 'Paket/Trim Seçin'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#f8fafc" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBar}>
              <Ionicons name="search" size={16} color="#64748b" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#64748b"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            <FlatList
              data={getFilteredOptions()}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.optionRow} onPress={() => selectOption(item)}>
                  <Text style={styles.optionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#070a13',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speedLogo: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
  },
  speedBar1: {
    width: 20,
    height: 2.5,
    backgroundColor: '#f8fafc',
    borderRadius: 1,
  },
  speedBar2: {
    width: 14,
    height: 2.5,
    backgroundColor: '#60a5fa',
    borderRadius: 1,
  },
  speedBar3: {
    width: 8,
    height: 2.5,
    backgroundColor: '#3b82f6',
    borderRadius: 1,
  },
  logoTextMain: {
    fontSize: 18,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  logoTextSub: {
    color: '#60a5fa',
  },
  headerMenuBtn: {
    padding: 4,
  },
  topSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  greetingContainer: {
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  welcomeText: {
    color: '#64748b',
    fontSize: 10,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  loginBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    padding: 14,
    borderRadius: 20,
    gap: 12,
  },
  loginBannerTextContainer: {
    flex: 1,
  },
  loginBannerTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  loginBannerDesc: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  queryCard: {
    backgroundColor: '#0b0f19',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 24,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 5,
  },
  queryCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 4,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070a13',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dropdownDisabled: {
    opacity: 0.4,
  },
  dropdownValue: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },
  dropdownPlaceholder: {
    color: '#475569',
    fontWeight: '500',
  },
  analyzeBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  analyzeBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
  },
  registerPromptBtn: {
    backgroundColor: '#f97316',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerPromptText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 15,
  },
  featuredSection: {
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f8fafc',
  },
  seeAllText: {
    color: '#f97316',
    fontSize: 11,
    fontWeight: 'bold',
  },
  carouselContainer: {
    gap: 16,
    paddingRight: 16,
  },
  featuredCard: {
    width: 200,
    backgroundColor: '#0b0f19',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardImageContainer: {
    height: 120,
    width: '100%',
    position: 'relative',
    backgroundColor: '#070a13',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  aiBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 12,
    gap: 4,
  },
  cardBrandModel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#f8fafc',
  },
  cardEngine: {
    fontSize: 10,
    color: '#64748b',
  },
  cardDetails: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  cardLocation: {
    fontSize: 9,
    color: '#475569',
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: '900',
    color: '#f97316',
  },
  emptyText: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    marginVertical: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 90,
  },
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
    gap: 12,
    zIndex: 100,
  },
  floatingActionBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingActionBtnActive: {
    backgroundColor: '#1e293b',
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  floatingMenu: {
    gap: 10,
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  menuOptionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070a13',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    paddingVertical: 10,
    marginLeft: 8,
  },
  optionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
});
