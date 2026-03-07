# Frontend customization and saving changes

## Supabase (CDN)

Supabase is loaded from esm.sh (`import from "https://esm.sh/@supabase/supabase-js@2"`). If you need offline support or a strict Content-Security-Policy, consider switching to a bundled build (e.g. npm install + build step) later.

## Profile and Settings pages

If you edit **profile.html**, **settings.html**, or their scripts (**js/profile.js**, **js/settings.js**) and your changes seem to revert:

1. **Use Git** so you never lose edits:
   - After changing files, run: `git add Frontend/profile.html Frontend/settings.html Frontend/js/profile.js Frontend/js/settings.js`
   - Then: `git commit -m "Update profile/settings"`
   - That way you can restore with `git checkout -- <file>` or see history with `git log`

2. **OneDrive / cloud sync**: The project lives under OneDrive. If another device or an older version overwrites the folder, your latest file can be replaced. Use **OneDrive version history** (right‑click file → Version history) to restore a previous version, or rely on Git as above.

3. **Confirm you’re editing the right files**: Profile and Settings live in the **Frontend** folder (this one). There is also a **frontend-react** app with its own Profile/Settings; changes in one do not affect the other.

## Backend on Render – auth not working

If the backend is on Render and **user auth / recognition** fails (profile or settings say “session expired” or “not recognized”):

1. In the **Render** dashboard, open your backend service → **Environment**.
2. Ensure these variables are set (same values as in your Supabase project and Backend `.env`):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (required for JWT verification; often missing)
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Redeploy** after changing any of them.
4. If your **frontend** is on a different domain (e.g. Vercel, Netlify), add that URL to **CORS_ORIGINS** in Render (comma‑separated), e.g. `https://your-app.vercel.app`.

You can check if auth is configured by opening:  
`https://lavitur.onrender.com/api/auth-status`  
It should return `{"authConfigured":true}`.

## Deploying under a different path

If you deploy the frontend under a path other than `/Frontend/`, update the base href logic in settings.html, cart.html, contact.html, about.html (and any page that sets `base.href`) to match your deployment path.
