import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell, Card } from '@/components/ui';
import { guideBlocks } from '@/guide/content';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { colors, layout } from '@/theme';

export default function InspectionGuideScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const goBack = useSafeBack('/');
  const sections = guideBlocks(language);

  return (
    <AppShell>
      <View style={styles.top}>
        <Pressable onPress={goBack} style={styles.back} accessibilityLabel={t.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.kicker}>{t.guideKicker}</Text>
          <Text style={styles.title}>{t.guide}</Text>
        </View>
      </View>

      {sections.map((section) => (
        <Card key={section.id} style={styles.card}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs?.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
          {section.bullets?.map((item) => (
            <Text key={item} style={styles.bullet}>
              • {item}
            </Text>
          ))}
          {section.groups?.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.bullets.map((item) => (
                <Text key={item} style={styles.bullet}>
                  • {item}
                </Text>
              ))}
            </View>
          ))}
        </Card>
      ))}

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>{t.elevatorReference}</Text>
        <Image source={require('../assets/elevator-atc20.png')} style={styles.figure} resizeMode="contain" />
        <Text style={styles.caption}>{t.guideFigureCaption}</Text>
      </Card>

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
    alignItems: 'center',
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
  },
  heading: { flex: 1 },
  kicker: { color: colors.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 2 },
  card: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', marginTop: 12, gap: 10 },
  sectionTitle: { color: colors.primaryDark, fontSize: 18, fontWeight: '900' },
  paragraph: { color: colors.text, lineHeight: 22, fontSize: 15 },
  bullet: { color: colors.text, lineHeight: 22, fontSize: 15, paddingLeft: 4 },
  group: { gap: 6, marginTop: 4 },
  groupTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  figure: { width: '100%', height: 280, backgroundColor: colors.white, borderRadius: 8 },
  caption: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  homeLink: { alignSelf: 'center', marginVertical: 22 },
  homeLinkText: { color: colors.primary, fontWeight: '800' },
});
