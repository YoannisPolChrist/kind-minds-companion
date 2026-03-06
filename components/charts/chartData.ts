export interface ChartDatum {
  label: string;
  value: number;
  color: string;
}

export const DEFAULT_FL_CHART_PALETTE = [
  '#2D666B',
  '#B08C57',
  '#6E7F86',
  '#8A6A53',
  '#788E76',
  '#496C78',
  '#A37E68',
  '#5F6378',
];

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function withAlpha(hex: string, alpha: number) {
  if (!hex.startsWith('#')) return hex;

  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;

  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function formatChartNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1000) {
    return Intl.NumberFormat('de-DE', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function parseExerciseChartData(
  options: string[] | undefined,
  currentValues?: Record<string, number>,
  palette: string[] = DEFAULT_FL_CHART_PALETTE,
): ChartDatum[] {
  return (options ?? []).map((option, index) => {
    const [rawLabel = '', rawValue = '0', rawColor = ''] = option.split(':');
    const label = rawLabel.trim() || `Option ${index + 1}`;
    const fallbackValue = Number.parseFloat(rawValue);
    const currentValue = currentValues?.[label];
    const value = typeof currentValue === 'number' && Number.isFinite(currentValue)
      ? currentValue
      : Number.isFinite(fallbackValue)
        ? fallbackValue
        : 0;

    return {
      label,
      value,
      color: rawColor.trim() || palette[index % palette.length],
    };
  });
}
