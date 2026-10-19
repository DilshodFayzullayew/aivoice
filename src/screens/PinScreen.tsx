import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Delete, ShieldCheck } from 'lucide-react-native';
import { useI18n } from '../i18n';
import { Palette, useStyles, useTheme } from '../theme';

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;

interface Props {
  /** setup — yangi PIN o'rnatish (kiritish + tasdiqlash), unlock — PIN bilan ochish */
  mode: 'setup' | 'unlock';
  userName?: string;
  /** unlock rejimida: PIN to'g'rimi */
  verify?: (pin: string) => Promise<boolean>;
  /** setup: tasdiqlangan PIN; unlock: muvaffaqiyatli ochildi */
  onDone: (pin: string) => void;
  /** PIN unutildi yoki urinishlar tugadi — login va parol bilan qayta kirish */
  onForgot: () => void;
}

export default function PinScreen({ mode, userName, verify, onDone, onForgot }: Props) {
  const { T } = useTheme();
  const styles = useStyles(makeStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const key = Math.round(Math.min(84, Math.max(64, (width - 120) / 3.4)));

  const [pin, setPin] = useState('');
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const title =
    mode === 'unlock' ? t('PIN-kodni kiriting') : first === null ? t('PIN-kod o‘rnating') : t('PIN-kodni tasdiqlang');
  const subtitle =
    mode === 'unlock'
      ? t('Davom etish uchun PIN-kodni kiriting')
      : first === null
        ? t('Ilovaga tez kirish uchun 4 xonali PIN-kod o‘ylab toping')
        : t('PIN-kodni qayta kiriting');

  const fail = (message: string) => {
    setError(message);
    setPin('');
    Animated.sequence(
      [12, -12, 8, -8, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 55, useNativeDriver: true })),
    ).start();
  };

  // 4 ta raqam terilganda — tekshiramiz
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || busy) return;
    const entered = pin;
    if (mode === 'setup') {
      if (first === null) {
        setFirst(entered);
        setPin('');
        setError(null);
      } else if (first === entered) {
        onDone(entered);
      } else {
        setFirst(null);
        fail(t('PIN-kodlar mos kelmadi. Qaytadan o‘rnating.'));
      }
      return;
    }
    setBusy(true);
    (verify ? verify(entered) : Promise.resolve(false))
      .then((ok) => {
        if (ok) return onDone(entered);
        const used = attempts + 1;
        setAttempts(used);
        if (used >= MAX_ATTEMPTS) {
          Alert.alert(t('PIN-kod bloklandi'), t('Juda ko‘p noto‘g‘ri urinish. Login va parol bilan qayta kiring.'));
          onForgot();
        } else {
          fail(t('Noto‘g‘ri PIN-kod. Qolgan urinishlar: {n}', { n: MAX_ATTEMPTS - used }));
        }
      })
      .finally(() => setBusy(false));
  }, [pin]);

  const press = (d: string) => {
    if (busy) return;
    setError(null);
    setPin((p) => (p.length < PIN_LENGTH ? p + d : p));
  };

  const forgot = () => {
    Alert.alert(t('PIN-kodni tiklash'), t('Tizimdan chiqasiz. Login va parol bilan qayta kirib, yangi PIN-kod o‘rnatasiz.'), [
      { text: t('Bekor qilish'), style: 'cancel' },
      { text: t('Davom etish'), style: 'destructive', onPress: onForgot },
    ]);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.iconWrap}>
        <ShieldCheck size={46} color="#ffffff" strokeWidth={2.2} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {!!userName && <Text style={styles.user}>{userName}</Text>}

      <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled, !!error && styles.dotError]} />
        ))}
      </Animated.View>
      <Text style={[styles.error, !error && { opacity: 0 }]}>{error ?? ' '}</Text>

      <View style={[styles.pad, { width: key * 3 + 2 * 22 }]}>
        {keys.map((k, i) =>
          k === '' ? (
            <View key={i} style={{ width: key, height: key }} />
          ) : k === 'del' ? (
            <TouchableOpacity
              key={i}
              style={[styles.keyGhost, { width: key, height: key }]}
              onPress={() => setPin((p) => p.slice(0, -1))}
              accessibilityLabel={t('O‘chirish')}
            >
              <Delete size={28} color={T.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity key={i} style={[styles.key, { width: key, height: key }]} onPress={() => press(k)} activeOpacity={0.6}>
              <Text style={styles.keyText}>{k}</Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      {mode === 'unlock' && (
        <TouchableOpacity onPress={forgot} style={styles.forgot}>
          <Text style={styles.forgotText}>{t('PIN-kodni unutdingizmi?')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg, alignItems: 'center' },
    iconWrap: {
      width: 84,
      height: 84,
      borderRadius: 26,
      backgroundColor: T.brandBright,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 12,
      marginBottom: 28,
    },
    title: { fontSize: 24, fontWeight: '800', color: T.text, textAlign: 'center' },
    subtitle: { fontSize: 14, color: T.muted, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
    user: { fontSize: 13, color: T.brandText, fontWeight: '700', marginTop: 6 },
    dots: { flexDirection: 'row', gap: 22, marginTop: 44 },
    dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: T.borderStrong },
    dotFilled: { backgroundColor: T.brandBright },
    dotError: { backgroundColor: T.red },
    error: { color: T.red, fontSize: 13, fontWeight: '600', marginTop: 14, minHeight: 18, textAlign: 'center', paddingHorizontal: 24 },
    pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, justifyContent: 'center', marginTop: 18 },
    key: { borderRadius: 22, backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
    keyGhost: { alignItems: 'center', justifyContent: 'center' },
    keyText: { fontSize: 30, fontWeight: '500', color: T.text },
    forgot: { marginTop: 'auto', paddingVertical: 12 },
    forgotText: { color: T.brandText, fontSize: 14, fontWeight: '700' },
  });
