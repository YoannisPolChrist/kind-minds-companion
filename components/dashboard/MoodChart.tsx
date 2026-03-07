import { useEffect, useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { FlLineAreaChart } from '../charts/flChartPrimitives';
import { withAlpha } from '../charts/chartData';
import { getEmotionByScore, getEmotionLabel } from '../../constants/emotions';
import { normalizeMoodToHundred, normalizeMoodToTen } from '../../utils/checkinMood';
import i18n from '../../utils/i18n';

interface Checkin {
    date: string;
    mood: number;
    createdAt?: string;
}

interface Props {
    checkins: Checkin[];
}

const PETROL = '#2D666B';
const PETROL_LIGHT = '#4E7E82';
const GOLD = '#B08C57';
const CARD_BG = '#182428';

function getCheckinDate(checkin: Checkin) {
    return new Date(checkin.createdAt ?? checkin.date);
}

export function MoodChart({ checkins }: Props) {
    const { width: screenWidth } = useWindowDimensions();
    const chartWidth = Math.min(screenWidth - 48, 800);

    const chartState = useMemo(() => {
        if (!checkins || checkins.length === 0) {
            return { data: [], topEmotions: [] as Array<{ label: string; count: number; color: string }> };
        }

        const sorted = [...checkins]
            .sort((left, right) => getCheckinDate(left).getTime() - getCheckinDate(right).getTime())
            .slice(-10);

        const emotionCounts = new Map<string, { label: string; count: number; color: string }>();

        const data = sorted.map((checkin) => {
            const emotion = getEmotionByScore(normalizeMoodToTen(checkin.mood));
            const emotionLabel = getEmotionLabel(emotion, i18n.locale);
            const existing = emotionCounts.get(emotion.id);

            emotionCounts.set(emotion.id, {
                label: emotionLabel,
                count: (existing?.count ?? 0) + 1,
                color: emotion.color,
            });

            return {
                label: getCheckinDate(checkin).toLocaleDateString(i18n.locale, { weekday: 'short' }).toUpperCase(),
                value: normalizeMoodToHundred(checkin.mood),
                color: PETROL_LIGHT,
                rawDate: checkin.createdAt ?? checkin.date,
                emotionLabel,
                emotionColor: emotion.color,
            };
        });

        const topEmotions = [...emotionCounts.values()]
            .sort((left, right) => right.count - left.count)
            .slice(0, 3);

        return { data, topEmotions };
    }, [checkins]);

    const data = chartState.data;
    const [selectedIndex, setSelectedIndex] = useState(Math.max(0, data.length - 1));

    useEffect(() => {
        setSelectedIndex(Math.max(0, data.length - 1));
    }, [data.length]);

    if (data.length === 0) return null;

    const moods = data.map((item) => item.value);
    const activePoint = data[Math.min(selectedIndex, data.length - 1)];
    const avgMood = moods.reduce((sum, mood) => sum + mood, 0) / moods.length;
    const trend = data.length > 1 ? data[data.length - 1].value - data[data.length - 2].value : 0;
    const trendText = trend > 0 ? `+${trend}` : trend < 0 ? `${trend}` : '0';
    const trendColor = trend > 0 ? '#788E76' : trend < 0 ? '#8A6A53' : '#8B938E';
    const activeDate = new Date(activePoint.rawDate).toLocaleDateString(i18n.locale, {
        day: '2-digit',
        month: 'short',
    });

    return (
        <View
            style={{
                backgroundColor: CARD_BG,
                borderRadius: 32,
                overflow: 'hidden',
                marginBottom: 20,
                shadowColor: PETROL,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.16,
                shadowRadius: 24,
                elevation: 6,
            }}
        >
            <View style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                            Stimmungsverlauf
                        </Text>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>
                            {activePoint.value}
                            <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}> /100</Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginTop: 4 }}>
                            Ausgewaehlt: {activeDate}
                        </Text>
                        <View
                            style={{
                                marginTop: 10,
                                alignSelf: 'flex-start',
                                backgroundColor: withAlpha(activePoint.emotionColor, 0.22),
                                borderRadius: 999,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderWidth: 1,
                                borderColor: withAlpha(activePoint.emotionColor, 0.4),
                            }}
                        >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: activePoint.emotionColor, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                {activePoint.emotionLabel}
                            </Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: trendColor }}>{trendText}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>
                            Durchschnitt {avgMood.toFixed(0)} / 100
                        </Text>
                    </View>
                </View>
            </View>

            <View style={{ paddingHorizontal: 8, paddingBottom: 2 }}>
                <FlLineAreaChart
                    data={data}
                    width={chartWidth - 16}
                    height={190}
                    color={PETROL_LIGHT}
                    gradientColor={GOLD}
                    selectedIndex={selectedIndex}
                    onSelectIndex={setSelectedIndex}
                    showAverageLine
                    textColor="#E2E8F0"
                    subtleTextColor="rgba(255,255,255,0.45)"
                    gridColor={withAlpha('#FFFFFF', 0.08)}
                    formatTooltip={(datum) => `${datum.label}: ${datum.value}/100`}
                />
            </View>

            {chartState.topEmotions.length > 0 ? (
                <View style={{ paddingHorizontal: 24, paddingTop: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 10 }}>
                        Emotionen der letzten Check-ins
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {chartState.topEmotions.map((emotion) => (
                            <View
                                key={emotion.label}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.06)',
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                }}
                            >
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: emotion.color, marginRight: 8 }} />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#E2E8F0' }}>{emotion.label}</Text>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.45)', marginLeft: 8 }}>{emotion.count}x</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : null}

            <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 20, paddingTop: 16, gap: 12 }}>
                {[
                    { label: 'Min', value: Math.min(...moods), color: '#8A6A53' },
                    { label: 'Mittel', value: Number(avgMood.toFixed(0)), color: PETROL },
                    { label: 'Max', value: Math.max(...moods), color: '#788E76' },
                ].map((stat) => (
                    <View
                        key={stat.label}
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: 14,
                            paddingVertical: 10,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.06)',
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: '900', color: stat.color }}>
                            {stat.value}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' }}>/100</Text>
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                            {stat.label}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
