import { useRouter } from 'expo-router';
import { ClipboardCheck, ShieldCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppShell, Button, Card, Field, OfflinePill } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { colors } from '@/theme';

export default function WelcomeScreen() {
  const { t } = useI18n();
  const { configured, loading, login, logout, role, user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  if (loading) {
    return (
      <AppShell>
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      </AppShell>
    );
  }

  if (configured && !user) {
    return (
      <AppShell>
        <Card style={styles.loginCard}>
          <Image source={require('../icon_960.png')} style={styles.loginLogo} />
          <Text style={styles.roleTitle}>{t.signIn}</Text>
          <Field label={t.email} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry />
          <Button
            loading={signingIn}
            onPress={() => {
              setSigningIn(true);
              void login(email, password)
                .catch(() => Alert.alert(t.signIn, t.authenticationError))
                .finally(() => setSigningIn(false));
            }}
          >
            {t.signIn}
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
          <Text style={styles.title}>{t.tagline}</Text>
          <Text style={styles.lead}>
            {t.demoDescription} {t.immutableNotice}
          </Text>
        </View>
        <Image source={require('../icon_960.png')} style={styles.heroLogo} />
      </View>

      <View style={[styles.roles, width < 780 && styles.rolesNarrow]}>
        {(role === 'evaluator' || !configured) && <Card style={styles.roleCard}>
          <View style={styles.icon}>
            <ClipboardCheck color={colors.primary} size={28} />
          </View>
          <Text style={styles.roleTitle}>{t.evaluator}</Text>
          <Text style={styles.roleDescription}>{t.evaluatorDescription}</Text>
          <Button onPress={() => router.push('/(evaluator)')}>{t.enter}</Button>
        </Card>}
        {(role === 'coordinator' || role === 'admin' || !configured) && <Card style={styles.roleCard}>
          <View style={styles.icon}>
            <ShieldCheck color={colors.primary} size={28} />
          </View>
          <Text style={styles.roleTitle}>{t.coordinator}</Text>
          <Text style={styles.roleDescription}>{t.coordinatorDescription}</Text>
          <Button variant="secondary" onPress={() => router.push('/(coordinator)')}>
            {t.enter}
          </Button>
        </Card>}
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
  heroNarrow: { padding: 25, minHeight: 340 },
  heroCopy: { flex: 1, maxWidth: 720, zIndex: 1 },
  kicker: { color: colors.mint, fontSize: 13, fontWeight: '900', textTransform: 'uppercase', marginTop: 22 },
  title: { color: colors.white, fontSize: 42, lineHeight: 48, fontWeight: '900', marginTop: 10, maxWidth: 680 },
  lead: { color: '#DDEDDD', fontSize: 16, lineHeight: 24, marginTop: 16, maxWidth: 650 },
  heroLogo: { width: 230, height: 230, opacity: 0.22, marginRight: -15 },
  loading: { marginTop: 80 },
  loginCard: { width: '100%', maxWidth: 440, alignSelf: 'center', marginTop: 50, gap: 16 },
  loginLogo: { width: 92, height: 92, borderRadius: 46, alignSelf: 'center' },
  signOut: { alignSelf: 'center', marginBottom: 24 },
  roles: { flexDirection: 'row', gap: 18, marginTop: 20, paddingBottom: 20 },
  rolesNarrow: { flexDirection: 'column' },
  roleCard: { flex: 1, gap: 14 },
  icon: { width: 52, height: 52, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { color: colors.text, fontSize: 21, fontWeight: '900' },
  roleDescription: { color: colors.textMuted, lineHeight: 21, flex: 1 },
});
