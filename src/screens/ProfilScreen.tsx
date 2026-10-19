import React, { useState } from 'react';
import Constants from 'expo-constants';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
} from 'react-native';
import { 
  MapPin, 
  Award, 
  Shield, 
  Globe, 
  Bell, 
  LogOut, 
  ChevronRight, 
  Moon,
  Sun,
} from 'lucide-react-native';
import { useScreenContentStyle } from '../layout';
import { useAuth } from '../auth';
import { Palette, useStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';

// Ilova versiyasi app.json -> expo.version dan olinadi (qo'lda yozilmaydi)
const APP_VERSION = Constants.expoConfig?.version ?? '';

interface Props {
  onNavigate: (screen: any) => void;
}

export default function ProfilScreen({ onNavigate }: Props) {
  const { T, isDark, setMode } = useTheme();
  const { t, lang, setLang } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const { user, logout } = useAuth();
  const fullName = user ? `${user.firstname} ${user.lastname}`.trim() : '';
  const initials = user ? `${user.firstname[0] ?? ''}${user.lastname[0] ?? ''}`.toUpperCase() : '';

  const confirmLogout = () => {
    Alert.alert(t('Tizimdan chiqish'), t("Hisobingizdan chiqmoqchimisiz?"), [
      { text: t("Bekor qilish"), style: 'cancel' },
      { text: t("Chiqish"), style: 'destructive', onPress: () => logout() },
    ]);
  };
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, contentStyle]} showsVerticalScrollIndicator={false}>
      {/* Driver Identity Hero Bento Card */}
      <View style={styles.heroCard}>
        <View style={styles.driverMainRow}>
          <View style={styles.avatarWrapper}>
            <View style={styles.driverAvatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <View style={styles.onlineStatusRing} />
          </View>
          <View style={styles.driverDetails}>
            <View style={styles.badgeRow}>
              <View style={styles.gradeBadge}>
                <Award size={12} color="#78fabc" />
                <Text style={styles.gradeText}>{user?.role_name ?? t("mashinist")}</Text>
              </View>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>№ {String(user?.id ?? 0).padStart(5, '0')}</Text>
              </View>
            </View>
            <Text style={styles.driverName} numberOfLines={1}>{fullName}</Text>
            <View style={styles.locationRow}>
              <MapPin size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.locationText} numberOfLines={2}>{t("Toshkent Lokomotiv Deposi (TCh-1)")}</Text>
            </View>
          </View>
        </View>

        {/* Status Strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusLeft}>
            <View style={styles.pulseGreen} />
            <Text style={styles.statusTitle}>{t("Holat: Navbatchilikda (Yo'l ochiq)")}</Text>
          </View>
          <Text style={styles.pkpCode}>PKP-72</Text>
        </View>
      </View>

      {/* Settings Section */}
      <Text style={styles.settingsHeader}>{t("Sozlamalar va xavfsizlik")}</Text>

      <View style={styles.settingsBox}>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIconBg}>
              <Shield size={18} color={T.text} />
            </View>
            <Text style={styles.settingTitle}>{t("Xavfsizlik va kirish sozlamalari")}</Text>
          </View>
          <ChevronRight size={18} color={T.muted} />
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIconBg}>
              <Globe size={18} color={T.text} />
            </View>
            <Text style={styles.settingTitle}>{t("Ilova tili")}</Text>
          </View>
          {/* Til nomi har doim o'z tilida yoziladi */}
          <View style={styles.langSwitch}>
            {(['uz', 'ru'] as const).map((l) => (
              <TouchableOpacity key={l} style={[styles.langBtn, lang === l && styles.langBtnActive]} onPress={() => setLang(l)}>
                <Text style={[styles.langText, lang === l && styles.langTextActive]}>{l === 'uz' ? 'O‘zbekcha' : 'Русский'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIconBg}>
              {isDark ? <Moon size={18} color={T.text} /> : <Sun size={18} color={T.text} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>{t("Tungi rejim")}</Text>
              <Text style={styles.settingSubtitle}>{isDark ? t("To‘q ranglar yoqilgan") : t("Kunduzgi (yorug‘) ranglar")}</Text>
            </View>
          </View>
          <Switch value={isDark} onValueChange={(v) => setMode(v ? 'dark' : 'light')} trackColor={{ false: T.borderStrong, true: T.brand }} thumbColor="#ffffff" />
        </View>

        <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIconBg}>
              <Bell size={18} color={T.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>{t("Bildirishnomalar va signallar")}</Text>
              <Text style={styles.settingSubtitle}>{t("Tezkor dispetcherlik xabarlari")}</Text>
            </View>
          </View>
          <Switch 
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: T.borderStrong, true: T.brand }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <LogOut size={18} color={T.red} />
        <Text style={styles.logoutText}>{t("Tizimdan chiqish")}</Text>
      </TouchableOpacity>

      <Text style={styles.versionFooter}>
        {t('O‘zbekiston Temir Yo‘llari')} • {t('Axborot tizimi')} v{APP_VERSION}
      </Text>
    </ScrollView>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
  langSwitch: { flexDirection: 'row', backgroundColor: T.surface2, borderRadius: 10, padding: 3, gap: 3 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  langBtnActive: { backgroundColor: T.brand },
  langText: { fontSize: 12, fontWeight: '700', color: T.muted },
  langTextActive: { color: '#ffffff' },
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  contentContainer: {
    padding: 16,
  },
  heroCard: {
    backgroundColor: T.brandBright,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#2f6bff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  driverMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: T.brandText,
  },
  onlineStatusRing: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#78fabc',
    borderWidth: 2,
    borderColor: T.border,
  },
  driverDetails: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  gradeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  idBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  idText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  driverName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  pulseGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#78fabc',
  },
  statusTitle: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  pkpCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  salaryCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  salaryTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  salaryLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  walletIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: T.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryLabel: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '800',
    color: T.muted,
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.greenSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  bonusText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.green,
  },
  salaryAmountRow: {
    marginBottom: 12,
  },
  salaryNumber: {
    fontSize: 26,
    flexShrink: 1,
    fontWeight: '800',
    color: T.text,
  },
  salaryHint: {
    fontSize: 12,
    color: T.muted,
    marginTop: 2,
  },
  bonusBadgeDown: {
    backgroundColor: T.redSoft,
  },
  bonusTextDown: {
    color: T.red,
  },
  salaryCurrency: {
    fontSize: 15,
    fontWeight: '600',
    color: T.muted,
  },
  salaryDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.brandSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  salaryDetailText: {
    flexShrink: 1,
    marginRight: 8,
    fontSize: 12,
    fontWeight: '700',
    color: T.brandText,
  },
  infoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: T.text,
  },
  verifiedTag: {
    fontSize: 10,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.5,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  infoCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  fullWidthCard: {
    flexBasis: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: T.muted,
    marginBottom: 2,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: T.text,
  },
  infoSub: {
    fontSize: 10,
    color: T.muted,
    marginTop: 2,
  },
  seniorityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    marginRight: 8,
  },
  seniorityVal: {
    fontSize: 16,
    fontWeight: '800',
    color: T.text,
  },
  categoryBadge: {
    backgroundColor: T.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.text2,
  },
  settingsHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: T.text,
    marginBottom: 10,
  },
  settingsBox: {
    backgroundColor: T.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  settingIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: T.text,
  },
  settingSubtitle: {
    fontSize: 10,
    color: T.muted,
    marginTop: 2,
  },
  settingRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 12,
    color: T.muted,
  },
  logoutBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: T.redSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  logoutText: {
    color: T.red,
    fontSize: 14,
    fontWeight: '700',
  },
  versionFooter: {
    textAlign: 'center',
    fontSize: 10,
    color: T.muted,
  },
});
