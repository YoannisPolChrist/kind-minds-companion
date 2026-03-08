import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowLeft, BookOpen, CheckCircle, Search, X, Clock, Layers,
  Play, Calendar, Sparkles, Filter, SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs,
  PressableScale, CountUp, GlowCard,
} from "../components/motion";
import { getRandomHeaderImage } from "../constants/headerImages";

const headerImg = getRandomHeaderImage();

interface Exercise {
  id: string;
  title: string;
  completed?: boolean;
  blocks?: any[];
  recurrence?: string;
  themeColor?: string;
  completedAt?: string;
  lastCompletedAt?: string;
  createdAt?: string;
}

type FilterTab = "all" | "open" | "completed";

const EXERCISE_EMOJIS = ["🧠", "💪", "🎯", "📝", "🌟", "🔮", "💎", "🌈", "🧩", "🎨"];
const getExerciseEmoji = (title: string) => {
  const hash = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return EXERCISE_EMOJIS[hash % EXERCISE_EMOJIS.length];
};

// ─── Animated Exercise Card ──────────────────────────────────────────────────

function ExerciseCardPremium({ exercise, index, onClick }: { exercise: Exercise; index: number; onClick: () => void }) {
  const color = exercise.themeColor || "hsl(var(--primary))";
  const blockCount = exercise.blocks?.length ?? 0;
  const mins = blockCount * 3;
  const emoji = getExerciseEmoji(exercise.title);
  const isCompleted = exercise.completed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ delay: index * 0.06, type: "spring", damping: 20, stiffness: 150 }}
      layout
    >
      <motion.div
        className={`rounded-3xl border-[1.5px] overflow-hidden bg-card shadow-lg cursor-pointer group relative ${isCompleted ? "opacity-80" : ""}`}
        style={{ borderColor: `${color}30` }}
        whileHover={{ scale: 1.03, y: -6, boxShadow: `0 20px 50px ${color}25` }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        onClick={onClick}
      >
        {/* Top accent with gradient */}
        <div className="h-1.5 relative overflow-hidden">
          <motion.div
            className="absolute inset-0"
            style={{ background: `linear-gradient(90deg, ${color}, ${color}AA, ${color})` }}
            animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="p-5">
          {/* Emoji + Title */}
          <div className="flex items-start gap-4 mb-4">
            <motion.div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 border"
              style={{ backgroundColor: `${color}12`, borderColor: `${color}30` }}
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
            >
              {isCompleted ? "✅" : emoji}
            </motion.div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-black text-foreground tracking-tight leading-tight mb-1 line-clamp-2 ${isCompleted ? "line-through opacity-60" : ""}`}>
                {exercise.title}
              </h3>
              {isCompleted && exercise.lastCompletedAt && (
                <p className="text-xs text-muted-foreground font-bold flex items-center gap-1">
                  <CheckCircle size={12} className="text-emerald-500" />
                  Erledigt am {new Date(exercise.lastCompletedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                </p>
              )}
            </div>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-secondary border border-border text-muted-foreground">
              <Layers size={12} /> {blockCount} {blockCount === 1 ? "Modul" : "Module"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-secondary border border-border text-muted-foreground">
              <Clock size={12} /> ~{mins} Min
            </span>
            {exercise.recurrence && exercise.recurrence !== "none" && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ backgroundColor: `${color}15`, color }}
              >
                🔁 {exercise.recurrence === "daily" ? "Täglich" : "Wöchentlich"}
              </span>
            )}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: `${color}15` }}>
            <span className="text-sm font-extrabold tracking-tight" style={{ color }}>
              {isCompleted ? "Nochmal ansehen" : "Jetzt starten"}
            </span>
            <motion.div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: color, boxShadow: `0 4px 16px ${color}40` }}
              whileHover={{ scale: 1.15 }}
              animate={!isCompleted ? { scale: [1, 1.08, 1] } : undefined}
              transition={!isCompleted ? { duration: 2, repeat: Infinity } : undefined}
            >
              {isCompleted ? (
                <CheckCircle size={16} className="text-white" />
              ) : (
                <Play size={14} className="text-white ml-0.5" fill="white" />
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ExercisesOverview() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const initialTab = (searchParams.get("filter") as FilterTab) || "all";
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const globalSnap = await getDocs(
          query(collection(db, "exercises"), where("clientId", "==", profile.id))
        );
        let exs = globalSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise));
        if (exs.length === 0) {
          const userSnap = await getDocs(query(collection(db, "users", profile.id, "exercises")));
          exs = userSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise));
        }
        setExercises(exs);
      } catch (e) {
        console.error("Error fetching exercises:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const open = useMemo(() => exercises.filter((e) => !e.completed), [exercises]);
  const completed = useMemo(() => exercises.filter((e) => e.completed), [exercises]);

  const filtered = useMemo(() => {
    let list = exercises;
    if (activeTab === "open") list = open;
    else if (activeTab === "completed") list = completed;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.title?.toLowerCase().includes(q));
    }
    return list;
  }, [exercises, open, completed, activeTab, search]);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setSearchParams(tab === "all" ? {} : { filter: tab });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary-dark to-primary rounded-b-[2rem] relative overflow-hidden">
          <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/30 to-primary/40" />
          <HeaderOrbs />
          <div className="max-w-2xl mx-auto px-5 pt-12 pb-8 relative z-10">
            <div className="h-8 w-40 bg-white/20 rounded-2xl mb-3 animate-pulse" />
            <div className="h-5 w-64 bg-white/10 rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-3xl border border-border p-6 h-36 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const tabs: { key: FilterTab; label: string; emoji: string; count: number }[] = [
    { key: "all", label: "Alle", emoji: "📚", count: exercises.length },
    { key: "open", label: "Offen", emoji: "🎯", count: open.length },
    { key: "completed", label: "Erledigt", emoji: "✅", count: completed.length },
  ];

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem] relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/60 to-primary/70" />
        <HeaderOrbs />
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-6 relative z-10">
          <motion.button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold mb-5"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} /> Zurück
          </motion.button>
          <div className="flex items-center gap-3 mb-2">
            <motion.span className="text-3xl" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              📚
            </motion.span>
            <h1 className="text-3xl font-black tracking-tight">Meine Übungen</h1>
          </div>
          <p className="text-white/60 text-sm font-semibold">
            {exercises.length} Übungen · {completed.length} erledigt · {open.length} offen
          </p>

          {/* Stats Pills */}
          <div className="flex gap-3 mt-5">
            {[
              { label: "Gesamt", value: exercises.length, emoji: "📊" },
              { label: "Offen", value: open.length, emoji: "🎯" },
              { label: "Erledigt", value: completed.length, emoji: "✅" },
            ].map((s, i) => (
              <motion.div key={s.label}
                className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 flex-1 text-center"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}>
                <span className="text-lg">{s.emoji}</span>
                <CountUp to={s.value} className="text-2xl font-black text-white block" duration={1.2} />
                <p className="text-[10px] font-bold text-white/50 uppercase">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-5 space-y-5">
        {/* Filter Tabs */}
        <motion.div className="flex gap-2 bg-secondary/50 p-1.5 rounded-2xl border border-border"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <motion.button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all relative ${
                  active ? "bg-card shadow-md text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-lg font-extrabold ${
                  active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Search */}
        <motion.div className="relative" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Übung suchen... 🔍"
            className="w-full pl-11 pr-10 py-3.5 bg-card rounded-2xl border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-muted hover:bg-border transition-colors">
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              className="bg-card rounded-3xl border border-border p-10 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="text-5xl block mb-4">
                  {search ? "🔍" : activeTab === "completed" ? "🏆" : activeTab === "open" ? "🎯" : "📋"}
                </span>
              </motion.div>
              <h2 className="text-xl font-black text-foreground mb-2">
                {search ? "Keine Treffer" : activeTab === "open" ? "Alles erledigt! 🎉" : activeTab === "completed" ? "Noch nichts erledigt" : "Keine Übungen"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {search
                  ? `Keine Übung mit „${search}" gefunden.`
                  : activeTab === "open"
                  ? "Super gemacht! Du hast alle Aufgaben abgeschlossen."
                  : "Sobald dein Therapeut dir Übungen zuweist, erscheinen sie hier."}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((ex, idx) => (
                <ExerciseCardPremium
                  key={ex.id}
                  exercise={ex}
                  index={idx}
                  onClick={() => navigate(`/exercise/${ex.id}`)}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        <div className="h-8" />
      </div>
    </PageTransition>
  );
}
