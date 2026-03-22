import { useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import type { SliceData, PointTooltipProps } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveRadar } from "@nivo/radar";

type ExerciseBlock = {
  id: string;
  type: string;
  content?: string;
  options?: string[];
};

const CHART_PALETTE = [
  "#137386",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#3B82F6",
  "#14B8A6",
  "#F97316",
];

type ChartEntry = {
  id: string;
  label: string;
  value: number;
  color: string;
};

function parseOptions(options: string[] = []): ChartEntry[] {
  return options
    .map((option, index) => {
      const [rawLabel = "", rawValue = "", rawColor = ""] = option.split(":");
      return {
        id: `${rawLabel || "entry"}-${index}`,
        label: rawLabel || `Punkt ${index + 1}`,
        value: Number.parseFloat(rawValue || "0") || 0,
        color: rawColor || CHART_PALETTE[index % CHART_PALETTE.length],
      };
    })
    .filter((entry) => entry.label.trim().length > 0);
}

function SelectionButtons({
  data,
  value,
  onChange,
  disabled,
}: {
  data: ChartEntry[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  if (!data.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {data.map((entry) => {
        const selected = value === entry.label;
        return (
          <button
            key={entry.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(entry.label)}
            className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
              selected ? "text-white shadow-sm" : "bg-background text-foreground hover:border-primary/40"
            }`}
            style={{
              borderColor: selected ? entry.color : "hsl(var(--border))",
              backgroundColor: selected ? entry.color : undefined,
            }}
          >
            {entry.label}
            <span className={`ml-2 text-xs ${selected ? "text-white/80" : "text-muted-foreground"}`}>
              {entry.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function InteractiveChartBlock({
  block,
  value,
  onChange,
  disabled,
}: {
  block: ExerciseBlock;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const data = useMemo(() => parseOptions(block.options), [block.options]);
  const maxValue = useMemo(() => Math.max(...data.map((entry) => entry.value), 1), [data]);

  if (!data.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-sm font-medium text-muted-foreground">
        Für dieses Diagramm sind noch keine Daten hinterlegt.
      </div>
    );
  }

  const chartHeight = block.type === "pie_chart" ? 280 : 320;

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      {block.content ? <p className="mb-4 text-base font-semibold text-foreground">{block.content}</p> : null}

      <div className="h-[320px] w-full">
        {block.type === "bar_chart" ? (
          <ResponsiveBar
            data={data.map((entry) => ({
              label: entry.label,
              value: entry.value,
              color: entry.color,
            }))}
            keys={["value"]}
            indexBy="label"
            margin={{ top: 20, right: 20, bottom: 56, left: 48 }}
            padding={0.35}
            enableLabel={false}
            colors={({ data: datum }) => (datum as { color?: string }).color || CHART_PALETTE[0]}
            borderRadius={8}
            axisBottom={{ tickSize: 0, tickPadding: 12, tickRotation: 0 }}
            axisLeft={{ tickSize: 0, tickPadding: 8 }}
            theme={{
              axis: {
                ticks: { text: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } },
              },
              grid: { line: { stroke: "hsl(var(--border))", strokeOpacity: 0.4 } },
            }}
            onClick={(datum) => !disabled && onChange(String(datum.indexValue))}
          />
        ) : null}

        {block.type === "pie_chart" ? (
          <div style={{ height: chartHeight }}>
            <ResponsivePie
              data={data.map((entry) => ({
                id: entry.label,
                label: entry.label,
                value: Math.max(entry.value, 1),
                color: entry.color,
              }))}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              innerRadius={0.58}
              padAngle={1.5}
              cornerRadius={5}
              enableArcLabels={false}
              colors={({ data: datum }) => (datum as { color?: string }).color || CHART_PALETTE[0]}
              arcLinkLabelsSkipAngle={12}
              arcLinkLabelsTextColor="hsl(var(--foreground))"
              arcLinkLabelsColor={{ from: "color" }}
              theme={{
                labels: { text: { fill: "hsl(var(--foreground))", fontSize: 11 } },
              }}
              onClick={(datum) => !disabled && onChange(String(datum.id))}
            />
          </div>
        ) : null}

        {block.type === "line_chart" ? (
          <ResponsiveLine
            data={[
              {
                id: "Verlauf",
                color: "#10B981",
                data: data.map((entry) => ({
                  x: entry.label,
                  y: entry.value,
                })),
              },
            ]}
            margin={{ top: 20, right: 20, bottom: 56, left: 48 }}
            colors={["#10B981"]}
            pointSize={10}
            pointColor="#10B981"
            pointBorderWidth={2}
            pointBorderColor="#ffffff"
            enableArea
            areaOpacity={0.08}
            curve="monotoneX"
            useMesh
            axisBottom={{ tickSize: 0, tickPadding: 12 }}
            axisLeft={{ tickSize: 0, tickPadding: 8 }}
            yScale={{ type: "linear", min: 0, max: maxValue }}
            theme={{
              axis: {
                ticks: { text: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } },
              },
              grid: { line: { stroke: "hsl(var(--border))", strokeOpacity: 0.4 } },
            }}
            onClick={(point) => {
              if (disabled) return;
              if ("data" in point) {
                const datum = (point.data as { x: string | number })?.x;
                if (datum !== undefined) {
                  onChange(String(datum));
                }
                return;
              }

              const slice = point as SliceData<PointTooltipProps["point"]["data"]>;
              const firstPoint = slice.points?.[0];
              const datum = firstPoint?.data as { x?: string | number } | undefined;
              if (datum?.x !== undefined) {
                onChange(String(datum.x));
              }
            }}
          />
        ) : null}

        {block.type === "spider_chart" ? (
          <ResponsiveRadar
            data={data.map((entry) => ({
              category: entry.label,
              value: entry.value,
            }))}
            keys={["value"]}
            indexBy="category"
            margin={{ top: 30, right: 40, bottom: 30, left: 40 }}
            maxValue={Math.max(maxValue, 10)}
            borderColor="#F97316"
            gridLabelOffset={18}
            dotSize={10}
            dotColor="#F97316"
            dotBorderWidth={2}
            dotBorderColor="#ffffff"
            colors={["rgba(249, 115, 22, 0.24)"]}
            fillOpacity={0.3}
            blendMode="multiply"
            theme={{
              axis: {
                ticks: { text: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } },
              },
              grid: { line: { stroke: "hsl(var(--border))", strokeOpacity: 0.5 } },
            }}
          />
        ) : null}
      </div>

      <SelectionButtons data={data} value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}
