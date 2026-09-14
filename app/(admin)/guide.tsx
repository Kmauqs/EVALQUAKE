import { type Href, useRouter } from 'expo-router';
import { ArrowLeft, BookOpen } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppShell, Button, Card } from '@/components/ui';
import type { Language } from '@/domain/evaluation';
import { firebaseConfigured } from '@/firebase/client';
import { saveGuideContent, subscribeGuideContent } from '@/firebase/guide';
import { GuideBody } from '@/guide/GuideBody';
import { bundledGuideMarkdown, tryParseGuideMarkdown } from '@/guide/markdown';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { colors, layout } from '@/theme';

export default function AdminGuideEditorScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const goBack = useSafeBack('/(admin)');
  const { width } = useWindowDimensions();
  const stacked = width < 980;
  const [language, setLanguage] = useState<Language>('es');
  const [es, setEs] = useState(bundledGuideMarkdown('es'));
  const [en, setEn] = useState(bundledGuideMarkdown('en'));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(
    () =>
      subscribeGuideContent((content) => {
        setUpdatedAt(content?.updatedAt ?? '');
        if (dirty) return;
        setEs(content?.es?.trim() ? content.es : bundledGuideMarkdown('es'));
        setEn(content?.en?.trim() ? content.en : bundledGuideMarkdown('en'));
      }),
    [dirty],
  );

  const draft = language === 'es' ? es : en;
  const setDraft = (value: string) => {
    setDirty(true);
    if (language === 'es') setEs(value);
    else setEn(value);
  };

  const previewState = useMemo(() => tryParseGuideMarkdown(draft), [draft]);

  const save = async () => {
    setBusy(true);
    try {
      await saveGuideContent({
        es,
        en,
        updatedBy: user?.uid ?? '',
        updatedByEmail: user?.email ?? '',
      });
      setDirty(false);
    } catch {
      Alert.alert(t.guideEditor, t.guideEditorSaveError);
    } finally {
      setBusy(false);
    }
  };

  const restore = () => {
    Alert.alert(t.guideEditor, t.guideEditorRestoreConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.guideEditorRestore,
        onPress: () => {
          setDirty(true);
          setEs(bundledGuideMarkdown('es'));
          setEn(bundledGuideMarkdown('en'));
        },
      },
    ]);
  };

  return (
    <AppShell>
      <View style={[styles.titleRow, stacked && styles.titleRowNarrow]}>
        <Pressable onPress={goBack} style={styles.back} accessibilityLabel={t.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{t.admin}</Text>
          <Text style={[styles.title, stacked && styles.titleNarrow]}>{t.guideEditor}</Text>
          <Text style={styles.subtitle}>{t.guideEditorDescription}</Text>
          {updatedAt ? (
            <Text style={styles.meta}>
              {t.updated}: {new Date(updatedAt).toLocaleString()}
            </Text>
          ) : null}
        </View>
        <Button
          variant="secondary"
          icon={<BookOpen size={17} color={colors.primary} />}
          onPress={() => router.push('/guide' as Href)}
        >
          {t.guide}
        </Button>
      </View>

      <Card style={styles.help}>
        <Text style={styles.helpText}>{t.guideEditorHelp}</Text>
      </Card>

      <View style={styles.filters}>
        {(['es', 'en'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setLanguage(value)}
            style={[styles.filterChip, language === value && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, language === value && styles.filterTextActive]}>
              {value === 'es' ? t.spanish : t.english}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.workspace, stacked && styles.workspaceStacked]}>
        <View style={styles.pane}>
          <Text style={styles.paneLabel}>{t.guideEditorSource}</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
            style={styles.editor}
          />
        </View>
        <View style={styles.pane}>
          <Text style={styles.paneLabel}>{t.guideEditorPreview}</Text>
          {previewState.error ? <Text style={styles.error}>{previewState.error}</Text> : null}
          <GuideBody sections={previewState.blocks} stacked defaultOpen fillWidth />
        </View>
      </View>

      <View style={styles.actions}>
        <Button loading={busy} disabled={!firebaseConfigured} onPress={() => void save()} style={styles.action}>
          {t.save}
        </Button>
        <Button variant="secondary" disabled={busy} onPress={restore} style={styles.action}>
          {t.guideEditorRestore}
        </Button>
      </View>
      {!firebaseConfigured ? <Text style={styles.demo}>{t.guideEditorDemo}</Text> : null}
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
  titleNarrow: { fontSize: 24, lineHeight: 30 },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  meta: { color: colors.textMuted, marginTop: 6, fontSize: 12 },
  help: { marginTop: 16 },
  helpText: { color: colors.textMuted, lineHeight: 20, fontSize: 13 },
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
  workspace: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginTop: 16 },
  workspaceStacked: { flexDirection: 'column' },
  pane: { flex: 1, minWidth: 0, width: '100%' },
  paneLabel: { color: colors.primary, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', marginBottom: 8 },
  editor: {
    minHeight: Platform.OS === 'web' ? 560 : 320,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.radiusSmall,
    backgroundColor: colors.white,
    color: colors.text,
    padding: 12,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.select({ web: 'ui-monospace, SFMono-Regular, Consolas, monospace', default: undefined }),
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18, marginBottom: 28 },
  action: { flexGrow: 1, minWidth: 160 },
  demo: { color: colors.warning, marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 8, fontWeight: '700' },
});
