import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  LoadingState,
  ErrorState,
  DashboardPageHeader,
  DashboardMetricCard,
  DashboardChartCard,
} from '../../components/ui';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';

interface DashboardData {
  gross_revenue?: number;
  total_orders?: number;
  new_users?: number;
  open_tickets?: number;
  total_revenue?: number;
  revenue_today?: number;
  orders_today?: number;
  /** Optional series for home sparkline (any numeric[] your API returns). */
  revenue_sparkline?: number[];
  daily_revenue?: number[] | Array<{ revenue?: number; day?: string }>;
  [key: string]: any;
}

/** Pull a numeric series from /dashboard JSON only — never invent data. */
function extractDashboardSparkline(d: DashboardData | null): number[] | undefined {
  if (!d) return undefined;
  const raw = d as Record<string, unknown>;
  const candidates = [
    raw.revenue_sparkline,
    raw.daily_revenue,
    raw.last_7d_revenue,
    raw.revenue_by_day,
    raw.trend,
  ];
  for (const v of candidates) {
    if (!Array.isArray(v) || v.length === 0) continue;
    const first = v[0];
    if (typeof first === 'number') {
      return v.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
    }
    if (first && typeof first === 'object' && 'revenue' in (first as object)) {
      return (v as { revenue?: number }[]).map((x) => Number(x.revenue ?? 0));
    }
  }
  return undefined;
}

const QUICK_LINKS = [
  { label: 'New order', icon: 'add-circle-outline' as const, route: '/(tabs)/orders', color: Colors.info },
  { label: 'Users', icon: 'people-outline' as const, route: '/(tabs)/users', color: Colors.purple },
  { label: 'Analytics', icon: 'bar-chart-outline' as const, route: '/(tabs)/analytics', color: Colors.success },
  { label: 'Settings', icon: 'settings-outline' as const, route: '/(tabs)/settings', color: Colors.textSecondary },
];

export default function DashboardScreen() {
  const { profile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get<DashboardData>('/dashboard');
      setData(res);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  function fmt(n?: number) {
    if (n == null) return '—';
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${n}`;
  }

  function fmtCount(n?: number | null) {
    if (n == null || n === undefined) return '—';
    return String(n);
  }

  const displayName = profile?.full_name || profile?.username || 'Admin';
  const roleLabel = profile?.role?.toString() || '';

  const headerRight = (
    <View style={styles.headerActions}>
      {!!roleLabel && (
        <View style={styles.rolePill}>
          <Ionicons name="shield-checkmark" size={12} color={Colors.primaryLight} />
          <Text style={styles.roleText}>{roleLabel.toUpperCase()}</Text>
        </View>
      )}
      <Pressable onPress={signOut} style={styles.iconBtn} accessibilityLabel="Sign out">
        <Ionicons name="log-out-outline" size={20} color={Colors.textSecondary} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxl + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <DashboardPageHeader
          title="Dashboard"
          breadcrumb={`Home · Overview · ${displayName}`}
          right={headerRight}
        />

        {loading && <LoadingState message="Loading dashboard…" />}
        {!!error && <ErrorState message={error} onRetry={load} />}

        {data && !loading && (
          <>
            <Text style={styles.sectionLabel}>Metrics</Text>
            <View style={styles.metricGrid}>
              <View style={styles.metricRow}>
                <DashboardMetricCard
                  title="Total revenue"
                  value={fmt(data.total_revenue ?? data.gross_revenue)}
                  footer="All-time gross revenue"
                  footerMuted="Includes completed sales in your store."
                />
                <DashboardMetricCard
                  title="Total orders"
                  value={fmtCount(data.total_orders)}
                  footer="Lifetime order volume"
                  footerMuted="Every order placed to date."
                />
              </View>
              <View style={styles.metricRow}>
                <DashboardMetricCard
                  title="Revenue today"
                  value={fmt(data.revenue_today)}
                  footer="Current day performance"
                  footerMuted="Store calendar day (America/Jamaica). Set DASHBOARD_BUSINESS_TZ on the API to change."
                />
                <DashboardMetricCard
                  title="Orders today"
                  value={fmtCount(data.orders_today)}
                  footer="Orders placed today"
                  footerMuted="Same window as revenue — live from orders, not the metrics cache."
                />
              </View>
            </View>

            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Performance</Text>
            <DashboardChartCard
              title="Traffic & revenue trend"
              description="View charts, date ranges, and breakdowns in Analytics."
              onPress={() => router.push('/(tabs)/analytics')}
              sparklineValues={extractDashboardSparkline(data)}
            />

            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Engagement</Text>
            <View style={styles.metricRow}>
              <DashboardMetricCard
                title="New users"
                value={fmtCount(data.new_users)}
                footer="Recent sign-ups"
                footerMuted="Rolling window from your API."
              />
              <DashboardMetricCard
                title="Open tickets"
                value={fmtCount(data.open_tickets)}
                footer="Support queue"
                footerMuted="Needs a response or assignment."
              />
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Shortcuts</Text>
        <View style={styles.shortcutsWrap}>
          {QUICK_LINKS.map((item, idx) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => [
                styles.shortcutBtn,
                idx === QUICK_LINKS.length - 1 && styles.shortcutBtnLast,
                pressed && styles.shortcutBtnPressed,
              ]}
            >
              <View style={[styles.shortcutIcon, { borderColor: `${item.color}40` }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {__DEV__ && data && Object.keys(data).length > 0 && (
          <View style={styles.debugWrap}>
            <Text style={styles.debugTitle}>Debug · raw metrics</Text>
            {Object.entries(data).map(([k, v]) => (
              <View key={k} style={styles.debugRow}>
                <Text style={styles.debugKey}>{k.replace(/_/g, ' ')}</Text>
                <Text style={styles.debugVal}>{String(v ?? '—')}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  roleText: { ...Typography.caption, color: Colors.primaryLight, fontSize: 10 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radii.card,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  sectionLabelSpaced: { marginTop: Spacing.xl },

  metricGrid: { gap: Spacing.md, marginBottom: Spacing.lg },
  metricRow: { flexDirection: 'row', gap: Spacing.md },

  shortcutsWrap: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shortcutBtnLast: { borderBottomWidth: 0 },
  shortcutBtnPressed: { backgroundColor: Colors.bgElevated },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shortcutLabel: { flex: 1, ...Typography.body, fontWeight: '500', color: Colors.text },

  debugWrap: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  debugTitle: { ...Typography.caption, color: Colors.warning, marginBottom: Spacing.sm },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  debugKey: { ...Typography.bodySmall, color: Colors.textSecondary, textTransform: 'capitalize', flex: 1 },
  debugVal: { ...Typography.bodySmall, color: Colors.text, fontWeight: '500' },
});
