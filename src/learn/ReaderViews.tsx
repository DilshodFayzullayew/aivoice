import React, { useMemo, useState } from 'react';
import { Image, ImageSourcePropType, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Maximize2, Minus, Plus, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenContentStyle } from '../layout';
import { BookKey, getBook, paragraphText } from './data';
import { VL80_IMAGES } from './data/vl80Images';
import { LearnHeader, RichParagraphs, Row, SectionTitle } from './ui';
import { Palette, useStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';

const BOOK_INFO: Record<BookKey, { title: string; subtitle: string }> = {
  vl80: { title: 'ВЛ80с', subtitle: 'Схемы, аппараты, неисправности' },
  klub: { title: 'КЛУБ-У', subtitle: 'Памятка машинисту по эксплуатации' },
};

/** ВЛ80с / КЛУБ-У mundarijasi (qidiruv bilan) */
export function BookContents({ book, onBack, onOpen }: { book: BookKey; onBack: () => void; onOpen: (section: number, item: number) => void }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const sections = getBook(book);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // Qidiruv: sarlavha va matn bo'yicha
  const texts = useMemo(
    () => sections.map((sec) => sec.items.map((a) => (a.title + ' ' + a.blocks.map((b) => b.p.map(paragraphText).join(' ')).join(' ')).toLowerCase())),
    [sections],
  );

  return (
    <View style={{ flex: 1 }}>
      <LearnHeader title={BOOK_INFO[book].title} subtitle={BOOK_INFO[book].subtitle} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.pad, contentStyle]} keyboardShouldPersistTaps="handled">
        <View style={styles.search}>
          <Search size={18} color={T.muted} />
          <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder={t("Qidirish (masalan: ГВ, компрессор)")} placeholderTextColor={T.faint} />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <X size={18} color={T.muted} />
            </TouchableOpacity>
          )}
        </View>
        {sections.map((sec, si) => {
          const items = sec.items.map((a, ii) => ({ a, ii })).filter(({ ii }) => !q || texts[si][ii].includes(q));
          if (!items.length) return null;
          return (
            <View key={sec.title}>
              <SectionTitle>{sec.title}</SectionTitle>
              {items.map(({ a, ii }) => (
                <Row key={a.id} title={a.title} onPress={() => onOpen(si, ii)} />
              ))}
            </View>
          );
        })}
        {!!q && texts.every((sec) => sec.every((t) => !t.includes(q))) && <Text style={styles.empty}>{t("Hech narsa topilmadi")}</Text>}
      </ScrollView>
    </View>
  );
}

/** Bitta maqola: sxema rasmi (kattalashtirish mumkin) + matn */
export function ArticleView({ book, section, item, onBack }: { book: BookKey; section: number; item: number; onBack: () => void }) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const sec = getBook(book)[section];
  const a = sec.items[item];
  const [zoom, setZoom] = useState(false);
  const img = a.img ? VL80_IMAGES[a.img] : undefined;
  const meta = img ? Image.resolveAssetSource(img) : undefined;
  // Foizli o'lcham Android'da katta rasmni chizmay qo'yishi mumkin — aniq piksel beramiz (sahifa chetlari 16 + quti ichki 6)
  const { width: winW } = useWindowDimensions();
  const imgW = Math.min(winW, 640) - 32 - 14;

  return (
    <View style={{ flex: 1 }}>
      <LearnHeader title={a.title} subtitle={`${BOOK_INFO[book].title} • ${sec.title}`} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.pad, contentStyle]}>
        {img && meta && (
          <TouchableOpacity style={styles.imgBox} activeOpacity={0.85} onPress={() => setZoom(true)}>
            <Image source={img} style={{ width: imgW, height: imgW / (meta.width / meta.height) }} resizeMode="contain" />
            <View style={styles.zoomHint}>
              <Maximize2 size={14} color="#fff" />
              <Text style={styles.zoomHintText}>{t("Kattalashtirish")}</Text>
            </View>
          </TouchableOpacity>
        )}
        {a.blocks.map((b, i) => (
          <View key={i} style={styles.block}>
            {!!b.h && <Text style={styles.blockTitle}>{b.h}</Text>}
            <RichParagraphs paragraphs={b.p} />
          </View>
        ))}
        {book === 'vl80' && a.blocks.some((b) => b.p.some((p) => p.some((r) => r[1]?.includes('r') || r[1]?.includes('g')))) && (
          <Text style={styles.legend}>
            <Text style={{ color: T.red, fontWeight: '700' }}>{t('Qizil')}</Text> — {t('normal yopiq kontaktlar')},{' '}
            <Text style={{ color: T.green, fontWeight: '700' }}>{t('yashil')}</Text> — {t('normal ochiq')},{' '}
            <Text style={{ color: T.brandText, fontWeight: '700' }}>{t('ko‘k')}</Text> — {t('simlar')}
          </Text>
        )}
      </ScrollView>
      {img && meta && <ZoomModal visible={zoom} source={img} ratio={meta.width / meta.height} onClose={() => setZoom(false)} />}
    </View>
  );
}

