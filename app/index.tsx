import { type Href, useRouter } from 'expo-router';
import { ClipboardCheck, ShieldCheck, Users } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { authErrorMessage, useAuth } from '@/auth/AuthProvider';
import { AppShell, Button, Card, Field, OfflinePill } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { colors } from '@/theme';

export default function WelcomeScreen() {
  const { t } = useI18n();
  const { configured, loading, login, logout, refreshAccess, register, role, status, user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (loading) {
    return (
      <AppShell>
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      </AppShell>
    );
  }

  if (configured && !user) {
    const submit = () => {
      if (mode === 'register' && password !== confirmPassword) {
        Alert.alert(t.createAccount, t.passwordMismatch);
        return;
      }
      setBusy(true);
      const action = mode === 'register' ? register(email, password) : login(email, password);
      void action
        .catch((error) =>
          Alert.alert(
            mode === 'register' ? t.createAccount : t.signIn,
            authErrorMessage(error, t.authenticationError, {
              emailInUse: t.emailInUse,
              weakPassword: t.weakPassword,
              invalidEmail: t.invalidEmail,
              disabled: t.accountDisabled,
            }),
          ),
        )
        .finally(() => setBusy(false));
    };

    return (
      <AppShell>
        <Card style={styles.loginCard}>
          <Image source={require('../icon_960.png')} style={styles.loginLogo} />
          <Text style={styles.roleTitle}>{mode === 'register' ? t.createAccount : t.signIn}</Text>
          <Text style={styles.authLead}>
            {mode === 'register' ? t.createAccountDescription : t.signInDescription}
          </Text>
          <Field
            label={t.email}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry />
          {mode === 'register' && (
            <Field
              label={t.confirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          )}
          <Button loading={busy} onPress={submit}>
            {mode === 'register' ? t.createAccount : t.signIn}
          </Button>
          <Button
            variant="ghost"
            onPress={() => setMode(mode === 'register' ? 'signin' : 'register')}
          >
            {mode === 'register' ? t.haveAccount : t.needAccount}
          </Button>
        </Card>
      </AppShell>
    );
  }

  if (configured && user && status !== 'active') {
    return (
      <AppShell>
        <Card style={styles.loginCard}>
          <Image source={require('../icon_960.png')} style={styles.loginLogo} />
          <Text style={styles.roleTitle}>
            {status === 'disabled' ? t.accountDisabled : t.awaitingApproval}
          </Text>
          <Text style={styles.authLead}>
            {status === 'disabled' ? t.accountDisabledDescription : t.pendingApprovalDescription}
          </Text>
          <Text style={styles.kickerInline}>{user.email}</Text>
          {status !== 'disabled' && (
            <Button
              loading={refreshing}
              onPress={() => {
                setRefreshing(true);
                void refreshAccess().finally(() => setRefreshing(false));
              }}
            >
              {t.refreshAccess}
            </Button>
          )}
          <Button variant="ghost" onPress={() => void logout()}>
            {t.signOut}
          </Button>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <View style={[styles.hero, width < 780 && styles.heroNarrow]}>
        <View style={styles.heroCopy}>
          <OfflinePill />
          <Text style={styles.kicker}>{configured ? user?.email : t.demoMode}</Text>
          <Text style={[styles.title, width < 780 && styles.titleNarrow]}>{t.tagline}</Text>
          <Text style={[styles.lead, width < 780 && styles.leadNarrow]}>
            {t.demoDescription} {t.immutableNotice}
          </Text>
        </View>
        <Image
          source={require('../icon_960.png')}
          style={[styles.heroLogo, width < 780 && styles.heroLogoNarrow]}
        />
      </View>

      <View style={[styles.roles, width < 780 && styles.rolesNarrow]}>
        {(role === 'evaluator' || !configured) && (
          <Card style={styles.roleCard}>
            <View style={styles.icon}>
              <ClipboardCheck color={colors.primary} size={28} />
            </View>
            <Text style={styles.roleTitle}>{t.evaluator}</Text>
            <Text style={styles.roleDescription}>{t.evaluatorDescription}</Text>
            <Button onPress={() => router.push('/(evaluator)')}>{t.enter}</Button>
          </Card>
        )}
        {(role === 'coordinator' || role === 'admin' || !configured) && (
          <Card style={styles.roleCard}>
            <View style={styles.icon}>
              <ShieldCheck color={colors.primary} size={28} />
            </View>
            <Text style={styles.roleTitle}>{t.coordinator}</Text>
            <Text style={styles.roleDescription}>{t.coordinatorDescription}</Text>
            <Button variant="secondary" onPress={() => router.push('/(coordinator)')}>
              {t.enter}
            </Button>
          </Card>
        )}
        {(role === 'admin' || !configured) && (
          <Card style={styles.roleCard}>
            <View style={styles.icon}>
              <Users color={colors.primary} size={28} />
            </View>
            <Text style={styles.roleTitle}>{t.admin}</Text>
            <Text style={styles.roleDescription}>{t.adminDescription}</Text>
            <Button variant="secondary" onPress={() => router.push('/(admin)' as Href)}>
              {t.enter}
            </Button>
          </Card>
        )}
      </View>
      {configured && (
        <Button variant="ghost" onPress={() => void logout()} style={styles.signOut}>
          {t.signOut}
        </Button>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: 24,
    padding: 38,
    marginTop: 16,
    flexDirection: 'row',
    minHeight: 285,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroNarrow: { padding: 24, minHeight: 500, flexDirection: 'column', alignItems: 'stretch' },
  heroCopy: { flex: 1, minWidth: 0, maxWidth: 720, zIndex: 1 },
  kicker: { color: colors.mint, fontSize: 13, fontWeight: '900', textTransform: 'uppercase', marginTop: 22 },
  kickerInline: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  title: { color: colors.white, fontSize: 42, lineHeight: 48, fontWeight: '900', marginTop: 10, maxWidth: 680 },
  titleNarrow: { fontSize: 34, lineHeight: 40, width: '100%' },
  lead: { color: '#DDEDDD', fontSize: 16, lineHeight: 24, marginTop: 16, maxWidth: 650 },
  leadNarrow: { fontSize: 15, lineHeight: 22, paddingBottom: 80 },
  heroLogo: { width: 230, height: 230, opacity: 0.22, marginRight: -15 },
  heroLogoNarrow: { position: 'absolute', width: 180, height: 180, right: -24, bottom: -20, marginRight: 0 },
  loading: { marginTop: 80 },
  loginCard: { width: '100%', maxWidth: 440, alignSelf: 'center', marginTop: 50, gap: 16 },
  loginLogo: { width: 92, height: 92, borderRadius: 46, alignSelf: 'center' },
  authLead: { color: colors.textMuted, lineHeight: 21, textAlign: 'center' },
  signOut: { alignSelf: 'center', marginBottom: 24 },
  roles: { flexDirection: 'row', gap: 18, marginTop: 20, paddingBottom: 20 },
  rolesNarrow: { flexDirection: 'column' },
  roleCard: { flex: 1, gap: 14 },
  icon: { width: 52, height: 52, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { color: colors.text, fontSize: 21, fontWeight: '900' },
  roleDescription: { color: colors.textMuted, lineHeight: 21, flex: 1 },
});
