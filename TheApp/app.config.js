const API_BASE_DEFAULT = 'https://lavitur.onrender.com';
const SUPABASE_URL_DEFAULT = 'https://ueotizgitowpvizkbgst.supabase.co';
const SUPABASE_ANON_KEY_DEFAULT = 'sb_publishable_Cv6TIwRzZVRs72-Byx2ozA_r7eDR0DX';

module.exports = {
    name: 'Lavitúr Admin',
    slug: 'lavitur-admin',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    splash: { resizeMode: 'contain', backgroundColor: '#0A0A0F' },
    assetBundlePatterns: ['**/*'],
    ios: { supportsTablet: true, bundleIdentifier: 'com.lavitur.admin' },
    android: { adaptiveIcon: { backgroundColor: '#0A0A0F' }, package: 'com.lavitur.admin' },
    web: { bundler: 'metro', output: 'static' },
    plugins: [
        'expo-router',
        'expo-secure-store',
        'expo-font',
        [
            'expo-image-picker',
            {
                photosPermission: 'Allow access to your photos to add product images.',
            },
        ],
    ],
    // Disable typed routes generation to avoid `expo-router/internal/routing` crashes.
    experiments: { typedRoutes: false },
    scheme: 'lavitur-admin',
    extra: {
        API_BASE: process.env.VITE_API_BASE || API_BASE_DEFAULT,
        SUPABASE_URL: process.env.VITE_SUPABASE_URL || SUPABASE_URL_DEFAULT,
        SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_DEFAULT,
    },
  };