import React, { useState } from 'react';
import type { ComponentProps } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// ─── Screen wrapper ─────────────────────────────────────────────────────────
export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

// ─── App header ─────────────────────────────────────────────────────────────
export function AppHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={headerStyles.wrap}>
      <View style={headerStyles.row}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={headerStyles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <View style={headerStyles.backCircle}>
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        ) : null}
        <View style={[headerStyles.titles, !onBack && headerStyles.titlesFlush]}>
          <Text style={headerStyles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={headerStyles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View style={headerStyles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: { marginRight: Spacing.sm },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, minWidth: 0 },
  titlesFlush: { marginLeft: 0 },
  title: { ...Typography.heading, color: Colors.text, letterSpacing: -0.3 },
  subtitle: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  right: { marginLeft: Spacing.sm, justifyContent: 'center', maxWidth: '42%' },
});

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
  accent,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accent?: string;
}) {
  const inner = (
    <View style={[cardStyles.card, accent && { borderLeftColor: accent, borderLeftWidth: 3 }, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.card,
  },
});

// ─── shadcn dashboard-01–style page chrome ───────────────────────────────────
export function DashboardPageHeader({
  title,
  breadcrumb,
  right,
}: {
  title: string;
  breadcrumb?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={dashHeaderStyles.wrap}>
      <View style={dashHeaderStyles.left}>
        {breadcrumb ? (
          <Text style={dashHeaderStyles.crumb} numberOfLines={1}>
            {breadcrumb}
          </Text>
        ) : null}
        <Text style={dashHeaderStyles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ? <View style={dashHeaderStyles.right}>{right}</View> : null}
    </View>
  );
}

const dashHeaderStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  left: { flex: 1, minWidth: 0 },
  crumb: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'none',
    letterSpacing: 0.2,
    fontSize: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.35,
    color: Colors.text,
  },
  right: { flexShrink: 0 },
});

