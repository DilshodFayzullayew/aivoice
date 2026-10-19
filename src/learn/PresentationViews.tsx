import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  AlertTriangle,
  ArrowUpFromLine,
  BatteryCharging,
  ChevronLeft,
  ChevronRight,
  Cog,
  Cpu,
  Fan,
  FastForward,
  FileText,
  Gauge,
  LayoutGrid,
  LucideIcon,
  Maximize2,
  Play,
  Plug,
  Power,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  WifiOff,
  Zap,
} from 'lucide-react-native';
import { getApiBaseUrl } from '../api/voiceApi';
import { useScreenContentStyle } from '../layout';
import { Palette, useStyles, useTheme } from '../theme';
import type { Paragraph } from './data';
import { ZoomModal } from './ReaderViews';
import { LearnHeader, RichParagraphs, SectionTitle } from './ui';
import { useI18n } from '../i18n';

/**
 * "Презент 80c" taqdimotining zamonaviy ko'rinishi.
 * Sxemalar (rasm va bosqichli rangli zanjirlar) asl holicha — o'zgartirilmagan;
 * muqova, mundarija, texnik ma'lumotlar va matnli slaydlar ilovaning o'zida chiziladi.
 */

interface Link {
  x: number;
  y: number;
  w: number;
  h: number;
  to: number | string;
  vis: string;
}
interface SchemeInfo {
  n: number;
  steps: number;
  links: Link[];
}
interface Item {
  n: number;
  title: string;
  kind: 'scheme' | 'text' | 'table';
  icon: string;
}
interface Content {
  cover: { title: string; subtitle: string; depot: string };
  sections: { title: string; items: Item[] }[];
  tech: { title: string; rows: [string, string][] }[];
  texts: Record<string, { h?: string; p: Paragraph[] }[]>;
  credits: string;
}

const SCHEMES: SchemeInfo[] = require('./data/presentation.json');
const CONTENT: Content = require('./data/presentationContent.json');
const COVER = require('../../assets/learn/vl80_cover.jpg');
const RATIO = 4 / 3;

const ICONS: Record<string, LucideIcon> = {
  gauge: Gauge,
  layout: LayoutGrid,
  battery: BatteryCharging,
  plug: Plug,
  arrowup: ArrowUpFromLine,
  power: Power,
  cog: Cog,
  fan: Fan,
  zap: Zap,
  sliders: SlidersHorizontal,
  shield: ShieldCheck,
  cpu: Cpu,
  file: FileText,
  alert: AlertTriangle,
};

/** Mundarija tartibi — "Keyingi"/t("Oldingi") shu tartibda yuradi */
export const PRES_ORDER: Item[] = CONTENT.sections.flatMap((s) => s.items);
const schemeOf = (n: number) => SCHEMES.find((s) => s.n === n);
const sectionOf = (n: number) => CONTENT.sections.find((s) => s.items.some((i) => i.n === n));
const slideUrl = (n: number, k: number) => `${getApiBaseUrl()}/media/learn/slides/s${n}_${k}.jpg`;

/** Asl taqdimotdagi havola nishonini mundarijadagi bo'limga aylantiradi */
export function resolveTarget(to: number | string, current: number): number | 'home' | null {
  const idx = PRES_ORDER.findIndex((i) => i.n === current);
  if (to === 'next') return PRES_ORDER[idx + 1]?.n ?? null;
  if (to === 'prev') return PRES_ORDER[idx - 1]?.n ?? null;
  if (to === 1 || to === 2 || to === 22 || to === 23) return 'home';
  if (typeof to === 'number' && PRES_ORDER.some((i) => i.n === to)) return to;
  return null;
}

