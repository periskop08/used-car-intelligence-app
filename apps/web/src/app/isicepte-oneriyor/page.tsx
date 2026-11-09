"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Shuffle,
  Filter,
  Star,
  MapPin,
  ExternalLink,
  Phone,
  Wrench,
  X,
  RefreshCw,
  Search,
  Plus,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/apiConfig";
import { useGlobalCity } from "@/context/GlobalCityContext";

export type IsiCepteVehicleType = "AUTOMOBILE" | "MOTORCYCLE";

// Otomobil Servis Kategorileri (Mobile ile birebir aynı)
const AUTOMOBILE_CATEGORIES = [
  "Motor/Mekanik",
  "Kaporta/Boya",
  "Oto Ekspertiz",
  "Oto Elektrik/Elektronik",
  "Oto Çekici/Kurtarıcı",
  "Lastik/Jant",
  "Cam Filmi/Kaplama",
  "Oto Yıkama & Detay",
  "Oto Aksesuar",
  "Oto Yedek Parça",
] as const;

// Motosiklet Servis Kategorileri (Mobile ile birebir aynı)
const MOTORCYCLE_CATEGORIES = [
  "Motosiklet Servisi",
  "Motor/Mekanik",
  "Lastik/Jant",
  "Oto Elektrik/Elektronik",
  "Kaporta/Boya",
  "Cam Filmi/Kaplama",
  "Oto Çekici/Kurtarıcı",
  "Oto Yıkama & Detay",
  "Oto Ekspertiz",
] as const;

const TURKEY_81_PROVINCES: string[] = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale', 'Kırklareli',
  'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop',
  'Şırnak', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
];

// Kapsam: Otomobil + Arazi, SUV & Pickup + Minivan & Panelvan markaları
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

const DUAL_VEHICLE_BRAND_SLUGS = new Set(['bmw', 'honda', 'suzuki', 'peugeot']);

const ALLOWED_AUTOMOBILE_BRAND_SLUGS = new Set([
  'abarth', 'acura', 'aion', 'alfa-romeo', 'alpine', 'anadol', 'askam', 'aston-martin',
  'audi', 'bentley', 'bmc', 'bmw', 'bugatti', 'buick', 'byd', 'cadillac', 'cenntro',
  'chery', 'chevrolet', 'chrysler', 'citroen', 'cupra', 'dacia', 'daewoo', 'daf',
  'daihatsu', 'dfm', 'dfsk', 'dodge', 'dongfeng', 'ds', 'ds-automobiles', 'eagle',
  'etox', 'faw', 'ferrari', 'fiat', 'fisker', 'ford', 'forthing', 'foton', 'gaz',
  'geely', 'genesis', 'gmc', 'honda', 'hongqi', 'hummer', 'hyundai', 'ikco', 'infiniti',
  'isuzu', 'iveco', 'jac', 'jaecoo', 'jaguar', 'jeep', 'joyce', 'karsan', 'kia',
  'koenigsegg', 'lada', 'lamborghini', 'lancia', 'land-rover', 'leapmotor', 'levc',
  'lexus', 'lincoln', 'lotus', 'lynk-and-co', 'mahindra', 'man', 'maserati', 'maxus',
  'maybach', 'mazda', 'mclaren', 'mercedes-benz', 'mercury', 'mg', 'micro', 'mini',
  'mitsubishi', 'morgan', 'moskwitsch', 'nissan', 'oldsmobile', 'omoda', 'opel',
  'otokar', 'pagani', 'peugeot', 'plymouth', 'polestar', 'pontiac', 'porsche', 'proton',
  'rainwoll', 'ram', 'reeder', 'renault', 'rolls-royce', 'rover', 'saab', 'scania',
  'seat', 'seres', 'skoda', 'skywell', 'smart', 'ssangyong', 'subaru', 'suzuki', 'tata',
  'temsa', 'tesla', 'the-london-taxi', 'tofas', 'togg', 'toyota', 'vanderhall',
  'volkswagen', 'volvo', 'voyah', 'xev', 'yudo',
]);