/** SectionCards from dashboard-01: title, value, optional badge, footer + muted line */
export function DashboardMetricCard({
  title,
  value,
  badge,
  badgePositive,
  footer,
  footerMuted,
  onPress,
}: {
  title: string;
  value: string;
  badge?: string;
  badgePositive?: boolean;
  footer: string;
  footerMuted?: string;
  onPress?: () => void;
}) {
  const inner = (
    <View style={metricTileStyles.card}>
      <View style={metricTileStyles.topRow}>
        <Text style={metricTileStyles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
        {badge ? (
          <View
            style={[
              metricTileStyles.badge,
              badgePositive === true && metricTileStyles.badgeUp,
              badgePositive === false && metricTileStyles.badgeDown,
              badgePositive === undefined && metricTileStyles.badgeNeutral,
            ]}
          >
            <Text style={metricTileStyles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={metricTileStyles.value}>{value}</Text>
      <View style={metricTileStyles.footerRow}>
        <Ionicons
          name={
            badgePositive === false
              ? 'trending-down'
              : badgePositive === true
                ? 'trending-up'
                : 'analytics-outline'
          }
          size={14}
          color={
            badgePositive === false
              ? Colors.danger
              : badgePositive === true
                ? Colors.success
                : Colors.textMuted
          }
        />
        <Text style={metricTileStyles.footerText} numberOfLines={2}>
          {footer}
        </Text>
      </View>
      {footerMuted ? (
        <Text style={metricTileStyles.footerMuted} numberOfLines={2}>
          {footerMuted}
        </Text>
      ) : null}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const metricTileStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    minHeight: 132,
    ...Shadows.soft,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  badgeUp: {
    backgroundColor: Colors.successDim,
    borderColor: Colors.successBorder,
  },
  badgeDown: {
    backgroundColor: Colors.dangerDim,
    borderColor: Colors.dangerBorder,
  },
  badgeNeutral: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.borderLight,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: Colors.text },
  value: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { flex: 1, fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  footerMuted: { fontSize: 11, color: Colors.textMuted, marginTop: 6, lineHeight: 15 },
});

/**
 * Chart CTA card. Pass `sparklineValues` from your `/dashboard` API when it includes a numeric series;
 * otherwise no fake bars are shown (only copy + navigation).
 */
export function DashboardChartCard({
  title,
  description,
  onPress,
  sparklineValues,
}: {
  title: string;
  description: string;
  onPress?: () => void;
  /** Normalized heights are derived from these (e.g. last 14 daily revenue numbers). */
  sparklineValues?: number[];
}) {
  let barHeights: number[] | null = null;
  if (sparklineValues && sparklineValues.length > 0) {
    const nums = sparklineValues.map((n) => Math.max(0, Number(n)));
    const max = Math.max(...nums, 1);
    barHeights = nums.slice(-14).map((v) => v / max);
  }

  const inner = (
    <View style={chartCardStyles.card}>
      <View style={chartCardStyles.header}>
        <View style={chartCardStyles.headerText}>
          <Text style={chartCardStyles.cardTitle}>{title}</Text>
          <Text style={chartCardStyles.desc}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>
      {barHeights ? (
        <View style={chartCardStyles.chart}>
          {barHeights.map((h, i) => (
            <View key={i} style={chartCardStyles.barTrack}>
              <View style={[chartCardStyles.barFill, { height: `${Math.round(h * 100)}%` }]} />
            </View>
          ))}
        </View>
      ) : (
        <View style={chartCardStyles.emptyPreview}>
          <Text style={chartCardStyles.emptyPreviewText}>
            No chart series in the dashboard payload — open Analytics for full charts.
          </Text>
        </View>
      )}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const chartCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.soft,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.lg },
  headerText: { flex: 1, paddingRight: Spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, letterSpacing: -0.2 },
  desc: { fontSize: 13, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    height: 88,
    paddingTop: Spacing.sm,
  },
  barTrack: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: Colors.bgElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    minHeight: 6,
    backgroundColor: Colors.primary,
    opacity: 0.85,
    borderRadius: 4,
  },
  emptyPreview: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyPreviewText: { ...Typography.bodySmall, color: Colors.textMuted, lineHeight: 18 },
});

// ─── Stat card — redesigned ──────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  color,
  icon,
  trend,
  trendUp,
  sub,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: IoniconName;
  trend?: string;
  trendUp?: boolean;
  sub?: string;
}) {
  const c = color || Colors.text;
  return (
    <View style={statStyles.card}>
      <View style={statStyles.top}>
        {icon && (
          <View style={[statStyles.iconWrap, { backgroundColor: `${c}18` }]}>
            <Ionicons name={icon} size={18} color={c} />
          </View>
        )}
        <Text style={statStyles.label}>{label}</Text>
      </View>
      <Text style={[statStyles.value, { color: c }]}>{value}</Text>
      {sub && <Text style={statStyles.sub}>{sub}</Text>}
      {trend && (
        <View style={statStyles.trendRow}>
          <Ionicons
            name={trendUp ? 'arrow-up' : 'arrow-down'}
            size={11}
            color={trendUp ? Colors.success : Colors.danger}
          />
          <Text style={[statStyles.trend, { color: trendUp ? Colors.success : Colors.danger }]}>
            {trend}
          </Text>
        </View>
      )}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 108,
    justifyContent: 'space-between',
    ...Shadows.soft,
  },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs, gap: Spacing.sm },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  value: { ...Typography.number, fontSize: 26, color: Colors.text, marginBottom: 0 },
  sub: { ...Typography.bodySmall, color: Colors.textSecondary },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  trend: { ...Typography.label, fontSize: 11 },
});

// ─── Loading state ────────────────────────────────────────────────────────────
export function LoadingState({
  message = 'Loading…',
  fullScreen,
}: {
  message?: string;
  fullScreen?: boolean;
}) {
  return (
    <View style={[loadStyles.wrap, fullScreen && loadStyles.fullScreen]}>
      <View style={loadStyles.inner}>
        <ActivityIndicator color={Colors.primary} size="small" />
        <Text style={loadStyles.msg}>{message}</Text>
      </View>
    </View>
  );
}