/** Sxemani to'liq ekranda ko'rish: +/- bilan kattalashtirib, barmoq bilan surish */
export function ZoomModal({
  visible,
  source,
  ratio,
  onClose,
  onPressImage,
  renderOverlay,
  caption,
}: {
  visible: boolean;
  source: ImageSourcePropType;
  ratio: number;
  onClose: () => void;
  /** Rasm bosilganda (masalan taqdimotda — keyingi bosqich) */
  onPressImage?: () => void;
  /** Rasm ustidagi bosiladigan joylar (havolalar), o'lchami w x h */
  renderOverlay?: (w: number, h: number) => React.ReactNode;
  caption?: string;
}) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // 100% — butun sxema ekranga sig'adi; keyin +/- bilan kattalashtiriladi
  const [scale, setScale] = useState(1);
  const fitWidth = Math.min(width, (height - insets.top - insets.bottom - 110) * ratio);
  const w = fitWidth * scale;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} onShow={() => setScale(1)}>
      <View style={[styles.zoomRoot, { paddingTop: insets.top }]}>
        <ScrollView horizontal contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
          <ScrollView contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
            <View style={{ width: w, height: w / ratio }}>
              <Pressable onPress={onPressImage} disabled={!onPressImage} style={{ width: w, height: w / ratio }}>
                <Image source={source} style={{ width: w, height: w / ratio }} resizeMode="contain" fadeDuration={0} />
              </Pressable>
              {renderOverlay?.(w, w / ratio)}
            </View>
          </ScrollView>
        </ScrollView>
        {!!caption && (
          <View style={[styles.zoomCaption, { bottom: insets.bottom + 84 }]} pointerEvents="none">
            <Text style={styles.zoomCaptionText}>{caption}</Text>
          </View>
        )}
        <View style={[styles.zoomBar, { bottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => setScale((x) => Math.max(1, x - 0.5))}>
            <Minus size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.zoomText}>{Math.round(scale * 100)}%</Text>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => setScale((x) => Math.min(6, x + 0.5))}>
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: '#ba1a1a' }]} onPress={onClose}>
            <X size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: T.text },
  empty: { textAlign: 'center', color: T.muted, marginTop: 24 },
  imgBox: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 6, marginBottom: 12, overflow: 'hidden' },
  zoomHint: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  zoomHintText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  block: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 12 },
  blockTitle: { fontSize: 13, fontWeight: '800', color: T.brandBright, textTransform: 'uppercase', marginBottom: 8 },
  legend: { fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 18 },
  zoomRoot: { flex: 1, backgroundColor: '#fff' },
  zoomBar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(19,27,46,0.85)',
    borderRadius: 30,
    padding: 8,
  },
  zoomBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  zoomCaption: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(19,27,46,0.85)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  zoomCaptionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  zoomText: { color: '#fff', fontWeight: '700', minWidth: 48, textAlign: 'center' },
});
