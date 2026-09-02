import React, { useEffect, useState, useRef } from 'react';
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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, Line, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: windowWidth } = Dimensions.get('window');
const API_URL = 'https://used-car-api-hzmu.onrender.com';

interface Brand {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface Model {
  id: string;
  name: string;
}

interface ShowcaseItem {
  id: string;
  title: string;
  price: number;
  year: number;
  mileage: number;
  city: string;
  isUrgent?: boolean;
  imageUrl: string;
  brandName: string;
  modelName: string;
}

const DEFAULT_VITRIN_ITEMS: ShowcaseItem[] = [
  {
    id: 'mock-1',
    title: 'BMW 3 Serisi 320i M Sport',
    price: 1295000,
    year: 2020,
    mileage: 68000,
    city: 'İstanbul',
    isUrgent: true,
    imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980adade?q=80&w=800&auto=format&fit=crop',
    brandName: 'BMW',
    modelName: '3 Serisi',
  },
  {
    id: 'mock-2',
    title: 'Volkswagen Golf 1.5 TSI Highline',
    price: 875000,
    year: 2019,
    mileage: 84000,
    city: 'Ankara',
    isUrgent: false,
    imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=800&auto=format&fit=crop',
    brandName: 'Volkswagen',
    modelName: 'Golf',
  },
  {
    id: 'mock-3',
    title: 'Renault Megane 1.3 TCe Icon',
    price: 925000,
    year: 2021,
    mileage: 45000,
    city: 'İzmir',
    isUrgent: false,
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop',
    brandName: 'Renault',
    modelName: 'Megane',
  },
  {
    id: 'mock-4',
    title: 'Peugeot 3008 1.5 BlueHDi Allure',
    price: 1075000,
    year: 2020,
    mileage: 72000,
    city: 'Bursa',
    isUrgent: false,
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop',
    brandName: 'Peugeot',
    modelName: '3008',
  },
  {
    id: 'mock-5',
    title: 'Toyota Corolla 1.6 Vision',
    price: 795000,
    year: 2018,
    mileage: 91000,
    city: 'Antalya',
    isUrgent: false,
    imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?q=80&w=800&auto=format&fit=crop',
    brandName: 'Toyota',
    modelName: 'Corolla',
  },
  {
    id: 'mock-6',
    title: 'Audi A4 35 TDI Design',
    price: 1325000,
    year: 2020,
    mileage: 63000,
    city: 'İstanbul',
    isUrgent: false,
    imageUrl: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=800&auto=format&fit=crop',
    brandName: 'Audi',
    modelName: 'A4',
  },
];

// BRAND LOGO MAP FOR POPULAR BRANDS & ALL BRANDS
const BRAND_LOGOS: Record<string, string> = {
  Volkswagen: 'https://www.carlogos.org/car-logos/volkswagen-logo.png',
  BMW: 'https://www.carlogos.org/car-logos/bmw-logo.png',
  'Mercedes-Benz': 'https://www.carlogos.org/car-logos/mercedes-benz-logo.png',
  Mercedes: 'https://www.carlogos.org/car-logos/mercedes-benz-logo.png',
  Renault: 'https://www.carlogos.org/car-logos/renault-logo.png',
  Audi: 'https://www.carlogos.org/car-logos/audi-logo.png',
  Ford: 'https://www.carlogos.org/car-logos/ford-logo.png',
  Fiat: 'https://www.carlogos.org/car-logos/fiat-logo.png',
  Toyota: 'https://www.carlogos.org/car-logos/toyota-logo.png',
  Hyundai: 'https://www.carlogos.org/car-logos/hyundai-logo.png',
  Peugeot: 'https://www.carlogos.org/car-logos/peugeot-logo.png',
  Honda: 'https://www.carlogos.org/car-logos/honda-logo.png',
  Opel: 'https://www.carlogos.org/car-logos/opel-logo.png',
  Nissan: 'https://www.carlogos.org/car-logos/nissan-logo.png',
  Citroën: 'https://www.carlogos.org/car-logos/citroen-logo.png',
  Citroen: 'https://www.carlogos.org/car-logos/citroen-logo.png',
  SEAT: 'https://www.carlogos.org/car-logos/seat-logo.png',
  Seat: 'https://www.carlogos.org/car-logos/seat-logo.png',
  Škoda: 'https://www.carlogos.org/car-logos/skoda-logo.png',
  Skoda: 'https://www.carlogos.org/car-logos/skoda-logo.png',
  Volvo: 'https://www.carlogos.org/car-logos/volvo-logo.png',
  'Alfa Romeo': 'https://www.carlogos.org/car-logos/alfa-romeo-logo.png',
  Abarth: 'https://www.carlogos.org/car-logos/abarth-logo.png',
  BYD: 'https://www.carlogos.org/car-logos/byd-logo.png',
  Cadillac: 'https://www.carlogos.org/car-logos/cadillac-logo.png',
  Chery: 'https://www.carlogos.org/car-logos/chery-logo.png',
  Chevrolet: 'https://www.carlogos.org/car-logos/chevrolet-logo.png',
  Cupra: 'https://www.carlogos.org/car-logos/cupra-logo.png',
  Dacia: 'https://www.carlogos.org/car-logos/dacia-logo.png',
  Kia: 'https://www.carlogos.org/car-logos/kia-logo.png',
  'Land Rover': 'https://www.carlogos.org/car-logos/land-rover-logo.png',
  MINI: 'https://www.carlogos.org/car-logos/mini-logo.png',
  Mini: 'https://www.carlogos.org/car-logos/mini-logo.png',
  Porsche: 'https://www.carlogos.org/car-logos/porsche-logo.png',
  Tesla: 'https://www.carlogos.org/car-logos/tesla-logo.png',
};

const POPULAR_BRAND_NAMES = ['Volkswagen', 'BMW', 'Mercedes-Benz', 'Renault', 'Audi'];
const ALPHABET_INDEX = ['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'Y', 'Z'];

// ULTRA HIGH QUALITY AUTOMOTIVE BODY TYPE ILLUSTRATION ASSETS
const BODY_TYPE_IMAGES: Record<string, any> = {
  sedan: require('../../../assets/images/body-types/sedan.jpg'),
  hatchback: require('../../../assets/images/body-types/hatchback.jpg'),
  'station wagon': require('../../../assets/images/body-types/station_wagon.jpg'),
  wagon: require('../../../assets/images/body-types/station_wagon.jpg'),
  coupe: require('../../../assets/images/body-types/coupe.jpg'),
  suv: require('../../../assets/images/body-types/suv.jpg'),
  cabrio: require('../../../assets/images/body-types/cabrio.jpg'),
  convertible: require('../../../assets/images/body-types/cabrio.jpg'),
};

const renderBodyTypeImage = (type: string) => {
  const t = type.toLowerCase();
  let imgSource = BODY_TYPE_IMAGES.sedan;

  if (t.includes('hatchback')) imgSource = BODY_TYPE_IMAGES.hatchback;
  else if (t.includes('wagon') || t.includes('station')) imgSource = BODY_TYPE_IMAGES['station wagon'];
  else if (t.includes('coupe')) imgSource = BODY_TYPE_IMAGES.coupe;
  else if (t.includes('suv')) imgSource = BODY_TYPE_IMAGES.suv;
  else if (t.includes('cabrio') || t.includes('convertible')) imgSource = BODY_TYPE_IMAGES.cabrio;

  return (
    <Image
      source={imgSource}
      style={styles.bodyTypeCardImage}
      resizeMode="contain"
    />
  );
};

// CUSTOM SVG GEAR SHIFT ICONS FOR STEP 7 (ŞANZIMAN)
function AutomaticGearIcon({ color = '#ea580c' }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3C9.79086 3 8 4.79086 8 7C8 8.85526 9.26737 10.4144 10.9856 10.8671V17.5C10.9856 18.3284 10.314 19 9.4856 19H8V21H16V19H14.5144C13.686 19 13.0144 18.3284 13.0144 17.5V10.8671C14.7326 10.4144 16 8.85526 16 7C16 4.79086 14.2091 3 12 3Z"
        fill={color}
      />
      <Rect x="10.5" y="6" width="3" height="2" rx="1" fill="#ffffff" />
    </Svg>
  );
}

function ManualGearIcon({ color = '#0f172a' }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M7 5V19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M12 5V19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M17 5V19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M7 12H17" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

const renderTransmissionIcon = (transName: string, isSelected: boolean) => {
  const t = transName.toLowerCase();
  const isAuto = t.includes('otomatik') && !t.includes('yarı');

  return (
    <View style={[styles.fuelIconCircle, { backgroundColor: isAuto ? '#fff7ed' : '#f1f5f9' }]}>
      {isAuto ? (
        <AutomaticGearIcon color="#ea580c" />
      ) : (
        <ManualGearIcon color="#0f172a" />
      )}
    </View>
  );
};

// CUSTOM SVG LOGOS FOR STEP 8 (DONANIM PAKETİ) MATCHING REFERENCE SCREENSHOT
function MSportBadgeLogo() {
  return (
    <Svg width={42} height={20} viewBox="0 0 44 20" fill="none">
      <Path d="M2 18L7 2H11L6 18H2Z" fill="#00a3e0" />
      <Path d="M9 18L14 2H18L13 18H9Z" fill="#00205b" />
      <Path d="M16 18L21 2H25L20 18H16Z" fill="#e30613" />
      <Path d="M25 18V2H29.5L32.5 11L35.5 2H40V18H36.5V7.5L33.5 16H32.5L29.5 7.5V18H25Z" fill="#475569" />
    </Svg>
  );
}

function TrimWingLogo({ color = '#475569' }: { color?: string }) {
  return (
    <Svg width={36} height={18} viewBox="0 0 36 18" fill="none">
      <Path
        d="M2 9C7 5 13 4 18 8C23 4 29 5 34 9C29 13 23 14 18 10C13 14 7 13 2 9Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="18" cy="9" r="2" fill={color} />
    </Svg>
  );
}

const renderTrimBadge = (trimName: string) => {
  return (
    <View style={[styles.fuelIconCircle, { backgroundColor: '#fff7ed' }]}>
      <Ionicons name="sparkles" size={18} color="#ea580c" />
    </View>
  );
};

const getTrimSubtitle = (trimName: string) => {
  const t = trimName.toLowerCase();
  if (t.includes('m sport')) return 'Dinamik sürüş odaklı sportif donanım paketi.';
  if (t.includes('sport line') || t.includes('sport')) return 'Sportif tasarım ve konforu bir arada sunar.';
  if (t.includes('luxury')) return 'Üst düzey konfor ve şık tasarım.';
  if (t.includes('edition') || t.includes('executive')) return 'Özel tasarım ve kapsamlı teknoloji paketi.';
  return 'Aracınızın konfor, tasarım ve performans paket seçeneği.';
};

// FUEL TYPE ICON HELPER WITH DISTINCT COLORS MATCHING REFERENCE SCREENSHOT
const renderFuelTypeIcon = (fuelName: string) => {
  const f = fuelName.toLowerCase();
  let iconName: keyof typeof Ionicons.glyphMap = 'color-fill';
  let iconColor = '#ea580c';
  let bgColor = '#fff7ed';

  if (f.includes('dizel') || f.includes('diesel')) {
    iconName = 'water';
    iconColor = '#1d4ed8';
    bgColor = '#eff6ff';
  } else if (f.includes('plug-in')) {
    iconName = 'hardware-chip-outline';
    iconColor = '#0d9488';
    bgColor = '#f0fdfa';
  } else if (f.includes('hibrit') || f.includes('hybrid')) {
    iconName = 'leaf';
    iconColor = '#16a34a';
    bgColor = '#f0fdf4';
  } else if (f.includes('elektrik') || f.includes('electric')) {
    iconName = 'flash';
    iconColor = '#7c3aed';
    bgColor = '#f5f3ff';
  } else if (f.includes('lpg')) {
    iconName = 'flame';
    iconColor = '#d97706';
    bgColor = '#fff7ed';
  } else {
    // Benzin
    iconName = 'color-fill';
    iconColor = '#ea580c';
    bgColor = '#fff7ed';
  }

  return (
    <View style={[styles.fuelIconCircle, { backgroundColor: bgColor }]}>
      <Ionicons name={iconName} size={20} color={iconColor} />
    </View>
  );
};

// EXACT VECTOR SVG TORK SCOUT SPEED LOGO FROM WEB SITE WITH SMOOTH 60 FPS SINE WAVE NEEDLE
function TorkScoutWebExactAnimatedLogo() {
  const [needleAngle, setNeedleAngle] = useState(-30);

  useEffect(() => {
    let startTime = Date.now();
    let animFrameId: number;

    const animateNeedle = () => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const progress = (Math.sin((elapsedSec * Math.PI) / 1.6) + 1) / 2;
      const angle = -30 + progress * 90;
      setNeedleAngle(angle);
      animFrameId = requestAnimationFrame(animateNeedle);
    };

    animFrameId = requestAnimationFrame(animateNeedle);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  return (
    <View style={webLogoStyles.container}>
      <Svg width={160} height={130} viewBox="-50 0 250 200">
        <Defs>
          <LinearGradient id="t-gradient-large" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#00f2fe" />
            <Stop offset="100%" stopColor="#0062ff" />
          </LinearGradient>

          <LinearGradient id="lines-gradient-large" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#0062ff" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#00f2fe" />
          </LinearGradient>

          <LinearGradient id="arc-gradient-large" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0%" stopColor="#0062ff" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#00f2fe" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Speed Lines */}
        <Rect x="-25" y="75" width="75" height="7" rx="3.5" fill="url(#lines-gradient-large)" />
        <Rect x="-45" y="95" width="100" height="7" rx="3.5" fill="url(#lines-gradient-large)" />
        <Rect x="-20" y="115" width="65" height="7" rx="3.5" fill="url(#lines-gradient-large)" />

        {/* Exact Bright Dashed Speedometer Arc */}
        <Path
          d="M 110 155 A 60 60 0 0 0 160 75"
          fill="none"
          stroke="url(#arc-gradient-large)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="2 6"
        />

        {/* Outer Solid Speedometer Arc */}
        <Path
          d="M 100 165 A 72 72 0 0 0 167 68"
          fill="none"
          stroke="url(#t-gradient-large)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Slanted "T" Lettermark */}
        <Path
          d="M 53 55 L 142 55 L 130 71 L 106 71 L 83 165 L 66 165 L 89 71 L 65 71 Z"
          fill="url(#t-gradient-large)"
        />

        {/* Smooth 60 FPS Animated Speedometer Needle */}
        <G origin="130, 115" rotation={needleAngle}>
          <Line
            x1="130"
            y1="115"
            x2="165"
            y2="115"
            stroke="#00f2fe"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </G>

        {/* Speedometer Hub Center Circle */}
        <Circle cx="130" cy="115" r="6" fill="#00f2fe" />
      </Svg>
    </View>
  );
}

export default function MobileDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; firstName?: string; role?: string } | null>(null);
  const [vitrinListings, setVitrinListings] = useState<ShowcaseItem[]>(DEFAULT_VITRIN_ITEMS);
  const [loadingListings, setLoadingListings] = useState(false);

  // FULL 8-FILTER CASCADING VEHICLE QUERY STATE:
  // 1. Marka | 2. Model Ailesi | 3. Yıl | 4. Kasa Tipi | 5. Motor / Versiyon | 6. Yakıt | 7. Şanzıman | 8. Donanım
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

  // Loading States for Cascading Options
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Modal Control
  const [queryModalVisible, setQueryModalVisible] = useState(false);
  const [modalView, setModalView] = useState<'form' | 'step'>('form');
  const [activeStep, setActiveStep] = useState<
    'brand' | 'model' | 'year' | 'bodyType' | 'engine' | 'fuelType' | 'transmission' | 'trim'
  >('brand');
  const [searchText, setSearchText] = useState('');

  // Favorites Map
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkUserSession();
    fetchFeaturedListings();
    fetchBrands();
  }, []);

  // 1. Brand Changes -> Fetch Models
  useEffect(() => {
    if (selectedBrand) {
      fetchModelsForBrand(selectedBrand.id);
    } else {
      setModels([]);
      setSelectedModel(null);
    }
  }, [selectedBrand]);

  // 2. Model Changes -> Fetch Years
  useEffect(() => {
    if (selectedBrand && selectedModel) {
      fetchYearsForModel(selectedBrand.name, selectedModel.name);
    } else {
      setYears([]);
      setSelectedYear('');
    }
  }, [selectedBrand, selectedModel]);

  // 3. Year Changes -> Fetch Body Types
  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear) {
      fetchBodyTypes(selectedBrand.name, selectedModel.name, selectedYear);
    } else {
      setBodyTypes([]);
      setSelectedBodyType('');
    }
  }, [selectedBrand, selectedModel, selectedYear]);

  // 4. Body Type Changes -> Fetch Engines
  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear) {
      fetchEngines(selectedBrand.name, selectedModel.name, selectedYear, selectedBodyType);
    } else {
      setEngines([]);
      setSelectedEngine('');
    }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType]);

  // 5. Engine Changes -> Fetch Fuel Types
  useEffect(() => {
    if (selectedBrand && selectedModel) {
      fetchFuelTypes(selectedBrand.name, selectedModel.name, selectedYear, selectedBodyType, selectedEngine);
    } else {
      setFuelTypes([]);
      setSelectedFuelType('');
    }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType, selectedEngine]);

  // 6. Fuel Type Changes -> Fetch Transmissions
  useEffect(() => {
    if (selectedBrand && selectedModel) {
      fetchTransmissions(
        selectedBrand.name,
        selectedModel.name,
        selectedYear,
        selectedBodyType,
        selectedEngine,
        selectedFuelType
      );
    } else {
      setTransmissions([]);
      setSelectedTransmission('');
    }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType, selectedEngine, selectedFuelType]);

  // 7. Transmission Changes -> Fetch Trims (Donanım)
  useEffect(() => {
    if (selectedBrand && selectedModel) {
      fetchTrims(
        selectedBrand.name,
        selectedModel.name,
        selectedYear,
        selectedBodyType,
        selectedEngine,
        selectedFuelType,
        selectedTransmission
      );
    } else {
      setTrims([]);
      setSelectedTrim('');
    }
  }, [selectedBrand, selectedModel, selectedYear, selectedBodyType, selectedEngine, selectedFuelType, selectedTransmission]);

  const checkUserSession = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const res = await fetch(`${API_URL}/users/me`, {
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
        const apiItems = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.data?.items)
          ? data.data.items
          : Array.isArray(data?.listings)
          ? data.listings
          : [];

        if (apiItems.length > 0) {
          const formatted: ShowcaseItem[] = apiItems.map((item: any, idx: number) => {
            const brandStr = item.vehicleVariant?.brand?.name || item.customBrand || '';
            const modelStr = item.vehicleVariant?.model?.name || item.customModel || '';
            const computedTitle = item.title || `${brandStr} ${modelStr}`.trim() || 'Araç İlanı';
            
            const priceVal = Number(item.priceAmount || item.price || 0);
            const yearVal = Number(item.modelYear || item.year || item.vehicleVariant?.year || 2020);
            const kmVal = Number(item.kilometers || item.mileage || 0);
            
            const imgUrl = item.media?.[0]?.url || item.images?.[0] || DEFAULT_VITRIN_ITEMS[idx % DEFAULT_VITRIN_ITEMS.length].imageUrl;

            return {
              id: item.id || `api-${idx}`,
              title: computedTitle,
              price: priceVal,
              year: yearVal,
              mileage: kmVal,
              city: item.city ? item.city.trim() : 'İstanbul',
              isUrgent: item.isUrgent || idx === 0,
              imageUrl: imgUrl,
              brandName: brandStr || 'Marka',
              modelName: modelStr || 'Model',
            };
          });
          setVitrinListings(formatted);
        }
      }
    } catch (err) {
      console.error('Fetch listings error:', err);
    } finally {
      setLoadingListings(false);
    }
  };

  // 1. Fetch All Brands
  const fetchBrands = async () => {
    setLoadingOptions(true);
    try {
      const res = await fetch(`${API_URL}/vehicles/brands`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
          setBrands(sorted);
        }
      }
    } catch (err) {
      console.error('Fetch brands error:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  // 2. Fetch Models for Brand
  const fetchModelsForBrand = async (brandId: string) => {
    setLoadingOptions(true);
    try {
      const res = await fetch(`${API_URL}/vehicles/models?brandId=${brandId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
          setModels(sorted);
        }
      }
    } catch (err) {
      console.error('Fetch models error:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  // 3. Fetch Years for Model
  const fetchYearsForModel = async (brandName: string, modelName: string) => {
    setLoadingOptions(true);
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/years?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const list = json.data.map((item: any) =>
            typeof item === 'string' ? item : item.value || item.label || String(item)
          );
          setYears(list);
        } else {
          setYears(Array.from({ length: 27 }, (_, i) => String(2026 - i)));
        }
      } else {
        setYears(Array.from({ length: 27 }, (_, i) => String(2026 - i)));
      }
    } catch (err) {
      console.error('Fetch years error:', err);
      setYears(Array.from({ length: 27 }, (_, i) => String(2026 - i)));
    } finally {
      setLoadingOptions(false);
    }
  };

  // 4. Fetch Body Types (Kasa Tipi)
  const fetchBodyTypes = async (brandName: string, modelName: string, year: string) => {
    setLoadingOptions(true);
    try {
      const res = await fetch(
        `${API_URL}/vehicle-filters/body-types?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}&year=${year}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const list = json.data.map((item: any) =>
            typeof item === 'string' ? item : item.value || item.label || item.name || String(item)
          );
          setBodyTypes(list);
        } else {
          setBodyTypes(['Sedan', 'Hatchback', 'Station Wagon', 'Coupe', 'SUV', 'Cabrio']);
        }
      } else {
        setBodyTypes(['Sedan', 'Hatchback', 'Station Wagon', 'Coupe', 'SUV', 'Cabrio']);
      }
    } catch (err) {
      console.error('Fetch body types error:', err);
      setBodyTypes(['Sedan', 'Hatchback', 'Station Wagon', 'Coupe', 'SUV', 'Cabrio']);
    } finally {
      setLoadingOptions(false);
    }
  };

  // 5. Fetch Engines (Motor / Versiyon)
  const fetchEngines = async (brandName: string, modelName: string, year?: string, bodyType?: string) => {
    setLoadingOptions(true);
    try {
      let url = `${API_URL}/vehicle-filters/engines?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}`;
      if (year) url += `&year=${year}`;
      if (bodyType) url += `&bodyType=${encodeURIComponent(bodyType)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const list = json.data.map((item: any) =>
            typeof item === 'string' ? item : item.value || item.label || item.name || String(item)
          );
          setEngines(list);
        } else {
          setEngines(['320i', '320i xDrive', '330i', '330i xDrive', 'M340i xDrive', 'M3']);
        }
      } else {
        setEngines(['320i', '320i xDrive', '330i', '330i xDrive', 'M340i xDrive', 'M3']);
      }
    } catch (err) {
      console.error('Fetch engines error:', err);
      setEngines(['320i', '320i xDrive', '330i', '330i xDrive', 'M340i xDrive', 'M3']);
    } finally {
      setLoadingOptions(false);
    }
  };

  // 6. Fetch Fuel Types (Yakıt) - DYNAMIC MOTOR-SPECIFIC MATCHING
  const fetchFuelTypes = async (brandName: string, modelName: string, year?: string, bodyType?: string, engine?: string) => {
    setLoadingOptions(true);
    try {
      let url = `${API_URL}/vehicle-filters/fuel-types?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}`;
      if (year) url += `&year=${year}`;
      if (bodyType) url += `&bodyType=${encodeURIComponent(bodyType)}`;
      if (engine) url += `&engine=${encodeURIComponent(engine)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const list = json.data.map((item: any) =>
            typeof item === 'string' ? item : item.value || item.label || item.name || String(item)
          );
          setFuelTypes(list);
          return;
        }
      }

      // Auto-detect based on selected engine code if API falls back
      if (engine) {
        const engLower = engine.toLowerCase();
        if (engLower.endsWith('d') || engLower.includes('tdi') || engLower.includes('dci') || engLower.includes('cdi') || engLower.includes('hdi') || engLower.includes('dizel')) {
          setFuelTypes(['Dizel']);
        } else if (engLower.endsWith('i') || engLower.includes('tsi') || engLower.includes('tce') || engLower.includes('tfsi') || engLower.includes('puretech') || engLower.includes('benzin')) {
          setFuelTypes(['Benzin']);
        } else if (engLower.includes('e-tron') || engLower.includes('ev') || engLower.includes('electric') || engLower.startsWith('i')) {
          setFuelTypes(['Elektrik']);
        } else if (engLower.includes('hybrid') || engLower.includes('phev')) {
          setFuelTypes(['Hibrit', 'Plug-in Hybrid']);
        } else {
          setFuelTypes(['Benzin', 'Dizel', 'Hibrit', 'Plug-in Hybrid', 'Elektrik', 'LPG']);
        }
      } else {
        setFuelTypes(['Benzin', 'Dizel', 'Hibrit', 'Plug-in Hybrid', 'Elektrik', 'LPG']);
      }
    } catch (err) {
      console.error('Fetch fuel types error:', err);
      setFuelTypes(['Benzin', 'Dizel', 'Hibrit', 'Plug-in Hybrid', 'Elektrik', 'LPG']);
    } finally {
      setLoadingOptions(false);
    }
  };

  // 7. Fetch Transmissions (Şanzıman)
  const fetchTransmissions = async (
    brandName: string,
    modelName: string,
    year?: string,
    bodyType?: string,
    engine?: string,
    fuelType?: string
  ) => {
    setLoadingOptions(true);
    try {
      let url = `${API_URL}/vehicle-filters/transmissions?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}`;
      if (year) url += `&year=${year}`;
      if (bodyType) url += `&bodyType=${encodeURIComponent(bodyType)}`;
      if (engine) url += `&engine=${encodeURIComponent(engine)}`;
      if (fuelType) url += `&fuelType=${encodeURIComponent(fuelType)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const list = json.data.map((item: any) =>
            typeof item === 'string' ? item : item.value || item.label || item.name || String(item)
          );
          setTransmissions(list);
        } else {
          setTransmissions(['Otomatik', 'Manuel']);
        }
      } else {
        setTransmissions(['Otomatik', 'Manuel']);
      }
    } catch (err) {
      console.error('Fetch transmissions error:', err);
      setTransmissions(['Otomatik', 'Manuel']);
    } finally {
      setLoadingOptions(false);
    }
  };

  // 8. Fetch Trims (Donanım)
  const fetchTrims = async (
    brandName: string,
    modelName: string,
    year?: string,
    bodyType?: string,
    engine?: string,
    fuelType?: string,
    transmission?: string
  ) => {
    setLoadingOptions(true);
    try {
      let url = `${API_URL}/vehicle-filters/trims?brand=${encodeURIComponent(brandName)}&modelFamily=${encodeURIComponent(modelName)}`;
      if (year) url += `&year=${year}`;
      if (bodyType) url += `&bodyType=${encodeURIComponent(bodyType)}`;
      if (engine) url += `&engine=${encodeURIComponent(engine)}`;
      if (fuelType) url += `&fuelType=${encodeURIComponent(fuelType)}`;
      if (transmission) url += `&transmission=${encodeURIComponent(transmission)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const list = json.data.map((item: any) =>
            typeof item === 'string' ? item : item.value || item.label || item.name || String(item)
          );
          setTrims(list);
        } else {
          setTrims(['M Sport', 'Sport Line', 'Luxury Line']);
        }
      } else {
        setTrims(['M Sport', 'Sport Line', 'Luxury Line']);
      }
    } catch (err) {
      console.error('Fetch trims error:', err);
      setTrims(['M Sport', 'Sport Line', 'Luxury Line']);
    } finally {
      setLoadingOptions(false);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartReport = () => {
    if (selectedBrand && selectedModel) {
      router.push({
        pathname: '/vehicle-report',
        params: {
          brand: selectedBrand.name,
          model: selectedModel.name,
          year: selectedYear || '2020',
          bodyType: selectedBodyType || 'Sedan',
          engine: selectedEngine || '1.6',
          fuel: selectedFuelType || 'Benzin',
          transmission: selectedTransmission || 'Otomatik',
          trim: selectedTrim || 'M Sport',
        },
      });
      setQueryModalVisible(false);
    } else {
      openStepView('brand');
    }
  };

  const openStepView = (
    step: 'brand' | 'model' | 'year' | 'bodyType' | 'engine' | 'fuelType' | 'transmission' | 'trim',
    overrideBrand?: Brand | null,
    overrideModel?: Model | null,
    overrideYear?: string,
    overrideBody?: string,
    overrideEngine?: string,
    overrideFuel?: string,
    overrideTrans?: string
  ) => {
    setActiveStep(step);
    setSearchText('');
    setModalView('step');

    const curBrand = overrideBrand !== undefined ? overrideBrand : selectedBrand;
    const curModel = overrideModel !== undefined ? overrideModel : selectedModel;
    const curYear = overrideYear !== undefined ? overrideYear : selectedYear;
    const curBody = overrideBody !== undefined ? overrideBody : selectedBodyType;
    const curEngine = overrideEngine !== undefined ? overrideEngine : selectedEngine;
    const curFuel = overrideFuel !== undefined ? overrideFuel : selectedFuelType;
    const curTrans = overrideTrans !== undefined ? overrideTrans : selectedTransmission;

    if (step === 'brand' && brands.length === 0) {
      fetchBrands();
    } else if (step === 'model' && curBrand) {
      fetchModelsForBrand(curBrand.id);
    } else if (step === 'year' && curBrand && curModel) {
      fetchYearsForModel(curBrand.name, curModel.name);
    } else if (step === 'bodyType' && curBrand && curModel) {
      fetchBodyTypes(curBrand.name, curModel.name, curYear || '2020');
    } else if (step === 'engine' && curBrand && curModel) {
      fetchEngines(curBrand.name, curModel.name, curYear, curBody);
    } else if (step === 'fuelType' && curBrand && curModel) {
      fetchFuelTypes(curBrand.name, curModel.name, curYear, curBody, curEngine);
    } else if (step === 'transmission' && curBrand && curModel) {
      fetchTransmissions(curBrand.name, curModel.name, curYear, curBody, curEngine, curFuel);
    } else if (step === 'trim' && curBrand && curModel) {
      fetchTrims(curBrand.name, curModel.name, curYear, curBody, curEngine, curFuel, curTrans);
    }
  };

  const handleStepBack = () => {
    switch (activeStep) {
      case 'model':
        openStepView('brand');
        break;
      case 'year':
        openStepView('model');
        break;
      case 'bodyType':
        openStepView('year');
        break;
      case 'engine':
        openStepView('bodyType');
        break;
      case 'fuelType':
        openStepView('engine');
        break;
      case 'transmission':
        openStepView('fuelType');
        break;
      case 'trim':
        openStepView('transmission');
        break;
      case 'brand':
      default:
        setModalView('form');
        break;
    }
  };

  const selectOption = (rawItem: any) => {
    const itemString = typeof rawItem === 'string' ? rawItem : rawItem.name || rawItem.value || rawItem.label || String(rawItem);
    const itemObj = typeof rawItem === 'object' && rawItem.id ? rawItem : { id: itemString, name: itemString };

    if (activeStep === 'brand') {
      const nextBrand = itemObj;
      setSelectedBrand(nextBrand);
      setSelectedModel(null);
      setSelectedYear('');
      setSelectedBodyType('');
      setSelectedEngine('');
      setSelectedFuelType('');
      setSelectedTransmission('');
      setSelectedTrim('');
      openStepView('model', nextBrand, null);
    } else if (activeStep === 'model') {
      const nextModel = itemObj;
      setSelectedModel(nextModel);
      setSelectedYear('');
      setSelectedBodyType('');
      setSelectedEngine('');
      setSelectedFuelType('');
      setSelectedTransmission('');
      setSelectedTrim('');
      openStepView('year', selectedBrand, nextModel);
    } else if (activeStep === 'year') {
      const nextYear = itemString;
      setSelectedYear(nextYear);
      setSelectedBodyType('');
      setSelectedEngine('');
      setSelectedFuelType('');
      setSelectedTransmission('');
      setSelectedTrim('');
      openStepView('bodyType', selectedBrand, selectedModel, nextYear);
    } else if (activeStep === 'bodyType') {
      const nextBody = itemString;
      setSelectedBodyType(nextBody);
      setSelectedEngine('');
      setSelectedFuelType('');
      setSelectedTransmission('');
      setSelectedTrim('');
      openStepView('engine', selectedBrand, selectedModel, selectedYear, nextBody);
    } else if (activeStep === 'engine') {
      const nextEngine = itemString;
      setSelectedEngine(nextEngine);
      setSelectedFuelType('');
      setSelectedTransmission('');
      setSelectedTrim('');
      openStepView('fuelType', selectedBrand, selectedModel, selectedYear, selectedBodyType, nextEngine);
    } else if (activeStep === 'fuelType') {
      const nextFuel = itemString;
      setSelectedFuelType(nextFuel);
      setSelectedTransmission('');
      setSelectedTrim('');
      openStepView('transmission', selectedBrand, selectedModel, selectedYear, selectedBodyType, selectedEngine, nextFuel);
    } else if (activeStep === 'transmission') {
      const nextTrans = itemString;
      setSelectedTransmission(nextTrans);
      setSelectedTrim('');
      openStepView('trim', selectedBrand, selectedModel, selectedYear, selectedBodyType, selectedEngine, selectedFuelType, nextTrans);
    } else if (activeStep === 'trim') {
      setSelectedTrim(itemString);
      setModalView('form');
    }
  };

  const getStepNumber = () => {
    switch (activeStep) {
      case 'brand': return 1;
      case 'model': return 2;
      case 'year': return 3;
      case 'bodyType': return 4;
      case 'engine': return 5;
      case 'fuelType': return 6;
      case 'transmission': return 7;
      case 'trim': return 8;
      default: return 1;
    }
  };

  const getStepTitle = () => {
    switch (activeStep) {
      case 'brand': return 'Marka Seç';
      case 'model': return 'Model Ailesi Seç';
      case 'year': return 'Yıl Seç';
      case 'bodyType': return 'Kasa Tipi Seç';
      case 'engine': return 'Motor / Versiyon Seç';
      case 'fuelType': return 'Yakıt Türü Seç';
      case 'transmission': return 'Şanzıman Tipi Seç';
      case 'trim': return 'Donanım Paketi Seç';
      default: return 'Marka Seç';
    }
  };

  const getStepSubtitle = () => {
    switch (activeStep) {
      case 'brand': return 'Aracınızın markasını seçerek devam edin.';
      case 'model': return 'Seçtiğiniz marka için model ailesini belirleyin.';
      case 'year': return 'Seçtiğiniz model için yılı belirleyin.';
      case 'bodyType': return 'Seçtiğiniz model için kasa tipini belirleyin.';
      case 'engine': return 'Aracın için uygun motor / versiyon seçimini yap.';
      case 'fuelType': return 'Aracınızı çalıştıran yakıt türünü seçin.';
      case 'transmission': return 'Aracınızın şanzıman tipini seçin.';
      case 'trim': return 'Aracınız için donanım paketini seçin.';
      default: return 'Aracınızın markasını seçerek devam edin.';
    }
  };

  const getSearchPlaceholder = () => {
    switch (activeStep) {
      case 'brand': return 'Marka ara...';
      case 'model': return 'Model ara...';
      case 'year': return 'Model yılı ara...';
      case 'bodyType': return 'Kasa tipi ara...';
      case 'engine': return 'Motor / versiyon ara...';
      case 'fuelType': return 'Yakıt türü ara...';
      case 'transmission': return 'Şanzıman ara...';
      case 'trim': return 'Donanım paketi ara...';
      default: return 'Ara...';
    }
  };

  // Helper to get normalized options list for step view
  const getStepData = () => {
    let list: any[] = [];
    if (activeStep === 'brand') list = brands;
    else if (activeStep === 'model') list = models;
    else if (activeStep === 'year') list = years.length > 0 ? years : Array.from({ length: 27 }, (_, i) => String(2026 - i));
    else if (activeStep === 'bodyType') list = bodyTypes.length > 0 ? bodyTypes : ['Sedan', 'Hatchback', 'Station Wagon', 'Coupe', 'SUV', 'Cabrio'];
    else if (activeStep === 'engine') list = engines.length > 0 ? engines : ['320i', '320i xDrive', '330i', '330i xDrive', 'M340i xDrive', 'M3'];
    else if (activeStep === 'fuelType') list = fuelTypes.length > 0 ? fuelTypes : ['Benzin', 'Dizel', 'Hibrit', 'Plug-in Hybrid', 'Elektrik', 'LPG'];
    else if (activeStep === 'transmission') list = transmissions.length > 0 ? transmissions : ['Otomatik', 'Manuel'];
    else if (activeStep === 'trim') list = trims.length > 0 ? trims : ['M Sport', 'Sport Line', 'Luxury Line'];

    const normalized = list.map((item) => {
      if (typeof item === 'object' && item !== null && !item.name) {
        return item.value || item.label || String(item);
      }
      return item;
    });

    if (!searchText) return normalized;
    return normalized.filter((item) => {
      const val = typeof item === 'string' ? item : item.name || item.label || item.value || '';
      return val.toLowerCase().includes(searchText.toLowerCase());
    });
  };

  // Group brands alphabetically
  const getGroupedBrands = () => {
    let filtered = brands;
    if (searchText) {
      filtered = brands.filter((b) => b.name.toLowerCase().includes(searchText.toLowerCase()));
    }

    const groups: Record<string, Brand[]> = {};
    filtered.forEach((brand) => {
      const firstChar = brand.name.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(brand);
    });

    return Object.keys(groups)
      .sort()
      .map((key) => ({ key, data: groups[key] }));
  };

  // Get Popular Brand list
  const getPopularBrands = () => {
    return brands.filter((b) => POPULAR_BRAND_NAMES.includes(b.name));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER - White Clean Navbar */}
      <View style={styles.topNavbar}>
        <View style={styles.logoRow}>
          <View style={styles.logoIconLines}>
            <View style={[styles.logoLine, { width: 14, backgroundColor: '#0284c7' }]} />
            <View style={[styles.logoLine, { width: 18, backgroundColor: '#0284c7' }]} />
            <View style={[styles.logoLine, { width: 10, backgroundColor: '#0284c7' }]} />
          </View>
          <Text style={styles.logoTextMain}>Tork<Text style={styles.logoTextSub}>Scout</Text></Text>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity style={styles.regionChip}>
            <Ionicons name="globe-outline" size={15} color="#334155" />
            <Text style={styles.regionText}>Türkiye</Text>
            <Ionicons name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.searchIconButton}
            onPress={() => router.push('/(tabs)/profile' as any)}
          >
            <Ionicons name="person-circle-outline" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO BANNER CARD - Deep Navy Blue with EXACT VECTOR SPEED LOGO FROM WEB SITE */}
        <View style={styles.heroCardContainer}>
          <View style={styles.heroContentLeft}>
            <Text style={styles.heroTitle}>İlanı gör, aracı anla, doğru kararı ver</Text>
            <Text style={styles.heroSubtitle}>
              Araçları Karşılaştırın, Size En Uygun Aracı Keşfedin.
            </Text>

            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                style={styles.heroOrangeButton}
                activeOpacity={0.85}
                onPress={() => {
                  setModalView('form');
                  if (brands.length === 0) fetchBrands();
                  setQueryModalVisible(true);
                }}
              >
                <Text style={styles.heroOrangeButtonText}>Araç Sorgula</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroOutlineButton}
                activeOpacity={0.85}
                onPress={() => router.push('/comparison')}
              >
                <Text style={styles.heroOutlineButtonText}>Araç Karşılaştır</Text>
                <Ionicons name="scale-outline" size={16} color="#ea580c" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Exact Web Vector SVG Speed Logo */}
          <View style={styles.heroLogoWrapper}>
            <TorkScoutWebExactAnimatedLogo />
          </View>
        </View>

        {/* KEŞFET SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Keşfet</Text>
          <TouchableOpacity onPress={() => router.push('/kesfet')}>
            <Text style={styles.sectionLinkText}>Keşfete Git</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kesfetScrollRow}>
          <TouchableOpacity
            style={styles.kesfetCard}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/vehicle-guide')}
          >
            <View style={styles.kesfetIconBox}>
              <Ionicons name="book-outline" size={26} color="#1e3a8a" />
            </View>
            <Text style={styles.kesfetCardText}>Araç Rehberi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.kesfetCard}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/aracini-bul')}
          >
            <View style={styles.kesfetIconBox}>
              <Ionicons name="search-circle-outline" size={28} color="#ea580c" />
            </View>
            <Text style={styles.kesfetCardText}>Aracını Bul</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.kesfetCard}
            activeOpacity={0.8}
            onPress={() => router.push('/ilan-akisi')}
          >
            <View style={styles.kesfetIconBox}>
              <Ionicons name="newspaper-outline" size={26} color="#0284c7" />
            </View>
            <Text style={styles.kesfetCardText}>İlan Akışı</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* VİTRİN SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Vitrin</Text>
          <TouchableOpacity onPress={() => router.push('/listings')}>
            <Text style={styles.sectionLinkText}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>

        {loadingListings ? (
          <ActivityIndicator size="large" color="#ea580c" style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.vitrinGrid}>
            {vitrinListings.map((item) => {
              const isFav = !!favorites[item.id];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.vitrinCard}
                  activeOpacity={0.9}
                  onPress={() => router.push({ pathname: '/listings/[id]', params: { id: item.id } })}
                >
                  <View style={styles.vitrinImageContainer}>
                    <Image source={{ uri: item.imageUrl }} style={styles.vitrinCarImage} resizeMode="cover" />

                    {item.isUrgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentBadgeText}>ACİL</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.favCircleButton}
                      onPress={() => toggleFavorite(item.id)}
                    >
                      <Ionicons
                        name={isFav ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isFav ? '#ef4444' : '#ffffff'}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.vitrinCardBody}>
                    <Text style={styles.vitrinTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <Text style={styles.vitrinSpecs}>
                      {item.year} • {(item.mileage ?? 0).toLocaleString('tr-TR')} km
                    </Text>

                    <Text style={styles.vitrinPrice}>
                      {(item.price ?? 0).toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* SINGLE UNIFIED MODAL MATCHING REFERENCE UI */}
      <Modal visible={queryModalVisible} animationType="slide">
        <SafeAreaView style={styles.fullModalContainer}>
          {modalView === 'form' ? (
            /* FORM VIEW MATCHING REFERENCE IMAGE 2 */
            <ScrollView contentContainerStyle={styles.refFormPadding} showsVerticalScrollIndicator={false}>
              {/* Header with Back Arrow & Centered Title */}
              <View style={styles.refHeaderRow}>
                <TouchableOpacity style={styles.refBackButton} onPress={() => setQueryModalVisible(false)}>
                  <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.refHeaderTitle}>Araç Sorgula</Text>
                <View style={{ width: 24 }} />
              </View>

              {/* TorkScout Brand Header */}
              <View style={styles.brandHeroSection}>
                <View style={styles.brandHeroLogoRow}>
                  <View style={styles.logoIconLines}>
                    <View style={[styles.logoLine, { width: 14, backgroundColor: '#0284c7' }]} />
                    <View style={[styles.logoLine, { width: 18, backgroundColor: '#0284c7' }]} />
                    <View style={[styles.logoLine, { width: 10, backgroundColor: '#0284c7' }]} />
                  </View>
                  <Text style={styles.brandHeroLogoMain}>Tork<Text style={styles.brandHeroLogoSub}>Scout</Text></Text>
                </View>
                <Text style={styles.brandHeroSubtitle}>
                  Aracını seç, teknik özelliklerini, yaygın sorunlarını ve satın alma öncesi kritik detaylarını öğren.
                </Text>
              </View>

              {/* Araç Bilgileri Card with 8 Rows */}
              <View style={styles.vehicleInfoCard}>
                <View style={styles.vehicleInfoCardHeader}>
                  <View style={styles.vehicleInfoIconCircle}>
                    <Ionicons name="search" size={18} color="#0284c7" />
                  </View>
                  <Text style={styles.vehicleInfoCardTitle}>Araç Bilgileri</Text>
                </View>

                {/* 1. Marka */}
                <TouchableOpacity style={styles.filterRowItem} onPress={() => openStepView('brand')}>
                  <Text style={styles.filterRowLabel}>Marka</Text>
                  <View style={styles.filterRowRight}>
                    <Text style={selectedBrand ? styles.filterRowValSelected : styles.filterRowValPlaceholder}>
                      {selectedBrand ? selectedBrand.name : 'Seçilmedi'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>

                {/* 2. Model Ailesi */}
                <TouchableOpacity
                  style={[styles.filterRowItem, !selectedBrand && styles.filterRowItemDisabled]}
                  onPress={() => selectedBrand && openStepView('model')}
                  disabled={!selectedBrand}
                >
                  <Text style={styles.filterRowLabel}>Model Ailesi</Text>
                  <View style={styles.filterRowRight}>
                    <Text style={selectedModel ? styles.filterRowValSelected : styles.filterRowValPlaceholder}>
                      {selectedModel ? selectedModel.name : 'Seçilmedi'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>

                {/* 3. Yıl */}
                <TouchableOpacity
                  style={[styles.filterRowItem, !selectedModel && styles.filterRowItemDisabled]}
                  onPress={() => selectedModel && openStepView('year')}
                  disabled={!selectedModel}
                >
                  <Text style={styles.filterRowLabel}>Yıl</Text>
                  <View style={styles.filterRowRight}>
                    <Text style={selectedYear ? styles.filterRowValSelected : styles.filterRowValPlaceholder}>
                      {selectedYear ? selectedYear : 'Seçilmedi'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>

                {/* 4. Kasa Tipi */}
                <TouchableOpacity
                  style={[styles.filterRowItem, !selectedYear && styles.filterRowItemDisabled]}
                  onPress={() => selectedYear && openStepView('bodyType')}
                  disabled={!selectedYear}
                >
                  <Text style={styles.filterRowLabel}>Kasa Tipi</Text>
                  <View style={styles.filterRowRight}>
                    <Text style={selectedBodyType ? styles.filterRowValSelected : styles.filterRowValPlaceholder}>
                      {selectedBodyType ? selectedBodyType : 'Seçilmedi'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>

                {/* 5. Motor / Versiyon */}
                <TouchableOpacity style={styles.filterRowItem} onPress={() => openStepView('engine')}>
                  <Text style={styles.filterRowLabel}>Motor / Versiyon</Text>
                  <View style={styles.filterRowRight}>
                    <Text style={selectedEngine ? styles.filterRowValSelected : styles.filterRowValPlaceholder}>
                      {selectedEngine ? selectedEngine : 'Seçilmedi'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>

                {/* 6. Yakıt */}
                <TouchableOpacity style={styles.filterRowItem} onPress={() => openStepView('fuelType')}>
                  <Text style={styles.filterRowLabel}>Yakıt</Text>
                  <View style={styles.filterRowRight}>
                    <Text style={selectedFuelType ? styles.filterRowValSelected : styles.filterRowValPlaceholder}>
                      {selectedFuelType ? selectedFuelType : 'Seçilmedi'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>

                {/* 7. Şanzıman */}
                <TouchableOpacity style={styles.filterRowItem} onPress={() => openStepView('transmission')}>
                  <Text style={styles.filterRowLabel}>Şanzıman</Text>
                  <View style={styles.filterRowRight}>
                    <Text style={selectedTransmission ? styles.filterRowValSelected : styles.filterRowValPlaceholder}>
                      {selectedTransmission ? selectedTransmission : 'Seçilmedi'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>

                {/* 8. Donanım */}
                <TouchableOpacity
                  style={[styles.filterRowItem, { borderBottomWidth: 0 }]}
                  onPress={() => openStepView('trim')}
                >
                  <Text style={styles.filterRowLabel}>Donanım</Text>
                  <View style={styles.filterRowRight}>
                    <Text style={selectedTrim ? styles.filterRowValSelected : styles.filterRowValPlaceholder}>
                      {selectedTrim ? selectedTrim : 'Seçilmedi'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Bottom Orange Action Button */}
              <TouchableOpacity
                style={[styles.refOrangeSubmitButton, (!selectedBrand || !selectedModel) && styles.refOrangeSubmitButtonDisabled]}
                onPress={handleStartReport}
              >
                <Text style={styles.refOrangeSubmitButtonText}>Sorgulamaya Başla</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* STEP SELECTION VIEW MATCHING REFERENCE UI */
            <View style={styles.refModalContent}>
              {/* Header with Back Arrow & Centered Title */}
              <View style={styles.refHeaderRow}>
                <TouchableOpacity style={styles.refBackButton} onPress={handleStepBack}>
                  <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>

                <Text style={styles.refHeaderTitle}>{getStepTitle()}</Text>
                <View style={{ width: 24 }} />
              </View>

              {/* Progress Indicator: Step Badge (e.g. 8/8) & Segmented Bar */}
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>{getStepNumber()} / 8</Text>
                <View style={styles.progressBarTrack}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.progressBarSegment,
                        i < getStepNumber() && styles.progressBarSegmentActive,
                      ]}
                    />
                  ))}
                </View>
              </View>

              <Text style={styles.refSubtitle}>{getStepSubtitle()}</Text>

              {/* Selected Brand Summary Card for Step 2 (Model Selection) */}
              {selectedBrand && activeStep === 'model' && (
                <View style={styles.selectedBrandBadgeCard}>
                  <View style={styles.selectedBrandBadgeLeft}>
                    {BRAND_LOGOS[selectedBrand.name] ? (
                      <Image source={{ uri: BRAND_LOGOS[selectedBrand.name] }} style={styles.selectedBrandBadgeLogo} resizeMode="contain" />
                    ) : (
                      <Ionicons name="car-sport" size={24} color="#0f172a" />
                    )}
                    <Text style={styles.selectedBrandBadgeName}>{selectedBrand.name}</Text>
                  </View>
                  <Ionicons name="checkmark" size={20} color="#ea580c" />
                </View>
              )}

              {/* Selected Summary Card for Step 3 (Year Selection) */}
              {selectedBrand && selectedModel && activeStep === 'year' && (
                <View style={styles.selectedSummaryBadgeCard}>
                  <View style={styles.selectedSummaryBadgeItem}>
                    {BRAND_LOGOS[selectedBrand.name] ? (
                      <Image source={{ uri: BRAND_LOGOS[selectedBrand.name] }} style={styles.selectedSummaryLogo} resizeMode="contain" />
                    ) : (
                      <Ionicons name="car-sport" size={22} color="#0f172a" />
                    )}
                    <Text style={styles.selectedSummaryText}>{selectedBrand.name}</Text>
                    <Ionicons name="checkmark" size={16} color="#ea580c" />
                  </View>

                  <View style={styles.selectedSummaryDivider} />

                  <View style={styles.selectedSummaryBadgeItem}>
                    <Text style={styles.selectedSummaryText}>{selectedModel.name}</Text>
                    <Ionicons name="checkmark" size={16} color="#ea580c" />
                  </View>
                </View>
              )}

              {/* Selected Summary Card for Step 4 (Body Type Selection) */}
              {selectedBrand && selectedModel && selectedYear && activeStep === 'bodyType' && (
                <View style={styles.selectedSummaryBadgeCard}>
                  <View style={styles.selectedSummaryBadgeItem}>
                    {BRAND_LOGOS[selectedBrand.name] ? (
                      <Image source={{ uri: BRAND_LOGOS[selectedBrand.name] }} style={styles.selectedSummaryLogo} resizeMode="contain" />
                    ) : (
                      <Ionicons name="car-sport" size={20} color="#0f172a" />
                    )}
                    <Text style={styles.selectedSummaryText}>{selectedBrand.name}</Text>
                    <Ionicons name="checkmark" size={15} color="#ea580c" />
                  </View>

                  <View style={styles.selectedSummaryDivider} />

                  <View style={styles.selectedSummaryBadgeItem}>
                    <Text style={styles.selectedSummaryText}>{selectedModel.name}</Text>
                    <Ionicons name="checkmark" size={15} color="#ea580c" />
                  </View>

                  <View style={styles.selectedSummaryDivider} />

                  <View style={styles.selectedSummaryBadgeItem}>
                    <Text style={styles.selectedSummaryText}>{selectedYear}</Text>
                    <Ionicons name="checkmark" size={15} color="#ea580c" />
                  </View>
                </View>
              )}

              {/* MULTI-SPEC BREADCRUMB SUMMARY CARD FOR STEP 5 (Motor / Versiyon Seç) MATCHING REFERENCE IMAGE */}
              {selectedBrand && selectedModel && selectedYear && activeStep === 'engine' && (
                <View style={styles.breadCrumbSummaryCard}>
                  <View style={styles.breadCrumbItem}>
                    {BRAND_LOGOS[selectedBrand.name] ? (
                      <Image source={{ uri: BRAND_LOGOS[selectedBrand.name] }} style={styles.breadCrumbLogo} resizeMode="contain" />
                    ) : (
                      <Ionicons name="car-sport" size={20} color="#0f172a" />
                    )}
                    <View style={{ gap: 1 }}>
                      <Text style={styles.breadCrumbSubText}>{selectedBrand.name}</Text>
                      <Text style={styles.breadCrumbMainText}>{selectedModel.name}</Text>
                      <Text style={styles.breadCrumbSubText}>{selectedYear}</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <Ionicons name="car-outline" size={22} color="#0f172a" />
                    <View style={{ gap: 1 }}>
                      <Text style={styles.breadCrumbMainText}>{selectedBodyType || 'Sedan'}</Text>
                      <Text style={styles.breadCrumbSubText}>Kasa Tipi</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <Ionicons name="color-fill-outline" size={20} color="#0f172a" />
                    <View style={{ gap: 1 }}>
                      <Text style={styles.breadCrumbMainText}>{selectedFuelType || 'Benzin'}</Text>
                      <Text style={styles.breadCrumbSubText}>Yakıt</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* MULTI-SPEC BREADCRUMB SUMMARY CARD FOR STEP 6 (Yakıt Türü Seç) MATCHING REFERENCE SCREENSHOT */}
              {selectedBrand && selectedModel && selectedYear && activeStep === 'fuelType' && (
                <View style={styles.breadCrumbSummaryCard}>
                  <View style={styles.breadCrumbItem}>
                    {BRAND_LOGOS[selectedBrand.name] ? (
                      <Image source={{ uri: BRAND_LOGOS[selectedBrand.name] }} style={styles.breadCrumbLogo} resizeMode="contain" />
                    ) : (
                      <Ionicons name="car-sport" size={20} color="#0f172a" />
                    )}
                    <View style={{ gap: 1 }}>
                      <Text style={styles.breadCrumbSubText}>{selectedBrand.name}</Text>
                      <Text style={styles.breadCrumbMainText}>{selectedModel.name}</Text>
                      <Text style={styles.breadCrumbSubText}>{selectedYear}</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <View style={{ gap: 1 }}>
                      <Text style={styles.breadCrumbMainText}>{selectedEngine || '320i'}</Text>
                      <Text style={styles.breadCrumbSubText}>Motor</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <Ionicons name="car-outline" size={22} color="#0f172a" />
                    <View style={{ gap: 1 }}>
                      <Text style={styles.breadCrumbMainText}>{selectedBodyType || 'Sedan'}</Text>
                      <Text style={styles.breadCrumbSubText}>Kasa Tipi</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* MULTI-SPEC BREADCRUMB SUMMARY CARD FOR STEP 7 (Şanzıman Tipi Seç) MATCHING REFERENCE SCREENSHOT */}
              {selectedBrand && selectedModel && selectedYear && activeStep === 'transmission' && (
                <View style={styles.breadCrumbSummaryCard}>
                  <View style={styles.breadCrumbItem}>
                    {BRAND_LOGOS[selectedBrand.name] ? (
                      <Image source={{ uri: BRAND_LOGOS[selectedBrand.name] }} style={styles.breadCrumbLogo} resizeMode="contain" />
                    ) : (
                      <Ionicons name="car-sport" size={20} color="#0f172a" />
                    )}
                    <View style={{ gap: 1 }}>
                      <Text style={styles.breadCrumbSubText}>{selectedBrand.name}</Text>
                      <Text style={styles.breadCrumbMainText}>{selectedModel.name}</Text>
                      <Text style={styles.breadCrumbSubText}>{selectedYear}</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <View style={{ gap: 1 }}>
                      <Text style={styles.breadCrumbMainText}>{selectedEngine || '320i'}</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <Ionicons name="color-fill-outline" size={16} color="#0f172a" />
                    <Text style={styles.breadCrumbMainText}>{selectedFuelType || 'Benzin'}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <Ionicons name="car-outline" size={16} color="#0f172a" />
                    <Text style={styles.breadCrumbMainText}>{selectedBodyType || 'Sedan'}</Text>
                  </View>
                </View>
              )}

              {/* MULTI-SPEC BREADCRUMB SUMMARY CARD FOR STEP 8 (Donanım Paketi Seç) MATCHING REFERENCE SCREENSHOT */}
              {selectedBrand && selectedModel && selectedYear && activeStep === 'trim' && (
                <View style={styles.breadCrumbSummaryCard}>
                  <View style={styles.breadCrumbItem}>
                    {BRAND_LOGOS[selectedBrand.name] ? (
                      <Image source={{ uri: BRAND_LOGOS[selectedBrand.name] }} style={styles.breadCrumbLogo} resizeMode="contain" />
                    ) : (
                      <Ionicons name="car-sport" size={20} color="#0f172a" />
                    )}
                    <View style={{ gap: 1 }}>
                      <Text style={styles.breadCrumbSubText}>{selectedBrand.name}</Text>
                      <Text style={styles.breadCrumbMainText}>{selectedModel.name}</Text>
                      <Text style={styles.breadCrumbSubText}>{selectedYear}</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={13} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <Text style={styles.breadCrumbMainText}>{selectedEngine || '320i'}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={13} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <Ionicons name="color-fill-outline" size={14} color="#0f172a" />
                    <Text style={styles.breadCrumbMainText}>{selectedFuelType || 'Benzin'}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={13} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <AutomaticGearIcon color="#0f172a" />
                    <Text style={styles.breadCrumbMainText}>{selectedTransmission || 'Otomatik'}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={13} color="#cbd5e1" />

                  <View style={styles.breadCrumbItem}>
                    <Ionicons name="car-outline" size={14} color="#0f172a" />
                    <Text style={styles.breadCrumbMainText}>{selectedBodyType || 'Sedan'}</Text>
                  </View>
                </View>
              )}

              {/* Search Bar matching reference UI (Hidden for Year, Body Type, Engine, Fuel Type, Transmission, and Trim selections) */}
              {activeStep !== 'year' && activeStep !== 'bodyType' && activeStep !== 'engine' && activeStep !== 'fuelType' && activeStep !== 'transmission' && activeStep !== 'trim' && (
                <View style={styles.refSearchBox}>
                  <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.refSearchInput}
                    placeholder={getSearchPlaceholder()}
                    placeholderTextColor="#94a3b8"
                    value={searchText}
                    onChangeText={setSearchText}
                  />
                </View>
              )}

              {/* Scrollable Content Container */}
              <View style={styles.stepBodyWithJumper}>
                <ScrollView contentContainerStyle={styles.stepScrollInner} showsVerticalScrollIndicator={false}>
                  {activeStep === 'brand' && !searchText && (
                    <>
                      {/* Popüler Markalar Horizontal Row */}
                      <Text style={styles.sectionHeaderLabel}>Popüler Markalar</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.popularRowContent}
                      >
                        {(getPopularBrands().length > 0
                          ? getPopularBrands()
                          : [
                              { id: 'pop-1', name: 'Volkswagen' },
                              { id: 'pop-2', name: 'BMW' },
                              { id: 'pop-3', name: 'Mercedes-Benz' },
                              { id: 'pop-4', name: 'Renault' },
                              { id: 'pop-5', name: 'Audi' },
                            ]
                        ).map((pBrand) => {
                          const logoUri = BRAND_LOGOS[pBrand.name];
                          return (
                            <TouchableOpacity
                              key={pBrand.id || pBrand.name}
                              style={styles.popularBrandCard}
                              activeOpacity={0.8}
                              onPress={() => selectOption(pBrand)}
                            >
                              <View style={styles.popularLogoContainer}>
                                {logoUri ? (
                                  <Image source={{ uri: logoUri }} style={styles.popularLogoImage} resizeMode="contain" />
                                ) : (
                                  <Ionicons name="car-sport" size={26} color="#0f172a" />
                                )}
                              </View>
                              <Text style={styles.popularBrandTitle} numberOfLines={1}>
                                {pBrand.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </>
                  )}

                  {/* Options Section Header */}
                  {activeStep !== 'engine' && activeStep !== 'fuelType' && activeStep !== 'trim' && (
                    <Text style={styles.sectionHeaderLabel}>
                      {activeStep === 'brand'
                        ? 'Tüm Markalar'
                        : activeStep === 'model'
                        ? 'Model Aileleri'
                        : activeStep === 'year'
                        ? 'Yıl Seçenekleri'
                        : activeStep === 'bodyType'
                        ? 'Kasa Tipi Seçenekleri'
                        : activeStep === 'transmission'
                        ? 'Şanzıman tipini seçin.'
                        : 'Seçenekler'}
                    </Text>
                  )}

                  {loadingOptions ? (
                    <ActivityIndicator size="large" color="#ea580c" style={{ marginVertical: 40 }} />
                  ) : activeStep === 'brand' ? (
                    getGroupedBrands().map((group) => (
                      <View key={group.key} style={styles.brandGroupBlock}>
                        <Text style={styles.brandGroupLetter}>{group.key}</Text>
                        <View style={styles.brandGroupCard}>
                          {group.data.map((item, idx) => {
                            const logoUri = BRAND_LOGOS[item.name];
                            return (
                              <TouchableOpacity
                                key={item.id || item.name}
                                style={[
                                  styles.brandRowItem,
                                  idx < group.data.length - 1 && styles.brandRowBorderBottom,
                                ]}
                                activeOpacity={0.7}
                                onPress={() => selectOption(item)}
                              >
                                <View style={styles.brandRowLeft}>
                                  <View style={styles.brandLogoBox}>
                                    {logoUri ? (
                                      <Image source={{ uri: logoUri }} style={styles.brandRowLogoImage} resizeMode="contain" />
                                    ) : (
                                      <Ionicons name="car-outline" size={20} color="#0f172a" />
                                    )}
                                  </View>
                                  <Text style={styles.brandRowName}>{item.name}</Text>
                                </View>

                                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))
                  ) : activeStep === 'year' ? (
                    /* 3-COLUMN GRID FOR YEAR SELECTION */
                    <View style={styles.yearGridContainer}>
                      {getStepData().map((yearVal, idx) => {
                        const isSelected = selectedYear === String(yearVal);
                        return (
                          <TouchableOpacity
                            key={String(yearVal) || idx}
                            style={[styles.yearGridCard, isSelected && styles.yearGridCardSelected]}
                            activeOpacity={0.8}
                            onPress={() => selectOption(yearVal)}
                          >
                            <Text style={[styles.yearGridCardText, isSelected && styles.yearGridCardTextSelected]}>
                              {String(yearVal)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : activeStep === 'bodyType' ? (
                    /* 2-COLUMN GRID FOR BODY TYPE SELECTION WITH HIGH-END AUTOMOTIVE ILLUSTRATIONS */
                    <View style={styles.bodyTypeGridContainer}>
                      {getStepData().map((bodyTypeVal, idx) => {
                        const isSelected = selectedBodyType === String(bodyTypeVal);
                        return (
                          <TouchableOpacity
                            key={String(bodyTypeVal) || idx}
                            style={[styles.bodyTypeGridCard, isSelected && styles.bodyTypeGridCardSelected]}
                            activeOpacity={0.8}
                            onPress={() => selectOption(bodyTypeVal)}
                          >
                            <View style={styles.bodyTypeIconBox}>
                              {renderBodyTypeImage(String(bodyTypeVal))}
                            </View>
                            <Text style={[styles.bodyTypeGridCardText, isSelected && styles.bodyTypeGridCardTextSelected]}>
                              {String(bodyTypeVal)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : activeStep === 'engine' ? (
                    /* CLEAN MOTOR / VERSION SELECTION LIST SHOWING MOTOR CODES ONLY */
                    <View style={styles.engineListContainer}>
                      {getStepData().map((engineItem, idx) => {
                        const engineLabel = typeof engineItem === 'string' ? engineItem : engineItem.name || engineItem.label || String(engineItem);
                        const isSelected = selectedEngine === engineLabel;

                        return (
                          <TouchableOpacity
                            key={engineLabel || idx}
                            style={[styles.engineOptionCard, isSelected && styles.engineOptionCardSelected]}
                            activeOpacity={0.8}
                            onPress={() => selectOption(engineItem)}
                          >
                            <View style={styles.engineOptionCardLeft}>
                              <Text style={styles.engineOptionTitle}>{engineLabel}</Text>
                            </View>

                            <View style={styles.engineOptionCardRight}>
                              {isSelected ? (
                                <View style={styles.engineOptionCheckedBox}>
                                  <Ionicons name="checkmark-circle" size={22} color="#ea580c" />
                                  <Ionicons name="chevron-forward" size={18} color="#ea580c" />
                                </View>
                              ) : (
                                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Bottom Info Banner */}
                      <View style={styles.engineInfoBanner}>
                        <Ionicons name="information-circle-outline" size={18} color="#ea580c" />
                        <Text style={styles.engineInfoBannerText}>
                          Listelenen motor / versiyonlar seçilen araç kombinasyonuna uygundur.
                        </Text>
                      </View>
                    </View>
                  ) : activeStep === 'fuelType' ? (
                    /* DYNAMIC FUEL TYPE SELECTION LIST MATCHING REFERENCE SCREENSHOT */
                    <View style={styles.fuelListContainer}>
                      {getStepData().map((fuelVal, idx) => {
                        const fuelLabel = typeof fuelVal === 'string' ? fuelVal : fuelVal.name || fuelVal.label || String(fuelVal);
                        const isSelected = selectedFuelType === fuelLabel;

                        return (
                          <TouchableOpacity
                            key={fuelLabel || idx}
                            style={[styles.fuelOptionCard, isSelected && styles.fuelOptionCardSelected]}
                            activeOpacity={0.8}
                            onPress={() => selectOption(fuelVal)}
                          >
                            <View style={styles.fuelOptionCardLeft}>
                              {renderFuelTypeIcon(fuelLabel)}
                              <Text style={styles.fuelOptionTitle}>{fuelLabel}</Text>
                            </View>

                            <View style={styles.fuelOptionCardRight}>
                              {isSelected ? (
                                <Ionicons name="checkmark-circle" size={24} color="#ea580c" />
                              ) : (
                                <View style={styles.fuelOptionUncheckedCircle} />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Bottom Info Banner */}
                      <View style={styles.engineInfoBanner}>
                        <Ionicons name="information-circle-outline" size={18} color="#ea580c" />
                        <Text style={styles.engineInfoBannerText}>
                          Seçtiğiniz yakıt türüne göre ilgili donanımlar ve teknik veriler gösterilecektir.
                        </Text>
                      </View>
                    </View>
                  ) : activeStep === 'transmission' ? (
                    /* TRANSMISSION TYPE SELECTION LIST MATCHING REFERENCE SCREENSHOT */
                    <View style={styles.fuelListContainer}>
                      {getStepData().map((transVal, idx) => {
                        const transLabel = typeof transVal === 'string' ? transVal : transVal.name || transVal.label || String(transVal);
                        const isSelected = selectedTransmission === transLabel;

                        return (
                          <TouchableOpacity
                            key={transLabel || idx}
                            style={[styles.fuelOptionCard, isSelected && styles.fuelOptionCardSelected]}
                            activeOpacity={0.8}
                            onPress={() => selectOption(transVal)}
                          >
                            <View style={styles.fuelOptionCardLeft}>
                              {renderTransmissionIcon(transLabel, isSelected)}
                              <Text style={styles.fuelOptionTitle}>{transLabel}</Text>
                            </View>

                            <View style={styles.fuelOptionCardRight}>
                              {isSelected ? (
                                <Ionicons name="checkmark-circle" size={24} color="#ea580c" />
                              ) : (
                                <View style={styles.fuelOptionUncheckedCircle} />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : activeStep === 'trim' ? (
                    /* TRIM PACKAGE SELECTION LIST MATCHING USER DIRECTIVE (STEP 8) */
                    <View style={styles.fuelListContainer}>
                      {getStepData().map((trimVal, idx) => {
                        const trimLabel = typeof trimVal === 'string' ? trimVal : trimVal.name || trimVal.label || String(trimVal);
                        const isSelected = selectedTrim === trimLabel;

                        return (
                          <TouchableOpacity
                            key={trimLabel || idx}
                            style={[styles.fuelOptionCard, isSelected && styles.fuelOptionCardSelected]}
                            activeOpacity={0.8}
                            onPress={() => selectOption(trimVal)}
                          >
                            <View style={styles.fuelOptionCardLeft}>
                              {renderTrimBadge(trimLabel)}
                              <Text style={styles.fuelOptionTitle}>{trimLabel}</Text>
                            </View>

                            <View style={styles.fuelOptionCardRight}>
                              {isSelected ? (
                                <Ionicons name="checkmark-circle" size={24} color="#ea580c" />
                              ) : (
                                <View style={styles.fuelOptionUncheckedCircle} />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Bottom Info Banner */}
                      <View style={styles.engineInfoBanner}>
                        <Ionicons name="information-circle-outline" size={18} color="#ea580c" />
                        <Text style={styles.engineInfoBannerText}>
                          Donanım paketleri, aracınızın konfor, tasarım ve teknoloji özelliklerini belirler.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.brandGroupCard}>
                      {getStepData().map((item, idx, arr) => {
                        const label = typeof item === 'string' ? item : item.name || item.label || item.value || String(item);
                        const itemKey = typeof item === 'string' ? item : item.id || item.value || `${label}-${idx}`;
                        return (
                          <TouchableOpacity
                            key={itemKey}
                            style={[
                              styles.brandRowItem,
                              idx < arr.length - 1 && styles.brandRowBorderBottom,
                            ]}
                            activeOpacity={0.7}
                            onPress={() => selectOption(item)}
                          >
                            <Text style={styles.brandRowName}>{label}</Text>
                            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>

                {/* Right Alphabet Quick Jumper Bar */}
                {activeStep === 'brand' && (
                  <View style={styles.alphabetJumperColumn}>
                    {ALPHABET_INDEX.map((char) => (
                      <TouchableOpacity key={char} style={styles.alphabetJumperTouch}>
                        <Text style={[styles.alphabetJumperChar, char === 'A' && styles.alphabetJumperCharActive]}>
                          {char}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const webLogoStyles = StyleSheet.create({
  container: {
    width: 160,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconLines: {
    marginRight: 8,
    gap: 3,
  },
  logoLine: {
    height: 3,
    borderRadius: 2,
  },
  logoTextMain: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0284c7',
    letterSpacing: -0.5,
  },
  logoTextSub: {
    color: '#0f172a',
    fontWeight: '900',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  regionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heroCardContainer: {
    backgroundColor: '#0b192c',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0b192c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  heroContentLeft: {
    width: '62%',
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 27,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 18,
  },
  heroActionsRow: {
    flexDirection: 'column',
    gap: 10,
  },
  heroOrangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  heroOrangeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  heroOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ea580c',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  heroOutlineButtonText: {
    color: '#ea580c',
    fontWeight: '700',
    fontSize: 13,
  },
  heroLogoWrapper: {
    position: 'absolute',
    right: -4,
    top: 24,
    zIndex: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ea580c',
  },
  kesfetScrollRow: {
    gap: 12,
    paddingBottom: 16,
  },
  kesfetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  kesfetIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kesfetCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  vitrinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  vitrinCard: {
    width: (windowWidth - 44) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  vitrinImageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  vitrinCarImage: {
    width: '100%',
    height: '100%',
  },
  urgentBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  favCircleButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vitrinCardBody: {
    padding: 10,
  },
  vitrinTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
    height: 36,
    marginBottom: 4,
  },
  vitrinSpecs: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
  },
  vitrinPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ea580c',
  },
  fullModalContainer: {
    flex: 1,
    backgroundColor: '#fafcff',
  },
  refFormPadding: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },

  /* BRAND HERO SECTION MATCHING REFERENCE IMAGE 2 */
  brandHeroSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  brandHeroLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandHeroLogoMain: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0284c7',
    letterSpacing: -0.5,
  },
  brandHeroLogoSub: {
    color: '#0f172a',
    fontWeight: '900',
  },
  brandHeroSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },

  /* VEHICLE INFO CARD MATCHING REFERENCE IMAGE 2 */
  vehicleInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  vehicleInfoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  vehicleInfoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfoCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0b192c',
  },
  filterRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterRowItemDisabled: {
    opacity: 0.5,
  },
  filterRowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b192c',
  },
  filterRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterRowValSelected: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284c7',
  },
  filterRowValPlaceholder: {
    fontSize: 14,
    color: '#94a3b8',
  },
  refOrangeSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  refOrangeSubmitButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  refOrangeSubmitButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
  },

  /* REFERENCE UI EXACT STYLES */
  refModalContent: {
    flex: 1,
    backgroundColor: '#fafcff',
    paddingTop: 10,
  },
  refHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  refBackButton: {
    padding: 4,
  },
  refHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0b192c',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 6,
    gap: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0b192c',
  },
  progressBarTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
  },
  progressBarSegmentActive: {
    backgroundColor: '#ea580c',
  },
  refSubtitle: {
    fontSize: 13,
    color: '#64748b',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  selectedBrandBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 2,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  selectedBrandBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedBrandBadgeLogo: {
    width: 32,
    height: 32,
  },
  selectedBrandBadgeName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0b192c',
  },
  selectedSummaryBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 2,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  selectedSummaryBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedSummaryLogo: {
    width: 26,
    height: 26,
  },
  selectedSummaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0b192c',
  },
  selectedSummaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e2e8f0',
  },
  breadCrumbSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 2,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  breadCrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breadCrumbLogo: {
    width: 24,
    height: 24,
  },
  breadCrumbMainText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0b192c',
  },
  breadCrumbSubText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  refSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  refSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  stepBodyWithJumper: {
    flex: 1,
    flexDirection: 'row',
  },
  stepScrollInner: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  sectionHeaderLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0b192c',
    marginBottom: 12,
    marginTop: 4,
  },
  popularRowContent: {
    gap: 12,
    paddingBottom: 16,
  },
  popularBrandCard: {
    width: 90,
    height: 95,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  popularLogoContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  popularLogoImage: {
    width: 38,
    height: 38,
  },
  popularBrandTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  brandGroupBlock: {
    marginBottom: 14,
  },
  brandGroupLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
    marginLeft: 4,
  },
  brandGroupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  brandRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  brandRowBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brandRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  brandLogoBox: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandRowLogoImage: {
    width: 28,
    height: 28,
  },
  brandRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b192c',
  },
  yearGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginTop: 4,
  },
  yearGridCard: {
    width: (windowWidth - 64) / 3,
    height: 64,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  yearGridCardSelected: {
    borderColor: '#0b192c',
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  yearGridCardText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0b192c',
  },
  yearGridCardTextSelected: {
    color: '#ea580c',
    fontWeight: '900',
  },
  bodyTypeGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginTop: 4,
  },
  bodyTypeGridCard: {
    width: (windowWidth - 54) / 2,
    height: 145,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  bodyTypeGridCardSelected: {
    borderColor: '#0b192c',
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  bodyTypeCardImage: {
    width: (windowWidth - 78) / 2,
    height: 75,
  },
  bodyTypeIconBox: {
    width: '100%',
    height: 75,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bodyTypeGridCardText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0b192c',
    textAlign: 'center',
  },
  bodyTypeGridCardTextSelected: {
    color: '#ea580c',
    fontWeight: '900',
  },
  engineListContainer: {
    gap: 12,
    marginTop: 4,
  },
  engineOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  engineOptionCardSelected: {
    borderColor: '#ea580c',
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  engineOptionCardLeft: {
    flex: 1,
    gap: 3,
  },
  engineOptionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0b192c',
  },
  engineOptionCardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineOptionCheckedBox: {
    alignItems: 'center',
    gap: 4,
  },
  engineInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  engineInfoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#c2410c',
    fontWeight: '600',
    lineHeight: 16,
  },
  fuelListContainer: {
    gap: 12,
    marginTop: 4,
  },
  fuelOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  fuelOptionCardSelected: {
    borderColor: '#ea580c',
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  fuelOptionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  fuelIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trimBadgeBox: {
    width: 44,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fuelOptionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0b192c',
  },
  trimOptionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  fuelOptionCardRight: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  fuelOptionUncheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  alphabetJumperColumn: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 6,
  },
  alphabetJumperTouch: {
    paddingVertical: 1,
  },
  alphabetJumperChar: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  alphabetJumperCharActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
});
