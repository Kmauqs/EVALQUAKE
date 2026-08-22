import { PenLine, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { colors } from '@/theme';
import { DrawPad } from './DrawPad';
import { Button } from './ui';

export function SignatureCapture({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value?: string) => void;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>{t.signature}</Text>
        {value && (
          <Pressable onPress={() => onChange(undefined)}>
            <Text style={styles.clear}>{t.clear}</Text>
          </Pressable>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.openSignature}
        onPress={() => setVisible(true)}
        style={styles.preview}
      >
        {value ? (
          <Image source={{ uri: value }} resizeMode="contain" style={styles.image} />
        ) : (
          <>
            <PenLine size={28} color={colors.primary} />
            <Text style={styles.placeholder}>{t.openSignature}</Text>
          </>
        )}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalTitle}>{t.signature}</Text>
                <Text style={styles.instructions}>{t.signatureInstructions}</Text>
              </View>
              <Pressable
                accessibilityLabel={t.close}
                onPress={() => setVisible(false)}
                style={styles.close}
              >
                <X size={21} color={colors.text} />
              </Pressable>
            </View>
            <DrawPad label={t.signature} value={value} onChange={onChange} />
            <Button onPress={() => setVisible(false)} style={styles.done}>
              {t.close}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexGrow: 1, flexBasis: 280, minWidth: 0, maxWidth: '100%', gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  clear: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  preview: {
    height: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 9,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  overlay: {
    flex: 1,
    backgroundColor: '#0D2519B8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: 18,
    gap: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalHeading: { flex: 1, minWidth: 0 },
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: '900' },
  instructions: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { alignSelf: 'flex-end', minWidth: 130 },
});
