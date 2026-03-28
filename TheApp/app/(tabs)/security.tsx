import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSmartToolBack } from '../../hooks/useSmartToolBack';
import { api } from '../../lib/api';
import { AppHeader, SectionHeader, Card, StatCard, LoadingState, ErrorState } from '../../components/ui';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface SecurityOverview {
  locked_accounts?: number; failed_logins_today?: number;
  failed_24h?: number;
  staff_mfa_enabled?: number;
  [key: string]: any;
}
interface SecurityEvent {
  id: string; event_type?: string; user_email?: string;
  user_id?: string;
  success?: boolean;
  ip_address?: string; created_at?: string;
  user_agent?: string;
  details?: string;
  [key: string]: any;
}

export default function SecurityScreen() {
  const goBack = useSmartToolBack();
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [ov, ev] = await Promise.all([
        api.get<SecurityOverview>('/security/overview'),
        api.get<{ events: SecurityEvent[] }>('/security/events'),
      ]);
      setOverview(ov);
      setEvents(ev.events ?? []);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  function fmt(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function eventIcon(success?: boolean): React.ComponentProps<typeof Ionicons>['name'] {
    if (success === false) return 'warning-outline';
    return 'shield-checkmark-outline';
  }

  function eventColor(success?: boolean) {
    if (success === false) return Colors.danger;
    return Colors.textSecondary;
  }

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Security" subtitle="Audit log & account health" onBack={goBack} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.gold} />}
      >
        {/* Overview stats */}
        {overview && (
          <>
            <Text style={styles.sectionLabel}>OVERVIEW</Text>
            <View style={styles.statsRow}>
              <StatCard
                label="Locked Accounts"
                value={overview.locked_accounts ?? 0}
                color={overview.locked_accounts ? Colors.danger : Colors.success}
              />
              <View style={{ width: 8 }} />
              <StatCard
                label="Failed Logins (24h)"
                value={overview.failed_24h ?? 0}
                color={overview.failed_24h ? Colors.warning : Colors.success}
              />
            </View>

            <Card style={styles.mfaCard}>
              <View style={styles.mfaHeader}>
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={(overview.staff_mfa_enabled ?? 0) > 0 ? Colors.success : Colors.warning}
                />
                <Text style={styles.mfaTitle}>Staff MFA Enabled</Text>
                <Text style={[styles.mfaPercent, { color: (overview.staff_mfa_enabled ?? 0) > 0 ? Colors.success : Colors.warning }]}>
                  {overview.staff_mfa_enabled ?? 0}
                </Text>
              </View>
              <Text style={styles.mfaSub}>Number of staff accounts with MFA enabled.</Text>
            </Card>

            {/* Any extra overview keys */}
            {Object.entries(overview)
              .filter(([k]) => !['locked_accounts', 'failed_24h', 'staff_mfa_enabled'].includes(k))
              .map(([k, v]) => (
                <View key={k} style={styles.extraRow}>
                  <Text style={styles.extraKey}>{k.replace(/_/g, ' ')}</Text>
                  <Text style={styles.extraVal}>{String(v ?? '—')}</Text>
                </View>
              ))
            }
          </>
        )}

        {/* Events log */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>RECENT EVENTS ({events.length})</Text>
        {events.length === 0 && <Text style={styles.emptyText}>No recent security events</Text>}
        {events.map(ev => (
          <View key={ev.id} style={styles.eventRow}>
            <View style={[styles.eventIcon, { backgroundColor: eventColor(ev.success) + '18' }]}>
              <Ionicons name={eventIcon(ev.success)} size={16} color={eventColor(ev.success)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventType}>
                {ev.success === false ? 'Login failed' : 'Login event'}
              </Text>
              <Text style={styles.eventMeta} numberOfLines={1}>
                {ev.user_id || '—'} · {ev.ip_address || ''}
              </Text>
            </View>
            <Text style={styles.eventDate}>{fmt(ev.created_at)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.sm },
  sectionLabel: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', marginBottom: Spacing.md },
  mfaCard: { marginBottom: Spacing.md },
  mfaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  mfaTitle: { ...Typography.body, color: Colors.text, flex: 1, fontWeight: '600' },
  mfaPercent: { fontSize: 18, fontWeight: '800' },
  mfaBar: {
    height: 6, backgroundColor: Colors.bgElevated,
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  mfaFill: { height: '100%', borderRadius: 3 },
  mfaSub: { ...Typography.caption, color: Colors.textMuted },
  extraRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  extraKey: { ...Typography.bodySmall, color: Colors.textSecondary, textTransform: 'capitalize' },
  extraVal: { ...Typography.bodySmall, color: Colors.text, fontWeight: '500' },
  eventRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: 10,
  },
  eventIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  eventType: { ...Typography.body, color: Colors.text, fontWeight: '600', textTransform: 'capitalize' },
  eventMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  eventDetails: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  eventDate: { ...Typography.caption, color: Colors.textMuted, textAlign: 'right', minWidth: 70 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', paddingVertical: 24 },
});
