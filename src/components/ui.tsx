import { BookOpen, Check, ChevronLeft, ChevronRight, Globe2, WifiOff } from 'lucide-react-native';
import { type Href, usePathname, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type ViewStyle,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Habitability } from '@/domain/evaluation';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, layout, shadows } from '@/theme';
import { APP_VERSION } from '@/version';

export function AppShell({ children, scroll = true }: React.PropsWithChildren<{ scroll?: boolean }>) {
  const content = (
    <View style={styles.shellContent}>
      {children}
      <SupportStrip />
    </View>
  );
  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader />
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

export function AppHeader() {
  const { t, language, setLanguage } = useI18n();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const compact = width < 640;
  const iconOnly = width < 420;
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.appName}
        onPress={() => router.replace('/')}
        style={styles.brand}
      >
        <Image source={require('../../icon_960.png')} style={[styles.logo, compact && styles.logoCompact]} />
        <View style={styles.brandCopy}>
          <Text numberOfLines={1} style={[styles.brandTitle, compact && styles.brandTitleCompact]}>
            {t.appName}
          </Text>
          {width > 560 && <Text style={styles.brandSubtitle}>{t.tagline}</Text>}
        </View>
      </Pressable>
      <View style={[styles.headerActions, compact && styles.headerActionsCompact]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.guide}
          onPress={() => {
            if (pathname !== '/guide') router.push('/guide' as Href);
          }}
          style={[styles.guideButton, compact && styles.headerChipCompact]}
        >
          <BookOpen size={compact ? 16 : 17} color={colors.primary} />
          {width > 560 && <Text style={styles.languageText}>{t.guide}</Text>}
        </Pressable>
        <View
          accessibilityLabel={`EVALQUAKE ${APP_VERSION}`}
          style={[styles.versionBadge, compact && styles.versionBadgeCompact]}
        >
          <Text style={[styles.versionText, compact && styles.versionTextCompact]}>v{APP_VERSION}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.language}
          onPress={() => setLanguage(language === 'es' ? 'en' : 'es')}
          style={[styles.languageButton, compact && styles.headerChipCompact]}
        >
          <Globe2 size={compact ? 16 : 17} color={colors.primary} />
          {!iconOnly && <Text style={styles.languageText}>{language === 'es' ? 'EN' : 'ES'}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export function SupportStrip() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const height = compact ? 32 : 40;
  const terraWidth = Math.round((height * 268) / 120);
  const gtekWidth = Math.round((height * 284) / 120);
  return (
    <View style={styles.support} accessibilityLabel={t.supportedBy}>
      <Text style={styles.supportLabel}>{t.supportedBy}</Text>
      <View style={[styles.supportLogos, compact && styles.supportLogosWrap]}>
        <Image
          accessibilityLabel="Grupo Terra"
          source={require('../../assets/partners/grupo-terra.png')}
          style={{ width: terraWidth, height }}
          resizeMode="contain"
        />
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Gtek ingeniería"
          style={Platform.OS === 'web' ? { cursor: 'pointer' as const } : undefined}
          onPress={() => void Linking.openURL('https://gtek.com.co')}
        >
          <Image
            source={require('../../assets/partners/gtek.png')}
            style={{ width: gtekWidth, height }}
            resizeMode="contain"
          />
        </Pressable>
      </View>
    </View>
  );
}

export function Card({ children, style }: React.PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  loading,
  style,
}: React.PropsWithChildren<{
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  style?: object;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        (pressed || disabled) && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} /> : icon}
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{children}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  multiline,
  style,
  ...props
}: Omit<TextInputProps, 'style'> & { label: string; style?: ViewStyle }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
        {...props}
      />
    </View>
  );
}

export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | '';
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.choice, value === option.value && styles.choiceActive]}
          >
            {value === option.value && <Check size={15} color={colors.white} />}
            <Text style={[styles.choiceText, value === option.value && styles.choiceTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Pressable onPress={() => onChange(!value)} style={[styles.switch, value && styles.switchActive]}>
        <View style={[styles.switchKnob, value && styles.switchKnobActive]} />
        <Text style={[styles.switchText, value && styles.switchTextActive]}>{value ? t.yes : t.no}</Text>
      </Pressable>
    </View>
  );
}

