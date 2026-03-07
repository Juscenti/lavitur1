# What to Store in Supabase vs on the Site

**Option A (Backend API) is implemented** for wishlist, cart, and product reviews. You still need to **run the SQL in section 1** in the Supabase SQL Editor to create the tables. Then the frontend can be switched from `localStorage` to these API routes.

| Area | Backend routes |
|------|----------------|
| Wishlist | `GET /api/me/wishlist`, `POST /api/me/wishlist` body `{ product_id }`, `DELETE /api/me/wishlist/product/:productId`, `DELETE /api/me/wishlist/:id` |
| Cart | `GET /api/me/cart`, `POST /api/me/cart` body `{ product_id, size?, quantity? }`, `PATCH /api/me/cart/:id` body `{ quantity }`, `DELETE /api/me/cart/:id` |
| Reviews | `GET /api/products/:id/reviews` (public), `POST /api/products/:id/reviews` body `{ rating, body? }` (auth), `DELETE /api/products/:id/reviews/:reviewId` (auth, own only) |

---

## Current state

| Data | Stored where | Notes |
|------|----------------|------|
| **Auth (login/signup)** | Supabase (Auth) | Already using Supabase. |
| **Products & categories** | Supabase (via Backend API) | Backend reads/writes `products`, `categories`, `product_categories`, `product_media`. |
| **Profiles** | Supabase `profiles` | Backend `/api/me` and PATCH use it. |
| **Orders** | Supabase `orders` | Admin only today; no `/api/me/orders` yet. |
| **Cart** | **Browser only** (`localStorage` key `cart`) | Lost when clearing data or switching device. |
| **Wishlist** | **Browser only** (`localStorage` key `lavitur_wishlist`) | Same as cart; Profile calls `/me/wishlist` but that endpoint is not implemented. |
| **Reviews** | **Browser only** (`localStorage` key `lavitur_reviews_<productId>`) | Per-product, device-specific; no shared reviews. |
| **Profile picture** | **Browser only** (`localStorage` key `profilePicture:<userId>`) | Could be Supabase Storage. |

---

## What would be easier / better in Supabase

Storing these in Supabase gives you: **one source of truth**, **sync across devices**, and **data that survives clearing browser data**.

1. **Wishlist** – Easy win. One table `wishlist (user_id, product_id)`. Logged-in users get the same list on every device; you can implement `/api/me/wishlist` or use Supabase from the frontend with RLS.
2. **Cart (for logged-in users)** – Same idea. Table `cart_items (user_id, product_id, size, quantity)`. Optional: merge guest `localStorage` cart into Supabase on login.
3. **Reviews** – Table `product_reviews (product_id, user_id, rating, body, created_at)`. Everyone sees the same reviews; product page and admin can use one API.
4. **Profile picture** – Store in Supabase Storage (e.g. bucket `avatars`, path `{user_id}/avatar.jpg`) and save the URL in `profiles.avatar_url` so it’s not tied to one browser.

Orders, addresses, activity, and loyalty are already expected by the Profile page (`/me/orders`, `/me/addresses`, etc.) but those API routes don’t exist yet; those would also live in Supabase and be served by the Backend (or by the frontend with RLS if you prefer).

---

## How to add it

### 1. Create tables in Supabase

In the Supabase dashboard: **SQL Editor** → run the following (adjust if you already have some of these).

```sql
-- Wishlist: one row per user + product
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- Cart items for logged-in users (optional: keep localStorage for guests)
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  quantity int not null default 1,
  created_at timestamptz default now()
);

-- Product reviews (replaces localStorage per product)
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating int not null check (rating >= 1 and rating <= 5),
  body text,
  created_at timestamptz default now()
);

-- RLS: users can only see/edit their own rows
alter table public.wishlist enable row level security;
alter table public.cart_items enable row level security;
alter table public.product_reviews enable row level security;

create policy "Users manage own wishlist"
  on public.wishlist for all using (auth.uid() = user_id);

create policy "Users manage own cart"
  on public.cart_items for all using (auth.uid() = user_id);

create policy "Anyone can read reviews"
  on public.product_reviews for select using (true);
create policy "Users insert own review"
  on public.product_reviews for insert with check (auth.uid() = user_id);
create policy "Users update/delete own review"
  on public.product_reviews for all using (auth.uid() = user_id);
```

If `products` lives in the public schema and has `id uuid`, the `references public.products(id)` is correct; if not, adjust the FK.

