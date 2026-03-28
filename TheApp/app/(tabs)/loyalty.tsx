import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSmartToolBack } from '../../hooks/useSmartToolBack';
import { api } from '../../lib/api';
import { AppHeader, SectionHeader, Card, StatCard, LoadingState, ErrorState } from '../../components/ui';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface LoyaltyTier {
  id: string; name: string; min_points?: number; max_points?: number;
  benefits?: string; benefits_summary?: string; color?: string; member_count?: number;
  description?: string;
  members?: number;
}

interface LoyaltyOverview {
  members?: number;
  total_points?: number;
  avg_points?: number;
  tiers?: Array<{ id: string; name: string; min_points?: number; members?: number; benefits_summary?: string; description?: string }>;
  [key: string]: any;
}

export default function LoyaltyScreen() {
  const goBack = useSmartToolBack();
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [ov, tr] = await Promise.all([
        api.get<LoyaltyOverview>('/loyalty/overview'),
        api.get<LoyaltyTier[] | { tiers: LoyaltyTier[] }>('/loyalty/tiers'),
      ]);
      setOverview(ov);
      setTiers(Array.isArray(tr) ? tr : (tr as any).tiers ?? []);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  function fmt(n?: number) {
    if (n == null) return '—';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  const tierColors = ['#C9A84C', '#C0C0C0', '#CD7F32', '#3498DB', '#9B59B6'];

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Loyalty" subtitle="Program overview" onBack={goBack} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.gold} />}
      >
        {overview && (
          <>
            <Text style={styles.sectionLabel}>OVERVIEW</Text>
            <View style={styles.statsRow}>
              <StatCard label="Members" value={fmt(overview.members)} color={Colors.gold} />
              <View style={{ width: 8 }} />
              <StatCard label="Avg Points" value={fmt(overview.avg_points)} color={Colors.success} />
            </View>
            <View style={[styles.statsRow, { marginTop: 8 }]}>
              <StatCard label="Total Points" value={fmt(overview.total_points)} />
              <View style={{ width: 8 }} />
            </View>

            {/* Tier breakdown */}
            {overview.tiers && overview.tiers.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>TIER BREAKDOWN</Text>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {overview.tiers.map((tb, i) => (
                    <View key={tb.id || tb.name || i} style={styles.tierRow}>
                      <View style={[styles.tierDot, { backgroundColor: tierColors[i % tierColors.length] }]} />
                      <Text style={styles.tierName}>{tb.name}</Text>
                      <Text style={styles.tierCount}>{tb.members ?? 0} members</Text>
                    </View>
                  ))}
                </Card>
              </>
            )}
          </>
        )}

        {/* Tiers list */}
        {tiers.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>TIERS</Text>
            {tiers.map((tier, i) => (
              <Card key={tier.id} style={styles.tierCard}>
                <View style={styles.tierHeader}>
                  <View style={[styles.tierBadge, { backgroundColor: tierColors[i % tierColors.length] + '22', borderColor: tierColors[i % tierColors.length] + '44' }]}>
                    <Ionicons name="star" size={14} color={tierColors[i % tierColors.length]} />
                    <Text style={[styles.tierBadgeText, { color: tierColors[i % tierColors.length] }]}>{tier.name}</Text>
                  </View>
                  {(tier.members ?? tier.member_count) != null && (
                    <Text style={styles.tierMemberCount}>{tier.members ?? tier.member_count} members</Text>
                  )}
                </View>
                <View style={styles.tierPoints}>
                  <Text style={styles.tierPointsText}>{tier.min_points ?? 0} pts+</Text>
                </View>
                {tier.benefits_summary && (
                  <Text style={styles.tierBenefits}>{tier.benefits_summary}</Text>
                )}
                {(!tier.benefits_summary && tier.description) && (
                  <Text style={styles.tierBenefits}>{tier.description}</Text>
                )}
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.sm },
  sectionLabel: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row' },
  tierRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 10,
  },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierName: { ...Typography.body, color: Colors.text, flex: 1, fontWeight: '600', textTransform: 'capitalize' },
  tierCount: { ...Typography.bodySmall, color: Colors.textSecondary },
  tierCard: { marginBottom: Spacing.sm },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, gap: 4,
  },
  tierBadgeText: { fontSize: 13, fontWeight: '700' },
  tierMemberCount: { ...Typography.caption, color: Colors.textMuted },
  tierPoints: { marginBottom: 6 },
  tierPointsText: { ...Typography.bodySmall, color: Colors.textSecondary, fontFamily: 'monospace' },
  tierBenefits: { ...Typography.bodySmall, color: Colors.textMuted, lineHeight: 18 },
});
