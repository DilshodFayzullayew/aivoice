import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, BackHandler, Animated, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Home, Mic, BookOpen, User, TriangleAlert, LucideIcon } from 'lucide-react-native';
import { TAB_BAR_HEIGHT, useTabBarBottom } from './src/layout';
import SplashIntro from './src/components/SplashIntro';
import { AuthProvider, useAuth } from './src/auth';
import LoginScreen from './src/screens/LoginScreen';

// Screens
import UmumiyScreen from './src/screens/UmumiyScreen';
import OvozScreen from './src/screens/OvozScreen';
import BuzilishScreen from './src/screens/BuzilishScreen';
import OrganishScreen from './src/screens/OrganishScreen';
import ProfilScreen from './src/screens/ProfilScreen';
import ReysTafsilotlariScreen from './src/screens/ReysTafsilotlariScreen';
import { runBackInterceptor } from './src/backInterceptor';
import { Palette, ThemeProvider, useStyles, useTheme } from './src/theme';
import { LanguageProvider, useI18n } from './src/i18n';
import PinScreen from './src/screens/PinScreen';
import { checkPin, clearPin, hasPin, savePin } from './src/pinStore';

// Native splash (toza ko'k ekran) animatsiya chizilguncha ushlab turiladi — oq chaqnash bo'lmaydi
SplashScreen.preventAutoHideAsync().catch(() => {});

export type ScreenName = 'umumiy' | 'ovoz' | 'buzilish' | 'organish' | 'profil' | 'reys_tafsilotlari';

const TABS: { screen: ScreenName; label: string; Icon: LucideIcon }[] = [
  { screen: 'umumiy', label: 'Umumiy', Icon: Home },
  { screen: 'ovoz', label: 'Ovoz', Icon: Mic },
  { screen: 'buzilish', label: 'Buzilish', Icon: TriangleAlert },
  { screen: 'organish', label: "O'rganish", Icon: BookOpen },
  { screen: 'profil', label: 'Profil', Icon: User },
];

/**
 * Pastki menyu tugmasi. Tanlangan bo'limning ikonkasi ko'k doira ichida bar ustiga ko'tariladi,
 * boshqa bo'lim tanlanganda joyiga qaytadi (yumshoq "sakrash" animatsiyasi bilan).
 */
