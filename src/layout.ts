import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ViewStyle } from 'react-native';

export const TAB_BAR_HEIGHT = 66;
// Pastki bar bilan ekran (yoki tizim navigatsiya paneli) orasidagi masofa
export const TAB_BAR_GAP = 16;
// Planshet va katta ekranlarda kontent haddan tashqari cho'zilib ketmasligi uchun
export const CONTENT_MAX_WIDTH = 640;

/** Pastki barning ekran pastidan masofasi (tizim navigatsiya paneli hisobga olinadi) */
export function useTabBarBottom() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 8) + TAB_BAR_GAP;
}

/** ScrollView contentContainerStyle uchun: markazlash va pastki bar ostida qolmaslik */
export function useScreenContentStyle(withTabBar = true): ViewStyle {
  const insets = useSafeAreaInsets();
  const tabBarBottom = useTabBarBottom();
  return {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    // +28: markaziy mikrofon tugmasi bar ustidan chiqib turadi
    paddingBottom: withTabBar ? tabBarBottom + TAB_BAR_HEIGHT + 28 : insets.bottom + 24,
  };
}