const loadStyles = StyleSheet.create({
  wrap: { padding: Spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  fullScreen: { flex: 1, backgroundColor: Colors.bg },
  inner: { alignItems: 'center', gap: Spacing.md },
  msg: { ...Typography.bodySmall, color: Colors.textSecondary },
});

// ─── Error state ──────────────────────────────────────────────────────────────
export function ErrorState({
  message,
  onRetry,
  fullScreen,
}: {
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}) {
  return (
    <View style={[errStyles.wrap, fullScreen && errStyles.fullScreen]}>
      <View style={errStyles.iconWrap}>
        <Ionicons name="alert-circle" size={28} color={Colors.danger} />
      </View>
      <Text style={errStyles.title}>Something went wrong</Text>
      <Text style={errStyles.msg}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={errStyles.btn}>
          <Text style={errStyles.btnText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

const errStyles = StyleSheet.create({
  wrap: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  fullScreen: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center' },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dangerDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.subheading, color: Colors.text },
  msg: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center', maxWidth: 260 },
  btn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: Spacing.sm,
  },
  btnText: { ...Typography.label, color: Colors.text },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({
  message,
  icon,
  action,
  onAction,
}: {
  message: string;
  icon?: IoniconName;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={emptyStyles.wrap}>
      {icon && (
        <View style={emptyStyles.iconWrap}>
          <Ionicons name={icon} size={24} color={Colors.textMuted} />
        </View>
      )}
      <Text style={emptyStyles.msg}>{message}</Text>
      {action && onAction && (
        <Pressable onPress={onAction} style={emptyStyles.btn}>
          <Text style={emptyStyles.btnText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { paddingVertical: Spacing.xxxl, alignItems: 'center', gap: Spacing.md },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  msg: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  btn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    marginTop: Spacing.xs,
  },
  btnText: { ...Typography.label, color: Colors.primaryLight },
});

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  size = 'md',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  loading?: boolean;
  disabled?: boolean;
  icon?: IoniconName;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}) {
  const variantStyles = {
    primary: { bg: Colors.primary, border: Colors.primaryLight, text: Colors.textOnPrimary },
    secondary: { bg: Colors.bgElevated, border: Colors.borderLight, text: Colors.text },
    ghost: { bg: 'transparent', border: Colors.border, text: Colors.textSecondary },
    danger: { bg: Colors.dangerDim, border: Colors.dangerBorder, text: Colors.danger },
    success: { bg: Colors.successDim, border: Colors.successBorder, text: Colors.success },
  };
  const vs = variantStyles[variant];
  const heights = { sm: 40, md: 46, lg: 52 };
  const fontSizes = { sm: 12, md: 14, lg: 15 };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        btnStyles.base,
        { backgroundColor: vs.bg, borderColor: vs.border, height: heights[size], opacity: pressed ? 0.82 : 1 },
        (disabled || loading) && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} size="small" />
      ) : (
        <View style={btnStyles.inner}>
          {icon && <Ionicons name={icon} size={16} color={vs.text} />}
          <Text style={[btnStyles.label, { color: vs.text, fontSize: fontSizes[size] }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const btnStyles = StyleSheet.create({
  base: {
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    minWidth: 44,
    ...Shadows.soft,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { fontWeight: '600', letterSpacing: 0.1 },
});

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  numberOfLines,
  keyboardType,
  autoCapitalize,
  style,
  error,
  icon,
  editable = true,
}: {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: any;
  autoCapitalize?: any;
  style?: StyleProp<ViewStyle>;
  error?: string;
  icon?: IoniconName;
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[inputStyles.wrap, style]}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      <View
        style={[
          inputStyles.field,
          focused && inputStyles.fieldFocused,
          !!error && inputStyles.fieldError,
          !editable && inputStyles.fieldDisabled,
        ]}
      >
        {icon && (
          <Ionicons name={icon} size={16} color={focused ? Colors.primary : Colors.textMuted} style={inputStyles.icon} />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize || 'none'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          style={[
            inputStyles.input,
            multiline && { height: (numberOfLines || 3) * 22, textAlignVertical: 'top', paddingTop: Spacing.sm },
          ]}
        />
      </View>
      {error && <Text style={inputStyles.error}>{error}</Text>}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  label: { ...Typography.label, color: Colors.textSecondary },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  fieldFocused: { borderColor: Colors.primary, backgroundColor: Colors.bgElevated },
  fieldError: { borderColor: Colors.danger },
  fieldDisabled: { opacity: 0.5 },
  icon: { marginRight: Spacing.sm },
  input: { flex: 1, color: Colors.text, fontSize: 14, paddingVertical: Spacing.sm },
  error: { ...Typography.bodySmall, color: Colors.danger, fontSize: 12 },
});

// ─── Status badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const color = Colors.statusColors[status?.toLowerCase()] || Colors.textSecondary;
  return (
    <View style={[badgeStyles.base, size === 'md' && badgeStyles.baseMd, { backgroundColor: `${color}1A`, borderColor: `${color}40` }]}>
      <View style={[badgeStyles.dot, { backgroundColor: color }]} />
      <Text style={[badgeStyles.label, { color }, size === 'md' && { fontSize: 13 }]}>
        {status?.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  baseMd: { paddingHorizontal: 12, paddingVertical: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  label: { ...Typography.label, fontSize: 11 },
});

// ─── Selection chip ───────────────────────────────────────────────────────────
export function SelectionChip({
  label,
  selected,
  onPress,
  disabled,
  capitalize = true,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** When false, label is shown as-is (e.g. "Staff users"). */
  capitalize?: boolean;
}) {
  const display = label.replace(/_/g, ' ');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        chipStyles.base,
        selected ? chipStyles.selected : chipStyles.idle,
        pressed && !disabled && { opacity: 0.82 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text
        style={[
          chipStyles.label,
          selected && chipStyles.labelSelected,
          !capitalize && { textTransform: 'none' },
        ]}
        numberOfLines={1}
      >
        {capitalize ? display : label}
      </Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  base: {
    borderRadius: Radii.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: Spacing.sm,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  idle: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.borderLight,
  },
  selected: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primaryBorder,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  labelSelected: { color: Colors.primaryLight },
});

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[divStyles.line, style]} />;
}

const divStyles = StyleSheet.create({
  line: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
});

// ─── Brand accent line (legacy name: GoldLine) ───────────────────────────────
export function GoldLine({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[goldLineStyles.line, style]} />;
}

const goldLineStyles = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: Colors.primaryBorder,
    marginVertical: Spacing.md,
  },
});

// ─── Sheet handle ─────────────────────────────────────────────────────────────
export function SheetHandle() {
  return (
    <View style={handleStyles.wrap}>
      <View style={handleStyles.bar} />
    </View>
  );
}

const handleStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  bar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
  },
});

