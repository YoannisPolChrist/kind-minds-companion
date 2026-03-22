import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore/lite";
import { dbLite } from "../lib/firebaseDbLite";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
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
import { getEnergyColor, getEnergyTone } from "../utils/energy";

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

type RangeKey = "week" | "month" | "all";

function getCheckinTimestamp(checkin: Checkin) {
  return new Date(checkin.createdAt || checkin.date).getTime();
}

export default function CheckinsOverview() {
  const { profile } = useAuth();
  const { locale } = useLanguage();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState<RangeKey>("month");

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(dbLite, "checkins"), where("uid", "==", profile.id))
        );
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Checkin));
        data.sort((a, b) => getCheckinTimestamp(b) - getCheckinTimestamp(a));
        setCheckins(data);
      } catch (e) {
        console.error("Error fetching checkins:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const filteredCheckins = useMemo(() => {
    if (activeRange === "all") return checkins;

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (activeRange === "week" ? 6 : 29));

    return checkins.filter((checkin) => getCheckinTimestamp(checkin) >= cutoff.getTime());
  }, [activeRange, checkins]);

  const analytics = useMemo(() => {
    if (filteredCheckins.length === 0) return null;

    const moodValues = filteredCheckins.map((c) => normalizeMoodTo100(c.mood));
    const avg = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;
    const min = Math.min(...moodValues);
    const max = Math.max(...moodValues);

    let trend: "up" | "down" | "stable" = "stable";
    if (filteredCheckins.length >= 4) {
      const recent = moodValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const olderSlice = moodValues.slice(3, 6);
      const older = olderSlice.reduce((a, b) => a + b, 0) / Math.max(olderSlice.length, 1);
      if (recent - older > 5) trend = "up";
      else if (older - recent > 5) trend = "down";
    }

    const emotionCounts: Record<string, { count: number; emotion: (typeof EMOTION_PRESETS)[0] }> = {};
    filteredCheckins.forEach((c) => {
      const e = getEmotion(c.mood, (c as any).emotionId);
      if (!emotionCounts[e.id]) emotionCounts[e.id] = { count: 0, emotion: e };
      emotionCounts[e.id].count++;
    });
    const topEmotions = Object.values(emotionCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const tagCounts: Record<string, number> = {};
    filteredCheckins.forEach((c) => c.tags?.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const energies = filteredCheckins.filter((c) => c.energy).map((c) => c.energy!);
    const avgEnergy = energies.length > 0 ? energies.reduce((a, b) => a + b, 0) / energies.length : null;

    return { avg, min, max, trend, topEmotions, topTags, avgEnergy, total: filteredCheckins.length };
  }, [filteredCheckins, locale]);

  const sections = useMemo(() => {
    const groups: Record<string, Checkin[]> = {};
    filteredCheckins.forEach((c) => {
      const dateObj = c.createdAt ? new Date(c.createdAt) : new Date(c.date);
      const key = dateObj.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups);
  }, [filteredCheckins]);

  const chartData = useMemo(() => {
    return [...filteredCheckins].slice(0, 14).reverse();
  }, [filteredCheckins]);

  const latestEmotion = chartData.length > 0
    ? getEmotion(chartData[chartData.length - 1]?.mood, (chartData[chartData.length - 1] as any)?.emotionId)
    : EMOTION_PRESETS[16];
  const averageEnergyColor = analytics?.avgEnergy != null ? getEnergyColor(analytics.avgEnergy) : null;

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
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground relative overflow-hidden rounded-b-[2rem]">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/30 to-primary/25" />
        <HeaderOrbs />
        <div className="max-w-6xl mx-auto px-5 pt-12 pb-8 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/"
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold"
            >
              <ArrowLeft size={16} />
              Zurück
            </Link>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Mein Tagebuch</h1>
          <p className="text-white/60 text-sm font-semibold mt-1">
            {checkins.length} {checkins.length === 1 ? "Eintrag" : "Einträge"} insgesamt
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "week", label: "Woche" },
            { key: "month", label: "Monat" },
            { key: "all", label: "Gesamt" },
          ].map((range) => {
            const active = activeRange === range.key;
            return (
              <button
                key={range.key}
                type="button"
                onClick={() => setActiveRange(range.key as RangeKey)}
                className={`px-4 py-2.5 rounded-2xl border text-sm font-bold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>

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
        ) : filteredCheckins.length === 0 ? (
          <div className="bg-card rounded-3xl border border-border p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
              <Calendar size={28} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-black text-foreground mb-2">Keine Einträge im gewählten Zeitraum</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Wechsel auf Woche, Monat oder Gesamt, um andere Tagebuch-Einträge und Trends anzusehen.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] xl:items-start">
            <div className="space-y-6 xl:order-2">
              {/* Checkin Timeline */}
              {sections.map(([dateTitle, items]) => (
                <div key={dateTitle}>
                  {/* Date Header */}
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5">
                      <Calendar size={12} className="text-success" />
                      <span className="text-xs font-black text-foreground">{dateTitle}</span>
                    </div>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Cards */}
                  <div className="space-y-3 border-l-2 border-border pl-4">
                    {items.map((ci) => {
                      const emotion = getEmotion(ci.mood);
                      const energyColor = ci.energy != null ? getEnergyColor(ci.energy) : null;
                      const time = ci.createdAt
        ? new Date(ci.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
                        : "";

                      return (
                        <div
                          key={ci.id}
                          className="rounded-3xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black"
                                style={{
                                  backgroundColor: emotion.color + "15",
                                  color: emotion.color,
                                  border: `1px solid ${emotion.color}25`,
                                }}
                              >
                                {emotion.emoji} {emotion.label}
                              </span>
                              {ci.energy != null && (
                                <span
                                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black"
                                  style={{
                                    backgroundColor: `${energyColor}12`,
                                    color: energyColor || undefined,
                                    border: `1px solid ${energyColor}25`,
                                  }}
                                >
                                  <Zap size={12} />
                                  {ci.energy}/100
                                </span>
                              )}
                            </div>
                            {time && <span className="text-xs font-bold text-muted-foreground">{time}</span>}
                          </div>

                          {ci.note && ci.note.trim() && (
                            <p className="mt-2 text-base font-medium leading-relaxed text-foreground">{ci.note}</p>
                          )}

                          {(ci.tags?.length || ci.duration) && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                              {ci.duration != null && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                                  <Activity size={10} />
                                  {ci.duration} Min
                                </span>
                              )}
                              {ci.tags?.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground"
                                >
                                  <Tag size={10} />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {!ci.note?.trim() && !ci.tags?.length && ci.duration == null && (
                            <p className="mt-2 text-sm italic text-muted-foreground">Nur Stimmung protokolliert.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics Cards */}
            {analytics && (
              <div className="space-y-4 animate-fade-in xl:sticky xl:top-24 xl:order-1">
                {/* Top Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up">
                  <StatCard
                    label="Durchschnitt"
                    value={analytics.avg.toFixed(0)}
                    suffix="/100"
                    icon={<Star size={16} className="text-amber-500" />}
                  />
                  <StatCard
                    label="Minimum"
                    value={String(analytics.min)}
                    suffix="/100"
                    icon={<TrendingDown size={16} className="text-destructive" />}
                  />
                  <StatCard
                    label="Maximum"
                    value={String(analytics.max)}
                    suffix="/100"
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
                    className="rounded-3xl p-6 border border-border bg-card shadow-xl animate-slide-up relative overflow-hidden"
                    style={{ animationDelay: "100ms" }}
                  >
                    <div
                      className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${latestEmotion.color}40, transparent)` }}
                    />
                    <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none bg-primary/10" />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">
                            Stimmungsverlauf
                          </h3>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-foreground tracking-tight">
                              {normalizeMoodTo100(chartData[chartData.length - 1]?.mood)}
                            </span>
                            <span className="text-sm font-bold text-muted-foreground">/100</span>
                            <span className="text-lg ml-1">{latestEmotion.emoji}</span>
                          </div>
                        </div>
                        <div
                          className="px-3 py-2 rounded-2xl border text-sm font-bold"
                          style={{ borderColor: `${latestEmotion.color}22`, backgroundColor: `${latestEmotion.color}12`, color: latestEmotion.color }}
                        >
                          {latestEmotion.label}
                        </div>
                      </div>

                      <div className="relative h-40 mb-2">
                        <svg viewBox={`0 0 ${(chartData.length - 1) * 60} 120`} className="w-full h-full" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={latestEmotion.color} stopOpacity="0.28" />
                              <stop offset="100%" stopColor={latestEmotion.color} stopOpacity="0.02" />
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
                              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                              <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>

                          {[0, 25, 50, 75, 100].map((y) => (
                            <line key={y} x1="0" y1={120 - (y / 100) * 120} x2={(chartData.length - 1) * 60} y2={120 - (y / 100) * 120} stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
                          ))}

                          <path
                            d={(() => {
                              const pts = chartData.map((ci, i) => ({
                                x: i * 60,
                                y: 120 - (normalizeMoodTo100(ci.mood) / 100) * 110,
                              }));
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

                          <path
                            d={(() => {
                              const pts = chartData.map((ci, i) => ({
                                x: i * 60,
                                y: 120 - (normalizeMoodTo100(ci.mood) / 100) * 110,
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

                          {chartData.map((ci, i) => {
                            const emotion = getEmotion(ci.mood, (ci as any).emotionId);
                            const x = i * 60;
                            const y = 120 - (normalizeMoodTo100(ci.mood) / 100) * 110;
                            return (
                              <g key={ci.id}>
                                <circle cx={x} cy={y} r="8" fill={emotion.color} fillOpacity="0.14" />
                                <circle cx={x} cy={y} r="4" fill={emotion.color} />
                                <circle cx={x} cy={y} r="2" fill="white" />
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      <div className="flex justify-between px-0">
                        {chartData.map((ci) => (
                          <span key={ci.id} className="text-[9px] font-bold text-muted-foreground text-center" style={{ width: 60 }}>
                          {new Date(ci.date).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-5">
                        {[
                          { label: "Tiefpunkt", value: analytics.min, color: "#E11D48", backgroundColor: "rgba(225,29,72,0.08)" },
                          { label: "Durchschnitt", value: analytics.avg.toFixed(0), color: "#0369A1", backgroundColor: "rgba(3,105,161,0.08)" },
                          { label: "Hochstwert", value: analytics.max, color: "#047857", backgroundColor: "rgba(4,120,87,0.08)" },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="rounded-2xl py-3 text-center border"
                            style={{ borderColor: `${s.color}18`, backgroundColor: s.backgroundColor }}
                          >
                            <p className="text-xl font-black" style={{ color: s.color }}>
                              {s.value}
                              <span className="text-[10px] font-bold text-muted-foreground">/100</span>
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{s.label}</p>
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
                      <Zap size={20} style={{ color: averageEnergyColor || undefined }} />
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Energie</p>
                        <p className="text-2xl font-black" style={{ color: averageEnergyColor || undefined }}>
                          {analytics.avgEnergy.toFixed(0)}
                          <span className="text-sm font-semibold text-muted-foreground">/100</span>
                        </p>
                        <p className="text-xs font-semibold mt-1" style={{ color: averageEnergyColor || undefined }}>
                          {getEnergyTone(analytics.avgEnergy)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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



