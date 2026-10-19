import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const LOGO = require('../../assets/uty-logo.png');
const LOGO_RATIO = 165 / 199;
const GOLD = '#f2c66d';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop, Circle } from 'react-native-svg';
import { Train } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr } from '../i18n';

interface Props {
  /** Birinchi kadr chizilganda chaqiriladi (native splash'ni yashirish uchun) */
  onReady?: () => void;
  onFinish: () => void;
}

const LINE_1 = 'O‘ZBEKISTON';
const LINE_2 = 'TEMIR YO‘LLARI';

const STATUS_STEPS: [number, string][] = [
  [0, 'Xavfsiz ulanish o‘rnatilmoqda...'],
  [0.3, 'Ma’lumotlar sinxronlanmoqda...'],
  [0.65, 'Lokomotiv tizimlari tekshirilmoqda...'],
  [1, 'Tayyor!'],
];

const PROGRESS_DURATION = 1700;

export default function SplashIntro({ onReady, onFinish }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const titleSize = Math.round(Math.min(40, Math.max(26, width * 0.085)));
  const trackWidth = Math.min(width - 64, 320);
  const logoH = Math.round(Math.min(170, Math.max(120, width * 0.36)));
  const logoW = Math.round(logoH * LOGO_RATIO);
  const glow = Math.round(logoH * 1.9);

  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const letters = useMemo(() => LINE_1.split('').map(() => new Animated.Value(0)), []);
  const line2 = useRef(new Animated.Value(0)).current;
  const footer = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  const [percent, setPercent] = useState(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const id = progress.addListener(({ value }) => setPercent(Math.round(value * 100)));

    const pulseLoop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    const shineLoop = Animated.loop(
      Animated.timing(shine, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    );
    pulseLoop.start();
    shineLoop.start();

    // Bosqichlar bir-birini kutmaydi: logotip, yozuv va yuklanish deyarli birga boshlanadi
    const intro = Animated.parallel([
      Animated.timing(logoScale, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.stagger(
        40,
        letters.map((v) =>
          Animated.timing(v, { toValue: 1, duration: 360, delay: 250, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
        ),
      ),
      Animated.timing(line2, { toValue: 1, duration: 420, delay: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(footer, { toValue: 1, duration: 400, delay: 300, useNativeDriver: true }),
    ]);

    const loading = Animated.timing(progress, {
      toValue: 1,
      duration: PROGRESS_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });

    const outro = Animated.timing(exit, {
      toValue: 1,
      duration: 350,
      delay: 120,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });

    intro.start();
    // Yuklanish logotip chiqqandan keyin boshlanadi va matn animatsiyasi bilan parallel ketadi
    const timer = setTimeout(() => {
      loading.start(({ finished }) => {
        if (!finished) return;
        outro.start(({ finished: done }) => done && onFinishRef.current());
      });
    }, 400);

    return () => {
      clearTimeout(timer);
      progress.removeListener(id);
      pulseLoop.stop();
      shineLoop.stop();
      intro.stop();
      loading.stop();
      outro.stop();
    };
  }, []);

  const status = [...STATUS_STEPS].reverse().find(([t]) => percent / 100 >= t)?.[1] ?? STATUS_STEPS[0][1];

  const ring = (offset: number) => {
    const v = Animated.modulo(Animated.add(pulse, offset), 1);
    return {
      opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.45, 0] }),
      transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
    };
  };

  const trainSize = 30;

  return (
    <Animated.View
      onLayout={onReady}
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        {
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
        },
      ]}
    >
      {/* Gradient fon va dekorativ doiralar */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0a2f8f" />
            <Stop offset="0.55" stopColor="#0051df" />
            <Stop offset="1" stopColor="#2f6bff" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#bg)" />
        <Circle cx={width * 0.9} cy={height * 0.12} r={width * 0.45} fill="#ffffff" fillOpacity={0.05} />
        <Circle cx={width * 0.05} cy={height * 0.88} r={width * 0.55} fill="#ffffff" fillOpacity={0.04} />
      </Svg>

      {/* Harakatlanuvchi "tezlik chiziqlari" */}
      {[0.22, 0.31, 0.74].map((top, i) => (
        <Animated.View
          key={i}
          style={[
            styles.speedLine,
            {
              top: height * top,
              width: width * (0.35 + i * 0.1),
              transform: [
                {
                  translateX: shine.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-width, width * 1.2],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      <View style={styles.center}>
        {/* Gerb: oltin nur, tarqaluvchi halqalar va 3D aylanib chiqish */}
        <View style={[styles.logoArea, { width: glow, height: glow }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: logoOpacity }]}>
            <Svg width={glow} height={glow}>
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={GOLD} stopOpacity={0.45} />
                  <Stop offset="0.45" stopColor={GOLD} stopOpacity={0.14} />
                  <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill="url(#glow)" />
            </Svg>
          </Animated.View>
          {[0, 0.5].map((o) => (
            <Animated.View
              key={o}
              style={[styles.pulseRing, { width: logoH, height: logoH, borderRadius: logoH / 2 }, ring(o)]}
            />
          ))}
          <Animated.Image
            source={LOGO}
            resizeMode="contain"
            accessibilityLabel="O‘zbekiston temir yo‘llari gerbi"
            style={{
              width: logoW,
              height: logoH,
              opacity: logoOpacity,
              transform: [
                { perspective: 800 },
                { rotateY: logoScale.interpolate({ inputRange: [0.4, 1], outputRange: ['80deg', '0deg'] }) },
                { scale: logoScale },
              ],
            }}
          />
        </View>

        {/* Harfma-harf chiqadigan sarlavha */}
        <View style={styles.lettersRow} accessible accessibilityLabel={`${LINE_1} ${LINE_2}`}>
          {LINE_1.split('').map((ch, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.title,
                {
                  fontSize: titleSize,
                  opacity: letters[i],
                  transform: [
                    { translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                    { scale: letters[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  ],
                },
              ]}
            >
              {ch}
            </Animated.Text>
          ))}
        </View>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              fontSize: Math.round(titleSize * 0.5),
              opacity: line2,
              transform: [{ translateY: line2.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          {LINE_2}
        </Animated.Text>

        <Animated.View style={[styles.divider, { opacity: line2, transform: [{ scaleX: line2 }] }]} />

        <Typewriter text="AI assist" startDelay={750} style={styles.tagline} />
      </View>

      {/* Relsda yuruvchi poyezd — yuklanish indikatori */}
      <Animated.View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 56,
            opacity: footer,
            transform: [{ translateY: footer.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <View style={{ width: trackWidth }}>
          <View style={styles.trainLane}>
            <Animated.View
              style={{
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, trackWidth - trainSize],
                    }),
                  },
                ],
              }}
            >
              <Train size={trainSize} color="#ffffff" strokeWidth={2} />
            </Animated.View>
          </View>

          <View style={styles.rail}>
            <Animated.View
              style={[
                styles.railFill,
                { width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth] }) },
              ]}
            />
          </View>
          <View style={styles.sleepers}>
            {Array.from({ length: Math.floor(trackWidth / 14) }).map((_, i) => (
              <View key={i} style={styles.sleeper} />
            ))}
          </View>
          <View style={[styles.rail, { marginTop: 0 }]} />

          <View style={styles.statusRow}>
            <View style={styles.statusBox}>
              <StatusLine key={status} text={tr(status)} />
            </View>
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** Yozuv mashinkasi effekti: harflar birin-ketin yoziladi, oxirida kursor so'nadi */
function Typewriter({ text, startDelay = 0, speed = 30, style }: { text: string; startDelay?: number; speed?: number; style: any }) {
  const [count, setCount] = useState(0);
  const cursor = useRef(new Animated.Value(1)).current;
  const done = count >= text.length;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        setCount((c) => {
          if (c + 1 >= text.length && interval) clearInterval(interval);
          return Math.min(c + 1, text.length);
        });
      }, speed);
    }, startDelay);
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursor, { toValue: 0, duration: 380, useNativeDriver: true }),
        Animated.timing(cursor, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    );
    blink.start();
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
      blink.stop();
    };
  }, [text, startDelay, speed]);

  return (
    <View style={styles.typewriterRow} accessible accessibilityLabel={text}>
      {/* Ko'rinmas to'liq matn joyni oldindan egallaydi — yozilayotganda qator siljimaydi */}
      <Text style={[style, styles.ghost]}>{text}</Text>
      <View style={styles.typewriterOverlay}>
        <Text style={style}>
          {text.slice(0, count)}
          {count > 0 && !done && <Text style={styles.typewriterGlow}>{text[count] ?? ''}</Text>}
        </Text>
        {count > 0 && (
          <Animated.View style={[styles.cursor, { opacity: done ? 0 : cursor }]} />
        )}
      </View>
    </View>
  );
}

