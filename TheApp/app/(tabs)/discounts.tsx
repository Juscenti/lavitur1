import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, ScrollView, RefreshControl, Alert, Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSmartToolBack } from '../../hooks/useSmartToolBack';
import { api } from '../../lib/api';
import {
  AppHeader, SectionHeader, LoadingState, ErrorState, Button, Input, SheetHandle, Divider, StatusBadge, SurfaceRaised, EmptyState,
} from '../../components/ui';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';

interface Discount {
  id: string; code: string; discount_percent?: number; active?: boolean;
  usage_limit?: number; starts_at?: string; ends_at?: string;
  campaign_name?: string; ambassador_id?: string;
}

interface DiscountForm {
  code: string; discount_percent: string; usage_limit: string;
  starts_at: string; ends_at: string; campaign_name: string; active: boolean;
}

const emptyForm: DiscountForm = {
  code: '', discount_percent: '', usage_limit: '',
  starts_at: '', ends_at: '', campaign_name: '', active: true,
};

function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

export default function DiscountsScreen() {
  const goBack = useSmartToolBack();
  const insets = useSafeAreaInsets();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form, setForm] = useState<DiscountForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get<Discount[]>('/discounts');
      setDiscounts(Array.isArray(res) ? res : (res as any).discounts ?? []);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  function openEdit(d: Discount) {
    setEditing(d);
    setForm({
      code: d.code,
      discount_percent: String(d.discount_percent ?? ''),
      usage_limit: String(d.usage_limit ?? ''),
      starts_at: d.starts_at || '',
      ends_at: d.ends_at || '',
      campaign_name: d.campaign_name || '',
      active: toBool(d.active, true),
    });
    setShowForm(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function save() {
    if (!form.code || !form.discount_percent) {
      Alert.alert('Validation', 'Code and discount percent are required.');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        code: form.code.toUpperCase(),
        discount_percent: parseFloat(form.discount_percent),
        active: form.active,
        campaign_name: form.campaign_name || undefined,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
        starts_at: form.starts_at || undefined,
        ends_at: form.ends_at || undefined,
      };
      if (editing) {
        await api.patch(`/discounts/${editing.id}`, body);
        setDiscounts(prev => prev.map(d => d.id === editing.id ? { ...d, ...body } : d));
      } else {
        await api.post('/discounts', body);
        await load();
      }
      setShowForm(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  }

  async function toggleActive(d: Discount) {
    try {
      await api.patch(`/discounts/${d.id}/active`, { active: !d.active });
      setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, active: !x.active } : x));
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Discounts"
        subtitle="Codes & campaigns"
        onBack={goBack}
        right={<Button label="New" onPress={openCreate} size="sm" />}
      />

      <FlatList
        data={discounts}
        keyExtractor={d => d.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.gold} />}
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxl + insets.bottom }]}
        renderItem={({ item }) => (
          <SurfaceRaised style={styles.discountCard}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(item)}>
              <View style={styles.cardTop}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.percent}>{item.discount_percent}% OFF</Text>
              </View>
              {item.campaign_name && <Text style={styles.campaign}>{item.campaign_name}</Text>}
              <View style={styles.cardBottom}>
                <Text style={styles.meta}>
                  {item.usage_limit ? `Limit: ${item.usage_limit}` : 'Unlimited'}
                </Text>
                {item.ends_at && <Text style={styles.meta}>Ends: {new Date(item.ends_at).toLocaleDateString()}</Text>}
              </View>
            </TouchableOpacity>
            <Switch
              value={toBool(item.active, true)}
              onValueChange={() => toggleActive(item)}
              trackColor={{ false: Colors.border, true: Colors.gold + '88' }}
              thumbColor={toBool(item.active, true) ? Colors.gold : Colors.textMuted}
            />
          </SurfaceRaised>
        )}
        ListEmptyComponent={<EmptyState message="No discount codes yet" icon="pricetag-outline" />}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <SheetHandle />
            <Text style={styles.sheetTitle}>{editing ? 'Edit Discount' : 'New Discount Code'}</Text>
            <Divider style={{ marginVertical: Spacing.md }} />

            <Input
              label="Code"
              value={form.code}
              onChangeText={v => setForm(f => ({ ...f, code: v.toUpperCase() }))}
              placeholder="SUMMER25"
              autoCapitalize="characters"
            />
            <Input
              label="Discount %"
              value={form.discount_percent}
              onChangeText={v => setForm(f => ({ ...f, discount_percent: v }))}
              placeholder="25"
              keyboardType="decimal-pad"
            />
            <Input
              label="Campaign Name"
              value={form.campaign_name}
              onChangeText={v => setForm(f => ({ ...f, campaign_name: v }))}
              placeholder="Summer Sale 2025"
            />
            <Input
              label="Usage Limit (blank = unlimited)"
              value={form.usage_limit}
              onChangeText={v => setForm(f => ({ ...f, usage_limit: v }))}
              placeholder="100"
              keyboardType="numeric"
            />
            <Input
              label="Starts At (ISO date)"
              value={form.starts_at}
              onChangeText={v => setForm(f => ({ ...f, starts_at: v }))}
              placeholder="2025-06-01"
            />
            <Input
              label="Ends At (ISO date)"
              value={form.ends_at}
              onChangeText={v => setForm(f => ({ ...f, ends_at: v }))}
              placeholder="2025-08-31"
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={form.active}
                onValueChange={v => setForm(f => ({ ...f, active: v }))}
                trackColor={{ false: Colors.border, true: Colors.gold + '88' }}
                thumbColor={form.active ? Colors.gold : Colors.textMuted}
              />
            </View>

            <View style={styles.actions}>
              <Button label={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} style={{ flex: 1 }} />
            </View>
            <Button label="Cancel" onPress={() => setShowForm(false)} variant="ghost" style={{ marginTop: 8 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: Spacing.lg, paddingTop: Spacing.sm },
  discountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 12,
    borderRadius: Radii.lg,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 16, fontWeight: '800', color: Colors.gold, fontFamily: 'monospace', letterSpacing: 1 },
  percent: { ...Typography.body, color: Colors.text, fontWeight: '700' },
  campaign: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  cardBottom: { flexDirection: 'row', gap: 12, marginTop: 4 },
  meta: { ...Typography.caption, color: Colors.textMuted },
  sheet: { padding: Spacing.lg, paddingBottom: 48 },
  sheetTitle: { ...Typography.heading, color: Colors.text },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  switchLabel: { ...Typography.body, color: Colors.text },
  actions: { marginTop: Spacing.md },
});
