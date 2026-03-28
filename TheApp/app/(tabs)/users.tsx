import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import {
  AppHeader,
  StatusBadge,
  LoadingState,
  ErrorState,
  Button,
  SheetHandle,
  EmptyState,
  Card,
  SelectionChip,
  MetricRow,
} from '../../components/ui';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';
import { useRoleOptions } from '../../hooks/useRoleOptions';
import { useSmartToolBack } from '../../hooks/useSmartToolBack';
import { formatRoleLabel, rolesMatch, toAssignableRoleValue } from '../../constants/roles';

interface User {
  id: string;
  fullName?: string;
  full_name?: string;
  username?: string;
  email?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
}

const STATUSES = ['active', 'suspended'];

function dedupeSortStrings(arr: string[]) {
  return [...new Set(arr.map((x) => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function getInitials(u: User) {
  const name = u.fullName || u.full_name || u.username || u.email || '';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '??';
}

const AVATAR_COLORS = [Colors.info, Colors.purple, Colors.success, Colors.primary, Colors.warning];

export default function UsersScreen() {
  const goBack = useSmartToolBack();
  const insets = useSafeAreaInsets();
  const { roleOptions, rolesLoaded, rolesError, refreshRoles } = useRoleOptions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial mount only
  }, []);

  async function load() {
    try {
      await refreshRoles();
      const res = await api.get<User[]>('/users');
      setUsers(Array.isArray(res) ? res : (res as any).users ?? []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /** Canonical six roles + API extras; append selected value if still not listed (legacy rows). */
  const rolesForPicker = useMemo(() => {
    const r = selected?.role?.trim();
    if (!r) return roleOptions;
    const canon = toAssignableRoleValue(r);
    if (roleOptions.includes(canon)) return roleOptions;
    return dedupeSortStrings([...roleOptions, canon]);
  }, [roleOptions, selected?.role]);

  async function updateStatus(userId: string, status: string) {
    setUpdating(true);
    try {
      await api.patch(`/users/${userId}/status`, { status });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
      setSelected((prev) => (prev ? { ...prev, status } : null));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setUpdating(false);
  }

  async function updateRole(userId: string, role: string) {
    setUpdating(true);
    try {
      await api.patch(`/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      setSelected((prev) => (prev ? { ...prev, role } : null));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setUpdating(false);
  }

  function displayName(u: User) {
    return u.fullName || u.full_name || u.username || u.email || u.id.slice(0, 8);
  }

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase();
        return (
          displayName(u).toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      })
    : users;

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Users" subtitle={`${users.length} accounts`} onBack={goBack} />

      <View style={styles.searchBar}>
        <View style={[styles.searchField, searchFocused && styles.searchFocused]}>
          <Ionicons name="search" size={18} color={searchFocused ? Colors.primary : Colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or email…"
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(u) => u.id}
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxl + insets.bottom }]}
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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState message="No users found" icon="people-outline" />}
        renderItem={({ item, index }) => {
          const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
          return (
            <Pressable
              onPress={() => setSelected(item)}
              android_ripple={{ color: 'rgba(129,140,248,0.15)' }}
              style={({ pressed }) => [styles.userRow, pressed && Platform.OS === 'ios' && { opacity: 0.92 }]}
            >
              <View style={[styles.avatar, { backgroundColor: `${color}22`, borderColor: `${color}40` }]}>
                <Text style={[styles.avatarText, { color }]}>{getInitials(item)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName(item)}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email || '—'}
                </Text>
              </View>
              <View style={styles.userMeta}>
                <StatusBadge status={item.status || 'active'} />
                <Text style={styles.userRole} numberOfLines={1}>
                  {formatRoleLabel(item.role)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </Pressable>
          );
        }}
      />

      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.overlay}>
          <Pressable
            style={styles.overlayBackdrop}
            onPress={() => !updating && setSelected(null)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.xl }]}>
            <SheetHandle />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {selected && (
                <View style={styles.sheetContent}>
                  <View style={styles.sheetUser}>
                    <View
                      style={[
                        styles.sheetAvatar,
                        { backgroundColor: Colors.primaryMuted, borderColor: Colors.primaryBorder },
                      ]}
                    >
                      <Text style={[styles.sheetAvatarText, { color: Colors.primaryLight }]}>
                        {getInitials(selected)}
                      </Text>
                    </View>
                    <View style={styles.sheetUserInfo}>
                      <Text style={styles.sheetName}>{displayName(selected)}</Text>
                      <Text style={styles.sheetEmail}>{selected.email || '—'}</Text>
                    </View>
                  </View>

                  <Text style={styles.sheetSection}>Account details</Text>
                  <Card style={styles.infoCard}>
                    <MetricRow label="ID" value={selected.id.slice(0, 12) + '…'} />
                    <MetricRow label="Role" value={formatRoleLabel(selected.role)} />
                    <MetricRow
                      label="Status"
                      value={selected.status || 'active'}
                      valueColor={Colors.statusColors[selected.status || 'active']}
                    />
                    <MetricRow
                      label="Joined"
                      value={
                        selected.createdAt || selected.created_at
                          ? new Date(selected.createdAt || selected.created_at || '').toLocaleDateString()
                          : '—'
                      }
                    />
                  </Card>

                  <Text style={styles.sheetSection}>Change role</Text>
                  {rolesError ? (
                    <View style={styles.roleErrorBox}>
                      <Text style={styles.roleErrorText}>{rolesError}</Text>
                      <Button label="Retry" onPress={() => refreshRoles()} variant="secondary" size="sm" />
                    </View>
                  ) : !rolesLoaded ? (
                    <Text style={styles.sheetHint}>Loading roles…</Text>
                  ) : rolesForPicker.length === 0 ? (
                    <Text style={styles.sheetHint}>
                      Could not load roles. Pull to refresh or retry below.
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.sheetHint}>
                        Admin, Representative, Senior employee, Employee, Ambassador, and Customer — plus any other
                        roles from your permission matrix or user records.
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.roleScroll}
                      >
                        {rolesForPicker.map((r) => (
                          <SelectionChip
                            key={r}
                            label={formatRoleLabel(r)}
                            selected={rolesMatch(selected.role, r)}
                            onPress={() => updateRole(selected.id, r)}
                            disabled={updating}
                          />
                        ))}
                      </ScrollView>
                    </>
                  )}

                  <Text style={styles.sheetSection}>Account status</Text>
                  <View style={styles.chipRow}>
                    {STATUSES.map((s) => (
                      <SelectionChip
                        key={s}
                        label={s}
                        selected={selected.status === s}
                        onPress={() => updateStatus(selected.id, s)}
                        disabled={updating}
                      />
                    ))}
                  </View>

                  <Button
                    label="Close"
                    onPress={() => setSelected(null)}
                    variant="secondary"
                    style={{ marginTop: Spacing.lg }}
                    disabled={updating}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  searchBar: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    gap: Spacing.sm,
  },
  searchFocused: { borderColor: Colors.primary },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  list: { padding: Spacing.lg },
  separator: { height: Spacing.sm },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    minHeight: 64,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { ...Typography.body, color: Colors.text, fontWeight: '600', fontSize: 15 },
  userEmail: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 2 },
  userMeta: { alignItems: 'flex-end', gap: 6, maxWidth: '36%' },
  userRole: { ...Typography.caption, color: Colors.textSecondary, fontSize: 10, textTransform: 'capitalize' },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    borderTopWidth: 1,
    borderColor: Colors.border,
    maxHeight: '88%',
  },
  sheetContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  sheetUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sheetAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetAvatarText: { fontSize: 20, fontWeight: '700' },
  sheetUserInfo: { flex: 1 },
  sheetName: { ...Typography.subheading, color: Colors.text },
  sheetEmail: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 3 },
  sheetSection: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sheetHint: { ...Typography.bodySmall, color: Colors.textSecondary, marginBottom: Spacing.sm },
  roleErrorBox: {
    padding: Spacing.md,
    backgroundColor: Colors.dangerDim,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  roleErrorText: { ...Typography.bodySmall, color: Colors.danger },
  infoCard: { marginBottom: Spacing.sm, padding: 0, paddingHorizontal: Spacing.lg },
  roleScroll: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
});
