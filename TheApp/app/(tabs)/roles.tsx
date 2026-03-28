import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSmartToolBack } from '../../hooks/useSmartToolBack';
import { api } from '../../lib/api';
import { AppHeader, Card, LoadingState, ErrorState } from '../../components/ui';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';
import { formatRoleLabel, toAssignableRoleValue } from '../../constants/roles';

interface RoleUser {
  id: string;
  full_name?: string;
  fullName?: string;
  email?: string;
  role?: string;
}
interface RolePermissionTriple {
  read: boolean;
  write: boolean;
  admin: boolean;
}
interface RoleMatrixResource {
  resource: string;
  permissions: Record<string, RolePermissionTriple>;
}
interface RoleDefRow {
  role_key?: string;
  display_name?: string;
  description?: string;
}

interface RoleMatrix {
  roles: unknown;
  resources: RoleMatrixResource[];
}

interface MatrixColumn {
  permKey: string;
  label: string;
}

/** `permKey` matches `role_permissions.role_key`; label is human-readable. */
function buildMatrixColumns(roles: unknown): MatrixColumn[] {
  if (!Array.isArray(roles)) return [];
  const out: MatrixColumn[] = [];
  const seen = new Set<string>();
  for (const item of roles) {
    if (typeof item === 'string') {
      const permKey = item.trim();
      if (!permKey || seen.has(permKey)) continue;
      seen.add(permKey);
      out.push({ permKey, label: formatRoleLabel(toAssignableRoleValue(permKey)) });
    } else if (item && typeof item === 'object' && item !== null && 'role_key' in item) {
      const row = item as RoleDefRow;
      const permKey = String(row.role_key ?? '').trim();
      if (!permKey || seen.has(permKey)) continue;
      seen.add(permKey);
      const label = row.display_name?.trim() || formatRoleLabel(toAssignableRoleValue(permKey));
      out.push({ permKey, label });
    }
  }
  return out;
}

function roleAccent(role: string | undefined): string {
  const raw = role || 'customer';
  const colors: Record<string, string> = {
    admin: Colors.primaryLight,
    representative: Colors.info,
    'senior employee': Colors.purple,
    senior_employee: Colors.purple,
    employee: Colors.success,
    ambassador: Colors.warning,
    customer: Colors.textSecondary,
  };
  return colors[raw] || colors[toAssignableRoleValue(raw)] || Colors.textMuted;
}

const ROLE_CELL = 76;
const RESOURCE_COL = 132;