const PURE_MOTORCYCLE_BRAND_SLUGS = new Set([
  'abush', 'aeon', 'airforce', 'ajp', 'altai', 'apachi', 'apec', 'aprilia', 'argo',
  'ariic', 'armode', 'arora', 'asya', 'bajaj', 'banhe', 'baotian', 'barossa', 'bashan',
  'belderia', 'benda', 'benelli', 'beta', 'better', 'beyaz-benli', 'bianchi', 'bimota',
  'birdhunter', 'bisan', 'boom', 'borelli-ledow', 'brixton', 'bsa', 'buell',
  'bumotojinling', 'cagiva', 'can-am', 'caza', 'celik-motor', 'cezeta', 'cfmoto',
  'cheeta', 'chopper', 'coral', 'cosmopolitan', 'cq', 'crn', 'csn-motor', 'daelim',
  'dayun', 'delta-motorcycle', 'derbi', 'di-blasi', 'dofern', 'doohan', 'dorado',
  'ducati', 'easycool', 'ecotrike', 'elitte', 'enbest', 'ersi', 'falcon', 'fantic',
  'fcm', 'fengchi', 'fest', 'fosti', 'fym', 'gaoming', 'garelli', 'gas-gas', 'gasgas',
  'gilera', 'gomoto', 'haojiang', 'haojin', 'haojue', 'harley-davidson', 'harput',
  'hazey-turk', 'hercules', 'hero', 'hf-kanuni', 'hfkanuni', 'hh-moto', 'hm-moto',
  'hsun', 'husaberg', 'husqvarna', 'hyosung', 'indian', 'isildar', 'italjet', 'izh',
  'jawa', 'jaxin', 'jiajue', 'jiayuan', 'jinding', 'jinlun', 'jonway', 'jpn-motor',
  'kadirga', 'kaldera', 'kamax', 'kangda', 'kanuni', 'karpaty', 'kastino', 'katren',
  'kawasaki', 'kayo', 'kayo-moto', 'keeway', 'kentoya', 'kimmi', 'kinetic', 'kinroad',
  'kove', 'kral', 'ktm', 'kuba', 'kymco', 'lambretta', 'lanying', 'leksas', 'lem',
  'lifan', 'linhai', 'lintex', 'lml', 'luqi', 'lynx', 'malaguti', 'maranta', 'megelli',
  'meiduo', 'meka-motor', 'memnun', 'minsk', 'mirage', 'mobylette', 'modenas', 'mondial',
  'monero', 'motard', 'moto-gusto', 'moto-guzzi', 'moto-morini', 'moto-zeen', 'moto-zeta',
  'motobecane', 'motolux', 'motoran', 'motosan', 'motozeus', 'motti', 'muravey',
  'musatti', 'mutt', 'mv-agusta', 'mz', 'nanok', 'nibbi', 'nieve', 'nimizi-borelli',
  'norton', 'nova', 'nsu', 'ocherk', 'ohvale', 'omi', 'orti', 'ortimobil', 'oubao',
  'oxobike', 'pgo', 'piaggio', 'pioneer', 'planet', 'polaris', 'polini', 'presto',
  'puch', 'qjmotor', 'qooder', 'qstrong', 'ramex', 'ramzey', 'rasler', 'regal-raptor',
  'relive', 'renda', 'revolt', 'rewaco', 'rialli', 'rieju', 'rkn', 'rks',
  'rmg-moto-gusto', 'romet', 'royal-alloy', 'royal-enfield', 'rutec', 'salcano',
  'sam-motor', 'scorpa', 'seger', 'sfm', 'shenke', 'sherco', 'shinari', 'simson',
  'ski-doo', 'skygo', 'skyjet', 'skyteam', 'spada', 'stmax', 'sukida', 'superking',
  'swm', 'sym', 'takashi', 'taktas-motor', 'taro', 'telstar', 'tenax', 'tgb', 'titan',
  'tm', 'tm-racing', 'togo', 'triumph', 'tt', 'tvs', 'ugursam', 'um', 'ural',
  'velosolex', 'vespa', 'victory', 'vitello', 'voge', 'volta', 'wangye', 'wsk', 'wuxi',
  'xgjao', 'xingyue', 'xintian', 'yamaha', 'yiben', 'yuan', 'yuki', 'zealsun',
  'zongshen', 'zontes', 'zorro',
]);

const CANONICAL_BRAND_DISPLAY_LABELS: Record<string, string> = {
  'alfa-romeo': 'Alfa Romeo',
  'aston-martin': 'Aston Martin',
  'bmc': 'BMC',
  'bmw': 'BMW',
  'byd': 'BYD',
  'can-am': 'Can-Am',
  'celik-motor': 'Çelik Motor',
  'cfmoto': 'CFMoto',
  'csn-motor': 'CSN Motor',
  'dfm': 'DFM',
  'dfsk': 'DFSK',
  'di-blasi': 'Di Blasi',
  'ds': 'DS Automobiles',
  'ds-automobiles': 'DS Automobiles',
  'gas-gas': 'GasGas',
  'gasgas': 'GasGas',
  'gmc': 'GMC',
  'harley-davidson': 'Harley-Davidson',
  'hazey-turk': 'Hazey Türk',
  'hf-kanuni': 'HF Kanuni',
  'hfkanuni': 'HF Kanuni',
  'hh-moto': 'HH Moto',
  'hm-moto': 'HM Moto',
  'isildar': 'Işıldar',
  'izh': 'IZH',
  'jac': 'JAC',
  'jpn-motor': 'JPN Motor',
  'kadirga': 'Kadırga',
  'kayo': 'Kayo Moto',
  'kayo-moto': 'Kayo Moto',
  'ktm': 'KTM',
  'kuba': 'Kuba',
  'land-rover': 'Land Rover',
  'levc': 'LEVC',
  'lml': 'LML',
  'lynk-and-co': 'Lynk & Co',
  'man': 'MAN',
  'meka-motor': 'Meka Motor',
  'mercedes-benz': 'Mercedes-Benz',
  'mg': 'MG',
  'mini': 'MINI',
  'moto-gusto': 'RMG Moto Gusto',
  'rmg-moto-gusto': 'RMG Moto Gusto',
  'moto-guzzi': 'Moto Guzzi',
  'moto-morini': 'Moto Morini',
  'moto-zeen': 'Moto Zeen',
  'moto-zeta': 'Moto Zeta',
  'mv-agusta': 'MV Agusta',
  'mz': 'MZ',
  'nimizi-borelli': 'Borelli Ledow',
  'borelli-ledow': 'Borelli Ledow',
  'nsu': 'NSU',
  'orti': 'Orti',
  'ortimobil': 'Orti',
  'pgo': 'PGO',
  'qjmotor': 'QJMotor',
  'ram': 'RAM',
  'regal-raptor': 'Regal Raptor',
  'rkn': 'RKN',
  'rks': 'RKS',
  'rolls-royce': 'Rolls-Royce',
  'royal-alloy': 'Royal Alloy',
  'royal-enfield': 'Royal Enfield',
  'sam-motor': 'Sam Motor',
  'sfm': 'SFM',
  'ski-doo': 'Ski-Doo',
  'ssangyong': 'SsangYong',
  'swm': 'SWM',
  'sym': 'SYM',
  'taktas-motor': 'Taktaş Motor',
  'tgb': 'TGB',
  'the-london-taxi': 'The London Taxi',
  'tm': 'TM Racing',
  'tm-racing': 'TM Racing',
  'tofas': 'Tofaş',
  'tt': 'TT',
  'tvs': 'TVS',
  'ugursam': 'Uğursam',
  'um': 'UM',
  'wsk': 'WSK',
  'xev': 'XEV',
};

