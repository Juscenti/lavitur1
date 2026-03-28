import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSmartToolBack } from '../../hooks/useSmartToolBack';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { AppHeader, Card, StatCard, LoadingState, ErrorState, SectionHeader } from '../../components/ui';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';

interface AnalyticsData {
  kpis?: Record<string, any>;
  daily?: { day?: string; date?: string; orders?: number; revenue?: number }[];
  topProducts?: Array<{
    name?: string; title?: string; total_sold?: number;
    units_sold?: number; revenue?: number; orders?: number;
    orders_count?: number; gross_revenue?: number;
  }>;
  topAmbassadors?: Array<{
    name?: string; full_name?: string; orders?: number;
    orders_count?: number; gross_revenue?: number;
    revenue?: number; total_sales?: number; commission?: number;
  }>;
}

export default function AnalyticsScreen() {
  const goBack = useSmartToolBack();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get<AnalyticsData>('/analytics/overview');
      setData(res);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  function fmt(n?: number, prefix = '') {
    if (n == null) return '—';
    if (n >= 1000000) return `${prefix}${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}k`;
    return `${prefix}${n}`;
  }

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  const kpis = data?.kpis || {};
  const daily = data?.daily || [];
  const topProducts = data?.topProducts || [];
  const topAmbassadors = data?.topAmbassadors || [];
  const maxRevenue = Math.max(...daily.map(d => Number(d.revenue ?? 0)), 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Analytics" subtitle="Performance overview" onBack={goBack} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI grid */}
        {Object.keys(kpis).length > 0 && (
          <>
            <SectionHeader title="Key Metrics" />
            <View style={styles.kpiGrid}>
              {Object.entries(kpis).slice(0, 4).map(([k, v], i) => {
                const colors = [Colors.primary, Colors.info, Colors.success, Colors.purple];
                return (
                  <StatCard
                    key={k}
                    label={k.replace(/_/g, ' ')}
                    value={typeof v === 'number' && k.toLowerCase().includes('revenue') ? fmt(v, '$') : String(v ?? '—')}
                    color={colors[i % colors.length]}
                  />
                );
              })}
            </View>
          </>
        )}

        {/* Revenue bar chart */}
        {daily.length > 0 && (
          <>
            <SectionHeader title={`Daily Revenue (${daily.length}d)`} />
            <Card style={styles.chartCard}>
              <View style={styles.bars}>
                {daily.slice(-14).map((d, i) => {
                  const rev = Number(d.revenue ?? 0);
                  const h = Math.max((rev / maxRevenue) * 80, 4);
                  return (
                    <View key={i} style={styles.barWrap}>
                      <Text style={styles.barValue}>{rev >= 1000 ? `${(rev/1000).toFixed(0)}k` : rev > 0 ? String(rev) : ''}</Text>
                      <View style={[styles.bar, { height: h, backgroundColor: i === daily.slice(-14).length - 1 ? Colors.primary : Colors.primaryDim }]} />
                      <Text style={styles.barDay}>
                        {(d.day || d.date || '').slice(5, 10).replace('-', '/')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          </>
        )}

        {/* Top products */}
        {topProducts.length > 0 && (
          <>
            <SectionHeader title="Top Products" />
            <Card style={styles.rankCard}>
              {topProducts.slice(0, 5).map((p, i) => (
                <View key={i} style={[styles.rankRow, i === Math.min(topProducts.length, 5) - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.rankBadge, i === 0 && styles.rankBadgeGold]}>
                    <Text style={[styles.rankNum, i === 0 && { color: Colors.textInverse }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.rankName} numberOfLines={1}>{p.name || p.title || '—'}</Text>
                  <View style={styles.rankRight}>
                    <Text style={styles.rankValue}>{fmt(p.revenue ?? p.gross_revenue, '$')}</Text>
                    <Text style={styles.rankSub}>{fmt(p.units_sold ?? p.total_sold)} sold</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Top ambassadors */}
        {topAmbassadors.length > 0 && (
          <>
            <SectionHeader title="Top Ambassadors" />
            <Card style={styles.rankCard}>
              {topAmbassadors.slice(0, 5).map((a, i) => (
                <View key={i} style={[styles.rankRow, i === Math.min(topAmbassadors.length, 5) - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.rankBadge, i === 0 && styles.rankBadgeGold]}>
                    <Text style={[styles.rankNum, i === 0 && { color: Colors.textInverse }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.rankName} numberOfLines={1}>{a.name || a.full_name || '—'}</Text>
                  <View style={styles.rankRight}>
                    <Text style={styles.rankValue}>{fmt(a.revenue ?? a.gross_revenue ?? a.total_sales, '$')}</Text>
                    <Text style={styles.rankSub}>{fmt(a.orders ?? a.orders_count)} orders</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  chartCard: { marginBottom: Spacing.lg, padding: Spacing.md },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barValue: { fontSize: 8, color: Colors.textMuted, textAlign: 'center' },
  bar: { width: '100%', borderRadius: 3, minHeight: 4 },
  barDay: { fontSize: 8, color: Colors.textMuted, textAlign: 'center' },
  rankCard: { marginBottom: Spacing.lg, padding: 0 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeGold: { backgroundColor: Colors.primary, borderColor: Colors.primaryLight },
  rankNum: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  rankName: { ...Typography.body, color: Colors.text, flex: 1, fontWeight: '500' },
  rankRight: { alignItems: 'flex-end' },
  rankValue: { ...Typography.label, color: Colors.primaryLight },
  rankSub: { ...Typography.bodySmall, color: Colors.textMuted, fontSize: 11 },
});
