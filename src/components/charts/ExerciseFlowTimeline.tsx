/**
 * ExerciseFlowTimeline — Web version
 * Horizontal node-link diagram using D3 for layout
 */

import { useMemo } from "react";
import * as d3 from "d3";
import { motion } from "motion/react";

type BlockType =
  | "reflection" | "scale" | "choice" | "checklist" | "homework"
  | "gratitude" | "info" | "timer" | "breathing" | "media" | "video"
  | "spider_chart" | "bar_chart" | "pie_chart" | "line_chart";

interface Block { id: string; type: BlockType; [key: string]: any; }

const BLOCK_META: Record<BlockType, { color: string; icon: string; short: string }> = {
  reflection: { color: "#3B82F6", icon: "✍️", short: "Refl." },
  info: { color: "#14B8A6", icon: "📖", short: "Info" },
  homework: { color: "#C09D59", icon: "📝", short: "ABC" },
  scale: { color: "#F59E0B", icon: "📊", short: "Skala" },
  choice: { color: "#6366F1", icon: "🔘", short: "Wahl" },
  checklist: { color: "#10B981", icon: "✅", short: "Liste" },
  gratitude: { color: "#EC4899", icon: "🙏", short: "Dank." },
  breathing: { color: "#137386", icon: "🌬️", short: "Atem" },
  timer: { color: "#8B5CF6", icon: "⏱️", short: "Timer" },
  media: { color: "#F43F5E", icon: "📸", short: "Medien" },
  video: { color: "#E11D48", icon: "🎥", short: "Video" },
  spider_chart: { color: "#F97316", icon: "🕸️", short: "Netz" },
  bar_chart: { color: "#0EA5E9", icon: "📈", short: "Balken" },
  pie_chart: { color: "#8B5CF6", icon: "🥧", short: "Kreis" },
  line_chart: { color: "#10B981", icon: "📉", short: "Linie" },
};

const NODE_R = 22;
const H = 80;
const PAD = 16;

export default function ExerciseFlowTimeline({ blocks }: { blocks: Block[] }) {
  const { nodes, links, svgWidth } = useMemo(() => {
    if (blocks.length === 0) return { nodes: [], links: [], svgWidth: 100 };
    const minNodeSpacing = NODE_R * 2 + 28;
    const totalWidth = Math.max(300, PAD * 2 + blocks.length * minNodeSpacing);
    const xScale = d3.scaleBand().domain(blocks.map((_, i) => String(i))).range([PAD + NODE_R, totalWidth - PAD - NODE_R]).padding(0);
    const CY = H / 2;

    const nodes = blocks.map((b, i) => ({
      x: (xScale(String(i)) ?? 0) + xScale.bandwidth() / 2,
      y: CY,
      block: b,
      meta: BLOCK_META[b.type],
      index: i,
    }));

    const linkGen = d3.linkHorizontal<any, any>().x((d: any) => d.x).y((d: any) => d.y);
    const links = nodes.slice(0, -1).map((src, i) => ({
      path: linkGen({ source: src, target: nodes[i + 1] }) ?? "",
      color: src.meta.color,
    }));

    return { nodes, links, svgWidth: totalWidth };
  }, [blocks]);

  if (blocks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 20 }}
      className="bg-card rounded-3xl border border-border mb-4 overflow-hidden shadow-sm"
    >
      <div className="px-[18px] pt-3.5 pb-1.5 flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold text-foreground tracking-wide">Übungs-Flow</p>
          <p className="text-[10px] text-muted-foreground font-medium">Reihenfolge der Blöcke</p>
        </div>
        {svgWidth > 340 && <p className="text-[9px] text-muted-foreground/40 font-semibold">← scrollen →</p>}
      </div>

      <div className="overflow-x-auto pb-1">
        <svg width={svgWidth} height={H}>
          {links.map((link, i) => (
            <motion.path
              key={`link-${i}`}
              d={link.path}
              fill="none"
              stroke={link.color}
              strokeWidth={2.5}
              strokeOpacity={0.35}
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            />
          ))}
          {nodes.map((node, i) => (
            <g key={node.block.id} transform={`translate(${node.x},${node.y})`}>
              <motion.circle r={NODE_R + 5} fill={node.meta.color} opacity={0.1} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08, type: "spring" }} />
              <motion.circle r={NODE_R} fill={node.meta.color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08 + 0.05, type: "spring" }} />
              <circle cx={NODE_R - 2} cy={-NODE_R + 2} r={9} fill="#FFFFFF" />
              <text x={NODE_R - 2} y={-NODE_R + 6} textAnchor="middle" fill={node.meta.color} fontSize={9} fontWeight="800">{i + 1}</text>
              <text x={0} y={5} textAnchor="middle" fontSize={18}>{node.meta.icon}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="flex" style={{ minWidth: svgWidth }}>
          {nodes.map(node => (
            <div key={`label-${node.block.id}`} className="flex-1 min-w-[60px] max-w-[80px] text-center">
              <span className="text-[9px] font-bold" style={{ color: node.meta.color }}>{node.meta.short}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
