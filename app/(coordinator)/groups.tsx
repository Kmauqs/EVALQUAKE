import { Redirect } from 'expo-router';
import { ArrowLeft, Pencil, Plus, Trash2, Users } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppShell, Button, Card, Field, MultiSelectDropdown } from '@/components/ui';
import type { AppUser } from '@/domain/user';
import {
  normalizeWorkGroupName,
  scopedWorkGroups,
  workGroupNameTaken,
  type WorkGroup,
} from '@/domain/workGroup';
import { subscribeUsers } from '@/firebase/users';
import {
  createWorkGroup,
  deleteWorkGroup,
  subscribeWorkGroups,
  updateWorkGroup,
  workGroupErrorMessage,
} from '@/firebase/workGroups';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { confirmDestructive } from '@/services/confirm';
import { notify } from '@/services/notify';
import { colors } from '@/theme';

type Draft = { id: string | null; name: string; memberUids: string[] };

const EMPTY_DRAFT: Draft = { id: null, name: '', memberUids: [] };

function accountLabel(user: AppUser) {
  return user.email || user.displayName || user.id;
}

export default function WorkGroupsScreen() {
  const { t } = useI18n();
  const { configured, uid, role } = useAuth();
  const goBack = useSafeBack('/(coordinator)');
  const { width } = useWindowDimensions();
  const narrow = width < 700;
  const canManage = !configured || role === 'coordinator' || role === 'admin';
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(
    () => (configured && canManage ? subscribeWorkGroups(setGroups) : () => undefined),
    [canManage, configured],
  );
  useEffect(
    () => (configured && canManage ? subscribeUsers(setUsers) : () => undefined),
    [canManage, configured],
  );

  const mine = useMemo(() => scopedWorkGroups(groups, uid, role), [groups, role, uid]);
  const assignable = useMemo(
    () =>
      users.filter(
        (user) =>
          !user.disabled &&
          user.status === 'active' &&
          (user.role === 'evaluator' || user.role === 'coordinator'),
      ),
    [users],
  );
  const memberOptions = useMemo(
    () => assignable.map((user) => ({ value: user.id, label: accountLabel(user) })),
    [assignable],
  );
  const labelByUid = useMemo(
    () => new Map(users.map((user) => [user.id, accountLabel(user)])),
    [users],
  );

  const save = async () => {
    if (!draft) return;
    const name = normalizeWorkGroupName(draft.name);
    if (!name) {
      setError(t.workGroupName);
      return;
    }
    if (workGroupNameTaken(groups, name, draft.id ?? undefined)) {
      setError(t.duplicateWorkGroupName);
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (draft.id) {
        await updateWorkGroup({ groupId: draft.id, name, memberUids: draft.memberUids });
      } else {
        await createWorkGroup({ name, memberUids: draft.memberUids });
      }
      setDraft(null);
    } catch (caught) {
      setError(
        workGroupErrorMessage(caught, {
          duplicateName: t.duplicateWorkGroupName,
          notAuthorized: t.workGroupMemberNotAuthorized,
          fallback: t.workGroupSaveFailed,
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = (group: WorkGroup) => {
    confirmDestructive(
      t.deleteWorkGroupTitle,
      `${group.name} — ${t.deleteWorkGroupConfirm}`,
      t.delete,
      t.cancel,
      () => {
        void deleteWorkGroup(group.id).catch(() =>
          notify(t.deleteWorkGroupTitle, t.deleteWorkGroupFailed),
        );
      },
    );
  };

  // The coordinator group also hosts the read-only dashboard for evaluators, who must not
  // reach the group editor even by navigating straight to the route.
  if (!canManage) return <Redirect href="/(coordinator)" />;

  return (
    <AppShell>
      <View style={[styles.titleRow, narrow && styles.titleRowNarrow]}>
        <Pressable onPress={goBack} style={styles.back} accessibilityRole="button">
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{t.coordinator}</Text>
          <Text style={[styles.title, narrow && styles.titleNarrow]}>{t.workGroups}</Text>
          <Text style={styles.subtitle}>{t.workGroupsSubtitle}</Text>
        </View>
        <Button
          icon={<Plus size={17} color={colors.white} />}
          onPress={() => {
            setError('');
            setDraft(EMPTY_DRAFT);
          }}
          style={narrow ? styles.fullWidth : undefined}
        >
          {t.newWorkGroup}
        </Button>
      </View>

      {draft ? (
        <Card style={styles.editor}>
          <Text style={styles.editorTitle}>{draft.id ? t.editWorkGroup : t.newWorkGroup}</Text>
          <Field
            label={t.workGroupName}
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
            placeholder={t.workGroupNamePlaceholder}
            maxLength={60}
          />
          {memberOptions.length ? (
            <MultiSelectDropdown
              label={t.workGroupMembers}
              values={draft.memberUids}
              options={memberOptions}
              onChange={(memberUids) => setDraft({ ...draft, memberUids })}
            />
          ) : (
            <Text style={styles.empty}>{t.noAssignableUsers}</Text>
          )}
          <Text style={styles.hint}>{t.workGroupMembersHint}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.editorActions}>
            <Button variant="ghost" onPress={() => setDraft(null)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button onPress={() => void save()} loading={busy} disabled={busy}>
              {t.save}
            </Button>
          </View>
        </Card>
      ) : null}

      <View style={styles.list}>
        {mine.length === 0 && !draft ? <Text style={styles.empty}>{t.noWorkGroups}</Text> : null}
        {mine.map((group) => (
          <Card key={group.id} style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowHeading}>
                <Users size={16} color={colors.primary} />
                <Text style={styles.rowName}>{group.name}</Text>
              </View>
              <Text style={styles.rowCount}>
                {group.memberUids.length} {t.workGroupMemberCount}
              </Text>
            </View>
            <Text style={styles.rowMembers}>
              {group.memberUids.length
                ? group.memberUids.map((member) => labelByUid.get(member) ?? member).join(', ')
                : t.noAssignableUsers}
            </Text>
            <Text style={styles.rowMeta}>
              {t.workGroupCoordinators}:{' '}
              {group.coordinatorUids
                .map((coordinator) => labelByUid.get(coordinator) ?? coordinator)
                .join(', ')}
            </Text>
            <View style={styles.rowActions}>
              <Button
                variant="secondary"
                icon={<Pencil size={16} color={colors.primary} />}
                onPress={() => {
                  setError('');
                  setDraft({ id: group.id, name: group.name, memberUids: group.memberUids });
                }}
              >
                {t.edit}
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 size={16} color={colors.white} />}
                onPress={() => remove(group)}
              >
                {t.delete}
              </Button>
            </View>
          </Card>
        ))}
      </View>
    </AppShell>
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
  fullWidth: { width: '100%' },
  editor: { marginTop: 20, gap: 12 },
  editorTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  editorActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' },
  hint: { color: colors.textMuted, fontSize: 12 },
  error: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  list: { marginTop: 22, gap: 10, paddingBottom: 30 },
  empty: { color: colors.textMuted, fontWeight: '700' },
  row: { padding: 15, gap: 8 },
  rowTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rowHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  rowName: { color: colors.text, fontSize: 16, fontWeight: '900', flexShrink: 1 },
  rowCount: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  rowMembers: { color: colors.text, fontSize: 13 },
  rowMeta: { color: colors.textMuted, fontSize: 12 },
  rowActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
});
