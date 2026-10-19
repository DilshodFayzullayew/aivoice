import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react-native';
import { useScreenContentStyle } from '../layout';
import { getTests, shuffle } from './data';
import { LearnHeader } from './ui';
import { Palette, useStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';

interface Props {
  title: string;
  qids: number[];
  onBack: () => void;
}

/** Test: bitta savol, javob bosilganda darhol to'g'ri/noto'g'ri ko'rsatiladi */
export default function QuizView({ title, qids, onBack }: Props) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const pool = getTests().q;
  const [round, setRound] = useState(0);
  const [source, setSource] = useState(qids);
  const order = useMemo(() => shuffle(source), [source, round]);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const restart = (ids: number[]) => {
    setSource(ids);
    setRound((r) => r + 1);
    setIdx(0);
    setChosen(null);
    setWrong([]);
    setCorrect(0);
    setFinished(false);
  };

  const answered = idx + (chosen !== null ? 1 : 0);

  if (finished || idx >= order.length) {
    const total = answered;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const good = pct >= 80;
    return (
      <View style={{ flex: 1 }}>
        <LearnHeader title={title} onBack={onBack} />
        <ScrollView contentContainerStyle={[styles.pad, contentStyle]}>
          <View style={styles.resultCard}>
            <Text style={[styles.resultPct, { color: good ? T.green : pct >= 50 ? T.amber : T.red }]}>{pct}%</Text>
            <Text style={styles.resultText}>
              {t('{total} ta savoldan {correct} tasiga to‘g‘ri javob berdingiz', { total, correct })}
            </Text>
            <Text style={styles.resultHint}>{good ? t("Ajoyib natija!") : pct >= 50 ? t("Yaxshi, lekin yana mashq qiling.") : t("Mavzuni qayta takrorlang.")}</Text>
          </View>
          {wrong.length > 0 && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => restart(wrong)}>
              <RotateCcw size={18} color="#fff" />
              <Text style={styles.primaryText}>{t('Xatolarni qayta ishlash')} ({wrong.length})</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => restart(qids)}>
            <Text style={styles.secondaryText}>{t("Qaytadan boshlash")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
            <Text style={styles.secondaryText}>{t("Orqaga")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const q = pool[order[idx]];
  const [text, answers, right, note] = q;

  const choose = (i: number) => {
    if (chosen !== null) return;
    setChosen(i);
    if (i === right) setCorrect((c) => c + 1);
    else setWrong((w) => [...w, order[idx]]);
  };

  const next = () => {
    setChosen(null);
    setIdx((i) => i + 1);
  };

  return (
    <View style={{ flex: 1 }}>
      <LearnHeader
        title={title}
        subtitle={t('Savol {n} / {total} • to‘g‘ri: {correct}', { n: idx + 1, total: order.length, correct })}
        onBack={onBack}
        right={
          answered > 0 ? (
            <TouchableOpacity onPress={() => setFinished(true)} hitSlop={8}>
              <Text style={styles.finish}>{t("Tugatish")}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(answered / order.length) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={[styles.pad, contentStyle]}>
        <Text style={styles.question}>{text}</Text>
        {answers.map((a, i) => {
          const isRight = chosen !== null && i === right;
          const isWrong = chosen === i && i !== right;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.answer, isRight && styles.answerRight, isWrong && styles.answerWrong]}
              onPress={() => choose(i)}
              activeOpacity={chosen === null ? 0.7 : 1}
            >
              <Text style={[styles.answerLetter, isRight && { color: T.green }, isWrong && { color: T.red }]}>{String.fromCharCode(1040 + i)}</Text>
              <Text style={styles.answerText}>{a}</Text>
              {isRight && <CheckCircle2 size={20} color={T.green} />}
              {isWrong && <XCircle size={20} color={T.red} />}
            </TouchableOpacity>
          );
        })}
        {chosen !== null && !!note && (
          <View style={styles.note}>
            <Text style={styles.noteLabel}>{t("Manba")}</Text>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        )}
        {chosen !== null && (
          <TouchableOpacity style={styles.primaryBtn} onPress={next}>
            <Text style={styles.primaryText}>{idx + 1 < order.length ? t("Keyingi savol") : t("Natijani ko‘rish")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 8 },
  finish: { color: T.brandBright, fontWeight: '700', fontSize: 14 },
  progressTrack: { height: 4, backgroundColor: T.border, marginHorizontal: 16, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: T.brandBright },
  question: { fontSize: 18, fontWeight: '700', color: T.text, lineHeight: 26, marginTop: 12, marginBottom: 16 },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  answerRight: { borderColor: T.green, backgroundColor: T.greenSoft },
  answerWrong: { borderColor: T.red, backgroundColor: T.redSoft },
  answerLetter: { fontSize: 15, fontWeight: '800', color: T.muted, width: 18 },
  answerText: { flex: 1, fontSize: 15, color: T.text, lineHeight: 21 },
  note: { backgroundColor: T.brandSoft, borderRadius: 12, padding: 12, marginBottom: 10 },
  noteLabel: { fontSize: 11, fontWeight: '800', color: T.brandBright, marginBottom: 2, textTransform: 'uppercase' },
  noteText: { fontSize: 14, color: T.text },
  primaryBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.brandBright,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 6,
    marginBottom: 10,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    marginBottom: 10,
  },
  secondaryText: { color: T.text, fontSize: 15, fontWeight: '600' },
  resultCard: { backgroundColor: T.surface, borderRadius: 20, padding: 24, alignItems: 'center', marginVertical: 12, borderWidth: 1, borderColor: T.border },
  resultPct: { fontSize: 52, fontWeight: '900' },
  resultText: { fontSize: 16, color: T.text, textAlign: 'center', marginTop: 4 },
  resultHint: { fontSize: 14, color: T.muted, marginTop: 6, textAlign: 'center' },
});
