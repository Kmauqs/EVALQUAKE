import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Braces, FileText, MapPin } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppShell, Button, Card, ClassificationBadge } from '@/components/ui';
import type { Evaluation } from '@/domain/evaluation';
import { demoEvaluations } from '@/domain/fixtures';
import { pullEvaluation } from '@/firebase/repository';
import { useI18n } from '@/i18n/I18nProvider';
import { renderReportHtml } from '@/report/renderReportHtml';
import { createPdf, sharePdf } from '@/services/pdf';
import { useEvaluations } from '@/state/EvaluationProvider';
import { colors, layout } from '@/theme';

export default function EvaluationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useI18n();
  const { configured } = useAuth();
  const { get } = useEvaluations();
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(
    demoEvaluations.find((item) => item.id === id) ?? null,
  );
  const [raw, setRaw] = useState(false);

  useEffect(() => {
    if (!id || evaluation) return;
    void (configured ? pullEvaluation(id) : get(id)).then(setEvaluation);
  }, [configured, id, evaluation, get]);

  if (!evaluation) {
    return (
      <AppShell>
        <Text style={styles.loading}>…</Text>
      </AppShell>
    );
  }

  const openReport = async () => {
    const uri = evaluation.localPdfUri ?? (await createPdf(renderReportHtml(evaluation, language)));
    await sharePdf(uri);
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
    [t.fields.entity, evaluation.inspectors[0]?.entity],
    [t.fields.comments, evaluation.comments],
  ];

  return (
    <AppShell>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.id}>
            {evaluation.officialNumber ? `#${evaluation.officialNumber}` : evaluation.id}
          </Text>
          <Text style={styles.title}>{evaluation.building.address}</Text>
          <View style={styles.location}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={styles.locationText}>
              {evaluation.identification.neighborhood}, {evaluation.identification.municipality}
            </Text>
          </View>
        </View>
        <ClassificationBadge value={evaluation.habitability} />
      </View>

      <View style={styles.actions}>
        <Button
          icon={<FileText size={18} color={colors.white} />}
          onPress={() => void openReport()}
        >
          {t.report}
        </Button>
        <Button
          variant="ghost"
          icon={<Braces size={18} color={colors.primary} />}
          onPress={() => setRaw(!raw)}
        >
          {t.rawData}
        </Button>
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
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
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
  back: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1 },
  id: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  title: { color: colors.text, fontSize: 27, fontWeight: '900', marginTop: 4 },
  location: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 7 },
  locationText: { color: colors.textMuted, fontSize: 13 },
  actions: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', flexDirection: 'row', gap: 9, marginTop: 20 },
  detailCard: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', marginTop: 14, marginBottom: 24, padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 16, padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { width: '38%', color: colors.textMuted, fontWeight: '700' },
  value: { flex: 1, color: colors.text, fontWeight: '700' },
  rawCard: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', marginTop: 14, marginBottom: 24 },
  raw: { fontFamily: 'monospace', color: colors.text, fontSize: 12, lineHeight: 18 },
});
