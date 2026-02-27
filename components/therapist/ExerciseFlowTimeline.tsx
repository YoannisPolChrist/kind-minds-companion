/**
 * ExerciseFlowTimeline
 *
 * A horizontal node-link diagram that maps each ExerciseBlock to a node,
 * positioned using D3's scaleBand, connected by smooth cubic Bezier paths
 * computed with d3.linkHorizontal. Category color-codes each node.
 *
 * The timeline updates live as blocks change and uses React Native's
 * Animated API for staggered entrance animations.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, Animated, ScrollView } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as d3 from 'd3';
import { ExerciseBlock, ExerciseBlockType } from './ExerciseBuilder';

// ─── Category Palette ─────────────────────────────────────────────────────────

const BLOCK_META: Record<ExerciseBlockType, { color: string; icon: string; short: string }> = {
    reflection: { color: '#3B82F6', icon: '✍️', short: 'Refl.' },
    info: { color: '#14B8A6', icon: '📖', short: 'Info' },
    homework: { color: '#C09D59', icon: '📝', short: 'ABC' },
    scale: { color: '#F59E0B', icon: '📊', short: 'Skala' },
    choice: { color: '#6366F1', icon: '🔘', short: 'Wahl' },
    checklist: { color: '#10B981', icon: '✅', short: 'Liste' },
    gratitude: { color: '#EC4899', icon: '🙏', short: 'Dank.' },
    breathing: { color: '#137386', icon: '🌬️', short: 'Atem' },
    timer: { color: '#8B5CF6', icon: '⏱️', short: 'Timer' },
    media: { color: '#F43F5E', icon: '🖼️', short: 'Media' },
};

// ─── Node Size Constants ───────────────────────────────────────────────────────

const NODE_R = 22;
const H = 80;    // SVG height
const PAD = 16;  // horizontal padding each side

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { blocks: ExerciseBlock[]; }

export default function ExerciseFlowTimeline({ blocks }: Props) {
    // Animated value for entrance fade-in
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        // Re-trigger subtle pop animation whenever blocks change
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
        ]).start(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
            ]).start();
        });
    }, [blocks.length]);

    // --- D3 Layout ---
    const { nodes, links, svgWidth } = useMemo(() => {
        if (blocks.length === 0) return { nodes: [], links: [], svgWidth: 100 };

        // Minimum width so nodes don't overlap; each needs 2*NODE_R + some spacing
        const minNodeSpacing = (NODE_R * 2) + 28;
        const totalWidth = Math.max(300, PAD * 2 + blocks.length * minNodeSpacing);

        // D3 band scale maps block index → x center
        const xScale = d3.scaleBand()
            .domain(blocks.map((_, i) => String(i)))
            .range([PAD + NODE_R, totalWidth - PAD - NODE_R])
            .padding(0);

        const CY = H / 2;

        const nodes = blocks.map((b, i) => ({
            x: (xScale(String(i)) ?? 0) + xScale.bandwidth() / 2,
            y: CY,
            block: b,
            meta: BLOCK_META[b.type],
            index: i,
        }));

        // D3 horizontal link generator
        const linkGen = d3.linkHorizontal<any, any>()
            .x((d: any) => d.x)
            .y((d: any) => d.y);

        const links = nodes.slice(0, -1).map((src, i) => ({
            path: linkGen({ source: src, target: nodes[i + 1] }) ?? '',
            color: src.meta.color,
        }));

        return { nodes, links, svgWidth: totalWidth };
    }, [blocks]);

    if (blocks.length === 0) return null;

    const isScrollable = svgWidth > 340;

    return (
        <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            marginBottom: 16,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 3,
        }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#243842', letterSpacing: 0.2 }}>Übungs-Flow</Text>
                    <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '500' }}>Reihenfolge der Blöcke</Text>
                </View>
                {isScrollable && (
                    <Text style={{ fontSize: 9, color: '#D1D5DB', fontWeight: '600' }}>← scrollen →</Text>
                )}
            </View>

            {/* Horizontally Scrollable Timeline SVG */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                <Svg width={svgWidth} height={H}>
                    {/* Connection Paths */}
                    {links.map((link, i) => (
                        <Path
                            key={`link-${i}`}
                            d={link.path}
                            fill="none"
                            stroke={link.color}
                            strokeWidth={2.5}
                            strokeOpacity={0.35}
                            strokeDasharray="4 4"
                        />
                    ))}

                    {/* Nodes */}
                    {nodes.map((node, i) => (
                        <G key={`node-${node.block.id}`} x={node.x} y={node.y}>
                            {/* Halo shadow */}
                            <Circle r={NODE_R + 5} fill={node.meta.color} opacity={0.1} />
                            {/* Main circle */}
                            <Circle r={NODE_R} fill={node.meta.color} />
                            {/* Index badge */}
                            <Circle cx={NODE_R - 2} cy={-NODE_R + 2} r={9} fill="#FFFFFF" />
                            <SvgText
                                x={NODE_R - 2}
                                y={-NODE_R + 6}
                                textAnchor="middle"
                                fill={node.meta.color}
                                fontSize={9}
                                fontWeight="800"
                            >
                                {i + 1}
                            </SvgText>
                            {/* Icon emoji */}
                            <SvgText
                                x={0}
                                y={5}
                                textAnchor="middle"
                                fontSize={18}
                            >
                                {node.meta.icon}
                            </SvgText>
                        </G>
                    ))}
                </Svg>
            </ScrollView>

            {/* Labels row below */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
                <View style={{ flexDirection: 'row', paddingHorizontal: 4, minWidth: svgWidth }}>
                    {nodes.map((node) => (
                        <View key={`label-${node.block.id}`}
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                minWidth: 60,
                                maxWidth: 80,
                            }}>
                            <Text style={{
                                fontSize: 9,
                                fontWeight: '700',
                                color: node.meta.color,
                                textAlign: 'center',
                            }} numberOfLines={1}>
                                {node.meta.short}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </Animated.View>
    );
}
