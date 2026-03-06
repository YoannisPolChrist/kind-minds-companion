/**
 * ExerciseCompositionChart â€” Premium Redesign
 *
 * Dark-themed donut chart with glowing segments, progressive bar legend,
 * and an inline AI tip. Uses D3 arc/pie + react-native-svg.
 */

import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as d3 from 'd3';
import { ExerciseBlock, ExerciseBlockType } from './blocks/exerciseRegistry';

// â”€â”€â”€ Category Mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CATEGORY_MAP: Record<ExerciseBlockType, { category: string; color: string }> = {
    reflection: { category: 'Kognition', color: '#60A5FA' },
    info: { category: 'Kognition', color: '#60A5FA' },
    homework: { category: 'Kognition', color: '#60A5FA' },
    scale: { category: 'Bewertung', color: '#FBBF24' },
    choice: { category: 'Bewertung', color: '#FBBF24' },
    checklist: { category: 'Verhalten', color: '#34D399' },
    gratitude: { category: 'Verhalten', color: '#34D399' },
    timer: { category: 'AusfÃ¼hrung', color: '#A78BFA' },
    breathing: { category: 'Achtsamkeit', color: '#22D3EE' },
    media: { category: 'Multimedia', color: '#FB7185' },
    video: { category: 'Multimedia', color: '#FB7185' },
    spider_chart: { category: 'Analyse', color: '#FBBF24' },
    bar_chart: { category: 'Analyse', color: '#34D399' },
    pie_chart: { category: 'Analyse', color: '#A78BFA' },
    line_chart: { category: 'Analyse', color: '#60A5FA' },
};