// ─── Surface raised ───────────────────────────────────────────────────────────
export function SurfaceRaised({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[surfaceStyles.base, style]}>{children}</View>;
}

const surfaceStyles = StyleSheet.create({
  base: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    ...Shadows.soft,
  },
});

// ─── Tag pill ─────────────────────────────────────────────────────────────────
export function Tag({ label, color }: { label: string; color?: string }) {
  const c = color || Colors.textSecondary;
  return (
    <View style={[tagStyles.base, { backgroundColor: `${c}18`, borderColor: `${c}30` }]}>
      <Text style={[tagStyles.label, { color: c }]}>{label}</Text>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  base: {
    borderRadius: Radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});

// ─── Row item (list rows) ─────────────────────────────────────────────────────
export function RowItem({
  onPress,
  children,
  isLast,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  const inner = (
    <View style={[rowStyles.base, !isLast && rowStyles.border]}>
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const rowStyles = StyleSheet.create({
  base: { paddingVertical: 13, paddingHorizontal: Spacing.lg },
  border: { borderBottomWidth: 1, borderBottomColor: Colors.border },
});

// ─── Section header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={secStyles.wrap}>
      <Text style={secStyles.title}>{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text style={secStyles.action}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  title: { ...Typography.caption, color: Colors.textSecondary },
  action: { ...Typography.label, color: Colors.primaryLight, fontSize: 12 },
});

// ─── Metric row (key/value in cards) ─────────────────────────────────────────
export function MetricRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={metricStyles.row}>
      <Text style={metricStyles.label}>{label}</Text>
      <Text style={[metricStyles.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { ...Typography.bodySmall, color: Colors.textSecondary, textTransform: 'capitalize' },
  value: { ...Typography.label, color: Colors.text, fontSize: 13 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
});
