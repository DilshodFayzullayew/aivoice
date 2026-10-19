import React, { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { RotateCcw, WifiOff } from 'lucide-react-native';
import { getApiBaseUrl } from '../api/voiceApi';
import { useScreenContentStyle } from '../layout';
import { getDocs } from './data';
import { LearnHeader, Row, SectionTitle } from './ui';
import { Palette, useStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';

/** ПТЭ / ИДП / ИСИ / Билеты — hujjatlar ro'yxati */
export function DocsHome({ onBack, onOpenGroup }: { onBack: () => void; onOpenGroup: (group: number) => void }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const groups = getDocs();
  return (
    <View style={{ flex: 1 }}>
      <LearnHeader title="ПТЭ, ИДП, ИСИ" subtitle={t("Qoidalar, yo‘riqnomalar va biletlar")} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.pad, contentStyle]}>
        {groups.map((g, i) => (
          <Row key={g.key} title={g.title} subtitle={g.full} badge={g.pages.length} onPress={() => onOpenGroup(i)} />
        ))}
        <Text style={styles.note}>{t("Hujjatlar Rossiya Federatsiyasi qoidalari asosida. Ochish uchun server bilan aloqa kerak.")}</Text>
      </ScrollView>
    </View>
  );
}

export function DocPages({ group, onBack, onOpen }: { group: number; onBack: () => void; onOpen: (file: string, title: string) => void }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const g = getDocs()[group];
  return (
    <View style={{ flex: 1 }}>
      <LearnHeader title={g.title} subtitle={g.full} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.pad, contentStyle]}>
        <SectionTitle>{t("Mundarija")}</SectionTitle>
        {g.pages.map((p) => (
          <Row key={p.file} title={p.title} onPress={() => onOpen(p.file, p.title)} />
        ))}
      </ScrollView>
    </View>
  );
}

/** Hujjat sahifasi (jadval va rasmlari bilan) — serverdan */
export function DocView({ file, title, onBack }: { file: string; title: string; onBack: () => void }) {
  const { T, mode } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const { paddingBottom } = useScreenContentStyle(true);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const ref = useRef<WebView>(null);
  // Sahifa ilovadagi rejimda (kunduzgi / tungi) ochiladi
  const uri = `${getApiBaseUrl()}/media/learn/pte/${file}?theme=${mode}`;

  return (
    <View style={{ flex: 1 }}>
      <LearnHeader title={title} onBack={onBack} />
      <View style={[styles.webBox, { marginBottom: paddingBottom as number }]}>
        {failed ? (
          <View style={styles.center}>
            <WifiOff size={32} color={T.muted} />
            <Text style={styles.failText}>{t("Hujjatni yuklab bo‘lmadi. Internet yoki server bilan aloqani tekshiring.")}</Text>
            <TouchableOpacity
              style={styles.retry}
              onPress={() => {
                setFailed(false);
                setLoading(true);
                ref.current?.reload();
              }}
            >
              <RotateCcw size={16} color={T.brandBright} />
              <Text style={styles.retryText}>{t("Qayta urinish")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={ref}
            source={{ uri }}
            onLoadEnd={() => setLoading(false)}
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
            setSupportMultipleWindows={false}
            style={{ backgroundColor: T.surface }}
          />
        )}
        {loading && !failed && (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <ActivityIndicator size="large" color={T.brandBright} />
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  note: { fontSize: 12, color: T.muted, marginTop: 12, lineHeight: 18 },
  webBox: { flex: 1, marginHorizontal: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  failText: { textAlign: 'center', color: T.muted, fontSize: 14 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: T.brandSoft },
  retryText: { color: T.brandBright, fontWeight: '700' },
});
