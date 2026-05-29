import { useMemo } from "react";
import {
  Activity,
  BatteryMedium,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  FileText,
  MessageCircle,
  Minus,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { translate } from "../lib/webLocale";

export interface ProcessCheckin {
  id?: string;
  mood?: number;
  energy?: number;
  note?: string;
  tags?: string[];
  createdAt?: string | Date | { toDate?: () => Date };
  date?: string;
}

export interface ProcessCompassNode {
  id: string;
  type: string;
  title?: string;
  metadata?: {
    completed?: boolean;
    response?: string;
  };
}

export type ProcessBaselineMetricKey =
  | "energy"
  | "agency"
  | "regulation"
  | "bodyTrust"
  | "clarity"
  | "dailyFunction"
  | "goalCloseness"
  | "resilience";

export interface ProcessBaseline {
  sourceTitle?: string;
  sourceUrl?: string;
  goal?: string;
  currentResource?: string;
  nextNeed?: string;
  metrics?: Partial<Record<ProcessBaselineMetricKey, number>>;
  updatedAtLabel?: string;
  date?: string;
}

function getCheckinTime(checkin: ProcessCheckin) {
  const raw = checkin.createdAt;
  if (raw && typeof raw === "object" && "toDate" in raw && typeof raw.toDate === "function") {
    return raw.toDate().getTime();
  }
  const candidate = raw instanceof Date ? raw : new Date(String(raw || checkin.date || ""));
  const time = candidate.getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeMoodTo10(score?: number) {
  const safe = Number(score ?? 0);
  if (!Number.isFinite(safe) || safe <= 0) return 0;
  return safe > 10 ? Math.round(safe / 10) : safe;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildStats(checkins: ProcessCheckin[]) {
  const sorted = [...checkins].sort((a, b) => getCheckinTime(b) - getCheckinTime(a));
  const moodValues = sorted.map((checkin) => normalizeMoodTo10(checkin.mood)).filter((value) => value > 0);
  const energyValues = sorted
    .map((checkin) => Number(checkin.energy ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  const recentMood = average(moodValues.slice(0, 3));
  const previousMood = average(moodValues.slice(3, 6));
  const trendDelta = recentMood != null && previousMood != null ? recentMood - previousMood : 0;
  const trend: "up" | "down" | "stable" = trendDelta > 0.4 ? "up" : trendDelta < -0.4 ? "down" : "stable";
  const latestWithNote = sorted.find((checkin) => checkin.note?.trim());
  const tagCounts = new Map<string, number>();
  sorted.forEach((checkin) => {
    checkin.tags?.forEach((tag) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      tagCounts.set(trimmed, (tagCounts.get(trimmed) || 0) + 1);
    });
  });

  return {
    sorted,
    total: sorted.length,
    averageMood: average(moodValues),
    averageEnergy: average(energyValues),
    trend,
    trendDelta,
    latestNote: latestWithNote?.note?.trim() || "",
    topTags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
    chartValues: sorted.slice(0, 10).reverse().map((checkin) => normalizeMoodTo10(checkin.mood)).filter((value) => value > 0),
  };
}

function buildBoardStats(nodes: ProcessCompassNode[]) {
  const actionable = nodes.filter((node) => node.type === "exercise" || node.type === "task" || node.type === "reflection");
  const completed = actionable.filter((node) => {
    if (node.type === "reflection") return Boolean(node.metadata?.completed || node.metadata?.response?.trim());
    return Boolean(node.metadata?.completed);
  }).length;
  const open = Math.max(0, actionable.length - completed);
  const completionRate = actionable.length > 0 ? Math.round((completed / actionable.length) * 100) : null;

  return {
    total: nodes.length,
    actionable: actionable.length,
    completed,
    open,
    completionRate,
    exercises: nodes.filter((node) => node.type === "exercise").length,
    tasks: nodes.filter((node) => node.type === "task").length,
    reflections: nodes.filter((node) => node.type === "reflection").length,
    answeredReflections: nodes.filter((node) => node.type === "reflection" && (node.metadata?.completed || node.metadata?.response?.trim())).length,
    anamneses: nodes.filter((node) => node.type === "anamnese").length,
  };
}

function buildBaselineStats(baseline?: ProcessBaseline | null, averageEnergy?: number | null) {
  const metricEntries = Object.entries(baseline?.metrics || {}).filter(([, value]) => Number(value) > 0);
  const values = metricEntries.map(([, value]) => Number(value));
  const averageBaseline = average(values);
  const baselineEnergy = Number(baseline?.metrics?.energy || 0);
  const currentEnergyOn10 = averageEnergy != null ? averageEnergy / 10 : null;
  const energyDelta = baselineEnergy > 0 && currentEnergyOn10 != null ? currentEnergyOn10 - baselineEnergy : null;

  return {
    hasBaseline: metricEntries.length > 0 || Boolean(baseline?.goal || baseline?.currentResource || baseline?.nextNeed),
    filledMetrics: metricEntries.length,
    averageBaseline,
    energyDelta,
  };
}

function MiniTrendChart({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <div className="h-10 rounded-xl bg-[#1F3A5F]/5 dark:bg-white/5" />;
  }

  const width = 136;
  const height = 42;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (Math.max(1, Math.min(10, value)) / 10) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-full overflow-visible" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="#C4A35A"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      {values.map((value, index) => {
        const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
        const y = height - (Math.max(1, Math.min(10, value)) / 10) * (height - 8) - 4;
        return <circle key={`${value}-${index}`} cx={x} cy={y} r="3.5" fill="#1F3A5F" />;
      })}
    </svg>
  );
}

