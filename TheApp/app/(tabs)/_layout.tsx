import type { ComponentProps } from 'react';
import { useContext, useEffect, useState } from 'react';
import { Redirect, Tabs } from 'expo-router';
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { PlatformPressable } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from '../../components/ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Only these routes show in the bar (must match file names in this folder). */
const VISIBLE_TAB_NAMES = new Set([
  'dashboard',
  'orders',
  'products',
  'support',
  'more',
]);

function TabBarIcon({
  outline,
  filled,
  focused,
}: {
  outline: IconName;
  filled: IconName;
  focused: boolean;
}) {
  return (
    <View style={[iconStyles.touch, focused && iconStyles.touchActive]}>
      <Ionicons
        name={focused ? filled : outline}
        size={26}
        color={focused ? Colors.primary : Colors.textSecondary}
      />
    </View>
  );
}

const iconStyles = StyleSheet.create({
  touch: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  touchActive: {
    backgroundColor: Colors.primaryMuted,
  },
});

function CenteredTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const bottomInset = Math.max(insets.bottom, Spacing.sm);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardVisible) {
      onHeightChange?.(0);
    }
  }, [keyboardVisible, onHeightChange]);

  if (keyboardVisible) {
    return null;
  }

  const barRoutes = state.routes.filter((r) => VISIBLE_TAB_NAMES.has(r.name));

  return (
    <View
      style={[styles.tabBarShell, { paddingBottom: bottomInset }]}
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
    >
      <View style={styles.tabBarRow}>
        {barRoutes.map((route) => {
          const routeIndex = state.routes.indexOf(route);
          const focused = state.index === routeIndex;
          const opts = descriptors[route.key].options;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.dispatch({
                ...CommonActions.navigate({ name: route.name, params: route.params }),
                target: state.key,
              });
            }
          };
          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };
          const Icon = opts.tabBarIcon;
          return (
            <PlatformPressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={opts.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              android_ripple={{ borderless: true }}
              pressOpacity={0.75}
              style={styles.tabSlot}
            >
              {Icon
                ? Icon({
                    focused,
                    size: 26,
                    color: focused ? Colors.primary : Colors.textSecondary,
                  })
                : null}
            </PlatformPressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();
  const allowed = ['admin', 'representative'];

  if (loading) return <LoadingState fullScreen />;
  const role = profile?.role?.toString().toLowerCase().trim();
  if (!session || !profile) return <Redirect href="/login" />;
  if (!allowed.includes(role || '')) {
    return (
      <Redirect
        href={{
          pathname: '/login',
          params: { reason: role ? 'not_authorized' : 'role_missing' },
        }}
      />
    );
  }

  return (
    <Tabs
      tabBar={(props) => <CenteredTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIconStyle: { marginTop: 0 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarAccessibilityLabel: 'Dashboard, home',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon outline="grid-outline" filled="grid" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarAccessibilityLabel: 'Orders',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon outline="receipt-outline" filled="receipt" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarAccessibilityLabel: 'Products',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon outline="cube-outline" filled="cube" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Support',
          tabBarAccessibilityLabel: 'Support',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon outline="chatbubbles-outline" filled="chatbubbles" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarAccessibilityLabel: 'More menu',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon outline="apps-outline" filled="apps" focused={focused} />
          ),
        }}
      />

      {/* href: null → Expo hides from tab bar (display:none); still navigable via router */}
      <Tabs.Screen name="users" options={{ title: 'Users', href: null }} />
      <Tabs.Screen name="discounts" options={{ title: 'Discounts', href: null }} />
      <Tabs.Screen name="content" options={{ title: 'Content Blocks', href: null }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', href: null }} />
      <Tabs.Screen name="loyalty" options={{ title: 'Loyalty', href: null }} />
      <Tabs.Screen name="roles" options={{ title: 'Roles', href: null }} />
      <Tabs.Screen name="security" options={{ title: 'Security', href: null }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', href: null }} />
      <Tabs.Screen name="database" options={{ title: 'Database Tools', href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarShell: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  tabSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
