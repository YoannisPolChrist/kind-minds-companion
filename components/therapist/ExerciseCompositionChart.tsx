/**
 * ExerciseCompositionChart
 *
 * Uses D3's arc + pie functions to calculate SVG paths, then renders
 * them via react-native-svg. This gives us full D3 geometry power
 * without browser DOM dependencies.
 *
 * Shows 4 therapeutic categories:
 *   • Kognition  (reflection, info, homework)
 *   • Bewertung  (scale, choice)
 *   • Verhalten  (checklist, gratitude)
 *   • Körper     (breathing, timer, media)
 */

import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import * as d3 from 'd3';
import { ExerciseBlock, ExerciseBlockType } from './ExerciseBuilder';

// ─── Category Mapping ─────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<ExerciseBlockType, { category: string; color: string }> = {
    reflection: { category: 'Kognition', color: '#3B82F6' },
    info: { category: 'Kognition', color: '#3B82F6' },
    homework: { category: 'Kognition', color: '#3B82F6' },
    scale: { category: 'Bewertung', color: '#F59E0B' },
    choice: { category: 'Bewertung', color: '#F59E0B' },
    checklist: { category: 'Verhalten', color: '#10B981' },
    gratitude: { category: 'Verhalten', color: '#10B981' },
    timer: { category: 'Ausführung', color: '#8B5CF6' },      // Purple
    breathing: { category: 'Achtsamkeit', color: '#137386' },  // Primary
    media: { category: 'Multimedia', color: '#F43F5E' },       // Rose
    spider_chart: { category: 'Analyse', color: '#F59E0B' },   // Amber
    bar_chart: { category: 'Analyse', color: '#10B981' },      // Emerald
    pie_chart: { category: 'Analyse', color: '#8B5CF6' },      // Purple
    line_chart: { category: 'Analyse', color: '#0EA5E9' },     // Sky
};

