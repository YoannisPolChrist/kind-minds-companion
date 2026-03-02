/**
 * ExerciseDifficultyGauge
 *
 * An animated D3 arc gauge (speedometer style) that computes an estimated
 * cognitive complexity score for the exercise.
 *
 * Complexity weights:
 *   - ABC Homework (homework)  → 3 pts  (high cognitive load)
 *   - Reflection               → 2 pts
 *   - Scale / Choice           → 1.5 pts
 *   - Info / Checklist         → 1 pt
 *   - Gratitude / Media        → 0.5 pts
 *   - Breathing / Timer        → 0.5 pts
 *
 * Score is normalized 0–10 via d3.scaleLinear and drives
 * a D3 arc from -130° to +130°. The needle position
 * is animated with React Native's Animated API.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Path, G, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as d3 from 'd3';
import { ExerciseBlock, ExerciseBlockType } from './ExerciseBuilder';

// ─── Complexity Weights ───────────────────────────────────────────────────────

const COMPLEXITY_WEIGHT: Record<ExerciseBlockType, number> = {
    homework: 3.0,
    reflection: 2.0,
    scale: 1.5,
    choice: 1.5,
    info: 1.0,
    checklist: 1.0,
    spider_chart: 3,
    bar_chart: 2,
    pie_chart: 2,
    line_chart: 2.5,
    gratitude: 0.5,
    media: 1.5,
    breathing: 2,
    timer: 1,
};

const GAUGE_ZONES = [
    { color: '#10B981', label: 'Zugänglich', from: 0.0, to: 0.33 },
    { color: '#F59E0B', label: 'Anspruchsvoll', from: 0.33, to: 0.66 },
    { color: '#EF4444', label: 'Intensiv', from: 0.66, to: 1.0 },
];

// ─── Arc Math ─────────────────────────────────────────────────────────────────

const SIZE = 180;
const CX = SIZE / 2;
const CY = SIZE / 2 + 12;       // shift center down for better half-gauge look
const OUTER_R = SIZE / 2 - 14;
const INNER_R = OUTER_R - 20;
const START_ANG = -Math.PI * 0.75;  // -135°
const END_ANG = Math.PI * 0.75;  // +135°
const TOTAL_ANG = END_ANG - START_ANG;

function describeArc(startRatio: number, endRatio: number, outerR: number, innerR: number): string {
    const start = START_ANG + startRatio * TOTAL_ANG;
    const end = START_ANG + endRatio * TOTAL_ANG;
    const arcFn = d3.arc<any>()
        .innerRadius(innerR)
        .outerRadius(outerR)
        .startAngle(start)
        .endAngle(end);
    const result = arcFn({} as any);
    return result ?? '';
}

function needlePoint(ratio: number): { x: number; y: number } {
    const angle = START_ANG + ratio * TOTAL_ANG - Math.PI / 2;
    return {
        x: Math.cos(angle) * (INNER_R - 6),
        y: Math.sin(angle) * (INNER_R - 6),
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { blocks: ExerciseBlock[]; }

function getLevelInfo(ratio: number) {
    if (ratio < 0.33) return { label: 'Zugänglich', emoji: '🟢', color: '#10B981', sub: 'Geeignet für alle Klienten' };
    if (ratio < 0.66) return { label: 'Anspruchsvoll', emoji: '🟡', color: '#F59E0B', sub: 'Erfahrung empfehlenswert' };
    return { label: 'Intensiv', emoji: '🔴', color: '#EF4444', sub: 'Für fortgeschrittene Klienten' };
}

export default function ExerciseDifficultyGauge({ blocks }: Props) {
    const prevRatio = useRef(0);
    const animatedRatio = useRef(new Animated.Value(0)).current;

    // Compute raw complexity score
    const { ratio, rawScore } = useMemo(() => {
        if (blocks.length === 0) return { ratio: 0, rawScore: 0 };
        const raw = blocks.reduce((sum, b) => sum + (COMPLEXITY_WEIGHT[b.type] ?? 1), 0);
        // Max expected score for normalization: assume 10 blocks × avg weight 2 = 20
        const normalized = d3.scaleLinear().domain([0, 20]).range([0, 1]).clamp(true)(raw);
        return { ratio: normalized, rawScore: raw };
    }, [blocks]);

    // Animate needle to new ratio
    useEffect(() => {
        Animated.spring(animatedRatio, {
            toValue: ratio,
            friction: 5,
            tension: 60,
            useNativeDriver: false, // Must be false for non-transform values
        }).start();
        prevRatio.current = ratio;
    }, [ratio]);

    const level = getLevelInfo(ratio);

    // We interpolate ratio → needle SVG using JS listener + state
    const [displayRatio, setDisplayRatio] = React.useState(0);
    useEffect(() => {
        const id = animatedRatio.addListener(({ value }) => setDisplayRatio(value));
        return () => animatedRatio.removeListener(id);
    }, []);

    const needle = needlePoint(displayRatio);

    return (
        <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            padding: 18,
            marginBottom: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
        }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 }}>
                <View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#243842' }}>Kognitive Belastung</Text>
                    <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '500' }}>Komplexitäts-Einschätzung</Text>
                </View>
                <View style={{
                    backgroundColor: level.color + '18',
                    paddingHorizontal: 10, paddingVertical: 4,
                    borderRadius: 20, borderWidth: 1,
                    borderColor: level.color + '44',
                }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: level.color }}>
                        {level.emoji} {level.label}
                    </Text>
                </View>
            </View>

            {/* Gauge SVG */}
            <Svg width={SIZE} height={SIZE * 0.68} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {/* Background track */}
                <Path
                    d={describeArc(0, 1, OUTER_R, INNER_R)}
                    fill="#F3F4F6"
                    transform={`translate(${CX},${CY})`}
                />

                {/* Colored zones */}
                {GAUGE_ZONES.map((zone, i) => (
                    <Path
                        key={i}
                        d={describeArc(zone.from, zone.to, OUTER_R, INNER_R)}
                        fill={zone.color}
                        opacity={0.18}
                        transform={`translate(${CX},${CY})`}
                    />
                ))}

                {/* Filled arc up to current ratio */}
                {displayRatio > 0 && (
                    <Path
                        d={describeArc(0, displayRatio, OUTER_R, INNER_R)}
                        fill={level.color}
                        opacity={0.85}
                        transform={`translate(${CX},${CY})`}
                    />
                )}

                {/* Tick marks */}
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                    const a = START_ANG + t * TOTAL_ANG - Math.PI / 2;
                    const r1 = OUTER_R + 2;
                    const r2 = OUTER_R + 7;
                    return (
                        <Path
                            key={t}
                            d={`M ${CX + Math.cos(a) * r1} ${CY + Math.sin(a) * r1} L ${CX + Math.cos(a) * r2} ${CY + Math.sin(a) * r2}`}
                            stroke="#D1D5DB"
                            strokeWidth={2}
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* Needle line */}
                <Path
                    d={`M ${CX} ${CY} L ${CX + needle.x} ${CY + needle.y}`}
                    stroke={level.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                />

                {/* Center hub */}
                <Circle cx={CX} cy={CY} r={7} fill={level.color} />
                <Circle cx={CX} cy={CY} r={3} fill="#FFFFFF" />

                {/* Zone labels */}
                <SvgText x={CX - OUTER_R + 4} y={CY + 22} textAnchor="start" fill="#10B981" fontSize={8} fontWeight="700">L</SvgText>
                <SvgText x={CX} y={CY - OUTER_R + 14} textAnchor="middle" fill="#F59E0B" fontSize={8} fontWeight="700">M</SvgText>
                <SvgText x={CX + OUTER_R - 4} y={CY + 22} textAnchor="end" fill="#EF4444" fontSize={8} fontWeight="700">H</SvgText>
            </Svg>

            {/* Sub label */}
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: -6, textAlign: 'center', fontWeight: '500' }}>
                {blocks.length === 0 ? 'Noch keine Blöcke' : level.sub}
            </Text>

            {/* Raw score pills */}
            {blocks.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                    {blocks.map((b, i) => {
                        const w = COMPLEXITY_WEIGHT[b.type];
                        const bg = w >= 2 ? '#FEF3C7' : w >= 1 ? '#ECFDF5' : '#EFF6FF';
                        const clr = w >= 2 ? '#92400E' : w >= 1 ? '#065F46' : '#1D4ED8';
                        return (
                            <View key={b.id} style={{ backgroundColor: bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
                                <Text style={{ fontSize: 9, fontWeight: '800', color: clr }}>{w}pt</Text>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}
