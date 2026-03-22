import React from 'react';
import { Dimensions, Text } from 'react-native';
import { MotiView } from 'moti';
import { BarChart, LineChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { CHART_PALETTE } from '../blocks/exerciseRegistry';

interface BuilderChartPreviewProps {
    blockType: 'spider_chart' | 'bar_chart' | 'pie_chart' | 'line_chart';
    options?: string[];
}

const chartWidth = Dimensions.get('window').width > 800 ? 400 : Dimensions.get('window').width - 120;

export default function BuilderChartPreview({ blockType, options = [] }: BuilderChartPreviewProps) {
    return (
        <MotiView
            from={{ opacity: 0, scale: 0.95, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 150 }}
            style={{ marginTop: 24, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E8E6E1', alignItems: 'center' }}
        >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7C85', marginBottom: 12 }}>VORSCHAU</Text>

            {blockType === 'spider_chart' ? (
                <ProgressChart
                    data={{
                        labels: options.map((option) => option.split(':')[0] || '?'),
                        data: options.map((option) => {
                            const value = parseFloat(option.split(':')[1] || '0');
                            return Number.isNaN(value) ? 0 : Math.min(Math.max(value / 100, 0), 1);
                        }),
                        colors: options.map((option, index) => option.split(':')[2] || CHART_PALETTE[index % CHART_PALETTE.length]),
                    }}
                    width={chartWidth}
                    height={220}
                    strokeWidth={12}
                    radius={32}
                    hideLegend={false}
                    chartConfig={{
                        backgroundColor: 'transparent',
                        backgroundGradientFrom: '#F8FAFC',
                        backgroundGradientTo: '#F1F5F9',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                        style: { borderRadius: 16 },
                        propsForLabels: { fontSize: 10, fontWeight: 'bold' },
                    }}
                    style={{ marginVertical: 8, borderRadius: 16 }}
                />
            ) : null}

            {blockType === 'bar_chart' ? (
                <BarChart
                    data={{
                        labels: options.map((option) => option.split(':')[0] || '?'),
                        datasets: [{
                            data: options.map((option) => parseFloat(option.split(':')[1] || '0') || 0),
                            colors: options.map((option, index) => {
                                const color = option.split(':')[2] || CHART_PALETTE[index % CHART_PALETTE.length];
                                return () => color;
                            }),
                        }],
                    }}
                    width={chartWidth}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    fromZero
                    withCustomBarColorFromData={true}
                    flatColor={true}
                    chartConfig={{
                        backgroundColor: 'transparent',
                        backgroundGradientFrom: '#F8FAFC',
                        backgroundGradientTo: '#F1F5F9',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                        barPercentage: 0.6,
                        propsForLabels: { fontSize: 10, fontWeight: 'bold' },
                    }}
                    style={{ marginVertical: 8, borderRadius: 16 }}
                />
            ) : null}

            {blockType === 'pie_chart' ? (
                <PieChart
                    data={options.map((option, index) => ({
                        name: option.split(':')[0] || '?',
                        population: parseFloat(option.split(':')[1] || '0') || 0,
                        color: option.split(':')[2] || CHART_PALETTE[index % CHART_PALETTE.length],
                        legendFontColor: '#6B7C85',
                        legendFontSize: 12,
                    }))}
                    width={chartWidth}
                    height={220}
                    chartConfig={{
                        backgroundColor: 'transparent',
                        backgroundGradientFrom: '#F8FAFC',
                        backgroundGradientTo: '#F1F5F9',
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                    style={{ marginVertical: 8, borderRadius: 16 }}
                />
            ) : null}

            {blockType === 'line_chart' ? (
                <LineChart
                    data={{
                        labels: options.map((option) => option.split(':')[0] || '?'),
                        datasets: [{ data: options.map((option) => parseFloat(option.split(':')[1] || '0') || 0) }],
                    }}
                    width={chartWidth}
                    height={220}
                    chartConfig={{
                        backgroundColor: 'transparent',
                        backgroundGradientFrom: '#F8FAFC',
                        backgroundGradientTo: '#F1F5F9',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                        propsForDots: {
                            r: '6',
                            strokeWidth: '2',
                            stroke: '#059669',
                        },
                    }}
                    bezier
                    style={{ marginVertical: 8, borderRadius: 16 }}
                />
            ) : null}
        </MotiView>
    );
}