### 2. Two ways to use these tables (simple version)

You have two choices for *who talks to Supabase*: your **Node backend** or your **React app** directly.

---

#### Option A: Backend API (Node talks to Supabase)

**What it means:**  
Your React app never talks to Supabase for wishlist/cart/reviews. It only calls your own API (e.g. `https://yoursite.com/api/me/wishlist`). Your Node server receives that request, talks to Supabase, and sends the result back.

**Backend (Node):**
- You add new routes, e.g.:
  - `GET /api/me/wishlist` → read from Supabase `wishlist` for this user, return list.
  - `POST /api/me/wishlist` → add one product to Supabase `wishlist`.
  - `DELETE /api/me/wishlist/:id` → remove one row from Supabase.
- Same idea for cart: `GET/POST/PATCH/DELETE /api/me/cart`.
- For reviews: e.g. `GET /api/products/:id/reviews` (anyone can call), `POST/DELETE` for submit/delete (with auth).
- All of this runs on your server; the server uses the Supabase client and the user’s token so Supabase knows who the user is.

**Frontend (React):**
- Instead of `localStorage.getItem('lavitur_wishlist')` you do `api.get('/me/wishlist')`.
- Instead of `localStorage.setItem(...)` you do `api.post('/me/wishlist', { product_id })` or `api.delete('/me/wishlist/' + id)`.
- So: same `api` object you use today; you’re just adding the *calls* and removing the *localStorage* code for wishlist (and later cart/reviews).

**Effect:**  
One place (your backend) handles all Supabase access. Easier to add logging, rate limits, or extra checks later. Frontend stays simple: “call API, show result.”

---

#### Option B: Frontend only (React talks to Supabase)

**What it means:**  
Your React app uses the Supabase client (the one in `src/lib/supabase.js`) to read and write the new tables. No new backend routes. Supabase’s “Row Level Security” (RLS) makes sure each user only sees and edits their own wishlist/cart and their own reviews.

**Backend (Node):**
- You don’t add any new routes. Nothing changes in the backend for wishlist/cart/reviews.

**Frontend (React):**
- You use `supabase.from('wishlist').select(...).eq('user_id', user.id)` to load the list.
- You use `supabase.from('wishlist').insert({ user_id, product_id })` to add, and `.delete().eq('id', row.id)` to remove.
- You remove the `localStorage` read/write for wishlist (and later do the same for cart/reviews).
- The user is already logged in via Supabase Auth, so `supabase` sends their session and RLS allows only their rows.

**Effect:**  
Faster to implement (no backend work). All logic lives in the React app. You rely on RLS to keep data safe.

---

#### Summary of effects

| | Option A (Backend API) | Option B (Frontend only) |
|---|------------------------|---------------------------|
| **Backend** | You add new routes; server reads/writes Supabase. | No new routes; no backend changes. |
| **Frontend** | Swap `localStorage` for `api.get/post/delete(...)`. | Swap `localStorage` for `supabase.from('wishlist')...` (and same for cart/reviews). |
| **User sees** | Same behavior: wishlist/cart/reviews sync across devices and survive clearing browser data. | Same as Option A. |

---

### 3. Frontend changes (what actually changes in the app)

No matter which option you pick, the *kind* of change in the React app is the same; only *who* you call (API vs Supabase) is different.

- **Wishlist (Shop + Product page):**
  - Today: you read the list from `localStorage` and write to `localStorage` when they add/remove.
  - After: you read the list from the API or Supabase, and when they add/remove you call the API or Supabase instead of `localStorage`. Guests can still use `localStorage` or see “Sign in to sync wishlist.”

- **Cart (Cart page + “Add to cart”):**
  - Today: cart is only in `localStorage`.
  - After: if the user is logged in, you load the cart from the API or Supabase and save changes there; if guest, you keep using `localStorage`. Optionally, when they log in, you merge their guest cart into Supabase once.

- **Reviews (Product page):**
  - Today: reviews are in `localStorage` under `lavitur_reviews_<productId>`.
  - After: you load reviews from the API or Supabase, and when they submit or delete a review you call the API or Supabase. You stop using the `lavitur_reviews_*` keys.

**Result:** The browser no longer “owns” the real wishlist, cart, or reviews; Supabase does. The site only holds temporary UI state and, if you want, a guest cart/wishlist in `localStorage`.
