import { motion } from "motion/react";
import * as d3 from "d3";

const CHART_PALETTE = ["#F97316", "#0EA5E9", "#10B981", "#8B5CF6", "#F43F5E", "#F59E0B", "#14B8A6", "#64748B", "#EC4899", "#3B82F6"];

function BarChartPreview({ options }: { options: string[] }) {
  const data = options.map((option, index) => {
    const [label, value, color] = option.split(":");
    return {
      label: label || "?",
      value: Number.parseFloat(value || "0") || 0,
      color: color || CHART_PALETTE[index % CHART_PALETTE.length],
    };
  });
  const maxValue = Math.max(...data.map((entry) => entry.value), 1);
  const width = 320;
  const height = 160;
  const padding = 40;
  const barPadding = 8;
  const barWidth = Math.max(12, (width - padding * 2) / data.length - barPadding);

  return (
    <div className="mt-4 rounded-2xl border border-border bg-secondary/50 p-4">
      <p className="mb-3 text-center text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Vorschau</p>
      <svg width={width} height={height} className="mx-auto block">
        {data.map((entry, index) => {
          const x = padding + index * (barWidth + barPadding);
          const barHeight = (entry.value / maxValue) * (height - 50);

          return (
            <g key={index}>
              <motion.rect
                x={x}
                width={barWidth}
                rx={6}
                y={height - 20 - barHeight}
                height={barHeight}
                fill={entry.color}
                initial={{ height: 0, y: height - 20 }}
                animate={{ height: barHeight, y: height - 20 - barHeight }}
                transition={{ delay: index * 0.1, type: "spring", damping: 15 }}
              />
              <text x={x + barWidth / 2} y={height - 20 - barHeight - 6} textAnchor="middle" fontSize={10} fontWeight="700" fill={entry.color}>
                {entry.value}
              </text>
              <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" fontSize={9} fontWeight="600" fill="hsl(var(--muted-foreground))">
                {entry.label.slice(0, 6)}
              </text>
            </g>
          );
        })}
        <line x1={padding - 4} y1={height - 20} x2={width - padding + 4} y2={height - 20} stroke="hsl(var(--border))" strokeWidth={1} />
      </svg>
    </div>
  );
}

function PieChartPreview({ options }: { options: string[] }) {
  const data = options.map((option, index) => {
    const [label, value, color] = option.split(":");
    return {
      label: label || "?",
      value: Number.parseFloat(value || "0") || 1,
      color: color || CHART_PALETTE[index % CHART_PALETTE.length],
    };
  });
  const size = 160;
  const outerRadius = size / 2 - 8;
  const innerRadius = outerRadius * 0.5;
  const pie = d3.pie<(typeof data)[0]>().value((entry) => entry.value).padAngle(0.04).sortValues(null);
  const arc = d3.arc<d3.PieArcDatum<(typeof data)[0]>>().outerRadius(outerRadius).innerRadius(innerRadius).cornerRadius(4);
  const pieData = pie(data);

  return (
    <div className="mt-4 rounded-2xl border border-border bg-secondary/50 p-4">
      <p className="mb-3 text-center text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Vorschau</p>
      <div className="flex items-center justify-center gap-4">
        <svg width={size} height={size}>
          <g transform={`translate(${size / 2},${size / 2})`}>
            {pieData.map((entry, index) => (
              <motion.path
                key={index}
                d={arc(entry) ?? ""}
                fill={entry.data.color}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.9 }}
                transition={{ delay: index * 0.1, type: "spring" }}
              />
            ))}
          </g>
        </svg>
        <div className="space-y-1.5">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs font-semibold text-foreground">{entry.label}</span>
              <span className="text-[10px] font-bold text-muted-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LineChartPreview({ options }: { options: string[] }) {
  const data = options.map((option) => {
    const [label, value] = option.split(":");
    return { label: label || "?", value: Number.parseFloat(value || "0") || 0 };
  });
  const width = 320;
  const height = 140;
  const padding = 40;
  const maxValue = Math.max(...data.map((entry) => entry.value), 1);
  const points = data.map((entry, index) => ({
    x: padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2),
    y: height - 24 - (entry.value / maxValue) * (height - 50),
    ...entry,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="mt-4 rounded-2xl border border-border bg-secondary/50 p-4">
      <p className="mb-3 text-center text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Vorschau</p>
      <svg width={width} height={height} className="mx-auto block">
        <motion.path d={linePath} fill="none" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
        {points.map((point, index) => (
          <g key={index}>
            <motion.circle cx={point.x} cy={point.y} r={5} fill="#10B981" stroke="#fff" strokeWidth={2} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: index * 0.1 + 0.3 }} />
            <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize={9} fontWeight="700" fill="#10B981">
              {point.value}
            </text>
            <text x={point.x} y={height - 4} textAnchor="middle" fontSize={9} fontWeight="600" fill="hsl(var(--muted-foreground))">
              {point.label.slice(0, 4)}
            </text>
          </g>
        ))}
        <line x1={padding - 4} y1={height - 24} x2={width - padding + 4} y2={height - 24} stroke="hsl(var(--border))" strokeWidth={1} />
      </svg>
    </div>
  );
}

