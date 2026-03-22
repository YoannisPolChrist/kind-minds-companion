/**
 * ExerciseCompositionChart — Web version
 * D3-powered donut chart showing therapeutic composition balance
 */

import { useMemo } from "react";
import * as d3 from "d3";
import { motion } from "motion/react";

type BlockType =
  | "reflection" | "scale" | "choice" | "checklist" | "homework"
  | "gratitude" | "info" | "timer" | "breathing" | "media" | "video"
  | "spider_chart" | "bar_chart" | "pie_chart" | "line_chart";

interface Block { type: BlockType; [key: string]: any; }

const CATEGORY_MAP: Record<BlockType, { category: string; color: string }> = {
  reflection: { category: "Kognition", color: "#60A5FA" },
  info: { category: "Kognition", color: "#60A5FA" },
  homework: { category: "Kognition", color: "#60A5FA" },
  scale: { category: "Bewertung", color: "#FBBF24" },
  choice: { category: "Bewertung", color: "#FBBF24" },
  checklist: { category: "Verhalten", color: "#34D399" },
  gratitude: { category: "Verhalten", color: "#34D399" },
  timer: { category: "Ausführung", color: "#A78BFA" },
  breathing: { category: "Achtsamkeit", color: "#22D3EE" },
  media: { category: "Multimedia", color: "#FB7185" },
  video: { category: "Multimedia", color: "#FB7185" },
  spider_chart: { category: "Analyse", color: "#FBBF24" },
  bar_chart: { category: "Analyse", color: "#34D399" },
  pie_chart: { category: "Analyse", color: "#A78BFA" },
  line_chart: { category: "Analyse", color: "#60A5FA" },
};

const ALL_CATEGORIES = [
  { name: "Kognition", color: "#60A5FA", label: "🧠" },
  { name: "Bewertung", color: "#FBBF24", label: "📊" },
  { name: "Verhalten", color: "#34D399", label: "✅" },
  { name: "Achtsamkeit", color: "#22D3EE", label: "🌬️" },
];

function getTip(blocks: Block[]): string {
  if (blocks.length === 0) return "Füge Blöcke hinzu, um die Übungs-Balance zu sehen.";
  const counts: Record<string, number> = {};
  for (const b of blocks) {
    const cat = CATEGORY_MAP[b.type]?.category ?? "Sonstiges";
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  const missing = ALL_CATEGORIES.filter(c => !counts[c.name]).map(c => c.name);
  if (missing.length === 0) return "✨ Ausgewogene Übung! Alle Bereiche sind abgedeckt.";
  if (blocks.length < 3) return "💡 Tipp: Eine gute Übung hat mindestens 3 Blöcke.";
  return `💡 Fehlend: ${missing.join(", ")} – für mehr Balance.`;
}

export default function ExerciseCompositionChart({ blocks }: { blocks: Block[] }) {
  const totalBlocks = blocks.length;
  const tip = getTip(blocks);

  const arcs = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) counts[cat.name] = 0;
    for (const b of blocks) {
      const cat = CATEGORY_MAP[b.type]?.category;
      if (cat && counts[cat] !== undefined) counts[cat]++;
    }
    const data = ALL_CATEGORIES.map(c => ({ name: c.name, color: c.color, label: c.label, value: counts[c.name] ?? 0 }));
    const hasAny = data.some(d => d.value > 0);
    const effectiveData = hasAny ? data : data.map(d => ({ ...d, value: 1 }));

    const SIZE = 180, R = SIZE / 2, INNER_R = R * 0.6;
    const pie = d3.pie<(typeof effectiveData)[0]>().value(d => d.value).padAngle(0.06).sortValues(null);
    const arc = d3.arc<d3.PieArcDatum<(typeof effectiveData)[0]>>().outerRadius(R - 2).innerRadius(INNER_R).cornerRadius(6);
    const pieData = pie(effectiveData);

    return pieData.map(d => ({
      path: arc(d) ?? "",
      color: hasAny ? d.data.color : "rgba(255,255,255,0.08)",
      name: d.data.name,
      value: d.data.value,
      label: d.data.label,
      isEmpty: !hasAny,
    }));
  }, [blocks]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className="rounded-[2rem] overflow-hidden mb-4"
      style={{ backgroundColor: "#0F172A" }}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex justify-between items-center">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Übungs-Balance</p>
          <p className="text-lg font-black text-white tracking-tight">Therapeutische Zusammensetzung</p>
        </div>
        <div className="px-3 py-1.5 rounded-[14px] border" style={{ backgroundColor: "rgba(19,115,134,0.25)", borderColor: "rgba(19,115,134,0.4)" }}>
          <span className="text-[13px] font-extrabold" style={{ color: "#22D3EE" }}>{totalBlocks} {totalBlocks === 1 ? "Block" : "Blöcke"}</span>
        </div>
      </div>

      {/* Donut + Legend */}
      <div className="flex items-center px-4 pb-5 gap-4">
        <svg width={180} height={180} viewBox="0 0 180 180">
          <g transform="translate(90,90)">
            {arcs.map((seg, i) => (
              <motion.path
                key={i}
                d={seg.path}
                fill={seg.color}
                opacity={seg.isEmpty ? 0.07 : 0.92}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: seg.isEmpty ? 0.07 : 0.92 }}
                transition={{ delay: i * 0.1, type: "spring" }}
              />
            ))}
          </g>
          <circle cx={90} cy={90} r={28} fill="rgba(255,255,255,0.04)" />
          <text x={90} y={83} textAnchor="middle" fill="#fff" fontSize={26} fontWeight="900">{totalBlocks}</text>
          <text x={90} y={101} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={8} fontWeight="700">{totalBlocks === 1 ? "BLOCK" : "BLÖCKE"}</text>
        </svg>

        <div className="flex-1 space-y-2.5">
          {ALL_CATEGORIES.map(cat => {
            const count = blocks.filter(b => CATEGORY_MAP[b.type]?.category === cat.name).length;
            const pct = totalBlocks > 0 ? Math.round((count / totalBlocks) * 100) : 0;
            const active = count > 0;
            return (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? cat.color : "rgba(255,255,255,0.12)" }} />
                    <span className="text-xs font-bold" style={{ color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)" }}>{cat.label} {cat.name}</span>
                  </div>
                  <span className="text-[11px] font-extrabold min-w-[30px] text-right" style={{ color: active ? cat.color : "rgba(255,255,255,0.2)" }}>{active ? `${pct}%` : "—"}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                  {active && <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full" style={{ backgroundColor: cat.color, opacity: 0.85 }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Tip */}
      <div className="mx-4 mb-4 rounded-2xl p-3.5 border flex items-center gap-2.5" style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(19,115,134,0.3)" }}>
          <span className="text-base">💡</span>
        </div>
        <span className="flex-1 text-xs font-medium leading-[17px]" style={{ color: "rgba(255,255,255,0.6)" }}>{tip.replace("💡 ", "")}</span>
      </div>
    </motion.div>
  );
}
