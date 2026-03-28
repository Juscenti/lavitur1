# Lavitúr Admin App

A React Native + Expo admin console for the Lavitúr backend.

## Tech Stack
- **Expo SDK ~55** with Expo Router (file-based routing)
- **Supabase JS** for auth (email/password)
- **React Native** for UI
- **TypeScript** throughout

---

## Setup & Run

### 1. Install dependencies

```bash
cd TheApp
npm install
```

### 2. Environment

The app uses your `.env` values (loaded by Expo) to set:
- `VITE_API_BASE` (backend base URL)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Defaults are provided in `app.config.js`, but using `.env` is recommended to keep everything aligned with your deployed Render backend and Supabase project.

> **Never** put `SUPABASE_SERVICE_ROLE_KEY` in this app. It is server-only.

### 3. Start the dev server

```bash
cd TheApp
npx expo start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan the QR code with **Expo Go** on a real device
- Press `w` for web browser

---

## Auth

Only accounts with `profiles.role` of **`admin`** or **`representative`** can log in.

The login screen calls:
```
supabase.auth.signInWithPassword({ email, password })
```

All API calls to `/api/admin/*` include:
```
Authorization: Bearer <supabase_access_token>
```

---

## Screens / Routes

| Route | Screen |
|-------|--------|
| `/login` | Sign-in |
| `/(tabs)/dashboard` | KPI overview |
| `/(tabs)/orders` | Orders list + detail |
| `/(tabs)/products` | Products CRUD |
| `/(tabs)/support` | Support tickets |
| `/(tabs)/more` | Navigation hub |
| `/(tabs)/users` | User management |
| `/(tabs)/analytics` | Analytics overview |
| `/(tabs)/discounts` | Discount codes |
| `/(tabs)/content` | Content blocks CMS |
| `/(tabs)/loyalty` | Loyalty program |
| `/(tabs)/roles` | Roles & permissions |
| `/(tabs)/security` | Security events |
| `/(tabs)/settings` | App settings |
| `/(tabs)/database` | DB health & jobs |

---

## Backend

- Base URL: `https://lavitur.onrender.com`
- Admin API prefix: `/api/admin`
- Note: even if you set `VITE_API_BASE` to `localhost`, the app enforces the Render URL in this setup.

---

## Project Structure

```
lavitur-admin/
├── app/
│   ├── _layout.tsx         # Root layout + AuthProvider
│   ├── index.tsx           # Auth redirect gate
│   ├── login.tsx           # Login screen
│   └── (tabs)/
│       ├── _layout.tsx     # Bottom tab navigator
│       ├── dashboard.tsx
│       ├── orders.tsx
│       ├── products.tsx
│       ├── support.tsx
│       ├── more.tsx        # Hub for remaining screens
│       ├── users.tsx
│       ├── analytics.tsx
│       ├── discounts.tsx
│       ├── content.tsx
│       ├── loyalty.tsx
│       ├── roles.tsx
│       ├── security.tsx
│       ├── settings.tsx
│       └── database.tsx
├── components/
│   └── ui.tsx              # Shared components
├── constants/
│   ├── config.ts           # API URLs + keys
│   └── theme.ts            # Design tokens
├── context/
│   └── AuthContext.tsx     # Auth state
└── lib/
    ├── api.ts              # Authenticated API client
    └── supabase.ts         # Supabase client
```

---

## Building for Production

```bash
# EAS Build (recommended)
npm install -g eas-cli
eas build --platform ios
eas build --platform android

# Or local builds
npx expo run:ios
npx expo run:android
```
