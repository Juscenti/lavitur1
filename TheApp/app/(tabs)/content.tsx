import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Pressable,
  Modal, ScrollView, RefreshControl, Alert, Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSmartToolBack } from '../../hooks/useSmartToolBack';
import { api } from '../../lib/api';
import {
  AppHeader, SectionHeader, LoadingState, ErrorState, Button, Input, SheetHandle, Divider, StatusBadge, SurfaceRaised, EmptyState,
} from '../../components/ui';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';

interface ContentBlock {
  id: string; slug: string; title: string; type: string;
  body?: string; media_url?: string; cta_label?: string; cta_url?: string;
  is_active?: boolean; sort_order?: number; page?: string; variant?: string;
}

interface BlockForm {
  slug: string; title: string; type: string; body: string;
  media_url: string; cta_label: string; cta_url: string;
  is_active: boolean; sort_order: string; page: string; variant: string;
}

const emptyForm: BlockForm = {
  slug: '', title: '', type: 'banner', body: '',
  media_url: '', cta_label: '', cta_url: '',
  is_active: true, sort_order: '0', page: '', variant: '',
};

const BLOCK_TYPES = ['banner', 'hero', 'feature', 'testimonial', 'promo', 'announcement', 'gallery', 'text'];

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

export default function ContentScreen() {
  const goBack = useSmartToolBack();
  const insets = useSafeAreaInsets();
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContentBlock | null>(null);
  const [form, setForm] = useState<BlockForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get<{ items: ContentBlock[] }>('/content-blocks');
      setBlocks(res.items ?? []);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  function openEdit(b: ContentBlock) {
    setEditing(b);
    setForm({
      slug: b.slug, title: b.title, type: b.type,
      body: b.body || '', media_url: b.media_url || '',
      cta_label: b.cta_label || '', cta_url: b.cta_url || '',
      is_active: toBool(b.is_active, true),
      sort_order: String(b.sort_order ?? 0),
      page: b.page || '', variant: b.variant || '',
    });
    setShowForm(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function save() {
    if (!form.slug || !form.title || !form.type) {
      Alert.alert('Validation', 'Slug, title, and type are required.');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        slug: form.slug,
        title: form.title,
        type: form.type,
        body: form.body || undefined,
        media_url: form.media_url || undefined,
        cta_label: form.cta_label || undefined,
        cta_url: form.cta_url || undefined,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
        page: form.page || undefined,
        variant: form.variant || undefined,
      };
      if (editing) {
        const updated = await api.patch<ContentBlock>(`/content-blocks/${editing.id}`, body);
        setBlocks(prev => prev.map(b => b.id === editing.id ? updated : b));
      } else {
        await api.post('/content-blocks', body);
        await load();
      }
      setShowForm(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  }

  async function deleteBlock(id: string) {
    Alert.alert('Delete Block', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/content-blocks/${id}`);
            setBlocks(prev => prev.filter(b => b.id !== id));
            setShowForm(false);
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Content blocks"
        subtitle="Landing page sections"
        onBack={goBack}
        right={<Button label="New" onPress={openCreate} size="sm" />}
      />

      <FlatList
        data={blocks}
        keyExtractor={b => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.gold} />}
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxl + insets.bottom }]}
        renderItem={({ item }) => (
          <Pressable onPress={() => openEdit(item)} accessibilityRole="button">
            <SurfaceRaised style={styles.blockCard}>
              <View style={styles.blockLeft}>
                <View style={[styles.typeTag, { backgroundColor: Colors.info + '22' }]}>
                  <Text style={[styles.typeText, { color: Colors.info }]}>{item.type}</Text>
                </View>
                {!item.is_active && <View style={styles.inactiveDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.blockSlug}>/{item.slug}</Text>
                {item.page && <Text style={styles.blockPage}>Page: {item.page}</Text>}
              </View>
              <Text style={styles.sortOrder}>#{item.sort_order ?? 0}</Text>
            </SurfaceRaised>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState message="No content blocks yet" icon="albums-outline" />}
      />

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <SheetHandle />
            <Text style={styles.sheetTitle}>{editing ? 'Edit Block' : 'New Content Block'}</Text>
            <Divider style={{ marginVertical: Spacing.md }} />

            <Input label="Slug *" value={form.slug} onChangeText={v => setForm(f => ({ ...f, slug: v }))} placeholder="hero-banner" autoCapitalize="none" />
            <Input label="Title *" value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} placeholder="Block title" />

            <Text style={styles.fieldLabel}>TYPE *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {BLOCK_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setForm(f => ({ ...f, type: t }))}
                  style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, form.type === t && { color: '#0A0A0F' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input label="Body / Content" value={form.body} onChangeText={v => setForm(f => ({ ...f, body: v }))} placeholder="Block content..." multiline numberOfLines={4} />
            <Input label="Media URL" value={form.media_url} onChangeText={v => setForm(f => ({ ...f, media_url: v }))} placeholder="https://..." autoCapitalize="none" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input label="CTA Label" value={form.cta_label} onChangeText={v => setForm(f => ({ ...f, cta_label: v }))} placeholder="Shop Now" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="CTA URL" value={form.cta_url} onChangeText={v => setForm(f => ({ ...f, cta_url: v }))} placeholder="/shop" autoCapitalize="none" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input label="Page" value={form.page} onChangeText={v => setForm(f => ({ ...f, page: v }))} placeholder="home" autoCapitalize="none" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Variant" value={form.variant} onChangeText={v => setForm(f => ({ ...f, variant: v }))} placeholder="dark" autoCapitalize="none" />
              </View>
            </View>
            <Input label="Sort Order" value={form.sort_order} onChangeText={v => setForm(f => ({ ...f, sort_order: v }))} keyboardType="numeric" placeholder="0" />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={form.is_active}
                onValueChange={v => setForm(f => ({ ...f, is_active: v }))}
                trackColor={{ false: Colors.border, true: Colors.gold + '88' }}
                thumbColor={form.is_active ? Colors.gold : Colors.textMuted}
              />
            </View>

            <View style={styles.actions}>
              <Button label={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} style={{ flex: 1 }} />
              {editing && (
                <Button label="Delete" onPress={() => deleteBlock(editing.id)} variant="danger" style={{ flex: 1, marginLeft: 8 }} />
              )}
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
  blockCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, marginBottom: Spacing.sm, gap: 10,
    borderRadius: Radii.lg,
  },
  blockLeft: { alignItems: 'center', gap: 6 },
  typeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  inactiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textMuted },
  blockTitle: { ...Typography.body, color: Colors.text, fontWeight: '600' },
  blockSlug: { ...Typography.caption, color: Colors.textMuted, fontFamily: 'monospace' },
  blockPage: { ...Typography.caption, color: Colors.info, marginTop: 2 },
  sortOrder: { ...Typography.caption, color: Colors.textMuted, fontFamily: 'monospace' },
  sheet: { padding: Spacing.lg, paddingBottom: 48 },
  sheetTitle: { ...Typography.heading, color: Colors.text },
  fieldLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 6 },
  typeChip: {
    backgroundColor: Colors.bgElevated, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeChipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  typeChipText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  switchLabel: { ...Typography.body, color: Colors.text },
  actions: { marginTop: Spacing.md, flexDirection: 'row' },
});
