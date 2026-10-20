import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Alert,
  ActivityIndicator,
  AppState,
  useWindowDimensions,
} from 'react-native';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import {
  Mic,
  Play,
  Pause,
  History,
  ChevronDown,
  ChevronUp,
  Trash2,
  Moon,
  Square,
  Sun,
  TrainFront,
} from 'lucide-react-native';
import { CONTENT_MAX_WIDTH, useScreenContentStyle } from '../layout';
import { ApiError, QueryResult, checkHealth, fetchAiAudio, fetchKbAudio, textQuery, voiceQuery } from '../api/voiceApi';
import { HistoryItem, clearHistory, groupByDay, loadRelevantHistory, removeHistoryItem, saveHistory, timeLabel } from '../storage/voiceHistory';
import { useAuth } from '../auth';
import { Palette, useStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';

interface Props {
  onNavigate: (screen: any) => void;
}

type Phase = 'idle' | 'recording' | 'processing' | 'result' | 'error';

interface CurrentAnswer {
  id: string;
  question: string;
  result: QueryResult;
}

const PROCESSING_STEPS = [
  'Ovoz matnga o‘girilmoqda...',
  'Bazadan mos javob qidirilmoqda...',
  'Ovozli javob tayyorlanmoqda...',
];

const MIN_RECORDING_MS = 700;
const MAX_RECORDING_MS = 60_000;

// Nutq uchun mono 64 kbit/s yetarli — fayl ikki baravar kichik, yuklash tezroq
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
};

