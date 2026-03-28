import { router, useLocalSearchParams } from 'expo-router';

/**
 * Hidden tab routes (Users, Loyalty, etc.) are siblings in the tab navigator, not a stack.
 * `router.back()` can pop the root stack and send you to the home tab instead of the More menu.
 * Links from `more.tsx` append `?from=menu` so we switch back to the More tab explicitly.
 */
export function useSmartToolBack() {
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const raw = params.from;
  const from = Array.isArray(raw) ? raw[0] : raw;

  return () => {
    if (from === 'menu') {
      router.navigate('/(tabs)/more');
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.navigate('/(tabs)/dashboard');
  };
}