export function ProcessCompassInsightTiles({
  checkins,
  nodes = [],
  baseline,
  locale,
  role,
}: {
  checkins: ProcessCheckin[];
  nodes?: ProcessCompassNode[];
  baseline?: ProcessBaseline | null;
  locale: string;
  role: "client" | "therapist";
}) {
  const stats = useMemo(() => buildStats(checkins), [checkins]);
  const board = useMemo(() => buildBoardStats(nodes), [nodes]);
  const baselineStats = useMemo(() => buildBaselineStats(baseline, stats.averageEnergy), [baseline, stats.averageEnergy]);
  const text = useMemo(() => ({
    label: translate(locale, { de: "Verlaufsdaten", en: "Progress data", es: "Datos de progreso", fr: "Donnees de suivi", it: "Dati di progresso" }),
    title: translate(locale, { de: "Check-in Kompass", en: "Check-in compass", es: "Brujula de check-in", fr: "Boussole des check-ins", it: "Bussola check-in" }),
    subtitle: translate(locale, {
      de: role === "therapist" ? "Live-Kacheln aus Stimmung, Energie und Notizen." : "Deine Check-ins werden hier als Verlauf sichtbar.",
      en: role === "therapist" ? "Live tiles from mood, energy, and notes." : "Your check-ins become visible as progress here.",
      es: role === "therapist" ? "Tarjetas en vivo de animo, energia y notas." : "Tus check-ins se ven aqui como progreso.",
      fr: role === "therapist" ? "Tuiles en direct: humeur, energie et notes." : "Tes check-ins deviennent visibles ici.",
      it: role === "therapist" ? "Riquadri live da umore, energia e note." : "I tuoi check-in diventano visibili qui.",
    }),
    entries: translate(locale, { de: "Check-ins", en: "check-ins", es: "check-ins", fr: "check-ins", it: "check-in" }),
    mood: translate(locale, { de: "Stimmung", en: "Mood", es: "Animo", fr: "Humeur", it: "Umore" }),
    energy: translate(locale, { de: "Energie", en: "Energy", es: "Energia", fr: "Energie", it: "Energia" }),
    trend: translate(locale, { de: "Trend", en: "Trend", es: "Tendencia", fr: "Tendance", it: "Trend" }),
    focus: translate(locale, { de: "Nächster Fokus", en: "Next focus", es: "Siguiente foco", fr: "Prochain focus", it: "Prossimo focus" }),
    board: translate(locale, { de: "Board-Fortschritt", en: "Board progress", es: "Progreso del tablero", fr: "Progression du tableau", it: "Progressi board" }),
    openItems: translate(locale, { de: "Offene Kacheln", en: "Open tiles", es: "Tarjetas ouvertes", fr: "Tuiles ouvertes", it: "Riquadri aperti" }),
    reflections: translate(locale, { de: "Reflexionen", en: "Reflections", es: "Reflexiones", fr: "Reflexions", it: "Riflessioni" }),
    anamnesis: translate(locale, { de: "Anamnese", en: "Anamnesis", es: "Anamnesis", fr: "Anamnese", it: "Anamnesi" }),
    tags: translate(locale, { de: "Häufige Marker", en: "Frequent markers", es: "Marcadores frecuentes", fr: "Marqueurs frequents", it: "Marker frequenti" }),
    baseline: translate(locale, { de: "Startbasis", en: "Baseline", es: "Linea base", fr: "Base de depart", it: "Baseline" }),
    originalGoal: translate(locale, { de: "Ursprungsziel", en: "Original goal", es: "Objetivo inicial", fr: "Objectif initial", it: "Obiettivo iniziale" }),
    up: translate(locale, { de: "Stabiler Aufwärtstrend", en: "Stable upward trend", es: "Tendencia positiva", fr: "Tendance positive", it: "Trend positivo" }),
    down: translate(locale, { de: "Mehr Stabilisierung nötig", en: "More stabilization needed", es: "Hace falta mas estabilizacion", fr: "Plus de stabilisation necessaire", it: "Serve piu stabilizzazione" }),
    stable: translate(locale, { de: "Relativ stabil", en: "Relatively stable", es: "Relativamente estable", fr: "Relativement stable", it: "Relativamente stabile" }),
    noData: translate(locale, { de: "Noch keine Check-ins", en: "No check-ins yet", es: "Aun no hay check-ins", fr: "Aucun check-in", it: "Ancora nessun check-in" }),
    start: translate(locale, { de: "Erste Daten sammeln", en: "Collect first data", es: "Recoger premiers datos", fr: "Collecter les premieres donnees", it: "Raccogliere primi dati" }),
  }), [locale, role]);

  const trendIcon = stats.trend === "up" ? TrendingUp : stats.trend === "down" ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendLabel = stats.trend === "up" ? text.up : stats.trend === "down" ? text.down : text.stable;
  const focusLabel = stats.total === 0
    ? text.start
    : board.open > 0 && board.completionRate != null && board.completionRate < 50
      ? translate(locale, { de: "Offene Prozesskacheln priorisieren", en: "Prioritize open process tiles", es: "Priorizar tarjetas abiertas", fr: "Prioriser les tuiles ouvertes", it: "Dare priorita ai riquadri aperti" })
    : stats.trend === "down"
      ? text.down
      : stats.averageEnergy != null && stats.averageEnergy < 45
        ? translate(locale, { de: "Energie und Routinen stärken", en: "Strengthen energy and routines", es: "Fortalecer energia y rutinas", fr: "Renforcer energie et routines", it: "Rafforzare energia e routine" })
        : translate(locale, { de: "Ressourcen weiter verankern", en: "Anchor resources further", es: "Afianzar resources", fr: "Ancrer les ressources", it: "Radicare le risorse" });

  return (
    <section className="shrink-0 border-b border-[#DED6C9] bg-[#F4F1EE]/95 px-4 py-3 shadow-[0_12px_34px_rgba(31,58,95,0.08)] dark:border-border dark:bg-background/90">
      <div className="flex gap-3 overflow-x-auto pb-1">
        <div className="min-w-[240px] rounded-[1.25rem] border border-[#D8CCB9] bg-[#FFFDF9] p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C4A35A]">{text.label}</p>
              <h2 className="mt-1 text-base font-black text-[#1F3A5F] dark:text-foreground">{text.title}</h2>
              <p className="mt-1 text-[11px] font-semibold leading-snug text-[#52616F] dark:text-muted-foreground">{text.subtitle}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1F3A5F] text-white shadow-md">
              <Compass size={18} />
            </div>
          </div>
          <p className="mt-3 text-xs font-black text-[#1F3A5F] dark:text-foreground">
            {stats.total > 0 ? `${stats.total} ${text.entries}` : text.noData}
          </p>
        </div>

        <div className="min-w-[210px] rounded-[1.25rem] border border-[#D8CCB9] bg-[#FFFDF9] p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#52616F] dark:text-muted-foreground">{text.board}</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-3xl font-black text-[#1F3A5F] dark:text-foreground">{board.completionRate ?? "-"}</span>
            <span className="pb-1 text-xs font-black text-[#52616F] dark:text-muted-foreground">{board.completionRate == null ? "" : "%"}</span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#52616F] dark:text-muted-foreground">
            {board.completed}/{board.actionable} {translate(locale, { de: "aktive Kacheln abgeschlossen", en: "active tiles completed", es: "tarjetas activas completadas", fr: "tuiles actives terminees", it: "riquadri attivi completati" })}
          </p>
        </div>

        <div className="min-w-[210px] rounded-[1.25rem] border border-[#D8CCB9] bg-[#FFFDF9] p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#52616F] dark:text-muted-foreground">{text.openItems}</span>
            <ClipboardCheck size={16} className={board.open > 0 ? "text-amber-600" : "text-emerald-600"} />
          </div>
          <p className="mt-3 text-3xl font-black text-[#1F3A5F] dark:text-foreground">{board.open}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black text-[#52616F] dark:text-muted-foreground">
            <span className="rounded-full bg-[#1F3A5F]/8 px-2 py-1 dark:bg-white/10">{board.exercises} Übungen</span>
            <span className="rounded-full bg-[#1F3A5F]/8 px-2 py-1 dark:bg-white/10">{board.tasks} Aufgaben</span>
          </div>
        </div>

        <div className="min-w-[250px] rounded-[1.25rem] border border-[#D8CCB9] bg-[#FFFDF9] p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#52616F] dark:text-muted-foreground">{text.baseline}</span>
            <FileText size={16} className="text-violet-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-[#1F3A5F] dark:text-foreground">
            {baselineStats.hasBaseline ? `${baselineStats.filledMetrics}/8` : "-"}
          </p>
          <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-snug text-[#52616F] dark:text-muted-foreground">
            {baseline?.goal || baseline?.nextNeed || translate(locale, { de: "Noch keine strukturierte Anamnese-Basis hinterlegt.", en: "No structured anamnesis baseline yet.", es: "Aun no hay linea base estructurada.", fr: "Aucune base d'anamnese structuree.", it: "Nessuna baseline anamnestica strutturata." })}
          </p>
          {baselineStats.energyDelta != null && (
            <p className={`mt-2 text-[11px] font-black ${baselineStats.energyDelta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              Energie seit Start {baselineStats.energyDelta >= 0 ? "+" : ""}{baselineStats.energyDelta.toFixed(1)}/10
            </p>
          )}
        </div>

        <div className="min-w-[220px] rounded-[1.25rem] border border-[#D8CCB9] bg-[#FFFDF9] p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#52616F] dark:text-muted-foreground">{text.reflections}</span>
            <MessageCircle size={16} className="text-cyan-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-[#1F3A5F] dark:text-foreground">{board.answeredReflections}/{board.reflections}</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-[#52616F] dark:text-muted-foreground">
            <FileText size={13} className="text-violet-600" />
            <span>{board.anamneses} {text.anamnesis}</span>
          </div>
        </div>

        <div className="min-w-[220px] rounded-[1.25rem] border border-[#D8CCB9] bg-[#FFFDF9] p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#52616F] dark:text-muted-foreground">{text.tags}</span>
            <Tag size={16} className="text-[#C4A35A]" />
          </div>
          {stats.topTags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.topTags.map(([tag, count]) => (
                <span key={tag} className="rounded-full border border-[#D8CCB9] bg-[#F4F1EE] px-2.5 py-1 text-[11px] font-black text-[#1F3A5F] dark:border-border dark:bg-secondary dark:text-foreground">
                  {tag} · {count}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-black leading-tight text-[#1F3A5F] dark:text-foreground">
              {translate(locale, { de: "Noch keine Marker", en: "No markers yet", es: "Sin marcadores", fr: "Pas encore de marqueurs", it: "Ancora nessun marker" })}
            </p>
          )}
        </div>

        <div className="min-w-[190px] rounded-[1.25rem] border border-[#D8CCB9] bg-[#FFFDF9] p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#52616F] dark:text-muted-foreground">{text.mood}</span>
            <Activity size={16} className="text-[#C4A35A]" />
          </div>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-3xl font-black text-[#1F3A5F] dark:text-foreground">{stats.averageMood ? stats.averageMood.toFixed(1) : "-"}</span>
            <span className="pb-1 text-xs font-black text-[#52616F] dark:text-muted-foreground">/10</span>
          </div>
          <div className="mt-2">
            <MiniTrendChart values={stats.chartValues} />
          </div>
        </div>

        <div className="min-w-[170px] rounded-[1.25rem] border border-[#D8CCB9] bg-[#FFFDF9] p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#52616F] dark:text-muted-foreground">{text.energy}</span>
            <BatteryMedium size={16} className="text-[#1F3A5F] dark:text-foreground" />
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#1F3A5F]/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[#C4A35A]"
              style={{ width: `${Math.max(0, Math.min(100, stats.averageEnergy ?? 0))}%` }}
            />
          </div>
          <p className="mt-3 text-2xl font-black text-[#1F3A5F] dark:text-foreground">
            {stats.averageEnergy ? `${Math.round(stats.averageEnergy)}%` : "-"}
          </p>
        </div>

        <div className="min-w-[200px] rounded-[1.25rem] border border-[#D8CCB9] bg-[#FFFDF9] p-4 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#52616F] dark:text-muted-foreground">{text.trend}</span>
            <TrendIcon size={17} className={stats.trend === "down" ? "text-rose-500" : stats.trend === "up" ? "text-emerald-600" : "text-[#C4A35A]"} />
          </div>
          <p className="mt-3 text-sm font-black leading-tight text-[#1F3A5F] dark:text-foreground">{trendLabel}</p>
          <p className="mt-2 text-[11px] font-semibold text-[#52616F] dark:text-muted-foreground">
            {stats.total >= 6 ? `${stats.trendDelta > 0 ? "+" : ""}${stats.trendDelta.toFixed(1)} /10` : translate(locale, { de: "Mehr Daten machen den Trend genauer.", en: "More data makes the trend clearer.", es: "Mas datos aclaran la tendencia.", fr: "Plus de donnees clarifient la tendance.", it: "Piu dati chiariscono il trend." })}
          </p>
        </div>

        <div className="min-w-[260px] rounded-[1.25rem] border border-[#D8CCB9] bg-[#1F3A5F] p-4 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#E8D7A6]">{text.focus}</span>
            <Sparkles size={16} className="text-[#E8D7A6]" />
          </div>
          <p className="mt-3 text-sm font-black leading-tight">{focusLabel}</p>
          {stats.latestNote && (
            <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-snug text-white/70">{stats.latestNote}</p>
          )}
        </div>
      </div>
    </section>
  );
}