// =====================================================================  Bosh sahifa: muqova + mundarija
export function PresentationHome({ onBack, onOpen }: { onBack: () => void; onOpen: (n: number) => void }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const { width } = useWindowDimensions();
  const coverW = Math.min(width, 640) - 32;
  const coverH = Math.round(coverW * 0.62);
  const cardW = (coverW - 10) / 2;

  return (
    <View style={{ flex: 1 }}>
      <LearnHeader title={t("ВЛ80с taqdimoti")} subtitle={t("Interaktiv sxemalar va nosozliklar")} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.pad, contentStyle]} showsVerticalScrollIndicator={false}>
        {/* Muqova */}
        <View style={[styles.hero, { height: coverH }]}>
          <Image source={COVER} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.25" stopColor="#0a0f1a" stopOpacity="0" />
                <Stop offset="1" stopColor="#0a0f1a" stopOpacity="0.92" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#fade)" />
          </Svg>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>{CONTENT.cover.depot}</Text>
          </View>
          <View style={styles.heroBottom}>
            <Text style={styles.heroTitle}>{CONTENT.cover.title}</Text>
            <Text style={styles.heroSub}>{CONTENT.cover.subtitle}</Text>
            <TouchableOpacity style={styles.heroBtn} onPress={() => onOpen(PRES_ORDER[0].n)} activeOpacity={0.85}>
              <Play size={16} color="#ffffff" fill="#ffffff" />
              <Text style={styles.heroBtnText}>{t("Boshlash")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {CONTENT.sections.map((sec) => (
          <View key={sec.title}>
            <SectionTitle>{sec.title}</SectionTitle>
            <View style={styles.grid}>
              {sec.items.map((it) => {
                const Icon = ICONS[it.icon] ?? FileText;
                const sch = it.kind === 'scheme' ? schemeOf(it.n) : undefined;
                const fault = it.icon === 'alert';
                const meta = sch ? (sch.steps ? t('{n} bosqich', { n: sch.steps }) : t("Sxema")) : it.kind === 'table' ? t("Jadval") : t("Matn");
                return (
                  <TouchableOpacity key={it.n} style={[styles.card, { width: cardW }]} onPress={() => onOpen(it.n)} activeOpacity={0.8}>
                    <View style={[styles.cardIcon, { backgroundColor: fault ? T.amberSoft : T.brandSoft }]}>
                      <Icon size={20} color={fault ? T.amber : T.brandText} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={3}>{it.title}</Text>
                    <Text style={styles.cardMeta}>{meta}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        <Text style={styles.credits}>{CONTENT.credits}</Text>
      </ScrollView>
    </View>
  );
}

// =====================================================================  Bitta bo'lim (sxema / matn / jadval)
export function PresentationItem({ n, onBack, onOpen, onHome }: { n: number; onBack: () => void; onOpen: (n: number) => void; onHome: () => void }) {
  const item = PRES_ORDER.find((i) => i.n === n) ?? PRES_ORDER[0];
  const idx = PRES_ORDER.indexOf(item);
  const section = sectionOf(item.n);
  const pos = section ? `${section.title} • ${section.items.indexOf(item) + 1} / ${section.items.length}` : '';
  const prev = PRES_ORDER[idx - 1];
  const next = PRES_ORDER[idx + 1];
  const go = (target: number | 'home' | null) => {
    if (target === 'home') onHome();
    else if (target !== null) onOpen(target);
  };

  if (item.kind === 'scheme') {
    return <SchemeView key={item.n} item={item} subtitle={pos} onBack={onBack} onFollow={(to) => go(resolveTarget(to, item.n))} next={next} onOpen={onOpen} onHome={onHome} />;
  }
  return <TextView key={item.n} item={item} subtitle={pos} onBack={onBack} prev={prev} next={next} onOpen={onOpen} onHome={onHome} />;
}

function SchemeView({
  item,
  subtitle,
  onBack,
  onFollow,
  next,
  onOpen,
  onHome,
}: {
  item: Item;
  subtitle: string;
  onBack: () => void;
  onFollow: (to: number | string) => void;
  next?: Item;
  onOpen: (n: number) => void;
  onHome: () => void;
}) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const { paddingBottom } = useScreenContentStyle(true);
  const sch = schemeOf(item.n) ?? { n: item.n, steps: 0, links: [] };
  const [k, setK] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(false);
  const url = slideUrl(sch.n, k);

  // Keyingi bosqich rasmini oldindan yuklab qo'yamiz — bosganda kutish bo'lmaydi
  useEffect(() => {
    if (k < sch.steps) Image.prefetch(slideUrl(sch.n, k + 1)).catch(() => {});
  }, [k, sch]);

  const advance = () => {
    if (k < sch.steps) setK(k + 1);
    else if (next) {
      setZoom(false);
      onOpen(next.n);
    }
  };

  const hotspots = (w: number, h: number) =>
    sch.links
      .filter((l) => l.vis[k] !== '0')
      .map((l, j) => (
        <TouchableOpacity
          key={j}
          activeOpacity={0.4}
          onPress={() => {
            setZoom(false);
            onFollow(l.to);
          }}
          style={[styles.hotspot, { left: l.x * w, top: l.y * h, width: l.w * w, height: l.h * h }]}
        />
      ));

  const imgW = Math.max(0, Math.min(box.w - 24, (box.h - 12) * RATIO));
  const imgH = imgW / RATIO;
  const progress = sch.steps ? k / sch.steps : 1;

  return (
    <View style={{ flex: 1 }}>
      <LearnHeader title={item.title} subtitle={subtitle} onBack={onBack} />
      {/* Bosqich chizig'i */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        {!!sch.steps && <Text style={styles.progressText}>{k} / {sch.steps}</Text>}
      </View>

      <View
        style={styles.stage}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (Math.round(width) !== box.w || Math.round(height) !== box.h) setBox({ w: Math.round(width), h: Math.round(height) });
        }}
      >
        {imgW > 0 && (
          <View style={[styles.slideCard, { width: imgW, height: imgH }]}>
            <Pressable onPress={advance} style={StyleSheet.absoluteFill}>
              <Image
                source={{ uri: url }}
                style={{ width: imgW, height: imgH }}
                resizeMode="contain"
                fadeDuration={0}
                onLoadStart={() => {
                  setLoading(true);
                  setFailed(false);
                }}
                onLoadEnd={() => setLoading(false)}
                onError={() => setFailed(true)}
              />
            </Pressable>
            {hotspots(imgW, imgH)}
            {loading && !failed && (
              <View style={styles.overlayCenter} pointerEvents="none">
                <ActivityIndicator color={T.brandBright} />
              </View>
            )}
            {failed && (
              <View style={[styles.overlayCenter, { backgroundColor: T.surface, gap: 10, padding: 20 }]}>
                <WifiOff size={28} color={T.muted} />
                <Text style={styles.failText}>{t("Sxemani yuklab bo‘lmadi. Internet aloqasini tekshiring.")}</Text>
                <TouchableOpacity style={styles.retry} onPress={() => setK((x) => x)}>
                  <Text style={styles.retryText}>{t("Qayta urinish")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        <Text style={styles.hint}>{k < sch.steps ? t("Sxemani bosing — keyingi qism ranglanadi") : next ? t("Bosing — keyingi bo‘lim") : t("Oxirgi bo‘lim")}</Text>
      </View>

      <View style={[styles.toolbar, { marginBottom: (paddingBottom as number) - 8 }]}>
        <ToolBtn label="Mundarija" onPress={onHome}>
          <LayoutGrid size={18} color={T.text} />
        </ToolBtn>
        <ToolBtn label="Boshidan" onPress={() => setK(0)} disabled={!sch.steps || k === 0}>
          <RotateCcw size={18} color={T.text} />
        </ToolBtn>
        <ToolBtn label="Hammasi" onPress={() => setK(sch.steps)} disabled={!sch.steps || k === sch.steps}>
          <FastForward size={18} color={T.text} />
        </ToolBtn>
        <ToolBtn label="Kattalash" onPress={() => setZoom(true)}>
          <Maximize2 size={18} color={T.text} />
        </ToolBtn>
        <ToolBtn label={k < sch.steps ? 'Keyingi' : 'Bo‘lim'} onPress={advance} disabled={k >= sch.steps && !next} primary>
          <ChevronRight size={20} color="#ffffff" />
        </ToolBtn>
      </View>
      <ZoomModal
        visible={zoom}
        source={{ uri: url }}
        ratio={RATIO}
        onClose={() => setZoom(false)}
        onPressImage={advance}
        renderOverlay={hotspots}
        caption={sch.steps ? `${item.title} • ${k} / ${sch.steps}${k < sch.steps ? ` • ${t('bosing — keyingi qism')}` : ''}` : item.title}
      />
    </View>
  );
}

function TextView({
  item,
  subtitle,
  onBack,
  prev,
  next,
  onOpen,
  onHome,
}: {
  item: Item;
  subtitle: string;
  onBack: () => void;
  prev?: Item;
  next?: Item;
  onOpen: (n: number) => void;
  onHome: () => void;
}) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const blocks = CONTENT.texts[String(item.n)] ?? [];
  const fault = item.icon === 'alert';
  const Icon = ICONS[item.icon] ?? FileText;

  return (
    <View style={{ flex: 1 }}>
      <LearnHeader title={item.title} subtitle={subtitle} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.pad, contentStyle]}>
        <View style={[styles.banner, { backgroundColor: fault ? T.amberSoft : T.brandSoft }]}>
          <Icon size={18} color={fault ? T.amber : T.brandText} />
          <Text style={[styles.bannerText, { color: fault ? T.amber : T.brandText }]}>
            {item.kind === 'table' ? 'Основные технические характеристики' : fault ? 'Порядок действий при неисправности' : 'Изменения по номерам электровозов'}
          </Text>
        </View>

        {item.kind === 'table'
          ? CONTENT.tech.map((g) => (
              <View key={g.title} style={styles.tableCard}>
                <Text style={styles.tableTitle}>{g.title}</Text>
                {g.rows.map(([label, value], i) => (
                  <View key={i} style={[styles.tableRow, i === g.rows.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.tableLabel}>{label}</Text>
                    <Text style={styles.tableValue}>{value}</Text>
                  </View>
                ))}
              </View>
            ))
          : blocks.map((b, i) => (
              <View key={i} style={styles.textCard}>
                {!!b.h && <Text style={styles.tableTitle}>{b.h}</Text>}
                <RichParagraphs paragraphs={b.p} />
              </View>
            ))}

        <View style={styles.navRow}>
          <TouchableOpacity style={[styles.navBtn, !prev && { opacity: 0.35 }]} disabled={!prev} onPress={() => prev && onOpen(prev.n)}>
            <ChevronLeft size={18} color={T.text} />
            <Text style={styles.navText} numberOfLines={1}>{prev ? prev.title : t("Oldingi")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, styles.navBtnPrimary, !next && { opacity: 0.35 }]} disabled={!next} onPress={() => (next ? onOpen(next.n) : onHome())}>
            <Text style={[styles.navText, { color: '#ffffff' }]} numberOfLines={1}>{next ? next.title : t("Mundarija")}</Text>
            <ChevronRight size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function ToolBtn({ children, label, onPress, disabled, primary }: { children: React.ReactNode; label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  const styles = useStyles(makeStyles);
  const { t } = useI18n();
  return (
    <TouchableOpacity style={[styles.tool, primary && styles.toolPrimary, disabled && styles.toolOff]} onPress={onPress} disabled={disabled}>
      {children}
      <Text style={[styles.toolText, primary && { color: '#ffffff' }]} numberOfLines={1}>{t(label)}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
    pad: { paddingHorizontal: 16 },
    // Muqova
    hero: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#0a0f1a', marginBottom: 6 },
    heroChip: {
      position: 'absolute',
      top: 14,
      left: 14,
      backgroundColor: 'rgba(10, 15, 26, 0.65)',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    heroChipText: { color: '#ffffff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    heroBottom: { position: 'absolute', left: 18, right: 18, bottom: 16 },
    heroTitle: { color: '#ffffff', fontSize: 36, fontWeight: '900', letterSpacing: 1 },
    heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2, marginBottom: 12 },
    heroBtn: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#2563eb',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    heroBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
    // Mundarija kartalari
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    card: {
      backgroundColor: T.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: T.border,
      padding: 14,
      minHeight: 128,
    },
    cardIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: T.text, lineHeight: 19, flexGrow: 1 },
    cardMeta: { fontSize: 11, color: T.muted, marginTop: 8, fontWeight: '600' },
    credits: { fontSize: 11, color: T.faint, marginTop: 18, lineHeight: 16, textAlign: 'center' },
    // Sxema
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 4 },
    progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: T.border, overflow: 'hidden' },
    progressFill: { height: 4, backgroundColor: T.brandBright },
    progressText: { fontSize: 11, fontWeight: '700', color: T.muted, minWidth: 48, textAlign: 'right' },
    stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    slideCard: {
      backgroundColor: '#ffffff',
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: T.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 6,
    },
    hotspot: { position: 'absolute' },
    overlayCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    failText: { color: T.muted, textAlign: 'center', fontSize: 13 },
    retry: { backgroundColor: T.brandSoft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    retryText: { color: T.brandText, fontWeight: '700' },
    hint: { color: T.muted, fontSize: 12, marginTop: 10, textAlign: 'center' },
    toolbar: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 8 },
    tool: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: T.border,
      backgroundColor: T.surface,
    },
    toolPrimary: { backgroundColor: T.brand, borderColor: T.brand },
    toolOff: { opacity: 0.35 },
    toolText: { fontSize: 10, fontWeight: '700', color: T.text },
    // Matn va jadval
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
    bannerText: { fontSize: 13, fontWeight: '700', flex: 1 },
    textCard: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 12 },
    tableCard: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
    tableTitle: { fontSize: 13, fontWeight: '800', color: T.brandText, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
    tableRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
    tableLabel: { flex: 1, fontSize: 14, color: T.text2, lineHeight: 19 },
    tableValue: { fontSize: 14, fontWeight: '800', color: T.text, textAlign: 'right', maxWidth: '45%' },
    navRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    navBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 13,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: T.border,
      backgroundColor: T.surface,
    },
    navBtnPrimary: { backgroundColor: T.brand, borderColor: T.brand },
    navText: { fontSize: 13, fontWeight: '700', color: T.text, flexShrink: 1 },
  });

export default PresentationHome;