export function ClassificationBadge({
  value,
  compact,
}: {
  value: Habitability;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const color = {
    habitable: colors.green,
    restricted: colors.yellow,
    unsafe: colors.red,
    collapsed: colors.black,
  }[value];
  return (
    <View style={[styles.badge, { backgroundColor: color }, compact && styles.badgeCompact]}>
      <Text style={styles.badgeText}>{t[value]}</Text>
    </View>
  );
}

export function OfflinePill() {
  const { t } = useI18n();
  return (
    <View style={styles.offlinePill}>
      <WifiOff size={14} color={colors.primary} />
      <Text style={styles.offlineText}>{t.offlineReady}</Text>
    </View>
  );
}

export function SectionProgress({
  current,
  total,
  title,
  onBack,
  onNext,
}: {
  current: number;
  total: number;
  title: string;
  onBack?: () => void;
  onNext?: () => void;
}) {
  const { t } = useI18n();
  return (
    <View>
      <View style={styles.progressHeader}>
        <Text style={styles.eyebrow}>
          {t.section} {current + 1} / {total}
        </Text>
        <Text style={styles.progressPercent}>{Math.round(((current + 1) / total) * 100)}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((current + 1) / total) * 100}%` }]} />
      </View>
      <View style={styles.sectionTitleRow}>
        <Pressable disabled={!onBack} onPress={onBack} style={styles.iconButton}>
          <ChevronLeft color={onBack ? colors.primary : colors.border} />
        </Pressable>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable disabled={!onNext} onPress={onNext} style={styles.iconButton}>
          <ChevronRight color={onNext ? colors.primary : colors.border} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  shellContent: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', padding: 20, flex: 1 },
  header: {
    minHeight: 72,
    paddingHorizontal: 22,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerCompact: { minHeight: 60, paddingHorizontal: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  brandCopy: { flexShrink: 0 },
  logo: { width: 44, height: 44, borderRadius: 22, flexShrink: 0 },
  logoCompact: { width: 32, height: 32, borderRadius: 16 },
  brandTitle: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  brandTitleCompact: { fontSize: 15, letterSpacing: 0 },
  brandSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  headerActionsCompact: { gap: 6 },
  versionBadge: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  versionText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  versionBadgeCompact: { paddingHorizontal: 7, paddingVertical: 5 },
  versionTextCompact: { fontSize: 11 },
  headerChipCompact: { paddingHorizontal: 8, paddingVertical: 7 },
  support: {
    width: '100%',
    marginTop: 28,
    marginBottom: 12,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    gap: 10,
  },
  supportLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  supportLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    flexWrap: 'wrap',
  },
  supportLogosWrap: { gap: 16 },
  languageButton: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  languageText: { color: colors.primary, fontWeight: '800' },
  guideButton: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    ...shadows,
  },
  button: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  button_primary: { backgroundColor: colors.primary },
  button_secondary: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.mint },
  button_ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  button_danger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.65 },
  buttonText: { fontSize: 15, fontWeight: '800' },
  buttonText_primary: { color: colors.white },
  buttonText_secondary: { color: colors.primaryDark },
  buttonText_ghost: { color: colors.primary },
  buttonText_danger: { color: colors.white },
  field: { flex: 1, minWidth: 220, gap: 7 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 47,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  multiline: { minHeight: 105, textAlignVertical: 'top' },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
  },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.text, fontWeight: '600' },
  choiceTextActive: { color: colors.white },
  toggleRow: {
    minHeight: 55,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  toggleLabel: { color: colors.text, fontWeight: '600', flex: 1 },
  switch: {
    width: 78,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
  },
  switchActive: { backgroundColor: colors.primarySoft },
  switchKnob: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.textMuted },
  switchKnobActive: { backgroundColor: colors.primary, transform: [{ translateX: 40 }] },
  switchText: { position: 'absolute', right: 9, color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  switchTextActive: { left: 9, color: colors.primary, right: undefined },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  badgeCompact: { paddingVertical: 5, paddingHorizontal: 9 },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  offlineText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.primary, fontWeight: '900', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.6 },
  progressPercent: { color: colors.textMuted, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, marginTop: 9, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  sectionTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 22, fontWeight: '900' },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
});

export const uiStyles = styles;
