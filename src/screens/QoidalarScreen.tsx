import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { 
  ShieldCheck, 
  Folder, 
  Calendar, 
  TrendingDown, 
  Shield, 
  MapPin, 
  Train, 
  Sparkles 
} from 'lucide-react-native';
import { useScreenContentStyle } from '../layout';

interface Props {
  onNavigate: (screen: any) => void;
}

export default function QoidalarScreen({ onNavigate }: Props) {
  const contentStyle = useScreenContentStyle(true);
  const [activeFilter, setActiveFilter] = useState('Barchasi');

  const violations = [
    {
      id: '1',
      code: '#QB-104',
      date: '08.10.2026, 14:32',
      title: 'Tezlik rejimini 4 km/soatga oshirish',
      category: 'Tezlik',
      severity: 'Yengil',
      severityColor: '#cabeff',
      severityTextColor: '#4716cb',
      location: 'Toshkent – Chinoz (PK 3424)',
      train: 'VL80-1204',
    },
    {
      id: '2',
      code: '#QB-098',
      date: '24.09.2026, 09:15',
      title: 'Sariq chiroqda tormozlash masofasi kechikishi',
      category: 'Signal',
      severity: 'O\'rta',
      severityColor: '#ffdad6',
      severityTextColor: '#93000a',
      location: 'Guliston – Yangiyer (PK 3512)',
      train: 'VL80-1204',
    },
    {
      id: '3',
      code: '#QB-082',
      date: '14.07.2026, 22:40',
      title: 'Stansiyaga kirishda signallashuv tartibini buzish',
      category: 'Signal',
      severity: 'Jiddiy',
      severityColor: '#ba1a1a',
      severityTextColor: '#ffffff',
      location: 'Samarqand – Jomboy',
      train: 'VL80-1088',
      isWarning: true,
    },
    {
      id: '4',
      code: '#QB-071',
      date: '03.03.2026, 17:05',
      title: 'To\'xtashda tormoz bosimini me\'yordan oshirish',
      category: 'Tormoz',
      severity: 'Yengil',
      severityColor: '#cabeff',
      severityTextColor: '#4716cb',
      location: 'Jizzax – Dashtobod',
      train: 'VL80-1204',
    },
  ];

  const filteredViolations = activeFilter === 'Barchasi' 
    ? violations 
    : violations.filter(v => v.category === activeFilter);

  const monthsData = [
    { name: 'Yan', val: 1, h: '35%' },
    { name: 'Fev', val: 0, h: '6%' },
    { name: 'Mar', val: 2, h: '65%' },
    { name: 'Apr', val: 1, h: '35%' },
    { name: 'May', val: 0, h: '6%' },
    { name: 'Iyn', val: 1, h: '35%' },
    { name: 'Iyl', val: 0, h: '6%' },
    { name: 'Avg', val: 2, h: '65%' },
    { name: 'Sen', val: 1, h: '35%' },
    { name: 'Okt', val: 2, h: '75%', isHighlight: true },
    { name: 'Noy', val: 0, h: '6%' },
    { name: 'Dek', val: 0, h: '6%' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, contentStyle]} showsVerticalScrollIndicator={false}>
      {/* Title & Status Strip */}
      <View style={styles.titleSection}>
        <View style={styles.titleRow}>
          <View style={styles.titleTextGroup}>
            <Text style={styles.mainTitle}>Qoidabuzarliklar nazorati</Text>
            <Text style={styles.subTitle}>Xavfsizlik monitoringi va reys tahlillari</Text>
          </View>
          <View style={styles.shieldIcon}>
            <ShieldCheck size={20} color="#0051df" />
          </View>
        </View>

        {/* Status Chip */}
        <View style={styles.statusPill}>
          <View style={styles.statusLeft}>
            <View style={styles.statusGreenDot} />
            <Text style={styles.statusText}>Holat: Qoniqarli</Text>
          </View>
          <View style={styles.disciplineBadge}>
            <Text style={styles.disciplineText}>98.4% INTIZOM</Text>
          </View>
        </View>
      </View>

      {/* 2x2 Bento Metrics Grid */}
      <View style={styles.bentoGrid}>
        {/* Card 1 */}
        <View style={styles.bentoCard}>
          <View style={styles.bentoTop}>
            <Text style={styles.bentoTag}>BU YIL JAMI</Text>
            <View style={styles.bentoIconBg}>
              <Folder size={15} color="#434655" />
            </View>
          </View>
          <View style={styles.bentoBottom}>
            <Text style={styles.statLarge}>4 <Text style={styles.statUnit}>ta</Text></Text>
            <Text style={styles.statDesc}>Qayd etilgan holat</Text>
          </View>
        </View>

        {/* Card 2 */}
        <View style={styles.bentoCard}>
          <View style={styles.bentoTop}>
            <Text style={[styles.bentoTag, { color: '#0051df' }]}>SHU OY</Text>
            <View style={[styles.bentoIconBg, { backgroundColor: '#eef2ff' }]}>
              <Calendar size={15} color="#0051df" />
            </View>
          </View>
          <View style={styles.bentoBottom}>
            <Text style={[styles.statLarge, { color: '#0051df' }]}>1 <Text style={[styles.statUnit, { color: '#2f6bff' }]}>ta</Text></Text>
            <Text style={styles.statDesc}>Oktabr oyi hisobi</Text>
          </View>
        </View>

        {/* Card 3 */}
        <View style={styles.bentoCard}>
          <View style={styles.bentoTop}>
            <Text style={styles.bentoTag} numberOfLines={1}>O'TGAN OYGA</Text>
            <View style={[styles.bentoIconBg, { backgroundColor: '#dcfce7' }]}>
              <TrendingDown size={15} color="#006c47" />
            </View>
          </View>
          <View style={styles.bentoBottom}>
            <Text style={[styles.statLarge, { color: '#006c47' }]}>-50%</Text>
            <Text style={[styles.statDesc, { color: '#006c47', fontWeight: '600' }]}>↓ 50% kamayish</Text>
          </View>
        </View>

        {/* Card 4 */}
        <View style={styles.bentoCard}>
          <View style={styles.bentoTop}>
            <Text style={styles.bentoTag} numberOfLines={1}>XAVFSIZ DAVR</Text>
            <View style={[styles.bentoIconBg, { backgroundColor: '#e6f4ea' }]}>
              <Shield size={15} color="#006c47" />
            </View>
          </View>
          <View style={styles.bentoBottom}>
            <Text style={styles.statLarge}>42 <Text style={styles.statUnit}>kun</Text></Text>
            <Text style={[styles.statDesc, { color: '#006c47', fontWeight: '600' }]}>To'xtovsiz xavfsiz</Text>
          </View>
        </View>
      </View>

      {/* Monthly Dynamic Bar Chart Card */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={styles.titleTextGroup}>
            <Text style={styles.chartTitle}>Oylik statistika (2026-yil)</Text>
            <Text style={styles.chartSubtitle}>Buzilishlar dinamikasi</Text>
          </View>
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>12 oy</Text>
          </View>
        </View>

        {/* Active Tooltip */}
        <View style={styles.chartTooltip}>
          <Sparkles size={13} color="#ffffff" />
          <Text style={styles.tooltipText}>Oktabr: 2 ta (Tezlik, Signal)</Text>
        </View>

        {/* Bar chart rows */}
        <View style={styles.barsContainer}>
          {monthsData.map((m, idx) => (
            <View key={idx} style={styles.barCol}>
              <Text style={[styles.barVal, m.isHighlight && styles.barValHighlight]}>{m.val}</Text>
              <View style={styles.barTrack}>
                <View style={[
                  styles.barPillar, 
                  { height: m.h as `${number}%` }, 
                  m.isHighlight ? styles.barPillarHighlight : styles.barPillarNormal
                ]} />
              </View>
              <Text style={[styles.barMonth, m.isHighlight && styles.barMonthHighlight]}>{m.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Category Chips Scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {[
          { label: 'Barchasi', count: 4 },
          { label: 'Tezlik', count: 2 },
          { label: 'Signal', count: 1 },
          { label: 'Tormoz', count: 1 },
          { label: 'Boshqa', count: 0 },
        ].map((f) => (
          <TouchableOpacity 
            key={f.label} 
            style={[styles.catChip, activeFilter === f.label && styles.catChipActive]}
            onPress={() => setActiveFilter(f.label)}
          >
            <Text style={[styles.catChipText, activeFilter === f.label && styles.catChipTextActive]}>
              {f.label} ({f.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Violations List */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Qoidabuzarliklar tarixi</Text>
        <TouchableOpacity>
          <Text style={styles.exportText}>Batafsil eksport</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.violationsList}>
        {filteredViolations.map((v) => (
          <View key={v.id} style={[styles.violationCard, v.isWarning && styles.warningBorder]}>
            <View style={styles.vCardTop}>
              <View style={styles.vCodeGroup}>
                <View style={styles.vCodeTag}><Text style={styles.vCodeText}>{v.code}</Text></View>
                <Text style={styles.vDate}>{v.date}</Text>
              </View>
              <View style={[styles.severityPill, { backgroundColor: v.severityColor }]}>
                <Text style={[styles.severityText, { color: v.severityTextColor }]}>{v.severity}</Text>
              </View>
            </View>

            <Text style={styles.vTitle}>{v.title}</Text>

            <View style={styles.vFooter}>
              <View style={styles.vLocation}>
                <MapPin size={14} color="#0051df" />
                <Text style={styles.locationText} numberOfLines={1}>{v.location}</Text>
              </View>
              <View style={styles.vTrain}>
                <Train size={13} color="#737687" />
                <Text style={styles.trainText}>{v.train}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8ff',
  },
  contentContainer: {
    padding: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#131b2e',
  },
  subTitle: {
    fontSize: 12,
    color: '#737687',
  },
  shieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e2e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 136, 91, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    marginRight: 8,
  },
  statusGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00885b',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006c47',
  },
  disciplineBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  disciplineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#131b2e',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  bentoCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  bentoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bentoTag: {
    flexShrink: 1,
    marginRight: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#737687',
  },
  bentoIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#eaedff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoBottom: {
    gap: 2,
  },
  statLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#131b2e',
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737687',
  },
  statDesc: {
    fontSize: 11,
    color: '#737687',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131b2e',
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#737687',
  },
  monthBadge: {
    backgroundColor: '#e2e7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  monthBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#434655',
  },
  chartTooltip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2f6bff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 130,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barVal: {
    fontSize: 9,
    color: '#737687',
    marginBottom: 4,
  },
  barValHighlight: {
    color: '#0051df',
    fontWeight: '800',
  },
  barPillar: {
    width: '55%',
    maxWidth: 14,
    borderRadius: 4,
  },
  barPillarNormal: {
    backgroundColor: '#dae2fd',
  },
  barPillarHighlight: {
    backgroundColor: '#0051df',
  },
  barMonth: {
    fontSize: 9,
    color: '#737687',
    marginTop: 6,
  },
  barMonthHighlight: {
    color: '#0051df',
    fontWeight: '700',
  },
  filterScroll: {
    marginBottom: 16,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: '#0051df',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#131b2e',
  },
  catChipTextActive: {
    color: '#ffffff',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#131b2e',
  },
  exportText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0051df',
  },
  violationsList: {
    gap: 10,
  },
  violationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  warningBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#ba1a1a',
  },
  vCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vCodeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  vCodeTag: {
    backgroundColor: '#eaedff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vCodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#434655',
  },
  vDate: {
    fontSize: 11,
    color: '#737687',
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  vTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131b2e',
    marginBottom: 10,
  },
  vFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f2f3ff',
    paddingTop: 8,
  },
  vLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 11,
    color: '#434655',
  },
  vTrain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trainText: {
    fontSize: 11,
    color: '#737687',
    fontWeight: '600',
  },
});
