/**
 * ExerciseDifficultyGauge — Web version
 * D3 arc gauge showing cognitive complexity
 */

import { useMemo } from "react";
import * as d3 from "d3";
import { motion } from "motion/react";

type BlockType =
  | "reflection" | "scale" | "choice" | "checklist" | "homework"
  | "gratitude" | "info" | "timer" | "breathing" | "media" | "video"
  | "spider_chart" | "bar_chart" | "pie_chart" | "line_chart";

interface Block { type: BlockType; id: string; [key: string]: any; }

const COMPLEXITY_WEIGHT: Record<BlockType, number> = {
  homework: 3.0, reflection: 2.0, scale: 1.5, choice: 1.5,
  info: 1.0, checklist: 1.0, spider_chart: 3, bar_chart: 2,
  pie_chart: 2, line_chart: 2.5, gratitude: 0.5, media: 1.5,
  video: 1.0, breathing: 2, timer: 1,
};

const GAUGE_ZONES = [
  { color: "#10B981", from: 0.0, to: 0.33 },
  { color: "#F59E0B", from: 0.33, to: 0.66 },
  { color: "#EF4444", from: 0.66, to: 1.0 },
];

const SIZE = 180, CX = SIZE / 2, CY = SIZE / 2 + 12;
const OUTER_R = SIZE / 2 - 14, INNER_R = OUTER_R - 20;
const START_ANG = -Math.PI * 0.75, END_ANG = Math.PI * 0.75;
const TOTAL_ANG = END_ANG - START_ANG;

function describeArc(startRatio: number, endRatio: number): string {
  const start = START_ANG + startRatio * TOTAL_ANG;
  const end = START_ANG + endRatio * TOTAL_ANG;
  const arcFn = d3.arc<any>().innerRadius(INNER_R).outerRadius(OUTER_R).startAngle(start).endAngle(end);
  return arcFn({} as any) ?? "";
}

function needlePoint(ratio: number) {
  const angle = START_ANG + ratio * TOTAL_ANG - Math.PI / 2;
  return { x: Math.cos(angle) * (INNER_R - 6), y: Math.sin(angle) * (INNER_R - 6) };
}

function getLevelInfo(ratio: number) {
  if (ratio < 0.33) return { label: "Zugänglich", emoji: "🟢", color: "#10B981", sub: "Geeignet für alle Klienten" };
  if (ratio < 0.66) return { label: "Anspruchsvoll", emoji: "🟡", color: "#F59E0B", sub: "Erfahrung empfehlenswert" };
  return { label: "Intensiv", emoji: "🔴", color: "#EF4444", sub: "Für fortgeschrittene Klienten" };
}

export default function ExerciseDifficultyGauge({ blocks }: { blocks: Block[] }) {
  const { ratio } = useMemo(() => {
    if (blocks.length === 0) return { ratio: 0 };
    const raw = blocks.reduce((sum, b) => sum + (COMPLEXITY_WEIGHT[b.type] ?? 1), 0);
    const normalized = d3.scaleLinear().domain([0, 20]).range([0, 1]).clamp(true)(raw);
    return { ratio: normalized };
  }, [blocks]);

  const level = getLevelInfo(ratio);
  const needle = needlePoint(ratio);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className="bg-card rounded-3xl border border-border p-[18px] mb-4 flex flex-col items-center shadow-sm"
    >
      <div className="flex justify-between items-center w-full mb-1">
        <div>
          <p className="text-xs font-extrabold text-foreground">Kognitive Belastung</p>
          <p className="text-[10px] text-muted-foreground font-medium">Komplexitäts-Einschätzung</p>
        </div>
        <div className="px-2.5 py-1 rounded-[20px] border" style={{ backgroundColor: level.color + "18", borderColor: level.color + "44" }}>
          <span className="text-[11px] font-bold" style={{ color: level.color }}>{level.emoji} {level.label}</span>
        </div>
      </div>

      <svg width={SIZE} height={SIZE * 0.68} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <path d={describeArc(0, 1)} fill="#F3F4F6" transform={`translate(${CX},${CY})`} />
        {GAUGE_ZONES.map((zone, i) => (
          <path key={i} d={describeArc(zone.from, zone.to)} fill={zone.color} opacity={0.18} transform={`translate(${CX},${CY})`} />
        ))}
        {ratio > 0 && (
          <motion.path
            d={describeArc(0, ratio)}
            fill={level.color}
            opacity={0.85}
            transform={`translate(${CX},${CY})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.8 }}
          />
        )}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const a = START_ANG + t * TOTAL_ANG - Math.PI / 2;
          const r1 = OUTER_R + 2, r2 = OUTER_R + 7;
          return <line key={t} x1={CX + Math.cos(a) * r1} y1={CY + Math.sin(a) * r1} x2={CX + Math.cos(a) * r2} y2={CY + Math.sin(a) * r2} stroke="#D1D5DB" strokeWidth={2} strokeLinecap="round" />;
        })}
        <motion.line
          x1={CX} y1={CY} x2={CX + needle.x} y2={CY + needle.y}
          stroke={level.color} strokeWidth={3} strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        />
        <circle cx={CX} cy={CY} r={7} fill={level.color} />
        <circle cx={CX} cy={CY} r={3} fill="#FFFFFF" />
        <text x={CX - OUTER_R + 4} y={CY + 22} textAnchor="start" fill="#10B981" fontSize={8} fontWeight="700">L</text>
        <text x={CX} y={CY - OUTER_R + 14} textAnchor="middle" fill="#F59E0B" fontSize={8} fontWeight="700">M</text>
        <text x={CX + OUTER_R - 4} y={CY + 22} textAnchor="end" fill="#EF4444" fontSize={8} fontWeight="700">H</text>
      </svg>

      <p className="text-[10px] text-muted-foreground -mt-1.5 text-center font-medium">
        {blocks.length === 0 ? "Noch keine Blöcke" : level.sub}
      </p>

      {blocks.length > 0 && (
        <div className="flex gap-1.5 mt-2.5 flex-wrap justify-center">
          {blocks.map(b => {
            const w = COMPLEXITY_WEIGHT[b.type];
            const bg = w >= 2 ? "#FEF3C7" : w >= 1 ? "#ECFDF5" : "#EFF6FF";
            const clr = w >= 2 ? "#92400E" : w >= 1 ? "#065F46" : "#1D4ED8";
            return <span key={b.id} className="px-[7px] py-[3px] rounded-lg text-[9px] font-extrabold" style={{ backgroundColor: bg, color: clr }}>{w}pt</span>;
          })}
        </div>
      )}
    </motion.div>
  );
}
