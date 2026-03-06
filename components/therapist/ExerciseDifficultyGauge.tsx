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
import { ExerciseBlock, ExerciseBlockType } from './blocks/exerciseRegistry';
import i18n from '../../utils/i18n';

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
    donut_progress: 2.5,
    stacked_bar_chart: 2.5,
    comparison_bar_chart: 2.5,
    heatmap_grid: 2,
    range_chart: 2,
    bubble_chart: 2,
    gratitude: 0.5,
    media: 1.5,
    video: 1.0,
    breathing: 2,
    timer: 1,
};

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

export default function ExerciseDifficultyGauge({ blocks }: Props) {
    const prevRatio = useRef(0);
    const animatedRatio = useRef(new Animated.Value(0)).current;
    const locale = i18n.locale;
    const gaugeCopy = useMemo(() => ({
        title: i18n.t('therapist.gauge.title', { defaultValue: 'Kognitive Belastung' }),
        subtitle: i18n.t('therapist.gauge.subtitle', { defaultValue: 'Komplexitäts-Einschätzung' }),
        empty: i18n.t('therapist.gauge.empty', { defaultValue: 'Noch keine Blöcke' }),
        zones: [
            { color: '#788E76', from: 0.0, to: 0.33, label: i18n.t('therapist.gauge.accessible.label', { defaultValue: 'Zugänglich' }) },
            { color: '#F59E0B', from: 0.33, to: 0.66, label: i18n.t('therapist.gauge.challenging.label', { defaultValue: 'Anspruchsvoll' }) },
            { color: '#EF4444', from: 0.66, to: 1.0, label: i18n.t('therapist.gauge.intense.label', { defaultValue: 'Intensiv' }) },
        ],
        levels: {
            accessible: {
                color: '#788E76',
                label: i18n.t('therapist.gauge.accessible.label', { defaultValue: 'Zugänglich' }),
                sub: i18n.t('therapist.gauge.accessible.sub', { defaultValue: 'Geeignet für alle Klienten' })
            },
            challenging: {
                color: '#F59E0B',
                label: i18n.t('therapist.gauge.challenging.label', { defaultValue: 'Anspruchsvoll' }),
                sub: i18n.t('therapist.gauge.challenging.sub', { defaultValue: 'Erfahrung empfehlenswert' })
            },
            intense: {
                color: '#EF4444',
                label: i18n.t('therapist.gauge.intense.label', { defaultValue: 'Intensiv' }),
                sub: i18n.t('therapist.gauge.intense.sub', { defaultValue: 'Für fortgeschrittene Klienten' })
            }
        }
    }), [locale]);

    // Compute raw complexity score
    const { ratio, rawScore } = useMemo(() => {
        if (blocks.length === 0) return { ratio: 0, rawScore: 0 };
        const raw = blocks.reduce((sum, b) => sum + (COMPLEXITY_WEIGHT[b.type] ?? 1), 0);
        // Max expected score for normalization: assume 10 blocks × avg weight 2 = 20
        const normalized = d3.scaleLinear().domain([0, 20]).range([0, 1]).clamp(true)(raw);
        return { ratio: normalized, rawScore: raw };
    }, [blocks]);
    const level = ratio < 0.33
        ? gaugeCopy.levels.accessible
        : ratio < 0.66
            ? gaugeCopy.levels.challenging
            : gaugeCopy.levels.intense;

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
            borderColor: '#E7E0D4',
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
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2528' }}>{gaugeCopy.title}</Text>
                    <Text style={{ fontSize: 10, color: '#8B938E', fontWeight: '500' }}>{gaugeCopy.subtitle}</Text>
                </View>
                <View style={{
                    backgroundColor: level.color + '18',
                    paddingHorizontal: 10, paddingVertical: 4,
                    borderRadius: 20, borderWidth: 1,
                    borderColor: level.color + '44',
                }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: level.color }}>
                        {level.label}
                    </Text>
                </View>
            </View>

            {/* Gauge SVG */}
            <Svg width={SIZE} height={SIZE * 0.68} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {/* Background track */}
                <Path
                    d={describeArc(0, 1, OUTER_R, INNER_R)}
                    fill="#F5F1EA"
                    transform={`translate(${CX},${CY})`}
                />

                {/* Colored zones */}
                {gaugeCopy.zones.map((zone, i) => (
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
                <SvgText x={CX - OUTER_R + 4} y={CY + 22} textAnchor="start" fill="#788E76" fontSize={8} fontWeight="700">L</SvgText>
                <SvgText x={CX} y={CY - OUTER_R + 14} textAnchor="middle" fill="#F59E0B" fontSize={8} fontWeight="700">M</SvgText>
                <SvgText x={CX + OUTER_R - 4} y={CY + 22} textAnchor="end" fill="#EF4444" fontSize={8} fontWeight="700">H</SvgText>
            </Svg>

            {/* Sub label */}
            <Text style={{ fontSize: 10, color: '#6F7472', marginTop: -6, textAlign: 'center', fontWeight: '500' }}>
                {blocks.length === 0 ? gaugeCopy.empty : level.sub}
            </Text>

            {/* Raw score pills */}
            {blocks.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                    {blocks.map((b, i) => {
                        const w = COMPLEXITY_WEIGHT[b.type];
                        const bg = w >= 2 ? '#F6F0E7' : w >= 1 ? '#EEF3EE' : '#EEF4F3';
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


