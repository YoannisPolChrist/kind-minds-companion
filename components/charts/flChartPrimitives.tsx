import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import * as d3 from 'd3';
import { ChartDatum, clamp, DEFAULT_FL_CHART_PALETTE, formatChartNumber, withAlpha } from './chartData';

const DEFAULT_TEXT = '#1F2528';
const DEFAULT_SUBTLE = '#6F7472';
const DEFAULT_GRID = 'rgba(168, 176, 172, 0.18)';

interface BaseChartProps {
  textColor?: string;
  subtleTextColor?: string;
  gridColor?: string;
}

interface LineChartProps extends BaseChartProps {
  data: ChartDatum[];
  width: number;
  height?: number;
  color?: string;
  gradientColor?: string;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  minY?: number;
  maxY?: number;
  showAverageLine?: boolean;
  xLabelLimit?: number;
  formatTooltip?: (datum: ChartDatum) => string;
}

interface BarChartProps extends BaseChartProps {
  data: Array<ChartDatum & { secondaryValue?: number }>;
  width: number;
  height?: number;
  maxValue?: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  formatTooltip?: (datum: ChartDatum & { secondaryValue?: number }) => string;
}

interface DonutChartProps extends BaseChartProps {
  data: ChartDatum[];
  size?: number;
  strokeWidth?: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  centerLabel?: string;
  centerValue?: string;
  showLegend?: boolean;
}

interface ProgressRingsChartProps extends BaseChartProps {
  data: ChartDatum[];
  width: number;
  ringSize?: number;
  strokeWidth?: number;
  maxValue?: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
}

interface ComparisonBarChartProps extends BaseChartProps {
  data: Array<ChartDatum & { secondaryValue?: number }>;
  width: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
}

interface RadarChartProps extends BaseChartProps {
  data: ChartDatum[];
  size?: number;
  levels?: number;
  maxValue?: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
}

interface HeatmapGridChartProps extends BaseChartProps {
  data: ChartDatum[];
  width: number;
  columns?: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  maxValue?: number;
}

interface RangeChartProps extends BaseChartProps {
  data: ChartDatum[];
  width: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  maxValue?: number;
}

interface BubbleChartProps extends BaseChartProps {
  data: ChartDatum[];
  width: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  maxValue?: number;
}

function getTickValues(minValue: number, maxValue: number, count = 4) {
  if (minValue === maxValue) return [minValue];
  return d3.ticks(minValue, maxValue, count);
}

function buildSmoothPath(points: Array<{ x: number; y: number }>, closeY?: number) {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const only = points[0];
    return closeY === undefined ? `M ${only.x} ${only.y}` : `M ${only.x} ${only.y} L ${only.x} ${closeY}`;
  }

  const [first, ...rest] = points;
  let path = `M ${first.x} ${first.y}`;

  for (let index = 0; index < rest.length; index += 1) {
    const previous = points[index];
    const current = rest[index];
    const controlX = (previous.x + current.x) / 2;
    path += ` C ${controlX} ${previous.y}, ${controlX} ${current.y}, ${current.x} ${current.y}`;
  }

  if (closeY !== undefined) {
    const last = points[points.length - 1];
    path += ` L ${last.x} ${closeY} L ${first.x} ${closeY} Z`;
  }

  return path;
}