const ALL_CATEGORIES = [
    { name: 'Kognition', color: '#3B82F6', emoji: '🧠' },
    { name: 'Bewertung', color: '#F59E0B', emoji: '📊' },
    { name: 'Verhalten', color: '#10B981', emoji: '✅' },
    { name: 'Körper', color: '#137386', emoji: '🌬️' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTip(blocks: ExerciseBlock[]): string {
    if (blocks.length === 0) return 'Füge Blöcke hinzu, um die Zusammensetzung zu sehen.';

    const counts: Record<string, number> = {};
    for (const b of blocks) {
        const cat = CATEGORY_MAP[b.type]?.category ?? 'Sonstiges';
        counts[cat] = (counts[cat] ?? 0) + 1;
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0]?.[0];
    const missing = ALL_CATEGORIES.filter(c => !counts[c.name]).map(c => c.name);

    if (missing.length === 0) return '✨ Ausgewogene Übung! Alle vier Bereiche sind vertreten.';
    if (dominant === 'Kognition' && counts['Körper'] === undefined)
        return '💡 Tipp: Füge eine Atemübung oder einen Timer hinzu für mehr Körperbezug.';
    if (blocks.length < 3)
        return '💡 Tipp: Eine gute Übung hat mindestens 3 Blöcke.';
    return `💡 Fehlend: ${missing.join(', ')} – für mehr Balance.`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    blocks: ExerciseBlock[];
}

export default function ExerciseCompositionChart({ blocks }: Props) {
    // Compute segment data with D3
    const { arcs, pieData } = useMemo(() => {
        // Count blocks per category
        const counts: Record<string, number> = {};
        for (const cat of ALL_CATEGORIES) counts[cat.name] = 0;
        for (const b of blocks) {
            const cat = CATEGORY_MAP[b.type]?.category;
            if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
        }

        // Build input for D3 pie – include placeholder if all zero
        const data = ALL_CATEGORIES.map(c => ({
            name: c.name,
            color: c.color,
            emoji: c.emoji,
            value: counts[c.name] ?? 0,
        }));

        const hasAny = data.some(d => d.value > 0);
        const effectiveData = hasAny ? data : data.map(d => ({ ...d, value: 1 }));
        const isEmpty = !hasAny;

        // D3 pie layout
        const pie = d3.pie<typeof effectiveData[0]>()
            .value(d => d.value)
            .padAngle(0.04)
            .sortValues(null); // keep original category order

        // D3 arc generator
        const SIZE = 160;
        const R = SIZE / 2;
        const INNER_R = R * 0.55;
        const arc = d3.arc<d3.PieArcDatum<typeof effectiveData[0]>>()
            .outerRadius(R - 4)
            .innerRadius(INNER_R)
            .cornerRadius(4);

        const pieData = pie(effectiveData);
        const arcs = pieData.map(d => ({
            path: arc(d) ?? '',
            color: isEmpty ? '#E5E7EB' : d.data.color,
            name: d.data.name,
            value: d.data.value,
            emoji: d.data.emoji,
            isEmpty,
        }));

        return { arcs, pieData };
    }, [blocks]);

    const SIZE = 160;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const tip = getTip(blocks);

    const totalBlocks = blocks.length;

    return (
        <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            padding: 20,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
        }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#243842', letterSpacing: 0.2 }}>
                        Übungs-Balance
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 2 }}>
                        Therapeutische Zusammensetzung
                    </Text>
                </View>
                <View style={{
                    backgroundColor: '#F0FDFA',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#99F6E4',
                }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#134E4A' }}>
                        {totalBlocks} {totalBlocks === 1 ? 'Block' : 'Blöcke'}
                    </Text>
                </View>
            </View>

            {/* Chart + Legend row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {/* D3-calculated SVG Donut */}
                <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                    <G x={CX} y={CY}>
                        {arcs.map((seg, i) => (
                            <Path
                                key={i}
                                d={seg.path}
                                fill={seg.color}
                                opacity={seg.isEmpty ? 1 : 0.9}
                            />
                        ))}
                    </G>
                    {/* Center label */}
                    <SvgText
                        x={CX}
                        y={CY - 6}
                        textAnchor="middle"
                        fill="#243842"
                        fontSize={22}
                        fontWeight="800"
                    >
                        {totalBlocks}
                    </SvgText>
                    <SvgText
                        x={CX}
                        y={CY + 11}
                        textAnchor="middle"
                        fill="#9CA3AF"
                        fontSize={9}
                        fontWeight="600"
                    >
                        {totalBlocks === 1 ? 'BLOCK' : 'BLÖCKE'}
                    </SvgText>
                </Svg>

                {/* Legend */}
                <View style={{ flex: 1, gap: 8 }}>
                    {ALL_CATEGORIES.map(cat => {
                        const count = blocks.filter(b => CATEGORY_MAP[b.type]?.category === cat.name).length;
                        const pct = totalBlocks > 0 ? Math.round((count / totalBlocks) * 100) : 0;
                        return (
                            <View key={cat.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{
                                    width: 10, height: 10, borderRadius: 5,
                                    backgroundColor: count > 0 ? cat.color : '#E5E7EB',
                                }} />
                                <Text style={{ flex: 1, fontSize: 12, color: '#374151', fontWeight: '600' }}>
                                    {cat.emoji} {cat.name}
                                </Text>
                                <Text style={{
                                    fontSize: 11, fontWeight: '700',
                                    color: count > 0 ? cat.color : '#D1D5DB',
                                    minWidth: 28, textAlign: 'right',
                                }}>
                                    {count > 0 ? `${pct}%` : '—'}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* AI Tip */}
            <View style={{
                marginTop: 14,
                backgroundColor: '#F9F8F6',
                borderRadius: 12,
                padding: 10,
                borderWidth: 1,
                borderColor: '#E5E7EB',
            }}>
                <Text style={{ fontSize: 11, color: '#4B5563', lineHeight: 16 }}>{tip}</Text>
            </View>
        </View>
    );
}
