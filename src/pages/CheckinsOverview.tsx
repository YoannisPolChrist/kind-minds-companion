import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Tag,
  Activity,
  Star,
  Zap,
} from "lucide-react";
import { HeaderOrbs } from "../components/motion";
import { getRandomHeaderImage } from "../constants/headerImages";

const headerImg = getRandomHeaderImage();

const EMOTION_PRESETS = [
  { id: "awesome", score: 10, emoji: "🤩", color: "#8B5CF6", label: "Großartig" },
  { id: "ecstatic", score: 10, emoji: "🎉", color: "#A855F7", label: "Ekstatisch" },
  { id: "motivated", score: 9, emoji: "🔥", color: "#0EA5E9", label: "Motiviert" },
  { id: "proud", score: 9, emoji: "🥰", color: "#6366F1", label: "Stolz" },
  { id: "inspired", score: 9, emoji: "✨", color: "#818CF8", label: "Inspiriert" },
  { id: "loved", score: 9, emoji: "💕", color: "#EC4899", label: "Geliebt" },
  { id: "happy", score: 8, emoji: "😊", color: "#10B981", label: "Fröhlich" },
  { id: "grateful", score: 8, emoji: "🙏", color: "#22C55E", label: "Dankbar" },
  { id: "confident", score: 8, emoji: "💪", color: "#14B8A6", label: "Selbstbewusst" },
  { id: "playful", score: 8, emoji: "😜", color: "#F472B6", label: "Verspielt" },
  { id: "content", score: 7, emoji: "🙂", color: "#4ADE80", label: "Zufrieden" },
  { id: "hopeful", score: 7, emoji: "🌱", color: "#34D399", label: "Hoffnungsvoll" },
  { id: "relieved", score: 7, emoji: "😮‍💨", color: "#6EE7B7", label: "Erleichtert" },
  { id: "calm", score: 6, emoji: "😌", color: "#A3E635", label: "Entspannt" },
  { id: "curious", score: 6, emoji: "🤔", color: "#84CC16", label: "Neugierig" },
  { id: "peaceful", score: 6, emoji: "🕊️", color: "#BEF264", label: "Friedlich" },
  { id: "neutral", score: 5, emoji: "😐", color: "#9CA3AF", label: "Neutral" },
  { id: "bored", score: 5, emoji: "🥱", color: "#94A3B8", label: "Gelangweilt" },
  { id: "indifferent", score: 5, emoji: "🫤", color: "#A1A1AA", label: "Gleichgültig" },
  { id: "stressed", score: 4, emoji: "🤯", color: "#FB923C", label: "Gestresst" },
  { id: "anxious", score: 4, emoji: "😰", color: "#FBBF24", label: "Ängstlich" },
  { id: "overwhelmed", score: 4, emoji: "😵‍💫", color: "#F59E0B", label: "Überfordert" },
  { id: "restless", score: 4, emoji: "😤", color: "#D97706", label: "Unruhig" },
  { id: "sad", score: 3, emoji: "😢", color: "#FB7185", label: "Traurig" },
  { id: "lonely", score: 3, emoji: "🥺", color: "#F9A8D4", label: "Einsam" },
  { id: "disappointed", score: 3, emoji: "😞", color: "#E879F9", label: "Enttäuscht" },
  { id: "guilty", score: 3, emoji: "😣", color: "#C084FC", label: "Schuldig" },
  { id: "exhausted", score: 2, emoji: "😫", color: "#F87171", label: "Erschöpft" },
  { id: "angry", score: 2, emoji: "😡", color: "#F43F5E", label: "Wütend" },
  { id: "frustrated", score: 2, emoji: "🤬", color: "#E11D48", label: "Frustriert" },
  { id: "ashamed", score: 2, emoji: "😶", color: "#BE185D", label: "Beschämt" },
  { id: "despair", score: 1, emoji: "😭", color: "#EF4444", label: "Verzweifelt" },
  { id: "numb", score: 1, emoji: "🫥", color: "#DC2626", label: "Taub/Leer" },
  { id: "hopeless", score: 1, emoji: "🖤", color: "#991B1B", label: "Hoffnungslos" },
];

function normalizeMoodTo100(score?: number) {
  const safe = Number(score ?? 0);
  if (!Number.isFinite(safe) || safe <= 0) return 0;
  if (safe <= 10) return Math.round(safe * 10);
  return Math.max(1, Math.min(100, Math.round(safe)));
}

function getEmotion(score: number, emotionId?: string) {
  if (emotionId) {
    const byId = EMOTION_PRESETS.find((e) => e.id === emotionId);
    if (byId) return byId;
  }

  const raw = score > 10 ? Math.round(score / 10) : score;
  return EMOTION_PRESETS.find((e) => e.score === raw) || EMOTION_PRESETS[16];
}

