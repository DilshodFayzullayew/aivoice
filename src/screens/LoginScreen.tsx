import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  KeyboardEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, User } from 'lucide-react-native';
import { useAuth } from '../auth';
import { ApiError, getApiBaseUrl } from '../api/voiceApi';
import { useI18n } from '../i18n';

const LOGO = require('../../assets/uty-logo.png');

export default function LoginScreen() {
  const { login } = useAuth();
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  // Klaviatura balandligi: edge-to-edge rejimida Android ekranni o'zi qisqartirmaydi,
  // shuning uchun formani klaviatura ustiga o'zimiz ko'taramiz
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardOpen = keyboardHeight > 0;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Faol maydon va "Kirish" tugmasi ko'rinib turishi uchun pastga suramiz
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    };
    const onHide = () => setKeyboardHeight(0);
    const subs = [Keyboard.addListener(showEvent, onShow), Keyboard.addListener(hideEvent, onHide)];
    return () => subs.forEach((sub) => sub.remove());
  }, []);

  const revealForm = () => {
    if (keyboardOpen) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const appear = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const runShake = () => {
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 55, useNativeDriver: true })),
    ).start();
  };

  const submit = async () => {
    if (!username.trim() || !password) {
      setError(t('Login va parolni kiriting.'));
      runShake();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.kind === 'network'
            ? t('Serverga ulanib bo‘lmadi. Internet aloqasini tekshiring ({url}).', { url: getApiBaseUrl() })
            : e.message
          : t('Kirishda xatolik yuz berdi.');
      setError(msg);
      runShake();
    } finally {
      setBusy(false);
    }
  };

  const fullLogoH = Math.round(Math.min(130, Math.max(96, width * 0.27)));
  // Klaviatura ochiq bo'lsa gerb kichrayadi — forma uchun joy bo'shaydi
  const logoH = keyboardOpen ? Math.round(fullLogoH * 0.5) : fullLogoH;

  return (
    <View style={styles.root}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="loginBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0a2f8f" />
            <Stop offset="0.55" stopColor="#0051df" />
            <Stop offset="1" stopColor="#2f6bff" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#loginBg)" />
        <Circle cx={width * 0.95} cy={height * 0.08} r={width * 0.45} fill="#ffffff" fillOpacity={0.05} />
        <Circle cx={0} cy={height * 0.9} r={width * 0.6} fill="#ffffff" fillOpacity={0.04} />
      </Svg>

      <View style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + (keyboardOpen ? 12 : 24),
              paddingBottom: keyboardOpen ? keyboardHeight + 16 : insets.bottom + 24,
              justifyContent: keyboardOpen ? 'flex-end' : 'center',
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.header,
              keyboardOpen && styles.headerCompact,
              { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
            ]}
          >
            <Image source={LOGO} style={{ width: Math.round(logoH * (165 / 199)), height: logoH }} resizeMode="contain" />
            <Text style={[styles.brandTop, keyboardOpen && styles.brandTopCompact]}>O‘ZBEKISTON</Text>
            {!keyboardOpen && (
              <>
                <Text style={styles.brandBottom}>TEMIR YO‘LLARI</Text>
                <Text style={styles.tagline}>AI assist</Text>
              </>
            )}
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: appear,
                transform: [
                  { translateX: shake },
                  { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
                ],
              },
            ]}
          >
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t('Tizimga kirish')}</Text>
              {/* Til nomi har doim o'z tilida */}
              <View style={styles.langSwitch}>
                {(['uz', 'ru'] as const).map((l) => (
                  <TouchableOpacity key={l} style={[styles.langBtn, lang === l && styles.langBtnActive]} onPress={() => setLang(l)}>
                    <Text style={[styles.langText, lang === l && styles.langTextActive]}>{l === 'uz' ? 'UZ' : 'RU'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={styles.subtitle}>{t('Administrator bergan login va parolni kiriting')}</Text>

            <Text style={styles.label}>{t('Login')}</Text>
            <View style={[styles.inputRow, !!error && !username.trim() && styles.inputError]}>
              <User size={18} color="#737687" />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  setError(null);
                }}
                placeholder={t('masalan: akmal')}
                placeholderTextColor="#a3a6b4"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                onFocus={revealForm}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!busy}
              />
            </View>

            <Text style={styles.label}>{t('Parol')}</Text>
            <View style={[styles.inputRow, !!error && !password && styles.inputError]}>
              <Lock size={18} color="#737687" />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
                placeholder="••••••••"
                placeholderTextColor="#a3a6b4"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                onFocus={revealForm}
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!busy}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityLabel={t('Parolni ko‘rsatish')}>
                {showPassword ? <EyeOff size={18} color="#737687" /> : <Eye size={18} color="#737687" />}
              </TouchableOpacity>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#ba1a1a" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.button, busy && styles.buttonBusy]} onPress={submit} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#ffffff" /> : <LogIn size={18} color="#ffffff" />}
              <Text style={styles.buttonText}>{busy ? 'Tekshirilmoqda...' : 'Kirish'}</Text>
            </TouchableOpacity>

            <Text style={styles.help}>{t('Login yoki parolni unutgan bo‘lsangiz, depo administratoriga murojaat qiling.')}</Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  langSwitch: { flexDirection: 'row', backgroundColor: '#eef2ff', borderRadius: 10, padding: 3, gap: 3 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  langBtnActive: { backgroundColor: '#0051df' },
  langText: { fontSize: 12, fontWeight: '800', color: '#737687' },
  langTextActive: { color: '#ffffff' },
  root: {
    flex: 1,
    backgroundColor: '#0051df',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  headerCompact: {
    marginBottom: 14,
  },
  brandTopCompact: {
    marginTop: 6,
    fontSize: 18,
  },
  brandTop: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  brandBottom: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f7dc9c',
    letterSpacing: 5,
    marginTop: 2,
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#001a5c',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#131b2e',
  },
  subtitle: {
    fontSize: 13,
    color: '#737687',
    marginTop: 4,
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#434655',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e5f1',
    backgroundColor: '#f8f9ff',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputError: {
    borderColor: '#ba1a1a',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#131b2e',
    paddingVertical: 0,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff1f0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#93000a',
    lineHeight: 18,
  },
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0051df',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0051df',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonBusy: {
    backgroundColor: '#5b84e8',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  help: {
    marginTop: 16,
    fontSize: 12,
    color: '#737687',
    textAlign: 'center',
    lineHeight: 17,
  },
});
