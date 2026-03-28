import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';
import { DashboardPageHeader } from '../../components/ui';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface NavItem {
  label: string;
  icon: IoniconName;
  route: string;
  color?: string;
  badge?: string;
}

const sections: { heading: string; color?: string; items: NavItem[] }[] = [
  {
    heading: 'Commerce',
    items: [
      { label: 'Users', icon: 'people-outline', route: '/(tabs)/users', color: Colors.purple },
      { label: 'Discounts & Promotions', icon: 'pricetag-outline', route: '/(tabs)/discounts', color: Colors.success },
      { label: 'Loyalty Program', icon: 'star-outline', route: '/(tabs)/loyalty', color: Colors.gold },
    ],
  },
  {
    heading: 'Content & Analytics',
    items: [
      { label: 'Content Blocks', icon: 'albums-outline', route: '/(tabs)/content', color: Colors.info },
      { label: 'Analytics', icon: 'bar-chart-outline', route: '/(tabs)/analytics', color: Colors.accent },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { label: 'Roles & Permissions', icon: 'shield-checkmark-outline', route: '/(tabs)/roles', color: Colors.warning },
      { label: 'Security', icon: 'lock-closed-outline', route: '/(tabs)/security', color: Colors.danger },
      { label: 'Settings', icon: 'settings-outline', route: '/(tabs)/settings', color: Colors.textSecondary },
      { label: 'Database Tools', icon: 'server-outline', route: '/(tabs)/database', color: Colors.danger },
    ],
  },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const displayName = profile?.full_name || profile?.username || 'Admin';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerPad}>
        <DashboardPageHeader
          title="Menu"
          breadcrumb={`Tools · Administration · ${displayName}`}
          right={
            <Pressable onPress={signOut} style={styles.signOutBtn}>
              <Ionicons name="log-out-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map(section => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <View style={styles.group}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  onPress={() => router.push(`${item.route}?from=menu` as any)}
                  style={({ pressed }) => [
                    styles.row,
                    idx === section.items.length - 1 && styles.rowLast,
                    pressed && { backgroundColor: Colors.bgSurface },
                  ]}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: `${item.color || Colors.gold}18`, borderColor: `${item.color || Colors.gold}28` },
                    ]}
                  >
                    <Ionicons name={item.icon} size={18} color={item.color || Colors.gold} />
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <View style={styles.rowRight}>
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* App version footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Text style={styles.footerLogoText}>L</Text>
          </View>
          <View>
            <Text style={styles.footerBrand}>LAVITÚR</Text>
            <Text style={styles.footerVersion}>Admin Console · v1.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  headerPad: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  signOutText: { ...Typography.label, color: Colors.textSecondary, fontSize: 12 },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionHeading: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    paddingLeft: 2,
  },
  group: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 14,
  },
  rowLast: { borderBottomWidth: 0 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rowLabel: { ...Typography.body, color: Colors.text, flex: 1, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    backgroundColor: Colors.dangerDim,
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { ...Typography.label, color: Colors.danger, fontSize: 10 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  footerLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.goldMuted,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLogoText: { ...Typography.subheading, color: Colors.gold, fontFamily: 'serif' },
  footerBrand: { ...Typography.label, color: Colors.text, letterSpacing: 1.5, fontSize: 13 },
  footerVersion: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 2 },
});
