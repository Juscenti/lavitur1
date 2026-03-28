import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { Colors, Spacing, Typography, Radii } from '../constants/theme';

export default function LoginScreen() {
  const { signIn, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const params = useLocalSearchParams<{ reason?: string }>();

  useEffect(() => {
    const reason = params?.reason?.toString();
    if (!reason) return;
    if (reason === 'not_authorized') {
      setError('Access restricted. Your account is not an admin or representative.');
    } else if (reason === 'role_missing') {
      setError('Profile role is missing. Contact your administrator.');
    }
  }, [params]);

  async function handleLogin() {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand mark */}
          <View style={styles.brand}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Text style={styles.logoLetter}>L</Text>
              </View>
            </View>
            <Text style={styles.brandName}>LAVITÚR</Text>
            <Text style={styles.brandSub}>Admin Console</Text>
          </View>

          {/* Divider with label */}
          <View style={styles.divRow}>
            <View style={styles.divLine} />
            <Text style={styles.divLabel}>SIGN IN</Text>
            <View style={styles.divLine} />
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
            />

            <View style={styles.passWrap}>
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPass}
                icon="lock-closed-outline"
                style={{ flex: 1 }}
              />
              <Pressable
                onPress={() => setShowPass(v => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>

            <Button
              label={isSubmitting ? 'Signing in…' : 'Sign in'}
              onPress={handleLogin}
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting || authLoading}
              size="lg"
              style={styles.submitBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.footerText}>Restricted access · Admins & Representatives only</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    justifyContent: 'center',
  },

  brand: { alignItems: 'center', marginBottom: Spacing.xxl },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.bgCard,
  },
  logoInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.goldMuted,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { fontFamily: 'serif', fontSize: 28, fontWeight: '700', color: Colors.gold },
  brandName: {
    ...Typography.heading,
    color: Colors.text,
    letterSpacing: 5,
    fontSize: 22,
    marginBottom: Spacing.xs,
  },
  brandSub: { ...Typography.caption, color: Colors.textMuted },

  divRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  divLabel: { ...Typography.caption, color: Colors.textMuted, fontSize: 10 },

  formCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerDim,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    padding: Spacing.md,
  },
  errorText: { ...Typography.bodySmall, color: Colors.danger, flex: 1 },

  passWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute',
    right: Spacing.md,
    bottom: 12,
  },

  submitBtn: { marginTop: Spacing.xs },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.xl,
  },
  footerText: { ...Typography.bodySmall, color: Colors.textMuted, textAlign: 'center' },
});
