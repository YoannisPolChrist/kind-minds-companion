import { useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { VictoryArea, VictoryAxis, VictoryChart, VictoryLine, VictoryScatter } from 'victory-native';
import i18n from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';

interface Checkin {
    date: string;
    mood: number;
}

interface Props {
    checkins: Checkin[];
}

type RangeKey = 'month' | 'quarter' | 'year';

const RANGE_OPTIONS: RangeKey[] = ['month', 'quarter', 'year'];
const MONTH_FORMAT = new Intl.DateTimeFormat('de-DE', { month: 'short', day: 'numeric' });
const YEAR_FORMAT = new Intl.DateTimeFormat('de-DE', { month: 'short' });

function isInRange(dateString: string, range: RangeKey) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    if (range === 'month') return diffMs <= 31 * dayMs;
    if (range === 'quarter') return diffMs <= 92 * dayMs;
    return diffMs <= 366 * dayMs;
}

function getRangeLabel(range: RangeKey) {
    if (range === 'month') return i18n.t('dashboard.range_month', { defaultValue: 'Monat' });
    if (range === 'quarter') return i18n.t('dashboard.range_quarter', { defaultValue: 'Quadratzeit' });
    return i18n.t('dashboard.range_year', { defaultValue: 'Jahr' });
}

export function MoodChart({ checkins }: Props) {
    const { width: screenWidth } = useWindowDimensions();
    const { colors, isDark } = useTheme();
    const [range, setRange] = useState<RangeKey>('month');

    const chartWidth = Math.min(screenWidth - 48, 820);

    const filteredData = useMemo(() => {
        if (!checkins?.length) return [];

        const sorted = [...checkins]
            .filter((item) => item?.date && typeof item?.mood === 'number')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const inRange = sorted.filter((item) => isInRange(item.date, range));
        const fallback = sorted.slice(-Math.min(sorted.length, range === 'month' ? 8 : range === 'quarter' ? 12 : 18));

        const dataset = inRange.length > 1 ? inRange : fallback;
        return dataset.length === 1 ? [dataset[0], dataset[0]] : dataset;
    }, [checkins, range]);

    const chartMetrics = useMemo(() => {
        if (!filteredData.length) return null;

        const points = filteredData.map((item) => ({
            x: new Date(item.date),
            y: item.mood,
        }));

        const moods = filteredData.map((item) => item.mood);
        const minValue = Math.min(...moods);
        const maxValue = Math.max(...moods);
        const averageMood = Number((moods.reduce((sum, value) => sum + value, 0) / moods.length).toFixed(1));
        const trend = moods.length > 1 ? Number((moods[moods.length - 1] - moods[0]).toFixed(1)) : 0;
        const latestMood = moods[moods.length - 1];

        const minDomain = Math.max(0, Math.floor(minValue - 1));
        const maxDomain = Math.min(10, Math.ceil(maxValue + 1));

        return {
            points,
            averageMood,
            trend,
            latestMood,
            minValue,
            maxValue,
            domain: [minDomain, maxDomain] as [number, number],
        };
    }, [filteredData]);

    if (!chartMetrics) return null;

    const cardBackground = isDark ? colors.surface : '#FFFFFF';
    const areaFill = isDark ? 'rgba(19,163,188,0.18)' : 'rgba(19,115,134,0.12)';
    const lineColor = colors.primary;
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(20,38,54,0.08)';
    const axisColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(36,56,66,0.45)';
    const trendColor = chartMetrics.trend > 0 ? colors.success : chartMetrics.trend < 0 ? colors.danger : colors.textSubtle;
    const trendCardBg = chartMetrics.trend >= 0
        ? (isDark ? 'rgba(34,197,94,0.12)' : '#ECFDF5')
        : (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2');
    const trendLabel = chartMetrics.trend > 0 ? `+${chartMetrics.trend}` : chartMetrics.trend.toString();

    return (
        <View
            style={{
                backgroundColor: cardBackground,
                borderRadius: 32,
                overflow: 'hidden',
                marginBottom: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                shadowColor: isDark ? '#000' : colors.primary,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: isDark ? 0.18 : 0.1,
                shadowRadius: 26,
                elevation: 6,
            }}
        >
            <View style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                            {i18n.t('dashboard.mood_chart_title', { defaultValue: 'Stimmungsverlauf' })}
                        </Text>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.6 }}>
                            {chartMetrics.latestMood}
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSubtle }}>/10</Text>
                        </Text>
                        <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                            {i18n.t('dashboard.overview_desc', { defaultValue: 'Alles Wichtige zu Aufgaben und Fortschritt.' })}
                        </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 10 }}>
                        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F3F0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textSubtle }}>
                                {filteredData.length} {i18n.t('dashboard.checkins_label', { defaultValue: 'Check-ins' })}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {RANGE_OPTIONS.map((option) => {
                                const active = option === range;
                                return (
                                    <Pressable key={option} onPress={() => setRange(option)}>
                                        <View
                                            style={{
                                                paddingHorizontal: 14,
                                                paddingVertical: 9,
                                                borderRadius: 999,
                                                backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.06)' : '#F4F3F0',
                                                borderWidth: 1,
                                                borderColor: active ? colors.primary : colors.border,
                                            }}
                                        >
                                            <Text style={{ color: active ? '#FFFFFF' : colors.text, fontSize: 12, fontWeight: '800' }}>
                                                {getRangeLabel(option)}
                                            </Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </View>

            <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}>
                <VictoryChart
                    width={Math.max(chartWidth, 320)}
                    height={240}
                    padding={{ top: 30, bottom: 56, left: 60, right: 18 }}
                    domain={{ y: chartMetrics.domain }}
                >
                    <VictoryAxis
                        tickFormat={(value) => (range === 'year' ? YEAR_FORMAT.format(new Date(value)) : MONTH_FORMAT.format(new Date(value)))}
                        style={{
                            axis: { stroke: 'transparent' },
                            ticks: { stroke: 'transparent' },
                            grid: { stroke: gridColor, strokeDasharray: '4,6' },
                            tickLabels: { fill: axisColor, fontSize: 10, fontWeight: '600' },
                        }}
                    />
                    <VictoryAxis
                        dependentAxis
                        tickFormat={(tick) => `${tick}`}
                        style={{
                            axis: { stroke: 'transparent' },
                            ticks: { stroke: 'transparent' },
                            grid: { stroke: gridColor, strokeDasharray: '4,6' },
                            tickLabels: { fill: axisColor, fontSize: 10, fontWeight: '600' },
                        }}
                    />
                    <VictoryArea
                        interpolation="natural"
                        data={chartMetrics.points}
                        x="x"
                        y="y"
                        style={{ data: { fill: areaFill, strokeWidth: 0 } }}
                        animate={{ duration: 600, easing: 'quadInOut' }}
                    />
                    <VictoryLine
                        interpolation="natural"
                        data={chartMetrics.points}
                        x="x"
                        y="y"
                        style={{ data: { stroke: lineColor, strokeWidth: 3 } }}
                        animate={{ duration: 600, easing: 'quadInOut' }}
                    />
                    <VictoryScatter
                        data={chartMetrics.points}
                        x="x"
                        y="y"
                        size={4}
                        style={{ data: { fill: colors.surface, stroke: lineColor, strokeWidth: 2 } }}
                    />
                </VictoryChart>
            </View>

            <View style={{ paddingHorizontal: 24, paddingBottom: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 120, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7F4EE', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Durchschnitt</Text>
                    <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{chartMetrics.averageMood}/10</Text>
                </View>
                <View style={{ flex: 1, minWidth: 120, backgroundColor: trendCardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: trendColor }}>
                    <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Trend</Text>
                    <Text style={{ color: trendColor, fontSize: 20, fontWeight: '900' }}>{trendLabel}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 120, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F7F4EE', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Spannweite</Text>
                    <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{chartMetrics.minValue} - {chartMetrics.maxValue}</Text>
                </View>
            </View>
        </View>
    );
}
