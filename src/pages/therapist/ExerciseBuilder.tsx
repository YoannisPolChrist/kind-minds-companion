import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown, Copy,
  Edit3, Activity, CircleDot, ListChecks, CheckCircle2, Heart,
  BookOpen, Clock, Wind, Image as ImageIcon, Film, Radar,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  Palette, Link as LinkIcon, X, Search,
  Gauge, Target, Table2, SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, PressableScale,
} from "../../components/motion";
import { Toast } from "../../components/ui/Toast";
import ExerciseFlowTimeline from "../../components/charts/ExerciseFlowTimeline";

import * as d3 from "d3";

// ─── Block Types ──────────────────────────────────────────────────────────────

type BlockType =
  | "reflection" | "scale" | "choice" | "checklist" | "homework"
  | "gratitude" | "info" | "timer" | "breathing" | "media" | "video"
  | "spider_chart" | "bar_chart" | "pie_chart" | "line_chart"
  | "progress_bar" | "mood_wheel" | "table" | "slider_group";

interface Block {
  id: string;
  type: BlockType;
  content: string;
  duration?: number;
  options?: string[];
  minLabel?: string;
  maxLabel?: string;
  mediaUri?: string;
  mediaType?: "image" | "video";
  mediaSize?: "small" | "medium" | "large";
  videoUrl?: string;
  // Progress bar
  progressLabel?: string;
  progressMax?: number;
  // Mood wheel
  moodOptions?: string[];
  // Table
  tableColumns?: string[];
  tableRows?: number;
  // Slider group
  sliders?: { label: string; min: number; max: number; step: number }[];
}

