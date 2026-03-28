import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import {
  AppHeader,
  StatusBadge,
  LoadingState,
  ErrorState,
  Button,
  Input,
  SheetHandle,
  EmptyState,
  Card,
  SelectionChip,
  MetricRow,
  SectionHeader,
} from '../../components/ui';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';

const PRODUCT_STATUSES = ['draft', 'pending', 'published', 'archived'] as const;

interface Product {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  stock?: number;
  status?: string;
  published?: boolean;
  thumbUrl?: string | null;
  image_url?: string;
  category?: string;
  categories?: string[];
}

interface ProductMediaRow {
  id: string;
  file_path: string;
  media_type: string;
  is_primary?: boolean;
  position?: number;
  public_url: string;
}

function productThumbUri(p: Product): string | null {
  const u = (p.thumbUrl || p.image_url || '').trim();
  return u || null;
}

interface ProductForm {
  title: string;
  description: string;
  price: string;
  stock: string;
  categoryName: string;
  sizes: string;
}

const emptyForm: ProductForm = {
  title: '',
  description: '',
  price: '',
  stock: '',
  categoryName: '',
  sizes: '',
};

const FILTER_KEYS = ['', ...PRODUCT_STATUSES] as const;

function SegmentedFilter({
  current,
  onChange,
  counts,
}: {
  current: string;
  onChange: (k: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <View style={segStyles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={segStyles.scrollInner}
        keyboardShouldPersistTaps="handled"
      >
        {FILTER_KEYS.map((key) => {
          const label = key === '' ? 'All' : key;
          const selected = current === key;
          const count = key === '' ? counts.all : counts[key] ?? 0;
          return (
            <Pressable
              key={key || 'all'}
              onPress={() => onChange(key)}
              style={({ pressed }) => [
                segStyles.segment,
                selected && segStyles.segmentSelected,
                pressed && { opacity: 0.88 },
              ]}
              android_ripple={{ color: 'rgba(129,140,248,0.12)' }}
            >
              <Text style={[segStyles.segmentText, selected && segStyles.segmentTextSelected]} numberOfLines={1}>
                {label}
              </Text>
              <Text style={[segStyles.segmentCount, selected && segStyles.segmentCountSelected]}>{count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const segStyles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
    maxHeight: 52,
  },
  scrollInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  segment: {
    flexShrink: 0,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 36,
  },
  segmentSelected: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primaryBorder,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  segmentTextSelected: { color: Colors.primaryLight },
  segmentCount: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  segmentCountSelected: { color: Colors.text },
});

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [productMedia, setProductMedia] = useState<ProductMediaRow[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!showForm || !editing?.id) {
      setProductMedia([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingMedia(true);
      try {
        const list = await api.get<ProductMediaRow[]>(`/products/${editing.id}/media`);
        if (!cancelled) setProductMedia(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setProductMedia([]);
      } finally {
        if (!cancelled) setLoadingMedia(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showForm, editing?.id]);

  function primaryThumbFromMedia(rows: ProductMediaRow[]): string | null {
    const images = rows.filter((m) => m.media_type === 'image');
    const primary = images.find((m) => m.is_primary) || images[0];
    return primary?.public_url?.trim() || null;
  }

  function syncProductThumb(productId: string, rows: ProductMediaRow[]) {
    const thumb = primaryThumbFromMedia(rows);
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, thumbUrl: thumb } : p)));
    setEditing((prev) => (prev && prev.id === productId ? { ...prev, thumbUrl: thumb } : prev));
  }

  async function refreshMedia() {
    if (!editing?.id) return;
    const list = await api.get<ProductMediaRow[]>(`/products/${editing.id}/media`);
    const rows = Array.isArray(list) ? list : [];
    setProductMedia(rows);
    syncProductThumb(editing.id, rows);
  }

  async function pickAndUploadImages() {
    if (!editing?.id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add product images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 10,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploadingMedia(true);
    try {
      const form = new FormData();
      const existingImages = productMedia.filter((m) => m.media_type === 'image');
      form.append('makeFirstImagePrimary', existingImages.length === 0 ? 'true' : 'false');
      for (const asset of result.assets) {
        const uri = asset.uri;
        const name = asset.fileName || `photo-${Date.now()}.jpg`;
        const type = asset.mimeType || 'image/jpeg';
        form.append('files', { uri, name, type } as any);
      }
      await api.upload<ProductMediaRow[]>(`/products/${editing.id}/media`, form);
      await refreshMedia();
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload images');
    }
    setUploadingMedia(false);
  }

  async function setPrimaryMediaRow(mediaId: string) {
    if (!editing?.id) return;
    try {
      await api.patch(`/products/${editing.id}/media/${mediaId}/primary`, {});
      await refreshMedia();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not set primary image');
    }
  }

  function confirmDeleteMedia(row: ProductMediaRow) {
    if (!editing?.id) return;
    Alert.alert('Remove image', 'Delete this file from the product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/products/${editing!.id}/media/${row.id}`);
            await refreshMedia();
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
          }
        },
      },
    ]);
  }

  async function load() {
    try {
      const res = await api.get<Product[]>('/products');
      setProducts(Array.isArray(res) ? res : (res as any).products ?? []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function openEdit(p: Product) {
    const cat =
      p.category && p.category !== 'Unassigned'
        ? p.category
        : (p.categories?.[0] ?? 'Unassigned');
    setEditing(p);
    setForm({
      title: p.title || p.name || '',
      description: p.description || '',
      price: String(p.price ?? ''),
      stock: String(p.stock ?? ''),
      categoryName: (cat === 'Unassigned' ? '' : cat) || '',
      sizes: '',
    });
    setShowForm(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price) || 0,
        stock: parseInt(form.stock, 10) || 0,
        categoryName: form.categoryName.trim() || undefined,
        sizes: form.sizes ? form.sizes.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      };
      if (editing) {
        await api.patch(`/products/${editing.id}`, body);
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...body } : p)));
      } else {
        await api.post<{ id: string }>('/products', body);
        await load();
      }
      setShowForm(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  }

  async function updateStatus(productId: string, status: string) {
    try {
      await api.patch(`/products/${productId}/status`, { status });
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, status } : p)));
      setEditing((p) => (p && p.id === productId ? { ...p, status } : p));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function deleteProduct(productId: string) {
    Alert.alert('Delete product', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/products/${productId}`, { confirm: 'DELETE' });
            setProducts((prev) => prev.filter((p) => p.id !== productId));
            setShowForm(false);
            setEditing(null);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  const filtered = filterStatus ? products.filter((p) => p.status === filterStatus) : products;

  const counts: Record<string, number> = { all: products.length };
  for (const s of PRODUCT_STATUSES) {
    counts[s] = products.filter((p) => p.status === s).length;
  }

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Products"
        subtitle={`${filtered.length} shown`}
        right={<Button label="Add" onPress={openCreate} variant="primary" size="sm" icon="add" />}
      />

      <SegmentedFilter current={filterStatus} onChange={setFilterStatus} counts={counts} />

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
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
        ListEmptyComponent={
          <EmptyState message="No products match" icon="cube-outline" action="Add product" onAction={openCreate} />
        }
        renderItem={({ item }) => {
          const thumb = productThumbUri(item);
          const cat =
            item.category && item.category !== 'Unassigned'
              ? item.category
              : item.categories?.[0] || '—';
          return (
            <Pressable
              onPress={() => openEdit(item)}
              android_ripple={{ color: 'rgba(129,140,248,0.12)' }}
              style={({ pressed }) => [styles.productCard, pressed && Platform.OS === 'ios' && { opacity: 0.92 }]}
            >
              <View
                style={[styles.stripe, { backgroundColor: Colors.statusColors[item.status || 'draft'] || Colors.border }]}
              />
              <View style={styles.thumbWrap}>
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.thumbImage} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Ionicons name="image-outline" size={22} color={Colors.textMuted} />
                  </View>
                )}
              </View>
              <View style={styles.productBody}>
                <View style={styles.productTop}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.title || item.name}
                  </Text>
                  <StatusBadge status={item.status || 'draft'} />
                </View>
                <Text style={styles.metaLine} numberOfLines={1}>
                  <Text style={styles.metaLineStrong}>${Number(item.price ?? 0).toFixed(2)}</Text>
                  <Text style={styles.metaLineMuted}> · </Text>
                  <Text style={styles.metaLineMuted}>{item.stock ?? 0} stock</Text>
                  <Text style={styles.metaLineMuted}> · </Text>
                  <Text style={styles.metaLineMuted}>{cat}</Text>
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={styles.rowChevron} />
            </Pressable>
          );
        }}
      />

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => !saving && setShowForm(false)}
            accessibilityLabel="Dismiss"
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.xl }]}>
            <SheetHandle />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.sheetContent}>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetTitleBlock}>
                    <Text style={styles.sheetTitle}>{editing ? 'Edit product' : 'New product'}</Text>
                    {editing && <StatusBadge status={editing.status || 'draft'} size="md" />}
                  </View>
                  {editing && (
                    <Pressable
                      style={styles.moreBtn}
                      onPress={() =>
                        Alert.alert('Product actions', undefined, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete product',
                            style: 'destructive',
                            onPress: () => deleteProduct(editing.id),
                          },
                        ])
                      }
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="More actions"
                    >
                      <Ionicons name="ellipsis-vertical" size={22} color={Colors.textSecondary} />
                    </Pressable>
                  )}
                </View>

                <Input
                  label="Product title"
                  value={form.title}
                  onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                  placeholder="e.g. Premium T-Shirt"
                  icon="cube-outline"
                />
                <Input
                  label="Description"
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                  placeholder="Product description…"
                  multiline
                  numberOfLines={3}
                  style={{ marginTop: Spacing.md }}
                />
                <View style={styles.formRow}>
                  <Input
                    label="Price ($)"
                    value={form.price}
                    onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                    keyboardType="numeric"
                    placeholder="0.00"
                    style={{ flex: 1 }}
                    icon="pricetag-outline"
                  />
                  <Input
                    label="Stock"
                    value={form.stock}
                    onChangeText={(v) => setForm((f) => ({ ...f, stock: v }))}
                    keyboardType="numeric"
                    placeholder="0"
                    style={{ flex: 1 }}
                    icon="layers-outline"
                  />
                </View>
                <Input
                  label="Category"
                  value={form.categoryName}
                  onChangeText={(v) => setForm((f) => ({ ...f, categoryName: v }))}
                  placeholder="e.g. Apparel"
                  style={{ marginTop: Spacing.md }}
                  icon="folder-outline"
                />
                <Input
                  label="Sizes (comma-separated)"
                  value={form.sizes}
                  onChangeText={(v) => setForm((f) => ({ ...f, sizes: v }))}
                  placeholder="S, M, L, XL"
                  style={{ marginTop: Spacing.md }}
                  icon="resize-outline"
                />

                {editing ? (
                  <>
                    <SectionHeader title="Images" />
                    <Text style={styles.imagesHint}>Primary image is used as the product thumbnail in lists and shop.</Text>
                    {loadingMedia ? (
                      <View style={styles.mediaLoading}>
                        <ActivityIndicator color={Colors.primaryLight} />
                        <Text style={styles.mediaLoadingText}>Loading images…</Text>
                      </View>
                    ) : productMedia.length === 0 ? (
                      <Text style={styles.imagesEmpty}>No images yet — add photos below.</Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.mediaRow}
                      >
                        {productMedia.map((m) => (
                          <View key={m.id} style={styles.mediaTile}>
                            <View style={styles.mediaImageFrame}>
                              {m.media_type === 'image' ? (
                                <Image source={{ uri: m.public_url }} style={styles.mediaImage} resizeMode="cover" />
                              ) : (
                                <View style={[styles.mediaImage, styles.mediaVideoPh]}>
                                  <Ionicons name="videocam" size={28} color={Colors.textMuted} />
                                </View>
                              )}
                              {m.is_primary ? (
                                <View style={styles.primaryBadge}>
                                  <Text style={styles.primaryBadgeText}>Primary</Text>
                                </View>
                              ) : null}
                            </View>
                            <View style={styles.mediaTileActions}>
                              {m.media_type === 'image' && !m.is_primary ? (
                                <Pressable
                                  onPress={() => setPrimaryMediaRow(m.id)}
                                  style={styles.mediaIconBtn}
                                  hitSlop={6}
                                  accessibilityRole="button"
                                  accessibilityLabel="Set as primary image"
                                >
                                  <Ionicons name="star-outline" size={20} color={Colors.warning} />
                                </Pressable>
                              ) : (
                                <View style={styles.mediaIconSpacer} />
                              )}
                              <Pressable
                                onPress={() => confirmDeleteMedia(m)}
                                style={styles.mediaIconBtn}
                                hitSlop={6}
                                accessibilityRole="button"
                                accessibilityLabel="Delete media"
                              >
                                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                    <Button
                      label={uploadingMedia ? 'Uploading…' : 'Add images'}
                      onPress={pickAndUploadImages}
                      variant="secondary"
                      icon="images-outline"
                      disabled={uploadingMedia || saving}
                      style={{ marginTop: Spacing.sm }}
                    />
                  </>
                ) : (
                  <Text style={styles.imagesHintNew}>Save the product first, then reopen it to upload images.</Text>
                )}

                {editing && (
                  <>
                    <SectionHeader title="Status" />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChips}>
                      {PRODUCT_STATUSES.map((s) => (
                        <SelectionChip
                          key={s}
                          label={s}
                          selected={editing.status === s}
                          onPress={() => {
                            updateStatus(editing.id, s);
                            setEditing((p) => (p ? { ...p, status: s } : p));
                          }}
                        />
                      ))}
                    </ScrollView>
                  </>
                )}

                <View style={styles.formActions}>
                  <Button label="Cancel" onPress={() => setShowForm(false)} variant="secondary" style={{ flex: 1 }} />
                  <Button
                    label={saving ? 'Saving…' : 'Save'}
                    onPress={save}
                    variant="primary"
                    loading={saving}
                    style={{ flex: 1 }}
                  />
                </View>
                {editing && (
                  <Button
                    label="Delete product"
                    onPress={() => deleteProduct(editing.id)}
                    variant="danger"
                    icon="trash-outline"
                    style={{ marginTop: Spacing.sm }}
                  />
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: Spacing.lg },
  separator: { height: Spacing.sm },

  productCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 56,
  },
  stripe: { width: 3, alignSelf: 'stretch' },
  thumbWrap: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
    overflow: 'hidden',
    marginLeft: Spacing.sm,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  productBody: { flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, minWidth: 0 },
  productTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  productName: { ...Typography.body, color: Colors.text, fontWeight: '600', fontSize: 15, flex: 1 },
  metaLine: { fontSize: 12, lineHeight: 16 },
  metaLineStrong: { fontWeight: '700', color: Colors.primaryLight },
  metaLineMuted: { color: Colors.textSecondary, fontWeight: '500' },
  rowChevron: { marginRight: Spacing.sm },

  imagesHint: { ...Typography.caption, color: Colors.textMuted, lineHeight: 18 },
  imagesHintNew: { ...Typography.caption, color: Colors.textSecondary, fontStyle: 'italic', marginTop: Spacing.xs },
  imagesEmpty: { ...Typography.bodySmall, color: Colors.textMuted },
  mediaLoading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  mediaLoadingText: { ...Typography.bodySmall, color: Colors.textSecondary },
  mediaRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs },
  mediaTile: { width: 108 },
  mediaImageFrame: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElevated,
    position: 'relative',
  },
  mediaImage: { width: '100%', aspectRatio: 1 },
  mediaVideoPh: { alignItems: 'center', justifyContent: 'center' },
  primaryBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.xs,
  },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.text },
  mediaTileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  mediaIconBtn: { padding: 4 },
  mediaIconSpacer: { width: 28 },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    borderTopWidth: 1,
    borderColor: Colors.border,
    maxHeight: '92%',
  },
  sheetContent: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  sheetTitleBlock: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  sheetTitle: { ...Typography.subheading, color: Colors.text, flexShrink: 1 },
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  statusChips: { paddingBottom: Spacing.md, flexDirection: 'row', gap: Spacing.xs },
  formActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
});
