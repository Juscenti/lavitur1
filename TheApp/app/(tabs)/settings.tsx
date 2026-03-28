import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Alert, Switch, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSmartToolBack } from '../../hooks/useSmartToolBack';
import { api } from '../../lib/api';
import { AppHeader, Card, LoadingState, ErrorState, Button, SectionHeader } from '../../components/ui';
import { Colors, Spacing, Typography, Radii } from '../../constants/theme';

type SettingsData = Record<string, Record<string, any>>;

export default function SettingsScreen() {
  const goBack = useSmartToolBack();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<SettingsData>({});
  const [draft, setDraft] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get<SettingsData>('/settings');
      setSettings(res);
      setDraft(JSON.parse(JSON.stringify(res)));
      setDirty(false);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }

  function updateDraft(section: string, key: string, value: any) {
    setDraft(prev => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [key]: value },
    }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch('/settings', draft);
      setSettings(JSON.parse(JSON.stringify(draft)));
      setDirty(false);
      Alert.alert('Saved', 'Settings updated successfully.');
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  }

  function renderValue(section: string, key: string, value: any) {
    if (typeof value === 'boolean') {
      return (
        <Switch
          value={draft[section]?.[key] ?? value}
          onValueChange={v => updateDraft(section, key, v)}
          trackColor={{ false: Colors.border, true: Colors.goldDim }}
          thumbColor={draft[section]?.[key] ? Colors.gold : Colors.textMuted}
        />
      );
    }
    if (typeof value === 'number') {
      return (
        <TextInput
          value={String(draft[section]?.[key] ?? value)}
          onChangeText={v => updateDraft(section, key, isNaN(Number(v)) ? v : Number(v))}
          keyboardType="numeric"
          style={styles.inlineInput}
          placeholderTextColor={Colors.textMuted}
        />
      );
    }
    return (
      <TextInput
        value={String(draft[section]?.[key] ?? value ?? '')}
        onChangeText={v => updateDraft(section, key, v)}
        style={[styles.inlineInput, { maxWidth: 180 }]}
        placeholderTextColor={Colors.textMuted}
      />
    );
  }

  if (loading) return <LoadingState fullScreen />;
  if (error) return <ErrorState fullScreen message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Settings"
        subtitle="Store configuration"
        onBack={goBack}
        right={
          dirty ? (
            <Button
              label={saving ? '…' : 'Save'}
              onPress={save}
              variant="primary"
              size="sm"
              loading={saving}
            />
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(draft).map(([section, values]) => (
          <View key={section} style={styles.section}>
            <SectionHeader title={section.replace(/_/g, ' ')} />
            <View style={styles.group}>
              {Object.entries(values).map(([key, value], idx, arr) => (
                <View key={key} style={[styles.row, idx === arr.length - 1 && styles.rowLast]}>
                  <Text style={styles.rowKey}>{key.replace(/_/g, ' ')}</Text>
                  {renderValue(section, key, value)}
                </View>
              ))}
            </View>
          </View>
        ))}

        {dirty && (
          <Button
            label={saving ? 'Saving…' : 'Save all changes'}
            onPress={save}
            variant="primary"
            loading={saving}
            style={styles.saveBtn}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  group: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  rowLast: { borderBottomWidth: 0 },
  rowKey: { ...Typography.body, color: Colors.text, fontWeight: '500', textTransform: 'capitalize', flex: 1 },
  inlineInput: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: 13,
    minWidth: 80,
    textAlign: 'right',
  },
  saveBtn: { marginTop: Spacing.md },
});