export default function RolesScreen() {
  const goBack = useSmartToolBack();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [matrix, setMatrix] = useState<RoleMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'users' | 'matrix'>('users');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [u, m] = await Promise.all([
        api.get<RoleUser[]>('/roles/users'),
        api.get<RoleMatrix>('/roles/matrix'),
      ]);
      setUsers(Array.isArray(u) ? u : (u as any).users ?? []);
      setMatrix(m);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  const matrixColumns = matrix ? buildMatrixColumns(matrix.roles) : [];
  const matrixWidth = matrix ? RESOURCE_COL + matrixColumns.length * ROLE_CELL : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Roles" subtitle="Staff & permission matrix" onBack={goBack} />

      <View style={styles.segmentWrap}>
        <Pressable
          onPress={() => setTab('users')}
          style={({ pressed }) => [
            styles.segment,
            tab === 'users' && styles.segmentActive,
            pressed && Platform.OS === 'ios' && { opacity: 0.9 },
          ]}
          android_ripple={{ color: 'rgba(129,140,248,0.15)' }}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color={tab === 'users' ? Colors.primaryLight : Colors.textMuted}
          />
          <Text style={[styles.segmentLabel, tab === 'users' && styles.segmentLabelActive]}>Staff users</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('matrix')}
          style={({ pressed }) => [
            styles.segment,
            tab === 'matrix' && styles.segmentActive,
            pressed && Platform.OS === 'ios' && { opacity: 0.9 },
          ]}
          android_ripple={{ color: 'rgba(129,140,248,0.15)' }}
        >
          <Ionicons
            name="grid-outline"
            size={20}
            color={tab === 'matrix' ? Colors.primaryLight : Colors.textMuted}
          />
          <Text style={[styles.segmentLabel, tab === 'matrix' && styles.segmentLabelActive]}>Permission matrix</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxl + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {tab === 'users' && (
          <>
            <Text style={styles.sectionLabel}>{users.length} staff members</Text>
            {users.map((u) => (
              <View key={u.id} style={styles.userRow}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: roleAccent(u.role) + '22' },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarLetter,
                      { color: roleAccent(u.role) },
                    ]}
                  >
                    {(u.full_name || u.fullName || u.email || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {u.full_name || u.fullName || '—'}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {u.email || '—'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.roleTag,
                    { backgroundColor: roleAccent(u.role) + '22' },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      { color: roleAccent(u.role) },
                    ]}
                    numberOfLines={1}
                  >
                    {formatRoleLabel(u.role || 'customer')}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'matrix' && matrix && (
          <>
            <Text style={styles.sectionLabel}>Permission matrix</Text>
            <Text style={styles.matrixExplainer}>
              Swipe horizontally to see every role column. Icons show highest permission granted (read / write / admin).
            </Text>

            <Card style={styles.legendCard}>
              <Text style={styles.legendTitle}>Legend</Text>
              <View style={styles.legendRow}>
                <Ionicons name="eye-outline" size={18} color={Colors.warning} />
                <Text style={styles.legendText}>Read</Text>
              </View>
              <View style={styles.legendRow}>
                <Ionicons name="create-outline" size={18} color={Colors.info} />
                <Text style={styles.legendText}>Write</Text>
              </View>
              <View style={styles.legendRow}>
                <Ionicons name="shield-checkmark" size={18} color={Colors.success} />
                <Text style={styles.legendText}>Admin</Text>
              </View>
              <View style={styles.legendRow}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                <Text style={styles.legendText}>No access</Text>
              </View>
            </Card>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              indicatorStyle="white"
              contentContainerStyle={styles.matrixScroll}
            >
              <View style={{ minWidth: matrixWidth }}>
                <View style={styles.matrixRow}>
                  <View style={[styles.matrixResourceCell, styles.matrixHeaderCell]}>
                    <Text style={styles.matrixHeader}>Resource</Text>
                  </View>
                  {matrixColumns.map((col) => (
                    <View key={col.permKey} style={[styles.matrixRoleCell, styles.matrixHeaderCell]}>
                      <Text
                        style={[styles.matrixRoleHeader, { color: roleAccent(col.permKey) }]}
                        numberOfLines={2}
                        accessibilityLabel={col.permKey}
                      >
                        {col.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {matrix.resources.map((res, i) => (
                  <View key={res.resource} style={[styles.matrixRow, i % 2 === 0 && styles.matrixRowAlt]}>
                    <View style={styles.matrixResourceCell}>
                      <Text style={styles.matrixResource} numberOfLines={2}>
                        {res.resource.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    {matrixColumns.map((col) => {
                      const p = res.permissions?.[col.permKey];
                      const hasAdmin = p?.admin;
                      const hasWrite = p?.write;
                      const hasRead = p?.read;
                      const iconName = hasAdmin || hasWrite || hasRead ? 'checkmark-circle' : 'close-circle';
                      const iconColor = hasAdmin
                        ? Colors.success
                        : hasWrite
                          ? Colors.info
                          : hasRead
                            ? Colors.warning
                            : Colors.textMuted;
                      return (
                        <View key={col.permKey} style={styles.matrixRoleCell}>
                          <Ionicons
                            name={iconName}
                            size={20}
                            color={iconColor}
                            accessibilityLabel={`${res.resource} ${col.permKey}: ${hasAdmin ? 'admin' : hasWrite ? 'write' : hasRead ? 'read' : 'none'}`}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    padding: 4,
    borderRadius: Radii.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    minHeight: 48,
  },
  segmentActive: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  segmentLabelActive: { color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  sectionLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  matrixExplainer: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  legendCard: {
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  legendTitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
  legendText: { ...Typography.bodySmall, color: Colors.text },
  matrixScroll: {
    paddingRight: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 10,
    minHeight: 64,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 17, fontWeight: '700' },
  userName: { ...Typography.body, color: Colors.text, fontWeight: '600' },
  userEmail: { ...Typography.caption, color: Colors.textSecondary },
  roleTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radii.sm, maxWidth: 120 },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  matrixRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  matrixRowAlt: { backgroundColor: Colors.bgCard },
  matrixResourceCell: {
    width: RESOURCE_COL,
    padding: 10,
    justifyContent: 'center',
  },
  matrixHeaderCell: { paddingVertical: 12, backgroundColor: Colors.bgElevated },
  matrixRoleCell: {
    width: ROLE_CELL,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixHeader: { ...Typography.caption, color: Colors.textSecondary, textTransform: 'uppercase' },
  matrixRoleHeader: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
    textAlign: 'center',
    lineHeight: 13,
  },
  matrixResource: { ...Typography.bodySmall, color: Colors.text },
});