function SpiderChartPreview({ options }: { options: string[] }) {
  const data = options.map((option, index) => {
    const [label, value, color] = option.split(":");
    return {
      label: label || "?",
      value: Math.min(Number.parseFloat(value || "0") || 0, 100),
      color: color || CHART_PALETTE[index % CHART_PALETTE.length],
    };
  });
  if (data.length < 3) return null;

  const size = 200;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 30;
  const angleStep = (2 * Math.PI) / data.length;
  const gridLevels = [0.25, 0.5, 0.75, 1];

  const pointsForLevel = (level: number) =>
    data.map((_, index) => {
      const angle = index * angleStep - Math.PI / 2;
      return {
        x: centerX + Math.cos(angle) * radius * level,
        y: centerY + Math.sin(angle) * radius * level,
      };
    });

  const dataPoints = data.map((entry, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const pointRadius = (entry.value / 100) * radius;
    return {
      x: centerX + Math.cos(angle) * pointRadius,
      y: centerY + Math.sin(angle) * pointRadius,
    };
  });
  const dataPath = `${dataPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-secondary/50 p-4">
      <p className="mb-3 text-center text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Vorschau</p>
      <svg width={size} height={size} className="mx-auto block">
        {gridLevels.map((level) => {
          const points = pointsForLevel(level);
          const gridPath = `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;
          return <path key={level} d={gridPath} fill="none" stroke="hsl(var(--border))" strokeWidth={1} opacity={0.5} />;
        })}
        {data.map((_, index) => {
          const angle = index * angleStep - Math.PI / 2;
          return <line key={index} x1={centerX} y1={centerY} x2={centerX + Math.cos(angle) * radius} y2={centerY + Math.sin(angle) * radius} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.5} />;
        })}
        <motion.path d={dataPath} fill="#F97316" fillOpacity={0.2} stroke="#F97316" strokeWidth={2} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }} style={{ transformOrigin: `${centerX}px ${centerY}px` }} />
        {dataPoints.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={4} fill={data[index].color} stroke="#fff" strokeWidth={2} />
        ))}
      </svg>
    </div>
  );
}

export default function BuilderChartPreview({
  chartType,
  options,
}: {
  chartType: "spider_chart" | "bar_chart" | "pie_chart" | "line_chart";
  options: string[];
}) {
  if (chartType === "bar_chart") return <BarChartPreview options={options} />;
  if (chartType === "pie_chart") return <PieChartPreview options={options} />;
  if (chartType === "line_chart") return <LineChartPreview options={options} />;
  return <SpiderChartPreview options={options} />;
}
