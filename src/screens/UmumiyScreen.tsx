import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Bell, Train } from 'lucide-react-native';
import { useScreenContentStyle } from '../layout';
import { useAuth } from '../auth';
import { Palette, useStyles, useTheme } from '../theme';
import { useI18n } from '../i18n';

const LOGO = require('../../assets/uty-logo.png');
// uty-logo.png nisbati (kenglik / balandlik)
const LOGO_RATIO = 165 / 199;

const greeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Xayrli tong';
  if (h >= 12 && h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
};

interface Props {
  onNavigate: (screen: any) => void;
}

export default function UmumiyScreen({ onNavigate }: Props) {
  const { T } = useTheme();
  const { t } = useI18n();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(true);
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const initials = user ? `${user.firstname[0] ?? ''}${user.lastname[0] ?? ''}`.toUpperCase() : '';
  const logoH = Math.round(Math.min(200, Math.max(140, width * 0.42)));

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, contentStyle]} showsVerticalScrollIndicator={false}>
      {/* Sarlavha */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={LOGO} style={styles.headerLogo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.brandSub} numberOfLines={1}>{t("O'ZBEKISTON TEMIR YO'LLARI")}</Text>
            <Text style={styles.brandTitle}>{t("Umumiy")}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={20} color={T.text2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarButton} onPress={() => onNavigate('profil')}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.onlineBadge} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Salomlashish kartasi */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={[styles.depoInfo, { marginRight: 8 }]}>
            <Text style={styles.depoTitle}>{t("Lokomotiv deposi")}</Text>
            <Text style={styles.depoSubtitle}>{t("Mashinistlar uchun tezkor yordamchi")}</Text>
          </View>
          <View style={styles.locoBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.locoBadgeText}>VL80-1204</Text>
          </View>
        </View>

        <View style={styles.greetingRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.dutyText}>{t("Navbatchilik: Faol")}</Text>
            <Text style={styles.greetingTitle} numberOfLines={1}>{t(greeting())}, {user?.firstname}!</Text>
          </View>
          <View style={styles.trainIconBox}>
            <Train size={24} color="#ffffff" />
          </View>
        </View>
      </View>

      {/* UTY logotipi */}
      <View style={styles.logoCard}>
        <Image source={LOGO} style={{ height: logoH, width: Math.round(logoH * LOGO_RATIO) }} resizeMode="contain" />
        <Text style={styles.logoTitle}>{t("O‘zbekiston Temir Yo‘llari")}</Text>
        <Text style={styles.logoSub}>AI assist</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    contentContainer: { padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
    headerLogo: { width: 30, height: 36 },
    brandSub: { fontSize: 9, fontWeight: '700', color: T.brandText, letterSpacing: 0.5 },
    brandTitle: { fontSize: 16, fontWeight: '700', color: T.text },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    avatarButton: { position: 'relative' },
    avatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
    onlineBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#22c55e',
      borderWidth: 2,
      borderColor: T.bg,
    },
    heroCard: {
      borderRadius: 22,
      padding: 18,
      backgroundColor: T.brandBright,
      marginBottom: 16,
      shadowColor: '#2f6bff',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    depoInfo: { flex: 1 },
    depoTitle: { fontSize: 17, fontWeight: '800', color: '#ffffff' },
    depoSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
    locoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 6,
    },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#78fabc' },
    locoBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
    greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dutyText: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
    greetingTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginTop: 2 },
    trainIconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoCard: {
      alignItems: 'center',
      backgroundColor: T.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: T.border,
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    logoTitle: { fontSize: 18, fontWeight: '800', color: T.text, marginTop: 18, textAlign: 'center' },
    logoSub: { fontSize: 13, color: T.muted, marginTop: 4, textAlign: 'center' },
  });
