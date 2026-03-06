import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ExerciseBlock, BlockCondition } from '../../types';
import { GitBranch, X, ChevronDown } from 'lucide-react-native';

interface Props {
    block: ExerciseBlock;
    allBlocks: ExerciseBlock[];
    onUpdate: (condition: BlockCondition | undefined) => void;
}

const OPERATORS = [
    { op: '>=', label: '≥ mindestens' },
    { op: '<=', label: '≤ höchstens' },
    { op: '==', label: '= genau' },
    { op: '>', label: '> größer als' },
    { op: '<', label: '< kleiner als' },
    { op: '!=', label: '≠ nicht gleich' },
] as const;

const SCALE_VALUES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// Blocks that can serve as a condition source
const CONDITION_CAPABLE_TYPES = ['scale', 'choice'];

export function BlockConditionEditor({ block, allBlocks, onUpdate }: Props) {
    const condition = block.condition;

    // Only blocks above the current one (in order) can be sources
    const myIndex = allBlocks.findIndex(b => b.id === block.id);
    const eligibleSources = allBlocks
        .slice(0, myIndex)
        .filter(b => CONDITION_CAPABLE_TYPES.includes(b.type));

    const sourceBlock = eligibleSources.find(b => b.id === condition?.sourceBlockId);

    const setSource = (sourceId: string) => {
        onUpdate({
            sourceBlockId: sourceId,
            operator: '>=',
            value: sourceBlock?.type === 'choice' ? (sourceBlock.options?.[0] ?? '') : '7',
        });
    };

    const removeCondition = () => onUpdate(undefined);

    // UI: no eligible sources → show info text
    if (eligibleSources.length === 0) {
        return (
            <View style={{ marginTop: 16, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' }}>
                <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', textAlign: 'center' }}>
                    Füge zuerst eine Skala- oder Auswahl-Block vor diesem Block ein, um eine Bedingung zu konfigurieren.
                </Text>
            </View>
        );
    }

    // No condition set yet → CTA button
    if (!condition) {
        return (
            <View style={{ marginTop: 16 }}>
                <TouchableOpacity
                    onPress={() => setSource(eligibleSources[0].id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#86EFAC', borderStyle: 'dashed' }}
                >
                    <GitBranch size={16} color='#16A34A' />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#16A34A' }}>Bedingte Anzeige aktivieren</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ marginTop: 16, backgroundColor: '#F0FDF4', borderRadius: 18, borderWidth: 1.5, borderColor: '#86EFAC', padding: 16 }}>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <GitBranch size={14} color='#16A34A' />
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#16A34A', textTransform: 'uppercase', letterSpacing: 1 }}>Bedingte Anzeige</Text>
                </View>
                <TouchableOpacity onPress={removeCondition} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={16} color='#94A3B8' />
                </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '600', marginBottom: 8 }}>Block wird nur angezeigt, wenn:</Text>

            {/* Source block selector */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Referenzblock</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {eligibleSources.map((src, idx) => {
                        const isActive = condition.sourceBlockId === src.id;
                        const label = src.content ? (src.content.slice(0, 28) + (src.content.length > 28 ? '…' : '')) : `Block ${allBlocks.findIndex(b => b.id === src.id) + 1}`;
                        return (
                            <TouchableOpacity
                                key={src.id}
                                onPress={() => setSource(src.id)}
                                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: isActive ? '#16A34A' : 'white', borderWidth: 1.5, borderColor: isActive ? '#16A34A' : '#D1D5DB' }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? 'white' : '#374151' }}>{label}</Text>
                                <Text style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.7)' : '#9CA3AF', fontWeight: '500' }}>{src.type === 'scale' ? 'Skala' : 'Auswahl'}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Operator selector */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Operator</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {OPERATORS.map(({ op, label }) => {
                        const isActive = condition.operator === op;
                        return (
                            <TouchableOpacity
                                key={op}
                                onPress={() => onUpdate({ ...condition, operator: op as BlockCondition['operator'] })}
                                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: isActive ? '#15803D' : 'white', borderWidth: 1.5, borderColor: isActive ? '#15803D' : '#D1D5DB' }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? 'white' : '#374151' }}>{label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Value selector */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Wert</Text>
            {sourceBlock?.type === 'scale' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {SCALE_VALUES.map(v => {
                            const isActive = condition.value === v;
                            return (
                                <TouchableOpacity
                                    key={v}
                                    onPress={() => onUpdate({ ...condition, value: v })}
                                    style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isActive ? '#16A34A' : 'white', borderWidth: 1.5, borderColor: isActive ? '#16A34A' : '#D1D5DB' }}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? 'white' : '#374151' }}>{v}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(sourceBlock?.options ?? []).map(opt => {
                            const isActive = condition.value === opt;
                            return (
                                <TouchableOpacity
                                    key={opt}
                                    onPress={() => onUpdate({ ...condition, value: opt })}
                                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: isActive ? '#16A34A' : 'white', borderWidth: 1.5, borderColor: isActive ? '#16A34A' : '#D1D5DB' }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? 'white' : '#374151' }}>{opt}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}

            {/* Summary chip */}
            <View style={{ marginTop: 14, backgroundColor: 'rgba(22,163,74,0.08)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700', textAlign: 'center' }}>
                    🔀 Dieser Block erscheint nur, wenn ein vorheriger Block{' '}
                    <Text style={{ fontWeight: '900' }}>
                        {OPERATORS.find(o => o.op === condition.operator)?.label} {condition.value}
                    </Text>
                </Text>
            </View>
        </View>
    );
}
