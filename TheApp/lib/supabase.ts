import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function createSupabaseStorage(): StorageAdapter {
  // Web (browser) – use localStorage.
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return {
      getItem: async (key) => window.localStorage.getItem(key),
      setItem: async (key, value) => {
        window.localStorage.setItem(key, value);
      },
      removeItem: async (key) => {
        window.localStorage.removeItem(key);
      },
    };
  }

  // Native (React Native runtime only) – use SecureStore.
  // expo web / SSR can still have expo-secure-store available but it may be missing
  // underlying native implementations, causing runtime crashes.
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
      return {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      };
    } catch {
      // Fall back to in-memory below.
    }
  }

  // SSR / Node – avoid crashing by using in-memory storage.
  const mem = new Map<string, string>();
  return {
    getItem: async (key) => mem.get(key) ?? null,
    setItem: async (key, value) => {
      mem.set(key, value);
    },
    removeItem: async (key) => {
      mem.delete(key);
    },
  };
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: createSupabaseStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
