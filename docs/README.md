# Lavitúr

Lavitúr – Grace in Grit. E‑commerce frontend, admin panel, and REST API (Supabase backend).

## Structure

| Folder           | Purpose |
|------------------|---------|
| **Frontend**     | Static site (HTML/CSS/JS): shop, profile, auth, cart, wishlist. |
| **admin-panel**  | Admin UI: products, users, orders, dashboard. |
| **Backend**      | Express REST API: auth, products, categories, admin routes. |
| **frontend-react** | Optional React (Vite) app; same flows, separate codebase. |
| **lavitur-ai-server** | Optional AI service. |

## Run the site

1. **Backend** (required for shop, profile, admin):
   ```bash
   npm run backend
   ```
   API: `http://localhost:5000`

2. **Static site** (Frontend + admin):
   ```bash
   npm run serve
   ```
   Then open:
   - **http://localhost:5501/Frontend/** (main site; use trailing slash)
   - **http://localhost:5501/admin-panel/index.html** (admin)

See **SERVING.md** for details and the React app.  
See **Backend/README-API.md** for API setup and env vars.  
See **ISSUES-AND-FIXES.md** for past issues and fixes.