function normalizeBrandKey(raw: string): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getBrandDedupeKey(rawName: string): string {
  const rawTrimmed = rawName.trim().toLowerCase();
  if (rawTrimmed === 'tofaş' || rawTrimmed === 'tofas') {
    return 'tofas';
  }
  const slug = normalizeBrandKey(rawName);
  if (!slug) return '';

  const aliasMap: Record<string, string> = {
    'gas-gas': 'gasgas',
    'hf-kanuni': 'hfkanuni',
    'kayo': 'kayo-moto',
    'tm': 'tm-racing',
    'moto-gusto': 'rmg-moto-gusto',
    'nimizi-borelli': 'borelli-ledow',
    'ortimobil': 'orti',
    'ds-automobiles': 'ds',
  };
  const mappedSlug = aliasMap[slug] || slug;

  const stripped = mappedSlug
    .replace(/-(motor|motors|motocorp|motosiklet|motorcycle)$/i, '')
    .replace(/[^a-z0-9]/g, '');

  return stripped || mappedSlug.replace(/[^a-z0-9]/g, '');
}

function deduplicateAndSortBrands(rawBrands: string[], preferredList: string[] = []): string[] {
  const seenKeys = new Map<string, string>();

  for (const pref of preferredList) {
    if (!pref || pref === 'Tüm Markalar') continue;
    const key = getBrandDedupeKey(pref);
    if (!key) continue;
    const slug = normalizeBrandKey(pref);
    const canonicalLabel = CANONICAL_BRAND_DISPLAY_LABELS[slug] || pref.trim();
    if (!seenKeys.has(key)) {
      seenKeys.set(key, canonicalLabel);
    }
  }

  for (const raw of rawBrands) {
    if (!raw || typeof raw !== 'string') continue;
    const clean = raw.trim();
    if (!clean || clean === 'Tüm Markalar') continue;

    const key = getBrandDedupeKey(clean);
    if (!key || seenKeys.has(key)) continue;

    const slug = normalizeBrandKey(clean);
    const canonicalLabel = CANONICAL_BRAND_DISPLAY_LABELS[slug] || clean;
    seenKeys.set(key, canonicalLabel);
  }

  return Array.from(seenKeys.values()).sort((a, b) => a.localeCompare(b, 'tr'));
}

function isGenuineAutomobileBrand(brandName: string, dynamicMotoSlugs?: Set<string>): boolean {
  if (!brandName || brandName === 'Tüm Markalar') return false;
  const rawLower = brandName.trim().toLowerCase();
  if (rawLower === 'tofaş' || rawLower === 'tofas') return true;

  const slug = normalizeBrandKey(brandName);
  const dedupeKey = getBrandDedupeKey(brandName);
  if (!slug || !dedupeKey) return false;

  if (DUAL_VEHICLE_BRAND_SLUGS.has(slug) || DUAL_VEHICLE_BRAND_SLUGS.has(dedupeKey)) {
    return true;
  }

  if (
    PURE_MOTORCYCLE_BRAND_SLUGS.has(slug) ||
    PURE_MOTORCYCLE_BRAND_SLUGS.has(dedupeKey) ||
    (dynamicMotoSlugs && (dynamicMotoSlugs.has(slug) || dynamicMotoSlugs.has(dedupeKey)))
  ) {
    return false;
  }

  return ALLOWED_AUTOMOBILE_BRAND_SLUGS.has(slug) || ALLOWED_AUTOMOBILE_BRAND_SLUGS.has(dedupeKey);
}

interface IsiCepteShowcaseItem {
  id: string;
  isicepteProviderId: string;
  businessName: string;
  slug: string;
  coverImageUrl?: string | null;
  city: string;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  isicepteProfileUrl: string;
  supportedBrands: string[];
  serviceCategories: string[];
  rating: number;
  reviewCount: number;
  isShowcase: boolean;
}

function IsiCepteOneriyorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial query params
  const initialCity = searchParams.get("city") || "Tüm Şehirler";
  const initialBrand = searchParams.get("brand") || "Tüm Markalar";
  const initialCategory = searchParams.get("category") || "Tüm Kategoriler";
  const initialScope = (searchParams.get("scope") as 'SHOWCASE_ONLY' | 'ALL_ELIGIBLE') || "SHOWCASE_ONLY";
  const initialVehicleType: IsiCepteVehicleType =
    searchParams.get("vehicleType") === "MOTORCYCLE" || initialCategory === "Motosiklet Servisi"
      ? "MOTORCYCLE"
      : "AUTOMOBILE";

  const [items, setItems] = useState<IsiCepteShowcaseItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalShowcase, setTotalShowcase] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [scope, setScope] = useState<'SHOWCASE_ONLY' | 'ALL_ELIGIBLE'>(initialScope);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Available filter options from canonical sources and active pool (scoped by Otomobil vs Motosiklet)
  const [availableCities, setAvailableCities] = useState<string[]>(["Tüm Şehirler", ...TURKEY_81_PROVINCES]);
  const [autoBrands, setAutoBrands] = useState<string[]>(["Tüm Markalar", ...INITIAL_AUTOMOBILE_BRANDS]);
  const [motoBrands, setMotoBrands] = useState<string[]>(["Tüm Markalar", ...INITIAL_MOTORCYCLE_BRANDS]);

  const { activeCityId, activeCityName, setActiveCity } = useGlobalCity();

  // Filter form state (dropdown selections before submit)
  const [selectedVehicleType, setSelectedVehicleType] = useState<IsiCepteVehicleType>(initialVehicleType);
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if (initialCity !== "Tüm Şehirler") return initialCity;
    if (activeCityName && activeCityName !== "Tüm Türkiye") return activeCityName;
    return "Tüm Şehirler";
  });
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

  // Applied filter state (triggers API fetch)
  const [appliedVehicleType, setAppliedVehicleType] = useState<IsiCepteVehicleType>(initialVehicleType);
  const [appliedCity, setAppliedCity] = useState<string>(() => {
    if (initialCity !== "Tüm Şehirler") return initialCity;
    if (activeCityName && activeCityName !== "Tüm Türkiye") return activeCityName;
    return "Tüm Şehirler";
  });
  const [appliedBrand, setAppliedBrand] = useState<string>(initialBrand);
  const [appliedCategory, setAppliedCategory] = useState<string>(initialCategory);

  const availableBrands = selectedVehicleType === "MOTORCYCLE" ? motoBrands : autoBrands;
  const availableCategories = useMemo(
    () =>
      selectedVehicleType === "MOTORCYCLE"
        ? ["Tüm Kategoriler", ...MOTORCYCLE_CATEGORIES]
        : ["Tüm Kategoriler", ...AUTOMOBILE_CATEGORIES],
    [selectedVehicleType]
  );

  // Selected Provider Detail Modal
  const [detailModalProvider, setDetailModalProvider] = useState<IsiCepteShowcaseItem | null>(null);

  // Session seed for stable randomization per page view
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(2, 9));

  // Load canonical Otomobil & Motosiklet brand lists from backend (same as Mobile app)
  useEffect(() => {
    const extractBrandNames = (json: any): string[] => {
      if (!json || !json.success || !Array.isArray(json.data)) return [];
      return json.data
        .map((b: any) => (typeof b === "string" ? b : b.label || b.name || b.value))
        .filter(Boolean);
    };

    const loadBrandsByType = async () => {
      try {
        const [autoRes, suvRes, vanRes, motoRes] = await Promise.all([
          fetch(`${API_BASE_URL}/vehicle-filters/brands?category=AUTOMOBILE`).catch(() => null),
          fetch(`${API_BASE_URL}/vehicle-filters/brands?category=SUV_PICKUP`).catch(() => null),
          fetch(`${API_BASE_URL}/vehicle-filters/brands?category=MINIVAN_PANELVAN`).catch(() => null),
          fetch(`${API_BASE_URL}/vehicle-filters/brands?category=MOTORCYCLE`).catch(() => null),
        ]);

        const dynamicMotoSlugs = new Set<string>();
        let extractedMotoNames: string[] = [];

        if (motoRes && motoRes.ok) {
          const motoJson = await motoRes.json();
          extractedMotoNames = extractBrandNames(motoJson);
          for (const mName of extractedMotoNames) {
            const mSlug = normalizeBrandKey(mName);
            const mKey = getBrandDedupeKey(mName);
            if (mSlug && !DUAL_VEHICLE_BRAND_SLUGS.has(mSlug)) dynamicMotoSlugs.add(mSlug);
            if (mKey && !DUAL_VEHICLE_BRAND_SLUGS.has(mKey)) dynamicMotoSlugs.add(mKey);
          }

          const dedupedMoto = deduplicateAndSortBrands(
            [...INITIAL_MOTORCYCLE_BRANDS, ...extractedMotoNames],
            INITIAL_MOTORCYCLE_BRANDS
          );
          setMotoBrands(["Tüm Markalar", ...dedupedMoto]);
        } else {
          const dedupedMoto = deduplicateAndSortBrands(INITIAL_MOTORCYCLE_BRANDS, INITIAL_MOTORCYCLE_BRANDS);
          setMotoBrands(["Tüm Markalar", ...dedupedMoto]);
        }

        const rawAutoCandidates: string[] = [...INITIAL_AUTOMOBILE_BRANDS];
        for (const res of [autoRes, suvRes, vanRes]) {
          if (res && res.ok) {
            const json = await res.json();
            for (const name of extractBrandNames(json)) {
              if (isGenuineAutomobileBrand(name, dynamicMotoSlugs)) {
                rawAutoCandidates.push(name);
              }
            }
          }
        }
        const cleanedAuto = deduplicateAndSortBrands(
          rawAutoCandidates.filter((name) => isGenuineAutomobileBrand(name, dynamicMotoSlugs)),
          INITIAL_AUTOMOBILE_BRANDS
        );
        setAutoBrands(["Tüm Markalar", ...cleanedAuto]);
      } catch {
        // Fallback lists already initialized
      }
    };
    loadBrandsByType();
  }, []);

  // Sync state when global city changes (if URL city param is not explicitly set)
  useEffect(() => {
    if (!searchParams.get("city")) {
      const cityToApply = activeCityName && activeCityName !== "Tüm Türkiye" ? activeCityName : "Tüm Şehirler";
      setSelectedCity(cityToApply);
      setAppliedCity(cityToApply);
      setPage(1);
    }
  }, [activeCityName, searchParams]);

  // Update URL query parameters cleanly
  const syncUrlParams = useCallback(
    (
      vType: IsiCepteVehicleType,
      cityVal: string,
      brandVal: string,
      catVal: string,
      scopeVal: 'SHOWCASE_ONLY' | 'ALL_ELIGIBLE'
    ) => {
      const params = new URLSearchParams();
      if (vType === "MOTORCYCLE") {
        params.set("vehicleType", "MOTORCYCLE");
      }
      if (cityVal && cityVal !== "Tüm Şehirler") {
        params.set("city", cityVal);
      }
      if (brandVal && brandVal !== "Tüm Markalar") {
        params.set("brand", brandVal);
      }
      if (catVal && catVal !== "Tüm Kategoriler") {
        params.set("category", catVal);
      }
      if (scopeVal && scopeVal !== "SHOWCASE_ONLY") {
        params.set("scope", scopeVal);
      }
      const qs = params.toString();
      const newUrl = qs ? `/isicepte-oneriyor?${qs}` : "/isicepte-oneriyor";
      window.history.replaceState(null, "", newUrl);
    },
    []
  );

  // Sync state if URL searchParams change (e.g. back/forward navigation)
  useEffect(() => {
    const qCity = searchParams.get("city") || "Tüm Şehirler";
    const qBrand = searchParams.get("brand") || "Tüm Markalar";
    const qCategory = searchParams.get("category") || "Tüm Kategoriler";
    const qScope = (searchParams.get("scope") as 'SHOWCASE_ONLY' | 'ALL_ELIGIBLE') || "SHOWCASE_ONLY";
    const qVehicleType: IsiCepteVehicleType =
      searchParams.get("vehicleType") === "MOTORCYCLE" || qCategory === "Motosiklet Servisi"
        ? "MOTORCYCLE"
        : "AUTOMOBILE";

    setSelectedVehicleType(qVehicleType);
    setSelectedCity(qCity);
    setSelectedBrand(qBrand);
    setSelectedCategory(qCategory);
    setAppliedVehicleType(qVehicleType);
    setAppliedCity(qCity);
    setAppliedBrand(qBrand);
    setAppliedCategory(qCategory);
    setScope(qScope);
  }, [searchParams]);

  // Handle Vasıta Türü dropdown change (Otomobil <-> Motosiklet)
  const handleVehicleTypeDropdownChange = (nextType: IsiCepteVehicleType) => {
    if (nextType === selectedVehicleType) return;
    setSelectedVehicleType(nextType);
    setSelectedBrand("Tüm Markalar");
    setSelectedCategory("Tüm Kategoriler");
    setAppliedVehicleType(nextType);
    setAppliedBrand("Tüm Markalar");
    setAppliedCategory("Tüm Kategoriler");
    setPage(1);
    syncUrlParams(nextType, appliedCity, "Tüm Markalar", "Tüm Kategoriler", scope);
  };

  // Fetch recommendations from API
  const fetchRecommendations = useCallback(
    async (
      vType: IsiCepteVehicleType,
      cityVal: string,
      brandVal: string,
      catVal: string,
      scopeVal: 'SHOWCASE_ONLY' | 'ALL_ELIGIBLE',
      pageNum: number
    ) => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (cityVal && cityVal !== "Tüm Şehirler") {
          query.append("city", cityVal);
        }
        if (brandVal && brandVal !== "Tüm Markalar") {
          query.append("brand", brandVal);
        }
        if (catVal && catVal !== "Tüm Kategoriler") {
          query.append("category", catVal);
        } else if (vType === "MOTORCYCLE" && brandVal === "Tüm Markalar") {
          query.append("category", "Motosiklet Servisi");
        }
        query.append("scope", scopeVal);
        query.append("page", pageNum.toString());
        query.append("limit", scopeVal === "SHOWCASE_ONLY" ? "50" : "24");
        query.append("seed", sessionSeed);

        const res = await fetch(`${API_BASE_URL}/isicepte/recommendations?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
          setTotalCount(data.total || 0);
          setTotalShowcase(data.totalShowcase || 0);
          setTotalAll(data.totalAll || 0);
          setTotalPages(data.totalPages || 1);

          if (Array.isArray(data.availableCities) && data.availableCities.length > 0) {
            setAvailableCities(
              data.availableCities.includes("Tüm Şehirler")
                ? data.availableCities
                : ["Tüm Şehirler", ...data.availableCities]
            );
          }
          if (Array.isArray(data.availableBrands) && data.availableBrands.length > 0) {
            const extraAutoBrands = data.availableBrands.filter((b: string) =>
              isGenuineAutomobileBrand(b)
            );
            if (extraAutoBrands.length > 0) {
              setAutoBrands((prev) => {
                const existing = prev.filter((x) => x !== "Tüm Markalar" && isGenuineAutomobileBrand(x));
                const deduped = deduplicateAndSortBrands(
                  [...existing, ...extraAutoBrands],
                  INITIAL_AUTOMOBILE_BRANDS
                );
                return ["Tüm Markalar", ...deduped];
              });
            }
          }

          // Record impression event for Vitrin analytics if items exist
          if (data.items && data.items.length > 0) {
            fetch(`${API_BASE_URL}/isicepte/events`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventType: "ISICEPTE_SHOWCASE_IMPRESSION",
                city: cityVal !== "Tüm Şehirler" ? cityVal : undefined,
                brand: brandVal !== "Tüm Markalar" ? brandVal : undefined,
                metadata: {
                  vehicleType: vType,
                  category: catVal !== "Tüm Kategoriler" ? catVal : undefined,
                  scope: scopeVal,
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
        console.error("Failed to load providers:", e);
        setItems([]);
        setTotalCount(0);
        setTotalShowcase(0);
        setTotalAll(0);
      } finally {
        setLoading(false);
      }
    },
    [sessionSeed]
  );

  useEffect(() => {
    fetchRecommendations(appliedVehicleType, appliedCity, appliedBrand, appliedCategory, scope, page);
  }, [appliedVehicleType, appliedCity, appliedBrand, appliedCategory, scope, page, fetchRecommendations]);

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedVehicleType(selectedVehicleType);
    setAppliedCity(selectedCity);
    setAppliedBrand(selectedBrand);
    setAppliedCategory(selectedCategory);
    syncUrlParams(selectedVehicleType, selectedCity, selectedBrand, selectedCategory, scope);
    if (selectedCity && selectedCity !== "Tüm Şehirler") {
      setActiveCity(selectedCity);
    } else {
      setActiveCity(null);
    }
  };

  const handleClearCityFilter = () => {
    setSelectedCity("Tüm Şehirler");
    setAppliedCity("Tüm Şehirler");
    setPage(1);
    syncUrlParams(appliedVehicleType, "Tüm Şehirler", appliedBrand, appliedCategory, scope);
    setActiveCity(null);
  };

  const handleClearBrandFilter = () => {
    setSelectedBrand("Tüm Markalar");
    setAppliedBrand("Tüm Markalar");
    setPage(1);
    syncUrlParams(appliedVehicleType, appliedCity, "Tüm Markalar", appliedCategory, scope);
  };

  const handleClearCategoryFilter = () => {
    setSelectedCategory("Tüm Kategoriler");
    setAppliedCategory("Tüm Kategoriler");
    setPage(1);
    syncUrlParams(appliedVehicleType, appliedCity, appliedBrand, "Tüm Kategoriler", scope);
  };

  const handleClearAllFilters = () => {
    setSelectedCity("Tüm Şehirler");
    setSelectedBrand("Tüm Markalar");
    setSelectedCategory("Tüm Kategoriler");
    setAppliedCity("Tüm Şehirler");
    setAppliedBrand("Tüm Markalar");
    setAppliedCategory("Tüm Kategoriler");
    setPage(1);
    syncUrlParams(appliedVehicleType, "Tüm Şehirler", "Tüm Markalar", "Tüm Kategoriler", scope);
    setActiveCity(null);
  };

  const handleToggleScope = (newScope: 'SHOWCASE_ONLY' | 'ALL_ELIGIBLE') => {
    setScope(newScope);
    setPage(1);
    syncUrlParams(appliedVehicleType, appliedCity, appliedBrand, appliedCategory, newScope);
  };

  const handleOpenDetailModal = (provider: IsiCepteShowcaseItem) => {
    setDetailModalProvider(provider);
    fetch(`${API_BASE_URL}/isicepte/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "ISICEPTE_PROFILE_CLICK",
        providerId: provider.id,
        city: provider.city,
      }),
    }).catch(() => {});
  };

  const handleOutboundClick = (provider: IsiCepteShowcaseItem) => {
    fetch(`${API_BASE_URL}/isicepte/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "ISICEPTE_OUTBOUND_CLICK",
        providerId: provider.id,
        city: provider.city,
      }),
    }).catch(() => {});
    window.open(provider.isicepteProfileUrl, "_blank", "noopener,noreferrer");
  };

  const displayedItems = useMemo(() => {
    if (
      appliedVehicleType === "AUTOMOBILE" &&
      appliedCategory === "Tüm Kategoriler" &&
      appliedBrand === "Tüm Markalar"
    ) {
      return items.filter((item) => {
        const cats = item.serviceCategories || [];
        if (cats.length === 1 && cats[0] === "Motosiklet Servisi") {
          return false;
        }
        return true;
      });
    }
    return items;
  }, [items, appliedVehicleType, appliedCategory, appliedBrand]);

  const isFiltered =
    appliedCity !== "Tüm Şehirler" ||
    appliedBrand !== "Tüm Markalar" ||
    appliedCategory !== "Tüm Kategoriler";

  // Build contextual results summary
  const getContextualSummaryTitle = () => {
    const vehicleLabel = appliedVehicleType === "MOTORCYCLE" ? "Motosiklet" : "Otomobil";
    const hasCity = appliedCity !== "Tüm Şehirler";
    const hasBrand = appliedBrand !== "Tüm Markalar";
    const hasCat = appliedCategory !== "Tüm Kategoriler";

    let descriptor = "";
    if (hasCity && hasBrand && hasCat) {
      descriptor = `${appliedCity} şehrinde ${appliedBrand} için ${appliedCategory} hizmeti veren`;
    } else if (hasCity && hasBrand) {
      descriptor = `${appliedCity} şehrinde ${appliedBrand} uzmanı`;
    } else if (hasCity && hasCat) {
      descriptor = `${appliedCity} şehrinde ${appliedCategory} hizmeti veren`;
    } else if (hasBrand && hasCat) {
      descriptor = `${appliedBrand} için ${appliedCategory} hizmeti veren`;
    } else if (hasCity) {
      descriptor = `${appliedCity} şehrindeki (${vehicleLabel})`;
    } else if (hasBrand) {
      descriptor = `${appliedBrand} uzmanı`;
    } else if (hasCat) {
      descriptor = `${appliedCategory} hizmeti veren`;
    } else {
      descriptor = vehicleLabel;
    }

    if (scope === "SHOWCASE_ONLY") {
      return descriptor ? `${descriptor} vitrin üyeleri` : "Tüm Vitrin Üyeleri";
    } else {
      return descriptor ? `${descriptor} tüm ustalar ve servisler` : "Tüm Ustalar ve Servisler";
    }
  };

  return (
    <div className="w-full flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Top Header & Filter Controls Bar */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-white/10">
        {/* Title with İşi Cepte App Logo on the Left */}
        <div className="flex items-start gap-4 max-w-2xl">
          <img
            src="/assets/images/isicepte-logo.png"
            alt="İşi Cepte Logo"
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-contain shrink-0 shadow-lg mt-0.5"
          />
          <div className="space-y-2">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight whitespace-nowrap">
                İşi Cepte Öneriyor
              </h1>
              <a
                href="https://isicepte.com"
                target="_blank"
                rel="noopener noreferrer"
                title="İşi Cepte' yi Keşfet"
                aria-label="İşi Cepte' yi Keşfet"
                onClick={() => {
                  fetch(`${API_BASE_URL}/isicepte/events`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      eventType: "ISICEPTE_OUTBOUND_CLICK",
                      city: appliedCity !== "Tüm Şehirler" ? appliedCity : undefined,
                    }),
                  }).catch(() => {});
                }}
                className="h-9 md:h-10 px-3.5 md:px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs md:text-sm font-bold flex items-center gap-1.5 transition shadow-lg shadow-orange-600/30 hover:scale-[1.03] shrink-0 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 md:w-4.5 md:h-4.5 stroke-[2.75]" />
                <span>İşi Cepte&apos; yi Keşfet</span>
              </a>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Öne çıkan usta ve servisleri keşfedin.
              <br />
              Usta veya servis misiniz?
              <br />
              Siz de İşi Cepte’de yerinizi alın.
            </p>
          </div>
        </div>

        {/* 4-Filter Form: VASITA TÜRÜ | ŞEHİR | MARKA | KATEGORİ | [FİLTRELE] */}
        <form
          onSubmit={handleApplyFilters}
          className="flex flex-wrap sm:flex-nowrap items-end gap-2.5 w-full xl:w-auto"
        >
          {/* 1. Vasıta Türü Dropdown */}
          <div className="w-full sm:w-[112px] space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Vasıta Türü
            </label>
            <select
              value={selectedVehicleType}
              onChange={(e) => handleVehicleTypeDropdownChange(e.target.value as IsiCepteVehicleType)}
              className="w-full bg-[#0b0f19] border border-white/15 text-white rounded-xl px-2.5 py-2.5 text-xs font-semibold focus:border-orange-500 focus:outline-none cursor-pointer transition truncate"
            >
              <option value="AUTOMOBILE" className="bg-slate-900 text-white">
                Otomobil
              </option>
              <option value="MOTORCYCLE" className="bg-slate-900 text-white">
                Motosiklet
              </option>
            </select>
          </div>

          {/* 2. City Dropdown */}
          <div className="w-full sm:w-[122px] space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Şehir
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-[#0b0f19] border border-white/15 text-white rounded-xl px-2.5 py-2.5 text-xs font-semibold focus:border-orange-500 focus:outline-none cursor-pointer transition truncate"
            >
              {availableCities.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Brand Dropdown */}
          <div className="w-full sm:w-[126px] space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Marka
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-[#0b0f19] border border-white/15 text-white rounded-xl px-2.5 py-2.5 text-xs font-semibold focus:border-orange-500 focus:outline-none cursor-pointer transition truncate"
            >
              {availableBrands.map((b) => (
                <option key={b} value={b} className="bg-slate-900 text-white">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Category Dropdown */}
          <div className="w-full sm:w-[136px] space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Kategori
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#0b0f19] border border-white/15 text-white rounded-xl px-2.5 py-2.5 text-xs font-semibold focus:border-orange-500 focus:outline-none cursor-pointer transition truncate"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Filter Button */}
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/25 shrink-0 h-[38px]"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrele</span>
          </button>
        </form>
      </div>

      {/* Filtered Mode Context Bar & Chips */}
      {(isFiltered || scope === "ALL_ELIGIBLE") && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm sm:text-base font-bold text-white">
              {getContextualSummaryTitle()}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-mono font-bold">
              {scope === "SHOWCASE_ONLY" ? `${totalCount} vitrin üyesi` : `${totalCount} toplam işletme`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Mode Indicator */}
            {scope === "ALL_ELIGIBLE" && (
              <button
                type="button"
                onClick={() => handleToggleScope("SHOWCASE_ONLY")}
                className="px-3 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>← Sadece Vitrin Üyeleri</span>
              </button>
            )}

            {/* City Chip */}
            {appliedCity !== "Tüm Şehirler" && (
              <button
                type="button"
                onClick={handleClearCityFilter}
                className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{appliedCity}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Brand Chip */}
            {appliedBrand !== "Tüm Markalar" && (
              <button
                type="button"
                onClick={handleClearBrandFilter}
                className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{appliedBrand}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Category Chip */}
            {appliedCategory !== "Tüm Kategoriler" && (
              <button
                type="button"
                onClick={handleClearCategoryFilter}
                className="px-3 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{appliedCategory}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {isFiltered && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs text-slate-400 hover:text-white underline font-semibold transition cursor-pointer ml-2"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-xs text-slate-400 font-semibold">
            {scope === "SHOWCASE_ONLY" ? "Vitrin üyeleri yükleniyor..." : "Tüm ustalar ve servisler yükleniyor..."}
          </span>
        </div>
      )}

      {/* Empty State — 100% Real, Zero Mock Filler */}
      {!loading && displayedItems.length === 0 && (
        <div className="py-20 px-6 rounded-3xl bg-slate-900/40 border border-white/10 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {scope === "SHOWCASE_ONLY"
                ? `Seçili kriterlere uygun aktif ${appliedVehicleType === "MOTORCYCLE" ? "Motosiklet" : "Otomobil"} Vitrin üyesi bulunmuyor.`
                : isFiltered
                ? "Seçtiğiniz şehir, marka ve kategoriye uygun işletme bulunamadı."
                : "Şu anda İşiCepte Öneriyor bölümünde aktif işletme bulunmuyor."}
            </h3>
            <p className="text-xs text-slate-400">
              {scope === "SHOWCASE_ONLY" && totalAll > 0
                ? `Bu filtrelerle eşleşen ${totalAll} standart usta ve servis bulunuyor. "Tüm Ustaları Gör" butonuna tıklayarak erişebilirsiniz.`
                : isFiltered
                ? "Filtreleri değiştirerek veya temizleyerek diğer servisleri görebilirsiniz."
                : "Yeni üye otomotiv servisleri eklendikçe burada listelenecektir."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {scope === "SHOWCASE_ONLY" && totalAll > 0 && (
              <button
                type="button"
                onClick={() => handleToggleScope("ALL_ELIGIBLE")}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
              >
                <span>Tüm Ustaları Gör ({totalAll} İşletme)</span>
                <span>➔</span>
              </button>
            )}
            {isFiltered && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-white/10"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Provider Cards Grid (3 Columns Desktop, 2 Tablet, 1 Mobile) */}
      {!loading && displayedItems.length > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {displayedItems.map((provider) => (
              <div
                key={provider.id}
                className="rounded-3xl bg-[#0b101e]/90 border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl overflow-hidden flex flex-col justify-between group"
              >
                {/* Card Top: Cover Image Area & Showcase Badge */}
                <div>
                  <div className="relative h-48 w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                    {provider.coverImageUrl ? (
                      <img
                        src={provider.coverImageUrl}
                        alt={provider.businessName}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center text-slate-600 gap-2">
                        <Wrench className="w-8 h-8 text-slate-500" />
                        <span className="text-[11px] font-medium text-slate-400">İşiCepte Otomotiv Servisi</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b101e] via-transparent to-black/40" />

                    {/* Vitrin Üyesi Badge (Only if real showcase active entitlement) */}
                    {provider.isShowcase && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black shadow-lg uppercase tracking-wider">
                          👑 Vitrin Üyesi
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-6 space-y-3.5">
                    {/* Header: Name and Real Rating */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-white tracking-tight line-clamp-1">
                        {provider.businessName}
                      </h3>
                      {provider.rating > 0 && (
                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-1 text-orange-400 font-bold text-sm">
                            <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                            <span>{provider.rating.toFixed(1)}</span>
                          </div>
                          {provider.reviewCount > 0 && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {provider.reviewCount} değerlendirme
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        {provider.city} {provider.district ? `/ ${provider.district}` : ""}
                      </span>
                    </div>

                    {/* Supported Brands */}
                    {provider.supportedBrands && provider.supportedBrands.length > 0 && (
                      <div className="text-xs text-slate-300 font-medium">
                        {provider.supportedBrands.join(" • ")}
                      </div>
                    )}

                    {/* Canonical Service Categories Chips */}
                    {provider.serviceCategories && provider.serviceCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {provider.serviceCategories.map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/5 text-slate-300 text-[11px] font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-6 pt-0 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenDetailModal(provider)}
                    className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition text-center shadow-lg shadow-orange-600/20 cursor-pointer"
                  >
                    Profili Gör
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOutboundClick(provider)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>İşiCepte&apos;de Aç</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Under Vitrin Section CTA: "TÜM USTALARI GÖR" Button in Showcase View */}
          {scope === "SHOWCASE_ONLY" && totalAll > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-base font-extrabold text-white">
                  Tüm Ustaları ve Servisleri Görün
                </h3>
                <p className="text-xs text-slate-400">
                  Aynı filtre kriterlerine uyan toplam {totalAll} adet kayıtlı işletme bulunmaktadır.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleScope("ALL_ELIGIBLE")}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-blue-600/25 shrink-0 flex items-center gap-2"
              >
                <span>Tüm Ustaları Gör ({totalAll})</span>
                <span>➔</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer"
          >
            Önceki
          </button>
          <span className="text-xs text-slate-400 font-mono px-3">
            Sayfa {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* PROVIDER DETAIL MODAL (Matching Görsel 3) */}
      {detailModalProvider && (
        <div
          onClick={() => setDetailModalProvider(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b101e] border border-white/15 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                {detailModalProvider.isShowcase ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                    👑 İŞİCEPTE VİTRİN ÜYESİ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                    🛠️ İŞİCEPTE ONAYLI SERVİS
                  </span>
                )}
                <h3 className="text-xl font-black text-white mt-1.5">
                  {detailModalProvider.businessName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalProvider(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Cover Image */}
            <div className="h-44 w-full rounded-2xl bg-slate-950 overflow-hidden relative flex items-center justify-center">
              {detailModalProvider.coverImageUrl ? (
                <img
                  src={detailModalProvider.coverImageUrl}
                  alt={detailModalProvider.businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Wrench className="w-8 h-8 text-slate-500" />
                  <span className="text-xs font-medium text-slate-400">İşletme Görseli</span>
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="space-y-4 text-xs text-slate-300">
              {/* Rating & Reviews (Only if real data exists) */}
              {detailModalProvider.rating > 0 && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">
                      Müşteri Değerlendirmesi
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                      <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                      <span>{detailModalProvider.rating.toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                  {detailModalProvider.reviewCount > 0 && (
                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      {detailModalProvider.reviewCount} gerçek değerlendirme
                    </div>
                  )}
                </div>
              )}

              {/* Location & Address */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Adres & Konum</div>
                <div className="text-slate-200">
                  {detailModalProvider.address ||
                    `${detailModalProvider.city} ${
                      detailModalProvider.district ? `/ ${detailModalProvider.district}` : ""
                    }`}
                </div>
              </div>

              {/* Supported Brands (Only if exists) */}
              {detailModalProvider.supportedBrands && detailModalProvider.supportedBrands.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Hizmet Verilen Araç Markaları
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailModalProvider.supportedBrands.map((b, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-semibold"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hizmet Uzmanlıkları (Strict Canonical Oto Hizmetleri Categories) */}
              {detailModalProvider.serviceCategories && detailModalProvider.serviceCategories.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Hizmet Uzmanlıkları
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailModalProvider.serviceCategories.map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/5 text-slate-300 text-[11px] font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Phone / Contact (Only if exists) */}
              {detailModalProvider.phone && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">İletişim Telefonu</div>
                  <div className="text-slate-200 font-mono font-bold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-orange-400" />
                    <span>{detailModalProvider.phone}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDetailModalProvider(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => handleOutboundClick(detailModalProvider)}
                className="flex-1 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/30"
              >
                <ExternalLink className="w-4 h-4" />
                <span>İşiCepte&apos;de Profili Aç</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IsiCepteOneriyorPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex-1 max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-xs text-slate-400 font-semibold">Sayfa yükleniyor...</span>
        </div>
      }
    >
      <IsiCepteOneriyorContent />
    </Suspense>
  );
}
