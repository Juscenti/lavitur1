# Lavitúr Frontend (React)

React frontend for Lavitúr, preserving the original UI. Uses Vite, React Router, and Supabase auth; data goes through your REST API.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment** (optional)

   Create `.env` in this folder if you need to override defaults:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_API_BASE=http://localhost:5000
   ```

   If omitted, the app uses the same Supabase project as the original frontend. `VITE_API_BASE` is only needed when the API runs on a different origin (e.g. backend on port 5000). With the default Vite proxy, `/api` is forwarded to `http://localhost:5000`.

3. **Run**

   ```bash
   npm run dev
   ```

   App runs at http://localhost:3001.

   **Cart, wishlist & reviews** use the backend API. In dev, `/api` is proxied to `http://localhost:5000`. Run the Backend in another terminal so add-to-cart and wishlist work:

   ```bash
   cd ../Backend && npm run dev
   ```

   To use the deployed Render API instead, start the frontend with:  
   `VITE_PROXY_TARGET=https://lavitur.onrender.com npm run dev`

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host or `npm run preview`.

## Structure

- **`src/lib`** – `supabase.js` (client), `api.js` (REST client with auth)
- **`src/context`** – `AuthContext` (session, signIn, signUp, signOut)
- **`src/components`** – Navbar, Footer, Hero, Collections, VideoHero, TopPicks, Layout
- **`src/pages`** – Home, Shop, Login, Register, Profile, Settings, Cart, Wishlist, Contact, About
- **`public/css`** – Original styles (styles, navbar, shop, login, register, profile, etc.)
- **`public/images`**, **`public/videos`** – Static assets from the original frontend
