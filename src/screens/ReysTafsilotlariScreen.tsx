import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  CalendarDays,
  Clock,
  CreditCard,
  Factory,
  Gauge,
  Hash,
  HelpCircle,
  Minus,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useScreenContentStyle } from '../layout';
import { useAuth } from '../auth';
import { ApiError, SalaryEmployee, SalaryRecord, fetchMySalary, formatAmount } from '../api/voiceApi';
import { Palette, useStyles, useTheme } from '../theme';

interface Props {
  onNavigate: (screen: any) => void;
  onBack: () => void;
}

const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const MONTHS_FULL = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const TOTAL_ACCRUED = 'Итого начислено';
const TOTAL_WITHHELD = 'Итого удержано';
const PAYOUTS = new Set(['885 - На пластик', '881 - Выплата']);

const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const hoursText = (v: string) => {
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  const { T } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Icon size={15} color={T.brandText} />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, !value && styles.infoEmpty]} numberOfLines={2}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

export default function ReysTafsilotlariScreen({ onBack }: Props) {
  const { T } = useTheme();
  const styles = useStyles(makeStyles);
  const contentStyle = useScreenContentStyle(false);
  const { user } = useAuth();
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [employee, setEmployee] = useState<SalaryEmployee | null>(null);
  const [tabNumber, setTabNumber] = useState<string | null>(user?.tab_number ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Telegram botdagidek: avval yil, keyin oy tanlanadi
  const [viewYear, setViewYear] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMySalary();
      setTabNumber(res.tab_number);
      setEmployee(res.employee);
      setRecords(res.records);
      setSelectedId((cur) => cur ?? res.records[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Oylik ma’lumotini yuklab bo‘lmadi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = records.find((r) => r.id === selectedId) ?? records[0];
  const years = useMemo(() => [...new Set(records.map((r) => r.year))].sort((a, b) => b - a), [records]);
  const year = viewYear ?? selected?.year;
  const byMonth = useMemo(() => new Map(records.filter((r) => r.year === year).map((r) => [r.month, r])), [records, year]);

  const selectRecord = (r: SalaryRecord) => {
    setSelectedId(r.id);
    setViewYear(r.year);
  };
  const selectYear = (y: number) => {
    // Shu yilning eng oxirgi ma'lumotli oyi tanlanadi (records eng yangisidan tartiblangan)
    const latest = records.find((r) => r.year === y);
    if (latest) selectRecord(latest);
  };
  const previous = selected ? records[records.indexOf(selected) + 1] : undefined;
  const change = selected && previous ? pct(Number(selected.net_pay), Number(previous.net_pay)) : null;

  const chart = useMemo(() => records.slice(0, 12).reverse(), [records]);
  const chartMax = Math.max(1, ...chart.map((r) => Number(r.net_pay)));

  // Bot formatidagi qatorlar: "Итого начислено" gacha — hisoblanganlar, undan keyin — ushlanmalar va to'lovlar
  const { accrualLines, totalAccrued, deductionLines, totalWithheld } = useMemo(() => {
    const lines = selected?.details ?? [];
    const iAcc = lines.findIndex((l) => l.label === TOTAL_ACCRUED);
    const iWith = lines.findIndex((l) => l.label === TOTAL_WITHHELD);
    return {
      accrualLines: iAcc >= 0 ? lines.slice(0, iAcc) : lines,
      totalAccrued: iAcc >= 0 ? lines[iAcc] : undefined,
      deductionLines: iAcc >= 0 ? lines.slice(iAcc + 1, iWith >= 0 ? iWith : undefined) : [],
      totalWithheld: iWith >= 0 ? lines[iWith] : undefined,
    };
  }, [selected]);

  const fullName = employee?.full_name || selected?.full_name || (user ? `${user.lastname} ${user.firstname}` : '');
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, contentStyle]} showsVerticalScrollIndicator={false}>
      {/* Sarlavha */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Orqaga">
          <ArrowLeft size={20} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Wallet size={18} color={T.brandText} />
          <Text style={styles.headerTitle}>Oylik tafsilotlari</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={load} accessibilityLabel="Yangilash">
          <RotateCcw size={17} color={T.brandText} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={T.brandText} />
          <Text style={styles.stateText}>Oylik ma’lumoti yuklanmoqda...</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <RotateCcw size={14} color={T.brandText} />
            <Text style={styles.retryText}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      ) : !tabNumber ? (
        <View style={styles.state}>
          <Wallet size={28} color={T.faint} />
          <Text style={styles.stateTitle}>Tabel raqami biriktirilmagan</Text>
          <Text style={styles.stateText}>Oyligingizni ko‘rish uchun administrator profilingizga tabel raqamingizni kiritishi kerak.</Text>
        </View>
      ) : !selected ? (
        <View style={styles.state}>
          <Wallet size={28} color={T.faint} />
          <Text style={styles.stateTitle}>Oylik ma’lumoti topilmadi</Text>
          <Text style={styles.stateText}>Tabel raqamingiz ({tabNumber}) yuklangan qaydnomalarda topilmadi.</Text>
        </View>
      ) : (
        <>
          {/* Davr: yil va oy */}
          <View style={styles.card}>
            <View style={styles.periodHead}>
              <CalendarDays size={16} color={T.brandText} />
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Davrni tanlang</Text>
            </View>

            <Text style={styles.groupLabel}>YIL</Text>
            <View style={styles.yearRow}>
              {years.map((y) => (
                <TouchableOpacity key={y} style={[styles.yearBtn, y === year && styles.yearBtnActive]} onPress={() => selectYear(y)} activeOpacity={0.8}>
                  <Text style={[styles.yearText, y === year && styles.yearTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.groupLabel, { marginTop: 12 }]}>OY</Text>
            <View style={styles.monthGrid}>
              {MONTHS_FULL.map((name, i) => {
                const rec = byMonth.get(i + 1);
                const active = !!rec && rec.id === selected.id;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.monthBtn, !rec && styles.monthBtnEmpty, active && styles.monthBtnActive]}
                    onPress={() => rec && selectRecord(rec)}
                    disabled={!rec}
                    activeOpacity={0.8}
                    accessibilityLabel={rec ? `${name} ${year}` : `${name} ${year} — ma'lumot yo'q`}
                  >
                    <Text style={[styles.monthText, !rec && styles.monthTextEmpty, active && styles.monthTextActive]}>{name}</Text>
                    {!!rec && !active && <View style={styles.monthDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.periodHint}>Nuqtali oylar — oylik ma’lumoti mavjud</Text>
          </View>

          {/* Xodim kartasi */}
          <View style={styles.card}>
            <View style={styles.personRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.personBody}>
                <Text style={styles.personName}>{fullName}</Text>
                <Text style={styles.personSub}>{selected.period_title}</Text>
              </View>
            </View>
            <View style={styles.infoGrid}>
              <InfoItem icon={Hash} label="Tabel raqami" value={selected.tab_number} />
              <InfoItem icon={Briefcase} label="Lavozimi" value={employee?.position || selected.position} />
              <InfoItem icon={Factory} label="Ish joyi (sex)" value={employee?.sex_number ?? ''} />
              <InfoItem icon={Banknote} label="Oklad" value={employee?.oklad ? formatAmount(employee.oklad) : ''} />
              <InfoItem icon={Gauge} label="Stavka" value={employee?.stavka ?? ''} />
              <InfoItem icon={Clock} label="Ishlagan soati" value={`${hoursText(selected.worked_hours)} soat`} />
            </View>
          </View>

          {/* Natija */}
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Text style={styles.heroKicker}>QO‘LGA TEGADIGAN • {selected.period_title.toUpperCase()}</Text>
              {change !== null && (
                <View style={styles.changeBadge}>
                  {change > 0.5 ? <TrendingUp size={12} color="#78fabc" /> : change < -0.5 ? <TrendingDown size={12} color="#ffb4ab" /> : <Minus size={12} color="#ffffff" />}
                  <Text style={styles.changeText}>{`${change > 0 ? '+' : ''}${change.toFixed(1)}%`}</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroAmount} adjustsFontSizeToFit numberOfLines={1}>
              {formatAmount(selected.net_pay)} <Text style={styles.heroCurrency}>so‘m</Text>
            </Text>
            <View style={styles.heroPills}>
              <View style={styles.pill}>
                <Wallet size={13} color="#ffffff" />
                <Text style={styles.pillText}>Hisoblangan: {formatAmount(selected.accrued_total)}</Text>
              </View>
              {Number(selected.paid_to_card) > 0 && (
                <View style={styles.pill}>
                  <CreditCard size={13} color="#ffffff" />
                  <Text style={styles.pillText}>Kartaga</Text>
                </View>
              )}
            </View>
          </View>

          {/* Oylar dinamikasi */}
          {chart.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Oylar bo‘yicha dinamika</Text>
              <View style={styles.chart}>
                {chart.map((r) => {
                  const active = r.id === selected.id;
                  const h = Math.max(6, (Number(r.net_pay) / chartMax) * 100);
                  return (
                    <TouchableOpacity key={r.id} style={styles.barCol} onPress={() => selectRecord(r)} activeOpacity={0.7}>
                      <View style={styles.barTrack}>
                        <View style={[styles.bar, { height: `${h}%` }, active && styles.barActive]} />
                      </View>
                      <Text style={[styles.barLabel, active && styles.barLabelActive]}>{MONTHS_SHORT[r.month - 1]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Hisob-kitoblar — Excel ustunlari tartibida */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hisob-kitoblar</Text>

            <Text style={styles.groupLabel}>HISOBLANGAN</Text>
            {accrualLines.map((l, i) => (
              <View key={`a${i}`} style={styles.line}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText} numberOfLines={1}>{l.label}</Text>
                </View>
                <Text style={styles.lineAmount}>{formatAmount(l.amount)}</Text>
              </View>
            ))}
            {totalAccrued && (
              <View style={[styles.totalLine, styles.totalAccrued]}>
                <Text style={styles.totalLabel}>{totalAccrued.label}</Text>
                <Text style={styles.totalAmount}>{formatAmount(totalAccrued.amount)}</Text>
              </View>
            )}

            {deductionLines.length > 0 && <Text style={[styles.groupLabel, { marginTop: 14 }]}>USHLANMALAR VA TO‘LOVLAR</Text>}
            {deductionLines.map((l, i) => {
              const payout = PAYOUTS.has(l.label);
              return (
                <View key={`d${i}`} style={[styles.line, payout && styles.payoutLine]}>
                  <View style={[styles.codeBadge, payout && styles.payoutBadge]}>
                    {payout && <CreditCard size={12} color={T.green} />}
                    <Text style={[styles.codeText, payout && styles.payoutText]} numberOfLines={1}>{l.label}</Text>
                  </View>
                  <Text style={[styles.lineAmount, payout ? styles.payoutAmount : styles.deductAmount]}>{formatAmount(l.amount)}</Text>
                </View>
              );
            })}
            {totalWithheld && (
              <View style={[styles.totalLine, styles.totalWithheld]}>
                <Text style={[styles.totalLabel, styles.totalTextLight]}>{totalWithheld.label}</Text>
                <Text style={[styles.totalAmount, styles.totalTextLight]}>{formatAmount(totalWithheld.amount)}</Text>
              </View>
            )}
          </View>

          <View style={styles.support}>
            <HelpCircle size={20} color={T.brandText} />
            <Text style={styles.supportText}>
              Hisob-kitob bo‘yicha savol bo‘lsa, depo buxgalteriyasiga tabel raqamingiz ({selected.tab_number}) bilan murojaat qiling.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (T: Palette) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: T.brandSoft },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: T.text },

  state: { alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 18, padding: 24, marginTop: 8 },
  stateTitle: { fontSize: 15, fontWeight: '800', color: T.text, textAlign: 'center' },
  stateText: { fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 19 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.brandSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  retryText: { fontSize: 12, fontWeight: '700', color: T.brandText },

  periodHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yearBtn: {
    minWidth: 76,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: T.surface2,
    borderWidth: 1,
    borderColor: T.border,
  },
  yearBtnActive: { backgroundColor: T.brand, borderColor: T.brandBright },
  yearText: { fontSize: 14, fontWeight: '800', color: T.text2 },
  yearTextActive: { color: '#ffffff' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: T.brandSoft,
    borderWidth: 1,
    borderColor: T.border,
  },
  monthBtnEmpty: { backgroundColor: T.surface2, borderColor: T.border },
  monthBtnActive: {
    backgroundColor: T.brand,
    borderColor: T.brandBright,
    shadowColor: '#0051df',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  monthText: { fontSize: 13, fontWeight: '700', color: T.brandText },
  monthTextEmpty: { color: T.faint, fontWeight: '500' },
  monthTextActive: { color: '#ffffff', fontWeight: '800' },
  monthDot: { position: 'absolute', top: 6, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#00885b' },
  periodHint: { fontSize: 11, color: T.muted, marginTop: 10 },

  card: {
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: T.text, marginBottom: 10 },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  personBody: { flex: 1 },
  personName: { fontSize: 16, fontWeight: '800', color: T.text, lineHeight: 21 },
  personSub: { fontSize: 12, color: T.muted, marginTop: 2 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoItem: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.brandSoft, borderRadius: 12, padding: 10 },
  infoIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: T.brandSoft, alignItems: 'center', justifyContent: 'center' },
  infoBody: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 13, fontWeight: '700', color: T.text, marginTop: 1 },
  infoEmpty: { color: T.faint },

  hero: {
    backgroundColor: T.brand,
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#0051df',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 },
  heroKicker: { flexShrink: 1, fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  changeText: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  heroAmount: { fontSize: 30, fontWeight: '800', color: '#ffffff' },
  heroCurrency: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  pillText: { fontSize: 11, fontWeight: '600', color: '#ffffff' },

  chart: { flexDirection: 'row', height: 120 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '55%', maxWidth: 22, borderRadius: 6, backgroundColor: T.brandSoft },
  barActive: { backgroundColor: T.brand },
  barLabel: { fontSize: 10, color: T.muted, marginTop: 6 },
  barLabelActive: { color: T.brandText, fontWeight: '800' },

  groupLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.6, marginBottom: 6 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  codeBadge: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: T.surface2,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: { fontSize: 12, fontWeight: '700', color: T.text2, fontVariant: ['tabular-nums'] },
  lineAmount: { fontSize: 14, fontWeight: '700', color: T.text, fontVariant: ['tabular-nums'] },
  deductAmount: { color: T.red },
  payoutLine: { backgroundColor: T.surface2, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10, borderBottomWidth: 0 },
  payoutBadge: { backgroundColor: T.greenSoft },
  payoutText: { color: T.green },
  payoutAmount: { color: T.green, fontWeight: '800' },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
  },
  totalAccrued: { backgroundColor: T.brandSoft },
  totalWithheld: { backgroundColor: T.inverse },
  totalLabel: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: T.brandText },
  totalTextLight: { color: '#ffffff' },
  totalAmount: { fontSize: 15, fontWeight: '800', color: T.brandText, fontVariant: ['tabular-nums'] },

  support: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: T.brandSoft, borderRadius: 16, padding: 14 },
  supportText: { flex: 1, fontSize: 12, color: T.text2, lineHeight: 17 },
});