const ALL_CATEGORIES = [
    { name: 'Kognition', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', label: 'ðŸ§ ' },
    { name: 'Bewertung', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', label: 'ðŸ“Š' },
    { name: 'Verhalten', color: '#34D399', bg: 'rgba(52,211,153,0.12)', label: 'âœ…' },
    { name: 'Achtsamkeit', color: '#22D3EE', bg: 'rgba(34,211,238,0.12)', label: 'ðŸŒ¬ï¸' },
];

function getTip(blocks: ExerciseBlock[]): string {
    if (blocks.length === 0) return 'FÃ¼ge BlÃ¶cke hinzu, um die Ãœbungs-Balance zu sehen.';
    const counts: Record<string, number> = {};
    for (const b of blocks) {
        const cat = CATEGORY_MAP[b.type]?.category ?? 'Sonstiges';
        counts[cat] = (counts[cat] ?? 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0]?.[0];
    const missing = ALL_CATEGORIES.filter(c => !counts[c.name]).map(c => c.name);
    if (missing.length === 0) return 'âœ¨ Ausgewogene Ãœbung! Alle Bereiche sind abgedeckt.';
    if (dominant === 'Kognition' && counts['Achtsamkeit'] === undefined)
        return 'ðŸ’¡ Tipp: FÃ¼ge eine AtemÃ¼bung hinzu fÃ¼r mehr KÃ¶rperbezug.';
    if (blocks.length < 3)
        return 'ðŸ’¡ Tipp: Eine gute Ãœbung hat mindestens 3 BlÃ¶cke.';
    return `ðŸ’¡ Fehlend: ${missing.join(', ')} â€“ fÃ¼r mehr Balance.`;
}

interface Props {
    blocks: ExerciseBlock[];
}

export default function ExerciseCompositionChart({ blocks }: Props) {
    const { arcs } = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const cat of ALL_CATEGORIES) counts[cat.name] = 0;
        for (const b of blocks) {
            const cat = CATEGORY_MAP[b.type]?.category;
            if (cat && counts[cat] !== undefined) counts[cat] = (counts[cat] ?? 0) + 1;
        }

        const data = ALL_CATEGORIES.map(c => ({
            name: c.name, color: c.color, bg: c.bg, label: c.label,
            value: counts[c.name] ?? 0,
        }));
        const hasAny = data.some(d => d.value > 0);
        const effectiveData = hasAny ? data : data.map(d => ({ ...d, value: 1 }));
        const isEmpty = !hasAny;

        const SIZE = 180;
        const R = SIZE / 2;
        const INNER_R = R * 0.6;

        const pie = d3.pie<typeof effectiveData[0]>()
            .value(d => d.value)
            .padAngle(0.06)
            .sortValues(null);

        const arc = d3.arc<d3.PieArcDatum<typeof effectiveData[0]>>()
            .outerRadius(R - 2)
            .innerRadius(INNER_R)
            .cornerRadius(6);

        const outerArc = d3.arc<d3.PieArcDatum<typeof effectiveData[0]>>()
            .outerRadius(R + 4)
            .innerRadius(INNER_R);

        const pieData = pie(effectiveData);
        const arcs = pieData.map(d => ({
            path: arc(d) ?? '',
            color: isEmpty ? 'rgba(255,255,255,0.08)' : d.data.color,
            bg: d.data.bg,
            name: d.data.name,
            value: d.data.value,
            label: d.data.label,
            isEmpty,
        }));
        return { arcs };
    }, [blocks]);

    const SIZE = 180;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const tip = getTip(blocks);
    const totalBlocks = blocks.length;

    return (
        <View style={{
            backgroundColor: '#182428',
            borderRadius: 32,
            overflow: 'hidden',
            marginBottom: 16,
            shadowColor: '#2D666B',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            elevation: 6,
        }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                        Ãœbungs-Balance
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.3 }}>
                        Therapeutische Zusammensetzung
                    </Text>
                </View>
                <View style={{ backgroundColor: 'rgba(19,115,134,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(19,115,134,0.4)' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#22D3EE' }}>
                        {totalBlocks} {totalBlocks === 1 ? 'Block' : 'BlÃ¶cke'}
                    </Text>
                </View>
            </View>

            {/* Donut + Legend */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, gap: 16 }}>
                {/* SVG Donut */}
                <View style={{ position: 'relative' }}>
                    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                        <G x={CX} y={CY}>
                            {arcs.map((seg, i) => (
                                <Path
                                    key={i}
                                    d={seg.path}
                                    fill={seg.isEmpty ? 'rgba(255,255,255,0.07)' : seg.color}
                                    opacity={seg.isEmpty ? 1 : 0.92}
                                />
                            ))}
                        </G>
                        {/* Center content */}
                        <Circle cx={CX} cy={CY} r={28} fill="rgba(255,255,255,0.04)" />
                        <SvgText
                            x={CX}
                            y={CY - 7}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={26}
                            fontWeight="900"
                        >
                            {totalBlocks}
                        </SvgText>
                        <SvgText
                            x={CX}
                            y={CY + 11}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.35)"
                            fontSize={8}
                            fontWeight="700"
                        >
                            {totalBlocks === 1 ? 'BLOCK' : 'BLÃ–CKE'}
                        </SvgText>
                    </Svg>
                </View>

                {/* Legend with mini progress bars */}
                <View style={{ flex: 1, gap: 10 }}>
                    {ALL_CATEGORIES.map(cat => {
                        const count = blocks.filter(b => CATEGORY_MAP[b.type]?.category === cat.name).length;
                        const pct = totalBlocks > 0 ? Math.round((count / totalBlocks) * 100) : 0;
                        const active = count > 0;
                        return (
                            <View key={cat.name}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? cat.color : 'rgba(255,255,255,0.12)' }} />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)' }}>
                                            {cat.label} {cat.name}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: active ? cat.color : 'rgba(255,255,255,0.2)', minWidth: 30, textAlign: 'right' }}>
                                        {active ? `${pct}%` : 'â€”'}
                                    </Text>
                                </View>
                                {/* Mini progress bar */}
                                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                                    {active && (
                                        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: cat.color, borderRadius: 2, opacity: 0.85 }} />
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* AI Tip */}
            <View style={{
                marginHorizontal: 16,
                marginBottom: 16,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.07)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
            }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(19,115,134,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16 }}>ðŸ’¡</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 17, fontWeight: '500' }}>
                    {tip.replace('ðŸ’¡ ', '')}
                </Text>
            </View>
        </View>
    );
}


