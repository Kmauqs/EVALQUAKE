import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle2, FileText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { EvaluationSection } from '@/components/EvaluationSection';
import { AppShell, Button, Card, ClassificationBadge, SectionProgress } from '@/components/ui';
import type { Evaluation } from '@/domain/evaluation';
import {
  lastSectionIndex,
  sectionCountFor,
  sectionKeysFor,
  validateForSubmission,
} from '@/domain/evaluation';
import { resolveAttachmentUrl } from '@/firebase/repository';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { renderReportHtml } from '@/report/renderReportHtml';
import { captureCoordinates, pickDamagePhoto, pickDamagePhotos } from '@/services/device';
import { createPdf, sharePdf } from '@/services/pdf';
import { useEvaluations } from '@/state/EvaluationProvider';
import { colors, layout } from '@/theme';

export default function EvaluationWizard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useSafeBack('/(evaluator)');
  const { t, language } = useI18n();
  const { get, save } = useEvaluations();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [section, setSection] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    get(id).then((value) => {
      if (!value) return;
      setEvaluation(value);
      setSection(value.currentSection);
    });
  }, [id, get]);

  useEffect(() => {
    if (!evaluation || evaluation.status !== 'draft') return;
    const timeout = setTimeout(() => {
      void save({ ...evaluation, currentSection: section }).then(() => setMessage(t.save));
    }, 700);
    return () => clearTimeout(timeout);
  }, [evaluation, section, save, t.save]);

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

  const openExistingReport = async () => {
    let uri = Platform.OS === 'web' ? undefined : evaluation.localPdfUri;
    if (!uri && evaluation.canonicalPdfStoragePath) {
      uri = (await resolveAttachmentUrl(evaluation.canonicalPdfStoragePath)) ?? undefined;
    }
    uri ??= await createPdf(renderReportHtml(evaluation, evaluation.reportLanguage ?? language));
    if (uri.startsWith('http')) await Linking.openURL(uri);
    else await sharePdf(uri);
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
            <Button variant="ghost" onPress={goBack}>
              {t.back}
            </Button>
            <Button
              icon={<FileText size={18} color={colors.white} />}
              onPress={() => void openExistingReport()}
            >
              {t.generatePdf}
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
      const photos = await pickDamagePhotos(source, evaluation.identification.coordinates);
      if (photos.length) {
        setEvaluation({ ...evaluation, photos: [...evaluation.photos, ...photos] });
      }
    } catch {
      Alert.alert(t.addPhoto, t.offline);
    }
  };

  const addSketch = async (source: 'camera' | 'library') => {
    try {
      const image = await pickDamagePhoto(source, evaluation.identification.coordinates);
      if (image) {
        setEvaluation({
          ...evaluation,
          sketchUri: image.localUri,
          sketchStoragePath: undefined,
        });
      }
    } catch {
      Alert.alert(t.sketch, t.offline);
    }
  };

  const generate = async () => {
    setBusy(true);
    try {
      const uri = await createPdf(renderReportHtml(evaluation, language));
      const updated = { ...evaluation, localPdfUri: uri, reportLanguage: language };
      setEvaluation(updated);
      await save(updated);
      await sharePdf(uri);
    } finally {
      setBusy(false);
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
      const uri = evaluation.localPdfUri ?? (await createPdf(renderReportHtml(evaluation, language)));
      const submitted: Evaluation = {
        ...evaluation,
        localPdfUri: uri,
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

  return (
    <AppShell>
      <View style={styles.titleRow}>
        <Pressable onPress={goBack} style={styles.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.titleCopy}>
          <Text style={styles.id}>{evaluation.id}</Text>
          <Text style={styles.address}>
            {evaluation.building.address || t.newEvaluation}
          </Text>
        </View>
        <View style={styles.saved}>
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
          {current > 0 && (
            <Button variant="ghost" onPress={() => void go(current - 1)}>
              {t.back}
            </Button>
          )}
          <View style={styles.actionsRight}>
            {current === last && (
              <Button
                variant="secondary"
                icon={<FileText size={18} color={colors.primary} />}
                loading={busy}
                onPress={() => void generate()}
              >
                {t.generatePdf}
              </Button>
            )}
            {current < last ? (
              <Button onPress={() => void go(current + 1)}>{t.next}</Button>
            ) : (
              <Button
                icon={<CheckCircle2 size={18} color={colors.white} />}
                loading={busy}
                onPress={() => void submit()}
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
  back: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  titleCopy: { flex: 1 },
  id: { color: colors.primary, fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  address: { color: colors.text, fontWeight: '900', fontSize: 19, marginTop: 2 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  savedText: { color: colors.textMuted, fontSize: 11 },
  formCard: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', marginTop: 15, marginBottom: 24 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 22 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  actionsRight: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, flex: 1 },
  submittedCard: { width: '100%', maxWidth: 620, alignSelf: 'center', marginTop: 40, gap: 14 },
  submittedTitle: { color: colors.text, fontSize: 25, fontWeight: '900' },
  officialNumber: { color: colors.primary, fontSize: 17, fontWeight: '900' },
  submittedDescription: { color: colors.textMuted, lineHeight: 21 },
  submittedActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
});
