import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowLeft, CheckCircle, Edit3, Activity, CircleDot, ListChecks,
  CheckCircle2, Heart, BookOpen, Clock, Wind, Image as ImageIcon,
  Film, Lock, Unlock, Download, Radar, BarChart3,
  PieChart as PieChartIcon, LineChart as LineChartIcon,
  Gauge, Target, Table2, SlidersHorizontal,
} from "lucide-react";
import { generateExercisePdf } from "../utils/generateExercisePdf";
import { motion, AnimatePresence } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs,
  SuccessAnimation, BreathingCircle,
} from "../components/motion";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveRadar } from "@nivo/radar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseBlock {
  id: string;
  type: string;
  content?: string;
  options?: string[];
  minLabel?: string;
  maxLabel?: string;
  duration?: number;
  mediaUri?: string;
  videoUrl?: string;
  mediaSize?: "small" | "medium" | "large";
  mediaType?: "image" | "video";
  progressLabel?: string;
  progressMax?: number;
  moodOptions?: string[];
  tableColumns?: string[];
  tableRows?: number;
  sliders?: { label: string; min: number; max: number; step: number }[];
}

interface ExerciseData {
  id: string;
  title: string;
  completed?: boolean;
  completedAt?: string;
  lastCompletedAt?: string;
  blocks?: ExerciseBlock[];
  answers?: Record<string, string>;
  themeColor?: string;
  therapistId?: string;
  recurrence?: string;
  coverImage?: string;
}

type Answers = Record<string, string>;

const HEADER_IMAGES = [
  "/images/HomeUi1.webp", "/images/HomeUi2.webp", "/images/HomeUi3.webp",
  "/images/HomeUi4.webp", "/images/HomeUi5.webp", "/images/HomeUi6.webp",
];
const headerImg = HEADER_IMAGES[Math.floor(Math.random() * HEADER_IMAGES.length)];

