// Backend/server.js — REST API (Supabase backend)
// Load .env first (must run before any other imports that use process.env)
import 'dotenv/config';

if (!process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️ SUPABASE_ANON_KEY is missing. Auth (JWT verification) will return 503 for protected routes.');
}

import express from 'express';
import cors from 'cors';

import categoriesRoutes from './routes/categories.js';
import productsRoutes from './routes/products.js';
import meRoutes from './routes/me.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(express.json());
// When the frontend is deployed (e.g. Vercel/Netlify), set CORS_ORIGINS in Render to that origin, e.g. https://your-app.vercel.app
const corsOrigins = [
  'http://localhost:5500', 'http://127.0.0.1:5500',
  'http://localhost:5501', 'http://127.0.0.1:5501',
  'http://localhost:3000', 'http://127.0.0.1:3000',
  // React dev server
  'http://localhost:3001', 'http://127.0.0.1:3001',
  'https://lavitur.onrender.com'
];
if (process.env.CORS_ORIGINS) {
  corsOrigins.push(...process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean));
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true
}));

// Public
app.get('/', (req, res) => res.json({ name: 'Lavitúr API', status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/auth-status', (req, res) =>
  res.json({ authConfigured: !!(process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_URL) })
);

app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);

// Authenticated user (Bearer = Supabase access_token)
app.use('/api/me', meRoutes);

// Admin (Bearer + role admin/representative)
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Lavitúr API running on port ${PORT}`);
});