function truncateLabel(label: string, maxLength = 10) {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}...`;
}

function selectClosestIndex(
  x: number,
  positions: Array<{ x: number }>,
) {
  if (positions.length === 0) return 0;

  let closestIndex = 0;
  let closestDistance = Math.abs(positions[0].x - x);

  for (let index = 1; index < positions.length; index += 1) {
    const distance = Math.abs(positions[index].x - x);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }

  return closestIndex;
}

function gapForHit(barWidth: number) {
  return Math.max(8, barWidth * 0.3);
}

export function FlLineAreaChart({
  data,
  width,
  height = 220,
  color,
  gradientColor,
  selectedIndex,
  onSelectIndex,
  minY,
  maxY,
  showAverageLine = false,
  xLabelLimit = 6,
  formatTooltip,
  textColor = DEFAULT_TEXT,
  subtleTextColor = DEFAULT_SUBTLE,
  gridColor = DEFAULT_GRID,
}: LineChartProps) {
  const chartColor = color ?? data[0]?.color ?? DEFAULT_FL_CHART_PALETTE[0];
  const chartGradientColor = gradientColor ?? data[data.length - 1]?.color ?? chartColor;

  const metrics = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map((item) => item.value);
    const minValue = minY ?? Math.min(...values);
    const maxValue = maxY ?? Math.max(...values);
    const paddedMin = minValue === maxValue ? minValue - 1 : minValue - (Math.abs(minValue) * 0.1 + 0.3);
    const paddedMax = minValue === maxValue ? maxValue + 1 : maxValue + (Math.abs(maxValue) * 0.1 + 0.3);

    const padding = { top: 18, right: 14, bottom: 34, left: 34 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const yScale = d3.scaleLinear().domain([paddedMin, paddedMax]).range([padding.top + innerHeight, padding.top]);
    const xScale = d3.scaleLinear().domain([0, Math.max(1, data.length - 1)]).range([padding.left, padding.left + innerWidth]);

    const points = data.map((item, index) => ({
      ...item,
      x: xScale(index),
      y: yScale(item.value),
    }));

    return {
      padding,
      innerWidth,
      innerHeight,
      points,
      yScale,
      ticks: getTickValues(paddedMin, paddedMax),
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
    };
  }, [data, height, maxY, minY, width]);

  if (!metrics) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: subtleTextColor, fontSize: 13 }}>Keine Daten vorhanden</Text>
      </View>
    );
  }

  const activeIndex = clamp(selectedIndex ?? data.length - 1, 0, data.length - 1);
  const activePoint = metrics.points[activeIndex];
  const tooltip = formatTooltip?.(data[activeIndex]) ?? `${data[activeIndex].label}: ${formatChartNumber(data[activeIndex].value)}`;
  const tooltipWidth = Math.max(72, tooltip.length * 6.3);
  const tooltipX = clamp(
    activePoint.x - tooltipWidth / 2,
    metrics.padding.left,
    width - metrics.padding.right - tooltipWidth,
  );
  const averageY = metrics.yScale(metrics.average);
  const xLabelStep = Math.max(1, Math.ceil(data.length / xLabelLimit));

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="line-area-fill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={withAlpha(chartColor, 0.34)} />
          <Stop offset="1" stopColor={withAlpha(chartGradientColor, 0)} />
        </LinearGradient>
        <LinearGradient id="line-area-stroke" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={chartColor} />
          <Stop offset="1" stopColor={chartGradientColor} />
        </LinearGradient>
      </Defs>

      {metrics.ticks.map((tick) => {
        const y = metrics.yScale(tick);
        return (
          <G key={`tick-${tick}`}>
            <Line
              x1={metrics.padding.left}
              x2={width - metrics.padding.right}
              y1={y}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
            />
            <SvgText
              x={metrics.padding.left - 6}
              y={y + 4}
              textAnchor="end"
              fill={subtleTextColor}
              fontSize={10}
              fontWeight="700"
            >
              {formatChartNumber(tick)}
            </SvgText>
          </G>
        );
      })}

      {showAverageLine ? (
        <Line
          x1={metrics.padding.left}
          x2={width - metrics.padding.right}
          y1={averageY}
          y2={averageY}
          stroke={withAlpha(chartGradientColor, 0.55)}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      ) : null}

      <Path
        d={buildSmoothPath(metrics.points, height - metrics.padding.bottom)}
        fill="url(#line-area-fill)"
      />
      <Path
        d={buildSmoothPath(metrics.points)}
        fill="none"
        stroke="url(#line-area-stroke)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {metrics.points.map((point, index) => {
        const isActive = index === activeIndex;
        return (
          <G key={`${point.label}-${index}`}>
            <Circle cx={point.x} cy={point.y} r={isActive ? 10 : 7} fill={withAlpha(point.color, isActive ? 0.24 : 0.16)} />
            <Circle cx={point.x} cy={point.y} r={isActive ? 5 : 4} fill={point.color} />
            <Circle cx={point.x} cy={point.y} r={2} fill="#FFFFFF" />
          </G>
        );
      })}

      <Line
        x1={activePoint.x}
        x2={activePoint.x}
        y1={metrics.padding.top}
        y2={height - metrics.padding.bottom}
        stroke={withAlpha(chartGradientColor, 0.22)}
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      <G x={tooltipX} y={Math.max(8, activePoint.y - 40)}>
        <Rect
          width={tooltipWidth}
          height={24}
          rx={12}
          fill={withAlpha(textColor, 0.94)}
        />
        <SvgText
          x={tooltipWidth / 2}
          y={16}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize={10}
          fontWeight="700"
        >
          {tooltip}
        </SvgText>
      </G>

      {metrics.points.map((point, index) => {
        if (index % xLabelStep !== 0 && index !== data.length - 1) return null;
        return (
          <SvgText
            key={`label-${point.label}-${index}`}
            x={point.x}
            y={height - 8}
            textAnchor="middle"
            fill={subtleTextColor}
            fontSize={10}
            fontWeight="700"
          >
            {truncateLabel(point.label, 8)}
          </SvgText>
        );
      })}

      {onSelectIndex ? (
        <Rect
          x={metrics.padding.left}
          y={metrics.padding.top}
          width={metrics.innerWidth}
          height={metrics.innerHeight}
          fill="transparent"
          onPress={(event: any) => {
            const nextIndex = selectClosestIndex(event.nativeEvent.locationX, metrics.points);
            onSelectIndex(nextIndex);
          }}
        />
      ) : null}
    </Svg>
  );
}

export function FlBarChart({
  data,
  width,
  height = 220,
  maxValue,
  selectedIndex,
  onSelectIndex,
  formatTooltip,
  textColor = DEFAULT_TEXT,
  subtleTextColor = DEFAULT_SUBTLE,
  gridColor = DEFAULT_GRID,
}: BarChartProps) {
  const metrics = useMemo(() => {
    if (data.length === 0) return null;

    const maxDataValue = Math.max(...data.map((item) => Math.max(item.value, item.secondaryValue ?? item.value)));
    const safeMaxValue = maxValue ?? Math.max(1, maxDataValue);
    const padding = { top: 24, right: 10, bottom: 36, left: 30 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const barWidth = innerWidth / Math.max(data.length, 1) * 0.56;
    const gap = innerWidth / Math.max(data.length, 1) * 0.44;
    const yScale = d3.scaleLinear().domain([0, safeMaxValue]).range([padding.top + innerHeight, padding.top]);

    return {
      padding,
      innerHeight,
      yScale,
      ticks: getTickValues(0, safeMaxValue),
      positions: data.map((item, index) => {
        const x = padding.left + index * (barWidth + gap) + gap / 2;
        return {
          ...item,
          x,
          barWidth,
          y: yScale(item.value),
          height: padding.top + innerHeight - yScale(item.value),
          secondaryY: yScale(item.secondaryValue ?? safeMaxValue),
          secondaryHeight: padding.top + innerHeight - yScale(item.secondaryValue ?? safeMaxValue),
        };
      }),
    };
  }, [data, height, maxValue, width]);

  if (!metrics) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: subtleTextColor, fontSize: 13 }}>Keine Daten vorhanden</Text>
      </View>
    );
  }

  const activeIndex = clamp(selectedIndex ?? 0, 0, data.length - 1);
  const activeBar = metrics.positions[activeIndex];
  const tooltip = formatTooltip?.(data[activeIndex]) ?? `${data[activeIndex].label}: ${formatChartNumber(data[activeIndex].value)}`;
  const tooltipWidth = Math.max(74, tooltip.length * 6.2);
  const tooltipX = clamp(
    activeBar.x + activeBar.barWidth / 2 - tooltipWidth / 2,
    metrics.padding.left,
    width - metrics.padding.right - tooltipWidth,
  );

  return (
    <Svg width={width} height={height}>
      {metrics.ticks.map((tick) => {
        const y = metrics.yScale(tick);
        return (
          <G key={`bar-grid-${tick}`}>
            <Line
              x1={metrics.padding.left}
              x2={width - metrics.padding.right}
              y1={y}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
            />
            <SvgText
              x={metrics.padding.left - 6}
              y={y + 4}
              textAnchor="end"
              fill={subtleTextColor}
              fontSize={10}
              fontWeight="700"
            >
              {formatChartNumber(tick)}
            </SvgText>
          </G>
        );
      })}

      <G x={tooltipX} y={Math.max(4, activeBar.y - 32)}>
        <Rect width={tooltipWidth} height={24} rx={12} fill={withAlpha(textColor, 0.94)} />
        <SvgText
          x={tooltipWidth / 2}
          y={16}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize={10}
          fontWeight="700"
        >
          {tooltip}
        </SvgText>
      </G>

      {metrics.positions.map((item, index) => {
        const isActive = index === activeIndex;
        return (
          <G key={`${item.label}-${index}`}>
            <Rect
              x={item.x}
              y={item.secondaryY}
              width={item.barWidth}
              height={item.secondaryHeight}
              rx={item.barWidth / 2}
              fill={withAlpha(item.color, 0.14)}
            />
            <Rect
              x={item.x}
              y={item.y}
              width={item.barWidth}
              height={Math.max(item.height, 6)}
              rx={item.barWidth / 2}
              fill={item.color}
              opacity={isActive ? 1 : 0.88}
            />
            {isActive ? (
              <Rect
                x={item.x - 3}
                y={item.y - 3}
                width={item.barWidth + 6}
                height={Math.max(item.height, 6) + 6}
                rx={(item.barWidth + 6) / 2}
                stroke={withAlpha(item.color, 0.45)}
                strokeWidth={2}
                fill="transparent"
              />
            ) : null}
            <SvgText
              x={item.x + item.barWidth / 2}
              y={height - 8}
              textAnchor="middle"
              fill={subtleTextColor}
              fontSize={10}
              fontWeight={isActive ? '800' : '700'}
            >
              {truncateLabel(item.label, 8)}
            </SvgText>
            {onSelectIndex ? (
              <Rect
                x={item.x - gapForHit(item.barWidth)}
                y={metrics.padding.top}
                width={item.barWidth + gapForHit(item.barWidth) * 2}
                height={metrics.innerHeight}
                fill="transparent"
                onPress={() => onSelectIndex(index)}
              />
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}

export function FlComparisonBarChart({
  data,
  width,
  selectedIndex,
  onSelectIndex,
  textColor = DEFAULT_TEXT,
  subtleTextColor = DEFAULT_SUBTLE,
}: ComparisonBarChartProps) {
  const safeData = data.map((item) => ({
    ...item,
    value: Math.max(0, item.value),
    secondaryValue: Math.max(0, item.secondaryValue ?? item.value),
  }));
  const maxValue = Math.max(
    1,
    ...safeData.map((item) => Math.max(item.value, item.secondaryValue ?? item.value)),
  );
  const activeIndex = selectedIndex === undefined && safeData.length > 0
    ? 0
    : clamp(selectedIndex ?? 0, 0, Math.max(0, safeData.length - 1));

  if (safeData.length === 0) {
    return (
      <View style={{ width, height: 220, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: subtleTextColor, fontSize: 13 }}>Keine Daten vorhanden</Text>
      </View>
    );
  }

  return (
    <View style={{ width, gap: 12 }}>
      {safeData.map((item, index) => {
        const isActive = index === activeIndex;
        const referenceRatio = clamp((item.secondaryValue ?? item.value) / maxValue, 0, 1);
        const currentRatio = clamp(item.value / maxValue, 0, 1);

        return (
          <Pressable
            key={`${item.label}-${index}`}
            onPress={() => onSelectIndex?.(index)}
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isActive ? withAlpha(item.color, 0.24) : withAlpha(item.color, 0.12),
              backgroundColor: isActive ? withAlpha(item.color, 0.08) : '#FFFFFF',
              paddingHorizontal: 14,
              paddingVertical: 14,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: textColor, fontSize: 14, fontWeight: isActive ? '800' : '700', flex: 1, paddingRight: 12 }}>
                {truncateLabel(item.label, 26)}
              </Text>
              <Text style={{ color: isActive ? item.color : subtleTextColor, fontSize: 12, fontWeight: '800' }}>
                {formatChartNumber(item.value)} / {formatChartNumber(item.secondaryValue ?? item.value)}
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: subtleTextColor, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Referenz</Text>
                  <Text style={{ color: subtleTextColor, fontSize: 10, fontWeight: '800' }}>{formatChartNumber(item.secondaryValue ?? item.value)}</Text>
                </View>
                <View style={{ height: 10, borderRadius: 999, backgroundColor: withAlpha(item.color, 0.08), overflow: 'hidden' }}>
                  <View style={{ width: `${referenceRatio * 100}%`, height: '100%', borderRadius: 999, backgroundColor: withAlpha(item.color, 0.3) }} />
                </View>
              </View>

              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: isActive ? item.color : subtleTextColor, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>Aktuell</Text>
                  <Text style={{ color: isActive ? item.color : subtleTextColor, fontSize: 10, fontWeight: '800' }}>{formatChartNumber(item.value)}</Text>
                </View>
                <View style={{ height: 14, borderRadius: 999, backgroundColor: withAlpha(item.color, 0.1), overflow: 'hidden' }}>
                  <View style={{ width: `${currentRatio * 100}%`, height: '100%', borderRadius: 999, backgroundColor: item.color }} />
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FlDonutChart({
  data,
  size = 220,
  strokeWidth = 28,
  selectedIndex,
  onSelectIndex,
  centerLabel,
  centerValue,
  showLegend = false,
  textColor = DEFAULT_TEXT,
  subtleTextColor = DEFAULT_SUBTLE,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const radius = size / 2;
  const innerRadius = radius - strokeWidth;
  const activeIndex = selectedIndex === undefined && data.length > 0
    ? 0
    : clamp(selectedIndex ?? 0, 0, Math.max(0, data.length - 1));
  const activeItem = data[activeIndex];

  const arcs = useMemo(() => {
    if (data.length === 0 || total <= 0) return [];

    const pie = d3.pie<ChartDatum>().value((item) => Math.max(0, item.value)).sort(null);
    return pie(data).map((segment, index) => {
      const outerRadius = index === activeIndex ? radius - 2 : radius - 8;
      const pathBuilder = d3.arc<typeof segment>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(10);

      return {
        path: pathBuilder(segment) ?? '',
        color: segment.data.color,
        index,
      };
    });
  }, [activeIndex, data, innerRadius, radius, total]);

  if (data.length === 0 || total <= 0) {
    return (
      <View style={{ width: size, alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={radius} cy={radius} r={radius - 12} fill={withAlpha('#BEC7C0', 0.22)} />
          <Circle cx={radius} cy={radius} r={innerRadius} fill="#FFFFFF" />
        </Svg>
        <Text style={{ color: subtleTextColor, fontSize: 13, marginTop: 8 }}>Keine Verteilung vorhanden</Text>
      </View>
    );
  }

  const displayedLabel = centerLabel ?? activeItem?.label ?? 'Gesamt';
  const displayedValue = centerValue ?? (
    activeItem
      ? `${Math.round((activeItem.value / total) * 100)}%`
      : `${formatChartNumber(total)}`
  );

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G x={radius} y={radius}>
          {arcs.map((segment) => (
            <Path
              key={`segment-${segment.index}`}
              d={segment.path}
              fill={data[segment.index].color}
              opacity={segment.index === activeIndex ? 1 : 0.88}
              onPress={() => onSelectIndex?.(segment.index)}
            />
          ))}
        </G>
        <Circle cx={radius} cy={radius} r={innerRadius - 6} fill="#FFFFFF" />
        <SvgText
          x={radius}
          y={radius - 6}
          textAnchor="middle"
          fill={subtleTextColor}
          fontSize={11}
          fontWeight="700"
        >
          {truncateLabel(displayedLabel, 12)}
        </SvgText>
        <SvgText
          x={radius}
          y={radius + 16}
          textAnchor="middle"
          fill={textColor}
          fontSize={22}
          fontWeight="900"
        >
          {displayedValue}
        </SvgText>
      </Svg>

      {showLegend ? (
        <View style={{ width: '100%', gap: 8, marginTop: 12 }}>
          {data.map((item, index) => {
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
            const isActive = index === activeIndex;
            return (
              <View
                key={`${item.label}-${index}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  backgroundColor: isActive ? withAlpha(item.color, 0.12) : 'transparent',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                  <Text style={{ color: textColor, fontSize: 13, fontWeight: isActive ? '800' : '700' }}>
                    {truncateLabel(item.label, 20)}
                  </Text>
                </View>
                <Text style={{ color: isActive ? item.color : subtleTextColor, fontSize: 12, fontWeight: '800' }}>
                  {percentage}%
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function FlProgressRingsChart({
  data,
  width,
  ringSize = 92,
  strokeWidth = 10,
  maxValue,
  selectedIndex,
  onSelectIndex,
  textColor = DEFAULT_TEXT,
  subtleTextColor = DEFAULT_SUBTLE,
}: ProgressRingsChartProps) {
  const safeMaxValue = maxValue ?? Math.max(100, ...data.map((item) => item.value), 1);
  const activeIndex = selectedIndex === undefined && data.length > 0
    ? 0
    : clamp(selectedIndex ?? 0, 0, Math.max(0, data.length - 1));
  const radius = ringSize / 2;
  const innerRadius = radius - strokeWidth;
  const columns = width < 320 ? 2 : 3;
  const cardWidth = Math.max(96, Math.min(132, (width - (columns - 1) * 12) / columns));

  if (data.length === 0) {
    return (
      <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: subtleTextColor, fontSize: 13 }}>Keine Daten vorhanden</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        width,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      {data.map((item, index) => {
        const ratio = clamp(item.value / safeMaxValue, 0, 1);
        const arc = d3.arc<d3.DefaultArcObject>()
          .innerRadius(innerRadius)
          .outerRadius(radius - 6)
          .cornerRadius(8)
          .startAngle(-Math.PI / 2)
          .endAngle(-Math.PI / 2 + Math.PI * 2 * ratio);
        const isActive = index === activeIndex;

        return (
          <Pressable
            key={`${item.label}-${index}`}
            onPress={() => onSelectIndex?.(index)}
            style={{
              width: cardWidth,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isActive ? withAlpha(item.color, 0.3) : withAlpha(item.color, 0.14),
              backgroundColor: isActive ? withAlpha(item.color, 0.08) : '#FFFFFF',
              paddingVertical: 14,
              paddingHorizontal: 10,
              alignItems: 'center',
            }}
          >
            <Svg width={ringSize} height={ringSize}>
              <G x={radius} y={radius}>
                <Circle
                  cx={0}
                  cy={0}
                  r={radius - 11}
                  stroke={withAlpha(item.color, 0.14)}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <Path
                  d={arc({} as d3.DefaultArcObject) ?? ''}
                  fill={item.color}
                />
              </G>
              <Circle cx={radius} cy={radius} r={innerRadius - 6} fill="#FFFFFF" />
              <SvgText
                x={radius}
                y={radius + 4}
                textAnchor="middle"
                fill={item.color}
                fontSize={18}
                fontWeight="900"
              >
                {`${Math.round(ratio * 100)}%`}
              </SvgText>
            </Svg>
            <Text
              style={{
                color: textColor,
                fontSize: 12,
                fontWeight: '800',
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              {truncateLabel(item.label, 18)}
            </Text>
            <Text
              style={{
                color: isActive ? item.color : subtleTextColor,
                fontSize: 11,
                fontWeight: '800',
                marginTop: 2,
              }}
            >
              {formatChartNumber(item.value)} / {formatChartNumber(safeMaxValue)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FlRadarChart({
  data,
  size = 240,
  levels = 4,
  maxValue,
  selectedIndex,
  onSelectIndex,
  textColor = DEFAULT_TEXT,
  subtleTextColor = DEFAULT_SUBTLE,
  gridColor = DEFAULT_GRID,
}: RadarChartProps) {
  const radius = size / 2 - 30;
  const center = size / 2;
  const safeMaxValue = maxValue ?? Math.max(1, ...data.map((item) => item.value), 1);
  const activeIndex = selectedIndex === undefined && data.length > 0
    ? 0
    : clamp(selectedIndex ?? 0, 0, Math.max(0, data.length - 1));

  const points = useMemo(() => {
    if (data.length === 0) return [];
    const angleStep = (Math.PI * 2) / data.length;

    return data.map((item, index) => {
      const ratio = clamp(item.value / safeMaxValue, 0, 1);
      const angle = -Math.PI / 2 + angleStep * index;
      return {
        ...item,
        x: center + Math.cos(angle) * radius * ratio,
        y: center + Math.sin(angle) * radius * ratio,
        labelX: center + Math.cos(angle) * (radius + 18),
        labelY: center + Math.sin(angle) * (radius + 18),
      };
    });
  }, [center, data, radius, safeMaxValue]);

  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ');
  const selectedPoint = points[activeIndex];

  if (data.length === 0) {
    return (
      <View style={{ height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: subtleTextColor, fontSize: 13 }}>Keine Daten vorhanden</Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {Array.from({ length: levels }).map((_, index) => {
          const level = (index + 1) / levels;
          const ring = data.map((_, pointIndex) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 / data.length) * pointIndex;
            const x = center + Math.cos(angle) * radius * level;
            const y = center + Math.sin(angle) * radius * level;
            return `${x},${y}`;
          }).join(' ');

          return (
            <Polygon
              key={`ring-${level}`}
              points={ring}
              fill="transparent"
              stroke={gridColor}
              strokeWidth={1}
            />
          );
        })}

        {data.map((_, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 / data.length) * index;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return (
            <Line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
            />
          );
        })}

        <Polygon
          points={polygon}
          fill={withAlpha(selectedPoint?.color ?? data[0].color, 0.18)}
          stroke={selectedPoint?.color ?? data[0].color}
          strokeWidth={2.5}
        />

        {points.map((point, index) => {
          const isActive = index === activeIndex;
          return (
            <G key={`${point.label}-${index}`}>
              <Circle cx={point.x} cy={point.y} r={isActive ? 8 : 5} fill={withAlpha(point.color, isActive ? 0.24 : 0.16)} />
              <Circle cx={point.x} cy={point.y} r={isActive ? 4 : 3} fill={point.color} />
              <SvgText
                x={point.labelX}
                y={point.labelY}
                textAnchor={point.labelX < center - 12 ? 'end' : point.labelX > center + 12 ? 'start' : 'middle'}
                fill={isActive ? textColor : subtleTextColor}
                fontSize={10}
                fontWeight={isActive ? '800' : '700'}
              >
                {truncateLabel(point.label, 10)}
              </SvgText>
              {onSelectIndex ? (
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={16}
                  fill="transparent"
                  onPress={() => onSelectIndex(index)}
                />
              ) : null}
            </G>
          );
        })}
      </Svg>

      {selectedPoint ? (
        <View
          style={{
            marginTop: -6,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 16,
            backgroundColor: withAlpha(selectedPoint.color, 0.12),
          }}
        >
          <Text style={{ color: selectedPoint.color, fontSize: 12, fontWeight: '800' }}>
            {selectedPoint.label}: {formatChartNumber(selectedPoint.value)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

interface StackedBarChartProps extends BaseChartProps {
  data: ChartDatum[];
  width: number;
  barHeight?: number;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
}

export function FlStackedBarChart({
  data,
  width,
  barHeight = 28,
  selectedIndex,
  onSelectIndex,
  textColor = DEFAULT_TEXT,
  subtleTextColor = DEFAULT_SUBTLE,
}: StackedBarChartProps) {
  const normalized = data.map((item) => ({
    ...item,
    value: Math.max(0, item.value),
  }));
  const total = normalized.reduce((sum, item) => sum + item.value, 0);
  const activeIndex = selectedIndex === undefined && normalized.length > 0
    ? 0
    : clamp(selectedIndex ?? 0, 0, Math.max(0, normalized.length - 1));
  const activeItem = normalized[activeIndex];
  const barWidth = Math.max(120, width - 8);

  const segments = useMemo(() => {
    if (total <= 0) return [];

    let offset = 0;
    return normalized.map((item, index) => {
      const segmentWidth = (item.value / total) * barWidth;
      const next = {
        ...item,
        index,
        x: offset,
        width: segmentWidth,
      };
      offset += segmentWidth;
      return next;
    });
  }, [barWidth, normalized, total]);

  if (normalized.length === 0 || total <= 0) {
    return (
      <View style={{ width, alignItems: 'center' }}>
        <View
          style={{
            width: barWidth,
            height: barHeight,
            borderRadius: barHeight / 2,
            backgroundColor: withAlpha('#BEC7C0', 0.22),
          }}
        />
        <Text style={{ color: subtleTextColor, fontSize: 13, marginTop: 10 }}>Keine Verteilung vorhanden</Text>
      </View>
    );
  }

  return (
    <View style={{ width }}>
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <Svg width={barWidth} height={barHeight + 6}>
          <Rect
            x={0}
            y={3}
            width={barWidth}
            height={barHeight}
            rx={barHeight / 2}
            fill={withAlpha(activeItem?.color ?? '#BEC7C0', 0.1)}
          />
          {segments.map((segment, index) => (
            <Rect
              key={`${segment.label}-${index}`}
              x={segment.x}
              y={3}
              width={Math.max(segment.width, 6)}
              height={barHeight}
              fill={segment.color}
              opacity={index === activeIndex ? 1 : 0.88}
              onPress={() => onSelectIndex?.(index)}
            />
          ))}
        </Svg>
      </View>

      <View style={{ gap: 8 }}>
        {segments.map((segment, index) => {
          const percentage = Math.round((segment.value / total) * 100);
          const isActive = index === activeIndex;

          return (
            <Pressable
              key={`legend-${segment.label}-${index}`}
              onPress={() => onSelectIndex?.(index)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 16,
                backgroundColor: isActive ? withAlpha(segment.color, 0.12) : '#FFFFFF',
                borderWidth: 1,
                borderColor: isActive ? withAlpha(segment.color, 0.24) : withAlpha(segment.color, 0.08),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: segment.color,
                  }}
                />
                <Text style={{ color: textColor, fontSize: 13, fontWeight: isActive ? '800' : '700', flex: 1 }}>
                  {truncateLabel(segment.label, 24)}
                </Text>
              </View>
              <Text style={{ color: isActive ? segment.color : subtleTextColor, fontSize: 12, fontWeight: '800' }}>
                {percentage}% ({formatChartNumber(segment.value)})
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function FlHeatmapGridChart({
  data,
  width,
  columns = width < 320 ? 3 : 4,
  selectedIndex,
  onSelectIndex,
  maxValue,
  textColor = DEFAULT_TEXT,
  subtleTextColor = DEFAULT_SUBTLE,
}: HeatmapGridChartProps) {
  const safeMaxValue = maxValue ?? Math.max(1, ...data.map((item) => item.value), 1);
  const activeIndex = selectedIndex === undefined && data.length > 0
    ? 0
    : clamp(selectedIndex ?? 0, 0, Math.max(0, data.length - 1));
  const gap = 10;
  const cellWidth = Math.max(74, (width - gap * (columns - 1)) / columns);

  if (data.length === 0) {
    return (
      <View style={{ width, height: 220, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: subtleTextColor, fontSize: 13 }}>Keine Daten vorhanden</Text>
      </View>
    );
  }

  return (
    <View style={{ width }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {data.map((item, index) => {
          const ratio = clamp(item.value / safeMaxValue, 0, 1);
          const isActive = index === activeIndex;
          return (
            <Pressable
              key={`${item.label}-${index}`}
              onPress={() => onSelectIndex?.(index)}
              style={{
                width: cellWidth,
                minHeight: cellWidth,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: isActive ? withAlpha(item.color, 0.3) : withAlpha(item.color, 0.12),
                backgroundColor: withAlpha(item.color, 0.12 + ratio * 0.58),
                padding: 10,
                justifyContent: 'space-between',
              }}
            >
              <Text
                numberOfLines={2}
                style={{
                  color: ratio > 0.56 ? '#FFFFFF' : textColor,
                  fontSize: 12,
                  fontWeight: '800',
                  lineHeight: 16,
                }}
              >
                {truncateLabel(item.label, 18)}
              </Text>
              <Text
                style={{
                  color: ratio > 0.48 ? '#FFFFFF' : isActive ? item.color : subtleTextColor,
                  fontSize: 16,
                  fontWeight: '900',
                  marginTop: 8,
                }}
              >
                {formatChartNumber(item.value)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <Text style={{ color: subtleTextColor, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
          Niedrig
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0.18, 0.34, 0.5, 0.66].map((alpha, index) => (
            <View
              key={`heat-legend-${index}`}
              style={{
                width: 18,
                height: 10,
                borderRadius: 999,
                backgroundColor: withAlpha(data[activeIndex]?.color ?? '#B08C57', alpha),
              }}
            />
          ))}
        </View>
        <Text style={{ color: subtleTextColor, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
          Hoch
        </Text>
      </View>
    </View>
  );
}

export function FlRangeChart({
  data,
  width,
  selectedIndex,
  onSelectIndex,
  maxValue,
  textColor = DEFAULT_TEXT,
  subtleTextColor = DEFAULT_SUBTLE,
}: RangeChartProps) {
  const safeMaxValue = maxValue ?? Math.max(100, ...data.map((item) => item.value), 1);
  const activeIndex = selectedIndex === undefined && data.length > 0
    ? 0
    : clamp(selectedIndex ?? 0, 0, Math.max(0, data.length - 1));

  if (data.length === 0) {
    return (
      <View style={{ width, height: 220, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: subtleTextColor, fontSize: 13 }}>Keine Daten vorhanden</Text>
      </View>
    );
  }

  return (
    <View style={{ width, gap: 12 }}>
      {data.map((item, index) => {
        const isActive = index === activeIndex;
        const ratio = clamp(item.value / safeMaxValue, 0, 1);
        return (
          <Pressable
            key={`${item.label}-${index}`}
            onPress={() => onSelectIndex?.(index)}
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: isActive ? withAlpha(item.color, 0.24) : withAlpha(item.color, 0.12),
              backgroundColor: isActive ? withAlpha(item.color, 0.07) : '#FFFFFF',
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: textColor, fontSize: 13, fontWeight: isActive ? '800' : '700', flex: 1, paddingRight: 12 }}>
                {truncateLabel(item.label, 24)}
              </Text>
              <Text style={{ color: isActive ? item.color : subtleTextColor, fontSize: 12, fontWeight: '900' }}>
                {formatChartNumber(item.value)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: subtleTextColor, fontSize: 10, fontWeight: '800', width: 18 }}>0</Text>
              <View style={{ flex: 1, height: 14, justifyContent: 'center' }}>
                <View style={{ height: 6, borderRadius: 999, backgroundColor: withAlpha(item.color, 0.12) }} />
                <View
                  style={{
                    position: 'absolute',
                    left: `${ratio * 100}%`,
                    marginLeft: -8,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: item.color,
                    borderWidth: 3,
                    borderColor: '#FFFFFF',
                    shadowColor: item.color,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                />
              </View>
              <Text style={{ color: subtleTextColor, fontSize: 10, fontWeight: '800', width: 30, textAlign: 'right' }}>
                {formatChartNumber(safeMaxValue)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FlBubbleChart({
  data,
  width,
  selectedIndex,
  onSelectIndex,
  maxValue,
  textColor = DEFAULT_TEXT,
  subtleTextColor = DEFAULT_SUBTLE,
}: BubbleChartProps) {
  const safeMaxValue = maxValue ?? Math.max(1, ...data.map((item) => item.value), 1);
  const activeIndex = selectedIndex === undefined && data.length > 0
    ? 0
    : clamp(selectedIndex ?? 0, 0, Math.max(0, data.length - 1));
  const columns = width < 340 ? 2 : 3;
  const gap = 12;
  const cellWidth = Math.max(92, (width - gap * (columns - 1)) / columns);

  if (data.length === 0) {
    return (
      <View style={{ width, height: 220, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: subtleTextColor, fontSize: 13 }}>Keine Daten vorhanden</Text>
      </View>
    );
  }

  return (
    <View style={{ width, flexDirection: 'row', flexWrap: 'wrap', gap, justifyContent: 'center' }}>
      {data.map((item, index) => {
        const ratio = clamp(item.value / safeMaxValue, 0, 1);
        const isActive = index === activeIndex;
        const bubbleSize = 64 + ratio * 48;
        const foreground = ratio > 0.58 ? '#FFFFFF' : textColor;
        return (
          <Pressable
            key={`${item.label}-${index}`}
            onPress={() => onSelectIndex?.(index)}
            style={{
              width: cellWidth,
              alignItems: 'center',
              paddingVertical: 6,
            }}
          >
            <View
              style={{
                width: bubbleSize,
                height: bubbleSize,
                borderRadius: bubbleSize / 2,
                backgroundColor: withAlpha(item.color, 0.18 + ratio * 0.55),
                borderWidth: 1.5,
                borderColor: isActive ? withAlpha(item.color, 0.34) : withAlpha(item.color, 0.16),
                alignItems: 'center',
                justifyContent: 'center',
                padding: 10,
                shadowColor: item.color,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isActive ? 0.22 : 0.1,
                shadowRadius: 12,
                elevation: isActive ? 4 : 2,
              }}
            >
              <Text style={{ color: foreground, fontSize: 16, fontWeight: '900' }}>
                {formatChartNumber(item.value)}
              </Text>
            </View>
            <Text
              numberOfLines={2}
              style={{
                color: isActive ? item.color : subtleTextColor,
                fontSize: 12,
                fontWeight: '800',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {truncateLabel(item.label, 20)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