const CHART_PALETTE = ["#137386", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#3B82F6", "#14B8A6", "#F97316"];

// ─── Block Catalogue ──────────────────────────────────────────────────────────

const BLOCK_META: Record<string, { label: string; desc: string; accent: string; icon: typeof Edit3 }> = {
  reflection: { label: "Reflektion", desc: "Freie Texteingabe", accent: "#3B82F6", icon: Edit3 },
  text: { label: "Reflektion", desc: "Freie Texteingabe", accent: "#3B82F6", icon: Edit3 },
  scale: { label: "Skala 1–10", desc: "Numerische Bewertung", accent: "#F59E0B", icon: Activity },
  choice: { label: "Auswahl", desc: "Einzelauswahl", accent: "#6366F1", icon: CircleDot },
  checklist: { label: "Checkliste", desc: "Mehrfachauswahl", accent: "#10B981", icon: ListChecks },
  homework: { label: "ABC-Protokoll", desc: "Verhaltens-Tagebuch", accent: "#C09D59", icon: CheckCircle2 },
  gratitude: { label: "Dankbarkeit", desc: "Dankbarkeits-Journal", accent: "#EC4899", icon: Heart },
  info: { label: "Info-Text", desc: "Psychoedukation", accent: "#14B8A6", icon: BookOpen },
  media: { label: "Foto / Video", desc: "Medien-Upload", accent: "#F43F5E", icon: ImageIcon },
  video: { label: "Web-Video", desc: "YouTube / Vimeo Link", accent: "#E11D48", icon: Film },
  timer: { label: "Timer", desc: "Countdown Start", accent: "#8B5CF6", icon: Clock },
  breathing: { label: "Atemübung", desc: "4-4-4 Rhythmus", accent: "#137386", icon: Wind },
  spider_chart: { label: "Netzdiagramm", desc: "Profilanalyse", accent: "#F97316", icon: Radar },
  bar_chart: { label: "Balkendiagramm", desc: "Wertevergleich", accent: "#0EA5E9", icon: BarChart3 },
  pie_chart: { label: "Kreisdiagramm", desc: "Verteilung", accent: "#8B5CF6", icon: PieChartIcon },
  line_chart: { label: "Liniendiagramm", desc: "Entwicklung", accent: "#10B981", icon: LineChartIcon },
  progress_bar: { label: "Fortschrittsbalken", desc: "Ziel-Tracking", accent: "#06B6D4", icon: Gauge },
  mood_wheel: { label: "Stimmungsrad", desc: "Emotionen erfassen", accent: "#F472B6", icon: Target },
  table: { label: "Tabelle", desc: "Strukturierte Daten", accent: "#0D9488", icon: Table2 },
  slider_group: { label: "Slider-Bereich", desc: "Parallele Bewertungen", accent: "#7C3AED", icon: SlidersHorizontal },
};

function getMeta(type: string) {
  return BLOCK_META[type] || BLOCK_META.reflection;
}

// ─── Block Components ─────────────────────────────────────────────────────────

function ReflectionBlock({ block, value, onChange, disabled }: { block: ExerciseBlock; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      {block.content && <p className="text-foreground font-medium mb-4 leading-relaxed">{block.content}</p>}
      {block.type !== "info" && (
        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Deine Reflektion</label>
          <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Schreibe deine Gedanken hier auf..." rows={5} disabled={disabled}
            className="w-full bg-secondary rounded-2xl border border-border p-4 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
        </div>
      )}
    </div>
  );
}

function ScaleBlock({ block, value, onChange, disabled }: { block: ExerciseBlock; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const meta = getMeta("scale");
  return (
    <div>
      {block.content && <p className="text-foreground font-semibold mb-4 text-center leading-relaxed">{block.content}</p>}
      <div className="flex justify-between text-xs font-semibold mb-3 px-1 text-muted-foreground">
        <span>{block.minLabel || "Gar nicht"}</span>
        <span>{block.maxLabel || "Sehr stark"}</span>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
          const selected = value === String(num);
          return (
            <motion.button key={num} onClick={() => !disabled && onChange(String(num))}
              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-sm transition-all ${selected ? "text-white shadow-lg" : "bg-secondary text-foreground border border-border"}`}
              style={{ backgroundColor: selected ? meta.accent : undefined, boxShadow: selected ? `0 4px 12px ${meta.accent}40` : undefined }}>
              {num}
            </motion.button>
          );
        })}
      </div>
      {value && <p className="text-center text-sm font-bold mt-3" style={{ color: meta.accent }}>Gewählt: {value} / 10</p>}
    </div>
  );
}

function ChoiceBlock({ block, value, onChange, disabled }: { block: ExerciseBlock; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const meta = getMeta("choice");
  return (
    <div>
      {block.content && <p className="text-foreground font-semibold mb-4 leading-relaxed">{block.content}</p>}
      <div className="space-y-2.5">
        {(block.options || []).map((opt, i) => {
          const selected = value === opt;
          return (
            <motion.button key={i} onClick={() => !disabled && onChange(opt)}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className={`w-full text-left px-4 py-4 rounded-2xl font-medium flex items-center gap-3.5 transition-all ${selected ? "shadow-md" : "bg-secondary border border-border hover:border-primary/30"}`}
              style={{ backgroundColor: selected ? `${meta.accent}15` : undefined, border: selected ? `2px solid ${meta.accent}` : undefined }}>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: selected ? meta.accent : "hsl(var(--border))", backgroundColor: selected ? meta.accent : "transparent" }}>
                {selected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className={`${selected ? "font-bold" : "font-medium"} text-foreground`}>{opt}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ChecklistBlock({ block, value, onChange, disabled }: { block: ExerciseBlock; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const meta = getMeta("checklist");
  let checked: string[] = [];
  try { checked = JSON.parse(value || "[]"); } catch {}
  const toggle = (opt: string) => {
    if (disabled) return;
    const next = checked.includes(opt) ? checked.filter((c) => c !== opt) : [...checked, opt];
    onChange(JSON.stringify(next));
  };
  return (
    <div>
      {block.content && <p className="text-foreground font-semibold mb-4 leading-relaxed">{block.content}</p>}
      <div className="space-y-2.5">
        {(block.options || []).map((opt, i) => {
          const isChecked = checked.includes(opt);
          return (
            <motion.button key={i} onClick={() => toggle(opt)}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className={`w-full text-left px-4 py-4 rounded-2xl font-medium flex items-center gap-3.5 transition-all ${isChecked ? "shadow-sm" : "bg-secondary border border-border hover:border-primary/30"}`}
              style={{ backgroundColor: isChecked ? `${meta.accent}12` : undefined, border: isChecked ? `2px solid ${meta.accent}` : undefined }}>
              <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 text-xs font-black"
                style={{ borderColor: isChecked ? meta.accent : "hsl(var(--border))", backgroundColor: isChecked ? meta.accent : "transparent", color: isChecked ? "#fff" : "transparent" }}>
                ✓
              </div>
              <span className={`${isChecked ? "font-bold" : "font-medium"} text-foreground`}>{opt}</span>
            </motion.button>
          );
        })}
      </div>
      {checked.length > 0 && <p className="text-sm font-bold mt-3" style={{ color: meta.accent }}>{checked.length}/{block.options?.length} erledigt</p>}
    </div>
  );
}

const ABC_FIELDS = [
  { key: "A", label: "A – Auslöser", hint: "Was ist passiert? (Situation, Ort, Zeit)" },
  { key: "B", label: "B – Bewertung", hint: "Was habe ich gedacht / bewertet?" },
  { key: "C", label: "C – Konsequenz", hint: "Was habe ich gefühlt / getan? (0–10)" },
];

function HomeworkBlock({ block, answers, onAnswerChange, disabled }: { block: ExerciseBlock; answers: Answers; onAnswerChange: (k: string, v: string) => void; disabled?: boolean }) {
  return (
    <div>
      {block.content && <p className="text-foreground font-medium mb-4 leading-relaxed">{block.content}</p>}
      <div className="rounded-2xl p-4 bg-secondary border border-border">
        <p className="text-sm font-extrabold text-foreground mb-3">📝 ABC-Protokoll</p>
        {ABC_FIELDS.map((field) => (
          <div key={field.key} className="mb-3">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{field.label}</label>
            <textarea placeholder={field.hint} value={answers[`${block.id}_${field.key}`] || ""} onChange={(e) => onAnswerChange(`${block.id}_${field.key}`, e.target.value)} rows={3} disabled={disabled}
              className="w-full bg-background rounded-2xl border border-border p-3 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 text-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

function GratitudeBlock({ block, answers, onAnswerChange, disabled }: { block: ExerciseBlock; answers: Answers; onAnswerChange: (k: string, v: string) => void; disabled?: boolean }) {
  const meta = getMeta("gratitude");
  return (
    <div>
      {block.content && <p className="text-foreground font-medium mb-4 leading-relaxed">{block.content}</p>}
      <div className="flex gap-3 mb-4">
        {["1.", "2.", "3."].map((n) => (
          <div key={n} className="flex-1 rounded-2xl border border-border py-5 flex flex-col items-center bg-secondary">
            <span className="text-2xl">🙏</span>
            <span className="text-sm font-extrabold mt-1" style={{ color: meta.accent }}>{n}</span>
          </div>
        ))}
      </div>
      {[1, 2, 3].map((n) => (
        <div key={n} className="mb-3">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{n}. Ich bin dankbar für...</label>
          <input placeholder="Schreibe hier..." value={answers[`${block.id}_${n}`] || ""} onChange={(e) => onAnswerChange(`${block.id}_${n}`, e.target.value)} disabled={disabled}
            className="w-full bg-secondary rounded-2xl border border-border p-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" />
        </div>
      ))}
    </div>
  );
}

function TimerBlock({ block }: { block: ExerciseBlock }) {
  const isBreathing = block.type === "breathing";
  const totalSecs = block.duration || 60;
  const [timeLeft, setTimeLeft] = useState(totalSecs);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathPhases = ["Einatmen", "Halten", "Ausatmen", "Halten"];
  const phaseDuration = 4;
  const elapsed = totalSecs - timeLeft;
  const currentPhase = isBreathing && running ? breathPhases[Math.floor(elapsed / phaseDuration) % 4] : null;

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeLeft <= 0) setRunning(false);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, timeLeft]);

  const toggle = () => {
    if (timeLeft <= 0) { setTimeLeft(totalSecs); setRunning(true); }
    else setRunning(!running);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center py-6">
      {block.content && <p className="text-muted-foreground text-center mb-4 text-sm">{block.content}</p>}
      {currentPhase && (
        <motion.p className="text-xl font-bold mb-3 text-primary" key={currentPhase} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 16 }}>
          {currentPhase}
        </motion.p>
      )}
      {isBreathing && !running && timeLeft === totalSecs && <p className="text-xs text-muted-foreground mb-3">4-4-4 Atemrhythmus</p>}
      <BreathingCircle running={running} isBreathing={isBreathing}>
        <span className={`text-4xl font-extrabold ${running ? "text-white" : "text-foreground"}`}>{mins}:{secs}</span>
        {running && <span className="text-xs text-white/60 mt-1">läuft...</span>}
      </BreathingCircle>
      <motion.button onClick={toggle} className="px-12 py-3.5 rounded-full text-white font-extrabold text-base"
        style={{ backgroundColor: running ? "hsl(var(--destructive))" : (isBreathing ? "#14B8A6" : "hsl(var(--primary))") }}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        {running ? "⏸ Stop" : "▶ Starten"}
      </motion.button>
    </div>
  );
}

function InfoBlock({ block }: { block: ExerciseBlock }) {
  return (
    <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
      {block.content && <p className="text-foreground font-medium leading-relaxed">{block.content}</p>}
      {!block.content && <p className="text-muted-foreground text-sm italic">ℹ️ Information</p>}
    </div>
  );
}

function MediaBlock({ block }: { block: ExerciseBlock }) {
  if (!block.mediaUri) return null;
  const height = block.mediaSize === "small" ? "h-32" : block.mediaSize === "large" ? "h-72" : "h-48";
  return (
    <div>
      {block.content && <p className="text-foreground font-medium mb-3 leading-relaxed">{block.content}</p>}
      <div className={`w-full ${height} bg-muted rounded-2xl overflow-hidden border border-border`}>
        {block.mediaType === "video" ? (
          <video src={block.mediaUri} controls className="w-full h-full object-cover" />
        ) : (
          <img src={block.mediaUri} alt="" className="w-full h-full object-cover" />
        )}
      </div>
    </div>
  );
}

function VideoBlock({ block }: { block: ExerciseBlock }) {
  const url = block.videoUrl || block.content;
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  const embedUrl = match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : url;
  return (
    <div>
      {block.content && block.content !== block.videoUrl && <p className="text-foreground font-medium mb-3 leading-relaxed">{block.content}</p>}
      <div className="w-full h-56 rounded-2xl overflow-hidden border border-border bg-muted">
        <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video" />
      </div>
    </div>
  );
}

// ─── Interactive Chart Block (Nivo) ───────────────────────────────────────────

function InteractiveChartBlock({ block, value, onChange, disabled }: {
  block: ExerciseBlock; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const currentValues: Record<string, number> = useMemo(() => {
    try { return value ? JSON.parse(value) : {}; } catch { return {}; }
  }, [value]);

  useEffect(() => {
    const t = setTimeout(() => setHasAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const updateValue = (label: string, valStr: string) => {
    if (disabled) return;
    const next = { ...currentValues };
    const num = parseFloat(valStr);
    if (isNaN(num)) delete next[label]; else next[label] = num;
    onChange(JSON.stringify(next));
  };

  const data = useMemo(() => (block.options ?? []).map((opt, i) => {
    const parts = opt.split(":");
    const label = parts[0] || `Option ${i + 1}`;
    const defaultVal = parseFloat(parts[1] || "0");
    const color = parts[2] || CHART_PALETTE[i % CHART_PALETTE.length];
    const currentVal = currentValues[label] !== undefined ? currentValues[label] : defaultVal;
    return { label, currentVal, color };
  }), [block.options, currentValues]);

  const nivoTheme = {
    text: { fontSize: 12, fontWeight: 600 },
    axis: { ticks: { text: { fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 } } },
    grid: { line: { stroke: "hsl(var(--border))", strokeWidth: 1 } },
    tooltip: { container: { background: "hsl(var(--card))", borderRadius: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", border: "1px solid hsl(var(--border))", fontSize: 13, fontWeight: 700, padding: "10px 14px" } },
  };

  const renderChart = () => {
    if (data.length === 0) return (
      <motion.div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <span className="text-3xl">📊</span>
        <span>Keine Daten</span>
      </motion.div>
    );

    if (block.type === "bar_chart") {
      const barData = data.map(d => ({ label: d.label, wert: d.currentVal, color: d.color }));
      return (
        <motion.div style={{ height: 280 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
          <ResponsiveBar data={barData} keys={["wert"]} indexBy="label"
            margin={{ top: 20, right: 20, bottom: 60, left: 50 }}
            padding={0.35} colors={({ data: d }: any) => d.color}
            borderRadius={8} borderWidth={0}
            axisBottom={{ tickSize: 0, tickPadding: 14, tickRotation: 0 }}
            axisLeft={{ tickSize: 0, tickPadding: 10 }}
            enableLabel labelSkipHeight={12}
            labelTextColor="#fff"
            motionConfig="wobbly"
            animate
            theme={nivoTheme}
          />
        </motion.div>
      );
    }
    if (block.type === "pie_chart") {
      const pieData = data.map(d => ({ id: d.label, label: d.label, value: d.currentVal, color: d.color }));
      return (
        <motion.div style={{ height: 300 }} initial={{ opacity: 0, scale: 0.8, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 15, stiffness: 100 }}>
          <ResponsivePie data={pieData}
            margin={{ top: 30, right: 80, bottom: 60, left: 80 }}
            innerRadius={0.55} padAngle={2.5} cornerRadius={10}
            colors={({ data: d }: any) => d.color}
            enableArcLinkLabels arcLinkLabelsSkipAngle={10}
            arcLinkLabelsThickness={2} arcLinkLabelsColor={{ from: "color" }}
            arcLabelsSkipAngle={20} arcLabelsTextColor="#fff"
            motionConfig="wobbly"
            animate
            theme={nivoTheme}
          />
        </motion.div>
      );
    }
    if (block.type === "line_chart") {
      const lineData = [{ id: block.content || "Werte", color: "#137386", data: data.map(d => ({ x: d.label, y: d.currentVal })) }];
      return (
        <motion.div style={{ height: 280 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <ResponsiveLine data={lineData}
            margin={{ top: 20, right: 20, bottom: 60, left: 50 }}
            xScale={{ type: "point" }}
            yScale={{ type: "linear", min: "auto", max: "auto" }}
            curve="catmullRom"
            colors={["#137386"]}
            lineWidth={4}
            pointSize={14} pointColor="#fff" pointBorderWidth={3} pointBorderColor={{ from: "serieColor" }}
            enableArea areaOpacity={0.12} areaBaselineValue={0}
            enableSlices="x"
            motionConfig="gentle"
            animate
            theme={nivoTheme}
          />
        </motion.div>
      );
    }
    if (block.type === "spider_chart") {
      const radarData = data.map(d => ({ category: d.label, Wert: d.currentVal }));
      return (
        <motion.div style={{ height: 320 }} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 80 }}>
          <ResponsiveRadar data={radarData} keys={["Wert"]} indexBy="category"
            margin={{ top: 50, right: 90, bottom: 50, left: 90 }}
            dotSize={12} dotBorderWidth={3} dotBorderColor="#fff"
            dotColor="#137386"
            colors={["#137386"]}
            fillOpacity={0.25} borderWidth={3} borderColor="#137386"
            gridShape="circular" gridLevels={5}
            gridLabelOffset={20}
            motionConfig="wobbly"
            theme={{
              ...nivoTheme,
              dots: { text: { fontSize: 12, fontWeight: 800 } },
            }}
          />
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 20 }}>
      {block.content && (
        <motion.p className="text-foreground font-bold text-lg mb-5 text-center"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {block.content}
        </motion.p>
      )}
      <motion.div className="bg-card rounded-3xl p-5 border border-border shadow-lg mb-6 overflow-hidden relative"
        initial={{ boxShadow: "0 0 0 rgba(0,0,0,0)" }}
        animate={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
        transition={{ delay: 0.3 }}>
        {/* Decorative gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{
          background: `linear-gradient(90deg, ${data[0]?.color || '#137386'}, ${data[Math.min(1, data.length - 1)]?.color || '#0EA5E9'}, ${data[Math.min(2, data.length - 1)]?.color || '#10B981'})`
        }} />
        {renderChart()}
      </motion.div>
      <div className="space-y-3">
        <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
          ✏️ Werte anpassen
        </p>
        {data.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08, type: "spring", damping: 20 }}
            className="flex items-center bg-card p-4 rounded-2xl border border-border gap-3.5 shadow-sm hover:shadow-md transition-shadow">
            <motion.div className="w-4 h-4 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-card"
              style={{ backgroundColor: item.color, ringColor: item.color }}
              whileHover={{ scale: 1.3 }} />
            <span className="flex-1 font-bold text-foreground text-[15px] truncate">{item.label}</span>
            <motion.input
              value={currentValues[item.label] !== undefined ? String(currentValues[item.label]) : ""}
              onChange={(e) => updateValue(item.label, e.target.value)}
              placeholder={String(item.currentVal)}
              disabled={disabled}
              type="number"
              className="bg-secondary px-4 py-2.5 rounded-xl text-center font-extrabold text-primary min-w-[80px] focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 transition-all"
              whileFocus={{ scale: 1.05 }}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Progress Bar Block ────────────────────────────────────────────────────────

function ProgressBarBlock({ block, value, onChange, disabled }: { block: ExerciseBlock; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const meta = getMeta("progress_bar");
  const max = block.progressMax || 100;
  const current = parseInt(value || "0");
  const pct = Math.min(Math.round((current / max) * 100), 100);

  const emoji = pct >= 100 ? "🎉" : pct >= 75 ? "🔥" : pct >= 50 ? "💪" : pct >= 25 ? "🌱" : "🎯";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 20 }}>
      {block.content && (
        <motion.p className="text-foreground font-bold text-lg mb-5 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {block.content}
        </motion.p>
      )}

      {/* Circular progress */}
      <div className="flex flex-col items-center mb-6">
        <svg width={160} height={160} className="mb-3">
          <defs>
            <linearGradient id={`prog-${block.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={meta.accent} />
              <stop offset="100%" stopColor={meta.accent} stopOpacity={0.4} />
            </linearGradient>
            <filter id={`glow-${block.id}`}>
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx={80} cy={80} r={64} fill="none" stroke="hsl(var(--border))" strokeWidth={10} />
          <motion.circle cx={80} cy={80} r={64} fill="none"
            stroke={`url(#prog-${block.id})`} strokeWidth={10}
            strokeLinecap="round" strokeDasharray={2 * Math.PI * 64}
            filter={`url(#glow-${block.id})`}
            style={{ transformOrigin: "80px 80px", rotate: "-90deg" }}
            initial={{ strokeDashoffset: 2 * Math.PI * 64 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 64 * (1 - pct / 100) }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <motion.text x={80} y={70} textAnchor="middle" fontSize={28} fontWeight="900" fill={meta.accent}
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, type: "spring" }}>
            {pct}%
          </motion.text>
          <motion.text x={80} y={92} textAnchor="middle" fontSize={22}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            {emoji}
          </motion.text>
        </svg>
      </div>

      {/* Linear bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-foreground">{block.progressLabel || "Fortschritt"}</span>
        <motion.span className="text-sm font-extrabold" style={{ color: meta.accent }}
          key={current} initial={{ scale: 1.3 }} animate={{ scale: 1 }}>
          {current} / {max}
        </motion.span>
      </div>
      <div className="h-4 bg-muted rounded-full overflow-hidden mb-4 relative">
        <motion.div className="h-full rounded-full relative"
          style={{ backgroundColor: meta.accent }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}>
          {/* Shimmer effect */}
          <motion.div className="absolute inset-0 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
      <input type="range" min={0} max={max} step={1} value={current} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full accent-[#06B6D4] disabled:opacity-60 h-2" />
    </motion.div>
  );
}

// ─── Mood Wheel Block ──────────────────────────────────────────────────────────

function MoodWheelBlock({ block, value, onChange, disabled }: { block: ExerciseBlock; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const emotions = block.moodOptions || ["Freude", "Trauer", "Wut", "Angst", "Ekel", "Überraschung"];
  const PALETTE = ["#F97316", "#0EA5E9", "#EF4444", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#14B8A6", "#3B82F6", "#64748B"];
  const EMOJIS = ["😊", "😢", "😤", "😰", "🤢", "😲", "🥰", "😌", "🤔", "😴"];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 20 }}>
      {block.content && (
        <motion.p className="text-foreground font-bold text-lg mb-5 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {block.content}
        </motion.p>
      )}
      <svg width={260} height={260} className="mx-auto block mb-5" viewBox="0 0 260 260">
        <defs>
          {emotions.map((_, i) => (
            <radialGradient key={i} id={`mood-grad-${block.id}-${i}`}>
              <stop offset="30%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.9} />
              <stop offset="100%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.6} />
            </radialGradient>
          ))}
          <filter id={`mood-glow-${block.id}`}>
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        {emotions.map((emo, i) => {
          const angle = (i / emotions.length) * Math.PI * 2 - Math.PI / 2;
          const nextAngle = ((i + 1) / emotions.length) * Math.PI * 2 - Math.PI / 2;
          const R = 110, cx = 130, cy = 130;
          const x1 = cx + Math.cos(angle) * R, y1 = cy + Math.sin(angle) * R;
          const x2 = cx + Math.cos(nextAngle) * R, y2 = cy + Math.sin(nextAngle) * R;
          const large = emotions.length <= 2 ? 1 : 0;
          const midAngle = (angle + nextAngle) / 2;
          const emojiDist = R * 0.55;
          const textDist = R * 0.8;
          const ex = cx + Math.cos(midAngle) * emojiDist;
          const ey = cy + Math.sin(midAngle) * emojiDist;
          const tx = cx + Math.cos(midAngle) * textDist;
          const ty = cy + Math.sin(midAngle) * textDist;
          const selected = value === emo;
          return (
            <g key={i} onClick={() => !disabled && onChange(emo)} style={{ cursor: disabled ? "default" : "pointer" }}>
              <motion.path
                d={`M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`}
                fill={`url(#mood-grad-${block.id}-${i})`}
                stroke="hsl(var(--card))" strokeWidth={3}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                  scale: selected ? 1.06 : 1,
                  opacity: selected ? 1 : 0.75,
                }}
                whileHover={!disabled ? { scale: 1.05, opacity: 1 } : undefined}
                whileTap={!disabled ? { scale: 0.95 } : undefined}
                transition={{ delay: i * 0.08, type: "spring", damping: 15 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
              {selected && (
                <motion.circle cx={cx + Math.cos(midAngle) * (R + 4)} cy={cy + Math.sin(midAngle) * (R + 4)} r={4}
                  fill={PALETTE[i % PALETTE.length]}
                  filter={`url(#mood-glow-${block.id})`}
                  initial={{ opacity: 0 }} animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }} />
              )}
              <text x={ex} y={ey + 6} textAnchor="middle" fontSize={22}>{EMOJIS[i % EMOJIS.length]}</text>
              <text x={tx} y={ty + 4} textAnchor="middle" fontSize={10} fontWeight="800" fill="#fff"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                {emo.slice(0, 8)}
              </text>
            </g>
          );
        })}
        {/* Center circle */}
        <circle cx={130} cy={130} r={24} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={2} />
        <text x={130} y={136} textAnchor="middle" fontSize={16}>
          {value ? EMOJIS[emotions.indexOf(value) % EMOJIS.length] || "💫" : "💫"}
        </text>
      </svg>
      {value && (
        <motion.div className="text-center" initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring" }} key={value}>
          <span className="text-3xl mb-1 block">{EMOJIS[emotions.indexOf(value) % EMOJIS.length]}</span>
          <p className="text-xl font-black" style={{ color: PALETTE[emotions.indexOf(value) % PALETTE.length] }}>
            {value}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Table Block ───────────────────────────────────────────────────────────────

function TableBlock({ block, answers, onAnswerChange, disabled }: { block: ExerciseBlock; answers: Answers; onAnswerChange: (k: string, v: string) => void; disabled?: boolean }) {
  const columns = block.tableColumns || ["Spalte 1", "Spalte 2"];
  const rows = block.tableRows || 3;
  const meta = getMeta("table");

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 20 }}>
      {block.content && (
        <motion.p className="text-foreground font-bold text-lg mb-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {block.content}
        </motion.p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <motion.th key={i}
                  className="text-left px-4 py-3.5 font-extrabold text-primary-foreground"
                  style={{ background: `linear-gradient(135deg, ${meta.accent}, ${meta.accent}CC)` }}
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}>
                  {col}
                </motion.th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <motion.tr key={r} className="group"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + r * 0.08 }}>
                {columns.map((col, c) => {
                  const key = `${block.id}_r${r}_c${c}`;
                  return (
                    <td key={c} className="px-1.5 py-1.5 border-b border-border bg-card group-hover:bg-secondary/50 transition-colors">
                      <input value={answers[key] || ""} onChange={e => onAnswerChange(key, e.target.value)} disabled={disabled}
                        placeholder="…"
                        className="w-full bg-transparent px-3 py-2.5 text-foreground font-medium focus:outline-none focus:bg-primary/5 rounded-xl transition-colors disabled:opacity-60" />
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── Slider Group Block ────────────────────────────────────────────────────────

function SliderGroupBlock({ block, value, onChange, disabled }: { block: ExerciseBlock; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const sliders = block.sliders || [{ label: "Energie", min: 0, max: 10, step: 1 }];
  const PALETTE = ["#F97316", "#0EA5E9", "#10B981", "#8B5CF6", "#F43F5E", "#F59E0B", "#14B8A6", "#7C3AED", "#EC4899", "#3B82F6"];
  const EMOJIS = ["⚡", "🌊", "🌿", "💜", "🔥", "☀️", "🧘", "✨", "💗", "🎯"];
  let values: Record<string, number> = {};
  try { values = value ? JSON.parse(value) : {}; } catch {}

  const updateSlider = (label: string, val: number) => {
    if (disabled) return;
    const next = { ...values, [label]: val };
    onChange(JSON.stringify(next));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 20 }}>
      {block.content && (
        <motion.p className="text-foreground font-bold text-lg mb-5 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {block.content}
        </motion.p>
      )}
      <div className="space-y-6">
        {sliders.map((slider, i) => {
          const current = values[slider.label] ?? slider.min;
          const pct = ((current - slider.min) / (slider.max - slider.min)) * 100;
          const color = PALETTE[i % PALETTE.length];
          const emoji = EMOJIS[i % EMOJIS.length];
          return (
            <motion.div key={i} className="bg-card rounded-2xl border border-border p-4 shadow-sm"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1, type: "spring", damping: 18 }}>
              <div className="flex justify-between mb-3">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="text-lg">{emoji}</span>
                  {slider.label}
                </span>
                <motion.span className="text-lg font-black px-3 py-0.5 rounded-full"
                  style={{ color, backgroundColor: color + "15" }}
                  key={current} initial={{ scale: 1.3 }} animate={{ scale: 1 }}>
                  {current}
                </motion.span>
              </div>
              <div className="relative h-5 mb-1">
                <div className="absolute inset-0 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full relative"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}>
                    <motion.div className="absolute inset-0 rounded-full"
                      style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }}
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 0.5 }} />
                  </motion.div>
                </div>
                {/* Thumb indicator */}
                <motion.div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border-[3px] shadow-lg"
                  style={{ borderColor: color, left: `calc(${pct}% - 12px)` }}
                  animate={{ left: `calc(${pct}% - 12px)` }}
                  transition={{ duration: 0.3 }}
                />
                <input type="range" min={slider.min} max={slider.max} step={slider.step || 1} value={current}
                  onChange={e => updateSlider(slider.label, parseFloat(e.target.value))} disabled={disabled}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-default" />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground font-semibold">{slider.min}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">{slider.max}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
// ─── Block Dispatcher ─────────────────────────────────────────────────────────

function BlockRenderer({ block, answers, onAnswerChange, disabled }: {
  block: ExerciseBlock; answers: Answers; onAnswerChange: (k: string, v: string) => void; disabled?: boolean;
}) {
  const value = answers[block.id] || "";
  const onChange = (v: string) => onAnswerChange(block.id, v);

  switch (block.type) {
    case "info": return <InfoBlock block={block} />;
    case "text":
    case "reflection": return <ReflectionBlock block={block} value={value} onChange={onChange} disabled={disabled} />;
    case "scale": return <ScaleBlock block={block} value={value} onChange={onChange} disabled={disabled} />;
    case "choice": return <ChoiceBlock block={block} value={value} onChange={onChange} disabled={disabled} />;
    case "checklist": return <ChecklistBlock block={block} value={value} onChange={onChange} disabled={disabled} />;
    case "homework": return <HomeworkBlock block={block} answers={answers} onAnswerChange={onAnswerChange} disabled={disabled} />;
    case "gratitude": return <GratitudeBlock block={block} answers={answers} onAnswerChange={onAnswerChange} disabled={disabled} />;
    case "timer":
    case "breathing": return <TimerBlock block={block} />;
    case "media": return <MediaBlock block={block} />;
    case "video": return <VideoBlock block={block} />;
    case "spider_chart":
    case "bar_chart":
    case "pie_chart":
    case "line_chart":
      return <InteractiveChartBlock block={block} value={value} onChange={onChange} disabled={disabled} />;
    case "progress_bar": return <ProgressBarBlock block={block} value={value} onChange={onChange} disabled={disabled} />;
    case "mood_wheel": return <MoodWheelBlock block={block} value={value} onChange={onChange} disabled={disabled} />;
    case "table": return <TableBlock block={block} answers={answers} onAnswerChange={onAnswerChange} disabled={disabled} />;
    case "slider_group": return <SliderGroupBlock block={block} value={value} onChange={onChange} disabled={disabled} />;
    default: return block.content ? <p className="text-foreground">{block.content}</p> : null;
  }
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressIndicator({ blocks, answers }: { blocks: ExerciseBlock[]; answers: Answers }) {
  const answered = blocks.filter(b => {
    if (["info", "media", "video", "timer", "breathing"].includes(b.type)) return true;
    const val = answers[b.id];
    if (val && val.trim()) return true;
    // Check sub-keys for homework/gratitude
    if (b.type === "homework") return ABC_FIELDS.some(f => answers[`${b.id}_${f.key}`]?.trim());
    if (b.type === "gratitude") return [1, 2, 3].some(n => answers[`${b.id}_${n}`]?.trim());
    return false;
  }).length;
  const pct = blocks.length > 0 ? Math.round((answered / blocks.length) * 100) : 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fortschritt</span>
        <span className="text-sm font-extrabold text-primary">{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
      <p className="text-[11px] text-muted-foreground font-medium mt-1.5">{answered} von {blocks.length} Modulen bearbeitet</p>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Exercise() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<ExerciseData | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sharedAnswers, setSharedAnswers] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        let snap = await getDoc(doc(db, "exercises", id));
        if (!snap.exists() && profile?.id) {
          snap = await getDoc(doc(db, "users", profile.id, "exercises", id));
        }
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as ExerciseData;
          setExercise(data);
          setAnswers(data.answers || {});
        }
      } catch (e) {
        console.error("Failed to load exercise:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, profile?.id]);

  const handleAnswerChange = useCallback((key: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [key]: val }));
  }, []);

  const [isRedoing, setIsRedoing] = useState(false);

  const isEditable = !exercise?.completed || isRedoing;

  const handleComplete = async () => {
    if (!id || !exercise) return;
    setSaving(true);
    try {
      const cleanAnswers: Record<string, string> = {};
      Object.entries(answers).forEach(([k, v]) => { if (v != null) cleanAnswers[k] = v; });
      try {
        await updateDoc(doc(db, "exercises", id), { completed: true, answers: cleanAnswers, sharedAnswers, lastCompletedAt: new Date().toISOString() });
      } catch {
        if (profile?.id) {
          await updateDoc(doc(db, "users", profile.id, "exercises", id), { completed: true, completedAt: new Date().toISOString(), lastCompletedAt: new Date().toISOString(), answers: cleanAnswers });
        }
      }
      setIsRedoing(false);
      setSaved(true);
    } catch (e) {
      console.error("Error completing exercise:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleRedo = () => {
    setIsRedoing(true);
    // Optionally clear answers for a fresh start
    // setAnswers({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-extrabold text-foreground mb-2">Übung nicht gefunden</h2>
          <p className="text-muted-foreground text-sm mb-6">Diese Übung konnte nicht geladen werden.</p>
          <button onClick={() => navigate("/")} className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold hover:opacity-90 transition-opacity">Zurück</button>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <SuccessAnimation emoji="🎉">
          <h2 className="text-3xl font-black text-foreground mb-3">Super! 🎉</h2>
          <p className="text-muted-foreground font-medium mb-10">Du hast die Übung erfolgreich abgeschlossen.</p>
          <motion.button onClick={() => navigate("/")} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-lg shadow-primary/20" whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}>
            Zurück zum Dashboard
          </motion.button>
        </SuccessAnimation>
      </div>
    );
  }

  const themeColor = exercise.themeColor || "hsl(var(--primary))";
  const coverImg = exercise.coverImage || headerImg;

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header with background image */}
      <div className="rounded-b-[2rem] px-5 pt-14 pb-8 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)` }}>
        <img src={coverImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/25 to-transparent" />
        <HeaderOrbs />
        <div className="max-w-2xl mx-auto relative z-10">
          <motion.button onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white font-bold text-sm bg-white/20 px-4 py-2 rounded-xl mb-5 inline-flex items-center gap-1 hover:bg-white/30 transition-all"
            whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
            <ArrowLeft size={16} /> Zurück
          </motion.button>
          <h1 className="text-white text-2xl font-black tracking-tight">{exercise.title}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-white/60 text-sm font-medium">
              {exercise.blocks?.length || 0} Module
              {exercise.completed && " · ✅ Bereits abgeschlossen"}
              {exercise.recurrence === "daily" && " · 🔁 Täglich"}
              {exercise.recurrence === "weekly" && " · 🔁 Wöchentlich"}
            </p>
            <motion.button onClick={() => generateExercisePdf({ ...exercise, answers })}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-colors"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Download size={14} /> PDF
            </motion.button>
          </div>
        </div>
      </div>

      <StaggerContainer className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        {/* Progress Bar */}
        {(exercise.blocks?.length || 0) > 0 && (
          <StaggerItem>
            <ProgressIndicator blocks={exercise.blocks || []} answers={answers} />
          </StaggerItem>
        )}

        {(exercise.blocks || []).map((block, idx) => {
          const meta = getMeta(block.type);
          const Icon = meta.icon;
          return (
            <StaggerItem key={block.id}>
              <motion.div
                className="rounded-[1.75rem] overflow-hidden border border-border shadow-sm bg-card"
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 22, stiffness: 180, delay: idx * 0.07 }}
              >
                <div className="flex justify-center pt-2 pb-1 bg-secondary">
                  <div className="w-12 h-1 rounded-full bg-border" />
                </div>
                <div className="flex items-center px-6 py-4 border-b border-border bg-secondary">
                  <div className="w-11 h-11 rounded-[0.875rem] flex items-center justify-center shrink-0 mr-3.5"
                    style={{ backgroundColor: meta.accent, boxShadow: `0 4px 12px ${meta.accent}40` }}>
                    <Icon size={20} color="#fff" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-extrabold text-foreground">{meta.label}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{meta.desc}</p>
                  </div>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center border-[1.5px] text-xs font-black"
                    style={{ borderColor: meta.accent + "40", backgroundColor: meta.accent + "20", color: meta.accent }}>
                    {idx + 1}
                  </div>
                </div>
                <div className="p-6 bg-card">
                  <BlockRenderer block={block} answers={answers} onAnswerChange={handleAnswerChange} disabled={!isEditable} />
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}

        {/* Sharing toggle */}
        {isEditable && (
          <div className="bg-card rounded-3xl border border-border p-5 shadow-sm animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="font-bold text-foreground">Antworten teilen</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sharedAnswers ? "Dein Therapeut kann deine geschriebenen Texte lesen." : "Deine Antworten bleiben privat."}</p>
              </div>
              <button onClick={() => setSharedAnswers(!sharedAnswers)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${sharedAnswers ? "bg-primary/15 border-2 border-primary" : "bg-secondary border border-border"}`}>
                {sharedAnswers ? <Unlock size={22} className="text-primary" /> : <Lock size={22} className="text-muted-foreground" />}
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3 mt-4">
          {exercise.completed && !isRedoing ? (
            <>
              {/* Already completed state with redo option */}
              <div className="bg-success/10 border border-success/20 rounded-2xl py-4 flex items-center justify-center gap-2">
                <CheckCircle size={22} className="text-success" />
                <span className="text-success font-black text-lg">Bereits abgeschlossen</span>
              </div>
              <motion.button
                onClick={handleRedo}
                className="w-full py-4 rounded-2xl bg-card border-2 border-primary text-primary font-black text-lg flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <Edit3 size={20} />
                Erneut bearbeiten
              </motion.button>
            </>
          ) : (
            <motion.button onClick={handleComplete} disabled={saving}
              className="w-full py-4 rounded-2xl font-black text-lg transition-all disabled:opacity-50 bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}>
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                  Speichern...
                </span>
              ) : isRedoing ? "Erneut abschließen ✓" : "Übung abschließen ✓"}
            </motion.button>
          )}
        </div>

        <div className="h-8" />
      </StaggerContainer>
    </PageTransition>
  );
}
