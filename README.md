# Used Car Intelligence App

İkinci el araç satın alacak kişilere teknik özellikler, kronik sorunlar, bakım maliyetleri, satıcı soruları ve ekspertiz kontrol listeleri sunan yapay zeka destekli karar destek platformudur.

---

## Mimarisi ve Teknolojileri

*   **Monorepo:** npm workspaces tabanlı monorepo yapısı.
*   **Backend (NestJS):** Node.js NestJS framework, Express tabanlı HTTP sunucusu ve Prisma ORM (PostgreSQL).
*   **Admin Panel (Next.js):** Next.js 14 App Router, Tailwind CSS.
*   **Mobil Uygulama (Expo):** React Native ve Expo Router.

---

## Hızlı Başlangıç Rehberi

### 1. Bağımlılıkların Kurulması

Proje kök dizininde npm paketlerini kurun:

```bash
npm install
```

### 2. PostgreSQL Veritabanının Başlatılması (Docker)

Local geliştirme veritabanını Docker ile arka planda ayağa kaldırın:

```bash
docker compose up -d
```

### 3. Prisma Şema Doğrulama & Veritabanı Seed

Prisma şemasını doğrulayın, tabloları oluşturun ve örnek verileri (marka, model, varyant, limit kuralları vb.) doldurun:

```bash
# Şema Doğrulama (Prisma Validate)
npm run db:validate

# Veritabanı Migration (Tabloları Oluşturma)
npm run db:migrate

# Örnek Verilerin Yüklenmesi (Seed Data)
npm run db:seed
```

### 4. Projeyi Geliştirme Modunda Çalıştırma

Monorepo workspace'lerindeki projeleri kök dizindeki komutlarla hızlıca başlatın:

```bash
# NestJS Backend API (http://localhost:3000)
npm run dev:api

# Next.js Admin Panel (http://localhost:3001)
npm run dev:admin

# React Native Expo Mobile App
npm run dev:mobile
```

---

## API Servisleri

*   **REST API:** `http://localhost:3000`
*   **Swagger API Dökümantasyonu:** `http://localhost:3000/docs`
*   **Healthcheck:** `http://localhost:3000/health`