const formatSeconds = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function OvozScreen({ onNavigate }: Props) {
  const contentStyle = useScreenContentStyle(true);
  const { width } = useWindowDimensions();
  const { T, isDark, toggle } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const { user } = useAuth();
  // Mikrofon tugmasi ekran kengligiga moslashadi (kichik telefonlardan planshetgacha)
  const orb = Math.round(Math.min(120, Math.max(96, width * 0.28)));

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 80);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [current, setCurrent] = useState<CurrentAnswer | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Savol bir nechta lokomotiv seriyasiga mos keldi — mashinist seriyani tanlaydi
  const [seriesAsk, setSeriesAsk] = useState<{ question: string; duration?: number; options: string[] } | null>(null);
  // Yangi javob tarixda ochiladi va ekran o'sha joyga suriladi
  const scrollRef = useRef<ScrollView>(null);
  const historyY = useRef(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  // AI javobining ovozi orqada tayyorlanmoqda
  const [audioPendingId, setAudioPendingId] = useState<string | null>(null);
  // Xato emas, yo'l-yo'riq (masalan "juda qisqa" yoki "ruxsat berildi")
  const [notice, setNotice] = useState<string | null>(null);

  // Yozish so'ralgan (bosilgan) — tayyorlanish va to'xtatish orasidagi poyga holatlari uchun
  const pressActive = useRef(false);
  const recordingStarted = useRef(false);
  const startPromise = useRef<Promise<void> | null>(null);

  const level = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Tarixda faqat javob topilgan va lokomotiv / temir yo'lga oid savollar qoladi
    loadRelevantHistory().then(setHistory);
    checkHealth().then(setServerOnline);
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    // Ilovaga qaytilganda tarix qayta olinadi — admin tuzatgan javoblar darhol ko'rinadi
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadRelevantHistory().then(setHistory);
    });
    return () => sub.remove();
  }, []);

  // Ovoz balandligi (metering, dB) -> 0..1 -> halqalar va chastota ustunlari animatsiyasi
  const meter = recorderState.isRecording ? Math.max(0, Math.min(1, ((recorderState.metering ?? -60) + 60) / 60)) : 0;
  useEffect(() => {
    Animated.timing(level, { toValue: meter, duration: 90, useNativeDriver: true }).start();
  }, [meter]);

  // Qayta ishlash paytida aylanuvchi halqa va bosqich matnlari
  useEffect(() => {
    if (phase !== 'processing') return;
    setStepIndex(0);
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    spin.setValue(0);
    loop.start();
    const t1 = setTimeout(() => setStepIndex(1), 2500);
    const t2 = setTimeout(() => setStepIndex(2), 5000);
    return () => {
      loop.stop();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  // Ijro tugaganda tugma holatini qaytarish
  useEffect(() => {
    if (playerStatus.didJustFinish) {
      setPlayingId(null);
      player.seekTo(0).catch(() => {});
    }
  }, [playerStatus.didJustFinish]);

  const playAudio = useCallback(
    (id: string, url?: string) => {
      if (!url) return;
      if (playingId === id) {
        if (playerStatus.playing) player.pause();
        else player.play();
        return;
      }
      player.replace({ uri: url });
      player.play();
      setPlayingId(id);
    },
    [playingId, playerStatus.playing, player],
  );

  /** ▶: ovoz hali yaratilmagan bo'lsa — serverdan so'raymiz (TTS faqat kerak bo'lganda), keyin ijro */
  const playItem = useCallback(
    async (item: HistoryItem) => {
      if (item.audioUrl) return playAudio(item.id, item.audioUrl);
      if (!item.kbId && !item.audioId) return;
      setAudioPendingId(item.id);
      try {
        const url = item.kbId ? await fetchKbAudio(item.kbId) : await fetchAiAudio(item.audioId!);
        setHistory((prev) => {
          const next = prev.map((h) => (h.id === item.id ? { ...h, audioUrl: url } : h));
          saveHistory(next);
          return next;
        });
        player.replace({ uri: url });
        player.play();
        setPlayingId(item.id);
      } catch (e) {
        Alert.alert(t('Ovozni tayyorlab bo‘lmadi'), e instanceof Error ? e.message : t('Server bilan aloqa yo‘q.'));
      } finally {
        setAudioPendingId((cur) => (cur === item.id ? null : cur));
      }
    },
    [player, t, playAudio],
  );

  const handleResult = useCallback(
    async (question: string, result: QueryResult, source: 'voice' | 'text', duration?: number) => {
      // Seriya noma'lum — javob o'rniga "qaysi lokomotiv?" so'raymiz
      if (result.need_series && result.series_options?.length) {
        setSeriesAsk({ question: result.stt_text || question, duration, options: result.series_options });
        setCurrent({ id: 'series', question: result.stt_text || question, result });
        setNotice(null);
        setPhase('result');
        setServerOnline(true);
        return;
      }
      setSeriesAsk(null);
      // Server tarixga yozgan bo'lsa — o'sha id (o'chirish serverda ham ishlashi uchun)
      const id = result.history_id ? String(result.history_id) : String(Date.now());
      const answer: CurrentAnswer = { id, question: result.stt_text || question, result };
      setCurrent(answer);
      setNotice(null);
      setPhase('result');
      setServerOnline(true);

      const item: HistoryItem = {
        id,
        createdAt: Date.now(),
        question: answer.question,
        source,
        matched: result.matched,
        similarity: result.similarity,
        answer: result.answer_text,
        kbQuestion: result.kb_question,
        answerSource: result.answer_source ?? 'kb',
        relevanceChecked: result.relevant === true,
        audioUrl: result.answer_audio_url,
        kbId: result.kb_id ?? undefined,
        audioId: result.audio_id ?? undefined,
        duration,
      };
      // Tarixga faqat javob topilgan va mavzuga oid savollar yoziladi
      if (result.matched && result.relevant !== false) {
        setHistory((prev) => {
          const next = [item, ...prev];
          saveHistory(next);
          return next;
        });
        setExpandedId(id);
        setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, historyY.current - 8), animated: true }), 250);
      }

      // Ovoz avtomatik yaratilmaydi va ijro etilmaydi — mashinist ▶ bosganda (xarajat faqat kerak bo'lganda)
    },
    [player],
  );

  const handleError = useCallback((e: unknown) => {
    const err = e instanceof ApiError ? e : null;
    if (err?.kind === 'network') setServerOnline(false);
    if (!err) console.warn('[Ovoz] xatolik:', e);
    // Kutilmagan xatoda ham haqiqiy sababni ko'rsatamiz — muammoni topish oson bo'lsin
    const reason = e instanceof Error ? e.message : String(e);
    setErrorText(err ? err.message : `Ovoz yozishda xatolik: ${reason}`);
    setPhase('error');
  }, []);

  /** Tayyorlangan, lekin yozilmay qolgan (yoki yozayotgan) sessiyani tozalaydi — aks holda keyingi prepare "already prepared" xatosini beradi */
  const resetRecorder = useCallback(async () => {
    try {
      const st = recorder.getStatus();
      if (st.isRecording || st.canRecord) await recorder.stop();
    } catch {
      // stop() yozish boshlanmagan bo'lsa ham sessiyani tozalaydi, xatosi muhim emas
    }
  }, [recorder]);

  const startRecording = useCallback(async () => {
    if (phase === 'processing') return;
    pressActive.current = true;
    setSeriesAsk(null);
    player.pause();
    setPlayingId(null);
    setErrorText(null);

    const run = async () => {
      const current = await getRecordingPermissionsAsync();
      if (!current.granted) {
        // Ruxsat berilsa — shu bosishning o'zida yozish boshlanadi
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          pressActive.current = false;
          setErrorText(t('Mikrofonga ruxsat berilmadi. Telefon sozlamalaridan ilovaga mikrofon ruxsatini bering.'));
          setPhase('error');
          return;
        }
      }
      setNotice(null);
      await resetRecorder();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      // Tayyorlanish paytida tugma qayta bosilgan (bekor qilingan) bo'lsa — sessiyani tozalab chiqamiz
      if (!pressActive.current) {
        await resetRecorder();
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
        return;
      }
      recorder.record();
      recordingStarted.current = true;
      setPhase('recording');
    };
    startPromise.current = run().catch(async (e) => {
      recordingStarted.current = false;
      await resetRecorder();
      handleError(e);
    });
  }, [phase, player, recorder, handleError, resetRecorder, t]);

  const stopRecording = useCallback(async () => {
    pressActive.current = false;
    await startPromise.current;
    if (!recordingStarted.current) return;
    recordingStarted.current = false;

    const durationMs = recorder.getStatus().durationMillis;
    try {
      await recorder.stop();
    } catch {
      // to'xtatishdagi xatoni e'tiborsiz qoldiramiz, pastda uri tekshiriladi
    }
    // Ijro karnaydan bo'lishi uchun yozish rejimini o'chiramiz (iOS)
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});

    const uri = recorder.uri;
    if (!uri || durationMs < MIN_RECORDING_MS) {
      setPhase('idle');
      setNotice(t("Juda qisqa. Tugmani bosing, savolni ayting, keyin yana bosing."));
      return;
    }

    setPhase('processing');
    try {
      const result = await voiceQuery(uri);
      await handleResult(result.stt_text, result, 'voice', Math.round(durationMs / 1000));
    } catch (e) {
      handleError(e);
    }
  }, [recorder, handleResult, handleError, t]);

  /** Mashinist seriyani tanladi — o'sha savol shu seriya bo'yicha qayta yuboriladi (tarixda ovozli savol bo'lib qoladi) */
  const chooseSeries = useCallback(
    async (series: string) => {
      if (!seriesAsk) return;
      const ask = seriesAsk;
      setSeriesAsk(null);
      setPhase('processing');
      try {
        const res = await textQuery(ask.question, series, 'voice');
        await handleResult(ask.question, res, 'voice', ask.duration);
      } catch (e) {
        handleError(e);
      }
    },
    [seriesAsk, handleResult, handleError],
  );

  /** Mikrofon tugmasi: bir bosish — yozish boshlanadi, yana bosish — to'xtaydi va savol yuboriladi */
  const toggleRecording = useCallback(() => {
    if (phase === 'processing') return;
    if (pressActive.current) stopRecording();
    else startRecording();
  }, [phase, startRecording, stopRecording]);

  // Tugmani qayta bosish esdan chiqsa — 60 soniyada yozish o'zi to'xtaydi
  useEffect(() => {
    if (phase === 'recording' && recorderState.durationMillis >= MAX_RECORDING_MS) stopRecording();
  }, [phase, recorderState.durationMillis, stopRecording]);

  const confirmDelete = (item: HistoryItem) => {
    Alert.alert(t('Savolni o‘chirish'), t('«{q}» tarixdan o‘chirilsinmi?', { q: item.question.slice(0, 80) }), [
      { text: t("Bekor qilish"), style: 'cancel' },
      {
        text: t("O‘chirish"),
        style: 'destructive',
        onPress: async () => {
          if (playingId === item.id) {
            player.pause();
            setPlayingId(null);
          }
          try {
            setHistory(await removeHistoryItem(item.id));
          } catch (e) {
            Alert.alert(t('O‘chirib bo‘lmadi'), e instanceof Error ? e.message : t("Server bilan aloqa yo‘q."));
          }
        },
      },
    ]);
  };

  const confirmClear = () => {
    if (!history.length) return;
    Alert.alert(t('Tarixni tozalash'), t("Barcha savollar tarixi o‘chiriladi. Davom etasizmi?"), [
      { text: t("Bekor qilish"), style: 'cancel' },
      {
        text: t("Tozalash"),
        style: 'destructive',
        onPress: async () => {
          try {
            await clearHistory();
          } catch (e) {
            Alert.alert(t('Tozalab bo‘lmadi'), e instanceof Error ? e.message : t("Server bilan aloqa yo‘q."));
            return;
          }
          setHistory([]);
          setExpandedId(null);
          if (playingId && playingId !== current?.id) {
            player.pause();
            setPlayingId(null);
          }
        },
      },
    ]);
  };

  const isRecording = phase === 'recording';
  const isProcessing = phase === 'processing';
  const result = current?.result;

  const micTitle = isRecording
    ? t('Tinglanmoqda... {time}', { time: formatSeconds(recorderState.durationMillis / 1000) })
    : isProcessing
      ? t(PROCESSING_STEPS[stepIndex])
      : t("Bosing va gapiring");
  const resultHint =
    phase === 'result' && seriesAsk
      ? { text: t('Qaysi lokomotiv bo‘yicha? Tanlang:'), tone: 'warn' as const }
      : phase === 'error'
      ? { text: errorText ?? t("Xatolik yuz berdi. Qayta urinib ko‘ring."), tone: 'error' as const }
      : phase === 'result' && result
        ? result.matched
          ? { text: t("Javob tayyor — pastda, savollar tarixida"), tone: 'ok' as const }
          : result.unclear
            ? { text: t("Savol tushunilmadi. Tugmani bosib, aniqroq qayta ayting."), tone: 'warn' as const }
            : { text: t("Aniq javob topilmadi. Savolni boshqacharoq so‘rab ko‘ring."), tone: 'warn' as const }
        : null;
  const micHint = isRecording
    ? t("Gapirib bo‘lgach, tugmani yana bosing")
    : isProcessing
      ? t("Iltimos, kuting...")
      : notice ?? resultHint?.text ?? t("Bosing, savolni ayting, tugatgach yana bosing");
  const hintTone = isRecording || isProcessing ? null : notice ? 'warn' : resultHint?.tone ?? null;

  const ringScale = level.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const initials = `${user?.firstname?.[0] ?? ''}${user?.lastname?.[0] ?? ''}`.toUpperCase() || 'M';
  const online = serverOnline === true;

  return (
    <View style={styles.container}>
      {/* Sarlavha qotirilgan — kontent ostida aylanadi */}
      <View style={styles.fixedHead}>
      {/* Yuqori panel */}
      <View style={styles.topBar}>
        <View style={styles.trainIcon}>
          <TrainFront size={20} color={T.brandText} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.topTitleRow}>
            <Text style={styles.topTitle} numberOfLines={1}>AI assist</Text>
            <View style={[styles.stateBadge, !online && styles.stateBadgeOff]}>
              <Text style={[styles.stateBadgeText, !online && styles.stateBadgeTextOff]}>
                {serverOnline === null ? '...' : online ? t("FAOL") : t("OFLAYN")}
              </Text>
            </View>
          </View>
          <Text style={styles.topSub} numberOfLines={1}>{t("O‘zbekiston Temir Yo‘llari")}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={toggle} accessibilityLabel={isDark ? t("Kunduzgi rejim") : t("Tungi rejim")}>
          {isDark ? <Sun size={18} color={T.text2} /> : <Moon size={18} color={T.text2} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.avatar} onPress={() => onNavigate('profil')} accessibilityLabel={t("Profil")}>
          <Text style={styles.avatarText}>{initials}</Text>
          <View style={[styles.avatarDot, { backgroundColor: online ? '#22c55e' : serverOnline === false ? '#ef4444' : T.faint }]} />
        </TouchableOpacity>
      </View>
      </View>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={[styles.contentContainer, contentStyle]} showsVerticalScrollIndicator={false}>

      {/* Mikrofon kartasi */}
      <View style={styles.micCard}>
        <View style={styles.rolePill}>
          <View style={styles.roleDot} />
          <Text style={styles.rolePillText}>{t("AI Ovozli Dispetcher / Maslahatchi")}</Text>
        </View>

        <View style={[styles.micArea, { width: orb * 1.5, height: orb * 1.5 }]}>
          {isRecording && (
            <Animated.View
              style={[styles.micPulse, { width: orb, height: orb, borderRadius: orb / 2, transform: [{ scale: ringScale }] }]}
            />
          )}
          {isProcessing && (
            <Animated.View
              style={[
                styles.spinnerRing,
                { width: orb + 16, height: orb + 16, borderRadius: (orb + 16) / 2, transform: [{ rotate: spinDeg }] },
              ]}
            />
          )}
          <TouchableOpacity
            style={[styles.micBtn, { width: orb, height: orb, borderRadius: orb / 2 }, isRecording && styles.micBtnActive]}
            onPress={toggleRecording}
            disabled={isProcessing}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? t("Yozishni to‘xtatish va savolni yuborish") : t("Gapirishni boshlash")}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" size="large" />
            ) : isRecording ? (
              <Square size={Math.round(orb * 0.26)} color="#ffffff" fill="#ffffff" />
            ) : (
              <Mic size={Math.round(orb * 0.3)} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.micTitle}>{micTitle}</Text>
        <Text style={[styles.micHint, hintTone === 'warn' && styles.micNotice, hintTone === 'error' && styles.micError, hintTone === 'ok' && styles.micOk]}>{micHint}</Text>

        {/* Qaysi lokomotiv seriyasi bo'yicha — tanlash */}
        {phase === 'result' && !!seriesAsk && (
          <View style={styles.seriesBox}>
            <Text style={styles.seriesQuestion} numberOfLines={2}>«{seriesAsk.question}»</Text>
            <View style={styles.seriesRow}>
              {seriesAsk.options.map((sr) => (
                <TouchableOpacity key={sr} style={styles.seriesBtn} onPress={() => chooseSeries(sr)} activeOpacity={0.8}>
                  <TrainFront size={16} color="#ffffff" />
                  <Text style={styles.seriesBtnText}>{sr === 'ТЭМ' ? t('ТЭМ (teplovoz)') : sr}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.wave}>
          {WAVE.map((k, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                isRecording && styles.waveBarActive,
                { height: 26, transform: [{ scaleY: level.interpolate({ inputRange: [0, 1], outputRange: [k * 0.6, Math.min(1, k * 0.6 + 0.6)] }) }] },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Savollar tarixi */}
      <View style={styles.historySectionHeader} onLayout={(e) => (historyY.current = e.nativeEvent.layout.y)}>
        <Text style={styles.historyTitle}>{t("Savollar tarixi")}</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={confirmClear} disabled={!history.length}>
          <Text style={[styles.clearText, !history.length && styles.clearTextDisabled]}>{t("Tozalash")}</Text>
          <History size={14} color={history.length ? T.brandText : T.faint} />
        </TouchableOpacity>
      </View>

      {history.length === 0 && (
        <View style={styles.emptyHistory}>
          <Mic size={22} color={T.faint} />
          <Text style={styles.emptyText}>{t("Hali savol berilmagan. Birinchi savolingizni ovoz bilan bering.")}</Text>
        </View>
      )}

      {groupByDay(history).map((group) => (
        <View key={group.label} style={styles.dateGroup}>
          <Text style={styles.groupDate}>{group.label}</Text>
          {group.items.map((item) => {
            const expanded = expandedId === item.id;
            const isPlaying = playingId === item.id && playerStatus.playing;
            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.hCardMain}>
                  <TouchableOpacity
                    style={[styles.playIconBtn, !item.audioUrl && !item.kbId && !item.audioId && styles.playIconBtnDisabled]}
                    onPress={() => playItem(item)}
                    disabled={(!item.audioUrl && !item.kbId && !item.audioId) || audioPendingId === item.id}
                  >
                    {audioPendingId === item.id && !item.audioUrl ? (
                      <ActivityIndicator size="small" color={T.brandText} />
                    ) : isPlaying ? (
                      <Pause size={16} color={T.brandText} />
                    ) : (
                      <Play size={16} color={item.audioUrl ? T.brandText : T.faint} />
                    )}
                  </TouchableOpacity>
                  <View style={styles.hInfo}>
                    <Text style={styles.hTitle} numberOfLines={expanded ? undefined : 2}>
                      {item.question}
                    </Text>
                    <View style={styles.hMeta}>
                      <Text style={styles.hTime}>{timeLabel(item.createdAt)}</Text>
                      <Text style={styles.hMetaDot}>•</Text>
                      <Text style={styles.hDuration}>
                        {item.source === 'voice' ? `🎤 ${formatSeconds(item.duration ?? 0)}` : `⌨️ ${t('tezkor savol')}`}
                      </Text>
                    </View>
                  </View>
                </View>

                {expanded && !!item.answer && (
                  <View style={styles.hAnswerBox}>
                    <Text style={styles.hAnswerText}>{item.answer}</Text>
                  </View>
                )}

                <View style={styles.hCardFooter}>
                  {item.answerUpdatedAt ? (
                    <View style={[styles.hStatusBadge, { backgroundColor: T.brandSoft }]}>
                      <Text style={[styles.hStatusText, { color: T.brandText }]}>{t("Javob yangilandi")}</Text>
                    </View>
                  ) : (
                    <View style={[styles.hStatusBadge, { backgroundColor: T.greenSoft }]}>
                      <Text style={[styles.hStatusText, { color: T.green }]}>{t("Javob topildi")}</Text>
                    </View>
                  )}
                  <View style={styles.hActions}>
                    <TouchableOpacity style={styles.viewAnswerBtn} onPress={() => setExpandedId(expanded ? null : item.id)}>
                      <Text style={styles.viewAnswerText}>{expanded ? t("Yopish") : t("Javobni ko‘rish")}</Text>
                      {expanded ? <ChevronUp size={14} color={T.brandText} /> : <ChevronDown size={14} color={T.brandText} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => confirmDelete(item)}
                      hitSlop={8}
                      accessibilityLabel={t("Savolni tarixdan o‘chirish")}
                    >
                      <Trash2 size={15} color={T.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
      </ScrollView>
    </View>
  );
}

// To'lqin ustunlari balandligi (tinch holatda ham ko'rinib turadi, gapirganda ovozga qarab o'sadi)
const WAVE = [0.35, 0.6, 0.85, 0.5, 1, 0.7, 0.9, 0.45, 0.65, 0.3];

const makeStyles = (T: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    scroll: { flex: 1 },
    contentContainer: { paddingHorizontal: 16 },
    fixedHead: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, backgroundColor: T.bg },

    // Yuqori panel
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, marginBottom: 12 },
    trainIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: T.brandSoft,
      borderWidth: 1,
      borderColor: T.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    topTitle: { fontSize: 15, fontWeight: '800', color: T.text, flexShrink: 1 },
    topSub: { fontSize: 11, color: T.muted, marginTop: 1 },
    stateBadge: { backgroundColor: T.greenSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.35)' },
    stateBadgeOff: { backgroundColor: T.redSoft, borderColor: T.redBorder },
    stateBadgeText: { fontSize: 9, fontWeight: '800', color: T.green, letterSpacing: 0.5 },
    stateBadgeTextOff: { color: T.red },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.brandBright, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
    avatarDot: { position: 'absolute', right: -2, bottom: -2, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: T.bg },

    // Mikrofon kartasi
    micCard: {
      backgroundColor: T.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: T.border,
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 16,
      marginBottom: 18,
    },
    rolePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: T.brandSoft,
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.35)',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.brandText },
    rolePillText: { fontSize: 12, fontWeight: '700', color: T.brandText },
    micArea: { alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
    micPulse: { position: 'absolute', backgroundColor: 'rgba(59, 130, 246, 0.25)' },
    spinnerRing: {
      position: 'absolute',
      borderWidth: 3,
      borderColor: 'rgba(59, 130, 246, 0.2)',
      borderTopColor: T.brandText,
    },
    micBtn: {
      backgroundColor: T.brandBright,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.55,
      shadowRadius: 24,
      elevation: 14,
    },
    micBtnActive: { backgroundColor: '#ef4444', shadowColor: '#ef4444' },
    micTitle: { fontSize: 16, fontWeight: '800', color: T.text, marginTop: 4, textAlign: 'center' },
    micHint: { fontSize: 12, color: T.muted, marginTop: 4, textAlign: 'center' },
    micNotice: { color: T.amber, fontWeight: '600' },
    micError: { color: T.red, fontWeight: '600' },
    micOk: { color: T.green, fontWeight: '600' },
    seriesBox: { alignSelf: 'stretch', marginTop: 14, gap: 10 },
    seriesQuestion: { fontSize: 13, fontStyle: 'italic', color: T.text2, textAlign: 'center' },
    seriesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    seriesBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: T.brand,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    seriesBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
    wave: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, marginTop: 14 },
    waveBar: { width: 4, borderRadius: 2, backgroundColor: T.borderStrong },
    waveBarActive: { backgroundColor: T.brandText },

    // Tarix
    historySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    historyTitle: { fontSize: 17, fontWeight: '800', color: T.text },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    clearText: { fontSize: 12, fontWeight: '600', color: T.brandText },
    clearTextDisabled: { color: T.faint },
    emptyHistory: { alignItems: 'center', backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 20, gap: 8 },
    emptyText: { fontSize: 12, color: T.muted, textAlign: 'center' },
    dateGroup: { marginBottom: 14 },
    groupDate: { fontSize: 10, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    historyCard: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
    hCardMain: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    playIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.brandSoft, alignItems: 'center', justifyContent: 'center' },
    playIconBtnDisabled: { backgroundColor: T.surface2 },
    hInfo: { flex: 1 },
    hTitle: { fontSize: 13, fontWeight: '700', color: T.text },
    hMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    hTime: { fontSize: 10, color: T.muted },
    hMetaDot: { fontSize: 10, color: T.faint },
    hDuration: { fontSize: 10, color: T.text2 },
    hAnswerBox: { backgroundColor: T.brandSoft, borderRadius: 12, padding: 10, marginBottom: 10 },
    hAnswerText: { fontSize: 12, color: T.text, lineHeight: 18 },
    hCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: T.border,
      paddingTop: 8,
    },
    hStatusBadge: { flexShrink: 1, marginRight: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    hStatusText: { fontSize: 10, fontWeight: '700' },
    hActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    deleteBtn: { padding: 2 },
    viewAnswerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    viewAnswerText: { fontSize: 12, fontWeight: '700', color: T.brandText },
  });
