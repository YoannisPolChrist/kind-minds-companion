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

function getEmotion(score: number, emotionId?: string) {
  if (emotionId) {
    const byId = EMOTION_PRESETS.find((e) => e.id === emotionId);
    if (byId) return byId;
  }
  return EMOTION_PRESETS.find((e) => e.score === score) || EMOTION_PRESETS[16];
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

    const moods = checkins.map((c) => c.mood);
    const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
    const min = Math.min(...moods);
    const max = Math.max(...moods);

    // Trend: compare last 3 to previous 3
    let trend: "up" | "down" | "stable" = "stable";
    if (checkins.length >= 4) {
      const recent = moods.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const older = moods.slice(3, 6).reduce((a, b) => a + b, 0) / Math.min(moods.slice(3, 6).length, 3);
      if (recent - older > 0.5) trend = "up";
      else if (older - recent > 0.5) trend = "down";
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
              <div className="space-y-4">
                {/* Top Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  <div className="bg-[hsl(var(--card-dark,222_47%_11%))] rounded-3xl p-6 shadow-lg">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">
                      Stimmungsverlauf
                    </h3>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-black text-white">
                        {chartData[chartData.length - 1]?.mood}
                      </span>
                      <span className="text-sm font-semibold text-white/40">/10</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-28">
                      {chartData.map((ci, i) => {
                        const emotion = getEmotion(ci.mood);
                        const heightPct = (ci.mood / 10) * 100;
                        return (
                          <div key={ci.id} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs" title={emotion.label}>
                              {emotion.emoji}
                            </span>
                            <div className="w-full relative rounded-lg overflow-hidden bg-white/10" style={{ height: "80px" }}>
                              <div
                                className="absolute bottom-0 w-full rounded-lg transition-all duration-500"
                                style={{
                                  height: `${heightPct}%`,
                                  background: `linear-gradient(to top, ${emotion.color}88, ${emotion.color}44)`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-white/30">
                              {new Date(ci.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Mini stats */}
                    <div className="flex gap-3 mt-4">
                      {[
                        { label: "Min", value: analytics.min, color: "text-destructive" },
                        { label: "Ø", value: analytics.avg.toFixed(1), color: "text-primary" },
                        { label: "Max", value: analytics.max, color: "text-success" },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="flex-1 bg-white/5 rounded-xl py-2 text-center border border-white/5"
                        >
                          <p className={`text-lg font-black ${s.color}`}>
                            {s.value}
                            <span className="text-xs font-semibold text-white/30">/10</span>
                          </p>
                          <p className="text-[10px] font-semibold text-white/30">{s.label}</p>
                        </div>
                      ))}
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