const CATALOGUE: {
  type: BlockType; label: string; icon: any; desc: string;
  accent: string; bg: string; text: string; border: string;
}[] = [
  { type: "reflection", label: "Reflektion", icon: Edit3, desc: "Freie Texteingabe", accent: "#3B82F6", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "scale", label: "Skala 1–10", icon: Activity, desc: "Numerische Bewertung", accent: "#F59E0B", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "choice", label: "Auswahl", icon: CircleDot, desc: "Einzelauswahl", accent: "#6366F1", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "checklist", label: "Checkliste", icon: ListChecks, desc: "Mehrfachauswahl", accent: "#10B981", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "homework", label: "ABC-Protokoll", icon: CheckCircle2, desc: "Verhaltens-Tagebuch", accent: "#C09D59", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "gratitude", label: "Dankbarkeit", icon: Heart, desc: "Dankbarkeits-Journal", accent: "#EC4899", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "info", label: "Info-Text", icon: BookOpen, desc: "Psychoedukation", accent: "#14B8A6", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "media", label: "Foto / Video", icon: ImageIcon, desc: "Medien-Upload", accent: "#F43F5E", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "video", label: "Web-Video", icon: Film, desc: "YouTube / Vimeo Link", accent: "#E11D48", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "timer", label: "Timer", icon: Clock, desc: "Countdown Start", accent: "#8B5CF6", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "breathing", label: "Atemübung", icon: Wind, desc: "4-4-4 Rhythmus", accent: "#137386", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "spider_chart", label: "Netzdiagramm", icon: Radar, desc: "Profilanalyse", accent: "#F97316", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "bar_chart", label: "Balkendiagramm", icon: BarChart3, desc: "Wertevergleich", accent: "#0EA5E9", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "pie_chart", label: "Kreisdiagramm", icon: PieChartIcon, desc: "Verteilung", accent: "#8B5CF6", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "line_chart", label: "Liniendiagramm", icon: LineChartIcon, desc: "Entwicklung", accent: "#10B981", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "progress_bar", label: "Fortschrittsbalken", icon: Gauge, desc: "Ziel-Tracking 0–100%", accent: "#06B6D4", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "mood_wheel", label: "Stimmungsrad", icon: Target, desc: "Emotionen visuell erfassen", accent: "#F472B6", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "table", label: "Tabelle", icon: Table2, desc: "Strukturierte Daten", accent: "#0D9488", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
  { type: "slider_group", label: "Slider-Bereich", icon: SlidersHorizontal, desc: "Parallele Bewertungen", accent: "#7C3AED", bg: "hsl(var(--secondary))", text: "hsl(var(--foreground))", border: "hsl(var(--border))" },
];

const CHART_PALETTE = ["#F97316", "#0EA5E9", "#10B981", "#8B5CF6", "#F43F5E", "#F59E0B", "#14B8A6", "#64748B", "#EC4899", "#3B82F6"];
const THEME_COLORS = ["#137386", "#3B82F6", "#8B5CF6", "#EC4899", "#F43F5E", "#F59E0B", "#10B981", "#64748B"];

const BLOCK_CATEGORIES: { label: string; types: BlockType[] }[] = [
  { label: "Schnellzugriff", types: ["reflection", "checklist", "scale", "info"] },
  { label: "📝 Interaktion", types: ["reflection", "scale", "choice", "checklist", "homework", "gratitude"] },
  { label: "📖 Inhalt", types: ["info", "media", "video"] },
  { label: "⏱ Zeit & Achtsamkeit", types: ["timer", "breathing"] },
  { label: "📊 Visualisierung", types: ["spider_chart", "bar_chart", "pie_chart", "line_chart", "progress_bar", "mood_wheel", "table", "slider_group"] },
];

function uid() { return Math.random().toString(36).substring(2, 9); }
function getCat(type: BlockType) { return CATALOGUE.find(c => c.type === type) || CATALOGUE[0]; }

function defaultBlock(type: BlockType): Block {
  const b: any = { id: uid(), type, content: "" };
  if (type === "timer" || type === "breathing") b.duration = 120;
  if (["choice", "checklist"].includes(type)) b.options = ["", ""];
  if (["spider_chart", "bar_chart", "pie_chart", "line_chart"].includes(type)) b.options = ["::", "::"];
  if (type === "scale") { b.minLabel = "Gar nicht"; b.maxLabel = "Sehr stark"; }
  return b as Block;
}

// ─── Chart Preview Components ─────────────────────────────────────────────────

function BarChartPreview({ options }: { options: string[] }) {
  const data = options.map((o, i) => {
    const [label, val, color] = o.split(":");
    return { label: label || "?", value: parseFloat(val || "0") || 0, color: color || CHART_PALETTE[i % CHART_PALETTE.length] };
  });
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const W = 320, H = 160, PAD = 40, BAR_PAD = 8;
  const barW = Math.max(12, (W - PAD * 2) / data.length - BAR_PAD);

  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4 mt-4">
      <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-3 text-center">Vorschau</p>
      <svg width={W} height={H} className="mx-auto block">
        {data.map((d, i) => {
          const x = PAD + i * (barW + BAR_PAD);
          const barH = (d.value / maxVal) * (H - 50);
          return (
            <g key={i}>
              <motion.rect
                x={x} width={barW} rx={6}
                y={H - 20 - barH} height={barH}
                fill={d.color}
                initial={{ height: 0, y: H - 20 }}
                animate={{ height: barH, y: H - 20 - barH }}
                transition={{ delay: i * 0.1, type: "spring", damping: 15 }}
              />
              <text x={x + barW / 2} y={H - 20 - barH - 6} textAnchor="middle" fontSize={10} fontWeight="700" fill={d.color}>{d.value}</text>
              <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={9} fontWeight="600" fill="hsl(var(--muted-foreground))">{d.label.slice(0, 6)}</text>
            </g>
          );
        })}
        <line x1={PAD - 4} y1={H - 20} x2={W - PAD + 4} y2={H - 20} stroke="hsl(var(--border))" strokeWidth={1} />
      </svg>
    </div>
  );
}

