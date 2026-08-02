import { ReactNode } from 'react';

export type ReportNavigationItem = {
  key: string;
  label: string;
  href: string;
  permission?: string;
  keywords?: string[];
};

export type ReportNavigationGroup = {
  key: string;
  label: string;
  iconName: string;
  permission?: string;
  children?: ReportNavigationItem[];
  href?: string; // For items without children like Yönetici Özeti
};

export const reportNavigationConfig: ReportNavigationGroup[] = [
  {
    key: 'OVERVIEW',
    label: 'Yönetici Özeti',
    iconName: 'LayoutDashboard',
    href: '/admin/reports',
  },
  {
    key: 'USERS',
    label: 'Kullanıcılar',
    iconName: 'Users',
    children: [
      {
        key: 'USER_GROWTH',
        label: 'Büyüme ve Aktivite',
        href: '/admin/reports/users/growth',
        keywords: ['büyüme', 'aktivite', 'kayıt', 'aktif', 'kullanıcı'],
      },
      {
        key: 'USER_FUNNEL',
        label: 'Dönüşüm Hunisi',
        href: '/admin/reports/users/funnel',
        keywords: ['dönüşüm', 'funnel', 'huni', 'conversion'],
      },
      {
        key: 'USER_RETENTION',
        label: 'Kullanıcı Tutundurma ve Cohort',
        href: '/admin/reports/users/retention',
        keywords: ['retention', 'cohort', 'tutundurma', 'elde tutma'],
      },
      {
        key: 'USER_PACKAGES',
        label: 'Paket Dağılımı',
        href: '/admin/reports/users/packages',
        keywords: ['paket', 'dağılım', 'ücretsiz', 'tanışma', 'yetkin', 'profesyonel'],
      },
    ],
  },
  {
    key: 'PRODUCT_AI',
    label: 'Ürün ve AI',
    iconName: 'Bot',
    children: [
      {
        key: 'AI_REPORTS',
        label: 'AI Araç Raporları',
        href: '/admin/reports/product/ai-reports',
        keywords: ['ai', 'rapor', 'yapay zeka', 'raporlar'],
      },
      {
        key: 'CHATBOT',
        label: 'Chatbot Kullanımı',
        href: '/admin/reports/product/chatbot',
        keywords: ['chatbot', 'gemini', 'mesaj', 'sohbet', 'bot'],
      },
      {
        key: 'COMPARISONS',
        label: 'Araç Karşılaştırma',
        href: '/admin/reports/product/comparisons',
        keywords: ['karşılaştırma', 'kıyaslama', 'comparison', 'araç'],
      },
      {
        key: 'ENCYCLOPEDIA',
        label: 'Araç Ansiklopedisi',
        href: '/admin/reports/product/encyclopedia',
        keywords: ['ansiklopedi', 'encyclopedia', 'kronik', 'kart'],
      },
      {
        key: 'VEHICLE_DISCOVERY',
        label: 'Aracını Bul',
        href: '/admin/reports/product/vehicle-discovery',
        keywords: ['aracını bul', 'swipe', 'keşfet', 'discovery'],
      },
    ],
  },
  {
    key: 'LISTINGS',
    label: 'İlanlar',
    iconName: 'Car',
    children: [
      {
        key: 'LISTING_OVERVIEW',
        label: 'Genel Bakış',
        href: '/admin/reports/listings/overview',
        keywords: ['ilan', 'genel bakış', 'aktif', 'bekleyen', 'satılan'],
      },
      {
        key: 'LISTING_PERFORMANCE',
        label: 'İlan Performansı',
        href: '/admin/reports/listings/performance',
        keywords: ['performans', 'görüntülenme', 'favori', 'iletişim'],
      },
      {
        key: 'LISTING_QUALITY',
        label: 'Kalite Denetimi',
        href: '/admin/reports/listings/quality',
        keywords: ['kalite', 'denetim', 'fotoğraf', 'fiyat', 'açıklama'],
      },
      {
        key: 'LISTING_SHOWCASE',
        label: 'Vitrin Etkisi',
        href: '/admin/reports/listings/showcase',
        keywords: ['vitrin', 'etkisi', 'lift', 'öne çıkarma', 'showcase'],
      },
      {
        key: 'LISTING_SUPPLY_DEMAND',
        label: 'Arz–Talep Analizi',
        href: '/admin/reports/listings/supply-demand',
        keywords: ['arz', 'talep', 'gap', 'analiz', 'açık'],
      },
    ],
  },
  {
    key: 'FINANCE',
    label: 'Finans',
    iconName: 'CircleDollarSign',
    children: [
      {
        key: 'SUBSCRIPTIONS',
        label: 'Abonelikler',
        href: '/admin/reports/finance/subscriptions',
        keywords: ['abonelik', 'subscription', 'abone', 'tier'],
      },
      {
        key: 'REVENUE',
        label: 'Gelir ve MRR / ARR',
        href: '/admin/reports/finance/revenue',
        keywords: ['gelir', 'mrr', 'arr', 'revenue', 'finans'],
      },
      {
        key: 'ONE_TIME_PACKAGES',
        label: 'Tek Seferlik Paketler',
        href: '/admin/reports/finance/one-time-packages',
        keywords: ['tek seferlik', 'paket', 'jeton', 'kredi'],
      },
      {
        key: 'COSTS',
        label: 'Maliyetler',
        href: '/admin/reports/finance/costs',
        keywords: ['maliyet', 'cost', 'altyapı', 'ai maliyeti', 'sunucu'],
      },
      {
        key: 'PROFITABILITY',
        label: 'Kârlılık ve Marj',
        href: '/admin/reports/finance/profitability',
        keywords: ['kârlılık', 'marj', 'net kâr', 'brüt marj', 'profitability'],
      },
    ],
  },
  {
    key: 'CLUB',
    label: 'Tork Scout Club',
    iconName: 'Shield',
    children: [
      {
        key: 'CLUB_ENGAGEMENT',
        label: 'Kullanım ve Etkileşim',
        href: '/admin/reports/club?view=engagement',
        keywords: ['club', 'etkileşim', 'kullanım', 'ziyaretçi', 'retention'],
      },
      {
        key: 'CLUB_CONTENT',
        label: 'İçerik Performansı',
        href: '/admin/reports/club?view=content',
        keywords: ['içerik', 'gönderi', 'yorum', 'post', 'taslak'],
      },
      {
        key: 'CLUB_MODERATION',
        label: 'Moderasyon',
        href: '/admin/reports/club?view=moderation',
        keywords: ['moderasyon', 'mute', 'ban', 'gizlenen yorum', 'inceleme'],
      },
    ],
  },
  {
    key: 'VEHICLE_DATA',
    label: 'Araç Verisi',
    iconName: 'Database',
    children: [
      {
        key: 'DATA_COVERAGE',
        label: 'Veri Kapsamı',
        href: '/admin/reports/vehicle-data/coverage',
        keywords: ['veri', 'kapsam', 'katalog', 'marka', 'model', 'varyant'],
      },
      {
        key: 'EVIDENCE_QUALITY',
        label: 'Kaynak ve Kanıt Kalitesi',
        href: '/admin/reports/vehicle-data/evidence',
        keywords: ['evidence', 'kanıt', 'kaynak', 'kalite', 'onaylanmış'],
      },
      {
        key: 'DATA_GAPS',
        label: 'Veri Açıkları',
        href: '/admin/reports/vehicle-data/gaps',
        keywords: ['açık', 'eksik', 'gap', 'iş kuyruğu', 'recall'],
      },
    ],
  },
  {
    key: 'MARKETING_AUDIENCE',
    label: 'Pazarlama ve Kitle',
    iconName: 'Megaphone',
    children: [
      {
        key: 'MARKETING',
        label: 'Kampanya ve ROAS / CAC',
        href: '/admin/reports/marketing',
        keywords: ['pazarlama', 'roas', 'cac', 'adspend', 'reklam', 'google', 'meta'],
      },
      {
        key: 'GEOGRAPHY_DEVICE',
        label: 'Coğrafya ve Cihaz',
        href: '/admin/reports/geography-device',
        keywords: ['coğrafya', 'cihaz', 'şehir', 'platform', 'os', 'tarayıcı'],
      },
    ],
  },
  {
    key: 'SYSTEM_SECURITY',
    label: 'Sistem ve Güvenlik',
    iconName: 'Settings',
    children: [
      {
        key: 'SYSTEM_AI',
        label: 'Sistem ve AI Performansı',
        href: '/admin/reports/system-ai',
        keywords: ['sistem', 'latency', 'gecikme', 'p50', 'p95', 'p99', 'hata', 'fallback'],
      },
      {
        key: 'MESSAGING',
        label: 'Mesajlaşma Analitiği',
        href: '/admin/reports/messaging',
        keywords: ['mesajlaşma', 'mesaj', 'analitik', 'yanıt oranı'],
      },
      {
        key: 'SECURITY',
        label: 'Yönetim ve Güvenlik Kayıtları',
        href: '/admin/reports/security',
        keywords: ['güvenlik', 'audit', 'rate limit', 'log', 'askıya alınan'],
      },
    ],
  },
];
