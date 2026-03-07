import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import * as d3 from 'd3';
import { ExerciseBlock, ExerciseBlockType } from './blocks/exerciseRegistry';

type CategoryDefinition = {
    name: string;
    color: string;
    bg: string;
};

type CategoryCounts = Record<string, number>;
type CategorySlice = CategoryDefinition & { value: number };

const CATEGORY_MAP: Record<ExerciseBlockType, { category: string; color: string }> = {
    reflection: { category: 'Kognition', color: '#60A5FA' },
    info: { category: 'Kognition', color: '#60A5FA' },
    homework: { category: 'Kognition', color: '#60A5FA' },
    scale: { category: 'Bewertung', color: '#FBBF24' },
    choice: { category: 'Bewertung', color: '#FBBF24' },
    checklist: { category: 'Verhalten', color: '#34D399' },
    gratitude: { category: 'Verhalten', color: '#34D399' },
    timer: { category: 'Ausführung', color: '#A78BFA' },
    breathing: { category: 'Achtsamkeit', color: '#22D3EE' },
    media: { category: 'Multimedia', color: '#FB7185' },
    video: { category: 'Multimedia', color: '#FB7185' },
    spider_chart: { category: 'Analyse', color: '#FBBF24' },
    bar_chart: { category: 'Analyse', color: '#34D399' },
    pie_chart: { category: 'Analyse', color: '#A78BFA' },
    line_chart: { category: 'Analyse', color: '#60A5FA' },
    donut_progress: { category: 'Analyse', color: '#8A6A53' },
    stacked_bar_chart: { category: 'Analyse', color: '#4E7E82' },
    comparison_bar_chart: { category: 'Analyse', color: '#2D666B' },
    heatmap_grid: { category: 'Analyse', color: '#B08C57' },
    range_chart: { category: 'Analyse', color: '#788E76' },
    bubble_chart: { category: 'Analyse', color: '#A37E68' },
};

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
    { name: 'Kognition', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
    { name: 'Bewertung', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
    { name: 'Verhalten', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    { name: 'Achtsamkeit', color: '#22D3EE', bg: 'rgba(34,211,238,0.12)' },
    { name: 'Ausführung', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
    { name: 'Multimedia', color: '#FB7185', bg: 'rgba(251,113,133,0.12)' },
    { name: 'Analyse', color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
];

const CATEGORY_THEME_MAP = CATEGORY_DEFINITIONS.reduce<Record<string, CategoryDefinition>>((acc, definition) => {
    acc[definition.name] = definition;
    return acc;
}, {});

const FALLBACK_CATEGORY: CategoryDefinition = {
    name: 'Sonstiges',
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.12)',
};

function resolveCategoryDefinition(name: string): CategoryDefinition {
    return CATEGORY_THEME_MAP[name] ?? {
        name,
        color: FALLBACK_CATEGORY.color,
        bg: FALLBACK_CATEGORY.bg,
    };
}

function buildCategoryData(counts: CategoryCounts): CategorySlice[] {
    const orderedEntries = CATEGORY_DEFINITIONS.map(category => ({
        ...category,
        value: counts[category.name] ?? 0,
    }));

    const fallbackValue = counts[FALLBACK_CATEGORY.name] ?? 0;
    const fallbackEntries = fallbackValue > 0
        ? [{ ...FALLBACK_CATEGORY, value: fallbackValue }]
        : [];

    const dynamicEntries = Object.entries(counts)
        .filter(([name, value]) => value > 0 && !(name in CATEGORY_THEME_MAP) && name !== FALLBACK_CATEGORY.name)
        .map(([name, value]) => ({
            ...resolveCategoryDefinition(name),
            value,
        }));

    return [...orderedEntries, ...fallbackEntries, ...dynamicEntries];
}

function getCategoryCounts(blocks: ExerciseBlock[]) {
    const counts: CategoryCounts = {};

    for (const category of CATEGORY_DEFINITIONS) {
        counts[category.name] = 0;
    }
    counts[FALLBACK_CATEGORY.name] = 0;

    for (const block of blocks) {
        const categoryName = CATEGORY_MAP[block.type]?.category ?? FALLBACK_CATEGORY.name;
        counts[categoryName] = (counts[categoryName] ?? 0) + 1;
    }

    return counts;
}

function getTip(blocks: ExerciseBlock[]): string {
    if (blocks.length === 0) {
        return 'Füge Blöcke hinzu, um die Übungs-Balance zu sehen.';
    }

    const counts = getCategoryCounts(blocks);
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0]?.[0];
    const missing = CATEGORY_DEFINITIONS.filter(category => counts[category.name] === 0).map(category => category.name);

    if (missing.length === 0) {
        return 'Ausgewogene Übung. Alle Bereiche sind abgedeckt.';
    }

    if (dominant === 'Kognition' && (counts['Achtsamkeit'] ?? 0) === 0) {
        return 'Tipp: Füge eine Atemübung hinzu für mehr Körperbezug.';
    }

    if (blocks.length < 3) {
        return 'Tipp: Eine gute Übung hat mindestens 3 Blöcke.';
    }

    return `Tipp: Ergänze ${missing.join(', ')} für mehr Balance.`;
}

interface Props {
    blocks: ExerciseBlock[];
}

export default function ExerciseCompositionChart({ blocks }: Props) {
    const { width: screenWidth } = useWindowDimensions();
    const isCompact = screenWidth < 760;
    const totalBlocks = blocks.length;
    const tip = getTip(blocks);

    const { arcs, visibleCategories } = useMemo(() => {
        const counts = getCategoryCounts(blocks);
        const data = buildCategoryData(counts);
        const hasAny = data.some(item => item.value > 0);
        const effectiveData = hasAny ? data : data.map(item => ({ ...item, value: 1 }));
        const isEmpty = !hasAny;

        const size = 180;
        const radius = size / 2;
        const innerRadius = radius * 0.6;

        const pie = d3.pie<CategorySlice>()
            .value(item => item.value)
            .padAngle(0.06)
            .sortValues(null);

        const arc = d3.arc<d3.PieArcDatum<CategorySlice>>()
            .outerRadius(radius - 2)
            .innerRadius(innerRadius)
            .cornerRadius(6);

        const pieData = pie(effectiveData);
        const nextArcs = pieData.map(segment => ({
            path: arc(segment) ?? '',
            color: isEmpty ? 'rgba(255,255,255,0.08)' : segment.data.color,
            name: segment.data.name,
            value: segment.data.value,
            isEmpty,
        }));

        return { arcs: nextArcs, visibleCategories: data };
    }, [blocks]);

    const size = 180;
    const centerX = size / 2;
    const centerY = size / 2;

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
            <View style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                        Übungs-Balance
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.3 }}>
                        Therapeutische Zusammensetzung
                    </Text>
                </View>
                <View style={{ backgroundColor: 'rgba(19,115,134,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(19,115,134,0.4)' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#22D3EE' }}>
                        {totalBlocks} {totalBlocks === 1 ? 'Block' : 'Blöcke'}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: isCompact ? 'column' : 'row', alignItems: isCompact ? 'stretch' : 'center', paddingHorizontal: 16, paddingBottom: 20, gap: 16 }}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        <G x={centerX} y={centerY}>
                            {arcs.map((segment, index) => (
                                <Path
                                    key={index}
                                    d={segment.path}
                                    fill={segment.isEmpty ? 'rgba(255,255,255,0.07)' : segment.color}
                                    opacity={segment.isEmpty ? 1 : 0.92}
                                />
                            ))}
                        </G>
                        <Circle cx={centerX} cy={centerY} r={28} fill="rgba(255,255,255,0.04)" />
                        <SvgText
                            x={centerX}
                            y={centerY - 7}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize={26}
                            fontWeight="900"
                        >
                            {totalBlocks}
                        </SvgText>
                        <SvgText
                            x={centerX}
                            y={centerY + 11}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.35)"
                            fontSize={8}
                            fontWeight="700"
                        >
                            {totalBlocks === 1 ? 'BLOCK' : 'BLÖCKE'}
                        </SvgText>
                    </Svg>
                </View>

                <View style={{ flex: 1, gap: 10 }}>
                    {visibleCategories.map(category => {
                        const count = category.value;
                        const pct = totalBlocks > 0 ? Math.round((count / totalBlocks) * 100) : 0;
                        const active = count > 0;

                        return (
                            <View key={category.name}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? category.color : 'rgba(255,255,255,0.12)' }} />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)' }}>
                                            {category.name}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: active ? category.color : 'rgba(255,255,255,0.2)', minWidth: 30, textAlign: 'right' }}>
                                        {active ? `${pct}%` : '—'}
                                    </Text>
                                </View>
                                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                                    {active ? (
                                        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: category.color, borderRadius: 2, opacity: 0.85 }} />
                                    ) : null}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

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
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#22D3EE' }}>TIP</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 17, fontWeight: '500' }}>
                    {tip.replace('Tipp: ', '')}
                </Text>
            </View>
        </View>
    );
}
