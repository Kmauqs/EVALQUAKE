import { ArrowLeft, ShieldBan, ShieldCheck, UserRoundCheck } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppShell, Button, Card, Field, SelectRow } from '@/components/ui';
import type { UserRole } from '@/domain/evaluation';
import type { AccountStatus, AppUser } from '@/domain/user';
import { USER_ROLES } from '@/domain/user';
import { parseJurisdictionIds, setUserDisabled, setUserRole, subscribeUsers } from '@/firebase/users';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { colors } from '@/theme';

export default function AdminUsersScreen() {
  const { t } = useI18n();
  const { uid } = useAuth();
  const goBack = useSafeBack('/');
  const { width } = useWindowDimensions();
  const narrow = width < 700;
  const [users, setUsers] = useState<AppUser[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AccountStatus | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => subscribeUsers(setUsers), []);

  const filtered = useMemo(
    () =>
      users.filter((user) => {
        const matchesFilter = filter === 'all' || user.status === filter;
        const haystack = `${user.email} ${user.displayName ?? ''}`.toLowerCase();
        return matchesFilter && haystack.includes(query.toLowerCase());
      }),
    [filter, query, users],
  );

  const roleOptions = USER_ROLES.map((value) => ({
    value,
    label: t[value],
  }));

  return (
    <AppShell>
      <View style={[styles.titleRow, narrow && styles.titleRowNarrow]}>
        <Pressable onPress={goBack} style={styles.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{t.admin}</Text>
          <Text style={[styles.title, narrow && styles.titleNarrow]}>{t.userAdministration}</Text>
          <Text style={styles.subtitle}>{t.userAdministrationDescription}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        {(['pending', 'active', 'disabled'] as const).map((value) => (
          <Pressable key={value} style={styles.statPressable} onPress={() => setFilter(value)}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{users.filter((user) => user.status === value).length}</Text>
              <Text style={styles.statLabel}>{t[`${value}Accounts`]}</Text>
            </Card>
          </Pressable>
        ))}
      </View>

      <Field label={t.searchUsers} value={query} onChangeText={setQuery} style={styles.search} />
      <View style={styles.filters}>
        {(['all', 'pending', 'active', 'disabled'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setFilter(value)}
            style={[styles.filterChip, filter === value && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
              {value === 'all' ? t.all : t[`${value}Accounts`]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {filtered.map((user) => (
          <UserCard
            key={`${user.id}-${user.updatedAt}`}
            user={user}
            currentUid={uid}
            busy={busyId === user.id}
            roleOptions={roleOptions}
            onBusy={setBusyId}
          />
        ))}
        {!filtered.length && (
          <Card style={styles.empty}>
            <Text style={styles.emptyText}>{t.noUsers}</Text>
          </Card>
        )}
      </View>
    </AppShell>
  );
}

function UserCard({
  user,
  currentUid,
  busy,
  roleOptions,
  onBusy,
}: {
  user: AppUser;
  currentUid: string;
  busy: boolean;
  roleOptions: { value: UserRole; label: string }[];
  onBusy: (id: string | null) => void;
}) {
  const { t } = useI18n();
  const [role, setRole] = useState<UserRole>(user.role ?? 'evaluator');
  const [jurisdictions, setJurisdictions] = useState(
    user.jurisdictionIds.join(', ') || 'jurisdiction-demo',
  );

  const save = async () => {
    onBusy(user.id);
    try {
      await setUserRole({
        userId: user.id,
        role,
        jurisdictionIds: parseJurisdictionIds(jurisdictions),
      });
    } catch {
      Alert.alert(t.userAdministration, t.userUpdateError);
    } finally {
      onBusy(null);
    }
  };

  const toggleDisabled = async () => {
    onBusy(user.id);
    try {
      await setUserDisabled({ userId: user.id, disabled: !user.disabled });
    } catch {
      Alert.alert(t.userAdministration, t.userUpdateError);
    } finally {
      onBusy(null);
    }
  };

  return (
    <Card style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userCopy}>
          <Text style={styles.email}>{user.email || user.id}</Text>
          <Text style={styles.meta}>
            {t[`${user.status}Accounts`]} · {user.role ? t[user.role] : t.awaitingApproval}
          </Text>
        </View>
        {user.status === 'pending' ? (
          <UserRoundCheck size={22} color={colors.yellow} />
        ) : user.disabled ? (
          <ShieldBan size={22} color={colors.red} />
        ) : (
          <ShieldCheck size={22} color={colors.green} />
        )}
      </View>
      <SelectRow label={t.role} value={role} options={roleOptions} onChange={setRole} />
      <Field
        label={t.jurisdictions}
        value={jurisdictions}
        onChangeText={setJurisdictions}
        placeholder="jurisdiction-demo"
      />
      <View style={styles.userActions}>
        <Button loading={busy} onPress={() => void save()} style={styles.userButton}>
          {user.status === 'pending' ? t.approveUser : t.save}
        </Button>
        {user.id !== currentUid && (
          <Button
            variant={user.disabled ? 'secondary' : 'danger'}
            disabled={busy}
            onPress={() => void toggleDisabled()}
            style={styles.userButton}
          >
            {user.disabled ? t.enableUser : t.disableUser}
          </Button>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, marginTop: 8 },
  titleRowNarrow: { flexWrap: 'wrap' },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 3 },
  titleNarrow: { fontSize: 27, lineHeight: 33 },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  statPressable: { minWidth: 140, flex: 1 },
  statCard: { minHeight: 92, justifyContent: 'center', gap: 6 },
  statValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontWeight: '700' },
  search: { marginTop: 18, minWidth: 0 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: colors.white },
  list: { gap: 12, marginTop: 18, paddingBottom: 28 },
  empty: { alignItems: 'center', paddingVertical: 36 },
  emptyText: { color: colors.textMuted },
  userCard: { gap: 14 },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  userCopy: { flex: 1, minWidth: 0 },
  email: { color: colors.text, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  userActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  userButton: { flexGrow: 1, minWidth: 140 },
});
