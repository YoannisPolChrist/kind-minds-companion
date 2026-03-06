/**
 * InteractiveChart.native.tsx
 * Uses react-native-chart-kit for iOS & Android.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { ProgressChart, BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../contexts/ThemeContext';
import { ExerciseBlock } from '../../types';

const CHART_PALETTE = [
    '#137386', '#10B981', '#8B5CF6', '#F59E0B',
    '#EC4899', '#3B82F6', '#14B8A6', '#F97316',
];

interface InteractiveChartProps {
    block: ExerciseBlock;
    value: string;
    onChange: (v: string) => void;
}

export default function InteractiveChart({ block, value, onChange }: InteractiveChartProps) {
    const currentValues: Record<string, number> = (() => {
        try { return value ? JSON.parse(value) : {}; } catch { return {}; }
    })();

    const updateValue = (label: string, valStr: string) => {
        const next = { ...currentValues };
        const num = parseFloat(valStr);
        if (isNaN(num)) { delete next[label]; } else { next[label] = num; }
        onChange(JSON.stringify(next));
    };

    const data = (block.options ?? []).map((opt, i) => {
        const parts = opt.split(':');
        const label = parts[0] || `Option ${i + 1}`;
        const defaultVal = parseFloat(parts[1] || '0');
        const color = parts[2] || CHART_PALETTE[i % CHART_PALETTE.length];
        const currentVal = currentValues[label] !== undefined ? currentValues[label] : defaultVal;
        return { label, currentVal, color };
    });

    const { isDark, colors } = useTheme();
    const screenWidth = Dimensions.get('window').width - 80;

    return (
        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }} style={{ alignItems: 'center' }}>
            {block.content ? (
                <Text style={{ fontSize: 16, color: '#2C3E50', marginBottom: 20, textAlign: 'center', fontWeight: '600' }}>
                    {block.content}
                </Text>
            ) : null}

            <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(30,41,59,0.3)' : '#FFFFFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 2, marginBottom: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {block.type === 'spider_chart' && (
                    <ProgressChart
                        data={{ labels: data.map(d => d.label), data: data.map(d => Math.min(Math.max(d.currentVal / 100, 0), 1)), colors: data.map(d => d.color) }}
                        width={screenWidth} height={200} strokeWidth={12} radius={32} hideLegend={false}
                        chartConfig={{ backgroundColor: 'transparent', backgroundGradientFrom: isDark ? '#1e293b' : '#FFFFFF', backgroundGradientTo: isDark ? '#1e293b' : '#FFFFFF', backgroundGradientFromOpacity: 0, backgroundGradientToOpacity: 0, color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, labelColor: (opacity = 1) => isDark ? `rgba(255,255,255,0.6)` : `#64748B` }}
                        style={{ borderRadius: 16 }}
                    />
                )}
                {block.type === 'bar_chart' && (
                    <BarChart
                        data={{ labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.currentVal || 0), colors: data.map(d => () => d.color) }] }}
                        width={screenWidth} height={200} yAxisLabel="" yAxisSuffix="" fromZero withCustomBarColorFromData flatColor
                        chartConfig={{ backgroundColor: 'transparent', backgroundGradientFrom: isDark ? '#1e293b' : '#FFFFFF', backgroundGradientTo: isDark ? '#1e293b' : '#FFFFFF', backgroundGradientFromOpacity: 0, backgroundGradientToOpacity: 0, decimalPlaces: 0, color: (opacity = 1) => isDark ? `rgba(255,255,255,0.1)` : `rgba(0,0,0,0.05)`, labelColor: (opacity = 1) => isDark ? `rgba(255,255,255,0.6)` : `#64748B`, barPercentage: 0.5, propsForLabels: { fontSize: 10, fontWeight: '700' } }}
                        style={{ borderRadius: 16 }} showBarTops={false} withInnerLines={false}
                    />
                )}
                {block.type === 'pie_chart' && (
                    <PieChart
                        data={data.map(d => ({ name: d.label, population: d.currentVal || 0, color: d.color, legendFontColor: isDark ? 'rgba(255,255,255,0.7)' : '#64748B', legendFontSize: 11 }))}
                        width={screenWidth} height={200} accessor="population" backgroundColor="transparent" paddingLeft="0" center={[10, 0]} absolute
                        chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                    />
                )}
                {block.type === 'line_chart' && (
                    <LineChart
                        data={{ labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.currentVal || 0) }] }}
                        width={screenWidth} height={200} bezier withInnerLines={false}
                        chartConfig={{ backgroundColor: 'transparent', backgroundGradientFrom: isDark ? '#1e293b' : '#FFFFFF', backgroundGradientTo: isDark ? '#1e293b' : '#FFFFFF', backgroundGradientFromOpacity: 0, backgroundGradientToOpacity: 0, decimalPlaces: 0, color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, labelColor: (opacity = 1) => isDark ? `rgba(255,255,255,0.6)` : `#64748B`, propsForDots: { r: '5', strokeWidth: '2', stroke: '#059669' } }}
                        style={{ borderRadius: 16 }}
                    />
                )}
            </View>

            <View style={{ width: '100%', gap: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4, marginLeft: 4 }}>
                    Werte anpassen
                </Text>
                {data.map((item, i) => (
                    <MotiView key={i} from={{ opacity: 0, translateY: 4 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: i * 80 }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 14 }} />
                        <Text numberOfLines={1} style={{ flex: 1, fontWeight: '700', color: isDark ? 'rgba(255,255,255,0.8)' : '#334155', fontSize: 15 }}>
                            {item.label}
                        </Text>
                        <TextInput
                            keyboardType="numeric"
                            value={currentValues[item.label] !== undefined ? String(currentValues[item.label]) : ''}
                            onChangeText={(t) => updateValue(item.label, t)}
                            placeholder={String(item.currentVal)}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : '#94A3B8'}
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, textAlign: 'center', fontWeight: '800', color: '#137386', minWidth: 70 }}
                        />
                    </MotiView>
                ))}
            </View>
        </MotiView>
    );
}
