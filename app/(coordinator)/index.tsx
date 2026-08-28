import { useRouter, type Href } from 'expo-router';
import { ArrowLeft, Download, FileJson, FileText, Search, Trash2, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { EvaluationMap } from '@/components/EvaluationMap';
import { AppShell, Button, Card, ClassificationBadge } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import { evaluatorAccountLabel, type Evaluation, type Habitability } from '@/domain/evaluation';
import { hasNationalScope } from '@/domain/jurisdiction';
import { demoEvaluations } from '@/domain/fixtures';
import {
  canModerateDeleteInScope,
  evaluationAuthorScope,
  isEvaluationInScope,
  scopedWorkGroups,
  type WorkGroup,
} from '@/domain/workGroup';
import { subscribeGroupEvaluations, subscribeRemoteEvaluations } from '@/firebase/repository';
import { subscribeUsers } from '@/firebase/users';
import { subscribeWorkGroups } from '@/firebase/workGroups';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { exportCsv, exportJson, exportQuantitiesCsv, exportSummaryHtml } from '@/services/exportData';
import { requestModerateDelete } from '@/services/moderateDelete';
import { useEvaluations } from '@/state/EvaluationProvider';
import { colors } from '@/theme';

export default function CoordinatorDashboard() {
  const { t, language } = useI18n();
  const { configured, jurisdictionIds, role, uid, groupIds } = useAuth();
  const { evaluations: local } = useEvaluations();
  const router = useRouter();
  const goBack = useSafeBack('/');
  const { width } = useWindowDimensions();
  const narrow = width < 700;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Habitability | 'all'>('all');
  const [evaluatorFilter, setEvaluatorFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [remote, setRemote] = useState<Evaluation[]>([]);
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [accountByUid, setAccountByUid] = useState<Record<string, string>>({});
  const viewerOnly = role === 'evaluator';
  useEffect(() => {
    if (!configured) return;
    // Evaluators may only list evaluations tagged with one of their work groups; the
    // broader event-wide query is rejected by the Firestore rules for that role.
    return viewerOnly
      ? subscribeGroupEvaluations(groupIds, 'event-2026', setRemote)
      : subscribeRemoteEvaluations(jurisdictionIds, 'event-2026', setRemote, undefined, {
          allEvent: role === 'admin' || role === 'coordinator' || hasNationalScope(jurisdictionIds),
        });
  }, [configured, groupIds, jurisdictionIds, role, viewerOnly]);
  useEffect(
    () => (configured ? subscribeWorkGroups(setGroups) : () => undefined),
    [configured],
  );
  // Evaluators cannot list the whole users collection under the Firestore rules, so the
  // read-only dashboard falls back to the email stored on each evaluation.
  useEffect(
    () =>
      configured && !viewerOnly
        ? subscribeUsers((users) => {
            setAccountByUid(
              Object.fromEntries(users.map((user) => [user.id, user.email || user.displayName || user.id])),
            );
          })
        : () => undefined,
    [configured, viewerOnly],
  );
  const accountLabel = useCallback(
    (evaluation: Evaluation) =>
      evaluation.createdByEmail.trim() ||
      accountByUid[evaluation.createdByUserId] ||
      evaluatorAccountLabel(evaluation),
    [accountByUid],
  );
  const evaluations = useMemo(
    () =>
      configured
        ? remote
        : [
            ...local.filter((item) => !demoEvaluations.some((demo) => demo.id === item.id)),
            ...demoEvaluations,
          ],
    [configured, local, remote],
  );
  const myGroups = useMemo(() => scopedWorkGroups(groups, uid, role), [groups, role, uid]);
  // Administrators keep full visibility; everyone else is limited to the authors inside
  // the work groups they coordinate or belong to. Demo mode stays unscoped.
  const authorScope = useMemo(
    () => (configured ? evaluationAuthorScope(groups, uid, role) : null),
    [configured, groups, role, uid],
  );
  const groupAuthors = useMemo(() => {
    if (groupFilter === 'all') return null;
    const group = groups.find((item) => item.id === groupFilter);
    if (!group) return new Set<string>();
    return new Set<string>([...group.memberUids, ...group.coordinatorUids]);
  }, [groupFilter, groups]);
  const visible = useMemo(
    () =>
      evaluations.filter(
        (evaluation) =>
          isEvaluationInScope(evaluation, authorScope) &&
          (groupAuthors === null || groupAuthors.has(evaluation.createdByUserId)),
      ),
    [authorScope, evaluations, groupAuthors],
  );
  const evaluatorOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const evaluation of visible) {
      const key = evaluation.createdByUserId || accountLabel(evaluation);
      if (!byKey.has(key)) byKey.set(key, accountLabel(evaluation));
    }
    return [...byKey.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [accountLabel, visible]);
  const filtered = visible.filter((evaluation) => {
    const haystack = [
      evaluation.building.address,
      evaluation.identification.neighborhood,
      evaluation.inspectors[0]?.name,
      accountLabel(evaluation),
    ]
      .join(' ')
      .toLowerCase();
    const matchesEvaluator =
      evaluatorFilter === 'all' || evaluation.createdByUserId === evaluatorFilter;
    return (
      (filter === 'all' || evaluation.habitability === filter) &&
      matchesEvaluator &&
      haystack.includes(query.toLowerCase())
    );
  });
  const classifications: Habitability[] = ['habitable', 'restricted', 'unsafe', 'collapsed'];

  return (
    <AppShell>
      <View style={styles.titleRow}>
        <Pressable onPress={goBack} style={styles.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{viewerOnly ? t.evaluator : t.coordinator}</Text>
          <Text style={[styles.title, narrow && styles.titleNarrow]}>
            {viewerOnly ? t.viewerDashboard : t.dashboard}
          </Text>
          <Text style={styles.subtitle}>
            {viewerOnly ? t.viewerDashboardHint : t.currentEvent}
          </Text>
        </View>
      </View>

      <View style={[styles.exports, narrow && styles.exportsNarrow]}>
        {viewerOnly ? null : (
          <Button
            variant="secondary"
            icon={<Users size={17} color={colors.primary} />}
            onPress={() => router.push('/(coordinator)/groups' as Href)}
            style={narrow ? styles.exportButtonNarrow : undefined}
          >
            {t.workGroups}
          </Button>
        )}
        <Button
          variant="ghost"
          icon={<Download size={17} color={colors.primary} />}
          onPress={() => void exportCsv(filtered)}
          style={narrow ? styles.exportButtonNarrow : undefined}
        >
          {t.exportCsv}
        </Button>
        <Button
          variant="ghost"
          icon={<Download size={17} color={colors.primary} />}
          onPress={() => void exportQuantitiesCsv(filtered, language)}
          style={narrow ? styles.exportButtonNarrow : undefined}
        >
          {t.exportQuantitiesCsv}
        </Button>
        <Button
          variant="secondary"
          icon={<FileText size={17} color={colors.primary} />}
          onPress={() =>
            void exportSummaryHtml(
              filtered,
              {
                damage: filter,
                evaluator:
                  evaluatorFilter === 'all'
                    ? 'all'
                    : evaluatorOptions.find(([id]) => id === evaluatorFilter)?.[1] ?? evaluatorFilter,
              },
              language,
            )
          }
          style={narrow ? styles.exportButtonNarrow : undefined}
        >
          {t.exportSummary}
        </Button>
        <Button
          variant="secondary"
          icon={<FileJson size={17} color={colors.primary} />}
          onPress={() => void exportJson(filtered)}
          style={narrow ? styles.exportButtonNarrow : undefined}
        >
          {t.exportJson}
        </Button>
      </View>

      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{visible.length}</Text>
          <Text style={styles.statLabel}>{t.totalEvaluations}</Text>
        </Card>
        {classifications.map((classification) => (
          <Pressable key={classification} style={styles.statPressable} onPress={() => setFilter(classification)}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>
                {visible.filter((item) => item.habitability === classification).length}
              </Text>
              <ClassificationBadge value={classification} compact />
            </Card>
          </Pressable>
        ))}
      </View>

      <View style={styles.filters}>
        <View style={styles.search}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.search}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>{t.filterByDamage}</Text>
          <View style={styles.filterChips}>
            {(['all', ...classifications] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setFilter(value)}
                style={[styles.filterChip, filter === value && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                  {value === 'all' ? t.allDamage : t[value]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {myGroups.length ? (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>{t.filterByWorkGroup}</Text>
            <View style={styles.filterChips}>
              <Pressable
                onPress={() => setGroupFilter('all')}
                style={[styles.filterChip, groupFilter === 'all' && styles.filterChipActive]}
              >
                <Text
                  style={[styles.filterText, groupFilter === 'all' && styles.filterTextActive]}
                >
                  {t.allMyWorkGroups}
                </Text>
              </Pressable>
              {myGroups.map((group) => (
                <Pressable
                  key={group.id}
                  onPress={() => setGroupFilter(group.id)}
                  style={[styles.filterChip, groupFilter === group.id && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      groupFilter === group.id && styles.filterTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {group.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        {configured && viewerOnly && !myGroups.length ? (
          <Text style={styles.notice}>{t.noWorkGroupAssigned}</Text>
        ) : null}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>{t.filterByEvaluator}</Text>
          <View style={styles.filterChips}>
            <Pressable
              onPress={() => setEvaluatorFilter('all')}
              style={[styles.filterChip, evaluatorFilter === 'all' && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, evaluatorFilter === 'all' && styles.filterTextActive]}>
                {t.allEvaluators}
              </Text>
            </Pressable>
            {evaluatorOptions.map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => setEvaluatorFilter(id)}
                style={[styles.filterChip, evaluatorFilter === id && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, evaluatorFilter === id && styles.filterTextActive]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.content, width < 960 && styles.contentNarrow]}>
        <View style={styles.mapColumn}>
          <Text style={styles.sectionTitle}>{t.map}</Text>
          <EvaluationMap
            evaluations={filtered}
            onSelect={(evaluation) => router.push(`/(coordinator)/evaluation/${evaluation.id}`)}
          />
        </View>
        <View style={styles.listColumn}>
          <Text style={styles.sectionTitle}>{t.recentEvaluations}</Text>
          <View style={styles.list}>
            {filtered.map((evaluation) => (
              <Card key={evaluation.id} style={styles.row}>
                <Pressable onPress={() => router.push(`/(coordinator)/evaluation/${evaluation.id}`)}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowNumber}>
                      {evaluation.officialNumber ? `#${evaluation.officialNumber}` : t.officialPending}
                    </Text>
                    <ClassificationBadge value={evaluation.habitability} compact />
                  </View>
                  <Text style={styles.rowAddress}>{evaluation.building.address}</Text>
                  <Text style={styles.rowMeta}>
                    {t.evaluatorAccount}: {accountLabel(evaluation)}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {evaluation.identification.neighborhood} · {evaluation.inspectors[0]?.name}
                  </Text>
                  <Text style={styles.rowDate}>
                    {new Date(evaluation.updatedAt).toLocaleString(language)}
                  </Text>
                </Pressable>
                {canModerateDeleteInScope(evaluation, role, uid, groups) ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.deleteEvaluation}
                    hitSlop={8}
                    onPress={() =>
                      requestModerateDelete(evaluation, role, t, () =>
                        setRemote((records) => records.filter((item) => item.id !== evaluation.id)),
                      )
                    }
                    style={styles.deleteButton}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </Pressable>
                ) : null}
              </Card>
            ))}
          </View>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, marginTop: 8 },
  back: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 3 },
  titleNarrow: { fontSize: 27, lineHeight: 33 },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  // Second header row, indented to line up with the title text (back button + gap).
  exports: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingLeft: 57 },
  exportsNarrow: { flexDirection: 'column', alignItems: 'stretch', paddingLeft: 0 },
  exportButtonNarrow: { width: '100%' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  statPressable: { minWidth: 150, flex: 1 },
  statCard: { minWidth: 140, flex: 1, minHeight: 100, justifyContent: 'center', gap: 8 },
  statValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontWeight: '700' },
  filters: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  // flexBasis 100% keeps the search field on a row of its own, so the filter groups start below it.
  search: { flexGrow: 1, flexBasis: '100%', minWidth: 0, maxWidth: '100%', height: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, color: colors.text, height: '100%' },
  // minWidth 0 + flexShrink let the group narrow past its unwrapped content width, which
  // is what allows the chips inside to wrap instead of running off screen.
  filterGroup: { gap: 6, flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, maxWidth: '100%' },
  filterLabel: { color: colors.textMuted, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  notice: { color: colors.textMuted, fontWeight: '700', fontSize: 12, width: '100%' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, maxWidth: '100%', flexShrink: 1 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: colors.white },
  content: { flexDirection: 'row', gap: 18, marginTop: 22, paddingBottom: 30 },
  contentNarrow: { flexDirection: 'column' },
  mapColumn: { flex: 1.45, minWidth: 0 },
  listColumn: { flex: 1, minWidth: 0 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 10 },
  list: { gap: 9 },
  row: { padding: 15, paddingBottom: 52 },
  rowTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  rowNumber: { color: colors.primary, fontWeight: '900', fontSize: 12, flex: 1, minWidth: 0, flexShrink: 1 },
  rowAddress: { color: colors.text, fontWeight: '800', marginTop: 10 },
  rowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 5 },
  rowDate: { color: colors.textMuted, fontSize: 10, marginTop: 8 },
  deleteButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