function TabButton({ active, label: rawLabel, Icon, onPress }: { active: boolean; label: string; Icon: LucideIcon; onPress: () => void }) {
  const { t } = useI18n();
  const label = t(rawLabel);
  const { T } = useTheme();
  const styles = useStyles(makeStyles);
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: active ? 1 : 0,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [active]);

  const lift = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const circleScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabIconBox, { transform: [{ translateY: lift }] }]}>
        <Animated.View style={[styles.activeCircle, { opacity: progress, transform: [{ scale: circleScale }] }]} />
        <Icon size={active ? 24 : 22} color={active ? '#ffffff' : T.muted} />
      </Animated.View>
      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={[styles.tabLabel, active && styles.tabLabelActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
      <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Shuncha vaqt fonda turgan ilova qaytganda PIN so'raydi
const PIN_RELOCK_MS = 60_000;

const BACK_TARGET: Partial<Record<ScreenName, ScreenName>> = {
  reys_tafsilotlari: 'profil',
  ovoz: 'umumiy',
  buzilish: 'umumiy',
  organish: 'umumiy',
  profil: 'umumiy',
};

function AppContent() {
  const { T, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const tabBarBottom = useTabBarBottom();
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('umumiy');
  const [booting, setBooting] = useState(true);
  const { status, user, freshLogin, logout } = useAuth();

  // PIN-kod: checking — tekshirilmoqda, setup — o'rnatish, locked — PIN so'raladi, open — ochiq
  const [pinState, setPinState] = useState<'checking' | 'setup' | 'locked' | 'open'>('checking');
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'signedIn' || !user) {
      setPinState('checking');
      return;
    }
    let alive = true;
    hasPin(user.id).then((exists) => {
      if (!alive) return;
      // Hozirgina login-parol bilan kirgan bo'lsa PIN so'ralmaydi, faqat yo'q bo'lsa o'rnatiladi
      if (!exists) setPinState('setup');
      else setPinState(freshLogin ? 'open' : 'locked');
    });
    return () => {
      alive = false;
    };
  }, [status, user?.id, freshLogin]);

  // Ilova 1 daqiqadan ko'proq fonda tursa — qaytganda PIN qayta so'raladi
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background' || st === 'inactive') {
        if (backgroundAt.current === null) backgroundAt.current = Date.now();
      } else if (st === 'active') {
        const away = backgroundAt.current ? Date.now() - backgroundAt.current : 0;
        backgroundAt.current = null;
        if (away > PIN_RELOCK_MS) setPinState((p) => (p === 'open' ? 'locked' : p));
      }
    });
    return () => sub.remove();
  }, []);

  const forgotPin = async () => {
    if (user) await clearPin(user.id);
    await logout();
  };

  // Boshqa foydalanuvchi kirganda (yoki chiqqanda) ilova bosh sahifadan boshlanadi
  useEffect(() => {
    setCurrentScreen('umumiy');
  }, [user?.id]);

  const navigateTo = (screen: ScreenName) => {
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'umumiy':
        return <UmumiyScreen onNavigate={navigateTo} />;
      case 'ovoz':
        return <OvozScreen onNavigate={navigateTo} />;
      case 'buzilish':
        return <BuzilishScreen onNavigate={navigateTo} />;
      case 'organish':
        return <OrganishScreen onNavigate={navigateTo} />;
      case 'profil':
        return <ProfilScreen onNavigate={navigateTo} />;
      case 'reys_tafsilotlari':
        return <ReysTafsilotlariScreen onNavigate={navigateTo} onBack={() => navigateTo('profil')} />;
      default:
        return <UmumiyScreen onNavigate={navigateTo} />;
    }
  };

  // Android "orqaga" tugmasi ilovadan chiqib ketmasdan oldingi ekranga qaytaradi
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status !== 'signedIn') return false;
      // Qulflangan holatda orqaga tugmasi ilovani ochib qo'ymasin
      if (pinState !== 'open') return true;
      // Ekran ichidagi sahifalar (masalan O'rganish bo'limi) avval o'zi qaytaradi
      if (runBackInterceptor()) return true;
      const target = BACK_TARGET[currentScreen];
      if (!target) return false;
      setCurrentScreen(target);
      return true;
    });
    return () => sub.remove();
  }, [currentScreen, status, pinState]);

  const isFullScreenMode = currentScreen === 'reys_tafsilotlari';

  return (
    <View style={styles.root}>
      <StatusBar style={booting || status !== 'signedIn' || isDark ? 'light' : 'dark'} />
      {status === 'signedOut' && <LoginScreen />}
      {status === 'signedIn' && pinState !== 'checking' && (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.screenContainer}>
          {renderScreen()}
        </View>

        {/* Floating Bottom Navigation Bar */}
        {!isFullScreenMode && (
          <View style={[styles.bottomBarContainer, { bottom: tabBarBottom }]}>
            <View style={styles.bottomBar}>
              {TABS.map((t) => (
                <TabButton
                  key={t.screen}
                  active={currentScreen === t.screen}
                  label={t.label}
                  Icon={t.Icon}
                  onPress={() => navigateTo(t.screen)}
                />
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>
      )}

      {/* PIN-kod — ilova ustida: orqadagi holat (yozilayotgan xabar va h.k.) saqlanadi */}
      {status === 'signedIn' && user && (pinState === 'setup' || pinState === 'locked') && (
        <View style={StyleSheet.absoluteFill}>
        <PinScreen
          key={pinState}
          mode={pinState === 'setup' ? 'setup' : 'unlock'}
          userName={`${user.firstname} ${user.lastname}`.trim()}
          verify={(pin) => checkPin(user.id, pin)}
          onDone={async (pin) => {
            if (pinState === 'setup') await savePin(user.id, pin);
            setPinState('open');
          }}
          onForgot={forgotPin}
        />
        </View>
      )}

      {/* Kirishdagi animatsion yuklanish ekrani: ilova orqada tayyorlanib turadi */}
      {booting && <SplashIntro onReady={() => SplashScreen.hideAsync().catch(() => {})} onFinish={() => setBooting(false)} />}
    </View>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.brand,
  },
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  screenContainer: {
    flex: 1,
  },
  bottomBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bottomBar: {
    width: '100%',
    maxWidth: 420,
    height: TAB_BAR_HEIGHT,
    backgroundColor: T.tabBar,
    borderRadius: 33,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: T.muted,
    marginTop: 2,
  },
  tabLabelActive: {
    color: T.brandText,
    fontWeight: '700',
  },
  tabIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    position: 'absolute',
    // 32px ikonka qutisi markazida 52px doira
    top: -10,
    left: -10,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.brandBright,
    borderWidth: 4,
    borderColor: T.bg,
    shadowColor: '#2f6bff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
