# Lavitúr – Summary of Issues and Fixes

This document summarizes the issues you ran into and how they were fixed, so you have one place to reference.

---

## 1. Admin & Frontend: 404 on API (products, users, categories)

**What you saw:**  
`GET http://localhost:5501/api/admin/products` and `GET http://localhost:5501/api/categories` returned **404 Not Found**. Products and users didn’t load in the admin panel; shop said “Failed to load products.”

**Cause:**  
The admin panel and Frontend were served from one origin (e.g. Live Server on **port 5501**), while the API runs on another (**port 5000**). `API_BASE` was not set, so all requests went to the same origin (5501), where there is no `/api` → 404.

**Fix:**  
- **Admin:** `admin-panel/js/config.js` sets `window.API_BASE = "http://localhost:5000"`.  
- **Frontend:** `Frontend/js/config.js` sets `window.API_BASE = "http://localhost:5000"`.  
- **Loading config:** `config.js` is included on every page that calls the API:  
  Admin: `index.html`, `views/products.html`, `views/users.html`, `views/orders.html`.  
  Frontend: `shop.html`, `profile.html`, `settings.html`.

**You need to:**  
Run the Backend on port 5000 (`npm run backend`). Use the same host/port in config if your Backend runs elsewhere.

---

## 2. Login / role not fully recognized; profile page not loading

**What you saw:**  
Some things worked, others said “no user roles detected.” Profile page didn’t load and redirected to login even when logged in.

