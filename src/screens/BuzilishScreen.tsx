import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Film,
  ImagePlus,
  MessageSquareText,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  Train,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import { CONTENT_MAX_WIDTH, useScreenContentStyle } from '../layout';
import {
  ApiError,
  FaultReport,
  ReportStatus,
  createReport,
  deleteMyReport,
  fetchMyReports,
  transcribeReport,
  uploadReportMedia,
} from '../api/voiceApi';
import { dayLabel, timeLabel } from '../storage/voiceHistory';
import { Palette, useStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';

interface Props {
  onNavigate: (screen: any) => void;
}

type Phase = 'idle' | 'recording' | 'transcribing' | 'review';

interface Attachment {
  uri: string;
  kind: 'image' | 'video';
  mimeType: string;
  duration?: number;
}

const MAX_ATTACHMENTS = 10;
const MIN_RECORDING_MS = 700;
const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000, isMeteringEnabled: true };

// Holat nomi kod bo'yicha (server o'zbekcha nom qaytaradi — tarjima ilovada)
const STATUS_NAME: Record<string, string> = { new: 'Yangi', in_progress: 'Ko‘rib chiqilmoqda', resolved: 'Hal qilindi' };

const STATUS_STYLE: Record<ReportStatus, { bg: string; fg: string }> = {
  new: { bg: 'rgba(239, 68, 68, 0.14)', fg: '#ef4444' },
  in_progress: { bg: 'rgba(245, 158, 11, 0.14)', fg: '#d97706' },
  resolved: { bg: 'rgba(16, 185, 129, 0.14)', fg: '#10b981' },
};

const formatSeconds = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const toAttachment = (a: ImagePicker.ImagePickerAsset): Attachment => {
  const kind = a.type === 'video' ? 'video' : 'image';
  return {
    uri: a.uri,
    kind,
    mimeType: a.mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    duration: a.duration ? a.duration / 1000 : undefined,
  };
};

