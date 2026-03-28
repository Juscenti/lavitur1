import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  Modal, ScrollView, RefreshControl, Alert, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import {
  AppHeader, StatusBadge, LoadingState, ErrorState, Button, SheetHandle,
  EmptyState, Card, SelectionChip, SectionHeader,
} from '../../components/ui';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';

interface Message {
  id: string; body: string; sender_name?: string;
  created_at?: string; is_internal_note?: boolean;
}
interface Ticket {
  id: string; subject?: string; status?: string; priority?: string;
  category?: string; created_at?: string; user_email?: string; user_name?: string;
}

const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'];
const PRIORITY_COLORS: Record<string, string> = {
  low: Colors.success,
  medium: Colors.warning,
  high: Colors.danger,
  urgent: '#FF4444',
};

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const skipFilterEffect = useRef(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  async function load(silent?: boolean) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      const q = filterStatus ? `?status=${encodeURIComponent(filterStatus)}` : '';
      const res = await api.get<{ tickets: Ticket[]; summary?: any }>(`/support/tickets${q}`);
      setTickets(res.tickets ?? []);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(false); }, []);

  useEffect(() => {
    if (skipFilterEffect.current) { skipFilterEffect.current = false; return; }
    load(false);
  }, [filterStatus]);

  async function openTicket(ticket: Ticket) {
    setSelected(ticket);
    setMessages([]);
    try {
      const res = await api.get<{ messages: Message[] }>(`/support/tickets/${ticket.id}/messages`);
      setMessages(res.messages ?? []);
    } catch {}
  }

  async function sendReply(isNote: boolean) {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      await api.post(`/support/tickets/${selected.id}/messages`, {
        body: replyText.trim(),
        is_internal_note: isNote,
      });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        body: replyText.trim(),
        sender_name: 'You',
        created_at: new Date().toISOString(),
        is_internal_note: isNote,
      }]);
      setReplyText('');
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSending(false);
  }

  async function updateTicketStatus(ticketId: string, status: string) {
    try {
      await api.patch(`/support/tickets/${ticketId}/status`, { status });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      setSelected(prev => prev ? { ...prev, status } : null);
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'pending').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Support"
        subtitle={`${openCount} open · ${tickets.length} total`}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filtersBar}>
        <SelectionChip label="All" selected={filterStatus === ''} onPress={() => setFilterStatus('')} />
        {TICKET_STATUSES.map(s => (
          <SelectionChip key={s} label={s} selected={filterStatus === s} onPress={() => setFilterStatus(s)} />
        ))}
      </ScrollView>

      <FlatList
        data={tickets}
        keyExtractor={t => t.id}
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={Colors.gold} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState message="No tickets found" icon="chatbubbles-outline" />}
        renderItem={({ item }) => {
          const priorityColor = PRIORITY_COLORS[item.priority?.toLowerCase() || 'low'] || Colors.textSecondary;
          return (
            <View
              style={styles.ticketCard}
            >
              <View style={styles.ticketTop}>
                <Text style={styles.ticketSubject} numberOfLines={1}>{item.subject || 'No subject'}</Text>
                <StatusBadge status={item.status || 'open'} />
              </View>
              <View style={styles.ticketMeta}>
                <View style={styles.ticketMetaItem}>
                  <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.ticketMetaText}>{item.user_name || item.user_email || 'Unknown'}</Text>
                </View>
                <View style={styles.ticketMetaItem}>
                  <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.ticketMetaText}>{fmt(item.created_at)}</Text>
                </View>
                {item.priority && (
                  <View style={[styles.priorityChip, { backgroundColor: `${priorityColor}18`, borderColor: `${priorityColor}40` }]}>
                    <Text style={[styles.priorityText, { color: priorityColor }]}>{item.priority}</Text>
                  </View>
                )}
              </View>
              <Button label="Open ticket" onPress={() => openTicket(item)} variant="ghost" size="sm" icon="chatbubble-outline" style={styles.ticketBtn} />
            </View>
          );
        }}
      />

      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
            <SheetHandle />
            {selected && (
              <>
                <View style={styles.ticketSheetHeader}>
                  <View style={styles.ticketSheetMeta}>
                    <Text style={styles.ticketSheetSubject} numberOfLines={2}>{selected.subject || 'No subject'}</Text>
                    <Text style={styles.ticketSheetUser}>{selected.user_email || selected.user_name || '—'}</Text>
                  </View>
                  <StatusBadge status={selected.status || 'open'} size="md" />
                </View>

                {/* Status chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChips}>
                  {TICKET_STATUSES.map(s => (
                    <SelectionChip key={s} label={s} selected={selected.status === s} onPress={() => updateTicketStatus(selected.id, s)} />
                  ))}
                </ScrollView>

                {/* Messages */}
                <ScrollView style={styles.messagesArea} contentContainerStyle={styles.messagesContent}>
                  {messages.length === 0 && <EmptyState message="No messages yet" icon="chatbubble-outline" />}
                  {messages.map(msg => (
                    <View key={msg.id} style={[styles.bubble, msg.is_internal_note && styles.noteBubble]}>
                      <View style={styles.bubbleHeader}>
                        <Text style={styles.bubbleSender}>{msg.sender_name || 'Support'}</Text>
                        {msg.is_internal_note && (
                          <View style={styles.noteTag}>
                            <Text style={styles.noteTagText}>Note</Text>
                          </View>
                        )}
                        <Text style={styles.bubbleTime}>{fmt(msg.created_at)}</Text>
                      </View>
                      <Text style={styles.bubbleBody}>{msg.body}</Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Reply box */}
                <View style={styles.replyBox}>
                  <TextInput
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder="Write a reply…"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.replyInput}
                    multiline
                    maxLength={2000}
                  />
                  <View style={styles.replyActions}>
                    <Button label="Close" onPress={() => setSelected(null)} variant="secondary" size="sm" />
                    <Button label="Note" onPress={() => sendReply(true)} variant="ghost" size="sm" icon="create-outline" disabled={!replyText.trim() || sending} />
                    <Button label={sending ? '…' : 'Reply'} onPress={() => sendReply(false)} variant="primary" size="sm" icon="send" loading={sending} disabled={!replyText.trim()} />
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  filtersBar: { borderBottomWidth: 1, borderBottomColor: Colors.border, maxHeight: 56 },
  filters: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  list: { padding: Spacing.lg },
  separator: { height: Spacing.sm },

  ticketCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.sm },
  ticketSubject: { ...Typography.body, color: Colors.text, fontWeight: '600', flex: 1 },
  ticketMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md, alignItems: 'center' },
  ticketMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ticketMetaText: { ...Typography.bodySmall, color: Colors.textMuted },
  priorityChip: { borderRadius: Radii.xs, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  priorityText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  ticketBtn: { alignSelf: 'flex-start' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    borderTopWidth: 1,
    borderColor: Colors.border,
    height: '88%',
  },
  ticketSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  ticketSheetMeta: { flex: 1 },
  ticketSheetSubject: { ...Typography.subheading, color: Colors.text },
  ticketSheetUser: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 3 },
  statusChips: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  messagesArea: { flex: 1 },
  messagesContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  bubble: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  noteBubble: { backgroundColor: Colors.warningDim, borderColor: Colors.warningBorder },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 5 },
  bubbleSender: { ...Typography.label, color: Colors.text },
  noteTag: { backgroundColor: Colors.warningDim, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  noteTagText: { fontSize: 9, fontWeight: '700', color: Colors.warning, textTransform: 'uppercase' },
  bubbleTime: { ...Typography.bodySmall, color: Colors.textMuted, marginLeft: 'auto' },
  bubbleBody: { ...Typography.body, color: Colors.textSecondary },
  replyBox: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  replyInput: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    color: Colors.text,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 60,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  replyActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
});