function PieChartPreview({ options }: { options: string[] }) {
  const data = options.map((o, i) => {
    const [label, val, color] = o.split(":");
    return { label: label || "?", value: parseFloat(val || "0") || 1, color: color || CHART_PALETTE[i % CHART_PALETTE.length] };
  });
  const SIZE = 160, R = SIZE / 2 - 8, IR = R * 0.5;
  const pie = d3.pie<(typeof data)[0]>().value(d => d.value).padAngle(0.04).sortValues(null);
  const arc = d3.arc<d3.PieArcDatum<(typeof data)[0]>>().outerRadius(R).innerRadius(IR).cornerRadius(4);
  const pieData = pie(data);

  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4 mt-4">
      <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-3 text-center">Vorschau</p>
      <div className="flex items-center gap-4 justify-center">
        <svg width={SIZE} height={SIZE}>
          <g transform={`translate(${SIZE / 2},${SIZE / 2})`}>
            {pieData.map((d, i) => (
              <motion.path key={i} d={arc(d) ?? ""} fill={d.data.color}
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 0.9 }}
                transition={{ delay: i * 0.1, type: "spring" }} />
            ))}
          </g>
        </svg>
        <div className="space-y-1.5">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-xs font-semibold text-foreground">{d.label}</span>
              <span className="text-[10px] font-bold text-muted-foreground">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LineChartPreview({ options }: { options: string[] }) {
  const data = options.map((o, i) => {
    const [label, val] = o.split(":");
    return { label: label || "?", value: parseFloat(val || "0") || 0 };
  });
  const W = 320, H = 140, PAD = 40;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const points = data.map((d, i) => ({
    x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
    y: H - 24 - (d.value / maxVal) * (H - 50),
    ...d,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4 mt-4">
      <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-3 text-center">Vorschau</p>
      <svg width={W} height={H} className="mx-auto block">
        <motion.path d={linePath} fill="none" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
        {points.map((p, i) => (
          <g key={i}>
            <motion.circle cx={p.x} cy={p.y} r={5} fill="#10B981" stroke="#fff" strokeWidth={2}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 + 0.3 }} />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={9} fontWeight="700" fill="#10B981">{p.value}</text>
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize={9} fontWeight="600" fill="hsl(var(--muted-foreground))">{p.label.slice(0, 4)}</text>
          </g>
        ))}
        <line x1={PAD - 4} y1={H - 24} x2={W - PAD + 4} y2={H - 24} stroke="hsl(var(--border))" strokeWidth={1} />
      </svg>
    </div>
  );
}

function SpiderChartPreview({ options }: { options: string[] }) {
  const data = options.map((o, i) => {
    const [label, val, color] = o.split(":");
    return { label: label || "?", value: Math.min(parseFloat(val || "0") || 0, 100), color: color || CHART_PALETTE[i % CHART_PALETTE.length] };
  });
  if (data.length < 3) return null;

  const SIZE = 200, CX = SIZE / 2, CY = SIZE / 2, R = SIZE / 2 - 30;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const pointsFn = (level: number) => data.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return { x: CX + Math.cos(angle) * R * level, y: CY + Math.sin(angle) * R * level };
  });

  const dataPoints = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.value / 100) * R;
    return { x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r };
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4 mt-4">
      <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-3 text-center">Vorschau</p>
      <svg width={SIZE} height={SIZE} className="mx-auto block">
        {gridLevels.map(level => {
          const pts = pointsFn(level);
          const gridPath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
          return <path key={level} d={gridPath} fill="none" stroke="hsl(var(--border))" strokeWidth={1} opacity={0.5} />;
        })}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return <line key={i} x1={CX} y1={CY} x2={CX + Math.cos(angle) * R} y2={CY + Math.sin(angle) * R} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.5} />;
        })}
        <motion.path d={dataPath} fill="#F97316" fillOpacity={0.2} stroke="#F97316" strokeWidth={2}
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }} style={{ transformOrigin: `${CX}px ${CY}px` }} />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={data[i].color} stroke="#fff" strokeWidth={2} />
        ))}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const lx = CX + Math.cos(angle) * (R + 16);
          const ly = CY + Math.sin(angle) * (R + 16);
          return <text key={i} x={lx} y={ly + 3} textAnchor="middle" fontSize={9} fontWeight="700" fill="hsl(var(--foreground))">{d.label.slice(0, 6)}</text>;
        })}
      </svg>
    </div>
  );
}

// ─── Chart Option Editor ──────────────────────────────────────────────────────

