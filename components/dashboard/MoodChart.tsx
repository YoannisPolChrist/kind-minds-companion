import { useEffect, useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { FlLineAreaChart } from '../charts/flChartPrimitives';
import { withAlpha } from '../charts/chartData';
import { normalizeMoodToHundred } from '../../utils/checkinMood';
import i18n from '../../utils/i18n';

interface Checkin {
    date: string;
    mood: number;
}

interface Props {
    checkins: Checkin[];
}

const PETROL = '#2D666B';
const PETROL_LIGHT = '#4E7E82';
const GOLD = '#B08C57';
const CARD_BG = '#182428';

export function MoodChart({ checkins }: Props) {
    const { width: screenWidth } = useWindowDimensions();
    const chartWidth = Math.min(screenWidth - 48, 800);

    const data = useMemo(() => {
        if (!checkins || checkins.length === 0) return [];

        const sorted = [...checkins]
            .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
            .slice(-10);

        return sorted.map((checkin) => ({
            label: new Date(checkin.date).toLocaleDateString(i18n.locale, { weekday: 'short' }).toUpperCase(),
            value: normalizeMoodToHundred(checkin.mood),
            color: PETROL_LIGHT,
            rawDate: checkin.date,
        }));
    }, [checkins]);

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
                            Ausgewählt: {activeDate}
                        </Text>
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

            <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 20, paddingTop: 4, gap: 12 }}>
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


