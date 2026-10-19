import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BookOpen, ChevronRight, ClipboardCheck, Gauge, LucideIcon, Presentation, Zap } from 'lucide-react-native';
import { useScreenContentStyle } from '../layout';
import { setBackInterceptor } from '../backInterceptor';
import type { BookKey } from '../learn/data';
import QuizView from '../learn/QuizView';
import TestsHome, { DocTopics } from '../learn/TestsHome';
import { ArticleView, BookContents } from '../learn/ReaderViews';
import { DocPages, DocView, DocsHome } from '../learn/DocViews';
import { PresentationHome, PresentationItem } from '../learn/PresentationViews';
import { Palette, useStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';

type Route =
  | { name: 'home' }
  | { name: 'tests' }
  | { name: 'docTopics'; doc: number }
  | { name: 'quiz'; title: string; qids: number[] }
  | { name: 'book'; book: BookKey }
  | { name: 'article'; book: BookKey; section: number; item: number }
  | { name: 'docs' }
  | { name: 'docPages'; group: number }
  | { name: 'doc'; file: string; title: string }
  | { name: 'presentation' }
  | { name: 'presItem'; n: number };

const CARDS: { route: Route; title: string; desc: string; Icon: LucideIcon; color: string; bg: string }[] = [
  { route: { name: 'tests' }, title: 'Testlar', desc: '12 kasb bo‘yicha 1500+ savol, imtihon rejimi', Icon: ClipboardCheck, color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)' },
  { route: { name: 'book', book: 'vl80' }, title: 'ВЛ80с', desc: 'Sxemalar, apparatlar, nosozliklar va avariya sxemalari', Icon: Zap, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' },
  { route: { name: 'presentation' }, title: 'ВЛ80с taqdimoti', desc: 'Interaktiv sxemalar: bosganda zanjirlar ranglanadi (ТЧ-27)', Icon: Presentation, color: '#f472b6', bg: 'rgba(236, 72, 153, 0.15)' },
  { route: { name: 'book', book: 'klub' }, title: 'КЛУБ-У', desc: 'Qurilmadan foydalanish bo‘yicha yo‘riqnoma', Icon: Gauge, color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' },
  { route: { name: 'docs' }, title: 'ПТЭ, ИДП, ИСИ', desc: 'Qoidalar, yo‘riqnomalar va 27 ta bilet', Icon: BookOpen, color: '#a78bfa', bg: 'rgba(139, 92, 246, 0.16)' },
];

interface Props {
  onNavigate: (screen: any) => void;
}

export default function OrganishScreen(_props: Props) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const push = useCallback((r: Route) => setStack((st) => [...st, r]), []);
  const back = useCallback(() => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)), []);

  // Android "orqaga" tugmasi avval O'rganish ichidagi sahifadan chiqaradi
  useEffect(() => {
    setBackInterceptor(() => {
      if (stackRef.current.length > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => setBackInterceptor(null);
  }, [back]);

  const route = stack[stack.length - 1];
  const startQuiz = (title: string, qids: number[]) => push({ name: 'quiz', title, qids });

  return <View style={styles.container}>{render()}</View>;

  function render() {
    switch (route.name) {
      case 'tests':
        return <TestsHome onBack={back} onStart={startQuiz} onOpenDocTopics={(doc) => push({ name: 'docTopics', doc })} />;
      case 'docTopics':
        return <DocTopics docIndex={route.doc} onBack={back} onStart={startQuiz} />;
      case 'quiz':
        return <QuizView key={stack.length} title={route.title} qids={route.qids} onBack={back} />;
      case 'book':
        return <BookContents book={route.book} onBack={back} onOpen={(section, item) => push({ name: 'article', book: route.book, section, item })} />;
      case 'article':
        return <ArticleView book={route.book} section={route.section} item={route.item} onBack={back} />;
      case 'docs':
        return <DocsHome onBack={back} onOpenGroup={(group) => push({ name: 'docPages', group })} />;
      case 'docPages':
        return <DocPages group={route.group} onBack={back} onOpen={(file, title) => push({ name: 'doc', file, title })} />;
      case 'presentation':
        return <PresentationHome onBack={back} onOpen={(n) => push({ name: 'presItem', n })} />;
      case 'presItem':
        return (
          <PresentationItem
            key={route.n}
            n={route.n}
            onBack={back}
            // Bo'limdan bo'limga o'tishda joriy sahifa almashadi — "orqaga" mundarijaga qaytaradi
            onOpen={(n) => setStack((st) => [...st.slice(0, -1), { name: 'presItem', n }])}
            onHome={() => setStack((st) => st.slice(0, st.findIndex((r) => r.name === 'presentation') + 1))}
          />
        );
      case 'doc':
        return <DocView file={route.file} title={route.title} onBack={back} />;
      default:
        return <LearnHome onOpen={push} />;
    }
  }
}

function LearnHome({ onOpen }: { onOpen: (r: Route) => void }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  return (
    <ScrollView contentContainerStyle={[styles.homePad, contentStyle]} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t("O‘rganish")}</Text>
      <Text style={styles.subtitle}>{t("Testlar, qo‘llanmalar va qoidalar — bir joyda")}</Text>
      {CARDS.map(({ route, title, desc, Icon, color, bg }) => (
        <TouchableOpacity key={title} style={styles.card} onPress={() => onOpen(route)} activeOpacity={0.8}>
          <View style={[styles.cardIcon, { backgroundColor: bg }]}>
            <Icon size={28} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t(title)}</Text>
            <Text style={styles.cardDesc}>{t(desc)}</Text>
          </View>
          <ChevronRight size={20} color={T.faint} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  homePad: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 24, fontWeight: '800', color: T.text },
  subtitle: { fontSize: 13, color: T.muted, marginTop: 2, marginBottom: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: T.text },
  cardDesc: { fontSize: 13, color: T.muted, marginTop: 3, lineHeight: 18 },
});