export default function BuzilishScreen({ onNavigate }: Props) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const { width } = useWindowDimensions();
  const orb = Math.round(Math.min(150, Math.max(116, width * 0.34)));

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 80);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const [phase, setPhase] = useState<Phase>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [locomotive, setLocomotive] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState<{ step: string } | null>(null);
  const [notice, setNotice] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [reports, setReports] = useState<FaultReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);

  const pressActive = useRef(false);
  const recordingStarted = useRef(false);
  const startPromise = useRef<Promise<void> | null>(null);
  const level = useRef(new Animated.Value(0)).current;

  const loadReports = useCallback(async () => {
    try {
      setReports(await fetchMyReports());
    } catch {
      // ro'yxat yuklanmasa forma baribir ishlaydi
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }, [loadReports]);

  const meter = recorderState.isRecording ? Math.max(0, Math.min(1, ((recorderState.metering ?? -60) + 60) / 60)) : 0;
  useEffect(() => {
    Animated.timing(level, { toValue: meter, duration: 90, useNativeDriver: true }).start();
  }, [meter]);

  useEffect(() => {
    if (playerStatus.didJustFinish) player.seekTo(0).catch(() => {});
  }, [playerStatus.didJustFinish]);

  /* ---------------- Ovoz yozish ---------------- */

  const resetRecorder = useCallback(async () => {
    try {
      const st = recorder.getStatus();
      if (st.isRecording || st.canRecord) await recorder.stop();
    } catch {
      // tayyorlangan, lekin boshlanmagan sessiya — xatosi muhim emas
    }
  }, [recorder]);

  const startRecording = useCallback(async () => {
    if (phase === 'transcribing' || sending) return;
    pressActive.current = true;
    player.pause();
    setNotice(null);

    const run = async () => {
      const current = await getRecordingPermissionsAsync();
      if (!current.granted) {
        const perm = await requestRecordingPermissionsAsync();
        setNotice(
          perm.granted
            ? { type: 'info', text: t("Ruxsat berildi. Endi tugmani bosib turib gapiring.") }
            : { type: 'error', text: t("Mikrofonga ruxsat berilmadi. Telefon sozlamalaridan ruxsat bering.") },
        );
        return;
      }
      await resetRecorder();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      if (!pressActive.current) {
        await resetRecorder();
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
        setNotice({ type: 'info', text: t("Tugmani bosib turing, nosozlikni aytib bering, keyin qo‘yib yuboring.") });
        return;
      }
      recorder.record();
      recordingStarted.current = true;
      setPhase('recording');
    };
    startPromise.current = run().catch(async (e) => {
      recordingStarted.current = false;
      await resetRecorder();
      setNotice({ type: 'error', text: t('Ovoz yozishda xatolik: {err}', { err: e instanceof Error ? e.message : String(e) }) });
    });
  }, [phase, sending, player, recorder, resetRecorder, t]);

  const stopRecording = useCallback(async () => {
    pressActive.current = false;
    await startPromise.current;
    if (!recordingStarted.current) return;
    recordingStarted.current = false;

    const durationMs = recorder.getStatus().durationMillis;
    try {
      await recorder.stop();
    } catch {
      // pastda uri tekshiriladi
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});

    const uri = recorder.uri;
    if (!uri || durationMs < MIN_RECORDING_MS) {
      setPhase(audioUri ? 'review' : 'idle');
      setNotice({ type: 'info', text: t("Juda qisqa. Tugmani bosib turib nosozlikni batafsil aytib bering.") });
      return;
    }

    setAudioUri(uri);
    setAudioDuration(durationMs / 1000);
    player.replace({ uri });
    setPhase('transcribing');
    try {
      const text = await transcribeReport(uri);
      // Qayta yozilganda yangi ovoz va uning matni avvalgisining o'rnini egallaydi
      setTranscript(text);
      setPhase('review');
    } catch (e) {
      setPhase('review');
      setNotice({
        type: 'error',
        text: `${e instanceof ApiError ? e.message : t('Ovozni matnga o‘girib bo‘lmadi.')} ${t('Matnni qo‘lda yozishingiz mumkin — ovoz baribir yuboriladi.')}`,
      });
    }
  }, [recorder, player, audioUri, t]);

  /* ---------------- Rasm va video ---------------- */

  const remaining = MAX_ATTACHMENTS - attachments.length;

  const addFromCamera = async (mode: 'images' | 'videos') => {
    if (remaining <= 0) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setNotice({ type: 'error', text: 'Kameraga ruxsat berilmadi. Telefon sozlamalaridan ruxsat bering.' });
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: [mode], quality: 0.7, videoMaxDuration: 60 });
    if (!res.canceled) setAttachments((list) => [...list, ...res.assets.map(toAttachment)].slice(0, MAX_ATTACHMENTS));
  };

  const addFromGallery = async () => {
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (!res.canceled) setAttachments((list) => [...list, ...res.assets.map(toAttachment)].slice(0, MAX_ATTACHMENTS));
  };

  const removeAttachment = (uri: string) => setAttachments((list) => list.filter((a) => a.uri !== uri));

  /* ---------------- Yuborish ---------------- */

  const resetForm = () => {
    player.pause();
    setPhase('idle');
    setAudioUri(null);
    setAudioDuration(0);
    setTranscript('');
    setAttachments([]);
  };

  const canSend = (!!transcript.trim() || !!audioUri) && !sending && phase !== 'recording' && phase !== 'transcribing';

  const submit = async () => {
    if (!canSend) return;
    player.pause();
    setNotice(null);
    setSending({ step: t("Xabar yuborilmoqda...") });
    try {
      const report = await createReport({
        audioUri,
        audioDuration,
        transcript: transcript.trim(),
        locomotive: locomotive.trim(),
      });
      let failed = 0;
      for (let i = 0; i < attachments.length; i++) {
        const a = attachments[i];
        setSending({ step: t(a.kind === 'video' ? 'Video yuklanmoqda ({i}/{n})...' : 'Rasm yuklanmoqda ({i}/{n})...', { i: i + 1, n: attachments.length }) });
        try {
          await uploadReportMedia(report.id, a.uri, a.mimeType);
        } catch {
          failed++;
        }
      }
      resetForm();
      setNotice(
        failed
          ? { type: 'error', text: t('Xabar #{id} yuborildi, lekin {failed} ta fayl yuklanmadi.', { id: report.id, failed }) }
          : { type: 'success', text: t('Xabar #{id} yuborildi. Dispetcher ko‘rib chiqadi.', { id: report.id }) },
      );
      loadReports();
    } catch (e) {
      setNotice({ type: 'error', text: e instanceof ApiError ? e.message : t("Xabarni yuborib bo‘lmadi.") });
    } finally {
      setSending(null);
    }
  };

  const confirmDelete = (r: FaultReport) => {
    Alert.alert(t('Xabarni o‘chirish'), t('#{id} xabar o‘chirilsinmi?', { id: r.id }), [
      { text: t("Bekor qilish"), style: 'cancel' },
      {
        text: t("O‘chirish"),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMyReport(r.id);
            setReports((list) => list.filter((x) => x.id !== r.id));
          } catch (e) {
            Alert.alert(t('O‘chirib bo‘lmadi'), e instanceof Error ? e.message : t("Server bilan aloqa yo‘q."));
          }
        },
      },
    ]);
  };

  const isRecording = phase === 'recording';
  const isTranscribing = phase === 'transcribing';
  const ringScale = level.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const previewPlaying = playerStatus.playing;

  return (
    <View style={styles.container}>
      {/* Sarlavha qotirilgan — kontent ostida aylanadi */}
      <View style={styles.fixedHead}>
      {/* Sarlavha */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <TriangleAlert size={13} color={T.red} />
          <Text style={styles.headerBadgeText}>{t("NOSOZLIK HAQIDA XABAR")}</Text>
        </View>
        <Text style={styles.headerDesc}>{t("Nosozlikni ovoz bilan aytib bering, rasm yoki video biriktiring — dispetcherga yuboriladi")}</Text>
      </View>
      </View>
      <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >

      {/* Ovoz yozish tugmasi */}
      <View style={styles.orbArea}>
        <View style={[styles.orbBox, { width: orb * 1.5, height: orb * 1.5 }]}>
          <Animated.View
            style={[
              styles.orbRing,
              { width: orb * 1.35, height: orb * 1.35, borderRadius: orb, transform: [{ scale: ringScale }] },
              isRecording && styles.orbRingActive,
            ]}
          />
          <TouchableOpacity
            style={[styles.orb, { width: orb, height: orb, borderRadius: orb / 2 }, isRecording && styles.orbActive]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={isTranscribing || !!sending}
            activeOpacity={0.9}
            accessibilityLabel={t("Bosib turing va nosozlikni aytib bering")}
          >
            {isTranscribing ? <ActivityIndicator color="#ffffff" size="large" /> : <Mic size={Math.round(orb * 0.32)} color="#ffffff" />}
          </TouchableOpacity>
        </View>
        <Text style={styles.orbStatus}>
          {isRecording
            ? t('Yozilmoqda... {time}', { time: formatSeconds(recorderState.durationMillis / 1000) })
            : isTranscribing
              ? t("Ovoz matnga o‘girilmoqda...")
              : audioUri
                ? t("Qayta yozish uchun yana bosib turing")
                : t("Bosib turing va nosozlikni aytib bering")}
        </Text>
      </View>

      {!!notice && (
        <View style={[styles.notice, styles[`notice_${notice.type}`]]}>
          {notice.type === 'success' ? <CheckCircle2 size={16} color={T.green} /> : <TriangleAlert size={16} color={notice.type === 'error' ? '#ba1a1a' : '#b45309'} />}
          <Text style={[styles.noticeText, styles[`noticeText_${notice.type}`]]}>{notice.text}</Text>
        </View>
      )}

      {/* Xabar formasi */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <MessageSquareText size={16} color={T.brandText} />
          <Text style={styles.cardTitle}>{t("Xabar matni")}</Text>
          {!!audioUri && (
            <TouchableOpacity style={styles.previewBtn} onPress={() => (previewPlaying ? player.pause() : player.play())}>
              {previewPlaying ? <Pause size={14} color={T.brandText} /> : <Play size={14} color={T.brandText} />}
              <Text style={styles.previewText}>{formatSeconds(audioDuration)}</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={styles.textArea}
          value={transcript}
          onChangeText={setTranscript}
          placeholder={t("Ovoz yozganingizdan keyin matn shu yerda chiqadi. Kerak bo‘lsa tuzating yoki qo‘lda yozing.")}
          placeholderTextColor={T.faint}
          multiline
          textAlignVertical="top"
          editable={!sending}
        />

        <View style={styles.row}>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <Train size={15} color={T.muted} />
            <TextInput
              style={styles.input}
              value={locomotive}
              onChangeText={setLocomotive}
              placeholder={t("Lokomotiv (VL80-1204)")}
              placeholderTextColor={T.faint}
              autoCapitalize="characters"
              editable={!sending}
            />
          </View>
        </View>

        {/* Rasm va video */}
        <View style={styles.mediaHead}>
          <Text style={styles.mediaTitle}>{t('Rasm va video')} ({attachments.length}/{MAX_ATTACHMENTS})</Text>
        </View>
        <View style={styles.mediaButtons}>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => addFromCamera('images')} disabled={remaining <= 0 || !!sending}>
            <Camera size={18} color={T.brandText} />
            <Text style={styles.mediaBtnText}>{t("Rasm olish")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => addFromCamera('videos')} disabled={remaining <= 0 || !!sending}>
            <Film size={18} color={T.brandText} />
            <Text style={styles.mediaBtnText}>{t("Video olish")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={addFromGallery} disabled={remaining <= 0 || !!sending}>
            <ImagePlus size={18} color={T.brandText} />
            <Text style={styles.mediaBtnText}>{t("Galereya")}</Text>
          </TouchableOpacity>
        </View>

        {attachments.length > 0 && (
          <View style={styles.thumbs}>
            {attachments.map((a) => (
              <View key={a.uri} style={styles.thumb}>
                {a.kind === 'image' ? (
                  <Pressable onPress={() => setViewer(a.uri)}>
                    <Image source={{ uri: a.uri }} style={styles.thumbImg} />
                  </Pressable>
                ) : (
                  <View style={[styles.thumbImg, styles.thumbVideo]}>
                    <Film size={22} color="#ffffff" />
                    {!!a.duration && <Text style={styles.thumbVideoText}>{formatSeconds(a.duration)}</Text>}
                  </View>
                )}
                {!sending && (
                  <TouchableOpacity style={styles.thumbRemove} onPress={() => removeAttachment(a.uri)} hitSlop={6}>
                    <X size={12} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          {(audioUri || transcript || attachments.length > 0) && !sending && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetForm}>
              <RotateCcw size={16} color={T.text2} />
              <Text style={styles.resetText}>{t("Tozalash")}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} onPress={submit} disabled={!canSend}>
            {sending ? <ActivityIndicator color="#ffffff" /> : <Send size={18} color="#ffffff" />}
            <Text style={styles.sendText} numberOfLines={1}>{sending ? sending.step : t("Xabarni yuborish")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mening xabarlarim */}
      <View style={styles.listHead}>
        <Text style={styles.listTitle}>{t("Mening xabarlarim")}</Text>
        <TouchableOpacity onPress={loadReports} hitSlop={8}>
          <RotateCcw size={16} color={T.brandText} />
        </TouchableOpacity>
      </View>

      {reportsLoading ? (
        <ActivityIndicator color={T.brandText} style={{ marginTop: 12 }} />
      ) : reports.length === 0 ? (
        <View style={styles.empty}>
          <TriangleAlert size={22} color={T.faint} />
          <Text style={styles.emptyText}>{t("Hali nosozlik haqida xabar yubormagansiz.")}</Text>
        </View>
      ) : (
        reports.map((r) => {
          const st = STATUS_STYLE[r.status];
          const expanded = expandedId === r.id;
          const images = r.media.filter((m) => m.kind === 'image');
          const videos = r.media.filter((m) => m.kind === 'video');
          const created = Date.parse(r.created_at);
          return (
            <TouchableOpacity key={r.id} style={styles.reportCard} activeOpacity={0.85} onPress={() => setExpandedId(expanded ? null : r.id)}>
              <View style={styles.reportTop}>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.fg }]}>{t(STATUS_NAME[r.status] ?? r.status_label)}</Text>
                </View>
                <Text style={styles.reportDate}>
                  #{r.id} • {dayLabel(created)}, {timeLabel(created)}
                </Text>
              </View>
              <Text style={styles.reportText} numberOfLines={expanded ? undefined : 2}>
                {r.transcript || t("(matn yo‘q)")}
              </Text>
              <View style={styles.reportTags}>
                {!!r.locomotive && (
                  <View style={styles.tag}>
                    <Train size={12} color={T.text2} />
                    <Text style={styles.tagText}>{r.locomotive}</Text>
                  </View>
                )}
                {images.length > 0 && <Text style={styles.tagText}>🖼 {images.length}</Text>}
                {videos.length > 0 && <Text style={styles.tagText}>🎬 {videos.length}</Text>}
              </View>

              {!!r.admin_comment && (
                <View style={styles.adminComment}>
                  <Text style={styles.adminCommentLabel}>{t("DISPETCHER JAVOBI")}</Text>
                  <Text style={styles.adminCommentText}>{r.admin_comment}</Text>
                </View>
              )}

              {expanded && images.length > 0 && (
                <View style={styles.thumbs}>
                  {images.map((m) => (
                    <Pressable key={m.id} onPress={() => setViewer(m.url)}>
                      <Image source={{ uri: m.url }} style={styles.thumbImg} />
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.reportFooter}>
                <View style={styles.expandHint}>
                  <Text style={styles.expandText}>{expanded ? t("Yopish") : t("Batafsil")}</Text>
                  {expanded ? <ChevronUp size={14} color={T.brandText} /> : <ChevronDown size={14} color={T.brandText} />}
                </View>
                {r.status === 'new' && (
                  <TouchableOpacity onPress={() => confirmDelete(r)} hitSlop={8} accessibilityLabel={t("Xabarni o‘chirish")}>
                    <Trash2 size={16} color={T.red} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Rasmni to'liq ko'rish */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)} statusBarTranslucent>
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          {!!viewer && <Image source={{ uri: viewer }} style={styles.viewerImg} resizeMode="contain" />}
          <View style={styles.viewerClose}>
            <X size={22} color="#ffffff" />
          </View>
        </Pressable>
      </Modal>
      </ScrollView>
    </View>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  fixedHead: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, backgroundColor: T.bg },
  header: { alignItems: 'center', marginBottom: 6 },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.redSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 6,
  },
  headerBadgeText: { fontSize: 10, fontWeight: '800', color: T.red, letterSpacing: 0.5 },
  headerDesc: { fontSize: 12, color: T.muted, textAlign: 'center', paddingHorizontal: 12, lineHeight: 17 },

  orbArea: { alignItems: 'center', marginBottom: 10 },
  orbBox: { alignItems: 'center', justifyContent: 'center' },
  orbRing: { position: 'absolute', backgroundColor: T.redSoft, borderWidth: 1, borderColor: 'rgba(186, 26, 26, 0.18)' },
  orbRingActive: { backgroundColor: 'rgba(214, 40, 57, 0.14)', borderColor: 'rgba(214, 40, 57, 0.45)' },
  orb: {
    backgroundColor: '#e1373f',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e1373f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  orbActive: { backgroundColor: '#b3121f', transform: [{ scale: 1.06 }] },
  orbStatus: { fontSize: 12, fontWeight: '700', color: T.text2, marginTop: -6 },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 10, marginBottom: 12 },
  notice_error: { backgroundColor: T.redSoft },
  notice_success: { backgroundColor: T.greenSoft },
  notice_info: { backgroundColor: T.amberSoft },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17 },
  noticeText_error: { color: T.red },
  noticeText_success: { color: T.green },
  noticeText_info: { color: T.amber },

  card: {
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: T.text },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.brandSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  previewText: { fontSize: 11, fontWeight: '700', color: T.brandText },
  textArea: {
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.brandSoft,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: T.text,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 8 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.brandSoft,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  input: { flex: 1, fontSize: 14, color: T.text, paddingVertical: 0 },

  mediaHead: { marginTop: 6, marginBottom: 8 },
  mediaTitle: { fontSize: 12, fontWeight: '700', color: T.text2 },
  mediaButtons: { flexDirection: 'row', gap: 8 },
  mediaBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: T.border,
    backgroundColor: T.brandSoft,
  },
  mediaBtnText: { fontSize: 11, fontWeight: '700', color: T.brandText },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  thumb: { position: 'relative' },
  thumbImg: { width: 70, height: 70, borderRadius: 10, backgroundColor: T.surface2 },
  thumbVideo: { backgroundColor: T.inverse, alignItems: 'center', justifyContent: 'center', gap: 2 },
  thumbVideoText: { fontSize: 10, color: '#ffffff', fontWeight: '700' },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ba1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: T.border,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 14, backgroundColor: T.surface2 },
  resetText: { fontSize: 13, fontWeight: '700', color: T.text2 },
  sendBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#e1373f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  sendBtnDisabled: { backgroundColor: 'rgba(225, 55, 63, 0.4)' },
  sendText: { color: '#ffffff', fontSize: 15, fontWeight: '700', flexShrink: 1 },

  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle: { fontSize: 17, fontWeight: '800', color: T.text },
  empty: { alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 16, padding: 20 },
  emptyText: { fontSize: 12, color: T.muted, textAlign: 'center' },
  reportCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  reportTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800' },
  reportDate: { fontSize: 11, color: T.muted, flexShrink: 1 },
  reportText: { fontSize: 13, color: T.text, lineHeight: 19 },
  reportTags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, color: T.text2, fontWeight: '600' },
  adminComment: { marginTop: 10, backgroundColor: T.brandSoft, borderLeftWidth: 3, borderLeftColor: T.brandBright, borderRadius: 8, padding: 10 },
  adminCommentLabel: { fontSize: 9, fontWeight: '800', color: T.brandText, letterSpacing: 0.5, marginBottom: 3 },
  adminCommentText: { fontSize: 12, color: T.text, lineHeight: 17 },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  expandHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandText: { fontSize: 12, fontWeight: '700', color: T.brandText },

  viewer: { flex: 1, backgroundColor: 'rgba(5,10,25,0.94)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', top: 48, right: 20, padding: 6 },
});
