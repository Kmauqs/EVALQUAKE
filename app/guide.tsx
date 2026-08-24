import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/ui';
import { GuideBody } from '@/guide/GuideBody';
import { useGuideBlocks } from '@/guide/useGuideBlocks';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { colors, layout } from '@/theme';

export default function InspectionGuideScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const goBack = useSafeBack('/');
  const { width } = useWindowDimensions();
  const sections = useGuideBlocks(language);

  return (
    <AppShell>
      <View style={styles.top}>
        <Pressable onPress={goBack} style={styles.back} accessibilityLabel={t.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.kicker}>{t.guideKicker}</Text>
          <Text style={styles.title}>{t.guide}</Text>
          <Text style={styles.hint}>{t.guideCollapsedHint}</Text>
        </View>
      </View>

      <GuideBody sections={sections} stacked={width < 720} />

      <Pressable onPress={() => router.replace('/')} style={styles.homeLink}>
        <Text style={styles.homeLinkText}>{t.back}</Text>
      </Pressable>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  top: {
    width: '100%',
    maxWidth: layout.contentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heading: { flex: 1, minWidth: 0 },
  kicker: { color: colors.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 2 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 6 },
  homeLink: { alignSelf: 'center', marginVertical: 22 },
  homeLinkText: { color: colors.primary, fontWeight: '800' },
});
