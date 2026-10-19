import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, ChevronDown, Timer } from 'lucide-react-native';
import { useScreenContentStyle } from '../layout';
import { getTests, shuffle } from './data';
import { LearnHeader, Row, SectionTitle } from './ui';
import { Palette, useStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';

const PROFESSION_KEY = 'learn_profession';
const EXAM_SIZE = 20;

export type StartQuiz = (title: string, qids: number[]) => void;

interface Props {
  onBack: () => void;
  onStart: StartQuiz;
  onOpenDocTopics: (docIndex: number) => void;
}

export default function TestsHome({ onBack, onStart, onOpenDocTopics }: Props) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const data = getTests();
  const [prof, setProf] = useState(0);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PROFESSION_KEY)
      .then((v) => v !== null && Number(v) < data.professions.length && setProf(Number(v)))
      .catch(() => {});
  }, [data.professions.length]);

  const choose = (i: number) => {
    setProf(i);
    setPicker(false);
    AsyncStorage.setItem(PROFESSION_KEY, String(i)).catch(() => {});
  };

  const profession = data.professions[prof];
  const all = profession.topics.flatMap((t) => t.q);

  return (
    <View style={{ flex: 1 }}>
      <LearnHeader title={t("Testlar")} subtitle={t("Bilimingizni sinab ko‘ring")} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.pad, contentStyle]}>
        <TouchableOpacity style={styles.profBtn} onPress={() => setPicker(true)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.profLabel}>{t("Kasb")}</Text>
            <Text style={styles.profName}>{profession.name}</Text>
          </View>
          <ChevronDown size={20} color={T.brandBright} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.examCard} onPress={() => onStart(`${t('Imtihon')}: ${profession.name}`, shuffle(all).slice(0, EXAM_SIZE))}>
          <Timer size={26} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.examTitle}>{t("Imtihon")}</Text>
            <Text style={styles.examSub}>{t('{n} ta tasodifiy savol • barcha mavzulardan', { n: EXAM_SIZE })}</Text>
          </View>
        </TouchableOpacity>

        <SectionTitle>{t("Mavzular bo‘yicha")}</SectionTitle>
        {profession.topics.map((t) => (
          <Row key={t.name} title={t.name} badge={t.q.length} onPress={() => onStart(t.name, t.q)} />
        ))}

        <SectionTitle>{t("Hujjatlar bo‘yicha")}</SectionTitle>
        {data.documents.map((d, i) => (
          <Row
            key={d.name}
            title={d.name}
            subtitle={`${d.full} • ${t('{n} bo‘lim', { n: d.topics.length })}`}
            badge={d.topics.reduce((n, t) => n + t.q.length, 0)}
            onPress={() => onOpenDocTopics(i)}
          />
        ))}
      </ScrollView>

      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPicker(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("Kasbni tanlang")}</Text>
            <ScrollView>
              {data.professions.map((p, i) => (
                <TouchableOpacity key={p.name} style={styles.sheetRow} onPress={() => choose(i)}>
                  <Text style={[styles.sheetText, i === prof && { color: T.brandBright, fontWeight: '700' }]}>{p.name}</Text>
                  {i === prof && <Check size={18} color={T.brandBright} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** ПТЭ / ИСИ / ИДП bo'limlari ro'yxati */
export function DocTopics({ docIndex, onBack, onStart }: { docIndex: number; onBack: () => void; onStart: StartQuiz }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const doc = getTests().documents[docIndex];
  const all = doc.topics.flatMap((t) => t.q);
  return (
    <View style={{ flex: 1 }}>
      <LearnHeader title={t('{name} bo‘yicha testlar', { name: doc.name })} subtitle={doc.full} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.pad, contentStyle]}>
        <Row title={t("Barcha savollar")} subtitle={t("Hamma bo‘limlar aralash")} badge={all.length} onPress={() => onStart(doc.name, all)} />
        <SectionTitle>{t("Bo‘limlar")}</SectionTitle>
        {doc.topics.map((t) => (
          <Row key={t.name} title={t.name} badge={t.q.length} onPress={() => onStart(t.name, t.q)} />
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  profBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.brandSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  profLabel: { fontSize: 11, fontWeight: '800', color: T.brandBright, textTransform: 'uppercase' },
  profName: { fontSize: 16, fontWeight: '700', color: T.text, marginTop: 2 },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: T.brandBright,
    borderRadius: 16,
    padding: 18,
  },
  examTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  examSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '75%' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: T.text, marginBottom: 8 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sheetText: { fontSize: 15, color: T.text },
});
