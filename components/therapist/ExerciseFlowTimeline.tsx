import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import * as d3 from 'd3';
import { ExerciseBlock, ExerciseBlockType } from './blocks/exerciseRegistry';

const BLOCK_META: Record<ExerciseBlockType, { color: string; icon: string; short: string }> = {
    reflection: { color: '#4E7E82', icon: 'RF', short: 'Refl.' },
    info: { color: '#14B8A6', icon: 'IN', short: 'Info' },
    homework: { color: '#B08C57', icon: 'ABC', short: 'ABC' },
    scale: { color: '#F59E0B', icon: '1-10', short: 'Skala' },
    choice: { color: '#6366F1', icon: 'AW', short: 'Wahl' },
    checklist: { color: '#788E76', icon: 'CL', short: 'Liste' },
    gratitude: { color: '#EC4899', icon: 'DG', short: 'Dank.' },
    breathing: { color: '#2D666B', icon: 'AT', short: 'Atem' },
    timer: { color: '#8B5CF6', icon: 'TM', short: 'Timer' },
    media: { color: '#F43F5E', icon: 'MD', short: 'Medien' },
    video: { color: '#E11D48', icon: 'VD', short: 'Video' },
    spider_chart: { color: '#F97316', icon: 'NZ', short: 'Netz' },
    bar_chart: { color: '#4E7E82', icon: 'BK', short: 'Balken' },
    pie_chart: { color: '#8B5CF6', icon: 'KR', short: 'Kreis' },
    line_chart: { color: '#788E76', icon: 'LN', short: 'Linie' },
    donut_progress: { color: '#8A6A53', icon: 'DN', short: 'Donut' },
    stacked_bar_chart: { color: '#6E7F86', icon: 'SB', short: 'Stack' },
    comparison_bar_chart: { color: '#4E7E82', icon: 'VG', short: 'Vergl.' },
    heatmap_grid: { color: '#B08C57', icon: 'HM', short: 'Heat' },
    range_chart: { color: '#788E76', icon: 'RG', short: 'Range' },
    bubble_chart: { color: '#A37E68', icon: 'BB', short: 'Bubble' },
};

const NODE_R = 22;
const HEIGHT = 80;
const PAD = 16;

interface Props {
    blocks: ExerciseBlock[];
}

export default function ExerciseFlowTimeline({ blocks }: Props) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
        ]).start(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
            ]).start();
        });
    }, [blocks.length, fadeAnim, scaleAnim]);

    const { links, nodes, svgWidth } = useMemo(() => {
        if (blocks.length === 0) {
            return { nodes: [], links: [], svgWidth: 100 };
        }

        const minNodeSpacing = NODE_R * 2 + 28;
        const totalWidth = Math.max(300, PAD * 2 + blocks.length * minNodeSpacing);
        const xScale = d3
            .scaleBand()
            .domain(blocks.map((_, i) => String(i)))
            .range([PAD + NODE_R, totalWidth - PAD - NODE_R])
            .padding(0);
        const centerY = HEIGHT / 2;

        const nextNodes = blocks.map((block, index) => ({
            x: (xScale(String(index)) ?? 0) + xScale.bandwidth() / 2,
            y: centerY,
            block,
            meta: BLOCK_META[block.type],
            index,
        }));

        const linkGen = d3
            .linkHorizontal<any, any>()
            .x((point: any) => point.x)
            .y((point: any) => point.y);

        const nextLinks = nextNodes.slice(0, -1).map((source, index) => ({
            path: linkGen({ source, target: nextNodes[index + 1] }) ?? '',
            color: source.meta.color,
        }));

        return { nodes: nextNodes, links: nextLinks, svgWidth: totalWidth };
    }, [blocks]);

    if (blocks.length === 0) {
        return null;
    }

    const isScrollable = svgWidth > 340;

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#E7E0D4',
                marginBottom: 16,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 3,
            }}
        >
            <View
                style={{
                    paddingHorizontal: 18,
                    paddingTop: 14,
                    paddingBottom: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2528', letterSpacing: 0.2 }}>
                        Übungs-Flow
                    </Text>
                    <Text style={{ fontSize: 10, color: '#8B938E', fontWeight: '500' }}>
                        Reihenfolge der Blöcke
                    </Text>
                </View>
                {isScrollable ? (
                    <Text style={{ fontSize: 9, color: '#D1D5DB', fontWeight: '600' }}>
                        {'<- scrollen ->'}
                    </Text>
                ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                <Svg width={svgWidth} height={HEIGHT}>
                    {links.map((link, index) => (
                        <Path
                            key={`link-${index}`}
                            d={link.path}
                            fill="none"
                            stroke={link.color}
                            strokeWidth={2.5}
                            strokeOpacity={0.35}
                            strokeDasharray="4 4"
                        />
                    ))}

                    {nodes.map((node, index) => (
                        <G key={`node-${node.block.id}`} x={node.x} y={node.y}>
                            <Circle r={NODE_R + 5} fill={node.meta.color} opacity={0.1} />
                            <Circle r={NODE_R} fill={node.meta.color} />
                            <Circle cx={NODE_R - 2} cy={-NODE_R + 2} r={9} fill="#FFFFFF" />
                            <SvgText
                                x={NODE_R - 2}
                                y={-NODE_R + 6}
                                textAnchor="middle"
                                fill={node.meta.color}
                                fontSize={9}
                                fontWeight="800"
                            >
                                {index + 1}
                            </SvgText>
                            <SvgText x={0} y={4} textAnchor="middle" fontSize={10} fontWeight="800" fill="#FFFFFF">
                                {node.meta.icon}
                            </SvgText>
                        </G>
                    ))}
                </Svg>
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
                <View style={{ flexDirection: 'row', paddingHorizontal: 4, minWidth: svgWidth }}>
                    {nodes.map((node) => (
                        <View
                            key={`label-${node.block.id}`}
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                minWidth: 60,
                                maxWidth: 80,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 9,
                                    fontWeight: '700',
                                    color: node.meta.color,
                                    textAlign: 'center',
                                }}
                                numberOfLines={1}
                            >
                                {node.meta.short}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </Animated.View>
    );
}
