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
  const currentValues: Record<string, number> = useMemo(() => {
    try { return value ? JSON.parse(value) : {}; } catch { return {}; }
  }, [value]);

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
    text: { fontSize: 12 },
    axis: { ticks: { text: { fill: "#64748B", fontSize: 11 } } },
    grid: { line: { stroke: "#E2E8F0", strokeWidth: 1 } },
    tooltip: { container: { background: "#fff", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "1px solid #E2E8F0", fontSize: 13, fontWeight: 600 } },
  };

  const renderChart = () => {
    if (data.length === 0) return <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Keine Daten</div>;

    if (block.type === "bar_chart") {
      const barData = data.map(d => ({ label: d.label, wert: d.currentVal, color: d.color }));
      return <div style={{ height: 260 }}><ResponsiveBar data={barData} keys={["wert"]} indexBy="label" margin={{ top: 20, right: 20, bottom: 60, left: 40 }} padding={0.3} colors={({ data: d }: any) => d.color} borderRadius={6} axisBottom={{ tickSize: 0, tickPadding: 12 }} axisLeft={{ tickSize: 0, tickPadding: 8 }} enableLabel={false} animate theme={nivoTheme} /></div>;
    }
    if (block.type === "pie_chart") {
      const pieData = data.map(d => ({ id: d.label, label: d.label, value: d.currentVal, color: d.color }));
      return <div style={{ height: 280 }}><ResponsivePie data={pieData} margin={{ top: 20, right: 80, bottom: 60, left: 80 }} innerRadius={0.5} padAngle={2} cornerRadius={8} colors={({ data: d }: any) => d.color} enableArcLinkLabels arcLinkLabelsSkipAngle={10} arcLabelsSkipAngle={20} arcLabelsTextColor="#fff" animate theme={nivoTheme} /></div>;
    }
    if (block.type === "line_chart") {
      const lineData = [{ id: block.content || "Werte", color: "#137386", data: data.map(d => ({ x: d.label, y: d.currentVal })) }];
      return <div style={{ height: 260 }}><ResponsiveLine data={lineData} margin={{ top: 20, right: 20, bottom: 60, left: 40 }} xScale={{ type: "point" }} yScale={{ type: "linear", min: "auto", max: "auto" }} curve="monotoneX" colors={["#137386"]} lineWidth={3} pointSize={10} pointColor="#fff" pointBorderWidth={2} pointBorderColor={{ from: "serieColor" }} enableSlices="x" animate theme={nivoTheme} /></div>;
    }
    if (block.type === "spider_chart") {
      const radarData = data.map(d => ({ category: d.label, Wert: d.currentVal }));
      return <div style={{ height: 300 }}><ResponsiveRadar data={radarData} keys={["Wert"]} indexBy="category" margin={{ top: 40, right: 80, bottom: 40, left: 80 }} dotSize={10} dotBorderWidth={2} colors={["#137386"]} gridShape="circular" motionConfig="wobbly" theme={nivoTheme} /></div>;
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
      {block.content && <p className="text-foreground font-semibold mb-5 text-center">{block.content}</p>}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm mb-6 overflow-hidden">
        {renderChart()}
      </div>
      <div className="space-y-3">
        <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider ml-1">Werte anpassen</p>
        {data.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="flex items-center bg-card p-3.5 rounded-[18px] border border-border gap-3.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="flex-1 font-bold text-foreground text-[15px] truncate">{item.label}</span>
            <input
              value={currentValues[item.label] !== undefined ? String(currentValues[item.label]) : ""}
              onChange={(e) => updateValue(item.label, e.target.value)}
              placeholder={String(item.currentVal)}
              disabled={disabled}
              type="number"
              className="bg-secondary px-3 py-2 rounded-xl text-center font-extrabold text-primary min-w-[70px] focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </motion.div>
        ))}
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
      setSaved(true);
    } catch (e) {
      console.error("Error completing exercise:", e);
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
        <img src={coverImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent" />
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
            <motion.button onClick={() => generateExercisePdf(exercise)}
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
                  <BlockRenderer block={block} answers={answers} onAnswerChange={handleAnswerChange} disabled={exercise.completed} />
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}

        {/* Sharing toggle */}
        {!exercise.completed && (
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

        {/* Complete button */}
        <div className="space-y-3 mt-4">
          <motion.button onClick={handleComplete} disabled={saving || exercise.completed}
            className={`w-full py-4 rounded-2xl font-black text-lg transition-all disabled:opacity-50 ${exercise.completed ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground shadow-lg shadow-primary/25"}`}
            whileHover={!exercise.completed ? { scale: 1.02, y: -2 } : undefined}
            whileTap={!exercise.completed ? { scale: 0.97 } : undefined}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                Speichern...
              </span>
            ) : exercise.completed ? "Bereits abgeschlossen" : "Übung abschließen ✓"}
          </motion.button>
        </div>

        <div className="h-8" />
      </StaggerContainer>
    </PageTransition>
  );
}