interface Checkin {
  id: string;
  uid: string;
  mood: number;
  energy?: number;
  note?: string;
  tags?: string[];
  duration?: number;
  date: string;
  slot?: string;
  createdAt?: string;
}

export default function CheckinsOverview() {
  const { profile } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "checkins"), where("uid", "==", profile.id))
        );
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Checkin));
        data.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
          const db_ = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
          return db_ - da;
        });
        setCheckins(data);
      } catch (e) {
        console.error("Error fetching checkins:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const analytics = useMemo(() => {
    if (checkins.length === 0) return null;

    const moodValues = checkins.map((c) => normalizeMoodTo100(c.mood));
    const avg = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;
    const min = Math.min(...moodValues);
    const max = Math.max(...moodValues);

    // Trend: compare last 3 to previous 3
    let trend: "up" | "down" | "stable" = "stable";
    if (checkins.length >= 4) {
      const recent = moodValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const older = moodValues.slice(3, 6).reduce((a, b) => a + b, 0) / Math.min(moodValues.slice(3, 6).length, 3);
      if (recent - older > 5) trend = "up";
      else if (older - recent > 5) trend = "down";
    }

    // Top emotions
    const emotionCounts: Record<string, { count: number; emotion: (typeof EMOTION_PRESETS)[0] }> = {};
    checkins.forEach((c) => {
      const e = getEmotion(c.mood, (c as any).emotionId);
      if (!emotionCounts[e.id]) emotionCounts[e.id] = { count: 0, emotion: e };
      emotionCounts[e.id].count++;
    });
    const topEmotions = Object.values(emotionCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    // Top tags
    const tagCounts: Record<string, number> = {};
    checkins.forEach((c) => c.tags?.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Energy avg
    const energies = checkins.filter((c) => c.energy).map((c) => c.energy!);
    const avgEnergy = energies.length > 0 ? energies.reduce((a, b) => a + b, 0) / energies.length : null;

    return { avg, min, max, trend, topEmotions, topTags, avgEnergy, total: checkins.length };
  }, [checkins]);

  // Group checkins by date
  const sections = useMemo(() => {
    const groups: Record<string, Checkin[]> = {};
    checkins.forEach((c) => {
      const dateObj = c.createdAt ? new Date(c.createdAt) : new Date(c.date);
      const key = dateObj.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups);
  }, [checkins]);

  // Mood chart data (last 14, reversed to oldest→newest)
  const chartData = useMemo(() => {
    return [...checkins].slice(0, 14).reverse();
  }, [checkins]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-5 pt-12 pb-8">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/"
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold"
            >
              <ArrowLeft size={16} />
              Zurück
            </Link>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Mein Tagebuch</h1>
          <p className="text-white/60 text-sm font-semibold mt-1">
            {checkins.length} {checkins.length === 1 ? "Eintrag" : "Einträge"} insgesamt
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
        {checkins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-full bg-card border-2 border-border flex items-center justify-center mb-6">
              <Activity size={40} className="text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-3">Noch keine Einträge</h2>
            <p className="text-muted-foreground text-center max-w-xs">
              Dein erstes Check-in erscheint hier nach dem Ausfüllen.
            </p>
            <Link
              to="/checkin"
              className="mt-6 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold hover:opacity-90 transition-opacity"
            >
              Jetzt Check-in starten
            </Link>
          </div>
        ) : (
          <>
            {/* Analytics Cards */}
            {analytics && (
              <div className="space-y-4 animate-fade-in">
                {/* Top Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up">
                  <StatCard
                    label="Durchschnitt"
                    value={analytics.avg.toFixed(1)}
                    suffix="/10"
                    icon={<Star size={16} className="text-amber-500" />}
                  />
                  <StatCard
                    label="Minimum"
                    value={String(analytics.min)}
                    suffix="/10"
                    icon={<TrendingDown size={16} className="text-destructive" />}
                  />
                  <StatCard
                    label="Maximum"
                    value={String(analytics.max)}
                    suffix="/10"
                    icon={<TrendingUp size={16} className="text-success" />}
                  />
                  <StatCard
                    label="Trend"
                    value={analytics.trend === "up" ? "↑ Positiv" : analytics.trend === "down" ? "↓ Sinkend" : "→ Stabil"}
                    icon={
                      analytics.trend === "up" ? (
                        <TrendingUp size={16} className="text-success" />
                      ) : analytics.trend === "down" ? (
                        <TrendingDown size={16} className="text-destructive" />
                      ) : (
                        <Minus size={16} className="text-muted-foreground" />
                      )
                    }
                    small
                  />
                </div>

                {/* Mood Chart */}
                {chartData.length > 1 && (
                  <div
                    className="rounded-3xl p-6 shadow-2xl animate-slide-up relative overflow-hidden"
                    style={{
                      animationDelay: "100ms",
                      background: "linear-gradient(145deg, hsl(222 47% 8%), hsl(222 47% 14%), hsl(240 20% 10%))",
                    }}
                  >
                    {/* Ambient glow */}
                    <div
                      className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${getEmotion(chartData[chartData.length - 1]?.mood, (chartData[chartData.length - 1] as any)?.emotionId).color}, transparent)` }}
                    />
                    <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none bg-primary" />

                    <div className="relative z-10">
                      <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">
                        Stimmungsverlauf
                      </h3>
                      <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-4xl font-black text-white tracking-tight">
                          {chartData[chartData.length - 1]?.mood}
                        </span>
                        <span className="text-sm font-bold text-white/25">/10</span>
                        <span className="text-lg ml-1">
                          {getEmotion(chartData[chartData.length - 1]?.mood, (chartData[chartData.length - 1] as any)?.emotionId).emoji}
                        </span>
                      </div>

                      {/* SVG Area Chart */}
                      <div className="relative h-40 mb-2">
                        <svg viewBox={`0 0 ${(chartData.length - 1) * 60} 120`} className="w-full h-full" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={getEmotion(chartData[chartData.length - 1]?.mood, (chartData[chartData.length - 1] as any)?.emotionId).color} stopOpacity="0.5" />
                              <stop offset="100%" stopColor={getEmotion(chartData[chartData.length - 1]?.mood, (chartData[chartData.length - 1] as any)?.emotionId).color} stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                              {chartData.map((ci, i) => {
                                const emotion = getEmotion(ci.mood, (ci as any).emotionId);
                                return (
                                  <stop
                                    key={i}
                                    offset={`${(i / (chartData.length - 1)) * 100}%`}
                                    stopColor={emotion.color}
                                  />
                                );
                              })}
                            </linearGradient>
                            <filter id="glow">
                              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                              <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Grid lines */}
                          {[0, 25, 50, 75, 100].map((y) => (
                            <line key={y} x1="0" y1={120 - (y / 100) * 120} x2={(chartData.length - 1) * 60} y2={120 - (y / 100) * 120} stroke="white" strokeOpacity="0.04" strokeWidth="1" />
                          ))}

                          {/* Area fill */}
                          <path
                            d={(() => {
                              const pts = chartData.map((ci, i) => ({
                                x: i * 60,
                                y: 120 - (ci.mood / 10) * 110,
                              }));
                              // Smooth cubic bezier
                              let d = `M ${pts[0].x} ${pts[0].y}`;
                              for (let i = 1; i < pts.length; i++) {
                                const cp1x = pts[i - 1].x + 20;
                                const cp2x = pts[i].x - 20;
                                d += ` C ${cp1x} ${pts[i - 1].y}, ${cp2x} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
                              }
                              d += ` L ${pts[pts.length - 1].x} 120 L ${pts[0].x} 120 Z`;
                              return d;
                            })()}
                            fill="url(#moodGradient)"
                          />

                          {/* Line */}
                          <path
                            d={(() => {
                              const pts = chartData.map((ci, i) => ({
                                x: i * 60,
                                y: 120 - (ci.mood / 10) * 110,
                              }));
                              let d = `M ${pts[0].x} ${pts[0].y}`;
                              for (let i = 1; i < pts.length; i++) {
                                const cp1x = pts[i - 1].x + 20;
                                const cp2x = pts[i].x - 20;
                                d += ` C ${cp1x} ${pts[i - 1].y}, ${cp2x} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
                              }
                              return d;
                            })()}
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            filter="url(#glow)"
                          />

                          {/* Dots */}
                          {chartData.map((ci, i) => {
                            const emotion = getEmotion(ci.mood, (ci as any).emotionId);
                            const x = i * 60;
                            const y = 120 - (ci.mood / 10) * 110;
                            return (
                              <g key={ci.id}>
                                <circle cx={x} cy={y} r="8" fill={emotion.color} fillOpacity="0.15" />
                                <circle cx={x} cy={y} r="4" fill={emotion.color} />
                                <circle cx={x} cy={y} r="2" fill="white" />
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Date labels */}
                      <div className="flex justify-between px-0">
                        {chartData.map((ci) => (
                          <span key={ci.id} className="text-[9px] font-bold text-white/20 text-center" style={{ width: 60 }}>
                            {new Date(ci.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                          </span>
                        ))}
                      </div>

                      {/* Bottom stats */}
                      <div className="grid grid-cols-3 gap-2 mt-5">
                        {[
                          { label: "Tiefpunkt", value: analytics.min, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/10" },
                          { label: "Durchschnitt", value: analytics.avg.toFixed(1), color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/10" },
                          { label: "Höchstwert", value: analytics.max, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/10" },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className={`${s.bg} border ${s.border} rounded-2xl py-3 text-center backdrop-blur-sm`}
                          >
                            <p className={`text-xl font-black ${s.color}`}>
                              {s.value}
                              <span className="text-[10px] font-bold text-white/20">/10</span>
                            </p>
                            <p className="text-[10px] font-bold text-white/30 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Emotions */}
                {analytics.topEmotions.length > 0 && (
                  <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
                    <h3 className="text-sm font-black text-foreground mb-4">Häufigste Emotionen</h3>
                    <div className="space-y-3">
                      {analytics.topEmotions.map((item, idx) => {
                        const pct = Math.round((item.count / analytics.total) * 100);
                        return (
                          <div key={item.emotion.id}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                                  style={{ backgroundColor: item.emotion.color + "20" }}
                                >
                                  {item.emotion.emoji}
                                </span>
                                <span className="text-sm font-bold text-foreground">{item.emotion.label}</span>
                              </div>
                              <span className="text-sm font-black" style={{ color: item.emotion.color }}>
                                {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: item.emotion.color,
                                  transitionDelay: `${idx * 100}ms`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top Tags */}
                {analytics.topTags.length > 0 && (
                  <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
                    <h3 className="text-sm font-black text-foreground mb-4">Häufigste Aktivitäten</h3>
                    <div className="space-y-2.5">
                      {analytics.topTags.map(([tag, count], idx) => (
                        <div
                          key={tag}
                          className="flex items-center justify-between bg-muted/50 p-3.5 rounded-2xl"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                                idx === 0
                                  ? "bg-amber-100 text-amber-600"
                                  : idx === 1
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-orange-50 text-orange-500"
                              }`}
                            >
                              #{idx + 1}
                            </div>
                            <span className="text-sm font-bold text-foreground">{tag}</span>
                          </div>
                          <span className="text-xs font-black text-muted-foreground bg-background px-2.5 py-1 rounded-lg border border-border">
                            {count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Energy */}
                {analytics.avgEnergy !== null && (
                  <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Zap size={20} className="text-amber-500" />
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Ø Energie</p>
                        <p className="text-2xl font-black text-foreground">
                          {analytics.avgEnergy.toFixed(1)}
                          <span className="text-sm font-semibold text-muted-foreground">/10</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Checkin Timeline */}
            <div className="space-y-6">
              {sections.map(([dateTitle, items]) => (
                <div key={dateTitle}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 bg-card border border-border px-3.5 py-1.5 rounded-full">
                      <Calendar size={12} className="text-success" />
                      <span className="text-xs font-black text-foreground">{dateTitle}</span>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Cards */}
                  <div className="space-y-3 pl-4 border-l-2 border-border">
                    {items.map((ci) => {
                      const emotion = getEmotion(ci.mood);
                      const time = ci.createdAt
                        ? new Date(ci.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                        : "";

                      return (
                        <div
                          key={ci.id}
                          className="bg-card rounded-3xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
                        >
                          {/* Top row */}
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl"
                              style={{
                                backgroundColor: emotion.color + "15",
                                color: emotion.color,
                                border: `1px solid ${emotion.color}25`,
                              }}
                            >
                              {emotion.emoji} {emotion.label}
                            </span>
                            {time && (
                              <span className="text-xs font-bold text-muted-foreground">{time}</span>
                            )}
                          </div>

                          {/* Note */}
                          {ci.note && ci.note.trim() && (
                            <p className="text-foreground text-base leading-relaxed font-medium mt-2">
                              {ci.note}
                            </p>
                          )}

                          {/* Tags & meta */}
                          {(ci.tags?.length || ci.duration) && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                              {ci.duration != null && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                                  <Activity size={10} />
                                  {ci.duration} Min
                                </span>
                              )}
                              {ci.tags?.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg"
                                >
                                  <Tag size={10} />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Empty state */}
                          {!ci.note?.trim() && !ci.tags?.length && ci.duration == null && (
                            <p className="text-sm text-muted-foreground italic mt-2">
                              Nur Stimmung protokolliert.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon,
  small,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className={`${small ? "text-sm" : "text-xl"} font-black text-foreground`}>
        {value}
        {suffix && <span className="text-sm font-semibold text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}
