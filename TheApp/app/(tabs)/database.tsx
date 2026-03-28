import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSmartToolBack } from '../../hooks/useSmartToolBack';
import { api } from '../../lib/api';
import { AppHeader, SectionHeader, Card, LoadingState, ErrorState, Button } from '../../components/ui';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface TableStat {
  table_name?: string; name?: string; row_count?: number;
  size?: string; last_vacuum?: string; [key: string]: any;
}
interface MaintenanceJob {
  id: string; job_key: string; status?: string;
  created_at?: string; completed_at?: string; [key: string]: any;
}

const COMMON_JOBS = [
  { key: 'vacuum_analyze', label: 'Vacuum & Analyze', icon: 'refresh-circle-outline', color: Colors.info },
  { key: 'reindex', label: 'Reindex Tables', icon: 'server-outline', color: Colors.warning },
  { key: 'clear_expired_sessions', label: 'Clear Expired Sessions', icon: 'trash-outline', color: Colors.danger },
  { key: 'archive_old_orders', label: 'Archive Old Orders', icon: 'archive-outline', color: Colors.textSecondary },
];

export default function DatabaseScreen() {
  const goBack = useSmartToolBack();
  const insets = useSafeAreaInsets();
  const [tables, setTables] = useState<TableStat[]>([]);
  const [jobs, setJobs] = useState<MaintenanceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [enqueueing, setEnqueueing] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [h, j] = await Promise.all([
        api.get<{ tables: TableStat[] }>('/database/health'),
        api.get<{ jobs: MaintenanceJob[] }>('/database/jobs'),
      ]);
      setTables(h.tables ?? []);
      setJobs(j.jobs ?? []);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function enqueueJob(jobKey: string) {
    Alert.alert('Run Job', `Queue job: ${jobKey}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Run', onPress: async () => {
          setEnqueueing(jobKey);
          try {
            const res = await api.post<MaintenanceJob>('/database/jobs', { job_key: jobKey });
            setJobs(prev => [res, ...prev]);
            Alert.alert('Queued', `Job "${jobKey}" has been queued.`);
          } catch (e: any) { Alert.alert('Error', e.message); }
          setEnqueueing(null);
        },
      },
    ]);
  }

  function fmt(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function jobStatusColor(status?: string) {
    if (status === 'completed') return Colors.success;
    if (status === 'failed') return Colors.danger;
    if (status === 'running') return Colors.info;
    return Colors.textMuted;
  }

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Database" subtitle="Health & maintenance" onBack={goBack} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.gold} />}
      >
        {/* Quick actions */}
        <Text style={styles.sectionLabel}>MAINTENANCE JOBS</Text>
        <View style={styles.jobGrid}>
          {COMMON_JOBS.map(j => (
            <TouchableOpacity
              key={j.key}
              style={styles.jobButton}
              onPress={() => enqueueJob(j.key)}
              disabled={enqueueing !== null}
            >
              <View style={[styles.jobIcon, { backgroundColor: j.color + '18' }]}>
                <Ionicons name={j.icon as any} size={20} color={j.color} />
              </View>
              <Text style={styles.jobLabel}>{j.label}</Text>
              {enqueueing === j.key && (
                <Text style={styles.jobQueuing}>Queuing…</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Table health */}
        {tables.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>TABLE HEALTH ({tables.length})</Text>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableNameCell, styles.headerText]}>Table</Text>
                <Text style={[styles.tableCell, styles.headerText]}>Rows</Text>
                <Text style={[styles.tableCell, styles.headerText]}>Size</Text>
              </View>
              {tables.map((t, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, styles.tableNameCell, styles.tableName]} numberOfLines={1}>
                    {t.table_name || t.name || '—'}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableValue]}>
                    {t.row_count != null ? t.row_count.toLocaleString() : '—'}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableValue]}>{t.size || '—'}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Job history */}
        {jobs.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>JOB HISTORY ({jobs.length})</Text>
            {jobs.slice(0, 20).map(j => (
              <View key={j.id} style={styles.jobRow}>
                <View style={[styles.jobStatusDot, { backgroundColor: jobStatusColor(j.status) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobKey}>{j.job_key.replace(/_/g, ' ')}</Text>
                  <Text style={styles.jobTime}>
                    Queued: {fmt(j.created_at)}
                    {j.completed_at ? ` · Done: ${fmt(j.completed_at)}` : ''}
                  </Text>
                </View>
                <Text style={[styles.jobStatus, { color: jobStatusColor(j.status) }]}>
                  {j.status || 'pending'}
                </Text>
              </View>
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
  jobGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  jobButton: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, width: '47%', alignItems: 'center',
  },
  jobIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  jobLabel: { ...Typography.bodySmall, color: Colors.text, fontWeight: '600', textAlign: 'center' },
  jobQueuing: { ...Typography.caption, color: Colors.gold, marginTop: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableHeader: { backgroundColor: Colors.bgElevated },
  tableRowAlt: { backgroundColor: Colors.bgCard },
  tableCell: { paddingVertical: 10, paddingHorizontal: 12, flex: 1, fontSize: 13 },
  tableNameCell: { flex: 2 },
  headerText: { color: Colors.textMuted, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  tableName: { color: Colors.text, fontFamily: 'monospace' },
  tableValue: { color: Colors.textSecondary },
  jobRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: 10,
  },
  jobStatusDot: { width: 10, height: 10, borderRadius: 5 },
  jobKey: { ...Typography.body, color: Colors.text, fontWeight: '500', textTransform: 'capitalize' },
  jobTime: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  jobStatus: { ...Typography.caption, fontWeight: '700', textTransform: 'capitalize' },
});
