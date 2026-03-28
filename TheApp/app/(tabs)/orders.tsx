import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  Modal, ScrollView, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import {
  AppHeader, StatusBadge, LoadingState, ErrorState, Button, SheetHandle,
  EmptyState, Card, SelectionChip, MetricRow, SectionHeader,
} from '../../components/ui';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const ORDER_STATUSES = ['pending_payment','paid','processing','shipped','delivered','cancelled','refunded'];

interface OrderItem {
  id: string;
  product_title?: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  line_total?: number;
}
interface Order {
  id: string; status: string; total?: number; created_at?: string;
  customer_email?: string; customer_name?: string;
  order_items?: OrderItem[];
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get<Order[]>('/orders');
      setOrders(Array.isArray(res) ? res : (res as any).orders ?? []);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function openDetail(order: Order) {
    setDetailLoading(true);
    setSelected(order);
    try {
      const res = await api.get<Order>(`/orders/${order.id}`);
      setSelected(res);
    } catch {}
    setDetailLoading(false);
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdating(true);
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      setSelected(prev => prev ? { ...prev, status } : null);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setUpdating(false);
  }

  async function deleteOrder(orderId: string) {
    Alert.alert('Delete Order', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/orders/${orderId}`, { confirm: 'DELETE' });
            setOrders(prev => prev.filter(o => o.id !== orderId));
            setSelected(null);
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }

  function fmt(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  }

  function fmtCurrency(n?: number) {
    if (n == null) return '—';
    return `$${Number(n).toFixed(2)}`;
  }

  const filtered = filterStatus ? orders.filter(o => o.status === filterStatus) : orders;

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Orders"
        subtitle={`${filtered.length} ${filterStatus || 'total'}`}
      />

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filtersBar}
      >
        <SelectionChip label="All" selected={filterStatus === ''} onPress={() => setFilterStatus('')} />
        {ORDER_STATUSES.map(s => (
          <SelectionChip key={s} label={s} selected={filterStatus === s} onPress={() => setFilterStatus(s)} />
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={o => o.id}
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.gold} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState message="No orders found" icon="receipt-outline" />}
        renderItem={({ item }) => (
          <View
            style={styles.orderCard}
          >
            <View style={styles.orderTop}>
              <View style={styles.orderMeta}>
                <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.orderTotal}>{fmtCurrency(item.total)}</Text>
            </View>
            <View style={styles.orderInfo}>
              <View style={styles.orderInfoRow}>
                <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.orderInfoText} numberOfLines={1}>
                  {item.customer_name || item.customer_email || 'Unknown customer'}
                </Text>
              </View>
              <View style={styles.orderInfoRow}>
                <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.orderInfoText}>{fmt(item.created_at)}</Text>
              </View>
            </View>
            <View style={styles.orderActions}>
              <Button
                label="View details"
                onPress={() => openDetail(item)}
                variant="ghost"
                size="sm"
                icon="eye-outline"
              />
            </View>
          </View>
        )}
      />

      {/* Detail sheet */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.xl }]}>
            <SheetHandle />
            <ScrollView showsVerticalScrollIndicator={false}>
              {detailLoading ? (
                <LoadingState message="Loading order…" />
              ) : selected ? (
                <View style={styles.sheetContent}>
                  {/* Sheet header */}
                  <View style={styles.sheetHeader}>
                    <View>
                      <Text style={styles.sheetId}>Order #{selected.id.slice(0, 8).toUpperCase()}</Text>
                      <Text style={styles.sheetDate}>{fmt(selected.created_at)}</Text>
                    </View>
                    <StatusBadge status={selected.status} size="md" />
                  </View>

                  {/* Customer info */}
                  <SectionHeader title="Customer" />
                  <Card style={styles.infoCard}>
                    <MetricRow label="Name" value={selected.customer_name || '—'} />
                    <MetricRow label="Email" value={selected.customer_email || '—'} />
                    <MetricRow label="Total" value={fmtCurrency(selected.total)} valueColor={Colors.gold} />
                  </Card>

                  {/* Order items */}
                  {selected.order_items && selected.order_items.length > 0 && (
                    <>
                      <SectionHeader title={`Items (${selected.order_items.length})`} />
                      <Card style={styles.infoCard}>
                        {selected.order_items.map((item, idx) => (
                          <View key={item.id} style={[styles.lineItem, idx === (selected.order_items!.length - 1) && { borderBottomWidth: 0 }]}>
                            <View style={styles.lineItemLeft}>
                              <Text style={styles.lineItemName} numberOfLines={1}>
                                {item.product_title || item.product_name || 'Product'}
                              </Text>
                              <Text style={styles.lineItemQty}>×{item.quantity ?? 1}</Text>
                            </View>
                            <Text style={styles.lineItemPrice}>{fmtCurrency(item.line_total ?? item.unit_price)}</Text>
                          </View>
                        ))}
                      </Card>
                    </>
                  )}

                  {/* Update status */}
                  <SectionHeader title="Update Status" />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChips}>
                    {ORDER_STATUSES.map(s => (
                      <SelectionChip
                        key={s}
                        label={s}
                        selected={selected.status === s}
                        onPress={() => updateStatus(selected.id, s)}
                        disabled={updating}
                      />
                    ))}
                  </ScrollView>

                  {/* Actions */}
                  <View style={styles.sheetActions}>
                    <Button label="Close" onPress={() => setSelected(null)} variant="secondary" style={styles.actionBtn} />
                    <Button
                      label="Delete Order"
                      onPress={() => deleteOrder(selected.id)}
                      variant="danger"
                      icon="trash-outline"
                      style={styles.actionBtn}
                    />
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  filtersBar: { borderBottomWidth: 1, borderBottomColor: Colors.border, maxHeight: 56 },
  filters: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 0 },
  list: { padding: Spacing.lg, gap: 0 },
  separator: { height: Spacing.sm },

  orderCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  orderMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  orderId: { ...Typography.label, color: Colors.text, fontFamily: 'monospace' },
  orderTotal: { ...Typography.subheading, color: Colors.gold },
  orderInfo: { gap: 5, marginBottom: Spacing.md },
  orderInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderInfoText: { ...Typography.bodySmall, color: Colors.textSecondary, flex: 1 },
  orderActions: { flexDirection: 'row', justifyContent: 'flex-end' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    borderTopWidth: 1,
    borderColor: Colors.border,
    maxHeight: '88%',
  },
  sheetContent: { paddingHorizontal: Spacing.lg },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  sheetId: { ...Typography.subheading, color: Colors.text, fontFamily: 'monospace' },
  sheetDate: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 4 },
  infoCard: { marginBottom: Spacing.lg, padding: 0, paddingHorizontal: Spacing.lg },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lineItemLeft: { flex: 1, gap: 2 },
  lineItemName: { ...Typography.body, color: Colors.text, fontWeight: '500' },
  lineItemQty: { ...Typography.caption, color: Colors.textMuted },
  lineItemPrice: { ...Typography.label, color: Colors.gold },
  statusChips: { paddingBottom: Spacing.lg, gap: 0 },
  sheetActions: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.lg },
  actionBtn: { flex: 1 },
});