**Cause:**  
- If a user had no row in the `profiles` table, the Backend returned 404 for `/api/me` → profile page redirected to login.  
- Frontend was also calling the wrong origin (see #1), so `/api/me` could 404 for that reason too.

**Fix:**  
- **Backend:** In `Backend/middleware/supabaseAuth.js`, when a valid JWT exists but no `profiles` row is found, the API now **auto-creates** a profile (e.g. `role: 'customer'`) so `/api/me` and role checks can succeed.  
- **Backend:** Admin 403 messages were clarified: “No role found for current user in profiles” vs “Admin access required. Your role does not have access.”  
- **Frontend:** API base and config loading were fixed (see #1) so `/api/me` actually hits the Backend.

**You need to:**  
Ensure Backend `.env` uses the **same Supabase project** as the admin panel (same `SUPABASE_URL` and keys). For admin access, set your user’s `role` to `admin` or `representative` in the Supabase `profiles` table.

---

## 3. Admin: 401 Invalid or expired token

**What you saw:**  
`GET http://localhost:5000/api/admin/users` returned **401 Unauthorized** with “Invalid or expired token.”

**Cause:**  
The admin panel was sending only the token stored in `localStorage` at login (`adminToken`). Supabase access tokens expire (e.g. after 1 hour), so the Backend was receiving an expired token.

**Fix:**  
In `admin-panel/js/api.js`, the token is now taken from the **current Supabase session** (`supabase.auth.getSession()`) before each request, with a fallback to `localStorage`. Supabase refreshes the session, so the Backend gets a valid token.

---

## 4. Admin: “No role found for current user in profiles” when adding/editing products

**What you saw:**  
Clicking Save on “Add Product” (or editing/publishing) showed “No role found for current user in profiles” (sometimes with code P0001). Request could return 403 or 500.

**Cause:**  
- **Middleware:** Profile fetch could fail if the `profiles` table had different columns; or no row existed and auto-create failed.  
- **Database:** A **trigger** on the `products` table (or related) checks the current user’s role via `auth.uid()`. When the Backend used only the **service role** client, no user JWT was sent, so `auth.uid()` was null in the DB and the trigger raised “No role found.”

**Fix:**  
- **Profile fetch:** Middleware now uses `select('*')` and a resilient auto-create with fallbacks so profile loading is more reliable.  
- **Product mutations:** In `Backend/controllers/productsController.js`, create/update/status/delete for products use **`supabaseWithUserToken(req.headers.authorization)`** so the Supabase client sends the **user’s JWT**. The DB then sees `auth.uid()` and the trigger can read `profiles` and allow the action.  
- **Backend/config/supabase.js:** Added `supabaseWithUserToken(bearerToken)` that builds a client with the anon key and the request’s Bearer token.

**You need to:**  
Keep `SUPABASE_ANON_KEY` in Backend `.env` (same project as admin). Restart Backend after changes.

---

## 5. Submit and Publish buttons not working / wrong behavior

**What you saw:**  
Submit and Publish on the product cards didn’t do anything or didn’t reflect the right status flow.

**Cause:**  
- `updateStatus()` in `admin-panel/js/products.js` referenced an undefined `error` variable and didn’t properly catch API errors or reload the list.  
- Buttons were static (always “Submit” and “Publish”) and didn’t change with product status.

**Fix:**  
- **updateStatus:** Now uses try/catch, returns true/false, and shows `err?.data?.error || err?.message` on failure.  
- **Click handler:** Uses a single delegate on `[data-status-action]`; on success it calls `loadProducts()` so the list and buttons refresh.  
- **Status flow and labels:**  
  - **Draft:** [Submit] (→ pending), [Publish] (→ published).  
  - **Pending:** [Publish] (→ published).  
  - **Published (Live):** [Archive] (→ archived).  
  - **Archived:** [Restore to pending] (→ pending).  
  So: draft → pending → published → archived → pending (and so on).

---

## 6. Backend: Port 5000 already in use (EADDRINUSE)

**What you saw:**  
`Error: listen EADDRINUSE: address already in use :::5000` when running `npm run dev` in Backend.

**Cause:**  
Another process (often a previous Backend instance) was already listening on port 5000.

**Fix:**  
Find and kill the process using port 5000, then start the Backend again. In PowerShell (as Administrator if needed):

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID_from_above> /F
```

Then run `npm run backend` again.

---

## 7. Site won’t load – ERR_CONNECTION_REFUSED on 5501

**What you saw:**  
“This site can’t be reached”, “Connection Failed”, `localhost` refused to connect, `ERR_CONNECTION_REFUSED` when opening e.g. `localhost:5501/frontend/index.html`.

**Cause:**  
Nothing was serving port 5501 (e.g. Live Server wasn’t running). There was also a terminal typo: `cd frontend -reeact npm run dev` (wrong syntax and folder name).

**Fix:**  
- **Root package.json** added with `npm run serve` (runs `npx serve . -l 5501`) so you can serve the project from the repo root.  
- **Correct way to run:**  
  - **Static site (Frontend + admin):** From repo root run `npm run serve`, then open **http://localhost:5501/Frontend/index.html** and **http://localhost:5501/admin-panel/index.html**.  
  - **React app:** From repo root run `npm run react`, or `cd frontend-react` then `npm run dev` (folder name is `frontend-react`, not `frontend -reeact`).

---

## 8. “Lost all progress” when the site was up

**What you saw:**  
The site came up (e.g. React on 3000) but it felt like all progress was lost – different behavior or missing features.

**Cause:**  
The fixes (API base, profile, shop, admin products, Submit/Publish/Archive) were made in the **static Frontend** and **admin-panel**, not in the **React app** (`frontend-react`). The React app is a separate codebase. So running only the React app showed a different “version” of the site.

**Fix:**  
- **SERVING.md** was added in the repo root. It explains:  
  - The **static site** (Frontend + admin) is where the recent progress lives.  
  - How to run it: `npm run serve` then open **http://localhost:5501/Frontend/index.html** and **http://localhost:5501/admin-panel/index.html**.  
  - How to run the React app: `npm run react` → **http://localhost:3000**.  
- Always run the **Backend** (`npm run backend`) when using shop, profile, or admin.

---

## 9. Backend and admin must use the same Supabase project

**What you saw:**  
Admin could log in in the browser but the API still returned “No role found for current user in profiles” or similar, even after other fixes.

**Cause:**  
Backend `.env` (e.g. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) pointed at a **different** Supabase project than the one used by the admin panel (`admin-panel/js/supabaseClient.js`). So the JWT was valid for one project, but the Backend was reading/writing another project’s `profiles` (and products, etc.).

**Fix:**  
- Backend **README-API.md** and 403 responses were updated to state that Backend `.env` must use the **same** Supabase project as the admin panel (same URL and keys).  
- In Supabase Dashboard → your project → Project Settings → API: copy **Project URL**, **anon public**, and **service_role** into Backend `.env` as `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

---

## Quick checklist for a working setup

1. **Backend .env** – Same Supabase project as admin panel; all three vars set (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).  
2. **Run Backend** – `npm run backend` (port 5000).  
3. **Run static site** – `npm run serve` (port 5501).  
4. **Open correct URLs** – **http://localhost:5501/Frontend/index.html** (main site), **http://localhost:5501/admin-panel/index.html** (admin).  
5. **Admin role** – Your user in Supabase `profiles` has `role` = `admin` or `representative` for full admin actions.  
6. **Port 5000 free** – If EADDRINUSE, kill the process using 5000 (see #6).

For more detail on how to run each part of the app, see **SERVING.md**.
