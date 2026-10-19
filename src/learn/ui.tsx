import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { Paragraph } from './data';
import { Palette, useStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';



/** Ichki sahifa sarlavhasi: orqaga tugmasi + nom */
export function LearnHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack: () => void; right?: React.ReactNode }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={10} accessibilityLabel={t("Orqaga")}>
        <ChevronLeft size={22} color={T.text} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle} numberOfLines={2}>{title}</Text>
        {!!subtitle && <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

/** Ro'yxat qatori */
export function Row({ title, subtitle, onPress, left, badge }: { title: string; subtitle?: string; onPress: () => void; left?: React.ReactNode; badge?: string | number }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSub} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {badge !== undefined && <Text style={styles.badge}>{badge}</Text>}
      <ChevronRight size={18} color={T.faint} />
    </TouchableOpacity>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  return <Text style={styles.sectionTitle}>{children}</Text>;
}


/** Asl ilovadagi rang belgilari saqlangan matn (qizil/yashil kontaktlar, ko'k simlar, qalin sarlavhalar) */
export function RichParagraphs({ paragraphs }: { paragraphs: Paragraph[] }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const RUN_COLORS: Record<string, string> = { r: T.red, g: T.green, u: T.brandText };
  return (
    <>
      {paragraphs.map((p, i) => (
        <Text key={i} style={styles.para} selectable>
          {p.map((r, j) => {
            const st = r[1] ?? '';
            const color = [...st].map((ch) => RUN_COLORS[ch]).find(Boolean);
            return (
              <Text key={j} style={[st.includes('b') && styles.bold, color ? { color } : null]}>
                {r[0]}
              </Text>
            );
          })}
        </Text>
      ))}
    </>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: T.text },
  headerSub: { fontSize: 12, color: T.muted, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: T.text, lineHeight: 20 },
  rowSub: { fontSize: 12, color: T.muted, marginTop: 3 },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: T.brandBright,
    backgroundColor: T.brandSoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: T.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  para: { fontSize: 15, lineHeight: 23, color: T.text, marginBottom: 8 },
  bold: { fontWeight: '700' },
});
