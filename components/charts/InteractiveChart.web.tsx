/**
 * InteractiveChart.web.tsx
 * Uses @nivo for beautiful, interactive charts on the Web.
 */
import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { MotiView } from 'moti';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveRadar } from '@nivo/radar';
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

    const { isDark } = useTheme();

    const nivoTheme = {
        text: { fontSize: 12, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
        axis: {
            ticks: { text: { fill: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', fontSize: 11 } },
            legend: { text: { fill: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' } },
        },
        grid: { line: { stroke: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0', strokeWidth: 1 } },
        tooltip: {
            container: {
                background: isDark ? '#1E293B' : '#FFFFFF',
                color: isDark ? '#F1F5F9' : '#0F172A',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
            },
        },
    };

    const renderChart = () => {
        if (data.length === 0) {
            return (
                <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 14 }}>Keine Daten vorhanden</Text>
                </View>
            );
        }

        if (block.type === 'bar_chart') {
            const barData = data.map(d => ({ label: d.label, wert: d.currentVal, color: d.color }));
            return (
                <div style={{ height: 260 }}>
                    <ResponsiveBar
                        data={barData} keys={['wert']} indexBy="label"
                        margin={{ top: 20, right: 20, bottom: 60, left: 40 }}
                        padding={0.3} valueScale={{ type: 'linear' }} indexScale={{ type: 'band', round: true }}
                        colors={({ data: d }: any) => d.color}
                        borderRadius={6} borderWidth={0}
                        axisBottom={{ tickSize: 0, tickPadding: 12, tickRotation: data.length > 5 ? -30 : 0 }}
                        axisLeft={{ tickSize: 0, tickPadding: 8 }}
                        gridYValues={5}
                        enableLabel={false}
                        animate={true}
                        theme={nivoTheme}
                    />
                </div>
            );
        }

        if (block.type === 'pie_chart') {
            const pieData = data.map(d => ({ id: d.label, label: d.label, value: d.currentVal, color: d.color }));
            return (
                <div style={{ height: 280 }}>
                    <ResponsivePie
                        data={pieData} margin={{ top: 20, right: 80, bottom: 60, left: 80 }}
                        innerRadius={0.5} padAngle={2} cornerRadius={8}
                        colors={({ data: d }: any) => d.color}
                        enableArcLinkLabels={true} arcLinkLabelsSkipAngle={10}
                        arcLinkLabelsTextColor={isDark ? 'rgba(255,255,255,0.7)' : '#334155'}
                        arcLinkLabelsColor={{ from: 'color' }}
                        arcLabelsSkipAngle={20}
                        arcLabelsTextColor="#ffffff"
                        legends={[{ anchor: 'bottom', direction: 'row', translateY: 56, itemWidth: 100, itemHeight: 18, itemTextColor: isDark ? 'rgba(255,255,255,0.6)' : '#64748B', symbolSize: 12, symbolShape: 'circle' }]}
                        animate={true}
                        theme={nivoTheme}
                    />
                </div>
            );
        }

        if (block.type === 'line_chart') {
            const lineData = [{
                id: block.content || 'Werte',
                color: '#137386',
                data: data.map(d => ({ x: d.label, y: d.currentVal })),
            }];
            return (
                <div style={{ height: 260 }}>
                    <ResponsiveLine
                        data={lineData} margin={{ top: 20, right: 20, bottom: 60, left: 40 }}
                        xScale={{ type: 'point' }} yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                        axisBottom={{ tickSize: 0, tickPadding: 12, tickRotation: data.length > 5 ? -30 : 0 }}
                        axisLeft={{ tickSize: 0, tickPadding: 8 }}
                        gridYValues={5}
                        curve="monotoneX"
                        colors={['#137386']}
                        lineWidth={3}
                        pointSize={10}
                        pointColor="#ffffff"
                        pointBorderWidth={2}
                        pointBorderColor={{ from: 'serieColor' }}
                        enablePointLabel={false}
                        enableSlices="x"
                        animate={true}
                        theme={nivoTheme}
                    />
                </div>
            );
        }

        if (block.type === 'spider_chart') {
            // Radar chart
            const radarData = [{ subject: 'Aktuell', ...Object.fromEntries(data.map(d => [d.label, d.currentVal])) }];
            const keys = data.map(d => d.label);
            // nivo radar: each key becomes an axis
            // We need to transform data differently for nivo radar:
            // radarData = [{ category: label, value: val }] per item
            const nivoRadarData = data.map(d => ({
                category: d.label,
                Wert: d.currentVal,
            }));

            return (
                <div style={{ height: 300 }}>
                    <ResponsiveRadar
                        data={nivoRadarData} keys={['Wert']} indexBy="category"
                        margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
                        valueFormat=">-.2f"
                        borderColor={{ from: 'color', modifiers: [] }}
                        gridLabelOffset={20}
                        dotSize={10} dotColor={{ theme: 'background' }} dotBorderWidth={2}
                        colors={['#137386']}
                        blendMode="normal"
                        motionConfig="wobbly"
                        theme={nivoTheme}
                        gridShape="circular"
                    />
                </div>
            );
        }

        return null;
    };

    return (
        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }} style={{ width: '100%' }}>
            {block.content ? (
                <Text style={{ fontSize: 16, color: '#2C3E50', marginBottom: 20, textAlign: 'center', fontWeight: '600' }}>
                    {block.content}
                </Text>
            ) : null}

            <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(30,41,59,0.3)' : '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15, marginBottom: 28, overflow: 'hidden' }}>
                {renderChart()}
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
                            value={currentValues[item.label] !== undefined ? String(currentValues[item.label]) : ''}
                            onChangeText={(t) => updateValue(item.label, t)}
                            placeholder={String(item.currentVal)}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : '#94A3B8'}
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, textAlign: 'center', fontWeight: '800', color: '#137386', minWidth: 70 } as any}
                        />
                    </MotiView>
                ))}
            </View>
        </MotiView>
    );
}
