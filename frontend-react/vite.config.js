import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api is proxied to your local Backend so cart, wishlist, and reviews work.
// Run the Backend: cd Backend && npm run dev (port 5000)
// To use the deployed Render API instead, set VITE_PROXY_TARGET=https://lavitur.onrender.com
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
