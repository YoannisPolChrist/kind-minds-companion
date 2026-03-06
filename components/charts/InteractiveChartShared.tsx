import React, { useMemo, useState } from 'react';
import { Text, TextInput, useWindowDimensions, View } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../contexts/ThemeContext';
import { ExerciseBlock } from '../../types';
import { parseExerciseChartData, withAlpha } from './chartData';
import { FlBarChart, FlDonutChart, FlLineAreaChart, FlRadarChart } from './flChartPrimitives';

interface InteractiveChartProps {
  block: ExerciseBlock;
  value: string;
  onChange: (value: string) => void;
}

export default function InteractiveChartShared({ block, value, onChange }: InteractiveChartProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const { isDark, colors } = useTheme();

  const currentValues: Record<string, number> = useMemo(() => {
    try {
      return value ? JSON.parse(value) : {};
    } catch {
      return {};
    }
  }, [value]);

  const data = useMemo(() => parseExerciseChartData(block.options, currentValues), [block.options, currentValues]);
  const chartWidth = Math.min(screenWidth - 88, 440);
  const activeDatum = data[Math.min(selectedIndex, Math.max(0, data.length - 1))];

  const updateValue = (label: string, nextValue: string) => {
    const next = { ...currentValues };
    const parsed = Number.parseFloat(nextValue);

    if (Number.isNaN(parsed)) {
      delete next[label];
    } else {
      next[label] = parsed;
    }

    onChange(JSON.stringify(next));
  };

  const renderChart = () => {
    if (data.length === 0) {
      return (
        <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSubtle, fontSize: 14 }}>Keine Daten vorhanden</Text>
        </View>
      );
    }

    if (block.type === 'spider_chart') {
      return (
        <FlRadarChart
          data={data}
          size={Math.min(chartWidth, 280)}
          maxValue={Math.max(100, ...data.map((item) => item.value))}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          textColor={colors.text}
          subtleTextColor={colors.textSubtle}
          gridColor={withAlpha(colors.textSubtle, 0.16)}
        />
      );
    }

    if (block.type === 'bar_chart') {
      const maxDataValue = Math.max(...data.map((item) => item.value), 1);
      return (
        <FlBarChart
          data={data.map((item) => ({
            ...item,
            secondaryValue: maxDataValue,
          }))}
          width={chartWidth}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          textColor={colors.text}
          subtleTextColor={colors.textSubtle}
          gridColor={withAlpha(colors.textSubtle, 0.16)}
        />
      );
    }

    if (block.type === 'pie_chart') {
      const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0));
      return (
        <FlDonutChart
          data={data}
          size={Math.min(chartWidth, 260)}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          centerLabel={activeDatum?.label ?? 'Verteilung'}
          centerValue={activeDatum ? `${Math.round((activeDatum.value / total) * 100)}%` : '0%'}
          showLegend
          textColor={colors.text}
          subtleTextColor={colors.textSubtle}
        />
      );
    }

    return (
      <FlLineAreaChart
        data={data}
        width={chartWidth}
        color={data[0]?.color ?? colors.primary}
        gradientColor={data[data.length - 1]?.color ?? colors.secondary}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        showAverageLine
        textColor={colors.text}
        subtleTextColor={colors.textSubtle}
        gridColor={withAlpha(colors.textSubtle, 0.16)}
      />
    );
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring' }}
      style={{ width: '100%' }}
    >
      {block.content ? (
        <Text
          style={{
            fontSize: 16,
            color: colors.text,
            marginBottom: 20,
            textAlign: 'center',
            fontWeight: '700',
          }}
        >
          {block.content}
        </Text>
      ) : null}

      <View
        style={{
          width: '100%',
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 3,
          marginBottom: 28,
          overflow: 'hidden',
        }}
      >
        {activeDatum ? (
          <View style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: colors.textSubtle, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                Aktiver Wert
              </Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>
                {activeDatum.label}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: withAlpha(activeDatum.color, 0.14),
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 14,
              }}
            >
              <Text style={{ color: activeDatum.color, fontSize: 14, fontWeight: '900' }}>
                {activeDatum.value}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ alignItems: 'center' }}>
          {renderChart()}
        </View>
      </View>

      <View style={{ width: '100%', gap: 12 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '800',
            color: colors.textSubtle,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginBottom: 4,
            marginLeft: 4,
          }}
        >
          Werte anpassen
        </Text>
        {data.map((item, index) => (
          <MotiView
            key={`${item.label}-${index}`}
            from={{ opacity: 0, translateY: 4 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: index * 80 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
              padding: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: selectedIndex === index
                ? withAlpha(item.color, 0.35)
                : isDark
                  ? 'rgba(255,255,255,0.05)'
                  : '#F1F5F9',
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 14 }} />
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 }}
              onPress={() => setSelectedIndex(index)}
            >
              {item.label}
            </Text>
            <TextInput
              keyboardType="numeric"
              value={currentValues[item.label] !== undefined ? String(currentValues[item.label]) : ''}
              onChangeText={(text) => updateValue(item.label, text)}
              onFocus={() => setSelectedIndex(index)}
              placeholder={String(item.value)}
              placeholderTextColor={withAlpha(colors.textSubtle, 0.7)}
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                textAlign: 'center',
                fontWeight: '800',
                color: item.color,
                minWidth: 70,
              }}
            />
          </MotiView>
        ))}
      </View>
    </MotiView>
  );
}
