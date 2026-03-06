import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Activity, Star } from 'lucide-react-native';
import { getEmotionByScore, getEmotionLabel } from '../../constants/emotions';
import i18n from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import { FlBarChart, FlDonutChart, FlLineAreaChart } from '../charts/flChartPrimitives';
import { withAlpha } from '../charts/chartData';

interface CheckinAnalyticsProps {
  checkins: any[];
}

function weekdayLabel(index: number) {
  const base = new Date(Date.UTC(2026, 2, 2 + index));
  return base.toLocaleDateString(i18n.locale || 'de', { weekday: 'short' }).toUpperCase();
}

export const CheckinAnalytics = ({ checkins }: CheckinAnalyticsProps) => {
  const { colors, isDark } = useTheme();

  const analytics = useMemo(() => {
    if (!checkins || checkins.length === 0) return null;

    const sorted = [...checkins].sort((left, right) => {
      const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : new Date(left.date).getTime();
      const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : new Date(right.date).getTime();
      return leftDate - rightDate;
    });

    let totalScore = 0;
    let validScoresCount = 0;
    const emotionCounts = new Map<string, { count: number; color: string; emoji: string; label: string }>();
    const tagCounts: Record<string, number> = {};
    const weekdayCounts = Array.from({ length: 7 }, (_, index) => ({
      label: weekdayLabel(index),
      value: 0,
      color: index >= 5 ? '#C09D59' : '#137386',
    }));

    sorted.forEach((checkin) => {
      const dateValue = checkin.createdAt ? new Date(checkin.createdAt) : new Date(checkin.date);
      const weekdayIndex = (dateValue.getDay() + 6) % 7;

      if (checkin.mood) {
        totalScore += checkin.mood;
        validScoresCount += 1;
        weekdayCounts[weekdayIndex].value += 1;

        const emotion = getEmotionByScore(checkin.mood);
        const existing = emotionCounts.get(emotion.id);
        const nextCount = (existing?.count ?? 0) + 1;
        emotionCounts.set(emotion.id, {
          count: nextCount,
          color: emotion.color,
          emoji: emotion.emoji,
          label: getEmotionLabel(emotion, i18n.locale),
        });
      }

      if (Array.isArray(checkin.tags)) {
        checkin.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const averageMood = validScoresCount > 0 ? totalScore / validScoresCount : 0;
    const topEmotions = [...emotionCounts.values()]
      .sort((left, right) => right.count - left.count)
      .slice(0, 4)
      .map((emotion) => ({
        label: `${emotion.emoji} ${emotion.label}`,
        value: emotion.count,
        color: emotion.color,
      }));

    const trendData = sorted.slice(-8).map((checkin) => ({
      label: new Date(checkin.createdAt ?? checkin.date).toLocaleDateString(i18n.locale || 'de', { weekday: 'short' }).toUpperCase(),
      value: checkin.mood ?? 0,
      color: '#137386',
      date: new Date(checkin.createdAt ?? checkin.date).toLocaleDateString(i18n.locale || 'de', { day: '2-digit', month: 'short' }),
    }));

    return {
      averageMood,
      topEmotions,
      topTags: Object.entries(tagCounts).sort((left, right) => right[1] - left[1]).slice(0, 4),
      weekdayData: weekdayCounts,
      trendData,
      validScoresCount,
    };
  }, [checkins]);

  const [selectedTrendIndex, setSelectedTrendIndex] = useState(0);
  const [selectedEmotionIndex, setSelectedEmotionIndex] = useState(0);
  const [selectedWeekdayIndex, setSelectedWeekdayIndex] = useState(0);

  useEffect(() => {
    if (!analytics) return;
    setSelectedTrendIndex(Math.max(0, analytics.trendData.length - 1));
    setSelectedEmotionIndex(0);
    setSelectedWeekdayIndex(0);
  }, [analytics]);

  if (!analytics) return null;

  const selectedTrend = analytics.trendData[Math.min(selectedTrendIndex, analytics.trendData.length - 1)];
  const selectedEmotion = analytics.topEmotions[Math.min(selectedEmotionIndex, Math.max(0, analytics.topEmotions.length - 1))];
  const selectedWeekday = analytics.weekdayData[Math.min(selectedWeekdayIndex, analytics.weekdayData.length - 1)];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400 }}
      style={{ marginBottom: 32 }}
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 32,
          padding: 24,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
          shadowColor: isDark ? '#000' : '#0F172A',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.04,
          shadowRadius: 24,
          elevation: 4,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
            paddingBottom: 20,
          }}
        >
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSubtle, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Durchschnitt
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ fontSize: 42, fontWeight: '900', color: colors.text, letterSpacing: -1 }}>
                {analytics.averageMood.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#64748B' : '#94A3B8', marginLeft: 4 }}>
                / 10
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#475569' }}>
                {checkins.length} Eintraege
              </Text>
            </View>
            {analytics.topTags.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Activity size={12} color="#10B981" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981', marginLeft: 4 }}>
                  Aktiv getrackt
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
          <View style={{ flex: 1, minWidth: 280, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 24, padding: 18 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 }}>Stimmungs-Trend</Text>
            <Text style={{ fontSize: 12, color: colors.textSubtle, marginBottom: 12 }}>
              {selectedTrend ? `${selectedTrend.date}: ${selectedTrend.value}/10` : 'Letzte 8 Check-ins'}
            </Text>
            <FlLineAreaChart
              data={analytics.trendData}
              width={320}
              height={190}
              color="#137386"
              gradientColor="#C09D59"
              selectedIndex={selectedTrendIndex}
              onSelectIndex={setSelectedTrendIndex}
              showAverageLine
              textColor={colors.text}
              subtleTextColor={colors.textSubtle}
              gridColor={withAlpha(colors.textSubtle, 0.16)}
              formatTooltip={(datum) => `${datum.label}: ${datum.value}/10`}
            />
          </View>

          <View style={{ flex: 1, minWidth: 280, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 24, padding: 18 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 }}>Emotionen</Text>
            <Text style={{ fontSize: 12, color: colors.textSubtle, marginBottom: 12 }}>
              {selectedEmotion ? selectedEmotion.label : 'Verteilung der haeufigsten Stimmungen'}
            </Text>
            <FlDonutChart
              data={analytics.topEmotions}
              size={240}
              selectedIndex={selectedEmotionIndex}
              onSelectIndex={setSelectedEmotionIndex}
              showLegend
              textColor={colors.text}
              subtleTextColor={colors.textSubtle}
            />
          </View>

          <View style={{ flex: 1, minWidth: 280, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 24, padding: 18 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 }}>Check-in Rhythmus</Text>
            <Text style={{ fontSize: 12, color: colors.textSubtle, marginBottom: 12 }}>
              {selectedWeekday ? `${selectedWeekday.label}: ${selectedWeekday.value} Check-ins` : 'Wochentage im Vergleich'}
            </Text>
            <FlBarChart
              data={analytics.weekdayData.map((item) => ({
                ...item,
                secondaryValue: Math.max(...analytics.weekdayData.map(entry => entry.value), 1),
              }))}
              width={320}
              selectedIndex={selectedWeekdayIndex}
              onSelectIndex={setSelectedWeekdayIndex}
              textColor={colors.text}
              subtleTextColor={colors.textSubtle}
              gridColor={withAlpha(colors.textSubtle, 0.16)}
            />
          </View>
        </View>

        {analytics.topTags.length > 0 ? (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 12 }}>Hauefigste Aktivitaeten</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {analytics.topTags.map(([tag, count], index) => (
                <View
                  key={tag}
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E8E6E1',
                    minWidth: 140,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 1 }}>
                    #{index + 1}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 4 }}>
                    {tag}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981', marginTop: 4 }}>
                    {count}x genutzt
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </MotiView>
  );
};
