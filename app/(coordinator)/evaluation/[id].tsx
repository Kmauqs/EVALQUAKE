import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Braces, FileText, MapPin, Tag, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppShell, Button, Card, ClassificationBadge } from '@/components/ui';
import { evaluatorAccountLabel, type Evaluation } from '@/domain/evaluation';
import { demoEvaluations } from '@/domain/fixtures';
import {
  canModerateDeleteInScope,
  workGroupLabelsFor,
  type WorkGroup,
} from '@/domain/workGroup';
import { pullEvaluation } from '@/firebase/repository';
import { subscribeUsers } from '@/firebase/users';
import { subscribeWorkGroups } from '@/firebase/workGroups';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { renderPlacardHtml } from '@/report/renderPlacardHtml';
import { renderReportHtml } from '@/report/renderReportHtml';
import { openHtmlDocument } from '@/services/htmlDocument';
import { hydrateEvaluationImages } from '@/services/resolveImage';
import { requestModerateDelete } from '@/services/moderateDelete';
import { useEvaluations } from '@/state/EvaluationProvider';
import { colors, layout } from '@/theme';

export default function EvaluationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useI18n();
  const { configured, role, uid } = useAuth();
  const { get } = useEvaluations();
  const goBack = useSafeBack('/(coordinator)');
  const { width } = useWindowDimensions();
  const narrow = width < 700;
  const [evaluation, setEvaluation] = useState<Evaluation | null>(
    demoEvaluations.find((item) => item.id === id) ?? null,
  );
  const [raw, setRaw] = useState(false);
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [resolvedAccount, setResolvedAccount] = useState('');
  const emailFromEvaluation = evaluation?.createdByEmail.trim() || '';
  const accountEmail = emailFromEvaluation || resolvedAccount;

  useEffect(() => {
    if (!id || evaluation) return;
    void (configured ? pullEvaluation(id) : get(id)).then(setEvaluation);
  }, [configured, id, evaluation, get]);

  useEffect(() => {
    // Listing users is denied to the evaluator role; the evaluation's own email covers it.
    if (!configured || role === 'evaluator' || !evaluation?.createdByUserId || emailFromEvaluation) {
      return;
    }
    return subscribeUsers((users) => {
      const match = users.find((user) => user.id === evaluation.createdByUserId);
      setResolvedAccount(match?.email || match?.displayName || '');
    });
  }, [configured, emailFromEvaluation, evaluation?.createdByUserId, role]);

  useEffect(
    () => (configured ? subscribeWorkGroups(setGroups) : () => undefined),
    [configured],
  );

  if (!evaluation) {
    return (
      <AppShell>
        <Text style={styles.loading}>…</Text>
      </AppShell>
    );
  }

  const openReport = async () => {
    const ready = await hydrateEvaluationImages(evaluation);
    await openHtmlDocument(renderReportHtml(ready, language), `evalquake-${evaluation.id}.html`);
  };

  const openPlacard = async () => {
    const ready = await hydrateEvaluationImages(evaluation);
    await openHtmlDocument(
      renderPlacardHtml(ready, language),
      `evalquake-placard-${evaluation.id}.html`,
    );
  };

  const rows = [
    [t.fields.department, evaluation.identification.department],
    [t.fields.municipality, evaluation.identification.municipality],
    [t.fields.neighborhood, evaluation.identification.neighborhood],
    [t.address, evaluation.building.address],
    [t.fields.buildingName, evaluation.building.name],
    [t.fields.floors, evaluation.building.floors],
    [t.fields.predominantUse, evaluation.building.predominantUse],
    [t.fields.structuralSystem, evaluation.structure.structuralSystem],
    [t.fields.globalDamage, `${evaluation.globalDamagePercentage}%`],
    [t.fields.inspectorName, evaluation.inspectors[0]?.name],
    [t.evaluatorAccount, accountEmail || evaluatorAccountLabel(evaluation)],
    [t.workGroup, workGroupLabelsFor(groups, evaluation).join(', ') || t.withoutWorkGroup],
    [t.fields.entity, evaluation.inspectors[0]?.entity],
    [t.fields.comments, evaluation.comments],
  ];

  return (
    <AppShell>
      <View style={[styles.header, narrow && styles.headerNarrow]}>
        <Pressable onPress={goBack} style={styles.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.id}>
            {evaluation.officialNumber ? `#${evaluation.officialNumber}` : evaluation.id}
          </Text>
          <Text style={[styles.title, narrow && styles.titleNarrow]}>
            {evaluation.building.address}
          </Text>
          <View style={styles.location}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={styles.locationText}>
              {evaluation.identification.neighborhood}, {evaluation.identification.municipality}
            </Text>
          </View>
        </View>
        <View style={narrow ? styles.badgeNarrow : undefined}>
          <ClassificationBadge value={evaluation.habitability} />
        </View>
      </View>

      <View style={[styles.actions, narrow && styles.actionsNarrow]}>
        <Button
          icon={<FileText size={18} color={colors.white} />}
          onPress={() => void openReport()}
          style={[styles.actionButton, narrow && styles.actionButtonNarrow]}
        >
          {t.viewReport}
        </Button>
        <Button
          variant="secondary"
          icon={<Tag size={18} color={colors.primary} />}
          onPress={() => void openPlacard()}
          style={[styles.actionButton, narrow && styles.actionButtonNarrow]}
        >
          {t.generatePlacard}
        </Button>
        <Button
          variant="ghost"
          icon={<Braces size={18} color={colors.primary} />}
          onPress={() => setRaw(!raw)}
          style={[styles.actionButton, narrow && styles.actionButtonNarrow]}
        >
          {t.rawData}
        </Button>
        {canModerateDeleteInScope(evaluation, role, uid, groups) ? (
          <Button
            variant="danger"
            icon={<Trash2 size={18} color={colors.white} />}
            onPress={() =>
              requestModerateDelete(evaluation, role, t, () => {
                setEvaluation(null);
                goBack();
              })
            }
            style={[styles.actionButton, narrow && styles.actionButtonNarrow]}
          >
            {t.deleteEvaluation}
          </Button>
        ) : null}
      </View>

      {raw ? (
        <Card style={styles.rawCard}>
          <Text selectable style={styles.raw}>
            {JSON.stringify(evaluation, null, 2)}
          </Text>
        </Card>
      ) : (
        <Card style={styles.detailCard}>
          {rows.map(([label, value]) => (
            <View key={label} style={[styles.row, narrow && styles.rowNarrow]}>
              <Text style={[styles.label, narrow && styles.labelNarrow]}>{label}</Text>
              <Text style={styles.value}>{value || '—'}</Text>
            </View>
          ))}
        </Card>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loading: { textAlign: 'center', marginTop: 50, color: colors.primary },
  header: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  headerNarrow: { flexWrap: 'wrap' },
  back: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0 },
  id: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  title: { color: colors.text, fontSize: 27, fontWeight: '900', marginTop: 4 },
  titleNarrow: { fontSize: 23, lineHeight: 29 },
  location: { flexDirection: 'row', gap: 5, alignItems: 'flex-start', marginTop: 7 },
  locationText: { color: colors.textMuted, fontSize: 13, flex: 1, minWidth: 0 },
  badgeNarrow: { width: '100%', paddingLeft: 58 },
  actions: {
    width: '100%',
    maxWidth: layout.contentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 20,
    minWidth: 0,
  },
  actionsNarrow: { flexDirection: 'column', alignItems: 'stretch', paddingLeft: 58 },
  actionButton: { maxWidth: '100%', flexShrink: 1, minWidth: 0 },
  actionButtonNarrow: { width: '100%' },
  detailCard: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', marginTop: 14, marginBottom: 24, padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 16, padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowNarrow: { flexDirection: 'column', gap: 6 },
  label: { width: '38%', color: colors.textMuted, fontWeight: '700' },
  labelNarrow: { width: '100%' },
  value: { flex: 1, minWidth: 0, color: colors.text, fontWeight: '700' },
  rawCard: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', marginTop: 14, marginBottom: 24 },
  raw: { fontFamily: 'monospace', color: colors.text, fontSize: 12, lineHeight: 18 },
});