/** Holat xabari: har almashganda pastdan suzib chiqadi */
function StatusLine({ text }: { text: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const isDone = text === tr('Tayyor!');
  return (
    <Animated.Text
      numberOfLines={1}
      style={[
        styles.statusText,
        isDone && styles.statusDone,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
      ]}
    >
      {isDone ? '✓ ' : ''}
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0051df',
    zIndex: 100,
    elevation: 100,
  },
  speedLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -8,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  lettersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  subtitle: {
    marginTop: 6,
    fontWeight: '700',
    color: '#f7dc9c',
    letterSpacing: 6,
    textAlign: 'center',
  },
  divider: {
    width: 56,
    height: 3,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 16,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
  },
  trainLane: {
    height: 32,
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  rail: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  railFill: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  sleepers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 6,
    paddingHorizontal: 2,
  },
  sleeper: {
    width: 3,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    gap: 12,
  },
  statusBox: {
    flex: 1,
    overflow: 'hidden',
  },
  statusDone: {
    color: GOLD,
    fontWeight: '700',
  },
  typewriterRow: {
    alignSelf: 'center',
  },
  ghost: {
    opacity: 0,
  },
  typewriterOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typewriterGlow: {
    color: 'rgba(255,255,255,0.35)',
  },
  cursor: {
    width: 2,
    height: 15,
    marginLeft: 2,
    borderRadius: 1,
    backgroundColor: GOLD,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  percentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
});
