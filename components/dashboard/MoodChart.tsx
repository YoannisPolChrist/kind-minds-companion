import { View, Text, useWindowDimensions, Platform } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import i18n from '../../utils/i18n';
import { useMemo } from 'react';

interface Checkin {
    date: string;
    mood: number;
}

interface Props {
    checkins: Checkin[];
}

const TEAL = '#137386';
const TEAL_LIGHT = '#1a8b9f';
const GOLD = '#C09D59';

function buildLinePath(points: { x: number; y: number }[], fill = false, height = 0): string {
    if (points.length < 2) return '';
    const [first, ...rest] = points;
    let d = `M ${first.x} ${first.y}`;

    for (let i = 0; i < rest.length; i++) {
        const prev = points[i];
        const curr = rest[i];
        const cpx = (prev.x + curr.x) / 2;
        d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    if (fill) {
        const last = points[points.length - 1];
        d += ` L ${last.x} ${height} L ${first.x} ${height} Z`;
    }
    return d;
}

export function MoodChart({ checkins }: Props) {
    const { width: screenWidth } = useWindowDimensions();
    const chartWidth = Math.min(screenWidth - 48, 800);

    const data = useMemo(() => {
        if (!checkins || checkins.length === 0) return null;
        const display = checkins.length === 1 ? [checkins[0], checkins[0]] : checkins;
        return display;
    }, [checkins]);

    if (!data) return null;

    const CHART_H = 140;
    const PAD_LEFT = 28;
    const PAD_RIGHT = 12;
    const PAD_TOP = 16;
    const PAD_BOTTOM = 28;
    const innerW = chartWidth - PAD_LEFT - PAD_RIGHT;
    const innerH = CHART_H - PAD_TOP - PAD_BOTTOM;

    const moods = data.map(c => c.mood);
    const minMood = Math.max(0, Math.min(...moods) - 1);
    const maxMood = Math.min(10, Math.max(...moods) + 1);

    const toX = (i: number) =>
        PAD_LEFT + (i / (data.length - 1 || 1)) * innerW;
    const toY = (v: number) =>
        PAD_TOP + innerH - ((v - minMood) / (maxMood - minMood || 1)) * innerH;

    const points = data.map((c, i) => ({ x: toX(i), y: toY(c.mood), mood: c.mood, date: c.date }));

    const linePath = buildLinePath(points);
    const fillPath = buildLinePath(points, true, CHART_H - PAD_BOTTOM);

    // Latest mood
    const latestMood = moods[moods.length - 1];
    const avgMood = Math.round(moods.reduce((a, b) => a + b, 0) / moods.length);
    const trend = moods.length > 1 ? moods[moods.length - 1] - moods[moods.length - 2] : 0;
    const trendText = trend > 0 ? `↑ +${trend}` : trend < 0 ? `↓ ${trend}` : '→ gleich';
    const trendColor = trend > 0 ? '#10B981' : trend < 0 ? '#F43F5E' : '#94A3B8';

    // Y-axis grid lines
    const yTicks = [0, 2.5, 5, 7.5, 10].filter(v => v >= minMood && v <= maxMood);

    // X-axis labels
    const visibleLabels = data.length <= 7 ? data : data.filter((_, i) => i % Math.ceil(data.length / 7) === 0);

    return (
        <View style={{
            backgroundColor: '#0F172A',
            borderRadius: 32,
            overflow: 'hidden',
            marginBottom: 20,
            shadowColor: TEAL,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            elevation: 6,
        }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                            Stimmungsverlauf
                        </Text>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>
                            {latestMood}<Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>/10</Text>
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: trendColor }}>{trendText}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>Ø {avgMood}/10 • {data.length} Check-ins</Text>
                    </View>
                </View>
            </View>

            {/* Chart */}
            <View style={{ paddingHorizontal: 0, paddingBottom: 4 }}>
                <Svg width={chartWidth} height={CHART_H + 8}>
                    <Defs>
                        <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={TEAL} stopOpacity={0.35} />
                            <Stop offset="1" stopColor={TEAL} stopOpacity={0} />
                        </LinearGradient>
                        <LinearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor={TEAL_LIGHT} />
                            <Stop offset="1" stopColor={GOLD} stopOpacity={0.8} />
                        </LinearGradient>
                    </Defs>

                    {/* Grid lines */}
                    {yTicks.map((tick) => (
                        <G key={tick}>
                            <Line
                                x1={PAD_LEFT}
                                y1={toY(tick)}
                                x2={chartWidth - PAD_RIGHT}
                                y2={toY(tick)}
                                stroke="rgba(255,255,255,0.06)"
                                strokeWidth={1}
                            />
                            <SvgText
                                x={PAD_LEFT - 6}
                                y={toY(tick) + 4}
                                textAnchor="end"
                                fill="rgba(255,255,255,0.25)"
                                fontSize={9}
                                fontWeight="700"
                            >
                                {tick}
                            </SvgText>
                        </G>
                    ))}

                    {/* Gradient fill */}
                    <Path d={fillPath} fill="url(#lineFill)" />

                    {/* Line */}
                    <Path
                        d={linePath}
                        fill="none"
                        stroke="url(#lineStroke)"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Data points */}
                    {points.map((p, i) => (
                        <G key={i}>
                            <Circle cx={p.x} cy={p.y} r={6} fill="rgba(19,115,134,0.2)" />
                            <Circle cx={p.x} cy={p.y} r={4} fill={TEAL_LIGHT} />
                            <Circle cx={p.x} cy={p.y} r={2} fill="white" />
                        </G>
                    ))}

                    {/* X-axis labels */}
                    {data.map((c, i) => {
                        const isVisible = data.length <= 7 || i % Math.ceil(data.length / 7) === 0;
                        if (!isVisible) return null;
                        const d = new Date(c.date);
                        const label = d.toLocaleDateString(i18n.locale, { weekday: 'short' });
                        return (
                            <SvgText
                                key={i}
                                x={toX(i)}
                                y={CHART_H - 4}
                                textAnchor="middle"
                                fill="rgba(255,255,255,0.3)"
                                fontSize={9}
                                fontWeight="700"
                            >
                                {label.toUpperCase()}
                            </SvgText>
                        );
                    })}
                </Svg>
            </View>

            {/* Mini stats row */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 20, paddingTop: 4, gap: 12 }}>
                {[
                    { label: 'Min', value: Math.min(...moods), color: '#F43F5E' },
                    { label: 'Ø Schnitt', value: avgMood, color: TEAL },
                    { label: 'Max', value: Math.max(...moods), color: '#10B981' },
                ].map(stat => (
                    <View key={stat.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: stat.color }}>{stat.value}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{stat.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
