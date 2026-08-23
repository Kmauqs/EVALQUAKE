import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle2, FileText, Tag, Trash2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { EvaluationSection } from '@/components/EvaluationSection';
import { AppShell, Button, Card, ClassificationBadge, SectionProgress } from '@/components/ui';
import type { Evaluation } from '@/domain/evaluation';
import {
  canDeleteEvaluation,
  lastSectionIndex,
  sectionCountFor,
  sectionKeysFor,
  validateForSubmission,
} from '@/domain/evaluation';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { renderPlacardHtml } from '@/report/renderPlacardHtml';
import { renderReportHtml } from '@/report/renderReportHtml';
import { confirmDestructive } from '@/services/confirm';
import { captureCoordinates, pickDamagePhoto, pickDamagePhotos } from '@/services/device';
import { exportQuantitiesCsv } from '@/services/exportData';
import { openHtmlDocument } from '@/services/htmlDocument';
import { hydrateEvaluationImages } from '@/services/resolveImage';
import { useEvaluations } from '@/state/EvaluationProvider';
import { colors, layout } from '@/theme';

export default function EvaluationWizard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useSafeBack('/(evaluator)');
  const { t, language } = useI18n();
  const { width } = useWindowDimensions();
  const narrow = width < layout.compactWidth;
  const { get, save, remove } = useEvaluations();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [section, setSection] = useState(0);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const evaluationRef = useRef<Evaluation | null>(null);
  const [message, setMessage] = useState('');
  evaluationRef.current = evaluation;

  useEffect(() => {
    if (!id) return;
    get(id).then((value) => {
      if (!value) return;
      setEvaluation(value);
      setSection(value.currentSection);
    });
  }, [id, get]);

  useEffect(() => {
    if (deletingRef.current || deleting || !evaluation || evaluation.status !== 'draft') return;
    const timeout = setTimeout(() => {
      if (deletingRef.current) return;
      void save({ ...evaluation, currentSection: section }).then(() => setMessage(t.save));
    }, 700);
    return () => clearTimeout(timeout);
  }, [evaluation, section, save, t.save, deleting]);

  if (!evaluation) {
    return (
      <AppShell>
        <Text style={styles.loading}>…</Text>
      </AppShell>
    );
  }

  const keys = sectionKeysFor(evaluation);
  const total = sectionCountFor(evaluation);
  const last = lastSectionIndex(evaluation);
  const current = Math.min(section, last);
  const sectionKey = keys[current] ?? 'cadastral';

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

  if (evaluation.status !== 'draft') {
    return (
      <AppShell>
        <Card style={styles.submittedCard}>
          <ClassificationBadge value={evaluation.habitability} />
          <Text style={styles.submittedTitle}>
            {evaluation.building.address || evaluation.id}
          </Text>
          <Text style={styles.officialNumber}>
            {evaluation.officialNumber
              ? `#${evaluation.officialNumber}`
              : t.officialPending}
          </Text>
          <Text style={styles.submittedDescription}>{t.immutableNotice}</Text>
          <View style={styles.submittedActions}>
            <Button variant="ghost" onPress={goBack} style={styles.actionButton}>
              {t.back}
            </Button>
            <Button
              variant="secondary"
              icon={<Tag size={18} color={colors.primary} />}
              onPress={() => void openPlacard()}
              style={styles.actionButton}
            >
              {t.generatePlacard}
            </Button>
            <Button
              variant="secondary"
              icon={<FileText size={18} color={colors.primary} />}
              onPress={() => void openReport()}
              style={styles.actionButton}
            >
              {t.viewReport}
            </Button>
            <Button
              variant="ghost"
              icon={<FileText size={18} color={colors.primary} />}
              onPress={() => void exportQuantitiesCsv([evaluation], language)}
              style={styles.actionButton}
            >
              {t.exportQuantitiesCsv}
            </Button>
          </View>
        </Card>
      </AppShell>
    );
  }

  const go = async (next: number) => {
    const bounded = Math.max(0, Math.min(last, next));
    const updated = { ...evaluation, currentSection: bounded };
    setSection(bounded);
    setEvaluation(updated);
    await save(updated);
  };

  const locate = async () => {
    try {
      const coordinates = await captureCoordinates();
      setEvaluation({
        ...evaluation,
        identification: { ...evaluation.identification, coordinates },
      });
    } catch {
      Alert.alert(t.captureLocation, t.offline);
    }
  };

  const addPhoto = async (source: 'camera' | 'library') => {
    try {
      const current = evaluationRef.current;
      if (!current) return;
      const photos = await pickDamagePhotos(source, current.identification.coordinates);
      const latest = evaluationRef.current ?? current;
      if (!photos.length) return;
      const next = { ...latest, photos: [...latest.photos, ...photos] };
      setEvaluation(next);
      await save(next);
    } catch {
      Alert.alert(t.addPhoto, t.photoFailed);
    }
  };

  const addSketch = async (source: 'camera' | 'library') => {
    try {
      const current = evaluationRef.current;
      if (!current) return;
      const image = await pickDamagePhoto(source, current.identification.coordinates);
      const latest = evaluationRef.current ?? current;
      if (!image) return;
      const next = {
        ...latest,
        sketchUri: image.localUri,
        sketchStoragePath: undefined,
      };
      setEvaluation(next);
      await save(next);
    } catch {
      Alert.alert(t.sketch, t.photoFailed);
    }
  };

  const submit = async () => {
    const validation = validateForSubmission(evaluation);
    if (!validation.success) {
      Alert.alert(t.submissionError, validation.error.issues.map((issue) => issue.path.join('.')).join('\n'));
      return;
    }
    setBusy(true);
    try {
      const submitted: Evaluation = {
        ...evaluation,
        status: 'submitted',
        syncState: 'pending',
        reportLanguage: language,
        currentSection: last,
        updatedAt: new Date().toISOString(),
      };
      await save(submitted);
      setEvaluation(submitted);
      Alert.alert(t.submitted, t.immutableNotice, [{ text: t.close, onPress: goBack }]);
    } finally {
      setBusy(false);
    }
  };

  const requestDelete = () => {
    confirmDestructive(
      t.deleteEvaluationTitle,
      t.deleteEvaluationConfirm,
      t.deleteEvaluation,
      t.cancel,
      () => {
        deletingRef.current = true;
        setDeleting(true);
        void remove(evaluation.id)
          .then(goBack)
          .catch(() => {
            deletingRef.current = false;
            setDeleting(false);
            Alert.alert(t.deleteEvaluationTitle, t.deleteFailed);
          });
      },
    );
  };

  return (
    <AppShell>
      <View style={[styles.titleRow, narrow && styles.titleRowNarrow]}>
        <Pressable onPress={goBack} style={styles.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.titleCopy}>
          <Text style={styles.id}>{evaluation.id}</Text>
          <Text style={styles.address}>
            {evaluation.building.address || t.newEvaluation}
          </Text>
        </View>
        <View style={[styles.saved, narrow && styles.savedNarrow]}>
          <Text style={styles.savedText}>{message || t.pendingSync}</Text>
        </View>
      </View>

      <Card style={styles.formCard}>
        <SectionProgress
          current={current}
          total={total}
          title={t.sections[sectionKey]}
          onBack={current > 0 ? () => void go(current - 1) : undefined}
          onNext={current < last ? () => void go(current + 1) : undefined}
        />
        <View style={styles.divider} />
        <EvaluationSection
          sectionKey={sectionKey}
          evaluation={evaluation}
          onChange={(next) => {
            setMessage('');
            const nextLast = lastSectionIndex(next);
            if (section > nextLast) setSection(nextLast);
            setEvaluation(next);
          }}
          onLocation={() => void locate()}
          onPhoto={(source) => void addPhoto(source)}
          onSketch={(source) => void addSketch(source)}
        />
        <View style={styles.divider} />
        <View style={styles.actions}>
          <View style={styles.actionsGroup}>
            {current > 0 && (
              <Button variant="ghost" onPress={() => void go(current - 1)} style={styles.actionButton}>
                {t.back}
              </Button>
            )}
            {canDeleteEvaluation(evaluation) && (
              <Button
                variant="danger"
                icon={<Trash2 size={18} color={colors.white} />}
                loading={deleting}
                onPress={requestDelete}
                style={styles.actionButton}
              >
                {t.deleteEvaluation}
              </Button>
            )}
          </View>
          <View style={styles.actionsGroup}>
            {current === last && (
              <>
                <Button
                  variant="ghost"
                  icon={<Tag size={18} color={colors.primary} />}
                  loading={busy}
                  onPress={() => void openPlacard()}
                  style={styles.actionButton}
                >
                  {t.generatePlacard}
                </Button>
                <Button
                  variant="secondary"
                  icon={<FileText size={18} color={colors.primary} />}
                  loading={busy}
                  onPress={() => void openReport()}
                  style={styles.actionButton}
                >
                  {t.viewReport}
                </Button>
              </>
            )}
            {current < last ? (
              <Button onPress={() => void go(current + 1)} style={styles.actionButton}>
                {t.next}
              </Button>
            ) : (
              <Button
                icon={<CheckCircle2 size={18} color={colors.white} />}
                loading={busy}
                onPress={() => void submit()}
                style={styles.actionButton}
              >
                {t.submit}
              </Button>
            )}
          </View>
        </View>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loading: { textAlign: 'center', color: colors.primary, marginTop: 60 },
  titleRow: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  titleRowNarrow: { flexWrap: 'wrap', alignItems: 'flex-start' },
  back: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleCopy: { flex: 1, minWidth: 0 },
  id: { color: colors.primary, fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  address: { color: colors.text, fontWeight: '900', fontSize: 19, marginTop: 2, lineHeight: 24 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0, maxWidth: 160 },
  savedNarrow: { maxWidth: '100%', width: '100%', paddingLeft: 56 },
  savedText: { color: colors.textMuted, fontSize: 11, flexShrink: 1 },
  formCard: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'stretch', marginTop: 15, marginBottom: 24, minWidth: 0 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 22 },
  actions: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  actionsGroup: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  actionButton: { width: '100%', maxWidth: '100%', alignSelf: 'stretch', flexShrink: 1 },
  submittedCard: { width: '100%', maxWidth: 620, alignSelf: 'center', marginTop: 40, gap: 14, minWidth: 0 },
  submittedTitle: { color: colors.text, fontSize: 25, fontWeight: '900' },
  officialNumber: { color: colors.primary, fontSize: 17, fontWeight: '900' },
  submittedDescription: { color: colors.textMuted, lineHeight: 21 },
  submittedActions: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    marginTop: 8,
  },
});
