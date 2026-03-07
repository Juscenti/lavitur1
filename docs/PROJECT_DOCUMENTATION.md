# Lavitúr Project Documentation

## Executive Summary

**Lavitúr** is a full-stack e-commerce platform with the tagline "Grace in Grit" — a luxury streetwear brand selling contemporary fashion. The platform features a customer-facing frontend, a comprehensive admin panel for staff management, and a REST API backend powered by Supabase and Node.js/Express.

**Goal**: Build a professional e-commerce ecosystem that combines elegant storefront design with robust backend management and optional AI-powered shopping assistance.

---

## Project Structure

```
lavitur/
├── Frontend/                 # Customer-facing static site (HTML/CSS/JS)
├── admin-panel/             # Admin management UI
├── Backend/                 # Express REST API (Node.js)
├── frontend-react/          # Optional React alternative (Vite)
├── lavitur-ai-server/       # Optional AI shopping concierge (OpenAI)
├── package.json             # Root npm scripts
└── README.md, SERVING.md, ISSUES-AND-FIXES.md
```

### Folder Breakdown

| Folder | Purpose | Tech |
|--------|---------|------|
| **Frontend/** | Customer shop, product details, cart, profile, wishlist | HTML, CSS, JavaScript |
| **admin-panel/** | Dashboard, users, products, orders, discounts, roles, analytics | HTML, CSS, JavaScript |
| **Backend/** | Express API serving products, users, orders, admin routes | Node.js, Express, Supabase |
| **frontend-react/** | React + Vite version of the customer site | React, Vite, React Router |
| **lavitur-ai-server/** | Optional AI concierge using OpenAI API | Node.js, Express, OpenAI SDK |

---

## Technology Stack

### Backend & Servers
- **Node.js** with **Express.js** – REST API server (port 5000)
- **Supabase** – PostgreSQL database + authentication
- **OpenAI GPT** – AI shopping assistant (optional)
- **Multer** – File uploads (media handling)
- **CORS** – Cross-origin requests

### Frontend & UI
- **HTML5**, **CSS3**, **JavaScript (ES6+)** – Static site
- **React** + **Vite** – Alternative frontend (optional)
- **Fetch API** – Client-server communication
- **Bootstrap/Custom CSS** – Styling

### Authentication & Authorization
- **Supabase Auth** – JWT-based user authentication
- **RBAC** – Role-Based Access Control (6 levels: admin, representative, senior employee, employee, ambassador, customer)
- **Bearer Token** – API authentication

---

## Core Features

### Customer-Facing Features (Frontend)

1. **Product Catalog & Shop** ✅
   - Browse published products by category
   - Filter by category (Men's Wear, Women's Wear, Unisex)
   - Price range filtering
   - In-stock filtering
   - Search functionality

2. **Product Discovery** ✅
   - Hero section with image carousel
   - Featured collections
   - Quick-view modal (preview without leaving page)
   - Responsive product grid

3. **Shopping Cart** ✅
   - Add/remove items to cart
   - Adjust quantities
   - Persistent storage (localStorage)
   - Cart summary with total

4. **Wishlist** ✅
   - Save favorite products
   - Toggle wishlist status
   - Persistent storage (localStorage)
   - Quick-view from wishlist

5. **User Authentication & Profile** ✅
   - Register new account
   - Login
   - User profile management (username, full name, email)
   - Profile sections: personal info, orders, wishlist, addresses, activity, loyalty
   - Logout

6. **Additional Pages** ✅
   - About page
   - Contact page
   - Settings page (user preferences)

7. **Analytics Hooks** ❌ (Infrastructure ready, event capture not fully integrated)

---

### Admin Panel Features (Backend for Staff)

1. **Dashboard** ✅
   - Real-time metrics: Total Sales, Orders, New Users, Open Support Tickets
   - Sales chart visualization (Chart.js)
   - Quick overview of business metrics

2. **User Management** ✅
   - List all users
   - View individual user details
   - Update user status (active/suspended)
   - Assign user roles (admin, representative, senior employee, employee, ambassador, customer)
   - Role-based access control

3. **Product Management** ✅
   - **Create Products**: Add new items with name, description, price, stock
   - **Edit Products**: Update product details
   - **Delete Products**: Remove products from system
   - **Status Workflow**: Draft → Pending → Published (Live) → Archived (can restore to pending)
   - **Bulk Operations**: Manage products by category
   - **Editorial vs. Viewer Mode**: Senior Employee+ can use editorial mode

4. **Product Media Management** ✅
   - Upload multiple images/media files (up to 10 files, 10MB each)
   - Set primary image for product
   - Delete media files
   - Media organized by product

5. **Order Management** ✅
   - View all orders
   - Update order status
   - Track order fulfillment

6. **Discount & Promo Management** ✅
   - Create discount codes
   - Set discount percentages
   - Define usage limits
   - Track usage count
   - Enable/disable codes
   - Assign codes to ambassadors

7. **Content Management** ❌ (Placeholder page, logic not implemented)
   - Manage promotional content
   - Editorial content control

8. **Support Tickets** ❌ (Placeholder page, logic not implemented)
   - View open support tickets
   - Manage customer inquiries

9. **Analytics & Reporting** ❌ (Placeholder page, logic not implemented)
   - Dashboard metrics
   - Sales trends
   - User activity tracking

10. **Loyalty & Rewards** ❌ (Placeholder page, logic not implemented)
    - Loyalty program settings
    - Rewards management

11. **Roles & Permissions** ❌ (Placeholder page, logic not implemented)
    - Define admin roles
    - Set permissions per role
    - Permission levels per role

12. **Security Settings** ❌ (Placeholder page, logic not implemented)
    - Token management
    - Security configuration

---

## Database (Supabase)

### Core Tables
- **auth.users** – Supabase built-in user authentication
- **profiles** – User profile information (id, username, full_name, role, status, email) — **6 role levels**: admin, representative, senior employee, employee, ambassador, customer
- **products** – Product catalog (name, description, price, stock, status, category_id)
- **product_media** – Product images/media (url, is_primary, product_id)
- **categories** – Product categories with slugs
- **discount_codes** – Promotional codes (code, discount_percent, active, usage_limit, used_count, ambassador_id)
- **orders** – Customer orders (user_id, status, total, created_at)
- **dashboard_metrics** – Dashboard KPIs (gross_revenue, total_orders, total_users)

### Key Database Features
- **Row-Level Security (RLS)** – Rules restrict data access by role
- **Triggers** – Automatic profile creation, role validation on product mutations
- **Auth Functions** – `auth.uid()` checks for authorization in triggers

---

## API Endpoints

### Public Routes (No Auth Required)
```
GET  /api/health              – Health check
GET  /api/categories          – List all categories
GET  /api/products            – List published products for shop
```

### Authenticated Routes (Bearer Token Required)
```
GET  /api/me                  – Get current user profile
PATCH /api/me                 – Update profile (username, full_name)
```

### Admin Routes (Bearer Token + Admin/Representative Role)
```
# Users
GET    /api/admin/users           – List all users
GET    /api/admin/users/:id       – Get user by ID
PATCH  /api/admin/users/:id/status – Set user status (active/suspended)
PATCH  /api/admin/users/:id/role   – Set user role

# Products
GET    /api/admin/products                  – List all products (with media)
POST   /api/admin/products                  – Create product
PATCH  /api/admin/products/:id              – Update product details
PATCH  /api/admin/products/:id/status       – Update product status (draft/pending/published/archived)
DELETE /api/admin/products/:id              – Delete product

# Product Media
GET    /api/admin/products/:id/media              – List media for product
POST   /api/admin/products/:id/media              – Upload media (multipart)
DELETE /api/admin/products/:id/media/:mediaId    – Delete media file
PATCH  /api/admin/products/:id/media/:mediaId/primary – Set primary image

# Orders
GET    /api/admin/orders               – List all orders
PATCH  /api/admin/orders/:id/status    – Update order status

# Dashboard
GET    /api/admin/dashboard            – Get dashboard metrics

# Discounts
GET    /api/admin/discounts            – List discount codes
POST   /api/admin/discounts            – Create discount code
PATCH  /api/admin/discounts/:id/active – Toggle code active/inactive
```

---

## Key Implementation Details

### 1. Authentication Flow
1. User logs in via **Supabase Auth** (browser-side, not API)
2. Supabase returns JWT (access token)
3. Client stores token and session
4. API requests send: `Authorization: Bearer <token>`
5. Backend verifies token with Supabase
6. Token expires after ~1 hour; Supabase auto-refreshes on next request

### 2. Role-Based Access Control (RBAC)
- **Roles** (6 levels, hierarchical):
  - `admin` – Full system access, can manage all users/roles/products
  - `representative` – Admin-equivalent access for operations
  - `senior employee` – Can use editorial mode for products, manage content
  - `employee` – Standard staff access, viewer mode only
  - `ambassador` – Model/brand ambassador, can access assigned features
  - `customer` – End user (default role)
- **Storage**: `profiles.role` (Supabase table)
- **Enforcement**: Middleware checks role before accessing admin routes
- **Auto-Profile**: If user has no profile row, backend auto-creates one with `role: 'customer'`
- **Editorial Mode**: Only Senior Employee+ role can toggle editorial/viewer modes on products page

### 3. Product Status Workflow
```
Draft → Submit → Pending → Publish → Published (Live)
                                        ↓
                                   Archive → Archived
                                        ↑
                            Restore to Pending ←
```
- **Draft**: Product being created, not submitted
- **Pending**: Awaiting review/approval
- **Published**: Live on storefront
- **Archived**: Hidden but kept in system

### 4. Multi-Origin Setup (Static + API)
- **Frontend & Admin**: Served from LiveServer on **port 5501**
- **API**: Runs on **port 5000**
- **CORS Configuration**: Backend allows both origins
- **Config Files**: 
  - `Frontend/js/config.js` sets `window.API_BASE = "http://localhost:5000"`
  - `admin-panel/js/config.js` sets `window.API_BASE = "http://localhost:5000"`
- **Load Order**: Config must load before API client

### 5. Token Refresh Mechanism
- **Issue**: Supabase access tokens expire after ~1 hour
- **Solution**: In `admin-panel/js/api.js`, before each request:
  1. Call `supabase.auth.getSession()` to get fresh token
  2. Fallback to `localStorage` if session unavailable
  3. Supabase automatically refreshes token if still valid
- **Result**: Admin panel stays logged in across multiple hours

### 6. Product Mutations with User JWT
- **Problem**: Database triggers check `auth.uid()` to verify user role; service-role client had no JWT
- **Solution**: In `Backend/controllers/productsController.js`, product create/update/delete operations use `supabaseWithUserToken(bearerToken)` client
- **Result**: DB triggers can read user's profile and validate permissions

### 7. Media Handling
- **Upload**: Multer (memory storage) → max 10 files, 10MB each
- **Storage**: Supabase Storage bucket `product-media`
- **URL Generation**: Public URL format: `https://<project>.supabase.co/storage/v1/object/public/product-media/<filePath>`
- **Management**: UI allows set primary image, delete, reorder

---

## How Features Were Added (Implementation Approach)

### 1. **Frontend Architecture**
- Started with static HTML/CSS structure
- Modular JavaScript files (`api.js`, `auth.js`, `config.js`)
- Component injection (navbar, sidebar dynamically loaded)
- LocalStorage for cart/wishlist (no backend calls yet for these)
- Event listeners on delegated selectors for scalability

### 2. **Admin Panel Architecture**
- Mirror structure to frontend
- Guard functions (`requireAdminAuth()`, `requireStaff()`) to gate pages
- Modal-based workflows (add product, edit, etc.)
- Form submission with validation
- Dynamic table rendering from API responses
- Status workflow buttons with state-dependent labels

### 3. **Backend API Design**
- Express.js routing by feature (products, users, discounts, etc.)
- Middleware stack: CORS → JSON → Auth → Admin checks
- Supabase SDK (`@supabase/supabase-js`) for DB queries
- Controllers separate business logic from routes
- Error handling with try/catch and descriptive messages

### 4. **Authentication & Auth Guards**
- Gate pages with `requireAdminAuth()` — redirect to login if no token
- Populate user profile lazily (first admin page load)
- Auto-create profile if missing (middleware auto-creates on `/api/me`)
- Cache profile in module scope to avoid repeated fetches

### 5. **Product Lifecycle Management**
- Status stored in DB column
- Buttons change label/action based on status
- Single endpoint `/api/admin/products/:id/status` for all transitions
- UI refresh (`loadProducts()`) after each action

### 6. **CORS & Multi-Origin**
- Backend `server.js` has explicit origin allowlist
- Frontend/admin config files set `API_BASE` before loading API client
- Supabase project credentials shared across backend + frontend

### 7. **Role-Based Operations**
- Middleware `verifySupabaseToken` decodes JWT
- Middleware `requireAdmin` checks `profiles.role` in database
- If no profile exists, auto-create with `role: 'customer'`
- Product mutations use user JWT so DB triggers can enforce role checks

### 8. **Optional AI Concierge**
- Separate Express server listening on different port
- Takes user message + conversation history
- Extracts product filters from message (keyword matching)
- Queries Supabase for matching products
- Sends product context + conversation to OpenAI GPT
- Returns AI response with product recommendations

### 9. **React Alternative**
- Vite build tool for fast development
- React Router for page navigation
- Same API endpoints (with dev proxy to localhost:5000)
- Modular component structure
- Mirror feature parity to static frontend

---

## Performance & Optimization Notes

1. **Lazy Loading**: Admin pages load components on demand (sidebar/header fetched per page)
2. **LocalStorage**: Cart and wishlist stored client-side to reduce API calls
3. **Token Caching**: Profile cached in memory to avoid repeated `/api/me` calls
4. **Multer Memory Storage**: Media uploads held in memory (not disk), streamed to Supabase
5. **Select Minimization**: API queries explicitly select needed columns, not `SELECT *`
6. **Pagination Ready**: Endpoints structure supports pagination (not yet implemented)

---

## Deployment & Environment

### Environment Variables (Backend `.env`)
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
PORT=5000
```

### Environment Variables (AI Server `.env`)
```
OPENAI_API_KEY=<your-openai-key>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
PORT=5000 (or custom)
```

### Run Commands
```bash
# Backend
npm run backend              # Runs Backend on port 5000

# Static Frontend + Admin
npm run serve               # Runs on port 5501

# React Frontend (optional)
npm run react               # Runs on port 3000

# All at once (recommended for development)
npm run backend &           # Terminal 1
npm run serve               # Terminal 2
```

---

## Issues Resolved & Lessons Learned

### Major Issues Fixed
1. **404 on API Calls** ✅ → Fixed by setting `window.API_BASE` in config files loaded before API client
2. **Expired Token Errors** ✅ → Fixed by calling `getSession()` before each request to refresh token
3. **Profile Not Found** ✅ → Fixed by auto-creating profiles in middleware if missing
4. **Product Operations Failing with 403** ✅ → Fixed by using user JWT for mutations so DB triggers see `auth.uid()`
5. **Submit/Publish Buttons Not Working** ✅ → Fixed error handling and button state management
6. **Port Conflicts** ✅ → Documented port usage and recommended single-server approach

See `ISSUES-AND-FIXES.md` for detailed breakdowns.

---

## Future Enhancements

### Potential Additions
1. **Order Tracking** – Real-time shipment tracking for customers
2. **Payment Integration** – Stripe/PayPal for real transactions
3. **Email Notifications** – Order confirmations, alerts, promotions
4. **Advanced Analytics** – Trends, customer segmentation, cohort analysis
5. **Inventory Alerts** – Low-stock notifications for admins
6. **Customer Reviews** – Product ratings and testimonials
7. **Live Chat** – Real-time support (vs. support tickets)
8. **Wishlist Sync** – Backend wishlist (instead of localStorage)
9. **Search Service** – Elasticsearch or Algolia for fast product search
10. **Social Integration** – Instagram shoppable posts
11. **Loyalty Points** – Point accumulation and redemption
12. **A/B Testing** – Promote variants on storefront

---

## File Organization Reference

### Frontend Key Files
- `Frontend/index.html` – Home page with hero + collections
- `Frontend/shop.html` – Product catalog with filters
- `Frontend/product.html` – Single product detail page (PDP)
- `Frontend/login.html`, `register.html` – Authentication pages
- `Frontend/profile.html` – User account dashboard
- `Frontend/cart.html`, `wishlist.html` – Shopping features
- `Frontend/js/api.js` – HTTP client wrapper
- `Frontend/js/shop.js` – Shop page logic (filters, pagination)
- `Frontend/js/auth.js` – Auth flow
- `Frontend/js/config.js` – API base configuration

### Admin Panel Key Files
- `admin-panel/index.html` – Dashboard (main entry)
- `admin-panel/login.html` – Admin login
- `admin-panel/views/products.html` – Product CRUD
- `admin-panel/views/users.html` – User management
- `admin-panel/views/orders.html` – Order tracking
- `admin-panel/views/discounts.html` – Promo codes
- `admin-panel/js/products.js` – Product logic (create, edit, status)
- `admin-panel/js/users.js` – User management logic
- `admin-panel/js/dashboard.js` – Metrics

### Backend Key Files
- `Backend/server.js` – Express app setup + route registration
- `Backend/routes/products.js` – Product endpoints
- `Backend/routes/admin.js` – Admin-gated endpoints
- `Backend/controllers/productsController.js` – Product business logic
- `Backend/controllers/adminUsersController.js` – User management logic
- `Backend/middleware/supabaseAuth.js` – JWT verification + role checks
- `Backend/config/supabase.js` – Supabase client initialization

---

## Complete Role Hierarchy

| Role | Level | Can Access Admin Panel | Can Manage Users | Can Manage Products | Can Use Editorial Mode | Typical Use Case |
|------|-------|----------------------|------------------|-------------------|----------------------|------------------|
| `admin` | 6 (Highest) | ✅ | ✅ | ✅ | ✅ | Full system admin |
| `representative` | 5  | ✅ | ✅ | ✅ | ✅ | Deputy admin, operations lead |
| `senior employee` | 4 | ✅ | ❌ | ✅ (editorial only) | ✅ | Content manager, senior staff |
| `employee`   | 3      | ✅ | ❌ | ✅ (viewer only) | ❌ | Warehouse, support staff |
| `ambassador`  | 2 |❌ | ❌ | ❌ | ❌ | Model, brand partner (restricted UX) |
| `customer` | 1(Lowest)| ❌ | ❌ | ❌ | ❌ | End user (assigned by default) |

---

## Feature Completion Status

### Fully Implemented (Core Features) ✅
- Product catalog & shop (frontend)
- User authentication & profiles
- Product management (CRUD + status workflow)
- Product media management (upload, set primary, delete)
- Order management
- Discount/promo code management
- Dashboard with real-time metrics
- Role-based access control (6 levels)
- User management and role assignment

### Partially Implemented (Infrastructure Ready) ⚠️
- Analytics (hooks built, page placeholder)

### Not Yet Implemented (Stub Pages) ❌
- Content Management
- Support Tickets
- Advanced Analytics & Reporting
- Loyalty & Rewards Program
- Permissions Management (per-role UX)
- Security Settings (advanced config)

---

## Summary

**Lavitúr** is a well-structured, multi-layered e-commerce platform built with modern web technologies. It demonstrates:

- **Clean Architecture**: Separated frontend, admin, API layers
- **Security**: 6-level RBAC, JWT tokens, role-based DB triggers, Supabase auth
- **Scalability**: Modular code, API-first design, ready for microservices
- **User Experience**: Responsive design, smooth workflows, real-time feedback
- **Business Features**: Complete product lifecycle, order tracking, discount management, multi-role staff system

The platform is **production-ready** for core e-commerce operations (products, orders, users, discounts) and can be extended with payment processing, advanced inventory management, loyalty programs, and customer analytics.