function ChartOptionEditor({ block, onChange, chartType }: {
  block: Block;
  onChange: (updates: Partial<Block>) => void;
  chartType: "spider_chart" | "bar_chart" | "pie_chart" | "line_chart";
}) {
  const cat = getCat(block.type);
  const isLine = chartType === "line_chart";
  const hasColor = !isLine;

  const parseOpt = (opt: string, i: number) => {
    const parts = opt.split(":");
    return { label: parts[0] || "", val: parts[1] || "", color: parts[2] || CHART_PALETTE[i % CHART_PALETTE.length] };
  };

  const updateOption = (i: number, label: string, val: string, color: string) => {
    const opts = [...(block.options || [])];
    opts[i] = isLine ? `${label}:${val}` : `${label}:${val}:${color}`;
    onChange({ options: opts });
  };

  const addOption = () => {
    const opts = [...(block.options || [])];
    opts.push(isLine ? ":" : "::");
    onChange({ options: opts });
  };

  const removeOption = (i: number) => {
    onChange({ options: (block.options || []).filter((_, idx) => idx !== i) });
  };

  const labels: Record<string, { title: string; labelPh: string; valPh: string; addLabel: string }> = {
    spider_chart: { title: "Kategorien & Werte (z.B. 0-100)", labelPh: "Kategorie", valPh: "Wert (z.B. 80)", addLabel: "+ Kategorie hinzufügen" },
    bar_chart: { title: "Kategorien & Werte", labelPh: "Parameter", valPh: "Wert", addLabel: "+ Parameter hinzufügen" },
    pie_chart: { title: "Kategorien & Werte", labelPh: "Segment", valPh: "Wert", addLabel: "+ Segment hinzufügen" },
    line_chart: { title: "Kategorien & Werte (Zeitpunkte/Datenpunkte)", labelPh: "X-Achse (z.B. Mo)", valPh: "Y-Wert", addLabel: "+ Datenpunkt hinzufügen" },
  };
  const l = labels[chartType];

  return (
    <>
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Titel / Fragestellung</label>
      <input value={block.content} onChange={e => onChange({ content: e.target.value })} placeholder="z.B. Werteprofil der Lebensbereiche"
        className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mt-2">{l.title}</label>
      <AnimatePresence>
        {(block.options || []).map((opt, i) => {
          const parsed = parseOpt(opt, i);
          return (
            <motion.div key={`opt-${i}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", damping: 20, delay: i * 0.05 }}
              className="flex items-center gap-2 mb-2"
            >
              {hasColor && (
                <button
                  onClick={() => {
                    const nextIdx = (CHART_PALETTE.indexOf(parsed.color) + 1) % CHART_PALETTE.length;
                    updateOption(i, parsed.label, parsed.val, CHART_PALETTE[nextIdx]);
                  }}
                  className="w-4 h-4 rounded-full shrink-0 border-2 border-border hover:scale-125 transition-transform"
                  style={{ backgroundColor: parsed.color }}
                />
              )}
              <input value={parsed.label} onChange={e => updateOption(i, e.target.value, parsed.val, parsed.color)}
                placeholder={`${l.labelPh} ${i + 1}...`}
                className="flex-[2] bg-secondary rounded-xl border border-border p-3 text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={parsed.val} onChange={e => updateOption(i, parsed.label, e.target.value, parsed.color)}
                placeholder={l.valPh} type="number"
                className="flex-1 bg-secondary rounded-xl border border-border p-3 text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
              {(block.options?.length || 0) > 2 && (
                <button onClick={() => removeOption(i)} className="text-destructive font-bold text-lg hover:scale-110 transition-transform">×</button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      <button onClick={addOption}
        className="w-full border-2 border-dashed border-border rounded-2xl py-3 text-center font-bold text-sm hover:border-primary/40 transition-colors"
        style={{ color: cat.accent }}
      >
        {l.addLabel}
      </button>

      {/* Live Chart Preview */}
      {chartType === "bar_chart" && <BarChartPreview options={block.options || []} />}
      {chartType === "pie_chart" && <PieChartPreview options={block.options || []} />}
      {chartType === "line_chart" && <LineChartPreview options={block.options || []} />}
      {chartType === "spider_chart" && <SpiderChartPreview options={block.options || []} />}
    </>
  );
}

// ─── Block Form Component ─────────────────────────────────────────────────────

function BlockForm({ block, onChange, onRemove, onMove, onDuplicate, isFirst, isLast }: {
  block: Block;
  onChange: (updates: Partial<Block>) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
  onDuplicate: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const cat = getCat(block.type);
  const Icon = cat.icon;

  const addOption = () => onChange({ options: [...(block.options || []), ""] });
  const removeOption = (i: number) => onChange({ options: (block.options || []).filter((_, idx) => idx !== i) });
  const updateOption = (i: number, val: string) => {
    const opts = [...(block.options || [])];
    opts[i] = val;
    onChange({ options: opts });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 180 }}
      className="rounded-[1.75rem] overflow-hidden border-2 bg-card shadow-sm"
      style={{ borderColor: `${cat.accent}50` }}
    >
      <div className="flex justify-center pt-2 pb-1" style={{ backgroundColor: cat.bg }}>
        <div className="w-12 h-1 rounded-full opacity-20" style={{ backgroundColor: cat.text }} />
      </div>

      <div className="flex items-center px-6 py-4 border-b-2" style={{ backgroundColor: cat.bg, borderBottomColor: `${cat.accent}30` }}>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mr-3.5 text-white" style={{ backgroundColor: cat.accent, boxShadow: `0 4px 12px ${cat.accent}40` }}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-extrabold text-foreground">{cat.label}</p>
          <p className="text-xs font-semibold text-muted-foreground">{cat.desc}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onMove("up")} disabled={isFirst} className="w-8 h-8 rounded-lg bg-background/60 flex items-center justify-center disabled:opacity-30 hover:bg-background transition-colors"><ChevronUp size={16} className="text-foreground" /></button>
          <button onClick={() => onMove("down")} disabled={isLast} className="w-8 h-8 rounded-lg bg-background/60 flex items-center justify-center disabled:opacity-30 hover:bg-background transition-colors"><ChevronDown size={16} className="text-foreground" /></button>
          <button onClick={onDuplicate} className="w-8 h-8 rounded-lg bg-background/60 flex items-center justify-center hover:bg-background transition-colors"><Copy size={14} className="text-foreground" /></button>
          <button onClick={onRemove} className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"><Trash2 size={14} className="text-destructive" /></button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* REFLECTION / INFO */}
        {(block.type === "reflection" || block.type === "info") && (
          <>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              {block.type === "info" ? "Psychoedukations-Text" : "Aufgabe / Frage an den Klienten"}
            </label>
            <textarea value={block.content} onChange={e => onChange({ content: e.target.value })}
              placeholder={block.type === "info" ? "Erkläre dem Klienten z.B. das ABC-Modell…" : "Was möchtest du reflektieren?"} rows={4}
              className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </>
        )}

        {/* SCALE */}
        {block.type === "scale" && (
          <>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Frage für die Skala</label>
            <input value={block.content} onChange={e => onChange({ content: e.target.value })} placeholder="z.B. Wie stark ist deine Anspannung?"
              className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Label 1 (links)</label>
                <input value={block.minLabel || ""} onChange={e => onChange({ minLabel: e.target.value })} placeholder="Gar nicht"
                  className="w-full bg-secondary rounded-xl border border-border p-3 text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Label 10 (rechts)</label>
                <input value={block.maxLabel || ""} onChange={e => onChange({ maxLabel: e.target.value })} placeholder="Sehr stark"
                  className="w-full bg-secondary rounded-xl border border-border p-3 text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex justify-between gap-1 pt-2">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">{i + 1}</div>
              ))}
            </div>
          </>
        )}

        {/* CHOICE / CHECKLIST */}
        {(block.type === "choice" || block.type === "checklist") && (
          <>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Frage</label>
            <input value={block.content} onChange={e => onChange({ content: e.target.value })} placeholder="z.B. Wie war deine Stimmung?"
              className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              {block.type === "choice" ? "Antwortmöglichkeiten (Einzelauswahl)" : "Checklisten-Elemente"}
            </label>
            <AnimatePresence>
              {(block.options || []).map((opt, i) => (
                <motion.div key={`opt-${i}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 mb-2">
                  <div className={`w-5 h-5 shrink-0 border-2 flex items-center justify-center ${block.type === "choice" ? "rounded-full" : "rounded-md"}`} style={{ borderColor: cat.accent }} />
                  <input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}...`}
                    className="flex-1 bg-secondary rounded-xl border border-border p-3 text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
                  {(block.options?.length || 0) > 2 && (
                    <button onClick={() => removeOption(i)} className="text-destructive font-bold text-lg hover:scale-110 transition-transform">×</button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <button onClick={addOption} className="w-full border-2 border-dashed border-border rounded-2xl py-3 text-center font-bold text-sm hover:border-primary/40 hover:text-primary transition-colors" style={{ color: cat.accent }}>
              + Option hinzufügen
            </button>
          </>
        )}

        {/* HOMEWORK */}
        {block.type === "homework" && (
          <>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Aufgabe / Anweisung</label>
            <textarea value={block.content} onChange={e => onChange({ content: e.target.value })} placeholder="z.B. Notiere täglich eine belastende Situation…" rows={3}
              className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="bg-secondary rounded-2xl border border-border p-4">
              <p className="text-sm font-extrabold text-foreground mb-3">📝 ABC-Protokoll Vorlage</p>
              {["A – Auslöser: Was ist passiert?", "B – Bewertung: Was habe ich gedacht?", "C – Konsequenz: Was habe ich gefühlt?"].map(r => (
                <div key={r} className="flex items-start gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: cat.accent }} />
                  <p className="text-sm text-foreground font-medium">{r}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* GRATITUDE */}
        {block.type === "gratitude" && (
          <>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Anweisung an den Klienten</label>
            <input value={block.content} onChange={e => onChange({ content: e.target.value })} placeholder="z.B. Notiere 3 Dinge, für die du heute dankbar bist…"
              className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-3">
              {["1.", "2.", "3."].map(n => (
                <div key={n} className="flex-1 bg-secondary rounded-2xl border border-border py-5 flex flex-col items-center">
                  <span className="text-2xl">🙏</span>
                  <span className="text-sm font-extrabold mt-1" style={{ color: cat.accent }}>{n}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* MEDIA */}
        {block.type === "media" && (
          <>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Beschreibung zum Medium</label>
            <textarea value={block.content} onChange={e => onChange({ content: e.target.value })} placeholder="z.B. Schau dir dieses Bild an…" rows={2}
              className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Bild-URL (optional)</label>
            <div className="flex items-center gap-2 bg-secondary rounded-2xl border border-border p-3">
              <LinkIcon size={16} className="text-muted-foreground shrink-0" />
              <input value={block.mediaUri || ""} onChange={e => onChange({ mediaUri: e.target.value })} placeholder="https://..."
                className="flex-1 bg-transparent text-foreground text-sm font-medium focus:outline-none" />
            </div>
            {block.mediaUri && (
              <div className="rounded-2xl overflow-hidden border border-border h-48 bg-muted">
                <img src={block.mediaUri} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex gap-2">
              {(["small", "medium", "large"] as const).map(size => {
                const active = block.mediaSize === size || (!block.mediaSize && size === "medium");
                const labels = { small: "Klein", medium: "Mittel", large: "Vollbild" };
                return (
                  <button key={size} onClick={() => onChange({ mediaSize: size })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
                    {labels[size]}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* VIDEO */}
        {block.type === "video" && (
          <>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Titel / Beschreibung</label>
            <textarea value={block.content} onChange={e => onChange({ content: e.target.value })} placeholder="z.B. Schau dir dieses Achtsamkeits-Video an…" rows={2}
              className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">YouTube / Vimeo URL</label>
            <div className="flex items-center gap-2 bg-secondary rounded-2xl border border-border p-3">
              <Film size={16} className="text-muted-foreground shrink-0" />
              <input value={block.videoUrl || ""} onChange={e => onChange({ videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 bg-transparent text-foreground text-sm font-medium focus:outline-none" />
            </div>
          </>
        )}

        {/* TIMER / BREATHING */}
        {(block.type === "timer" || block.type === "breathing") && (
          <>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              {block.type === "breathing" ? "Anweisung zur Atemübung" : "Anweisung / Beschreibung"}
            </label>
            <input value={block.content} onChange={e => onChange({ content: e.target.value })}
              placeholder={block.type === "breathing" ? "z.B. Atme ruhig und gleichmäßig." : "z.B. Halte inne und entspanne dich."}
              className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex items-center justify-between bg-secondary rounded-2xl border border-border p-4">
              <span className="text-sm font-extrabold text-foreground">Dauer</span>
              <div className="flex gap-2">
                {[30, 60, 120, 300].map(sec => {
                  const active = block.duration === sec;
                  return (
                    <button key={sec} onClick={() => onChange({ duration: sec })}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${active ? "text-white shadow-md" : "bg-background text-muted-foreground"}`}
                      style={active ? { backgroundColor: cat.accent, boxShadow: `0 3px 8px ${cat.accent}40` } : {}}>
                      {sec < 60 ? `${sec}s` : `${sec / 60}min`}
                    </button>
                  );
                })}
              </div>
            </div>
            {block.type === "breathing" && (
              <div className="flex justify-around bg-secondary rounded-2xl border border-border p-4">
                {["4s Einatmen", "4s Halten", "4s Ausatmen"].map(phase => (
                  <div key={phase} className="text-center">
                    <span className="text-2xl">🌬️</span>
                    <p className="text-xs font-bold text-muted-foreground mt-1">{phase}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* CHART BLOCKS with live previews */}
        {(["spider_chart", "bar_chart", "pie_chart", "line_chart"] as const).includes(block.type as any) && (
          <ChartOptionEditor block={block} onChange={onChange} chartType={block.type as any} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExerciseBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [title, setTitle] = useState("");
  const [themeColor, setThemeColor] = useState(THEME_COLORS[0]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: "success" | "error" }>({ visible: false, message: "", type: "success" });

  useEffect(() => {
    if (isNew || !id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "exercise_templates", id));
        if (snap.exists()) {
          const data = snap.data();
          setTitle(data.title || "");
          setThemeColor(data.themeColor || THEME_COLORS[0]);
          setBlocks(data.blocks || []);
        }
      } catch (e) {
        console.error("Failed to load template:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const updateBlock = useCallback((blockId: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b));
  }, []);
  const removeBlock = useCallback((blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  }, []);
  const moveBlock = useCallback((blockId: string, dir: "up" | "down") => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }, []);
  const duplicateBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (idx < 0) return prev;
      const copy = { ...prev[idx], id: uid() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);
  const addBlock = useCallback((type: BlockType) => {
    setBlocks(prev => [...prev, defaultBlock(type)]);
    setShowCatalogue(false);
  }, []);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = { title: title.trim(), themeColor, blocks, therapistId: profile?.id, updatedAt: serverTimestamp() };
      if (isNew) {
        await addDoc(collection(db, "exercise_templates"), { ...payload, createdAt: serverTimestamp() });
      } else if (id) {
        await updateDoc(doc(db, "exercise_templates", id), payload);
      }
      setToast({ visible: true, message: isNew ? "Vorlage erstellt!" : "Vorlage gespeichert!", type: "success" });
      setTimeout(() => navigate("/therapist/templates"), 1200);
    } catch (e) {
      console.error("Save failed:", e);
      setToast({ visible: true, message: "Fehler beim Speichern", subMessage: "Bitte versuche es erneut.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="rounded-b-[2rem] relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)` }}>
        <HeaderOrbs />
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-8 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <motion.button onClick={() => navigate("/therapist/templates")} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl text-sm font-bold text-white" whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft size={16} /> Zurück
            </motion.button>
            <motion.button onClick={handleSave} disabled={saving || !title.trim()} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              {saving ? <motion.span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <Save size={16} />}
              {saving ? "Speichern…" : "Speichern"}
            </motion.button>
          </div>

          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Übungstitel eingeben…"
            className="w-full text-3xl font-black text-white bg-transparent placeholder-white/50 focus:outline-none mb-3 tracking-tight" />
          <p className="text-white/60 text-sm font-medium">{blocks.length} {blocks.length === 1 ? "Modul" : "Module"} · {isNew ? "Neue Vorlage" : "Bearbeiten"}</p>

          <div className="flex items-center gap-3 mt-5">
            <Palette size={16} className="text-white/60" />
            <div className="flex gap-2">
              {THEME_COLORS.map(c => (
                <button key={c} onClick={() => setThemeColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${themeColor === c ? "border-white scale-125 shadow-lg" : "border-white/30 hover:scale-110"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Analytics Widgets */}
        {blocks.length > 0 && (
          <div className="mb-6">
            <ExerciseFlowTimeline blocks={blocks} />
          </div>
        )}

        {/* Blocks */}
        <div className="space-y-5">
          <AnimatePresence mode="popLayout">
            {blocks.map((block, idx) => (
              <BlockForm
                key={block.id}
                block={block}
                onChange={updates => updateBlock(block.id, updates)}
                onRemove={() => removeBlock(block.id)}
                onMove={dir => moveBlock(block.id, dir)}
                onDuplicate={() => duplicateBlock(block.id)}
                isFirst={idx === 0}
                isLast={idx === blocks.length - 1}
              />
            ))}
          </AnimatePresence>

          {/* Add Block Button */}
          <motion.button
            onClick={() => setShowCatalogue(true)}
            className="w-full border-2 border-dashed border-border rounded-[1.75rem] py-8 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus size={24} className="text-primary" />
            </div>
            <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">Modul hinzufügen</span>
          </motion.button>
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border px-6 py-4 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">{title || "Ohne Titel"}</p>
            <p className="text-xs text-muted-foreground">{blocks.length} Module</p>
          </div>
          <motion.button onClick={handleSave} disabled={saving || !title.trim()}
            className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-black disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-primary/20"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            {saving ? <motion.span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <Save size={16} />}
            Speichern
          </motion.button>
        </div>
      </div>

      {/* Block Catalogue Modal with Search + Categories */}
      <AnimatePresence>
        {showCatalogue && (
          <CatalogueModal onAdd={addBlock} onClose={() => setShowCatalogue(false)} />
        )}
      </AnimatePresence>

      <Toast visible={toast.visible} message={toast.message} subMessage={toast.subMessage} type={toast.type} onDone={() => setToast(prev => ({ ...prev, visible: false }))} />
    </PageTransition>
  );
}

// ─── Catalogue Modal ──────────────────────────────────────────────────────────

function CatalogueModal({ onAdd, onClose }: { onAdd: (type: BlockType) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Schnellzugriff");

  const quickTypes: BlockType[] = ["reflection", "checklist", "scale", "info"];

  const filteredCatalogue = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return CATALOGUE.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
    }
    const cat = BLOCK_CATEGORIES.find(c => c.label === activeCategory);
    if (!cat) return CATALOGUE;
    return CATALOGUE.filter(c => cat.types.includes(c.type));
  }, [search, activeCategory]);

  return (
    <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="bg-card rounded-t-3xl sm:rounded-3xl border border-border w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card/95 backdrop-blur-xl z-10">
          <div>
            <h2 className="text-lg font-black text-foreground">Block hinzufügen</h2>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">{CATALOGUE.length} Blocktypen verfügbar</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary"><X size={20} className="text-muted-foreground" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick-add Pills */}
          <div>
            <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2.5">Häufig verwendet</p>
            <div className="flex gap-2 flex-wrap">
              {quickTypes.map(type => {
                const cat = getCat(type);
                const Icon = cat.icon;
                return (
                  <motion.button key={type} onClick={() => onAdd(type)}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-[20px] border font-extrabold text-sm"
                    style={{ backgroundColor: cat.bg, borderColor: cat.border, color: cat.text }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Icon size={16} style={{ color: cat.accent }} />
                    {cat.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 bg-secondary rounded-2xl border border-border px-4 py-3">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Block suchen…"
              className="flex-1 bg-transparent text-foreground font-semibold focus:outline-none placeholder:text-muted-foreground" />
            {search.length > 0 && (
              <button onClick={() => setSearch("")} className="text-muted-foreground font-bold text-lg">×</button>
            )}
          </div>

          {/* Category Tabs */}
          {!search.trim() && (
            <div className="flex gap-2 flex-wrap">
              {BLOCK_CATEGORIES.filter(c => c.label !== "Schnellzugriff").map(cat => {
                const isActive = activeCategory === cat.label;
                return (
                  <button key={cat.label} onClick={() => setActiveCategory(cat.label)}
                    className={`px-3.5 py-2 rounded-2xl text-[13px] font-extrabold border transition-all ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:border-primary/30"}`}>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Block Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredCatalogue.map(cat => {
              const Icon = cat.icon;
              return (
                <motion.button key={cat.type} onClick={() => onAdd(cat.type)}
                  className="bg-secondary rounded-2xl border border-border p-4 text-left hover:border-primary/30 transition-all group"
                  whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white" style={{ backgroundColor: cat.accent }}>
                    <Icon size={18} />
                  </div>
                  <p className="text-sm font-bold text-foreground">{cat.label}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{cat.desc}</p>
                </motion.button>
              );
            })}
            {filteredCatalogue.length === 0 && (
              <div className="col-span-full text-center py-10">
                <span className="text-3xl block mb-2">🔍</span>
                <p className="text-sm font-bold text-muted-foreground">Kein Block gefunden</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
